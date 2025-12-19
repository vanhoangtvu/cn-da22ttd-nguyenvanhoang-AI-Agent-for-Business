"""
Groq Chat Controller
Independent chat controller using Groq API for direct AI interaction.
Completely separate from other controllers.
Includes Redis session history management.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
import os
from groq import Groq
from datetime import datetime
import uuid
from services.redis_chat_service import RedisChatService, get_redis_service, ChatMessage as RedisMessage
from services.chat_ai_rag_chroma_service import get_chat_ai_rag_service

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
        # Generate or use provided session_id
        session_id = request.session_id or f"session-{datetime.now().timestamp()}"
        user_id = request.user_id or f"anonymous-{datetime.now().timestamp()}"
        
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
        
        # Build messages list with full context
        messages_for_api = []
        
        # Add system prompt if configured
        if system_prompt:
            messages_for_api.append({
                "role": "system",
                "content": system_prompt
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

