"""
Chat History API Routes
Manages chat history for context-aware AI responses
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from services.chat_history_service import ChatHistoryService

# Create router
router = APIRouter()

# Global service instance
chat_history_service = None

def set_chat_history_service(service: ChatHistoryService):
    """Set the chat history service instance"""
    global chat_history_service
    chat_history_service = service

# Pydantic models
class MessageInput(BaseModel):
    session_id: str = Field(..., description="Unique session/conversation ID")
    role: str = Field(..., description="'user' or 'assistant'")
    content: str = Field(..., description="Message content")
    user_id: Optional[str] = Field(None, description="Optional user ID")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")

class MessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    timestamp: str
    message: str

class SessionHistoryResponse(BaseModel):
    session_id: str
    messages: List[Dict[str, Any]]
    count: int

class SearchInput(BaseModel):
    query: str = Field(..., description="Search query")
    user_id: Optional[str] = Field(None, description="Filter by user ID")
    n_results: int = Field(default=5, description="Number of results")

class DeleteResponse(BaseModel):
    session_id: str
    deleted_count: int
    message: str

class StatsResponse(BaseModel):
    total_messages: int
    total_sessions: int
    total_users: int
    collection_name: str


@router.post("/messages", response_model=MessageResponse, status_code=201, summary="Save message")
async def save_message(message_input: MessageInput):
    """Save a chat message to history"""
    try:
        if not chat_history_service:
            raise HTTPException(status_code=500, detail='Chat history service not initialized')
        
        result = chat_history_service.save_message(
            session_id=message_input.session_id,
            role=message_input.role,
            content=message_input.content,
            user_id=message_input.user_id,
            metadata=message_input.metadata
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Error saving message: {str(e)}')


@router.get("/sessions/{session_id}", response_model=SessionHistoryResponse, summary="Get session history")
async def get_session_history(
    session_id: str,
    limit: Optional[int] = Query(20, description="Maximum messages to return")
):
    """Get chat history for a session"""
    try:
        if not chat_history_service:
            raise HTTPException(status_code=500, detail='Chat history service not initialized')
        
        messages = chat_history_service.get_session_history(session_id, limit)
        return {
            "session_id": session_id,
            "messages": messages,
            "count": len(messages)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Error getting session history: {str(e)}')


@router.get("/sessions/{session_id}/context", summary="Get context for AI")
async def get_context_for_ai(
    session_id: str,
    max_messages: int = Query(10, description="Maximum messages for context")
):
    """Get formatted chat history as context for AI"""
    try:
        if not chat_history_service:
            raise HTTPException(status_code=500, detail='Chat history service not initialized')
        
        context = chat_history_service.get_context_for_ai(session_id, max_messages)
        return {
            "session_id": session_id,
            "context": context,
            "max_messages": max_messages
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Error getting context: {str(e)}')


@router.delete("/sessions/{session_id}", response_model=DeleteResponse, summary="Delete session")
async def delete_session(session_id: str):
    """Delete all messages in a session"""
    try:
        if not chat_history_service:
            raise HTTPException(status_code=500, detail='Chat history service not initialized')
        
        result = chat_history_service.delete_session(session_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Error deleting session: {str(e)}')


@router.post("/search", summary="Search similar conversations")
async def search_conversations(search_input: SearchInput):
    """Search for similar past conversations"""
    try:
        if not chat_history_service:
            raise HTTPException(status_code=500, detail='Chat history service not initialized')
        
        results = chat_history_service.search_similar_conversations(
            query=search_input.query,
            user_id=search_input.user_id,
            n_results=search_input.n_results
        )
        return {
            "query": search_input.query,
            "results": results,
            "count": len(results)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Error searching: {str(e)}')


@router.get("/users/{user_id}/sessions", summary="Get user sessions")
async def get_user_sessions(
    user_id: str,
    limit: int = Query(20, description="Maximum sessions to return")
):
    """Get all sessions for a user"""
    try:
        if not chat_history_service:
            raise HTTPException(status_code=500, detail='Chat history service not initialized')
        
        sessions = chat_history_service.get_user_sessions(user_id, limit)
        return {
            "user_id": user_id,
            "sessions": sessions,
            "count": len(sessions)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Error getting user sessions: {str(e)}')


@router.get("/stats", response_model=StatsResponse, summary="Get chat stats")
async def get_stats():
    """Get statistics about chat history"""
    try:
        if not chat_history_service:
            raise HTTPException(status_code=500, detail='Chat history service not initialized')
        
        stats = chat_history_service.get_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Error getting stats: {str(e)}')


@router.get("/all-sessions", summary="Get all sessions for admin")
async def get_all_sessions(
    limit: int = Query(100, description="Maximum sessions to return")
):
    """Get all chat sessions for admin management"""
    try:
        if not chat_history_service:
            raise HTTPException(status_code=500, detail='Chat history service not initialized')
        
        sessions = chat_history_service.get_all_sessions(limit)
        return {
            "sessions": sessions,
            "count": len(sessions)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Error getting all sessions: {str(e)}')
