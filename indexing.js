import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { QdrantVectorStore } from "@langchain/qdrant";
import "dotenv/config"


//this is the function for chunking
async function init() {
    const pdfFilePath = "./imprint.pdf" 
    
    const loader = new PDFLoader(pdfFilePath)

    //page by page load the pdf file
    const docs = await loader.load();

    //ready gemini embbedding model
    const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY,
    model: "text-embedding-004", // 768 dimensions
    // taskType: TaskType.RETRIEVAL_DOCUMENT,
    // title: "Document title",

});

    //create a vector store
    const vectorStore = await QdrantVectorStore.fromDocuments(
        docs,
        embeddings,
        {
        url: "http://localhost:6333",
        collectionName: "rag_collection",
        
    });

    console.log("Indexing of documents done");
    




}

init()
