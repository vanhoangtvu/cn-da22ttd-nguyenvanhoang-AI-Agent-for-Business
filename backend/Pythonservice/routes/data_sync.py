"""
Data Synchronization API Routes
Handles data synchronization from Spring Service
Provides admin endpoints for system analytics data
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Dict, Any, Optional
from services.data_sync_service import get_data_sync_service
from datetime import datetime

router = APIRouter()

# Global service instance
data_sync_service = get_data_sync_service()


# Pydantic models
class SystemDataResponse(BaseModel):
    timestamp: str
    data_source: str
    overview: Dict[str, Any]
    products: Dict[str, Any]
    orders: Dict[str, Any]
    customers: Dict[str, Any]
    revenue: Dict[str, Any]
    metadata: Dict[str, Any]

class HealthStatusResponse(BaseModel):
    spring_service: Dict[str, Any]
    cache: Dict[str, Any]
    last_sync: Optional[str]


@router.get("/admin/analytics/system-data", response_model=SystemDataResponse)
async def get_system_analytics_data(
    force_refresh: bool = Query(False, description="Force refresh data from Spring Service")
):
    """
    Get complete system analytics data

    This endpoint synchronizes and returns comprehensive business data including:
    - Products: inventory, categories, top-selling items
    - Orders: recent orders, status distribution, trends
    - Customers: segments, top customers, retention
    - Revenue: monthly revenue, product revenue, growth

    Args:
        force_refresh: If True, bypasses cache and fetches fresh data

    Returns:
        Complete system analytics data
    """
    try:
        data = data_sync_service.get_system_analytics_data(force_refresh=force_refresh)
        return SystemDataResponse(**data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get system data: {str(e)}")


@router.get("/admin/analytics/data-health", response_model=HealthStatusResponse)
async def get_data_health_status():
    """
    Get health status of data synchronization

    Returns information about:
    - Spring Service connectivity
    - Cache status and freshness
    - Last successful sync timestamp
    """
    try:
        status = data_sync_service.get_data_health_status()
        return HealthStatusResponse(**status)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get health status: {str(e)}")


@router.post("/admin/analytics/clear-cache")
async def clear_data_cache():
    """
    Clear cached analytics data

    This will force fresh data fetch on next request
    """
    try:
        success = data_sync_service.clear_cache()
        return {
            "success": success,
            "message": "Data cache cleared successfully",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear cache: {str(e)}")


@router.post("/admin/analytics/sync-users")
async def sync_user_data_to_chroma():
    """
    Sync user data from Spring Service to ChromaDB for AI personalization
    
    This endpoint fetches complete user information from Spring Service
    and stores it in ChromaDB for personalized AI chat responses.
    
    Returns:
        Sync results with success/failure counts
    """
    try:
        result = data_sync_service.sync_user_data_to_chroma()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to sync user data: {str(e)}")


@router.post("/admin/analytics/sync-users-manual")
async def sync_user_data_manually():
    """
    Manually sync sample user data to ChromaDB for testing
    
    This endpoint uses sample user data to demonstrate the sync functionality
    when Spring Service is not available.
    
    Returns:
        Sync results with sample data
    """
    try:
        result = data_sync_service.sync_user_data_manually()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to sync user data manually: {str(e)}")