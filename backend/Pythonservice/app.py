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
from routes.business_analytics import set_chroma_client, router as business_analytics_router, set_analytics_rag_service
from routes.data_sync import router as data_sync_router
from routes.groq_chat import router as groq_chat_router, set_groq_client
from routes.admin_chat import router as admin_chat_router

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
print(f"[Analytics RAG] Service initialized for all routes")
print(f"[Analytics RAG] Initialized at {analytics_chroma_path}")

# Initialize ChromaDB client for business analytics (shared with analytics_rag_service)
chroma_client = chromadb.PersistentClient(path=analytics_chroma_path)
set_chroma_client(chroma_client)
print(f"[ChromaDB] Initialized shared client at {analytics_chroma_path}")

# Initialize Groq Chat Service (independent)
from groq import Groq
groq_api_key = os.getenv('GROQ_API_KEY')
if groq_api_key:
    groq_client = Groq(api_key=groq_api_key)
    set_groq_client(groq_client)
    print(f"[Groq Chat] Service initialized with API Key")
else:
    print(f"[Groq Chat] WARNING: GROQ_API_KEY not set - service will fail at runtime")

# Initialize Redis Chat Service
from services.redis_chat_service import RedisChatService
from routes.groq_chat import set_redis_service

try:
    redis_host = os.getenv('REDIS_HOST', 'localhost')
    redis_port = int(os.getenv('REDIS_PORT', 6379))
    redis_db = int(os.getenv('REDIS_DB', 0))
    redis_password = os.getenv('REDIS_PASSWORD', None)
    chat_history_ttl = int(os.getenv('CHAT_HISTORY_TTL', 86400))
    
    redis_chat_service = RedisChatService(
        host=redis_host,
        port=redis_port,
        db=redis_db,
        password=redis_password,
        ttl=chat_history_ttl
    )
    
    # Test Redis connection
    if redis_chat_service.is_connected():
        set_redis_service(redis_chat_service)
        print(f"[Redis Chat] Service initialized at {redis_host}:{redis_port} (DB: {redis_db})")
        print(f"[Redis Chat] Chat history TTL set to {chat_history_ttl} seconds")
    else:
        print(f"[Redis Chat] WARNING: Could not connect to Redis at {redis_host}:{redis_port}")
        print(f"[Redis Chat] Chat history will NOT be persisted")
except Exception as e:
    print(f"[Redis Chat] ERROR: Failed to initialize Redis service: {str(e)}")
    print(f"[Redis Chat] Chat history will NOT be persisted")


# Register routers
app.include_router(health_router, tags=["Health"])
app.include_router(groq_chat_router, prefix="/api/groq-chat", tags=["Groq Chat"])
app.include_router(admin_chat_router, prefix="/api/admin", tags=["Admin Chat Management"])
app.include_router(analytics_router, prefix="/api/analytics", tags=["Business Analytics"])
app.include_router(business_analytics_router, prefix="/api/business", tags=["Business Analytics Extended"])
app.include_router(data_sync_router, tags=["Data Synchronization"])

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "AI Agent for Business",
        "version": "3.0.0",
        "architecture": "business_analytics",
        "services": {
            "groq_chat": "/api/groq-chat/*",
            "analytics": "/api/analytics/*",
            "business_extended": "/api/business/*",
            "data_sync": "/admin/analytics/*"
        },
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    host = os.getenv('SERVER_HOST', '0.0.0.0')
    port = int(os.getenv('SERVER_PORT', 5000))
    
    print(f"\n{'='*60}")
    print(f" Starting AI Agent for Business")
    print(f"{'='*60}")
    print(f" Server: http://{host}:{port}")
    print(f" Docs: http://{host}:{port}/docs")
    print(f" Groq Chat: http://{host}:{port}/api/groq-chat/*")
    print(f" Analytics: http://{host}:{port}/api/analytics/*")
    print(f" Business Extended: http://{host}:{port}/api/business/*")
    print(f" Data Sync: http://{host}:{port}/admin/analytics/*")
    print(f"{'='*60}\n")
    
    uvicorn.run(app, host=host, port=port)
