from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List
import json
import os
from groq import Groq
import chromadb

# Create router
router = APIRouter()

# Global variables
groq_client = None
rag_prompt_service = None
chat_history_service = None
chroma_client = None

def set_rag_prompt_service(service):
    """Set the RAG prompt service instance"""
    global rag_prompt_service
    rag_prompt_service = service

def set_chat_history_service(service):
    """Set the chat history service instance"""
    global chat_history_service
    chat_history_service = service

def set_chroma_client(client):
    """Set the ChromaDB client for semantic search"""
    global chroma_client
    chroma_client = client

def search_relevant_data(user_message: str, n_results: int = 5) -> tuple[str, list]:
    """Search for relevant data in ChromaDB collections based on user message"""
    if not chroma_client:
        return "", []
    
    relevant_data = []
    product_cards = []
    
    try:
        # List of collections to search
        collections_to_search = ['products', 'orders', 'categories', 'business', 'users', 'system_stats']
        
        for collection_name in collections_to_search:
            try:
                collection = chroma_client.get_collection(name=collection_name)
                
                # Query the collection
                results = collection.query(
                    query_texts=[user_message],
                    n_results=min(n_results, collection.count())
                )
                
                # Format results
                if results['documents'] and results['documents'][0]:
                    for doc, metadata in zip(results['documents'][0], results['metadatas'][0]):
                        data_str = f"[{collection_name.upper()}] {doc}"
                        
                        # Extract product card data for frontend
                        if collection_name == 'products' and 'imageUrls' in metadata:
                            try:
                                import json
                                image_urls = json.loads(metadata['imageUrls'])
                                if image_urls and len(image_urls) > 0:
                                    product_name = metadata.get('productName', 'Sản phẩm')
                                    data_str += f" | HAS_IMAGE: {product_name}"
                                    
                                    # Create product card data
                                    product_card = {
                                        'name': product_name,
                                        'imageUrl': image_urls[0],
                                        'price': metadata.get('price', ''),
                                        'description': doc[:150] if len(doc) > 150 else doc,
                                        'stock': metadata.get('stock', 0)
                                    }
                                    product_cards.append(product_card)
                            except:
                                pass
                        
                        relevant_data.append(data_str)
                        
            except Exception as e:
                # Collection might not exist yet
                continue
        
        if relevant_data:
            context = "\n\n--- DỮ LIỆU LIÊN QUAN TỪ HỆ THỐNG ---\n" + "\n".join(relevant_data[:10]) + "\n--- KẾT THÚC DỮ LIỆU ---\n"
            return context, product_cards
        
    except Exception as e:
        print(f"[SEARCH] Error searching ChromaDB: {e}")
    
    return "", []

def init_groq():
    """Initialize Groq client with API key"""
    global groq_client
    api_key = os.getenv('GROQ_API_KEY')
    if not api_key:
        print("[GROQ] Warning: GROQ_API_KEY not found in environment")
        return False
    
    try:
        groq_client = Groq(api_key=api_key)
        print("[GROQ] ✓ Groq client initialized successfully")
        return True
    except Exception as e:
        print(f"[GROQ] ✗ Failed to initialize Groq: {e}")
        return False

# Pydantic models
class ChatInput(BaseModel):
    message: str = Field(..., description="Message to send to AI")
    model: str = Field(default="llama-3.3-70b-versatile", description="Groq model to use")
    session_id: Optional[str] = Field(None, description="Session ID for chat history")
    user_id: Optional[str] = Field(None, description="User ID for personalization")

class ChatResponse(BaseModel):
    message: str
    response: str
    model: str
    products: Optional[List[dict]] = []
    provider: str = "groq"

class ModelInfo(BaseModel):
    name: str = Field(..., alias="id")
    display_name: str = Field(..., alias="id")
    context_window: int = 32768
    provider: str = "groq"
    owned_by: Optional[str] = None
    active: Optional[bool] = True
    
    class Config:
        populate_by_name = True

# Cache for models (updated periodically)
_cached_models = None
_models_cache_time = None

def get_cached_models():
    """Get models from cache or fetch from API"""
    global _cached_models, _models_cache_time
    import time
    
    # Cache for 1 hour
    if _cached_models and _models_cache_time and (time.time() - _models_cache_time) < 3600:
        return _cached_models
    
    if not groq_client:
        return []
    
    try:
        # Fetch models from Groq API
        models_response = groq_client.models.list()
        models = []
        
        # Filter for chat/text generation models only
        # Exclude TTS, Whisper, Guard, and other non-chat models
        excluded_keywords = ['whisper', 'tts', 'guard', 'safeguard', 'prompt-guard']
        
        for model in models_response.data:
            # Only include active chat models
            if hasattr(model, 'id') and model.id and getattr(model, 'active', True):
                model_id = model.id.lower()
                
                # Skip non-chat models
                if any(keyword in model_id for keyword in excluded_keywords):
                    continue
                
                # Get context window, default based on model type
                context_window = getattr(model, 'context_window', 131072)
                
                model_info = {
                    "name": model.id,
                    "display_name": model.id,
                    "context_window": context_window,
                    "provider": "groq",
                    "owned_by": getattr(model, 'owned_by', None),
                    "active": True
                }
                models.append(model_info)
        
        # Sort by context window (descending) and name
        models.sort(key=lambda x: (-x['context_window'], x['name']))
        
        _cached_models = models
        _models_cache_time = time.time()
        print(f"[GROQ] ✓ Loaded {len(models)} chat models from API")
        return models
    except Exception as e:
        print(f"[GROQ] ✗ Failed to fetch models: {e}")
        # Return fallback models if API fails
        return [
            {
                "name": "llama-3.3-70b-versatile",
                "display_name": "llama-3.3-70b-versatile",
                "context_window": 131072,
                "provider": "groq"
            },
            {
                "name": "llama-3.1-8b-instant",
                "display_name": "llama-3.1-8b-instant",
                "context_window": 131072,
                "provider": "groq"
            }
        ]

@router.get("/models", summary="List Groq models")
async def list_models():
    """Get list of available Groq models from Groq API"""
    if not groq_client:
        raise HTTPException(status_code=503, detail='Groq service not initialized. Please check GROQ_API_KEY.')
    
    models = get_cached_models()
    return models

@router.post("/chat", response_model=ChatResponse, summary="Chat with Groq")
async def chat_with_groq(chat_input: ChatInput):
    """Chat with Groq AI models"""
    if not groq_client:
        raise HTTPException(status_code=503, detail='Groq service not initialized. Please check GROQ_API_KEY.')
    
    try:
        # Simple chat without RAG for now
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "Bạn là trợ lý AI thông minh, thân thiện và chuyên nghiệp cho doanh nghiệp. Trả lời bằng tiếng Việt."
                },
                {
                    "role": "user",
                    "content": chat_input.message
                }
            ],
            model=chat_input.model,
            temperature=0.7,
            max_tokens=2048,
        )
        
        response_text = chat_completion.choices[0].message.content
        
        return ChatResponse(
            message=chat_input.message,
            response=response_text,
            model=chat_input.model,
            products=[]
        )
        
    except Exception as e:
        print(f"[GROQ] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f'Error communicating with Groq: {str(e)}')

@router.post("/chat/stream", summary="Chat with Groq (streaming)")
async def chat_with_groq_stream(chat_input: ChatInput):
    """Chat with Groq AI with streaming response"""
    if not groq_client:
        raise HTTPException(status_code=503, detail='Groq service not initialized.')
    
    async def generate():
        try:
            # Send initial metadata
            yield f"data: {json.dumps({'type': 'start', 'model': chat_input.model, 'provider': 'groq'})}\n\n"
            
            # Stream response from Groq
            stream = groq_client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": "Bạn là trợ lý AI thông minh, thân thiện và chuyên nghiệp cho doanh nghiệp. Trả lời bằng tiếng Việt."
                    },
                    {
                        "role": "user",
                        "content": chat_input.message
                    }
                ],
                model=chat_input.model,
                temperature=0.7,
                max_tokens=2048,
                stream=True,
            )
            
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield f"data: {json.dumps({'type': 'chunk', 'text': chunk.choices[0].delta.content})}\n\n"
            
            # Send completion signal
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
        }
    )

@router.post("/chat/rag", response_model=ChatResponse, summary="Chat with RAG prompts")
async def chat_with_groq_rag(chat_input: ChatInput):
    """Chat with Groq AI using RAG prompts and chat history from ChromaDB"""
    if not groq_client:
        raise HTTPException(status_code=503, detail='Groq service not initialized.')
    
    try:
        print(f"[GROQ RAG] Received request: message='{chat_input.message[:50]}...', model={chat_input.model}, session_id={chat_input.session_id}, user_id={chat_input.user_id}")
        
        if not rag_prompt_service:
            print("[GROQ RAG] ERROR: RAG prompt service not initialized")
            raise HTTPException(status_code=500, detail='RAG prompt service not initialized')
        
        # Get all RAG prompts as context
        rag_context = rag_prompt_service.get_all_prompts_as_context()
        
        # Get user information from ChromaDB if user_id is provided
        user_context = ""
        print(f"[GROQ RAG DEBUG] Received user_id: {chat_input.user_id}, type: {type(chat_input.user_id)}")
        if chat_input.user_id and chat_input.user_id != 'anonymous' and chroma_client:
            try:
                users_collection = chroma_client.get_collection('users')
                print(f"[GROQ RAG DEBUG] Users collection has {users_collection.count()} documents")
                
                # Try with string first (ChromaDB stores userId as string)
                print(f"[GROQ RAG DEBUG] Querying with string userId: {chat_input.user_id}")
                user_results = users_collection.get(
                    where={"userId": chat_input.user_id},
                    limit=1
                )
                
                # If no result, try with int
                if not user_results['documents']:
                    try:
                        user_id_int = int(chat_input.user_id)
                        print(f"[GROQ RAG DEBUG] No result with string, trying int userId: {user_id_int}")
                        user_results = users_collection.get(
                            where={"userId": user_id_int},
                            limit=1
                        )
                    except (ValueError, TypeError):
                        pass
                
                print(f"[GROQ RAG DEBUG] Query results: {len(user_results.get('documents', []))} documents found")
                if user_results['documents']:
                    user_info = user_results['documents'][0]
                    user_context = f"\n[THÔNG TIN NGƯỜI DÙNG ĐANG CHAT]\n{user_info}\n"
                    print(f"[GROQ RAG] ✓ Found user info: {user_info[:100]}...")
                else:
                    print(f"[GROQ RAG] ✗ No user found for user_id: {chat_input.user_id}")
            except Exception as e:
                print(f"[GROQ RAG] Could not get user info: {e}")
                import traceback
                traceback.print_exc()
        else:
            print(f"[GROQ RAG DEBUG] Skipping user query - user_id: {chat_input.user_id}, chroma_client: {chroma_client is not None}")
        
        # Get chat history context if session_id provided
        history_context = ""
        if chat_input.session_id and chat_history_service:
            history_context = chat_history_service.get_context_for_ai(chat_input.session_id, max_messages=10)
        
        # Search for relevant data from ChromaDB
        relevant_data, product_cards = search_relevant_data(chat_input.message, n_results=5)
        
        # Create product cards JSON string
        import json as json_lib
        products_json = json_lib.dumps(product_cards, ensure_ascii=False) if product_cards else "[]"
        
        # Construct the full prompt with RAG context + user info + relevant data + history + user message
        full_prompt = f"""Bạn là trợ lý AI thông minh, thân thiện và chuyên nghiệp cho doanh nghiệp. Hãy tuân theo các hướng dẫn sau:

{rag_context}

{user_context}

{relevant_data}

{history_context}

--- SẢN PHẨM LIÊN QUAN (JSON) ---
{products_json}
--- KẾT THÚC SẢN PHẨM ---

QUY TẮC QUAN TRỌNG:
- Khi người dùng đã đăng nhập (có thông tin trong [THÔNG TIN NGƯỜI DÙNG ĐANG CHAT]), các câu hỏi về "đơn hàng của tôi", "thông tin của tôi", "tài khoản của tôi" sẽ TỰ ĐỘNG ÁNH XẠ sang thông tin của người dùng đang đăng nhập.
- KHÔNG cần hỏi thêm thông tin như tên, email, số điện thoại nếu đã có trong thông tin người dùng.
- Khi trả lời về đơn hàng, hãy lọc dữ liệu theo userId hoặc email của người dùng hiện tại.
- KHÔNG sử dụng emoji trong câu trả lời.

CÁCH GIỚI THIỆU SẢN PHẨM:
- Chỉ giới thiệu tên sản phẩm, không cần thêm markdown hoặc hình ảnh
- Frontend sẽ tự động hiển thị card sản phẩm với hình ảnh đẹp từ dữ liệu JSON
- Trả lời ngắn gọn, chuyên nghiệp

Tin nhắn người dùng: {chat_input.message}

Hãy trả lời bằng tiếng Việt, thân thiện, sinh động và hữu ích."""
        
        # Generate response using Groq
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": full_prompt
                }
            ],
            model=chat_input.model,
            temperature=0.7,
            max_tokens=2048,
        )
        
        response_text = chat_completion.choices[0].message.content
        
        # Save messages to history if session_id provided
        if chat_input.session_id and chat_history_service:
            # Save user message
            chat_history_service.save_message(
                session_id=chat_input.session_id,
                role="user",
                content=chat_input.message,
                user_id=chat_input.user_id
            )
            # Save assistant response
            chat_history_service.save_message(
                session_id=chat_input.session_id,
                role="assistant",
                content=response_text,
                user_id=chat_input.user_id
            )
        
        print(f"[GROQ RAG] Returning {len(product_cards)} product cards")
        return ChatResponse(
            message=chat_input.message,
            response=response_text,
            model=chat_input.model,
            products=product_cards
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[GROQ RAG] ERROR: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f'Error communicating with Groq: {str(e)}')

@router.get("/health", summary="Check Groq service health")
async def health_check():
    """Check if Groq service is healthy"""
    models_count = len(get_cached_models()) if groq_client else 0
    return {
        "status": "healthy" if groq_client else "not_initialized",
        "provider": "groq",
        "models_available": models_count
    }
