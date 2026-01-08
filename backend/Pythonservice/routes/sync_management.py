"""
Sync Management API
Manages real-time synchronization between MySQL and ChromaDB for Chat AI
ONLY syncs with chroma_chat_ai, NOT chroma_analytics
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import json

router = APIRouter()

# Sync configuration storage (in production, use database)
sync_configs = {
    "products": {
        "enabled": True,
        "fields": ["id", "name", "price", "category", "stock", "description", "img_url"],
        "last_sync": None,
        "sync_count": 0
    },
    "users": {
        "enabled": True,
        "fields": ["id", "username", "email", "full_name", "phone", "address"],
        "last_sync": None,
        "sync_count": 0
    },
    "carts": {
        "enabled": True,
        "fields": ["id", "user_id", "items", "total_price"],
        "last_sync": None,
        "sync_count": 0
    },
    "orders": {
        "enabled": True,
        "fields": ["id", "user_id", "status", "total_amount", "items", "created_at"],
        "last_sync": None,
        "sync_count": 0
    },
    "discounts": {
        "enabled": True,
        "fields": ["id", "code", "description", "discount_percent", "valid_from", "valid_to"],
        "last_sync": None,
        "sync_count": 0
    }
}

class SyncConfig(BaseModel):
    """Sync configuration for a table"""
    table_name: str
    enabled: bool
    fields: List[str]

class WebhookPayload(BaseModel):
    """Webhook payload from MySQL"""
    table: str
    operation: str  # INSERT, UPDATE, DELETE
    data: Dict[str, Any]
    timestamp: str

class SyncStatus(BaseModel):
    """Sync status response"""
    table_name: str
    enabled: bool
    last_sync: Optional[str]
    sync_count: int
    fields: List[str]

@router.get("/health", tags=["Sync Management"])
async def sync_health():
    """Health check for sync service"""
    return {
        "status": "healthy",
        "service": "sync-management",
        "chroma_target": "chroma_chat_ai",
        "timestamp": datetime.now().isoformat()
    }

@router.get("/configs", tags=["Sync Management"])
async def get_sync_configs() -> List[SyncStatus]:
    """Get all sync configurations"""
    configs = []
    for table_name, config in sync_configs.items():
        configs.append(SyncStatus(
            table_name=table_name,
            enabled=config["enabled"],
            last_sync=config["last_sync"],
            sync_count=config["sync_count"],
            fields=config["fields"]
        ))
    return configs

@router.get("/configs/{table_name}", tags=["Sync Management"])
async def get_sync_config(table_name: str) -> SyncStatus:
    """Get sync configuration for a specific table"""
    if table_name not in sync_configs:
        raise HTTPException(status_code=404, detail=f"Table {table_name} not found")
    
    config = sync_configs[table_name]
    return SyncStatus(
        table_name=table_name,
        enabled=config["enabled"],
        last_sync=config["last_sync"],
        sync_count=config["sync_count"],
        fields=config["fields"]
    )

@router.put("/configs/{table_name}", tags=["Sync Management"])
async def update_sync_config(table_name: str, config: SyncConfig):
    """Update sync configuration for a table"""
    if table_name not in sync_configs:
        raise HTTPException(status_code=404, detail=f"Table {table_name} not found")
    
    sync_configs[table_name]["enabled"] = config.enabled
    sync_configs[table_name]["fields"] = config.fields
    
    return {
        "success": True,
        "message": f"Sync config for {table_name} updated",
        "config": sync_configs[table_name]
    }

@router.post("/webhook", tags=["Sync Management"])
async def handle_webhook(payload: WebhookPayload):
    """
    Handle webhook from MySQL
    Triggered when data changes in MySQL
    """
    table = payload.table
    operation = payload.operation
    data = payload.data
    
    # Check if sync is enabled for this table
    if table not in sync_configs:
        return {
            "success": False,
            "message": f"Table {table} not configured for sync"
        }
    
    if not sync_configs[table]["enabled"]:
        return {
            "success": False,
            "message": f"Sync disabled for table {table}"
        }
    
    try:
        # Import ChromaDB service
        from services.chat_ai_rag_chroma_service import get_chat_ai_rag_service
        chroma_service = get_chat_ai_rag_service()
        
        # Sync based on operation
        if operation == "INSERT" or operation == "UPDATE":
            # Upsert to ChromaDB
            if table == "products":
                await sync_product(chroma_service, data)
            elif table == "users":
                await sync_user(chroma_service, data)
            elif table == "carts":
                await sync_cart(chroma_service, data)
            elif table == "orders":
                await sync_order(chroma_service, data)
            elif table == "discounts":
                await sync_discount(chroma_service, data)
        
        elif operation == "DELETE":
            # Delete from ChromaDB
            await delete_from_chroma(chroma_service, table, data.get("id"))
        
        # Update sync stats
        sync_configs[table]["last_sync"] = datetime.now().isoformat()
        sync_configs[table]["sync_count"] += 1
        
        return {
            "success": True,
            "message": f"Synced {operation} for {table}",
            "table": table,
            "operation": operation,
            "timestamp": datetime.now().isoformat()
        }
    
    except Exception as e:
        print(f"[SYNC ERROR] {table} - {operation}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")

async def sync_product(chroma_service, data: Dict):
    """Sync product to ChromaDB"""
    try:
        product_id = data.get('id')
        product_name = data.get('name', '')
        
        # Get or create products collection
        collection = chroma_service._get_or_create_product_collection()
        
        # Prepare metadata
        metadata = {
            "product_id": str(product_id),
            "product_name": product_name,
            "price": float(data.get('price', 0)),
            "category": data.get('category', ''),
            "stock": int(data.get('stock', 0)),
            "img_url": data.get('img_url', data.get('imageUrl', '')),
            "status": data.get('status', 'ACTIVE')
        }
        
        # Create document text for embedding
        description = data.get('description', '')
        document = f"{product_name}. {description}. Category: {metadata['category']}. Price: {metadata['price']}đ"
        
        # Upsert to ChromaDB
        collection.upsert(
            ids=[f"product_{product_id}"],
            documents=[document],
            metadatas=[metadata]
        )
        
        print(f"[SYNC SUCCESS] Product {product_id}: {product_name}")
    except Exception as e:
        print(f"[SYNC ERROR] Product {data.get('id')}: {str(e)}")
        raise

async def sync_user(chroma_service, data: Dict):
    """Sync user to ChromaDB"""
    try:
        user_id = data.get('id')
        username = data.get('username', '')
        
        # Get or create users collection
        collection = chroma_service._get_or_create_users_collection()
        
        # Prepare metadata
        metadata = {
            "user_id": str(user_id),
            "username": username,
            "email": data.get('email', ''),
            "full_name": data.get('fullName', data.get('full_name', '')),
            "phone": data.get('phone', ''),
            "address": data.get('address', ''),
            "role": data.get('role', 'CUSTOMER')
        }
        
        # Create document text
        document = f"User: {username}. Name: {metadata['full_name']}. Email: {metadata['email']}"
        
        # Upsert to ChromaDB
        collection.upsert(
            ids=[f"user_{user_id}"],
            documents=[document],
            metadatas=[metadata]
        )
        
        print(f"[SYNC SUCCESS] User {user_id}: {username}")
    except Exception as e:
        print(f"[SYNC ERROR] User {data.get('id')}: {str(e)}")
        raise

async def sync_cart(chroma_service, data: Dict):
    """Sync cart to ChromaDB"""
    try:
        user_id = data.get('userId', data.get('user_id'))
        cart_id = data.get('id')
        
        # Get or create carts collection
        collection = chroma_service._get_or_create_carts_collection()
        
        # Prepare cart items
        items = data.get('items', [])
        items_text = []
        total_items = 0
        items_for_json = []
        
        for item in items:
            # Handle both formats: CartItemDTO from Spring and dict
            if isinstance(item, dict):
                product = item.get('product', {})
                product_id = product.get('id', item.get('productId', 0))
                product_name = product.get('name', item.get('productName', 'Unknown'))
                product_price = product.get('price', item.get('productPrice', 0))
                quantity = item.get('quantity', 0)
                
                # Create structured item for JSON storage
                items_for_json.append({
                    'productId': product_id,
                    'productName': product_name,
                    'productPrice': float(product_price),
                    'quantity': quantity,
                    'subtotal': float(product_price) * quantity
                })
            else:
                product_name = 'Unknown'
                quantity = 0
            
            items_text.append(f"{product_name} x{quantity}")
            total_items += quantity
        
        # Calculate total value
        total_value = sum(item['subtotal'] for item in items_for_json)
        
        # Prepare metadata with items_json for AI context
        metadata = {
            "cart_id": f"cart_user_{user_id}",
            "user_id": str(user_id),
            "total_price": float(data.get('totalAmount', data.get('totalPrice', data.get('total_price', total_value)))),
            "total_value": str(total_value),
            "total_items": total_items,
            "items_count": len(items),
            "items_json": json.dumps(items_for_json, ensure_ascii=False)  # Store items as JSON for AI
        }
        
        # Create document text
        document = f"Cart for user {user_id}. Items: {', '.join(items_text)}. Total: {metadata['total_price']}đ"
        
        # Upsert to ChromaDB
        collection.upsert(
            ids=[f"cart_user_{user_id}"],
            documents=[document],
            metadatas=[metadata]
        )
        
        print(f"[SYNC SUCCESS] Cart for user {user_id}: {total_items} items, Total: {total_value:,.0f}đ")
    except Exception as e:
        print(f"[SYNC ERROR] Cart {data.get('id')}: {str(e)}")
        raise

async def sync_order(chroma_service, data: Dict):
    """Sync order to ChromaDB"""
    try:
        order_id = data.get('id')
        user_id = data.get('userId', data.get('user_id'))
        customer_id = data.get('customerId', data.get('customer_id', user_id))
        
        # Get or create orders collection
        collection = chroma_service._get_or_create_orders_collection()
        
        # Prepare order items
        items = data.get('orderItems', data.get('items', []))
        items_text = []
        
        for item in items:
            product_name = item.get('productName', 'Unknown')
            quantity = item.get('quantity', 0)
            items_text.append(f"{product_name} x{quantity}")
        
        # Prepare metadata - BẮT BUỘC CÓ customer_id để AI query được
        metadata = {
            "order_id": str(order_id),
            "customer_id": str(customer_id),  # QUAN TRỌNG: Dùng để query orders của user
            "user_id": str(user_id),
            "status": data.get('status', 'PENDING'),
            "total_amount": float(data.get('totalAmount', data.get('total_amount', 0))),
            "customer_name": data.get('customerName', data.get('customer_name', '')),
            "customer_phone": data.get('customerPhone', data.get('customer_phone', '')),
            "shipping_address": data.get('shippingAddress', data.get('shipping_address', '')),
            "created_at": data.get('createdAt', data.get('created_at', ''))
        }
        
        # Create document text
        document = f"Order #{order_id} for {metadata['customer_name']}. Status: {metadata['status']}. Items: {', '.join(items_text)}. Total: {metadata['total_amount']}đ"
        
        # Upsert to ChromaDB
        collection.upsert(
            ids=[f"order_{order_id}"],
            documents=[document],
            metadatas=[metadata]
        )
        
        print(f"[SYNC SUCCESS] Order {order_id} for customer {customer_id}: {metadata['status']}")
    except Exception as e:
        print(f"[SYNC ERROR] Order {data.get('id')}: {str(e)}")
        raise

async def sync_discount(chroma_service, data: Dict):
    """Sync discount to ChromaDB"""
    try:
        discount_id = data.get('id')
        code = data.get('code', '')
        
        # Get or create discounts collection
        collection = chroma_service._get_or_create_discounts_collection()
        
        # Prepare metadata
        metadata = {
            "discount_id": str(discount_id),
            "code": code,
            "description": data.get('description', ''),
            "discount_percent": float(data.get('discountPercent', data.get('discount_percent', 0))),
            "valid_from": data.get('validFrom', data.get('valid_from', '')),
            "valid_to": data.get('validTo', data.get('valid_to', '')),
            "status": data.get('status', 'ACTIVE')
        }
        
        # Create document text
        document = f"Discount code {code}: {metadata['description']}. {metadata['discount_percent']}% off"
        
        # Upsert to ChromaDB
        collection.upsert(
            ids=[f"discount_{code}"],
            documents=[document],
            metadatas=[metadata]
        )
        
        print(f"[SYNC SUCCESS] Discount {code}: {metadata['discount_percent']}%")
    except Exception as e:
        print(f"[SYNC ERROR] Discount {data.get('code')}: {str(e)}")
        raise

async def delete_from_chroma(chroma_service, table: str, item_id: int):
    """Delete item from ChromaDB"""
    try:
        if table == "products":
            collection = chroma_service._get_or_create_product_collection()
            collection.delete(ids=[f"product_{item_id}"])
        elif table == "users":
            collection = chroma_service._get_or_create_users_collection()
            collection.delete(ids=[f"user_{item_id}"])
        elif table == "carts":
            # Carts use user_id as identifier
            collection = chroma_service._get_or_create_carts_collection()
            collection.delete(ids=[f"cart_user_{item_id}"])
        elif table == "orders":
            collection = chroma_service._get_or_create_orders_collection()
            collection.delete(ids=[f"order_{item_id}"])
        elif table == "discounts":
            collection = chroma_service._get_or_create_discounts_collection()
            # For discounts, item_id might be the code
            collection.delete(ids=[f"discount_{item_id}"])
        
        print(f"[SYNC SUCCESS] Deleted from {table}: ID {item_id}")
    except Exception as e:
        print(f"[SYNC ERROR] Delete from {table} ID {item_id}: {str(e)}")
        raise

@router.post("/manual-sync/{table_name}", tags=["Sync Management"])
async def manual_sync(table_name: str):
    """
    Manually trigger full sync for a table
    Useful for initial sync or recovery
    """
    if table_name not in sync_configs:
        raise HTTPException(status_code=404, detail=f"Table {table_name} not found")
    
    if not sync_configs[table_name]["enabled"]:
        raise HTTPException(status_code=400, detail=f"Sync disabled for {table_name}")
    
    try:
        # TODO: Implement full table sync from MySQL to ChromaDB
        return {
            "success": True,
            "message": f"Manual sync triggered for {table_name}",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Manual sync failed: {str(e)}")

@router.get("/stats", tags=["Sync Management"])
async def get_sync_stats():
    """Get sync statistics"""
    stats = {
        "total_tables": len(sync_configs),
        "enabled_tables": sum(1 for c in sync_configs.values() if c["enabled"]),
        "total_syncs": sum(c["sync_count"] for c in sync_configs.values()),
        "tables": {}
    }
    
    for table_name, config in sync_configs.items():
        stats["tables"][table_name] = {
            "enabled": config["enabled"],
            "sync_count": config["sync_count"],
            "last_sync": config["last_sync"]
        }
    
    return stats
