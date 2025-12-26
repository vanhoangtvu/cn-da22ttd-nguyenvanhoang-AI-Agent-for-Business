"""
Agent Actions Routes - Proxy to Spring Service
Cho phép AI Agent thực hiện các thao tác thay mặt khách hàng
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, List, Dict
import httpx
import os

router = APIRouter(prefix="/api/agent", tags=["Agent Actions"])

# Spring Service URL - Đọc từ .env (SPRING_SERVICE_URL)
SPRING_API_URL = os.getenv("SPRING_SERVICE_URL", os.getenv("SPRING_API_URL", "http://localhost:8089/api/v1"))
print(f"[Agent Actions] Spring API URL: {SPRING_API_URL}")

# Request Models
class AddToCartRequest(BaseModel):
    productId: int
    quantity: int = 1

class ApplyDiscountRequest(BaseModel):
    discountCode: str
    orderAmount: float

class OrderItemRequest(BaseModel):
    productId: int
    quantity: int

class CreateOrderRequest(BaseModel):
    items: List[OrderItemRequest]
    shippingAddress: str
    paymentMethod: Optional[str] = "CASH"  # CASH or BANK_TRANSFER
    discountCode: Optional[str] = None

# Response Models
class ActionResult(BaseModel):
    success: bool
    message: str
    data: Optional[Dict] = None


@router.post("/cart/add", response_model=ActionResult)
async def add_to_cart(
    request: AddToCartRequest,
    authorization: Optional[str] = Header(None)
):
    """Thêm sản phẩm vào giỏ hàng"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization token")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{SPRING_API_URL}/cart/items",
                json={"productId": request.productId, "quantity": request.quantity},
                headers={"Authorization": authorization}
            )
            
            if response.status_code == 200:
                cart_data = response.json()
                return ActionResult(
                    success=True,
                    message=f"Đã thêm sản phẩm vào giỏ hàng thành công!",
                    data=cart_data
                )
            else:
                error_msg = response.json().get("message", "Không thể thêm vào giỏ hàng")
                return ActionResult(success=False, message=error_msg)
                
    except httpx.TimeoutException:
        return ActionResult(success=False, message="Timeout khi kết nối đến server")
    except Exception as e:
        print(f"[Agent Action Error] add_to_cart: {e}")
        return ActionResult(success=False, message=f"Lỗi: {str(e)}")


@router.post("/discount/apply", response_model=ActionResult)
async def apply_discount(
    request: ApplyDiscountRequest,
    authorization: Optional[str] = Header(None)
):
    """Áp mã giảm giá cho đơn hàng"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization token")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{SPRING_API_URL}/discounts/apply",
                params={
                    "discountCode": request.discountCode,
                    "orderAmount": request.orderAmount
                },
                headers={"Authorization": authorization}
            )
            
            if response.status_code == 200:
                discount_data = response.json()
                return ActionResult(
                    success=True,
                    message=f"Đã áp mã {request.discountCode} thành công!",
                    data=discount_data
                )
            else:
                error_msg = response.json().get("message", "Mã giảm giá không hợp lệ")
                return ActionResult(success=False, message=error_msg)
                
    except Exception as e:
        print(f"[Agent Action Error] apply_discount: {e}")
        return ActionResult(success=False, message=f"Lỗi: {str(e)}")


@router.get("/discounts/available")
async def get_available_discounts(
    orderAmount: float = 0,
    authorization: Optional[str] = Header(None)
):
    """Lấy danh sách mã giảm giá khả dụng"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{SPRING_API_URL}/discounts/valid",
                headers={"Authorization": authorization} if authorization else {}
            )
            
            if response.status_code == 200:
                discounts = response.json()
                # Filter discounts applicable for this order amount
                applicable = []
                for d in discounts:
                    min_order = d.get("minOrderAmount", 0) or 0
                    if orderAmount >= min_order:
                        applicable.append({
                            "code": d.get("code"),
                            "description": d.get("description"),
                            "discountType": d.get("discountType"),
                            "discountValue": d.get("discountValue"),
                            "maxDiscountAmount": d.get("maxDiscountAmount"),
                            "usageLeft": d.get("usageLimit", 0) - d.get("usedCount", 0)
                        })
                return {"success": True, "discounts": applicable}
            else:
                return {"success": False, "discounts": []}
                
    except Exception as e:
        print(f"[Agent Action Error] get_available_discounts: {e}")
        return {"success": False, "discounts": [], "error": str(e)}


@router.post("/order/create", response_model=ActionResult)
async def create_order(
    request: CreateOrderRequest,
    authorization: Optional[str] = Header(None)
):
    """Tạo đơn hàng mới"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization token")
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            order_data = {
                "items": [{"productId": item.productId, "quantity": item.quantity} for item in request.items],
                "shippingAddress": request.shippingAddress,
                "paymentMethod": request.paymentMethod or "CASH"
            }
            if request.discountCode:
                order_data["discountCode"] = request.discountCode
            
            response = await client.post(
                f"{SPRING_API_URL}/orders",
                json=order_data,
                headers={"Authorization": authorization}
            )
            
            if response.status_code in [200, 201]:
                order = response.json()
                # Include full order data with qrCodeUrl if available
                return ActionResult(
                    success=True,
                    message=f"Đơn hàng #{order.get('id')} đã được tạo thành công!",
                    data={"order": order}  # Wrap order in object for easier access
                )
            else:
                error_msg = response.json().get("message", "Không thể tạo đơn hàng")
                return ActionResult(success=False, message=error_msg)
                
    except Exception as e:
        print(f"[Agent Action Error] create_order: {e}")
        return ActionResult(success=False, message=f"Lỗi: {str(e)}")


@router.get("/cart")
async def get_cart(authorization: Optional[str] = Header(None)):
    """Lấy thông tin giỏ hàng hiện tại"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization token")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{SPRING_API_URL}/cart",
                headers={"Authorization": authorization}
            )
            
            if response.status_code == 200:
                return {"success": True, "cart": response.json()}
            else:
                return {"success": False, "cart": None}
                
    except Exception as e:
        print(f"[Agent Action Error] get_cart: {e}")
        return {"success": False, "cart": None, "error": str(e)}


@router.post("/sync-carts")
async def sync_carts_to_chromadb(
    authorization: Optional[str] = Header(None)
):
    """
    Đồng bộ cart data từ Analytics API vào ChromaDB
    Yêu cầu admin token để gọi Analytics API
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing admin authorization token")
    
    try:
        from services.chat_ai_rag_chroma_service import get_chat_ai_rag_service
        
        # Extract token from Bearer header
        token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
        
        chroma_service = get_chat_ai_rag_service()
        synced_count = chroma_service.sync_carts_from_analytics(token)
        
        return {
            "success": True,
            "message": f"Đã đồng bộ {synced_count} giỏ hàng vào ChromaDB",
            "synced_count": synced_count
        }
    except Exception as e:
        print(f"[Agent Action Error] sync_carts: {e}")
        return {"success": False, "message": str(e), "synced_count": 0}
