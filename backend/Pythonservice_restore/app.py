from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import chromadb
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Import routers
from routes.health import router as health_router
from routes.gemini import router as gemini_router, load_gemini_models, set_rag_prompt_service as set_gemini_rag_service, set_chat_history_service as set_gemini_chat_history, set_chroma_client as set_gemini_chroma_client
from routes.groq_service import router as groq_router, init_groq, set_rag_prompt_service as set_groq_rag_service, set_chat_history_service as set_groq_chat_history, set_chroma_client as set_groq_chroma_client
from routes.chroma import router as chroma_router, set_chroma_client
from routes.rag import router as rag_router, set_rag_prompt_service
from routes.chat_history import router as chat_history_router, set_chat_history_service
from routes.ai_config import router as ai_config_router
from routes.business_analytics import router as analytics_router, set_chroma_client as set_analytics_chroma_client

# Import services
from services.rag_prompt_service import RAGPromptService
from services.chat_history_service import ChatHistoryService

# Initialize FastAPI app
app = FastAPI(
    title="Python API Service with FastAPI",
    description="API service with Google Gemini AI, ChromaDB, and RAG Prompts",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Google Gemini API
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable is not set. Please add it to .env file")
genai.configure(api_key=GOOGLE_API_KEY)

# Initialize ChromaDB
chroma_client = chromadb.PersistentClient(path="./chroma_data")
set_chroma_client(chroma_client)
set_gemini_chroma_client(chroma_client)  # Set for gemini router to enable semantic search
set_groq_chroma_client(chroma_client)  # Set for groq router to enable semantic search
set_analytics_chroma_client(chroma_client)  # Set for analytics router to access data

# Initialize RAG Prompt Service
rag_prompt_service = RAGPromptService(chroma_client)
set_rag_prompt_service(rag_prompt_service)
set_gemini_rag_service(rag_prompt_service)
set_groq_rag_service(rag_prompt_service)

# Initialize Chat History Service
chat_history_service = ChatHistoryService(chroma_client)
set_chat_history_service(chat_history_service)
set_gemini_chat_history(chat_history_service)
set_groq_chat_history(chat_history_service)

# Load Gemini models
load_gemini_models()

# Initialize Groq
init_groq()

# Include routers
app.include_router(health_router, prefix="/health", tags=["Health Check"])
app.include_router(gemini_router, prefix="/gemini", tags=["Gemini AI"])
app.include_router(groq_router, prefix="/groq", tags=["Groq AI"])
app.include_router(chroma_router, prefix="/chroma", tags=["ChromaDB"])
app.include_router(rag_router, prefix="/rag", tags=["RAG Prompts"])
app.include_router(chat_history_router, prefix="/chat-history", tags=["Chat History"])
app.include_router(ai_config_router, prefix="/ai-config", tags=["AI Configuration"])
app.include_router(analytics_router, prefix="/analytics", tags=["Business Analytics"])

@app.get("/")
async def root():
    return {
        "message": "Python API Service with FastAPI",
        "docs": "/docs",
        "redoc": "/redoc"
    }

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
