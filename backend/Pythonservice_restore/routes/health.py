from fastapi import APIRouter

# Create router
router = APIRouter()

@router.get("/", summary="Health check", description="Check if API is running")
async def health_check():
    """Health check endpoint"""
    return {'status': 'healthy', 'message': 'API is running'}
