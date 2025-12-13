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
        
        # Check if we have any relevant data
        if not relevant_data:
            print(f"[Analytics] No relevant data found for query: {request.query}")
            
            # Return professional message indicating no data available
            no_data_analysis = """## 🚫 Không Thể Phân Tích - Thiếu Dữ Liệu Kinh Doanh

**Tình trạng hiện tại:** Hệ thống chưa có đủ dữ liệu để thực hiện phân tích AI thông minh.

### 📊 Dữ liệu cần thiết để bắt đầu:

**1. Dữ liệu sản phẩm** 
- Danh sách sản phẩm với giá cả, tồn kho
- Thông tin danh mục và nhà cung cấp
- Lịch sử giá và khuyến mãi

**2. Dữ liệu bán hàng**
- Lịch sử đơn hàng và doanh thu
- Thông tin khách hàng và tần suất mua
- Hiệu suất theo kênh bán hàng

**3. Dữ liệu vận hành**
- Tình trạng tồn kho theo thời gian
- Chi phí hoạt động và lợi nhuận
- Hiệu suất nhân viên và quy trình

### 🔄 Các bước để kích hoạt phân tích AI:

1. **Import dữ liệu** từ hệ thống quản lý hiện tại
2. **Đồng bộ dữ liệu** từ Spring Boot service
3. **Kích hoạt RAG indexing** cho tìm kiếm thông minh
4. **Chạy phân tích thử nghiệm** để kiểm tra

### 💡 Lợi ích khi có dữ liệu:

- **Phân tích bán hàng** theo thời gian thực
- **Dự báo doanh thu** với độ chính xác cao
- **Tối ưu tồn kho** tự động
- **Đề xuất giá** dựa trên thị trường
- **Phân tích khách hàng** chi tiết

**Vui lòng liên hệ đội ngũ kỹ thuật để thiết lập dữ liệu kinh doanh.**"""

            # Calculate overview statistics (will be 0)
            overview_stats = {
                "total_products": 0,
                "total_orders": 0,
                "total_revenue": 0
            }
            
            insights = {
                "data_points_analyzed": 0,
                "sources_used": [],
                "timestamp": datetime.now().isoformat(),
                "overview": overview_stats,
                "data_status": "no_data"
            }
            
            return {
                "analysis": no_data_analysis,
                "model_used": request.model_id,
                "data_sources": [],
                "insights": insights
            }
        
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
        
        # Calculate overview statistics
        overview_stats = {}
        try:
            print(f"[Analytics] Starting overview calculation...")
            
            # Get total products from products collection
            try:
                print(f"[Analytics] Accessing products collection...")
                products_collection = analytics_rag_service.chroma_client.get_collection("products")
                product_count = products_collection.count()
                overview_stats["total_products"] = product_count
                print(f"[Analytics] Found {product_count} products")
            except Exception as e:
                print(f"[Analytics] Error getting products count: {e}")
                overview_stats["total_products"] = 0
            
            # Get total orders and revenue from orders collection
            try:
                print(f"[Analytics] Accessing orders collection...")
                orders_collection = analytics_rag_service.chroma_client.get_collection("orders")
                orders_data = orders_collection.get(include=["metadatas"])
                total_orders = len(orders_data["ids"]) if orders_data["ids"] else 0
                total_revenue = 0
                
                print(f"[Analytics] Processing {total_orders} orders...")
                if orders_data["metadatas"]:
                    for i, metadata in enumerate(orders_data["metadatas"]):
                        if metadata and "totalAmount" in metadata:
                            try:
                                amount = float(metadata["totalAmount"])
                                total_revenue += amount
                            except (ValueError, TypeError) as e:
                                print(f"[Analytics] Error parsing amount in order {i}: {e}")
                
                overview_stats["total_orders"] = total_orders
                overview_stats["total_revenue"] = total_revenue
                print(f"[Analytics] Calculated revenue: {total_revenue}")
            except Exception as e:
                print(f"[Analytics] Error calculating order stats: {e}")
                overview_stats["total_orders"] = 0
                overview_stats["total_revenue"] = 0
                
        except Exception as e:
            print(f"[Analytics] Error calculating overview stats: {e}")
            overview_stats = {
                "total_products": 0,
                "total_orders": 0,
                "total_revenue": 0
            }
        
        insights["overview"] = overview_stats
        
        print(f"[Analytics] Generated analysis with {len(relevant_data)} data points")
        print(f"[Analytics] Overview stats: {overview_stats}")
        
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
