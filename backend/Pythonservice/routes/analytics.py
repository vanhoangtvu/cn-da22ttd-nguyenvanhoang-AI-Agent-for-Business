"""
Business Analytics API Routes
Handles business intelligence and analytics
Separate from customer chat
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from services.analytics_rag_service import AnalyticsRAGService
from services.ai_service import get_ai_service
from datetime import datetime

router = APIRouter()

# Global service instance
analytics_rag_service = None

def set_analytics_rag_service(service: AnalyticsRAGService):
    """Set analytics RAG service instance"""
    global analytics_rag_service
    analytics_rag_service = service


# Pydantic models
class AnalyticsRequest(BaseModel):
    query: str = Field(..., description="Analytics query")
    model_id: Optional[str] = Field("gemini-2.5-pro", description="AI model to use")
    data_types: Optional[List[str]] = Field(None, description="Types of data to analyze")
    include_trends: Optional[bool] = Field(True, description="Include trend analysis")

class AnalyticsResponse(BaseModel):
    analysis: str
    model_used: str
    data_sources: List[str]
    insights: Optional[Dict[str, Any]] = None

class BusinessDataInput(BaseModel):
    data_id: str
    data_content: str
    data_type: str = Field(..., description="Type: revenue, sales, inventory, etc.")
    metadata: Optional[Dict[str, Any]] = None

class OrderAnalyticsInput(BaseModel):
    order_id: str
    customer_id: Optional[str] = None
    total_amount: float
    products: List[Dict[str, Any]]
    order_date: str
    metadata: Optional[Dict[str, Any]] = None

class TrendInput(BaseModel):
    trend_id: str
    trend_description: str
    trend_type: str = Field(..., description="Type: sales_increase, seasonal_pattern, etc.")
    metadata: Optional[Dict[str, Any]] = None


@router.post("/analyze", response_model=AnalyticsResponse, summary="Analyze business data")
async def analyze_business_data(request: AnalyticsRequest):
    """
    Analyze business data using AI with RAG
    Uses separate analytics RAG database
    """
    try:
        if not analytics_rag_service:
            raise HTTPException(status_code=500, detail="Analytics RAG service not initialized")
        
        ai_service = get_ai_service()
        
        # Gather relevant data from analytics RAG
        relevant_data = []
        data_sources = []
        
        # Search business data
        if not request.data_types or "business" in request.data_types:
            business_data = analytics_rag_service.search_business_data(
                query=request.query,
                n_results=10
            )
            relevant_data.extend(business_data)
            if business_data:
                data_sources.append("business_data")
        
        # Search order patterns
        if not request.data_types or "orders" in request.data_types:
            order_data = analytics_rag_service.search_order_patterns(
                query=request.query,
                n_results=15
            )
            relevant_data.extend(order_data)
            if order_data:
                data_sources.append("order_patterns")
        
        # Build context from data
        data_context = "\n\nRelevant business data:\n"
        for i, data_item in enumerate(relevant_data[:20], 1):
            content = data_item.get('content') or data_item.get('summary', '')
            metadata = data_item.get('metadata', {})
            data_context += f"\n{i}. {content}"
            if metadata:
                data_context += f"\n   Metadata: {metadata}"
        
        # Build system instruction
        system_instruction = """You are an expert business analyst specializing in:
- Sales analysis and forecasting
- Revenue optimization
- Inventory management
- Customer behavior analysis
- Market trends
- Strategic recommendations

IMPORTANT: Always respond in Vietnamese language.
Provide data-driven insights, actionable recommendations, and clear explanations in Vietnamese.
Use quantitative analysis where possible and explain in Vietnamese."""
        
        system_instruction += data_context
        
        # Generate analysis
        analysis_text = ai_service.generate(
            model_id=request.model_id,
            prompt=request.query,
            system_instruction=system_instruction
        )
        
        # Extract insights (simple version)
        insights = {
            "data_points_analyzed": len(relevant_data),
            "sources_used": data_sources,
            "timestamp": datetime.now().isoformat()
        }
        
        print(f"[Analytics] Generated analysis with {len(relevant_data)} data points")
        
        return {
            "analysis": analysis_text,
            "model_used": request.model_id,
            "data_sources": data_sources,
            "insights": insights
        }
        
    except Exception as e:
        print(f"[Analytics] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Analytics error: {str(e)}")


@router.post("/data", summary="Store business data")
async def store_business_data(data_input: BusinessDataInput):
    """Store business data for analytics"""
    try:
        if not analytics_rag_service:
            raise HTTPException(status_code=500, detail="Analytics RAG service not initialized")
        
        result = analytics_rag_service.store_business_data(
            data_id=data_input.data_id,
            data_content=data_input.data_content,
            data_type=data_input.data_type,
            metadata=data_input.metadata
        )
        
        return result
        
    except Exception as e:
        print(f"[Analytics] Error storing data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/orders", summary="Store order analytics")
async def store_order_analytics(order_input: OrderAnalyticsInput):
    """Store order data for analytics purposes"""
    try:
        if not analytics_rag_service:
            raise HTTPException(status_code=500, detail="Analytics RAG service not initialized")
        
        # Build order summary
        order_summary = f"""
Order ID: {order_input.order_id}
Customer ID: {order_input.customer_id or 'N/A'}
Total Amount: {order_input.total_amount} VND
Order Date: {order_input.order_date}
Products: {len(order_input.products)} items
"""
        
        # Add product details
        for product in order_input.products:
            order_summary += f"\n- {product.get('name', 'Unknown')}: {product.get('quantity', 0)} x {product.get('price', 0)} VND"
        
        metadata = {
            "customer_id": order_input.customer_id,
            "total_amount": str(order_input.total_amount),
            "product_count": str(len(order_input.products)),
            "order_date": order_input.order_date
        }
        
        if order_input.metadata:
            metadata.update(order_input.metadata)
        
        result = analytics_rag_service.store_order_analytics(
            order_id=order_input.order_id,
            order_summary=order_summary,
            metadata=metadata
        )
        
        return result
        
    except Exception as e:
        print(f"[Analytics] Error storing order: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/trends", summary="Store business trend")
async def store_trend(trend_input: TrendInput):
    """Store identified business trend"""
    try:
        if not analytics_rag_service:
            raise HTTPException(status_code=500, detail="Analytics RAG service not initialized")
        
        result = analytics_rag_service.store_trend(
            trend_id=trend_input.trend_id,
            trend_description=trend_input.trend_description,
            trend_type=trend_input.trend_type,
            metadata=trend_input.metadata
        )
        
        return result
        
    except Exception as e:
        print(f"[Analytics] Error storing trend: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/data/all", summary="Get all business data")
async def get_all_business_data(limit: int = 100):
    """Get all business data for comprehensive analysis"""
    try:
        if not analytics_rag_service:
            raise HTTPException(status_code=500, detail="Analytics RAG service not initialized")
        
        data = analytics_rag_service.get_all_business_data(limit=limit)
        
        return {
            "data": data,
            "count": len(data),
            "limit": limit
        }
        
    except Exception as e:
        print(f"[Analytics] Error getting all data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats", summary="Get analytics statistics")
async def get_analytics_stats():
    """Get statistics about analytics RAG data"""
    try:
        if not analytics_rag_service:
            raise HTTPException(status_code=500, detail="Analytics RAG service not initialized")
        
        stats = analytics_rag_service.get_stats()
        return stats
        
    except Exception as e:
        print(f"[Analytics] Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models", summary="Get available AI models")
async def get_available_models():
    """Get list of available AI models for analytics"""
    try:
        ai_service = get_ai_service()
        models = ai_service.get_available_models()
        
        return {
            "models": models,
            "count": len(models)
        }
        
    except Exception as e:
        print(f"[Analytics] Error getting models: {e}")
        raise HTTPException(status_code=500, detail=str(e))
