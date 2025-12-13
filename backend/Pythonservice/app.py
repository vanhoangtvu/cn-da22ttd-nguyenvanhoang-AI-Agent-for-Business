"""
AI Agent for Business - Main Application
Separated Architecture: Customer Chat vs Business Analytics
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
import chromadb

# Load environment variables
load_dotenv()

# Import services
from services.ai_service import get_ai_service
from services.analytics_rag_service import AnalyticsRAGService

# Import routers
from routes.health import router as health_router
from routes.analytics import router as analytics_router, set_analytics_rag_service
from routes.business_analytics import set_chroma_client

# Initialize FastAPI app
app = FastAPI(
    title="AI Agent for Business - Python Service",
    description="Business Analytics AI Service",
    version="3.0.0",
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

# Initialize AI Service (shared)
ai_service = get_ai_service()
print(f"[AI Service] Initialized with {len(ai_service.get_available_models())} models")

# Initialize Analytics RAG Service (chroma_analytics)
analytics_chroma_path = os.getenv('CHROMA_ANALYTICS_PATH', './chroma_analytics')
analytics_rag_service = AnalyticsRAGService(chroma_path=analytics_chroma_path)
set_analytics_rag_service(analytics_rag_service)
print(f"[Analytics RAG] Initialized at {analytics_chroma_path}")

# Initialize ChromaDB client for business analytics (shared with analytics_rag_service)
chroma_client = chromadb.PersistentClient(path=analytics_chroma_path)
set_chroma_client(chroma_client)
print(f"[ChromaDB] Initialized shared client at {analytics_chroma_path}")

# Register routers
app.include_router(health_router, tags=["Health"])
app.include_router(analytics_router, prefix="/api/analytics", tags=["Business Analytics"])

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "AI Agent for Business",
        "version": "3.0.0",
        "architecture": "business_analytics",
        "services": {
            "analytics": "/api/analytics/*"
        },
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    host = os.getenv('SERVER_HOST', '0.0.0.0')
    port = int(os.getenv('SERVER_PORT', 5000))
    
    print(f"\n{'='*60}")
    print(f"🚀 Starting AI Agent for Business")
    print(f"{'='*60}")
    print(f"📍 Server: http://{host}:{port}")
    print(f"📚 Docs: http://{host}:{port}/docs")
    print(f"📊 Analytics: http://{host}:{port}/api/analytics/*")
    print(f"{'='*60}\n")
    
    uvicorn.run(app, host=host, port=port)
