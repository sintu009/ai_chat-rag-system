# AI Chat Application with Document Processing

This application provides a user-friendly interface for chatting with an AI assistant that can process information from multiple sources:

- PDF documents
- Text input
- Website content

## Features

- Split-screen UI with resource area on the left and chat interface on the right
- PDF document upload and processing
- Text input for direct content processing
- Website URL input for web content scraping
- Responsive design for various screen sizes

## Prerequisites

- Node.js (v14 or higher)
- Docker and Docker Compose (for running Qdrant vector database)
- Google Gemini API key

## Setup

1. Clone the repository

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on the `.env.example` template:
   ```
   cp .env.example .env
   ```

4. Add your Google Gemini API key to the `.env` file

5. Start the Qdrant vector database using Docker Compose:
   ```
   docker-compose up -d
   ```

6. Index your PDF documents (optional, if you have PDFs to process):
   ```
   node indexing.js
   ```

7. Start the application:
   ```
   npm start
   ```

8. Open your browser and navigate to `http://localhost:3000`

## Usage

1. **Upload Documents**: Click on the upload area or drag and drop PDF files
2. **Enter Text**: Paste or type text directly into the text area
3. **Add Website**: Enter a website URL to scrape content from
4. **Chat**: Type your questions in the chat input and press Enter or click Send

## Technologies Used

- Express.js - Web server framework
- EJS - Templating engine
- LangChain - Framework for working with language models
- Google Generative AI - For embeddings and chat completions
- Qdrant - Vector database for storing and retrieving document embeddings
- Bootstrap - Frontend styling

## Project Structure

- `index.js` - Main application entry point
- `indexing.js` - Script for processing and indexing PDF documents
- `views/` - EJS templates for the frontend
- `public/` - Static assets (CSS, JavaScript)
- `docker-compose.yml` - Docker configuration for Qdrant