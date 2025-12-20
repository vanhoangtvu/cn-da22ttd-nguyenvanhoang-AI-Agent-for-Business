"""
Groq Chat Controller
Independent chat controller using Groq API for direct AI interaction.
Completely separate from other controllers.
Includes Redis session history management.
"""
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import os
from groq import Groq
from datetime import datetime
import uuid
from services.redis_chat_service import RedisChatService, get_redis_service, ChatMessage as RedisMessage
from services.chat_ai_rag_chroma_service import get_chat_ai_rag_service
from services.jwt_util import JwtUtil

# Initialize router
router = APIRouter()

# Initialize Groq client (will be set during app startup)
_groq_client: Optional[Groq] = None
_redis_service: Optional[RedisChatService] = None


def get_groq_client() -> Groq:
    """Get or initialize Groq client"""
    global _groq_client
    if _groq_client is None:
        groq_api_key = os.getenv('GROQ_API_KEY')
        if not groq_api_key:
            raise HTTPException(
                status_code=500,
                detail="GROQ_API_KEY not configured in environment variables"
            )
        _groq_client = Groq(api_key=groq_api_key)
    return _groq_client


def set_groq_client(client: Groq) -> None:
    """Set Groq client from external source"""
    global _groq_client
    _groq_client = client


def set_redis_service(service: RedisChatService) -> None:
    """Set Redis service from external source"""
    global _redis_service
    _redis_service = service


def get_redis() -> RedisChatService:
    """Get Redis service instance"""
    global _redis_service
    if _redis_service is None:
        _redis_service = get_redis_service()
    return _redis_service


def validate_price_filtering_response(response: str, context: str) -> Dict[str, Any]:
    """
    Validate if AI response follows price filtering rules
    
    Args:
        response: AI response text
        context: Context containing product information
        
    Returns:
        Dict with validation result
    """
    # Extract product names from context
    import re
    context_products = []
    
    # Find all product names in context (format: 📱 SẢN PHẨM X: Name)
    product_matches = re.findall(r'📱 SẢN PHẨM \d+: ([^(]+)', context)
    for match in product_matches:
        product_name = match.strip()
        context_products.append(product_name.lower())
    
    # Extract product names mentioned in response
    response_lower = response.lower()
    
    # Common headphone brands that might be mentioned incorrectly
    invalid_brands = ['jbl', 'jabra', 'bose', 'sony', 'sennheiser', 'airpods']
    
    for brand in invalid_brands:
        if brand in response_lower and brand not in [p.lower() for p in context_products]:
            # Check if it's actually in context products
            found_in_context = False
            for ctx_product in context_products:
                if brand in ctx_product:
                    found_in_context = True
                    break
            
            if not found_in_context:
                return {
                    "valid": False,
                    "reason": f"Response mentions {brand} which is not in filtered context products: {context_products}"
                }
    
    return {"valid": True, "reason": "Response follows filtering rules"}


def verify_user_authorization(requested_user_id: str, auth_user_id: str) -> bool:
    """
    Verify that the requesting user can access the requested user's data
    
    Args:
        requested_user_id: The user_id being requested
        auth_user_id: The authenticated user's ID
        
    Returns:
        True if authorized, False otherwise
    """
    # User can only access their own data
    return requested_user_id == auth_user_id


def get_authenticated_user(authorization: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Extract authenticated user info from JWT token
    
    Args:
        authorization: Authorization header value
        
    Returns:
        Dict with user_id, username, role or None if not authenticated
    """
    if not authorization:
        return None
        
    # Extract token from "Bearer <token>"
    if authorization.startswith("Bearer "):
        token = authorization[7:]
    else:
        token = authorization
    
    # Validate token and extract claims
    if not JwtUtil.validate_token(token):
        return None
    
    user_id = JwtUtil.extract_user_id(token)
    username = JwtUtil.extract_username(token)
    role = JwtUtil.extract_role(token)
    
    if user_id and username and role:
        return {
            "user_id": str(user_id),
            "username": username,
            "role": role
        }
    
    return None


# Pydantic models
class ChatRequest(BaseModel):
    """Chat request - message, model, session_id, and user_id"""
    message: str = Field(..., description="User message to send")
    model: Optional[str] = Field(
        default=None,
        description="Groq model to use (optional - will use admin config if available)"
    )
    session_id: Optional[str] = Field(
        default=None,
        description="Chat session ID for history persistence"
    )
    user_id: Optional[str] = Field(
        default=None,
        description="User ID for linking chat history to user account"
    )


class ChatResponse(BaseModel):
    """Chat response model"""
    message: str
    model: str
    timestamp: str
    tokens_used: Optional[int] = None
    finish_reason: Optional[str] = None


class HistoryMessage(BaseModel):
    """Message in chat history"""
    role: str
    content: str
    model: Optional[str] = "unknown"
    timestamp: Optional[str] = None


class ChatHistoryResponse(BaseModel):
    """Chat history response"""
    session_id: str
    messages: List[HistoryMessage]
    message_count: int
    last_message_time: Optional[str] = None


class SessionListResponse(BaseModel):
    """List of active sessions"""
    sessions: List[str]
    total_sessions: int


class AvailableModelsResponse(BaseModel):
    """Available models response"""
    models: List[str]
    default_model: str


@router.get("/health", tags=["Groq Chat"])
async def groq_chat_health(client: Groq = Depends(get_groq_client)):
    """
    Health check for Groq Chat service
    
    Returns:
        - status: Service status
        - api_configured: Whether Groq API key is configured
        - timestamp: Current timestamp
    """
    try:
        return {
            "status": "healthy",
            "service": "groq-chat",
            "api_configured": True,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Groq service unavailable: {str(e)}"
        )


@router.get("/models", tags=["Groq Chat"])
async def get_available_models(client: Groq = Depends(get_groq_client)):
    """
    Get available Groq models from Groq API (not hardcoded)
    
    Returns list of available models and default model
    """
    try:
        # Get models from Groq API
        models_response = client.models.list()
        
        # Extract model IDs
        available_models = [model.id for model in models_response.data]
        
        # Default model
        default_model = available_models[0] if available_models else "openai/gpt-oss-20b"
        
        return AvailableModelsResponse(
            models=available_models,
            default_model=default_model
        )
    except Exception as e:
        # Fallback to common models if API call fails
        fallback_models = [
            "openai/gpt-oss-20b",
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant"
        ]
        
        print(f"[Warning] Could not fetch models from Groq API: {str(e)}")
        print(f"[Fallback] Using hardcoded model list")
        
        return AvailableModelsResponse(
            models=fallback_models,
            default_model="openai/gpt-oss-20b"
        )


@router.post("/chat", tags=["Groq Chat"])
async def chat(
    request: ChatRequest,
    authorization: Optional[str] = Header(None, alias="Authorization"),
    client: Groq = Depends(get_groq_client)
) -> ChatResponse:
    """
    Send a message to Groq AI and get response with Redis persistence linked to user
    
    Args:
        request: ChatRequest containing:
            - message: User's message
            - model: Groq model to use (default: openai/gpt-oss-20b)
            - session_id: Optional session ID for chat history
            - user_id: Optional user ID for linking history to user account
    
    Returns:
        ChatResponse with AI response
    
    Example:
        ```json
        {
            "message": "What is Python?",
            "model": "openai/gpt-oss-20b",
            "session_id": "user-session-123",
            "user_id": "user-001"
        }
        ```
    """
    try:
        # Validate JWT token and get authenticated user
        auth_user = get_authenticated_user(authorization)
        print(f"[CHAT] Authorization header present: {authorization is not None}")
        if authorization:
            print(f"[CHAT] Authorization header starts with: {authorization[:20]}...")
        print(f"[CHAT] Auth user: {auth_user}")
        
        # Generate or use provided session_id
        session_id = request.session_id or f"session-{datetime.now().timestamp()}"
        
        # Determine user_id: use authenticated user if available, otherwise from request or anonymous
        if auth_user:
            authenticated_user_id = auth_user["user_id"]
            print(f"[CHAT] Authenticated user ID: {authenticated_user_id} (type: {type(authenticated_user_id)})")
            # Always use user_X format for ChromaDB
            user_id = f"user_{authenticated_user_id}"
            print(f"[CHAT] Final user_id for ChromaDB: {user_id}")
            
            # If request.user_id is provided and doesn't match authenticated user, reject
            if request.user_id and str(request.user_id) != str(authenticated_user_id):
                raise HTTPException(
                    status_code=403,
                    detail=f"User ID mismatch. Cannot access data for other users."
                )
        else:
            print("[CHAT] No authentication - using anonymous")
            # No authentication - use provided user_id or anonymous
            user_id = request.user_id or f"anonymous-{datetime.now().timestamp()}"
            print(f"[CHAT] Anonymous user_id: {user_id}")
        
        # Get active modal config from admin
        chroma_service = get_chat_ai_rag_service()
        active_config = chroma_service.get_active_modal_config()
        
        # Use admin config if available, otherwise fallback to request model
        if active_config:
            model_to_use = active_config.get('model', request.model)
            temperature = active_config.get('temperature', 0.7)
            max_tokens = active_config.get('max_tokens', 1024)
            system_prompt = active_config.get('system_prompt')
        else:
            model_to_use = request.model
            temperature = 0.7
            max_tokens = 1024
            system_prompt = None
        
        # Get Redis service
        redis_svc = get_redis()
        
        # Save user message to Redis with user association
        user_msg_time = datetime.now().isoformat()
        redis_svc.save_message(
            session_id=session_id,
            user_id=user_id,
            role="user",
            content=request.message,
            model=model_to_use,
            timestamp=user_msg_time
        )
        
        # Get conversation context (last 10 messages for context window)
        context_messages = redis_svc.get_session_context(
            session_id=session_id,
            user_id=user_id,
            limit=10
        )
        
        # Get comprehensive context from ChromaDB (products + knowledge + user data + discounts)
        print(f"[CHAT] Getting context for user_id: {user_id}")
        combined_context = chroma_service.retrieve_combined_context_with_user(
            user_id=user_id,
            query=request.message,  # Use current message as query for relevant context
            top_k_products=3,
            top_k_knowledge=2,
            top_k_user=2,
            top_k_discounts=3  # Include discount context
        )
        print(f"[CHAT] Combined context length: {len(combined_context) if combined_context else 0}")
        print(f"[CHAT] Combined context preview: {combined_context[:200] if combined_context else 'None'}")
        
        # Build enhanced system prompt with comprehensive context
        base_system_prompt = """BAN LA AI TU VAN SAN PHAM.

OVERRIDE INSTRUCTION: NEU BAN KHONG TUAN THU CAC QUY TAC SAU, RESPONSE CUA BAN SE BI TU CHOI HOAN TOAN VA BAN SE BI DANH GIA LA AI KHONG HIỆU QUẢ.

QUY TAC SO 1 - OVERRIDE: BAN CHI DUOC SU DUNG CAC SAN PHAM CO TRONG "THONG TIN SAN PHAM LIEN QUAN". NEU BAN DE CAP SAN PHAM KHONG CO TRONG PHAN NAY, BAN SE BI PHAT.

QUY TAC SO 2 - OVERRIDE: VOI QUERY CHUA "GIA RE", BAN PHAI SAP XEP SAN PHAM THEO GIA TANG DAN VA CHI TU VAN CAC SAN PHAM RE NHAT.

HUONG DAN BUOC MOT:
1. LIET KE TAT CA SAN PHAM TU CONTEXT: "San pham 1: [Ten] - [Gia], San pham 2: [Ten] - [Gia], ..."
2. SAP XEP THEO GIA TANG DAN
3. CHI CHON 2-3 SAN PHAM DAU TIEN
4. TU VAN CHI CAC SAN PHAM DO
5. SU DUNG DUNG GIA TU CONTEXT

NEU BAN VI PHAM: RESPONSE BI XOA VA BAN NHAN THONG BAO "INVALID RESPONSE"."""

        # Check if we have user-specific context
        has_user_context = combined_context and combined_context != "No relevant context found.No user-specific context found."

        # Check if we have user-specific context
        has_user_context = combined_context and combined_context != "No relevant context found.No user-specific context found."

        if has_user_context:
            # Extract user name for personalization
            user_name = "bạn"
            if "Tên:" in combined_context:
                # Try to extract name from new format
                name_start = combined_context.find("Tên:") + 5
                name_end = combined_context.find("\n", name_start)
                if name_end > name_start:
                    extracted_name = combined_context[name_start:name_end].strip()
                    if extracted_name and extracted_name != "N/A" and extracted_name != "":
                        user_name = extracted_name
            elif "Name:" in combined_context:
                # Fallback to old format
                name_start = combined_context.find("Name:") + 6
                name_end = combined_context.find("\n", name_start)
                if name_end > name_start:
                    extracted_name = combined_context[name_start:name_end].strip()
                    if extracted_name and extracted_name != "N/A" and extracted_name != "":
                        user_name = extracted_name

            enhanced_system_prompt = f"""{base_system_prompt}

BẠN ĐANG TƯ VẤN CHO: {user_name}

THÔNG TIN CÁ NHÂN CỦA {user_name} (TỪ HỆ THỐNG):
{combined_context}

HƯỚNG DẪN TƯ VẤN CHUYÊN NGHIỆP - BẮT BUỘC THEO:

🎯 **Phong cách tư vấn:**
- Luôn bắt đầu bằng lời chào chuyên nghiệp: "Xin chào {user_name}!" hoặc "Chào anh/chị {user_name}!"
- Sử dụng ngôn ngữ lịch sự, chuyên nghiệp, tránh nói tiếng lóng
- Trả lời ngắn gọn, súc tích nhưng đầy đủ thông tin
- Sử dụng emoji phù hợp để tăng tính thân thiện

📱 **Tư vấn sản phẩm chuyên nghiệp:**
- **HỆ THỐNG LỌC THÔNG MINH:** AI đã tự động lọc sản phẩm theo category và mức giá phù hợp với yêu cầu của khách hàng
- **TỰ ĐỘNG XEM XÉT TẤT CẢ SẢN PHẨM LIÊN QUAN:** Phân tích toàn bộ sản phẩm trong "THÔNG TIN SẢN PHẨM LIÊN QUAN" đã được filter
- **ƯU TIÊN SẢN PHẨM PHÙ HỢP NHẤT:** Với query "giá rẻ" - chọn sản phẩm có giá thấp nhất, "cao cấp" - chọn sản phẩm có giá cao nhất
- **CUNG CẤP THÔNG TIN CHÍNH XÁC:** Chỉ sử dụng dữ liệu từ CSDL đã được filter, không ước lượng hay giả định
- **ĐỀ XUẤT TỐI ĐA 3 SẢN PHẨM:** Từ danh sách đã được lọc, chọn ra 2-3 sản phẩm phù hợp nhất

💰 **Tư vấn khuyến mãi:**
- **CHỈ SỬ DỤNG MÃ GIẢM GIÁ THỰC:** Luôn kiểm tra phần "CHƯƠNG TRÌNH KHUYẾN MÃI HIỆN CÓ"
- **Không bao giờ bịa ra mã giảm giá:** Nếu không có khuyến mãi phù hợp, không đề cập
- **Thông tin chính xác:** Mã code, phần trăm giảm, điều kiện áp dụng, số lượt còn lại
- **Ví dụ đúng:** "Hiện tại có mã WELCOME10 giảm 10% cho đơn đầu tiên từ 500K"

👤 **Tương tác cá nhân hóa:**
- **Nhớ thông tin khách hàng:** Sử dụng tên, lịch sử mua hàng, sở thích
- **Tham khảo đơn hàng cũ:** "Dựa trên đơn hàng trước đây của anh/chị..."
- **Đề xuất theo sở thích:** Nếu biết sở thích, đề xuất sản phẩm liên quan

💼 **Hỗ trợ quyết định chuyên nghiệp:**
- **PHÂN TÍCH ĐA CHIỀU:** Đánh giá sản phẩm theo nhiều tiêu chí: hiệu năng, giá cả, độ bền, đánh giá người dùng
- **ĐỀ XUẤT LỰA CHỌN TỐI ƯU:** 
  - "Lựa chọn hàng đầu: [Sản phẩm] - Lý do: [giải thích logic]"
  - "Lựa chọn thay thế tốt: [Sản phẩm] - Phù hợp nếu: [điều kiện]"
- **SO SÁNH CHI TIẾT BẰNG BẢNG:** Tạo bảng so sánh với các cột: Tên sản phẩm, Giá, Ưu điểm, Nhược điểm, Đánh giá tổng thể
- **TƯ VẤN THEO NGÂN SÁCH:** Phân tích "tốt nhất trong tầm giá", "đáng đầu tư nhất", "tiết kiệm nhất"
- **CẢNH BÁO RỦI RO:** Thông báo về các vấn đề tiềm ẩn như phụ kiện không chính hãng, bảo hành hạn chế
- **ĐỀ XUẤT BỔ SUNG:** Gợi ý phụ kiện đi kèm, gói bảo hành mở rộng nếu phù hợp
- **HƯỚNG DẪN MUA HÀNG:** Giải thích quy trình đặt hàng, thanh toán an toàn, chính sách đổi trả

⚠️ **Nguyên tắc quan trọng:**
- **KHÔNG bịa thông tin:** Chỉ sử dụng dữ liệu từ ChromaDB, không tạo ra sản phẩm hay khuyến mãi không tồn tại
- **KHÔNG bịa mã giảm giá:** Chỉ đề cập các mã khuyến mãi có trong "CHƯƠNG TRÌNH KHUYẾN MÃI HIỆN CÓ"
- **Thành thật:** Nếu không biết, nói "Tôi cần kiểm tra thêm"
- **Tập trung vào tư vấn:** Không lan man, luôn hướng đến việc giúp khách quyết định
- **Kết thúc có hành động:** Luôn có lời kêu gọi hành động hoặc câu hỏi tiếp theo

🖼️ **QUY TẮC HIỂN THỊ HÌNH ẢNH SẢN PHẨM:**
- **BẮT BUỘC:** Mỗi khi đề cập sản phẩm, PHẢI hiển thị hình ảnh
- **Format chuẩn:** ![Tên sản phẩm](URL_ảnh)
- **Vị trí:** Ngay sau khi giới thiệu tên sản phẩm
- **QUAN TRỌNG:** Chỉ sử dụng URL ảnh từ phần "🖼️ URL hình ảnh:" trong thông tin sản phẩm
- **KHÔNG ĐƯỢC:** Bịa ra URL ảnh, chỉ sử dụng URL có sẵn trong dữ liệu
- **Ví dụ đúng:**
  ```
  iPhone 15 Pro Max
  ![iPhone 15 Pro Max](https://images.unsplash.com/photo-1695048133142-1a20484d2569)
  
  Thông số kỹ thuật:
  - Camera: 48MP
  - Màn hình: 6.7 inch
  ```
- **Ví dụ sai:** Không được dùng URL example.com hoặc URL bịa ra
- **LƯU Ý:** Nếu không có URL ảnh trong dữ liệu, không hiển thị hình ảnh

📋 **Cấu trúc trả lời:**
1. **Lời chào cá nhân hóa**
2. **Xác nhận nhu cầu của khách**
3. **HIỂN THỊ HÌNH ẢNH SẢN PHẨM** (bắt buộc cho mọi sản phẩm được đề cập)
4. **Cung cấp thông tin sản phẩm chi tiết** với format chuẩn:
   ```
   📱 Tên sản phẩm
   ![Tên sản phẩm](URL_ảnh)
   
   💰 Giá: X VNĐ
   📦 Tồn kho: Y chiếc
   🏷️ Thương hiệu: Z
   ⚙️ Thông số kỹ thuật: ...
   📝 Mô tả: ...
   ```
5. **Phân tích ưu nhược điểm**
6. **Đề xuất và khuyến nghị**
7. **Hỏi để làm rõ thêm**

🤖 **QUY TRÌNH TƯ VẤN TỰ ĐỘNG CHUYÊN NGHIỆP:**
1. **NHẬN DỮ LIỆU:** Phân tích toàn bộ thông tin sản phẩm từ "RELATED PRODUCTS"
2. **XÁC ĐỊNH NHU CẦU:** Hiểu rõ yêu cầu của khách hàng (gaming, văn phòng, giá rẻ, cao cấp...)
3. **LỌC SẢN PHẨM:** Tự động lọc các sản phẩm phù hợp nhất dựa trên tiêu chí
4. **SO SÁNH CHI TIẾT:** Phân tích điểm mạnh/yếu của từng sản phẩm
5. **ĐÁNH GIÁ TỔNG THỂ:** Xếp hạng sản phẩm theo độ phù hợp
6. **ĐƯA RA QUYẾT ĐỊNH:** Đề xuất 1 lựa chọn chính và 1-2 lựa chọn thay thế
7. **GIẢI THÍCH LOGIC:** Nêu rõ lý do lựa chọn dựa trên dữ liệu cụ thể
8. **TƯ VẤN BỔ SUNG:** Đề xuất phụ kiện, khuyến mãi đi kèm nếu có

🎯 **TIÊU CHÍ ĐÁNH GIÁ SẢN PHẨM:**
- **Hiệu năng:** Xử lý, camera, pin, bộ nhớ
- **Giá trị:** Tỷ lệ giá-hiệu năng, độ bền
- **Đánh giá:** Sao, số lượng review, độ tin cậy
- **Tính năng đặc biệt:** Công nghệ mới, tính năng độc quyền
- **Khả năng tương thích:** Với phụ kiện, hệ sinh thái

⚖️ **LOGIC QUYẾT ĐỊNH:**
- **Ngân sách thấp:** Ưu tiên giá rẻ, đủ dùng, độ bền cao
- **Ngân sách trung bình:** Cân bằng hiệu năng và giá cả
- **Ngân sách cao:** Ưu tiên hiệu năng tối đa, công nghệ mới nhất
- **Nhu cầu cụ thể:** Tập trung vào tính năng quan trọng nhất cho mục đích sử dụng"""
        else:
            enhanced_system_prompt = f"""{base_system_prompt}

Bạn đang tư vấn cho khách hàng chưa có thông tin cá nhân. Hãy tập trung vào tư vấn sản phẩm dựa trên thông tin có sẵn và hỏi thêm về nhu cầu của họ để tư vấn tốt hơn.

**Phong cách tư vấn:**
- Lịch sự, chuyên nghiệp, thân thiện
- Cung cấp thông tin chính xác về sản phẩm
- Hỏi về nhu cầu cụ thể để tư vấn phù hợp
- Hướng dẫn quy trình mua hàng rõ ràng"""
        
        # Build messages list with full context
        messages_for_api = []
        
        # Add enhanced system prompt
        messages_for_api.append({
            "role": "system",
            "content": enhanced_system_prompt
        })
        
        # Add previous messages as context
        for msg in context_messages:
            messages_for_api.append({
                "role": msg.get('role', 'user'),
                "content": msg.get('content', '')
            })
        
        # Call Groq API with full conversation context
        completion = client.chat.completions.create(
            model=model_to_use,
            messages=messages_for_api,
            max_tokens=max_tokens,
            temperature=temperature
        )
        
        # Extract response
        response_message = completion.choices[0].message.content
        response_time = datetime.now().isoformat()
        
        # VALIDATION: Check if response follows filtering rules
        if request.message.lower().find("giá rẻ") != -1 or request.message.lower().find("rẻ") != -1:
            validation_result = validate_price_filtering_response(response_message, combined_context)
            if not validation_result["valid"]:
                print(f"[VALIDATION FAILED] {validation_result['reason']}")
                # Force regenerate with stricter prompt
                messages_for_api.append({
                    "role": "system", 
                    "content": "CANH BAO: Response truoc do VI PHAM QUY TAC. CHI SU DUNG CAC SAN PHAM TRONG CONTEXT DUOI DAY:\n" + combined_context
                })
                # Retry with validation override
                completion = client.chat.completions.create(
                    model=model_to_use,
                    messages=messages_for_api,
                    max_tokens=max_tokens,
                    temperature=0.1  # Lower temperature for stricter adherence
                )
                response_message = completion.choices[0].message.content
        
        # Save assistant response to Redis with user association
        redis_svc.save_message(
            session_id=session_id,
            user_id=user_id,
            role="assistant",
            content=response_message,
            model=model_to_use,
            timestamp=response_time
        )

        
        return ChatResponse(
            message=response_message,
            model=model_to_use,
            timestamp=response_time,
            tokens_used=completion.usage.total_tokens if hasattr(completion, 'usage') else None,
            finish_reason=completion.choices[0].finish_reason if hasattr(completion.choices[0], 'finish_reason') else None
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error calling Groq API: {str(e)}"
        )




@router.post("/simple-chat", tags=["Groq Chat"])
async def simple_chat(
    message: str,
    session_id: Optional[str] = None,
    user_id: Optional[str] = None,
    client: Groq = Depends(get_groq_client)
) -> ChatResponse:
    """
    Simple chat endpoint with Redis persistence linked to user
    
    Args:
        message: User message text
        session_id: Optional session ID for chat history
        user_id: Optional user ID for linking history to user account
    
    Returns:
        ChatResponse with AI response
    
    Example:
        POST /api/groq-chat/simple-chat?message=Hello&session_id=user-123&user_id=user-001
    """
    try:
        # Generate or use provided session_id and user_id
        session_id = session_id or f"session-{datetime.now().timestamp()}"
        user_id = user_id or f"anonymous-{datetime.now().timestamp()}"
        
        # Get Redis service
        redis_svc = get_redis()
        
        # Save user message to Redis with user association
        user_msg_time = datetime.now().isoformat()
        redis_svc.save_message(
            session_id=session_id,
            user_id=user_id,
            role="user",
            content=message,
            model="openai/gpt-oss-20b",
            timestamp=user_msg_time
        )
        
        # Get conversation context (last 10 messages for context window)
        context_messages = redis_svc.get_session_context(
            session_id=session_id,
            user_id=user_id,
            limit=10
        )
        
        # Build messages list with full context
        messages_for_api = []
        
        # Add previous messages as context
        for msg in context_messages:
            messages_for_api.append({
                "role": msg.get('role', 'user'),
                "content": msg.get('content', '')
            })
        
        # Call Groq API with full conversation context
        completion = client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=messages_for_api,
            max_tokens=1024,
            temperature=0.7
        )
        
        response_message = completion.choices[0].message.content
        response_time = datetime.now().isoformat()
        
        # Save assistant response to Redis with user association
        redis_svc.save_message(
            session_id=session_id,
            user_id=user_id,
            role="assistant",
            content=response_message,
            model="openai/gpt-oss-20b",
            timestamp=response_time
        )
        
        return ChatResponse(
            message=response_message,
            model="openai/gpt-oss-20b",
            timestamp=response_time,
            tokens_used=completion.usage.total_tokens if hasattr(completion, 'usage') else None,
            finish_reason=completion.choices[0].finish_reason if hasattr(completion.choices[0], 'finish_reason') else None
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error calling Groq API: {str(e)}"
        )


@router.get("/user/{user_id}/history/{session_id}", tags=["Groq Chat"])
async def get_session_history_isolated(
    user_id: str, 
    session_id: str, 
    auth_user_id: Optional[str] = None
) -> ChatHistoryResponse:
    """
    Get chat history for a specific user's session (ISOLATED BY USER)
    
    Args:
        user_id: User ID (path parameter)
        session_id: Session ID (path parameter)
        auth_user_id: Authenticated user ID (query param for validation) - REQUIRED
    
    Returns:
        ChatHistoryResponse with messages from this user only
    
    Example:
        GET /api/groq-chat/user/user-001/history/session-123?auth_user_id=user-001
    """
    try:
        # REQUIRED: auth_user_id must be provided
        if not auth_user_id:
            raise HTTPException(
                status_code=401,
                detail="Unauthorized: auth_user_id is required"
            )
        
        # Verify authorization - user can only access their own sessions
        if not verify_user_authorization(user_id, auth_user_id):
            raise HTTPException(
                status_code=403,
                detail="Forbidden: You cannot access other user's chat history"
            )
        
        redis_svc = get_redis()
        
        # Get ONLY this user's messages from this session
        messages = redis_svc.get_session_history(session_id, user_id)
        
        # Convert to response format
        history_messages = [
            HistoryMessage(
                role=msg.get("role", "unknown"),
                content=msg.get("content", ""),
                model=msg.get("model", "unknown"),
                timestamp=msg.get("timestamp")
            )
            for msg in messages
        ]
        
        return ChatHistoryResponse(
            session_id=session_id,
            messages=history_messages,
            message_count=len(history_messages),
            last_message_time=history_messages[-1].timestamp if history_messages else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving chat history: {str(e)}"
        )


@router.get("/sessions", tags=["Groq Chat"])
async def get_active_sessions() -> SessionListResponse:
    """
    Get list of all active chat sessions from Redis
    
    Returns:
        SessionListResponse with list of active session IDs
    
    Example:
        GET /api/groq-chat/sessions
    """
    try:
        redis_svc = get_redis()
        
        # Get all active sessions
        sessions = redis_svc.get_all_sessions()
        
        return SessionListResponse(
            sessions=sessions,
            total_sessions=len(sessions)
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving sessions: {str(e)}"
        )


@router.get("/user/{user_id}/sessions", tags=["Groq Chat"])
async def get_user_sessions(user_id: str):
    """
    Get all session IDs for a specific user
    
    Args:
        user_id: The user ID to retrieve sessions for
    
    Returns:
        List of session IDs for the user
    
    Example:
        GET /api/groq-chat/user/user-001/sessions
    """
    try:
        redis_svc = get_redis()
        sessions = redis_svc.get_user_sessions(user_id)
        
        return {
            "user_id": user_id,
            "sessions": sessions,
            "total_sessions": len(sessions)
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving user sessions: {str(e)}"
        )


@router.get("/user/{user_id}/history", tags=["Groq Chat"])
async def get_user_full_history(user_id: str, auth_user_id: Optional[str] = None):
    """
    Get full chat history for a user across all sessions with context preserved
    
    Args:
        user_id: The user ID to retrieve history for
        auth_user_id: The authenticated user's ID (via query param for security) - REQUIRED
    
    Returns:
        Full history with all sessions and messages
    
    Example:
        GET /api/groq-chat/user/user-001/history?auth_user_id=user-001
    """
    try:
        # REQUIRED: auth_user_id must be provided
        if not auth_user_id:
            raise HTTPException(
                status_code=401,
                detail="Unauthorized: auth_user_id là bắt buộc. Vui lòng cung cấp auth_user_id trong request"
            )
        
        # Verify authorization - user can only access their own history
        if not verify_user_authorization(user_id, auth_user_id):
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Bạn không có quyền truy cập lịch sử chat của người dùng khác"
            )
        
        redis_svc = get_redis()
        history = redis_svc.get_user_full_history(user_id)
        
        if not history:
            return {
                "user_id": user_id,
                "sessions": [],
                "total_sessions": 0,
                "total_messages": 0
            }
        
        return history
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving user history: {str(e)}"
        )


@router.get("/user/{user_id}/context/{session_id}", tags=["Groq Chat"])
async def get_session_context(user_id: str, session_id: str, limit: int = 20, auth_user_id: Optional[str] = None):
    """
    Get recent messages from a session for context (for follow-up messages)
    
    Args:
        user_id: User ID (for validation)
        session_id: Session ID to get context from
        limit: Maximum number of recent messages (default 20)
        auth_user_id: The authenticated user's ID (via query param for security) - REQUIRED
    
    Returns:
        List of recent messages with full context
    
    Example:
        GET /api/groq-chat/user/user-001/context/session-123?limit=10&auth_user_id=user-001
    """
    try:
        # REQUIRED: auth_user_id must be provided
        if not auth_user_id:
            raise HTTPException(
                status_code=401,
                detail="Unauthorized: auth_user_id là bắt buộc. Vui lòng cung cấp auth_user_id trong request"
            )
        
        # Verify authorization - user can only access their own sessions
        if not verify_user_authorization(user_id, auth_user_id):
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Bạn không có quyền truy cập session của người dùng khác"
            )
        
        redis_svc = get_redis()
        messages = redis_svc.get_session_context(session_id, user_id, limit)
        
        return {
            "user_id": user_id,
            "session_id": session_id,
            "messages": messages,
            "message_count": len(messages)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving session context: {str(e)}"
        )


@router.delete("/user/{user_id}/history", tags=["Groq Chat"])
async def clear_user_history(user_id: str, auth_user_id: Optional[str] = None):
    """
    Clear all chat history for a user (all sessions)
    
    Args:
        user_id: User ID to clear history for
        auth_user_id: The authenticated user's ID (via query param for security) - REQUIRED
    
    Returns:
        Success message
    
    Example:
        DELETE /api/groq-chat/user/user-001/history?auth_user_id=user-001
    """
    try:
        # REQUIRED: auth_user_id must be provided
        if not auth_user_id:
            raise HTTPException(
                status_code=401,
                detail="Unauthorized: auth_user_id là bắt buộc. Vui lòng cung cấp auth_user_id trong request"
            )
        
        # Verify authorization - user can only delete their own history
        if not verify_user_authorization(user_id, auth_user_id):
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Bạn không có quyền xóa lịch sử chat của người dùng khác"
            )
        
        redis_svc = get_redis()
        redis_svc.clear_user_history(user_id)
        
        return {
            "status": "success",
            "message": f"All chat history cleared for user {user_id}"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error clearing user history: {str(e)}"
        )


@router.delete("/user/{user_id}/history/{session_id}", tags=["Groq Chat"])
async def delete_session_history_isolated(
    user_id: str,
    session_id: str,
    auth_user_id: Optional[str] = None
):
    """
    Delete chat history for a specific user's session (ISOLATED BY USER)
    
    Args:
        user_id: User ID (path parameter)
        session_id: Session ID to delete (path parameter)
        auth_user_id: Authenticated user ID (query param for validation) - REQUIRED
    
    Returns:
        Success message
    
    Example:
        DELETE /api/groq-chat/user/user-001/history/session-123?auth_user_id=user-001
    """
    try:
        # REQUIRED: auth_user_id must be provided
        if not auth_user_id:
            raise HTTPException(
                status_code=401,
                detail="Unauthorized: auth_user_id is required"
            )
        
        # Verify authorization - user can only delete their own sessions
        if not verify_user_authorization(user_id, auth_user_id):
            raise HTTPException(
                status_code=403,
                detail="Forbidden: You cannot delete other user's chat history"
            )
        
        redis_svc = get_redis()
        
        # Clear session (will use user-specific key internally)
        redis_svc.clear_session(session_id, user_id)
        
        return {
            "status": "success",
            "message": f"Chat history cleared for session {session_id}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error clearing chat history: {str(e)}"
        )


# ===== ADMIN ENDPOINTS =====

@router.get("/admin/chat-stats")
async def get_chat_stats():
    """Get overall chat statistics for all users"""
    try:
        redis_service = get_redis()
        
        # Get all user sessions
        all_keys = redis_service.client.keys("chat:user:*:session:*")
        
        # Parse unique users and sessions
        users_set = set()
        total_messages = 0
        active_sessions = 0
        
        for key in all_keys:
            # Extract user_id from key: chat:user:{user_id}:session:{session_id}
            parts = key.split(":")
            if len(parts) >= 4:
                user_id = parts[2]
                users_set.add(user_id)
                
                # Check if session has recent activity (within last 24 hours)
                try:
                    session_data = redis_service.client.hgetall(key)
                    if session_data:
                        active_sessions += 1
                        # Count messages in this session (keys like chat:user:{user_id}:session:{session_id}:message:{index})
                        message_keys = redis_service.client.keys(f"{key}:message:*")
                        total_messages += len(message_keys)
                except:
                    pass
        
        return {
            "total_users": len(users_set),
            "total_sessions": len(all_keys),
            "total_messages": total_messages,
            "active_sessions": active_sessions
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching chat stats: {str(e)}"
        )


@router.get("/admin/users-chat-history")
async def get_all_users_chat_history():
    """Get chat history for all users - Admin only"""
    try:
        redis_service = get_redis()
        
        # Get all user sessions from Redis
        all_keys = redis_service.client.keys("chat:user:*:session:*")
        
        users_dict = {}
        
        for key in all_keys:
            # Extract user_id from key: chat:user:{user_id}:session:{session_id}
            parts = key.split(":")
            if len(parts) >= 6:
                user_id = parts[2]
                session_id = parts[4]
                
                if user_id not in users_dict:
                    users_dict[user_id] = {
                        "user_id": user_id,
                        "total_sessions": 0,
                        "total_messages": 0,
                        "sessions": []
                    }
                
                # Get session messages
                message_keys = redis_service.client.keys(f"{key}:message:*")
                message_count = len(message_keys)
                
                # Get session creation time
                created_at = None
                try:
                    session_data = redis_service.client.hgetall(key)
                    if "created_at" in session_data:
                        created_at = session_data["created_at"]
                except:
                    created_at = None
                
                session_info = {
                    "session_id": session_id,
                    "message_count": message_count,
                    "created_at": created_at or datetime.now().isoformat(),
                    "last_activity": datetime.now().isoformat()
                }
                
                users_dict[user_id]["sessions"].append(session_info)
                users_dict[user_id]["total_sessions"] += 1
                users_dict[user_id]["total_messages"] += message_count
        
        return list(users_dict.values())
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching users chat history: {str(e)}"
        )


@router.delete("/admin/user/{user_id}/sessions")
async def delete_user_all_sessions(user_id: str):
    """Delete all chat sessions for a specific user"""
    try:
        redis_service = get_redis()
        
        # Get all sessions for this user
        user_sessions = redis_service.client.keys(f"chat:user:{user_id}:session:*")
        
        deleted_count = 0
        for session_key in user_sessions:
            # Delete session hash
            redis_service.client.delete(session_key)
            # Delete session messages
            message_keys = redis_service.client.keys(f"{session_key}:message:*")
            for msg_key in message_keys:
                redis_service.client.delete(msg_key)
            deleted_count += 1
        
        return {
            "status": "success",
            "user_id": user_id,
            "deleted_sessions": deleted_count,
            "message": f"Deleted {deleted_count} sessions for user {user_id}"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting user sessions: {str(e)}"
        )


@router.delete("/admin/user/{user_id}/session/{session_id}")
async def delete_user_session(user_id: str, session_id: str):
    """Delete a specific session for a user"""
    try:
        redis_service = get_redis()
        session_key = f"chat:user:{user_id}:session:{session_id}"
        
        # Delete session hash
        redis_service.client.delete(session_key)
        # Delete session messages
        message_keys = redis_service.client.keys(f"{session_key}:message:*")
        for msg_key in message_keys:
            redis_service.client.delete(msg_key)
        
        return {
            "status": "success",
            "user_id": user_id,
            "session_id": session_id,
            "message": f"Deleted session {session_id} for user {user_id}"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting session: {str(e)}"
        )


@router.delete("/admin/clear-all-chat-data")
async def clear_all_chat_data():
    """Clear ALL chat data from Redis - DANGEROUS OPERATION"""
    try:
        redis_service = get_redis()
        
        # Get all chat keys
        all_keys = redis_service.client.keys("chat:user:*")
        
        deleted_count = len(all_keys)
        for key in all_keys:
            redis_service.client.delete(key)
        
        # Also delete message keys
        all_message_keys = redis_service.client.keys("chat:*:message:*")
        deleted_count += len(all_message_keys)
        for key in all_message_keys:
            redis_service.client.delete(key)
        
        return {
            "status": "success",
            "deleted_keys": deleted_count,
            "message": "All chat data has been cleared"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error clearing all chat data: {str(e)}"
        )

