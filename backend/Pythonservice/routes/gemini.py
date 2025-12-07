from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List
import google.generativeai as genai
import json

# Create router
router = APIRouter()

# Global RAG prompt service instance
rag_prompt_service = None
chat_history_service = None

def set_rag_prompt_service(service):
    """Set the RAG prompt service instance"""
    global rag_prompt_service
    rag_prompt_service = service

def set_chat_history_service(service):
    """Set the chat history service instance"""
    global chat_history_service
    chat_history_service = service

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
        print(f"[RAG] Received request: message='{chat_input.message[:50]}...', model={chat_input.model}, session_id={chat_input.session_id}")
        
        if not rag_prompt_service:
            print("[RAG] ERROR: RAG prompt service not initialized")
            raise HTTPException(status_code=500, detail='RAG prompt service not initialized')
        
        # Get all RAG prompts as context
        rag_context = rag_prompt_service.get_all_prompts_as_context()
        
        # Get chat history context if session_id provided
        history_context = ""
        if chat_input.session_id and chat_history_service:
            history_context = chat_history_service.get_context_for_ai(chat_input.session_id, max_messages=10)
        
        # Construct the full prompt with RAG context + history + user message
        full_prompt = f"""Bạn là trợ lý AI thông minh cho doanh nghiệp. Hãy tuân theo các hướng dẫn sau:

{rag_context}

{history_context}

Tin nhắn người dùng: {chat_input.message}

Hãy trả lời bằng tiếng Việt, thân thiện và hữu ích. Nếu có lịch sử hội thoại, hãy sử dụng ngữ cảnh đó để trả lời phù hợp hơn."""
        
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
        
        return ChatResponse(
            message=chat_input.message,
            response=response.text,
            model=chat_input.model
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
            
            # Get chat history context if session_id provided
            history_context = ""
            if chat_input.session_id and chat_history_service:
                history_context = chat_history_service.get_context_for_ai(chat_input.session_id, max_messages=10)
            
            # Construct the full prompt with RAG context + history + user message
            full_prompt = f"""Bạn là trợ lý AI thông minh cho doanh nghiệp. Hãy tuân theo các hướng dẫn sau:

{rag_context}

{history_context}

Tin nhắn người dùng: {chat_input.message}

Hãy trả lời bằng tiếng Việt, thân thiện và hữu ích. Nếu có lịch sử hội thoại, hãy sử dụng ngữ cảnh đó để trả lời phù hợp hơn."""
            
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
