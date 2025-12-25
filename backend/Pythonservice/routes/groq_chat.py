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
import httpx
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
    suggestions: Optional[List[str]] = None  # Quick reply suggestions
    actions: Optional[List[Dict]] = None  # Action buttons for AI Agent
    products: Optional[List[Dict]] = None  # Inline products with buttons


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


def detect_action_intent(message: str, products: List[Dict], discounts: List[Dict] = None, ai_response: str = "") -> List[Dict]:
    """
    Detect if user wants to perform an action
    Returns list of action buttons to display
    """
    message_lower = message.lower()
    response_lower = ai_response.lower() if ai_response else ""
    actions = []
    
    # EARLY DETECTION: VIEW_CART intent - When viewing cart, show checkout instead of add-to-cart
    view_cart_keywords = ['giỏ hàng', 'trong giỏ', 'sản phẩm trong giỏ', 'cart', 'gio hang', 'có gì trong giỏ']
    is_viewing_cart = any(kw in message_lower for kw in view_cart_keywords) and 'thêm' not in message_lower
    
    if is_viewing_cart:
        # When viewing cart, prioritize ORDER and VIEW_CART buttons
        actions.append({
            "type": "CREATE_ORDER",
            "label": "💳 Thanh toán ngay"
        })
        actions.append({
            "type": "VIEW_CART",
            "label": "🛒 Xem chi tiết giỏ hàng"
        })
        # Also show discount options if available
        if discounts:
            for discount in discounts[:2]:  # Max 2 to avoid clutter
                code = discount.get('code', '')
                desc = discount.get('description', '')
                actions.append({
                    "type": "APPLY_DISCOUNT",
                    "discountCode": code,
                    "description": desc,
                    "label": f"🎫 Áp mã {code}"
                })
        return actions  # Return early - skip ADD_TO_CART logic below
    
    # ADD_TO_CART intent
    cart_keywords = ['thêm vào giỏ', 'mua ngay', 'đặt mua', 'add to cart', 'thêm giỏ', 'mua sản phẩm', 'cho vào giỏ', 'thêm giỏ hàng']
    if any(kw in message_lower for kw in cart_keywords):
        found_product = False
        
        # First, try to find product mentioned in user message
        for product in products:
            product_name = product.get('name', '').lower()
            if product_name and any(word in message_lower for word in product_name.split()[:2]):
                actions.append({
                    "type": "ADD_TO_CART",
                    "productId": product.get('id'),
                    "productName": product.get('name'),
                    "price": product.get('price'),
                    "quantity": 1,
                    "label": f"🛒 Thêm {product.get('name')} vào giỏ"
                })
                found_product = True
                break
        
        # If no product in message, check products mentioned in AI response
        if not found_product and response_lower:
            for product in products[:5]:  # Check first 5 products
                product_name = product.get('name', '').lower()
                if product_name and product_name in response_lower:
                    actions.append({
                        "type": "ADD_TO_CART",
                        "productId": product.get('id'),
                        "productName": product.get('name'),
                        "price": product.get('price'),
                        "quantity": 1,
                        "label": f"🛒 Thêm {product.get('name')} vào giỏ"
                    })
                    found_product = True
                    break
        
        # If still no product found, add ALL products from list (max 3)
        if not found_product and products:
            for product in products[:3]:
                actions.append({
                    "type": "ADD_TO_CART",
                    "productId": product.get('id'),
                    "productName": product.get('name'),
                    "price": product.get('price'),
                    "quantity": 1,
                    "label": f"🛒 Thêm {product.get('name')} vào giỏ"
                })
    
    # APPLY_DISCOUNT intent - Show available discounts
    discount_keywords = ['mã giảm giá', 'khuyến mãi', 'voucher', 'coupon', 'giảm giá', 'apply']
    if any(kw in message_lower for kw in discount_keywords) and discounts:
        for discount in discounts[:3]:  # Max 3 discount suggestions
            code = discount.get('code', '')
            desc = discount.get('description', '')
            actions.append({
                "type": "APPLY_DISCOUNT",
                "discountCode": code,
                "description": desc,
                "label": f"🎫 Áp mã {code}"
            })
    
    # CREATE_ORDER intent - Cả từ user và AI suggest
    order_keywords = [
        'đặt hàng', 'tạo đơn', 'checkout', 'thanh toán', 'mua luôn', 'order',
        'dat hang', 'tao don', 'thanh toan', 'mua luon', 'mua ngay'
    ]
    is_ordering = any(kw in message_lower for kw in order_keywords)
    ai_suggesting_order = any(kw in response_lower for kw in ['đặt hàng ngay', 'tiến hành đặt hàng', 'hoàn tất đơn hàng', 'xác nhận đơn hàng'])
    
    if is_ordering or ai_suggesting_order:
        # Avoid duplicate order buttons
        if not any(a.get('type') == 'CREATE_ORDER' for a in actions):
            actions.append({
                "type": "CREATE_ORDER",
                "label": "📦 Tạo đơn hàng ngay"
            })
    
    return actions


def extract_inline_products(products: List[Dict], query: str = "", max_products: int = 5) -> List[Dict]:
    """
    Extract products để hiển thị inline với buttons trong chat
    
    Args:
        products: List of product dicts from detect_action_intent
        query: User query để filter relevant products
        max_products: Số sản phẩm tối đa trả về
        
    Returns:
        List of products với format cho frontend
    """
    if not products:
        return []
    
    # Detect category from query
    query_lower = query.lower()
    category_keywords = {
        'laptop': ['laptop', 'may tinh', 'máy tính', 'macbook', 'asus', 'lenovo', 'dell', 'hp'],
        'dien thoai': ['dien thoai', 'điện thoại', 'phone', 'iphone', 'samsung', 'xiaomi', 'oppo', 'vivo'],
        'tai nghe': ['tai nghe', 'headphone', 'earphone', 'airpods'],
        'dong ho': ['dong ho', 'đồng hồ', 'watch', 'smartwatch']
    }
    
    detected_category = None
    for category, keywords in category_keywords.items():
        if any(kw in query_lower for kw in keywords):
            detected_category = category
            break
    
    # Map detected category (no diacritics) to actual category names in DB
    category_mapping = {
        'laptop': 'Laptop',
        'dien thoai': 'Điện thoại',
        'tai nghe': 'Tai nghe',
        'dong ho': 'Đồng hồ'
    }
    
    # Filter products by detected category
    filtered_products = products
    if detected_category:
        # Get actual category name with diacritics
        actual_category = category_mapping.get(detected_category, detected_category)
        filtered_products = [
            p for p in products 
            if actual_category.lower() in (p.get('category') or '').lower()
        ]
        # If no products match category, fall back to all products
        if not filtered_products:
            filtered_products = products
        print(f"[INLINE_PRODUCTS] Detected category: {detected_category} -> {actual_category}, filtered {len(filtered_products)}/{len(products)} products")
    
    # Additional filtering for gaming laptops
        is_gaming_query = any(kw in query_lower for kw in [
            'gaming', 'game', 'choi game', 'rog', 'legion', 
            'chơi game', 'fps', 'pubg', 'lol', 'liên quân'
        ])
        if detected_category == 'laptop' and is_gaming_query:
            # Filter for gaming laptops only (ROG, Legion, Gaming in name)
            gaming_laptops = [
                p for p in filtered_products
                if any(gaming_kw in (p.get('name') or '').lower() for gaming_kw in ['rog', 'legion', 'gaming', 'tuf'])
            ]
            if gaming_laptops:
                filtered_products = gaming_laptops
                print(f"[INLINE_PRODUCTS] Gaming filter applied, {len(gaming_laptops)} gaming laptops found")
        
    else:
        print(f"[INLINE_PRODUCTS] No category detected, skipping inline products")
        return []
    
    inline_products = []
    for p in filtered_products[:max_products]:
        inline_products.append({
            "id": p.get("id") or p.get("product_id"),
            "name": p.get("name") or p.get("product_name", "Sản phẩm"),
            "price": p.get("price", 0),
            "img_url": p.get("img_url") or p.get("image_url", ""),
            "stock": p.get("stock", 0),
            "category": p.get("category", ""),
        })
    
    return inline_products


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


async def get_real_cart_context(authorization: str) -> str:
    """Fetch real cart data from Spring service for AI context"""
    if not authorization:
        return ""
    try:
        # Use the same SPRING_SERVICE_URL from .env
        spring_url = os.getenv("SPRING_SERVICE_URL", "http://14.164.29.11:8089/api/v1")
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{spring_url}/cart",
                headers={"Authorization": authorization}
            )
            if response.status_code == 200:
                cart_data = response.json()
                items = cart_data.get('items', [])
                if not items:
                    with open("debug_chat.log", "a") as f:
                        f.write(f"[{datetime.now()}] Cart is empty\n")
                    return "\n\n=== GIỎ HÀNG THỰC TẾ CỦA KHÁCH ===\n(Giỏ hàng hiện tại đang trống. KHÔNG ĐƯỢC bịa sản phẩm trong giỏ hàng nếu nó trống)"
                
                cart_text = "\n\n=== GIỎ HÀNG THỰC TẾ CỦA KHÁCH ===\n"
                for item in items:
                    p = item.get('product', {})
                    cart_text += f"- {p.get('name')} (ID: {p.get('id')}) | SL: {item.get('quantity')} | Giá: {p.get('price'):,.0f}đ\n"
                cart_text += f"Tổng tiền giỏ hàng: {cart_data.get('totalAmount', 0):,.0f}đ\n"
                cart_text += "📌 LƯU Ý CHO AI: Đây là giỏ hàng thực tế. Khi khách nói 'đặt hàng sản phẩm trong giỏ', hãy xác nhận các sản phẩm này."
                with open("debug_chat.log", "a") as f:
                    f.write(f"[{datetime.now()}] Cart fetched successfully: {len(items)} items\n")
                return cart_text
            else:
                log_msg = f"[{datetime.now()}] Failed to get cart. Status: {response.status_code}, Response: {response.text}, Auth: {authorization[:20] if authorization else 'None'}\n"
                print(log_msg)
                with open("debug_chat.log", "a") as f:
                    f.write(log_msg)
                return "\n\n=== GIỎ HÀNG ===\n(Không thể lấy thông tin giỏ hàng lúc này. Vui lòng hỏi khách đã đăng nhập chưa.)"
    except Exception as e:
        log_msg = f"[{datetime.now()}] Error fetching real cart for context: {e}\n"
        print(log_msg)
        with open("debug_chat.log", "a") as f:
            f.write(log_msg)
    return ""


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
        
        # Get conversation context (last 4 messages only to stay under 8000 token limit)
        context_messages = redis_svc.get_session_context(
            session_id=session_id,
            user_id=user_id,
            limit=4  # Reduced to 4 to stay under 8000 token limit
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

        # Get real cart data - Try ChromaDB first (synced data), fallback to Spring API
        cart_context = chroma_service.get_user_cart_context(user_id)
        if not cart_context:
            # Fallback: Try to get directly from Spring API
            cart_context = await get_real_cart_context(authorization)
        if cart_context:
            combined_context += cart_context
        
        # SMART TRUNCATE: Keep discounts and user info, truncate product details if needed
        MAX_CONTEXT_CHARS = 4000  # Increased to fit more info
        if combined_context and len(combined_context) > MAX_CONTEXT_CHARS:
            print(f"[CHAT] Context too long ({len(combined_context)} chars), smart truncating...")
            
            # Split context into sections
            sections = combined_context.split('\n\n')
            
            # Identify important sections to keep
            kept_sections = []
            product_sections = []
            
            for section in sections:
                section_lower = section.lower()
                # Always keep: discounts, user info, analysis, user name, CART
                if any(kw in section_lower for kw in ['khuyến mãi', 'giảm giá', 'mã:', 'discount', 'thông tin người dùng', 'thông tin cá nhân', 'user', 'tên:', 'email:', 'phân tích yêu cầu', 'hướng dẫn tư vấn', 'giỏ hàng', 'cart']):
                    kept_sections.append(section)
                elif 'sản phẩm' in section_lower or 'chi tiết' in section_lower:
                    product_sections.append(section)
                else:
                    kept_sections.append(section)
            
            # Combine: important sections first, then as many product sections as fit
            important_text = '\n\n'.join(kept_sections)
            remaining_chars = MAX_CONTEXT_CHARS - len(important_text) - 100
            
            product_text = ''
            for section in product_sections:
                if len(product_text) + len(section) < remaining_chars:
                    product_text += '\n\n' + section
                else:
                    break
            
            combined_context = important_text + product_text + "\n\n[... Đã rút gọn để tối ưu ...]"
            print(f"[CHAT] Smart truncated to {len(combined_context)} chars")
        print(f"[CHAT] Combined context length: {len(combined_context) if combined_context else 0}")
        print(f"[CHAT] Combined context preview: {combined_context[:200] if combined_context else 'None'}")
        
        # Build enhanced system prompt with comprehensive context
        base_system_prompt = """BẠN LÀ AI TƯ VẤN SẢN PHẨM THÔNG MINH.

═══════════════════════════════════════════════════════════════════
🚨 QUY TẮC TUYỆT ĐỐI - VI PHẠM = RESPONSE BỊ TỪ CHỐI
═══════════════════════════════════════════════════════════════════

📋 BƯỚC 1: ĐỌC KỸ "🎯 PHÂN TÍCH YÊU CẦU KHÁCH HÀNG"
- Xác định DANH MỤC khách cần (điện thoại, laptop, tai nghe...)
- Xác định MỤC ĐÍCH sử dụng (gaming, văn phòng, chụp ảnh...)
- Xác định NGÂN SÁCH (giá rẻ, cao cấp, tầm trung, khoảng giá cụ thể)

📋 BƯỚC 2: TUÂN THEO "🤖 HƯỚNG DẪN TƯ VẤN CHO AI"
- Nếu có "📌 Khách muốn GIÁ RẺ" → ĐỀ XUẤT SẢN PHẨM CÓ GIÁ THẤP NHẤT trong danh sách
- Nếu có "📌 Khách muốn CAO CẤP" → ĐỀ XUẤT SẢN PHẨM CÓ GIÁ CAO NHẤT trong danh sách
- Nếu có "📌 Khoảng giá X-Y" → CHỈ ĐỀ XUẤT sản phẩm trong khoảng giá đó
- Nếu có "📌 Mục đích: gaming" → Ưu tiên sản phẩm có cấu hình mạnh, hiệu năng cao

📋 BƯỚC 3: CHỌN SẢN PHẨM TỪ DANH SÁCH ĐÃ ĐƯỢC SORT
- Danh sách sản phẩm đã được sắp xếp theo yêu cầu của khách
- Sản phẩm đầu tiên thường là PHÙ HỢP NHẤT
- Chọn 2-3 sản phẩm đầu để đề xuất

✅ VÍ DỤ ĐÚNG:
Query: "điện thoại giá rẻ"
→ Đề xuất: Redmi Note 13 Pro (7.99M), Samsung Galaxy A54 (9.99M) - đây là 2 điện thoại RẺ NHẤT

Query: "điện thoại cao cấp"  
→ Đề xuất: iPhone 15 Pro Max (29.99M), Samsung S24 Ultra (27.99M) - đây là 2 điện thoại ĐẮT NHẤT

❌ VÍ DỤ SAI:
Query: "điện thoại giá rẻ"
→ SAI: Đề xuất iPhone 15 Pro Max (29.99M) - vì đây là điện thoại ĐẮT, không phải rẻ!

═══════════════════════════════════════════════════════════════════
📌 CÁC QUY TẮC BỔ SUNG
═══════════════════════════════════════════════════════════════════
- CHỈ sử dụng sản phẩm có trong context, KHÔNG bịa ra sản phẩm
- HIỂN THỊ HÌNH ẢNH sản phẩm bằng format: ![Tên](URL)
- SO SÁNH 2-3 sản phẩm với bảng markdown
- KẾT THÚC bằng đề xuất cuối cùng và lời hỏi thêm

🛒 HỆ THỐNG HỖ TRỢ CÁC HÀNH ĐỘNG SAU:
- Khi khách muốn THÊM VÀO GIỎ HÀNG → Hệ thống sẽ hiển thị nút action để thêm
- Khi khách hỏi MÃ GIẢM GIÁ → Hệ thống sẽ hiển thị nút áp mã
- Khi khách muốn ĐẶT HÀNG → Hệ thống sẽ hiển thị popup xác nhận
⚠️ KHÔNG BAO GIỜ nói "không thể thêm vào giỏ hàng" hay "không thể đặt hàng"
→ Thay vào đó chỉ cần nói xác nhận sản phẩm và hệ thống sẽ tự hiển thị nút action

⚠️ ĐẶC BIỆT CHÚ Ý VỀ GIỎ HÀNG:
- Chỉ trả lời về nội dung giỏ hàng DỰA TRÊN thông tin "=== GIỎ HÀNG THỰC TẾ CỦA KHÁCH ===".
- Nếu không có thông tin này, nói rằng bạn không thể xem giỏ hàng của khách.
- KHÔNG BAO GIỜ tự bịa ra sản phẩm đang có trong giỏ."""

        # Check if we have user-specific context
        has_user_context = combined_context and combined_context != "No relevant context found.No user-specific context found."

        if has_user_context:
            # Extract user name for personalization
            user_name = "bạn"
            if "Tên:" in combined_context:
                # Try to extract name from new format
                name_start = combined_context.find("Tên:") + 4
                name_end = combined_context.find("\n", name_start)
                if name_end > name_start:
                    extracted_name = combined_context[name_start:name_end].strip()
                    print(f"[CHAT] Extracted user name: '{extracted_name}'")
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

TƯ VẤN CHO: {user_name}

DỮ LIỆU:
{combined_context}

QUY TẮC BẮT BUỘC:
1. LUÔN BẮT ĐẦU bằng: "Xin chào {user_name}! 👋"
2. LUÔN GỌI TÊN "{user_name}" trong mọi tin nhắn, KHÔNG dùng từ "bạn"
3. Đề xuất 2-3 sản phẩm PHÙ HỢP NHẤT từ danh sách đã được sort
4. Hiển thị ảnh: ![Tên](URL) - CHỈ dùng URL có trong dữ liệu
5. So sánh bằng bảng markdown nếu có nhiều sản phẩm
6. KHÔNG bịa sản phẩm hoặc mã giảm giá
7. Kết thúc ngắn gọn, KHÔNG gợi ý thêm (hệ thống tự động hiển thị gợi ý)"""
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

        # Generate smart suggestions based on context
        suggestions = []
        query_lower = request.message.lower()
        
        # Category-based suggestions
        if 'điện thoại' in query_lower or 'phone' in query_lower:
            suggestions = [
                "So sánh điện thoại giá rẻ và cao cấp",
                "Điện thoại chơi game tốt nhất",
                "Điện thoại chụp ảnh đẹp dưới 15 triệu",
                "Xem mã giảm giá điện thoại"
            ]
        elif 'laptop' in query_lower or 'macbook' in query_lower:
            suggestions = [
                "Laptop văn phòng giá rẻ",
                "So sánh MacBook và laptop Windows",
                "Laptop gaming dưới 25 triệu",
                "Xem khuyến mãi laptop"
            ]
        elif 'tai nghe' in query_lower or 'headphone' in query_lower or 'airpods' in query_lower:
            suggestions = [
                "Tai nghe chống ồn tốt nhất",
                "So sánh AirPods và Sony",
                "Tai nghe bluetooth giá rẻ",
                "Xem tất cả tai nghe"
            ]
        elif 'apple' in query_lower:
            suggestions = [
                "So sánh các sản phẩm Apple",
                "Phụ kiện Apple chính hãng",
                "Chương trình trade-in Apple",
                "Xem mã giảm giá Apple"
            ]
        elif 'giá rẻ' in query_lower or 'rẻ' in query_lower:
            suggestions = [
                "Xem thêm sản phẩm giá rẻ",
                "Sản phẩm dưới 5 triệu",
                "Khuyến mãi hot hôm nay",
                "Tư vấn theo ngân sách cụ thể"
            ]
        elif 'cao cấp' in query_lower or 'premium' in query_lower:
            suggestions = [
                "Sản phẩm flagship mới nhất",
                "So sánh các dòng cao cấp",
                "Chính sách bảo hành VIP",
                "Xem ưu đãi premium"
            ]
        else:
            # Default suggestions
            suggestions = [
                "Xem điện thoại hot nhất",
                "Laptop bán chạy",
                "Tai nghe được yêu thích",
                "Khuyến mãi đang có"
            ]
        
        # Detect action intents from user message AND AI response
        actions = []
        try:
            import re
            # Get products list for action detection
            chroma_service = get_chat_ai_rag_service()
            products_for_action = []
            discounts_for_action = []
            
            # Get products from ChromaDB
            product_collection = chroma_service._get_or_create_product_collection()
            all_products = product_collection.get(limit=50, include=['metadatas'])
            if all_products and all_products.get('metadatas'):
                for meta in all_products['metadatas']:
                    products_for_action.append({
                        'id': int(meta.get('product_id', 0)),
                        'name': meta.get('product_name', ''),
                        'price': meta.get('price', 0)
                    })
            
            # Get discounts mentioned in AI response
            discount_context = chroma_service.retrieve_discount_context(request.message, top_k=5)
            
            # Extract discount codes from AI response OR context
            discount_codes_in_response = re.findall(r'(?:GADGET|SAVE|BLACK|WELCOME|LOYAL|FLASH|HOT|VIP)\w*', response_message.upper())
            discount_codes_in_context = re.findall(r'MÃ: (\w+)', discount_context) if discount_context else []
            
            # Combine and deduplicate
            all_discount_codes = list(set(discount_codes_in_response + discount_codes_in_context))
            
            for code in all_discount_codes[:4]:  # Max 4 discount buttons
                discounts_for_action.append({
                    'code': code,
                    'description': f'Áp dụng mã {code}'
                })
            
            # Detect user intent actions
            actions = detect_action_intent(request.message, products_for_action, discounts_for_action, response_message)
            
            # Also detect products mentioned in AI response and add cart buttons
            response_lower = response_message.lower()
            
            # Keywords indicating AI is suggesting to add to cart
            suggesting_buy = any(kw in response_lower for kw in ['thêm vào giỏ', 'muốn mua', 'muốn đặt', 'đặt hàng', 'mua ngay'])
            
            for product in products_for_action:
                product_name = product.get('name', '').lower()
                if not product_name or len(product_name) < 3:
                    continue
                    
                # Check if product name words appear in response
                name_words = product_name.split()
                # Match if at least 2 significant words match (for multi-word names)
                significant_words = [w for w in name_words if len(w) > 2]
                if significant_words:
                    matches = sum(1 for w in significant_words if w in response_lower)
                    is_mentioned = matches >= min(2, len(significant_words))
                else:
                    is_mentioned = product_name in response_lower
                
                if is_mentioned or (suggesting_buy and len(products_for_action) <= 3):
                    # Check if we already have this product action
                    already_added = any(a.get('productId') == product.get('id') for a in actions)
                    if not already_added:
                        actions.append({
                            "type": "ADD_TO_CART",
                            "productId": product.get('id'),
                            "productName": product.get('name'),
                            "price": product.get('price'),
                            "quantity": 1,
                            "label": f"🛒 Thêm {product.get('name')} vào giỏ"
                        })
            
            # If discounts were shown in response, add discount buttons
            if discounts_for_action and ('mã giảm' in response_lower or 'khuyến mãi' in response_lower or 'giảm giá' in response_lower):
                for discount in discounts_for_action:
                    # Check if we already have this discount action
                    already_added = any(a.get('discountCode') == discount.get('code') for a in actions)
                    if not already_added:
                        actions.append({
                            "type": "APPLY_DISCOUNT",
                            "discountCode": discount.get('code'),
                            "description": discount.get('description'),
                            "label": f"🎫 Áp mã {discount.get('code')}"
                        })
            
            print(f"[CHAT] Detected {len(actions)} actions: {[a.get('type') for a in actions]}")
        except Exception as action_error:
            print(f"[CHAT] Action detection error: {action_error}")
            actions = []
        
        # Extract inline products for display in chat
        inline_products = extract_inline_products(products_for_action, request.message)
        print(f"[CHAT] Extracted {len(inline_products)} inline products")
        
        return ChatResponse(
            message=response_message,
            model=model_to_use,
            timestamp=response_time,
            tokens_used=completion.usage.total_tokens if hasattr(completion, 'usage') else None,
            finish_reason=completion.choices[0].finish_reason if hasattr(completion.choices[0], 'finish_reason') else None,
            suggestions=suggestions,
            actions=actions if actions else None,
            products=inline_products if inline_products else None
        )
        
    except Exception as e:
        error_msg = str(e)
        print(f"[CHAT ERROR] {error_msg}")
        
        # Check for token limit errors
        if "token" in error_msg.lower() or "context" in error_msg.lower() or "limit" in error_msg.lower():
            raise HTTPException(
                status_code=400,
                detail="Cuộc hội thoại quá dài. Vui lòng tạo session mới để tiếp tục."
            )
        
        raise HTTPException(
            status_code=500,
            detail=f"Error calling Groq API: {error_msg}"
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

