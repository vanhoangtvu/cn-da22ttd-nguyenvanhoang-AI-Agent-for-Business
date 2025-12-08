from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List
import google.generativeai as genai
import json
import chromadb

# Create router
router = APIRouter()

# Global RAG prompt service instance
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

# Pydantic models
class ChatInput(BaseModel):
    message: str = Field(..., description="Message to send to Gemini AI")
    model: str = Field(default="gemini-2.5-flash", description="Gemini model to use")
    session_id: Optional[str] = Field(None, description="Session ID for chat history context")
    user_id: Optional[str] = Field(None, description="User ID for personalization")

class ChatResponse(BaseModel):
    message: str
    response: str
    model: str
    products: Optional[List[dict]] = []

class ModelInfo(BaseModel):
    name: str
    display_name: str
    supported_methods: List[str]

# Cache available models
AVAILABLE_MODELS = []

def load_gemini_models():
    """Load available Gemini models"""
    global AVAILABLE_MODELS
    try:
        models = genai.list_models()
        AVAILABLE_MODELS = [
            {
                'name': m.name.replace('models/', ''),
                'display_name': m.display_name,
                'supported_methods': m.supported_generation_methods
            }
            for m in models if 'generateContent' in m.supported_generation_methods
        ]
    except Exception as e:
        print(f"Warning: Could not load models list: {e}")

@router.get("/models", response_model=List[ModelInfo], summary="List Gemini models")
async def list_models():
    """Get list of available Gemini models"""
    return AVAILABLE_MODELS

@router.post("/chat", response_model=ChatResponse, summary="Chat with Gemini")
async def chat_with_gemini(chat_input: ChatInput):
    """Chat with Google Gemini AI"""
    try:
        # Initialize Gemini model
        model = genai.GenerativeModel(chat_input.model)
        
        # Generate response
        response = model.generate_content(chat_input.message)
        
        return ChatResponse(
            message=chat_input.message,
            response=response.text,
            model=chat_input.model
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Error communicating with Gemini: {str(e)}')

@router.post("/chat/stream", summary="Chat with Gemini (streaming)")
async def chat_with_gemini_stream(chat_input: ChatInput):
    """Chat with Google Gemini AI with streaming response"""
    async def generate():
        try:
            # Initialize Gemini model
            model = genai.GenerativeModel(chat_input.model)
            
            # Send initial metadata
            yield f"data: {json.dumps({'type': 'start', 'model': chat_input.model})}\n\n"
            
            # Stream response
            response = model.generate_content(chat_input.message, stream=True)
            
            for chunk in response:
                if chunk.text:
                    yield f"data: {json.dumps({'type': 'chunk', 'text': chunk.text})}\n\n"
            
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
async def chat_with_gemini_rag(chat_input: ChatInput):
    """Chat with Google Gemini AI using RAG prompts and chat history from ChromaDB"""
    try:
        print(f"[RAG] Received request: message='{chat_input.message[:50]}...', model={chat_input.model}, session_id={chat_input.session_id}, user_id={chat_input.user_id}")
        
        if not rag_prompt_service:
            print("[RAG] ERROR: RAG prompt service not initialized")
            raise HTTPException(status_code=500, detail='RAG prompt service not initialized')
        
        # Get all RAG prompts as context
        rag_context = rag_prompt_service.get_all_prompts_as_context()
        
        # Get user information from ChromaDB if user_id is provided
        user_context = ""
        print(f"[RAG DEBUG] Received user_id: {chat_input.user_id}, type: {type(chat_input.user_id)}")
        if chat_input.user_id and chat_input.user_id != 'anonymous' and chroma_client:
            try:
                users_collection = chroma_client.get_collection('users')
                print(f"[RAG DEBUG] Users collection has {users_collection.count()} documents")
                
                # Try with string first (ChromaDB stores userId as string)
                print(f"[RAG DEBUG] Querying with string userId: {chat_input.user_id}")
                user_results = users_collection.get(
                    where={"userId": chat_input.user_id},
                    limit=1
                )
                
                # If no result, try with int
                if not user_results['documents']:
                    try:
                        user_id_int = int(chat_input.user_id)
                        print(f"[RAG DEBUG] No result with string, trying int userId: {user_id_int}")
                        user_results = users_collection.get(
                            where={"userId": user_id_int},
                            limit=1
                        )
                    except (ValueError, TypeError):
                        pass
                
                print(f"[RAG DEBUG] Query results: {len(user_results.get('documents', []))} documents found")
                if user_results['documents']:
                    user_info = user_results['documents'][0]
                    user_context = f"\n[THÔNG TIN NGƯỜI DÙNG ĐANG CHAT]\n{user_info}\n"
                    print(f"[RAG] ✓ Found user info: {user_info[:100]}...")
                else:
                    print(f"[RAG] ✗ No user found for user_id: {chat_input.user_id}")
            except Exception as e:
                print(f"[RAG] Could not get user info: {e}")
                import traceback
                traceback.print_exc()
        else:
            print(f"[RAG DEBUG] Skipping user query - user_id: {chat_input.user_id}, chroma_client: {chroma_client is not None}")
        
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

PHONG CÁCH TRẢ LỜI:
- Nếu biết tên khách hàng, hãy xưng hô lịch sự và thân thiện (anh/chị + tên).
- Trả lời chuyên nghiệp, sinh động như đang tư vấn trực tiếp cho khách hàng.
- KHÔNG sử dụng emoji trong câu trả lời.
- Khi đề cập đến sản phẩm, LUÔN kèm theo:
  * Tên sản phẩm in đậm (**tên sản phẩm**)
  * Giá tiền được format đẹp (VD: 42.480.000 VNĐ)
  * Hình ảnh sản phẩm nếu có IMAGE_URL trong dữ liệu - BẮT BUỘC phải dùng format markdown: ![PRODUCT_NAME](IMAGE_URL)
  * Các thông tin nổi bật (màu sắc, kích thước, đặc điểm)
- Khi liệt kê nhiều sản phẩm, mỗi sản phẩm phải có:
  1. Số thứ tự và tên sản phẩm in đậm
  2. Hình ảnh (nếu có IMAGE_URL): ![Tên](URL)
  3. Mô tả và giá
- Kết thúc bằng câu hỏi mở hoặc gợi ý để tiếp tục hội thoại.

Tin nhắn người dùng: {chat_input.message}

Hãy trả lời bằng tiếng Việt, thân thiện, sinh động và hữu ích."""
        
        # Initialize Gemini model
        model = genai.GenerativeModel(chat_input.model)
        
        # Generate response
        response = model.generate_content(full_prompt)
        
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
                content=response.text,
                user_id=chat_input.user_id
            )
        
        print(f"[RAG] Returning {len(product_cards)} product cards")
        return ChatResponse(
            message=chat_input.message,
            response=response.text,
            model=chat_input.model,
            products=product_cards
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[RAG] ERROR: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f'Error communicating with Gemini: {str(e)}')

@router.post("/chat/rag/stream", summary="Chat with RAG (streaming)")
async def chat_with_gemini_rag_stream(chat_input: ChatInput):
    """Chat with Google Gemini AI using RAG prompts and chat history with streaming response"""
    if not rag_prompt_service:
        raise HTTPException(status_code=500, detail='RAG prompt service not initialized')
    
    async def generate():
        try:
            # Get all RAG prompts as context
            rag_context = rag_prompt_service.get_all_prompts_as_context()
            
            # Get user information from ChromaDB if user_id is provided
            user_context = ""
            print(f"[RAG STREAM DEBUG] Received user_id: {chat_input.user_id}, type: {type(chat_input.user_id)}")
            if chat_input.user_id and chat_input.user_id != 'anonymous' and chroma_client:
                try:
                    users_collection = chroma_client.get_collection('users')
                    print(f"[RAG STREAM DEBUG] Users collection has {users_collection.count()} documents")
                    
                    # Try with string first (ChromaDB stores userId as string)
                    print(f"[RAG STREAM DEBUG] Querying with string userId: {chat_input.user_id}")
                    user_results = users_collection.get(
                        where={"userId": chat_input.user_id},
                        limit=1
                    )
                    
                    # If no result, try with int
                    if not user_results['documents']:
                        try:
                            user_id_int = int(chat_input.user_id)
                            print(f"[RAG STREAM DEBUG] No result with string, trying int userId: {user_id_int}")
                            user_results = users_collection.get(
                                where={"userId": user_id_int},
                                limit=1
                            )
                        except (ValueError, TypeError):
                            pass
                    
                    print(f"[RAG STREAM DEBUG] Query results: {len(user_results.get('documents', []))} documents found")
                    if user_results['documents']:
                        user_info = user_results['documents'][0]
                        user_context = f"\n[THÔNG TIN NGƯỜI DÙNG ĐANG CHAT]\n{user_info}\n"
                        print(f"[RAG Stream] ✓ Found user info: {user_info[:100]}...")
                    else:
                        print(f"[RAG Stream] ✗ No user found for user_id: {chat_input.user_id}")
                except Exception as e:
                    print(f"[RAG Stream] Could not get user info: {e}")
                    import traceback
                    traceback.print_exc()
            else:
                print(f"[RAG STREAM DEBUG] Skipping user query - user_id: {chat_input.user_id}, chroma_client: {chroma_client is not None}")            # Get chat history context if session_id provided
            history_context = ""
            if chat_input.session_id and chat_history_service:
                history_context = chat_history_service.get_context_for_ai(chat_input.session_id, max_messages=10)
            
            # Search for relevant data from ChromaDB
            relevant_data = search_relevant_data(chat_input.message, n_results=5)
            
            # Construct the full prompt with RAG context + user info + relevant data + history + user message
            full_prompt = f"""Bạn là trợ lý AI chuyên nghiệp cho doanh nghiệp. Hãy tuân theo các hướng dẫn sau:

{rag_context}

{user_context}

{relevant_data}

{history_context}

QUY TẮC QUAN TRỌNG:
- Khi người dùng đã đăng nhập (có thông tin trong [THÔNG TIN NGƯỜI DÙNG ĐANG CHAT]), các câu hỏi về "đơn hàng của tôi", "thông tin của tôi", "tài khoản của tôi" sẽ TỰ ĐỘNG ÁNH XẠ sang thông tin của người dùng đang đăng nhập.
- KHÔNG cần hỏi thêm thông tin như tên, email, số điện thoại nếu đã có trong thông tin người dùng.
- Khi trả lời về đơn hàng, hãy lọc dữ liệu theo userId hoặc email của người dùng hiện tại.

PHONG CÁCH TRẢ LỜI:
- Nếu biết tên khách hàng, hãy xưng hô lịch sự và thân thiện (anh/chị + tên).
- Trả lời chuyên nghiệp, sinh động như đang tư vấn trực tiếp cho khách hàng.
- KHÔNG sử dụng emoji trong câu trả lời.
- Khi đề cập đến sản phẩm, LUÔN kèm theo:
  * Tên sản phẩm in đậm (**tên sản phẩm**)
  * Giá tiền được format đẹp (VD: 42.480.000 VNĐ)
  * Hình ảnh sản phẩm nếu có IMAGE_URL trong dữ liệu - BẮT BUỘC phải dùng format markdown: ![PRODUCT_NAME](IMAGE_URL)
  * Các thông tin nổi bật (màu sắc, kích thước, đặc điểm)
- Khi liệt kê nhiều sản phẩm, mỗi sản phẩm phải có:
  1. Số thứ tự và tên sản phẩm in đậm
  2. Hình ảnh (nếu có IMAGE_URL): ![Tên](URL)
  3. Mô tả và giá
- Kết thúc bằng câu hỏi mở hoặc gợi ý để tiếp tục hội thoại.

Tin nhắn người dùng: {chat_input.message}

Hãy trả lời bằng tiếng Việt, chuyên nghiệp và chính xác."""
            
            # Initialize Gemini model
            model = genai.GenerativeModel(chat_input.model)
            
            # Save user message to history
            if chat_input.session_id and chat_history_service:
                chat_history_service.save_message(
                    session_id=chat_input.session_id,
                    role="user",
                    content=chat_input.message,
                    user_id=chat_input.user_id
                )
            
            # Send initial metadata
            yield f"data: {json.dumps({'type': 'start', 'model': chat_input.model, 'rag_enabled': True, 'history_enabled': bool(chat_input.session_id)})}\n\n"
            
            # Stream response
            response = model.generate_content(full_prompt, stream=True)
            
            full_response = ""
            for chunk in response:
                if chunk.text:
                    full_response += chunk.text
                    yield f"data: {json.dumps({'type': 'chunk', 'text': chunk.text})}\n\n"
            
            # Save assistant response to history
            if chat_input.session_id and chat_history_service and full_response:
                chat_history_service.save_message(
                    session_id=chat_input.session_id,
                    role="assistant",
                    content=full_response,
                    user_id=chat_input.user_id
                )
            
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
