import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { RecursiveUrlLoader } from "@langchain/community/document_loaders/web/recursive_url";
import { compile } from "html-to-text";
import OpenAI from "openai";
import fs from 'fs';
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

// Initialize embeddings
const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GEMINI_API_KEY,
  model: "text-embedding-004",
});

// Chat history storage (in-memory for simplicity)
const chatSessions = {};

// Website scraping function
async function scrapeWebsite(url) {
  const compiledConvert = compile({ wordwrap: 130 });
  const loader = new RecursiveUrlLoader(url, {
    extractor: compiledConvert,
    maxDepth: 1,
    excludeDirs: ["/docs/api/"],
  });
  return await loader.load();
}

// PDF processing function
async function processPDF(filePath) {
  const loader = new PDFLoader(filePath);
  return await loader.load();
}

// Routes
app.get('/', (req, res) => {
  res.render('index', { title: 'AI Chat Application' });
});

// API endpoint for chat
app.post('/api/chat', async (req, res) => {
  try {
    const { userQuery, sessionId, websiteUrl, textInput } = req.body;
    
    // Initialize session if it doesn't exist
    if (!chatSessions[sessionId]) {
      chatSessions[sessionId] = [];
    }
    
    let websiteChunks = [];
    let pdfChunks = [];
    let textChunks = [];

    // Process website URL if provided
    if (websiteUrl) {
      console.log(`Processing website: ${websiteUrl}`);
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

    // Process PDF documents from collection
    console.log(`Processing PDF collection`);
    try {
      const pdfStore = await QdrantVectorStore.fromExistingCollection(
        embeddings,
        {
          url: "http://localhost:6333",
          collectionName: "rag_collection",
        }
      );
      const pdfRetriever = pdfStore.asRetriever({ k: 3 });
      pdfChunks = await pdfRetriever.invoke(userQuery);
    } catch (error) {
      console.log("Error retrieving from PDF collection:", error.message);
    }

    // Process text input if provided
    if (textInput && textInput.trim() !== '') {
      textChunks = [{ pageContent: textInput }];
    }

    // Merge all contexts
    const allChunks = [...pdfChunks, ...websiteChunks, ...textChunks];

    const SYSTEM_PROMPT = `
You are an AI Assistant who answers user queries strictly based on the provided CONTEXT. 

Rules:
1. Use only the CONTEXT.
2. If info is missing, say: 
   "The requested information is not available in the provided data."
3. Never assume or add extra details.

CONTEXT: ${JSON.stringify(allChunks)}
`;

    // Build message history
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...chatSessions[sessionId], // include past turns
      { role: "user", content: userQuery },
    ];

    const response = await openai.chat.completions.create({
      model: "gemini-2.5-flash",
      messages,
    });

    const aiReply = response.choices[0].message.content;

    // Save conversation to history
    chatSessions[sessionId].push({ role: "user", content: userQuery });
    chatSessions[sessionId].push({ role: "assistant", content: aiReply });

    // Return response
    res.json({
      reply: aiReply,
      history: chatSessions[sessionId]
    });
  } catch (error) {
    console.error('Error processing chat:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint for document upload
app.post('/api/upload', async (req, res) => {
  // This would normally use a file upload middleware like multer
  // For now, we'll just return a mock response
  res.json({ message: 'Document upload endpoint (to be implemented with multer)' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});