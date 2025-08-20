import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { RecursiveUrlLoader } from "@langchain/community/document_loaders/web/recursive_url";
import { compile } from "html-to-text";
import OpenAI from "openai";
import readline from "readline";
import "dotenv/config";

const openai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GEMINI_API_KEY,
  model: "text-embedding-004",
});

// ---------- Website Loader ----------
async function scrapeWebsite(url) {
  const compiledConvert = compile({ wordwrap: 130 });
  const loader = new RecursiveUrlLoader(url, {
    extractor: compiledConvert,
    maxDepth: 1,
    excludeDirs: ["/docs/api/"],
  });
  return await loader.load();
}

// ---------- Chat History ----------
let chatHistory = [];

// ---------- Unified Chat Function ----------
async function chatRAG({ userQuery, websiteUrl }) {
  let websiteChunks = [];
  let pdfChunks = [];

  // --- Website context ---
  if (websiteUrl) {
    console.log(`(Using website: ${websiteUrl})`);
    const websiteDocs = await scrapeWebsite(websiteUrl);

    const websiteStore = await QdrantVectorStore.fromDocuments(
      websiteDocs,
      embeddings,
      {
        url: "http://localhost:6333",
        collectionName: "website_collection",
      }
    );

    const retriever = websiteStore.asRetriever({ k: 3 });
    websiteChunks = await retriever.invoke(userQuery);
  }

  // --- PDF context ---
  console.log(`(Using PDF collection)`);
  const pdfStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    {
      url: "http://localhost:6333",
      collectionName: "rag_collection",
    }
  );
  const pdfRetriever = pdfStore.asRetriever({ k: 3 });
  pdfChunks = await pdfRetriever.invoke(userQuery);

  // Merge contexts
  const allChunks = [...pdfChunks, ...websiteChunks];

  const SYSTEM_PROMPT = `
You are an AI Assistant who answers user queries strictly based on the provided CONTEXT. 

Rules:
1. Use only the CONTEXT.
2. If info is missing, say: 
   "The requested information is not available in the provided data."
3. Never assume or add extra details.

CONTEXT: ${JSON.stringify(allChunks)}
`;

  // --- Build message history ---
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...chatHistory, // include past turns
    { role: "user", content: userQuery },
  ];

  const response = await openai.chat.completions.create({
    model: "gemini-2.5-flash",
    messages,
  });

  const aiReply = response.choices[0].message.content;

  // Save conversation to history
  chatHistory.push({ role: "user", content: userQuery });
  chatHistory.push({ role: "assistant", content: aiReply });

  console.log(`\n> ${aiReply}\n`);
}

// ---------- CLI Input Loop ----------
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let websiteUrl = null;

rl.question("Enter website URL (or press Enter to skip): ", (url) => {
  if (url.trim() !== "") {
    websiteUrl = url.trim();
  }

  function askQuery() {
    rl.question("Your query (type 'exit' to quit): ", async (query) => {
      if (query.toLowerCase() === "exit") {
        rl.close();
        return;
      }
      await chatRAG({ userQuery: query, websiteUrl });
      askQuery();
    });
  }

  askQuery();
});
