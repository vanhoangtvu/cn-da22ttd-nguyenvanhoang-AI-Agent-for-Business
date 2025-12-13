"""
Customer Chat API Routes
Handles customer chat with RAG-enhanced responses
Separate from business analytics
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from services.customer_rag_service import CustomerRAGService
from services.ai_service import get_ai_service
from services.chat_history_service import ChatHistoryService

router = APIRouter()

# Global service instances
customer_rag_service = None
chat_history_service = None

def set_customer_rag_service(service: CustomerRAGService):
    """Set customer RAG service instance"""
    global customer_rag_service
    customer_rag_service = service

def set_chat_history_service(service: ChatHistoryService):
    """Set chat history service instance"""
    global chat_history_service
    chat_history_service = service


# Pydantic models
class CustomerChatRequest(BaseModel):
    message: str = Field(..., description="Customer message")
    user_id: Optional[str] = Field(None, description="User ID for chat history")
    model_id: Optional[str] = Field("gemini-2.5-flash", description="AI model to use")
    use_rag: Optional[bool] = Field(True, description="Use RAG for enhanced responses")

class CustomerChatResponse(BaseModel):
    response: str
    model_used: str
    rag_used: bool
    relevant_products: Optional[List[Dict[str, Any]]] = None

class PromptInput(BaseModel):
    prompt: str = Field(..., description="RAG prompt for customer chat")
    category: Optional[str] = Field("customer_service", description="Prompt category")
    tags: Optional[List[str]] = Field(None, description="Tags")

class ProductInfoInput(BaseModel):
    product_id: str
    name: str
    description: str
    price: float
    category: Optional[str] = None
    quantity: Optional[int] = 0

class SearchProductRequest(BaseModel):
    query: str = Field(..., description="Search query")
    limit: Optional[int] = Field(5, description="Number of results")


@router.post("/chat", response_model=CustomerChatResponse, summary="Customer chat with AI")
async def customer_chat(request: CustomerChatRequest):
    """
    Handle customer chat with RAG-enhanced AI responses
    Uses separate customer RAG database
    """
    try:
        if not customer_rag_service:
            raise HTTPException(status_code=500, detail="Customer RAG service not initialized")
        
        ai_service = get_ai_service()
        
        # Build context from RAG if enabled
        rag_context = ""
        relevant_products = []
        
        if request.use_rag:
            # Search for relevant prompts
            relevant_prompts = customer_rag_service.search_prompts(request.message, n_results=2)
            
            # Search for relevant products
            relevant_products_data = customer_rag_service.search_products(request.message, n_results=3)
            
            if relevant_prompts:
                rag_context += "\n\nRelevant guidelines:\n"
                for prompt in relevant_prompts:
                    rag_context += f"- {prompt['prompt']}\n"
            
            if relevant_products_data:
                rag_context += "\n\nRelevant products:\n"
                for product in relevant_products_data:
                    rag_context += f"{product['content']}\n"
                    relevant_products.append(product)
        
        # Build system instruction
        system_instruction = """You are a helpful customer service assistant for an e-commerce business.
Your goal is to assist customers with:
- Product inquiries
- Order questions
- General shopping assistance
- Recommendations

Be friendly, professional, and helpful. Always prioritize customer satisfaction."""
        
        if rag_context:
            system_instruction += f"\n\nContext from knowledge base:{rag_context}"
        
        # Get chat history if user_id provided
        chat_context = ""
        if request.user_id and chat_history_service:
            history = chat_history_service.get_chat_history(request.user_id, limit=5)
            if history:
                chat_context = "\n\nRecent conversation:\n"
                for msg in history[-5:]:
                    role = "Customer" if msg['role'] == 'user' else "Assistant"
                    chat_context += f"{role}: {msg['message']}\n"
        
        full_prompt = chat_context + "\n\nCustomer: " + request.message if chat_context else request.message
        
        # Generate response using AI service
        response_text = ai_service.generate(
            model_id=request.model_id,
            prompt=full_prompt,
            system_instruction=system_instruction
        )
        
        # Save to chat history
        if request.user_id and chat_history_service:
            chat_history_service.save_message(request.user_id, "user", request.message)
            chat_history_service.save_message(request.user_id, "assistant", response_text)
        
        print(f"[Customer Chat] Generated response for user: {request.user_id}")
        
        return {
            "response": response_text,
            "model_used": request.model_id,
            "rag_used": request.use_rag,
            "relevant_products": relevant_products if relevant_products else None
        }
        
    except Exception as e:
        print(f"[Customer Chat] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@router.post("/prompts", summary="Add customer service prompt")
async def add_customer_prompt(prompt_input: PromptInput):
    """Add a new RAG prompt for customer service"""
    try:
        if not customer_rag_service:
            raise HTTPException(status_code=500, detail="Customer RAG service not initialized")
        
        result = customer_rag_service.push_prompt(
            prompt=prompt_input.prompt,
            category=prompt_input.category,
            tags=prompt_input.tags
        )
        
        return result
        
    except Exception as e:
        print(f"[Customer Chat] Error adding prompt: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/products", summary="Add product information")
async def add_product_info(product: ProductInfoInput):
    """Add product information to customer RAG"""
    try:
        if not customer_rag_service:
            raise HTTPException(status_code=500, detail="Customer RAG service not initialized")
        
        product_data = {
            "name": product.name,
            "description": product.description,
            "price": product.price,
            "category": product.category or "General",
            "quantity": product.quantity or 0
        }
        
        result = customer_rag_service.add_product_info(product.product_id, product_data)
        
        return result
        
    except Exception as e:
        print(f"[Customer Chat] Error adding product: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/products/search", summary="Search products")
async def search_products(request: SearchProductRequest):
    """Search for products using customer query"""
    try:
        if not customer_rag_service:
            raise HTTPException(status_code=500, detail="Customer RAG service not initialized")
        
        products = customer_rag_service.search_products(
            query=request.query,
            n_results=request.limit
        )
        
        return {
            "query": request.query,
            "results": products,
            "count": len(products)
        }
        
    except Exception as e:
        print(f"[Customer Chat] Error searching products: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats", summary="Get customer chat statistics")
async def get_customer_stats():
    """Get statistics about customer RAG data"""
    try:
        if not customer_rag_service:
            raise HTTPException(status_code=500, detail="Customer RAG service not initialized")
        
        stats = customer_rag_service.get_stats()
        return stats
        
    except Exception as e:
        print(f"[Customer Chat] Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
