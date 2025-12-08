"""
RAG Prompts API Routes
Manages RAG prompts for AI responses
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from services.rag_prompt_service import RAGPromptService

# Create router
router = APIRouter()

# Global service instance
rag_prompt_service = None

def set_rag_prompt_service(service: RAGPromptService):
    """Set the RAG prompt service instance"""
    global rag_prompt_service
    rag_prompt_service = service

# Pydantic models
class PromptInput(BaseModel):
    prompt: str = Field(..., description="The RAG prompt text", example="When greeting users, always be friendly and professional.")
    category: Optional[str] = Field(None, description="Category of the prompt", example="greeting")
    tags: Optional[List[str]] = Field(None, description="Tags for the prompt", example=["customer-service", "friendly"])
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")

class PromptUpdate(BaseModel):
    prompt: Optional[str] = Field(None, description="New prompt text")
    category: Optional[str] = Field(None, description="New category")
    tags: Optional[List[str]] = Field(None, description="New tags")
    metadata: Optional[Dict[str, Any]] = Field(None, description="New metadata")

class PromptResponse(BaseModel):
    id: str
    prompt: str
    category: str
    tags: List[str]
    metadata: Dict[str, Any]
    message: str

class PromptListItem(BaseModel):
    id: str
    prompt: str
    category: str
    tags: List[str]
    metadata: Dict[str, Any]

class Stats(BaseModel):
    total_prompts: int
    categories: Dict[str, int]
    collection_name: str

class DeleteResponse(BaseModel):
    id: Optional[str] = None
    deleted_count: Optional[int] = None
    category: Optional[str] = None
    message: str


@router.post("/prompts", response_model=PromptResponse, status_code=201, summary="Push RAG prompt")
async def push_rag_prompt(prompt_input: PromptInput):
    """Push a new RAG prompt to ChromaDB"""
    try:
        print(f"[RAG] Received prompt: {prompt_input.prompt[:50]}...")
        print(f"[RAG] Category: {prompt_input.category}, Tags: {prompt_input.tags}")
        
        if not rag_prompt_service:
            print("[RAG] ERROR: rag_prompt_service is None!")
            raise HTTPException(status_code=500, detail="RAG service not initialized")
        
        result = rag_prompt_service.push_prompt(
            prompt=prompt_input.prompt,
            category=prompt_input.category,
            tags=prompt_input.tags,
            metadata=prompt_input.metadata
        )
        print(f"[RAG] Successfully pushed prompt with ID: {result.get('id')}")
        return result
    except Exception as e:
        print(f"[RAG] Error pushing prompt: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f'Error pushing prompt: {str(e)}')


@router.get("/prompts", response_model=List[PromptListItem], summary="Get RAG prompts")
async def get_rag_prompts(
    category: Optional[str] = Query(None, description="Filter by category"),
    tags: Optional[str] = Query(None, description="Filter by tags (comma-separated)"),
    limit: Optional[int] = Query(None, description="Maximum number of prompts to return")
):
    """Get all RAG prompts from ChromaDB"""
    try:
        if not rag_prompt_service:
            print("[RAG] ERROR: rag_prompt_service is None!")
            raise HTTPException(status_code=500, detail="RAG service not initialized")
            
        # Parse tags
        tags_list = tags.split(',') if tags else None
        
        prompts = rag_prompt_service.get_prompts(
            category=category,
            tags=tags_list,
            limit=limit
        )
        return prompts
    except Exception as e:
        print(f"[RAG] Error getting prompts: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f'Error getting prompts: {str(e)}')


@router.delete("/prompts", response_model=DeleteResponse, summary="Delete all prompts")
async def delete_all_prompts(
    category: Optional[str] = Query(None, description="Delete only prompts in this category")
):
    """Delete all RAG prompts or prompts in a specific category"""
    try:
        result = rag_prompt_service.delete_all_prompts(category=category)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Error deleting prompts: {str(e)}')


@router.get("/prompts/{prompt_id}", response_model=PromptListItem, summary="Get prompt by ID")
async def get_rag_prompt(prompt_id: str):
    """Get a specific RAG prompt by ID"""
    try:
        prompt = rag_prompt_service.get_prompt_by_id(prompt_id)
        
        if not prompt:
            raise HTTPException(status_code=404, detail=f'Prompt with ID "{prompt_id}" not found')
        
        return prompt
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Error getting prompt: {str(e)}')


@router.put("/prompts/{prompt_id}", response_model=PromptResponse, summary="Update prompt")
async def update_rag_prompt(prompt_id: str, prompt_update: PromptUpdate):
    """Update a specific RAG prompt"""
    try:
        result = rag_prompt_service.update_prompt(
            prompt_id=prompt_id,
            prompt=prompt_update.prompt,
            category=prompt_update.category,
            tags=prompt_update.tags,
            metadata=prompt_update.metadata
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Error updating prompt: {str(e)}')


@router.delete("/prompts/{prompt_id}", response_model=DeleteResponse, summary="Delete prompt")
async def delete_rag_prompt(prompt_id: str):
    """Delete a specific RAG prompt"""
    try:
        result = rag_prompt_service.delete_prompt(prompt_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Error deleting prompt: {str(e)}')


@router.get("/prompts/context", summary="Get prompts as context")
async def get_prompts_context(
    category: Optional[str] = Query(None, description="Filter by category"),
    tags: Optional[str] = Query(None, description="Filter by tags (comma-separated)")
):
    """Get all RAG prompts formatted as context string for AI"""
    try:
        tags_list = tags.split(',') if tags else None
        
        context = rag_prompt_service.get_all_prompts_as_context(
            category=category,
            tags=tags_list
        )
        
        return {
            'context': context,
            'category': category,
            'tags': tags_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Error generating context: {str(e)}')


@router.get("/stats", response_model=Stats, summary="Get RAG stats")
async def get_rag_stats():
    """Get statistics about RAG prompts"""
    try:
        stats = rag_prompt_service.get_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Error getting stats: {str(e)}')
