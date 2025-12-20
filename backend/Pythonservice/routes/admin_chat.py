"""
Admin Chat Management Routes
Routes để quản lý chat history từ Redis và Chroma DB
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from services.redis_chat_service import get_redis_service
from services.chat_ai_rag_chroma_service import get_chat_ai_rag_service
import logging
import json

router = APIRouter()
logger = logging.getLogger(__name__)


# Pydantic models for modal config
class ModalConfigRequest(BaseModel):
    modal_name: str
    modal_config: Dict[str, Any]


# ===== DEBUG ENDPOINTS =====

@router.get("/debug/redis-status")
async def debug_redis_status():
    """Debug endpoint to check Redis connection and data"""
    try:
        redis_service = get_redis_service()
        
        # Test connection
        is_connected = redis_service.is_connected()
        logger.info(f"[Admin Debug] Redis connected: {is_connected}")
        
        # Get all chat keys
        all_chat_keys = redis_service.client.keys("chat:*")
        logger.info(f"[Admin Debug] Total chat keys: {len(all_chat_keys)}")
        
        # Get session keys specifically
        session_keys = redis_service.client.keys("chat:user:*:session:*")
        logger.info(f"[Admin Debug] Session keys: {len(session_keys)}")
        
        # Get user keys
        user_keys = redis_service.client.keys("chat:user:*:sessions")
        logger.info(f"[Admin Debug] User session list keys: {len(user_keys)}")
        
        # Show first few keys for debugging
        sample_keys = session_keys[:5] if session_keys else []
        
        debug_info = []
        for key in sample_keys:
            message_count = redis_service.client.zcard(key)
            debug_info.append({
                "key": key,
                "message_count": message_count
            })
        
        return {
            "status": "ok" if is_connected else "error",
            "redis_connected": is_connected,
            "total_chat_keys": len(all_chat_keys),
            "total_session_keys": len(session_keys),
            "total_user_keys": len(user_keys),
            "sample_keys": debug_info,
            "all_keys_count": {
                "chat": len(all_chat_keys),
                "sessions": len(session_keys),
                "users": len(user_keys)
            }
        }
    except Exception as e:
        logger.error(f"[Admin Debug] Error: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "error": str(e)
        }


@router.get("/debug/all-data")
async def debug_all_data():
    """Show all chat data in Redis (for debugging)"""
    try:
        redis_service = get_redis_service()
        
        # Get all session keys
        session_keys = redis_service.client.keys("chat:user:*:session:*")
        logger.info(f"[Admin Debug] Showing data for {len(session_keys)} sessions")
        
        all_data = []
        
        for key in session_keys:
            # Extract parts
            parts = key.split(":")
            if len(parts) >= 6:
                user_id = parts[2]
                session_id = parts[4]
                
                # Get messages
                message_count = redis_service.client.zcard(key)
                messages = redis_service.client.zrange(key, 0, -1)
                
                parsed_messages = []
                for msg in messages:
                    try:
                        parsed_messages.append(json.loads(msg))
                    except:
                        pass
                
                all_data.append({
                    "user_id": user_id,
                    "session_id": session_id,
                    "message_count": message_count,
                    "messages": parsed_messages
                })
        
        return {
            "total_sessions": len(all_data),
            "data": all_data
        }
    except Exception as e:
        logger.error(f"[Admin Debug] Error: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "error": str(e)
        }


# ===== REDIS CHAT HISTORY ENDPOINTS =====

@router.get("/chat-stats")
async def get_chat_stats():
    """Get overall chat statistics for all users"""
    try:
        redis_service = get_redis_service()
        logger.info(f"[Admin Chat] Redis service connected: {redis_service.is_connected()}")
        
        # Get all user sessions (format: chat:user:{user_id}:session:{session_id})
        all_keys = redis_service.client.keys("chat:user:*:session:*")
        logger.info(f"[Admin Chat] Found {len(all_keys)} session keys")
        logger.info(f"[Admin Chat] Session keys: {all_keys}")
        
        # Parse unique users and sessions
        users_set = set()
        total_messages = 0
        active_sessions = 0
        
        for key in all_keys:
            try:
                # Extract user_id from key: chat:user:{user_id}:session:{session_id}
                if key.startswith("chat:user:") and ":session:" in key:
                    # Split into: ['chat:user', 'user-id:session', 'session-id']
                    parts = key.split(":session:")
                    if len(parts) == 2:
                        user_part = parts[0].replace("chat:user:", "")
                        user_id = user_part
                        users_set.add(user_id)
                        logger.info(f"[Admin Chat] Found user_id: {user_id}")
                        
                        # Count messages using zcard (messages are in sorted set)
                        try:
                            message_count = redis_service.client.zcard(key)
                            logger.info(f"[Admin Chat] Key {key} has {message_count} messages")
                            if message_count and message_count > 0:
                                active_sessions += 1
                                total_messages += message_count
                        except Exception as e:
                            logger.error(f"[Admin Chat] Error counting messages for {key}: {str(e)}")
                            pass
            except Exception as e:
                logger.error(f"[Admin Chat] Error processing key {key}: {str(e)}")
                pass
        
        result = {
            "total_users": len(users_set),
            "total_sessions": len(all_keys),
            "total_messages": total_messages,
            "active_sessions": active_sessions
        }
        logger.info(f"[Admin Chat] Stats: {result}")
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching chat stats: {str(e)}"
        )


@router.get("/users-chat-history")
async def get_all_users_chat_history():
    """Get chat history for all users - Admin only"""
    try:
        logger.info("[Admin Chat] ===== START: users-chat-history endpoint =====")
        redis_service = get_redis_service()
        logger.info(f"[Admin Chat] Redis service: {redis_service}")
        logger.info(f"[Admin Chat] Redis client: {redis_service.client}")
        logger.info(f"[Admin Chat] Redis connected: {redis_service.is_connected()}")
        
        # Get all user sessions from Redis
        try:
            all_keys = redis_service.client.keys("chat:user:*:session:*")
            logger.info(f"[Admin Chat] Redis keys query returned: {type(all_keys)} with {len(all_keys) if all_keys else 0} items")
            logger.info(f"[Admin Chat] All keys: {all_keys}")
        except Exception as e:
            logger.error(f"[Admin Chat] Error querying Redis keys: {str(e)}", exc_info=True)
            return JSONResponse(content=[], status_code=200)
        
        if not all_keys:
            logger.info("[Admin Chat] No session keys found in Redis")
            return JSONResponse(content=[], status_code=200)
        
        logger.info(f"[Admin Chat] Found {len(all_keys)} total session keys")
        
        users_dict = {}
        
        for key in all_keys:
            try:
                # Extract user_id and session_id from key: chat:user:{user_id}:session:{session_id}
                # Pattern: chat:user:user-id:session:session-id
                logger.info(f"[Admin Chat] Processing key: {key}")
                
                if key.startswith("chat:user:") and ":session:" in key:
                    # Split into: ['chat:user', 'user-id:session', 'session-id']
                    parts = key.split(":session:")
                    if len(parts) == 2:
                        # Extract user_id from first part
                        user_part = parts[0].replace("chat:user:", "")
                        session_id = parts[1]
                        user_id = user_part
                        
                        logger.info(f"[Admin Chat] Extracted user_id={user_id}, session_id={session_id}")
                        
                        if user_id not in users_dict:
                            users_dict[user_id] = {
                                "user_id": user_id,
                                "total_sessions": 0,
                                "total_messages": 0,
                                "sessions": []
                            }
                        
                        # Count messages using zcard (messages are in sorted set)
                        message_count = int(redis_service.client.zcard(key) or 0)
                        logger.info(f"[Admin Chat] Session {session_id} has {message_count} messages (zcard result)")
                        
                        # Get session metadata if available
                        created_at = None
                        try:
                            # Try to get metadata from a separate hash if it exists
                            meta_key = f"{key}:meta"
                            session_data = redis_service.client.hgetall(meta_key)
                            if "created_at" in session_data:
                                created_at = session_data["created_at"]
                        except:
                            created_at = None
                        
                        session_info = {
                            "session_id": session_id,
                            "message_count": message_count,
                            "created_at": created_at or "N/A",
                            "last_activity": "N/A"
                        }
                        
                        users_dict[user_id]["sessions"].append(session_info)
                        users_dict[user_id]["total_sessions"] += 1
                        users_dict[user_id]["total_messages"] += message_count
                    else:
                        logger.warning(f"[Admin Chat] Could not parse session from key: {key}")
                else:
                    logger.warning(f"[Admin Chat] Key does not match expected pattern: {key}")
            except Exception as e:
                logger.error(f"[Admin Chat] Error processing key {key}: {str(e)}", exc_info=True)
                continue
        
        result = list(users_dict.values())
        logger.info(f"[Admin Chat] Returning {len(result)} users with data: {result}")
        logger.info(f"[Admin Chat] ===== END: users-chat-history endpoint =====")
        return JSONResponse(content=result, status_code=200)
    except Exception as e:
        logger.error(f"[Admin Chat] Error fetching users chat history: {str(e)}", exc_info=True)
        return JSONResponse(
            content={"error": str(e)},
            status_code=500
        )


@router.get("/user/{user_id}/chat-history")
async def get_user_chat_history(user_id: str):
    """Get all chat history for a specific user"""
    try:
        redis_service = get_redis_service()
        
        # Get all sessions for this user
        user_sessions = redis_service.client.keys(f"chat:user:{user_id}:session:*")
        
        sessions = []
        total_messages = 0
        
        for session_key in user_sessions:
            # Extract session_id
            session_id = session_key.split(":")[-1]
            
            # Get messages for this session
            message_keys = redis_service.client.keys(f"{session_key}:message:*")
            message_count = len(message_keys)
            total_messages += message_count
            
            # Get session info
            created_at = None
            try:
                session_data = redis_service.client.hgetall(session_key)
                if "created_at" in session_data:
                    created_at = session_data["created_at"]
            except:
                pass
            
            sessions.append({
                "session_id": session_id,
                "message_count": message_count,
                "created_at": created_at or "N/A"
            })
        
        return {
            "user_id": user_id,
            "total_sessions": len(sessions),
            "total_messages": total_messages,
            "sessions": sessions
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching user chat history: {str(e)}"
        )


@router.delete("/user/{user_id}/sessions")
async def delete_user_all_sessions(user_id: str):
    """Delete all chat sessions for a specific user"""
    try:
        redis_service = get_redis_service()
        
        # Get all sessions for this user
        user_sessions = redis_service.client.keys(f"chat:user:{user_id}:session:*")
        
        deleted_count = 0
        for session_key in user_sessions:
            # Delete session hash
            redis_service.client.delete(session_key)
            # Delete session messages
            message_keys = redis_service.client.keys(f"{session_key}:message:*")
            for msg_key in message_keys:
                redis_service.client.delete(msg_key)
            deleted_count += 1
        
        return {
            "status": "success",
            "user_id": user_id,
            "deleted_sessions": deleted_count,
            "message": f"Deleted {deleted_count} sessions for user {user_id}"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting user sessions: {str(e)}"
        )


@router.delete("/user/{user_id}/session/{session_id}")
async def delete_user_session(user_id: str, session_id: str):
    """Delete a specific session for a user"""
    try:
        redis_service = get_redis_service()
        session_key = f"chat:user:{user_id}:session:{session_id}"
        
        # Delete session hash
        redis_service.client.delete(session_key)
        # Delete session messages
        message_keys = redis_service.client.keys(f"{session_key}:message:*")
        for msg_key in message_keys:
            redis_service.client.delete(msg_key)
        
        return {
            "status": "success",
            "user_id": user_id,
            "session_id": session_id,
            "message": f"Deleted session {session_id} for user {user_id}"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting session: {str(e)}"
        )


@router.delete("/clear-all-chat-data")
async def clear_all_chat_data():
    """Clear ALL chat data from Redis - DANGEROUS OPERATION"""
    try:
        redis_service = get_redis_service()
        
        # Get all chat keys
        all_keys = redis_service.client.keys("chat:user:*")
        
        deleted_count = len(all_keys)
        for key in all_keys:
            redis_service.client.delete(key)
        
        # Also delete message keys
        all_message_keys = redis_service.client.keys("chat:*:message:*")
        deleted_count += len(all_message_keys)
        for key in all_message_keys:
            redis_service.client.delete(key)
        
        return {
            "status": "success",
            "deleted_keys": deleted_count,
            "message": "All chat data has been cleared"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error clearing all chat data: {str(e)}"
        )


# ===== CHROMA DB MANAGEMENT ENDPOINTS =====

@router.get("/chroma-collections")
async def get_chroma_collections():
    """Get all Chroma collections and their statistics"""
    try:
        logger.info("[Admin Chat] Fetching Chroma collections")
        
        try:
            chroma_service = get_chat_ai_rag_service()
        except Exception as chroma_init_error:
            logger.warning(f"[Admin Chat] Chroma service not available: {str(chroma_init_error)}")
            return JSONResponse(
                content={
                    "total_collections": 0,
                    "collections": []
                },
                status_code=200
            )
        
        collections_info = []
        
        try:
            # List all collections (don't create new ones)
            all_collections = chroma_service.client.list_collections()
            logger.info(f"[Admin Chat] Found {len(all_collections)} Chroma collections")
            
            for collection in all_collections:
                try:
                    collection_name = collection.name
                    # Count documents in collection
                    count = collection.count()
                    
                    collections_info.append({
                        "collection_name": collection_name,
                        "document_count": count,
                        "status": "active"
                    })
                    logger.info(f"[Admin Chat] Collection {collection_name}: {count} documents")
                except Exception as e:
                    logger.warning(f"[Admin Chat] Error getting collection info: {str(e)}")
                    continue
        except Exception as list_error:
            logger.warning(f"[Admin Chat] Could not list collections: {str(list_error)}")
            # Try alternative method - check known collections
            known_collections = ["chat_ai_products", "chat_ai_knowledge", "chat_ai_context", "chat_analytics", "chat_rag"]
            for collection_name in known_collections:
                try:
                    collection = chroma_service.client.get_collection(name=collection_name)
                    count = collection.count()
                    if count > 0 or collection is not None:
                        collections_info.append({
                            "collection_name": collection_name,
                            "document_count": count,
                            "status": "active"
                        })
                except:
                    # Collection doesn't exist, skip
                    pass
        
        logger.info(f"[Admin Chat] Returning {len(collections_info)} collections")
        return JSONResponse(
            content={
                "total_collections": len(collections_info),
                "collections": collections_info
            },
            status_code=200
        )
    except Exception as e:
        logger.error(f"[Admin Chat] Error fetching Chroma collections: {str(e)}", exc_info=True)
        return JSONResponse(
            content={
                "status": "error",
                "message": f"Error fetching Chroma collections: {str(e)}"
            },
            status_code=500
        )


@router.get("/chroma/collection/{collection_name}")
async def get_collection_details(collection_name: str):
    """Get details of a specific Chroma collection"""
    try:
        chroma_service = get_chat_ai_rag_service()
        
        # Validate collection name
        valid_collections = ["chat_ai_products", "chat_ai_knowledge", "chat_ai_context"]
        if collection_name not in valid_collections:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid collection name. Valid: {valid_collections}"
            )
        
        collection = chroma_service.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"}
        )
        
        # Get sample documents (limit 10)
        all_data = collection.get(limit=10)
        
        return {
            "collection_name": collection_name,
            "total_documents": collection.count(),
            "sample_documents": all_data if all_data else []
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching collection details: {str(e)}"
        )


@router.delete("/chroma/collection/{collection_name}")
async def clear_collection(collection_name: str):
    """Clear all documents from a Chroma collection"""
    try:
        logger.info(f"[Admin Chat] Starting to clear collection: {collection_name}")
        
        try:
            chroma_service = get_chat_ai_rag_service()
        except Exception as chroma_init_error:
            logger.warning(f"[Admin Chat] Chroma service not available: {str(chroma_init_error)}")
            return JSONResponse(
                content={
                    "status": "warning",
                    "message": "Chroma service not available",
                    "collection_name": collection_name
                },
                status_code=200
            )
        
        # Try to delete all documents from collection first
        try:
            collection = chroma_service.client.get_collection(name=collection_name)
            # Get all document IDs in collection
            results = collection.get()
            if results and results.get('ids'):
                logger.info(f"[Admin Chat] Found {len(results['ids'])} documents in {collection_name}")
                # Delete all documents
                collection.delete(ids=results['ids'])
                logger.info(f"[Admin Chat] Deleted all documents from {collection_name}")
        except Exception as e:
            logger.warning(f"[Admin Chat] Could not clear documents: {str(e)}")
        
        # Try to delete collection entirely
        try:
            chroma_service.client.delete_collection(name=collection_name)
            logger.info(f"[Admin Chat] Deleted collection: {collection_name}")
        except Exception as delete_error:
            logger.warning(f"[Admin Chat] Could not delete collection (may not exist): {str(delete_error)}")
        
        result = {
            "status": "success",
            "collection_name": collection_name,
            "message": f"Collection {collection_name} has been cleared/deleted"
        }
        logger.info(f"[Admin Chat] Collection cleared: {result}")
        return JSONResponse(content=result, status_code=200)
        
    except Exception as e:
        logger.error(f"[Admin Chat] Error clearing collection: {str(e)}", exc_info=True)
        return JSONResponse(
            content={
                "status": "error",
                "message": f"Error clearing collection: {str(e)}"
            },
            status_code=500
        )


@router.get("/chroma/collection/{collection_name}/details")
async def get_collection_details(collection_name: str, limit: int = 100):
    """Lấy chi tiết dữ liệu trong collection"""
    try:
        chroma_service = get_chat_ai_rag_service()
        
        # Lấy collection
        collection = chroma_service.client.get_collection(name=collection_name)
        
        # Lấy tất cả dữ liệu trong collection
        results = collection.get(
            limit=limit,
            include=["documents", "metadatas"]
        )
        
        # Format dữ liệu trả về
        documents = []
        if results and results.get('ids'):
            for i, doc_id in enumerate(results['ids']):
                documents.append({
                    "id": doc_id,
                    "document": results['documents'][i] if results.get('documents') else "",
                    "metadata": results['metadatas'][i] if results.get('metadatas') else {}
                })
        
        return JSONResponse(
            content={
                "status": "success",
                "collection_name": collection_name,
                "total_documents": len(documents),
                "documents": documents
            },
            status_code=200
        )
    except Exception as e:
        logger.error(f"[Admin Chat] Error getting collection details: {str(e)}")
        return JSONResponse(
            content={
                "status": "error",
                "message": f"Error getting collection details: {str(e)}"
            },
            status_code=500
        )


@router.delete("/chroma/clear-all")
async def clear_all_chroma_data():
    """Clear ALL Chroma collections - DANGEROUS OPERATION"""
    try:
        chroma_service = get_chat_ai_rag_service()
        
        collections_to_clear = ["chat_ai_products", "chat_ai_knowledge", "chat_ai_context"]
        cleared_count = 0
        
        for collection_name in collections_to_clear:
            try:
                chroma_service.client.delete_collection(name=collection_name)
                cleared_count += 1
                # Recreate empty collection
                chroma_service.client.get_or_create_collection(
                    name=collection_name,
                    metadata={"hnsw:space": "cosine"}
                )
            except:
                pass
        
        return {
            "status": "success",
            "cleared_collections": cleared_count,
            "message": "All Chroma collections have been cleared"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error clearing Chroma data: {str(e)}"
        )


# ===== TEST DATA ENDPOINTS =====

@router.post("/test-data/populate")
async def populate_test_data():
    """Populate test chat data for development/testing"""
    try:
        redis_service = get_redis_service()
        logger.info("[Admin Chat] Starting test data population")
        from datetime import datetime
        
        # Create test data for multiple users
        test_users = [
            {"user_id": "user-1001", "sessions": 2},
            {"user_id": "user-1002", "sessions": 1},
            {"user_id": "user-1003", "sessions": 3},
        ]
        
        total_sessions = 0
        total_messages = 0
        
        for user_info in test_users:
            user_id = user_info["user_id"]
            logger.info(f"[Admin Chat] Creating data for {user_id}")
            for session_num in range(user_info["sessions"]):
                session_id = f"{user_id}-session-{session_num + 1}"
                logger.info(f"[Admin Chat] Creating session {session_id}")
                
                # Add test messages to each session
                num_messages = 3 + session_num  # 3, 4, 5 messages
                for msg_num in range(num_messages):
                    # User message
                    redis_service.save_message(
                        session_id=session_id,
                        user_id=user_id,
                        role="user",
                        content=f"Test message {msg_num + 1} from {user_id}",
                        model="groq/llama-3.1-8b-instant",
                        timestamp=datetime.now().isoformat()
                    )
                    total_messages += 1
                    
                    # Assistant message
                    redis_service.save_message(
                        session_id=session_id,
                        user_id=user_id,
                        role="assistant",
                        content=f"Test response {msg_num + 1} to {user_id}",
                        model="groq/llama-3.1-8b-instant",
                        timestamp=datetime.now().isoformat()
                    )
                    total_messages += 1
                
                total_sessions += 1
        
        result = {
            "status": "success",
            "message": "Test data populated successfully",
            "test_users": len(test_users),
            "total_sessions": total_sessions,
            "total_messages": total_messages
        }
        logger.info(f"[Admin Chat] Test data populated: {result}")
        return result
    except Exception as e:
        logger.error(f"[Admin Chat] Error populating test data: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error populating test data: {str(e)}"
        )


@router.post("/test-data/populate-chroma")
async def populate_chroma_test_data():
    """Populate test documents into Chroma collections for development/testing"""
    try:
        logger.info("[Admin Chat] Starting Chroma test data population")
        
        # Try to get or create Chroma service
        try:
            chroma_service = get_chat_ai_rag_service()
        except Exception as chroma_init_error:
            logger.warning(f"[Admin Chat] Could not initialize Chroma service: {str(chroma_init_error)}")
            # Return success but with warning message
            return JSONResponse(
                content={
                    "status": "warning",
                    "message": "Chroma service not available. Please check Chroma configuration.",
                    "error": str(chroma_init_error)[:200]
                },
                status_code=200
            )
        
        # Get or create collections
        collections_to_populate = ["chat_analytics", "chat_rag"]
        total_documents = 0
        populated_collections = []
        
        for collection_name in collections_to_populate:
            logger.info(f"[Admin Chat] Adding test data to collection: {collection_name}")
            
            try:
                # Get or create collection
                collection = chroma_service.client.get_or_create_collection(
                    name=collection_name,
                    metadata={"description": f"Test data for {collection_name}"}
                )
                
                # Create test documents
                test_docs = [
                    f"Test document 1 for {collection_name}. This is sample content for testing AI RAG.",
                    f"Test document 2 for {collection_name}. Another sample document for AI retrieval.",
                    f"Test document 3 for {collection_name}. More test content for development.",
                    f"Test document 4 for {collection_name}. Additional sample data for embeddings.",
                    f"Test document 5 for {collection_name}. Final test document for similarity search."
                ]
                
                doc_ids = [f"{collection_name}_doc_{i+1}" for i in range(len(test_docs))]
                metadatas = [{"source": "test", "type": "sample"} for _ in test_docs]
                
                # Add documents to collection
                collection.add(
                    ids=doc_ids,
                    documents=test_docs,
                    metadatas=metadatas
                )
                
                total_documents += len(test_docs)
                populated_collections.append(collection_name)
                logger.info(f"[Admin Chat] Added {len(test_docs)} documents to {collection_name}")
                
            except Exception as coll_error:
                logger.warning(f"[Admin Chat] Warning adding to {collection_name}: {str(coll_error)}")
                # Continue to next collection
                continue
        
        result = {
            "status": "success",
            "message": "Chroma test data populated successfully",
            "collections": populated_collections,
            "total_collections": len(populated_collections),
            "total_documents": total_documents
        }
        logger.info(f"[Admin Chat] Chroma test data populated: {result}")
        return JSONResponse(content=result, status_code=200)
        
    except Exception as e:
        logger.error(f"[Admin Chat] Error populating Chroma test data: {str(e)}", exc_info=True)
        return JSONResponse(
            content={
                "status": "error",
                "message": f"Error populating Chroma test data: {str(e)}"
            },
            status_code=500
        )


@router.post("/sync-system-data")
async def sync_system_data_to_chroma(authorization: Optional[str] = None):
    """
    Đồng bộ dữ liệu hệ thống từ Spring Service vào ChromaDB cho Chat AI
    Lấy dữ liệu từ /admin/analytics/system-data và lưu vào Chroma
    
    Args:
        authorization: Bearer token từ frontend (optional in query, should be in header)
    """
    try:
        import httpx
        import os
        import json
        from fastapi import Header
        
        logger.info("[Admin Chat] Starting system data sync to ChromaDB")
        
        # Khởi tạo Chroma service
        try:
            chroma_service = get_chat_ai_rag_service()
        except Exception as chroma_init_error:
            logger.warning(f"[Admin Chat] Chroma service not available: {str(chroma_init_error)}")
            return JSONResponse(
                content={
                    "status": "error",
                    "message": "Chroma service not available",
                    "error": str(chroma_init_error)[:200]
                },
                status_code=500
            )
        
        # Lấy Spring Service URL từ environment
        spring_api_url = os.getenv("SPRING_SERVICE_URL", "http://localhost:8089/api/v1")
        system_data_endpoint = f"{spring_api_url}/admin/analytics/system-data"
        
        logger.info(f"[Admin Chat] Fetching system data from: {system_data_endpoint}")
        
        # Lấy token từ localStorage (frontend sẽ gửi qua body)
        # Token sẽ được gửi từ frontend
        if not authorization:
            return JSONResponse(
                content={
                    "status": "error",
                    "message": "Authorization token required. Please login first."
                },
                status_code=401
            )
        
        # Chuẩn bị headers với token
        headers = {
            "Authorization": authorization if authorization.startswith("Bearer ") else f"Bearer {authorization}"
        }
        
        # Gọi Spring Service API để lấy dữ liệu
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(system_data_endpoint, headers=headers)
                response.raise_for_status()
                logger.info(f"[Admin Chat] Response text: {response.text[:500]}")
                system_data = response.json()
                logger.info(f"[Admin Chat] Successfully fetched system data")
                logger.info(f"[Admin Chat] System data structure: {list(system_data.keys()) if isinstance(system_data, dict) else type(system_data)}")
                
                # Check if data is wrapped in "data" key
                if "data" in system_data and isinstance(system_data["data"], dict):
                    system_data = system_data["data"]
                    logger.info("[Admin Chat] Unwrapped data from 'data' key")
                
                # Debug: check if users is in system_data
                if "users" not in system_data or not isinstance(system_data["users"], list) or len(system_data["users"]) == 0:
                    return JSONResponse(
                        content={
                            "status": "error",
                            "message": f"Users issue. In data: {'users' in system_data}, Is list: {isinstance(system_data.get('users'), list)}, Len: {len(system_data.get('users', []))}, First user: {system_data.get('users', [{}])[0] if system_data.get('users') else 'N/A'}, Response start: {response.text[:200]}"
                        },
                        status_code=500
                    )
            except httpx.HTTPStatusError as http_error:
                logger.error(f"[Admin Chat] HTTP error fetching system data: {http_error.response.status_code}")
                return JSONResponse(
                    content={
                        "status": "error",
                        "message": f"Authentication failed. Please login again. (Status: {http_error.response.status_code})"
                    },
                    status_code=http_error.response.status_code
                )
            except Exception as fetch_error:
                logger.error(f"[Admin Chat] Error fetching system data: {str(fetch_error)}")
                return JSONResponse(
                    content={
                        "status": "error",
                        "message": f"Could not fetch system data: {str(fetch_error)}"
                    },
                    status_code=500
                )
        
        # Chuẩn bị dữ liệu để lưu vào ChromaDB
        total_documents = 0
        synced_data = {
            "users": 0,
            "products": 0,
            "categories": 0,
            "discounts": 0,
            "orders": 0
        }
        
        # Xóa các collection cũ nếu tồn tại
        collections_to_delete = [
            "chat_ai_users", "chat_ai_products", "chat_ai_categories", 
            "chat_ai_discounts", "chat_ai_orders"
        ]
        
        for collection_name in collections_to_delete:
            try:
                chroma_service.client.delete_collection(name=collection_name)
                logger.info(f"[Admin Chat] Deleted old collection: {collection_name}")
            except:
                pass
        
        logger.info(f"[Admin Chat] Cleared all collections, ready to sync")
        
        # 1. Đồng bộ thông tin Users vào collection chat_ai_users
        if "users" in system_data and isinstance(system_data["users"], list):
            users = system_data["users"]
            logger.info(f"[Admin Chat] Found {len(users)} users in system_data")
            logger.info(f"[Admin Chat] Syncing {len(users)} users to chat_ai_users")
            try:
                users_collection = chroma_service.client.get_or_create_collection(
                    name="chat_ai_users",
                    metadata={"description": "User information for AI Chat"}
                )
                logger.info(f"[Admin Chat] Created users collection: {users_collection.name}")
                
                for user in users:
                    if not isinstance(user, dict):
                        logger.warning(f"[Admin Chat] Skipping non-dict user: {type(user)} - {user}")
                        continue
                    logger.info(f"[Admin Chat] Processing user: {user.get('id', 'no-id')}")
                    doc_id = f"user_{user.get('id', user.get('email', ''))}"
                    
                    # Tạo content với TẤT CẢ thông tin từ Spring
                    content_parts = []
                    content_parts.append(f"THÔNG TIN NGƯỜI DÙNG ID: {user.get('id', 'N/A')}")
                    content_parts.append(f"Username: {user.get('username', 'N/A')}")
                    content_parts.append(f"Email: {user.get('email', 'N/A')}")
                    content_parts.append(f"Vai trò: {user.get('role', 'N/A')}")
                    content_parts.append(f"Trạng thái tài khoản: {user.get('accountStatus', 'N/A')}")
                    
                    # Xử lý địa chỉ
                    address = user.get('address', 'N/A')
                    content_parts.append(f"Địa chỉ: {address}")
                    
                    # Xử lý số điện thoại
                    phone = user.get('phoneNumber', 'N/A')
                    content_parts.append(f"Số điện thoại: {phone}")
                    
                    # Thêm tất cả các trường khác từ Spring (nếu có)
                    additional_fields = ['fullName', 'firstName', 'lastName', 'dateOfBirth', 'gender', 
                                       'registrationDate', 'lastLogin', 'isActive', 'isVerified']
                    additional_info = []
                    for field in additional_fields:
                        value = user.get(field)
                        if value is not None and value != '':
                            additional_info.append(f"{field}: {value}")
                    
                    if additional_info:
                        content_parts.append("\nTHÔNG TIN BỔ SUNG:")
                        content_parts.extend([f"  - {info}" for info in additional_info])
                    
                    content = "\n".join(content_parts)
                    
                    # Tạo metadata với TẤT CẢ thông tin quan trọng + full user data
                    metadata = {
                        "type": "user",
                        "user_id": str(user.get('id', '')),
                        "username": user.get('username', ''),
                        "email": user.get('email', ''),
                        "role": user.get('role', ''),
                        "account_status": user.get('accountStatus', ''),
                        "phone_number": user.get('phoneNumber', ''),
                        "address": address,
                        # Lưu toàn bộ user data để query linh hoạt
                        "full_user_data": json.dumps(user)
                    }
                    
                    logger.info(f"[Admin Chat] About to add user {doc_id} to collection")
                    users_collection.add(
                        ids=[doc_id],
                        documents=[content],
                        metadatas=[metadata]
                    )
                    synced_data["users"] += 1
                    logger.info(f"[Admin Chat] Added user {doc_id}, total so far: {synced_data['users']}")
                    
                logger.info(f"[Admin Chat] Successfully synced {synced_data['users']} users to chat_ai_users")
                # Check actual count in collection
                try:
                    count = users_collection.count()
                    logger.info(f"[Admin Chat] Collection {users_collection.name} has {count} documents")
                except Exception as count_error:
                    logger.error(f"[Admin Chat] Error checking count: {str(count_error)}")
            except Exception as e:
                logger.error(f"[Admin Chat] Error syncing users: {str(e)}")
        
        # 2. Đồng bộ Categories vào collection chat_ai_categories
        if "categories" in system_data and isinstance(system_data["categories"], list):
            categories = system_data["categories"]
            logger.info(f"[Admin Chat] Syncing {len(categories)} categories to chat_ai_categories")
            
            try:
                categories_collection = chroma_service.client.get_or_create_collection(
                    name="chat_ai_categories",
                    metadata={"description": "Product categories for AI Chat"}
                )
                
                for category in categories:
                    doc_id = f"category_{category.get('id', category.get('name', ''))}"
                    
                    # Tạo content với TẤT CẢ thông tin từ Spring
                    content_parts = []
                    content_parts.append(f"DANH MỤC ID: {category.get('id', 'N/A')}")
                    content_parts.append(f"Tên danh mục: {category.get('name', 'N/A')}")
                    content_parts.append(f"Mô tả: {category.get('description', 'N/A')}")
                    content_parts.append(f"Số lượng sản phẩm: {category.get('productCount', 0)}")
                    content_parts.append(f"Trạng thái: {category.get('status', 'N/A')}")
                    
                    # Thêm tất cả các trường khác từ Spring
                    additional_fields = ['parentId', 'parentName', 'level', 'sortOrder', 'imageUrl', 
                                       'icon', 'seoTitle', 'seoDescription', 'isActive', 'createdAt', 'updatedAt']
                    additional_info = []
                    for field in additional_fields:
                        value = category.get(field)
                        if value is not None and value != '':
                            additional_info.append(f"{field}: {value}")
                    
                    if additional_info:
                        content_parts.append("\nTHÔNG TIN BỔ SUNG:")
                        content_parts.extend([f"  - {info}" for info in additional_info])
                    
                    content = "\n".join(content_parts)
                    
                    # Tạo metadata với TẤT CẢ thông tin quan trọng + full category data
                    metadata = {
                        "type": "category",
                        "category_id": str(category.get('id', '')),
                        "category_name": category.get('name', ''),
                        "product_count": category.get('productCount', 0),
                        "status": category.get('status', ''),
                        # Lưu toàn bộ category data để query linh hoạt
                        "full_category_data": json.dumps(category)
                    }
                    
                    categories_collection.add(
                        ids=[doc_id],
                        documents=[content],
                        metadatas=[metadata]
                    )
                    synced_data["categories"] += 1
                
                logger.info(f"[Admin Chat] Successfully synced {synced_data['categories']} categories to chat_ai_categories")
            except Exception as e:
                logger.error(f"[Admin Chat] Error syncing categories: {str(e)}")
        
        # 3. Đồng bộ Products vào collection chat_ai_products
        if "products" in system_data and isinstance(system_data["products"], list):
            products = system_data["products"]
            logger.info(f"[Admin Chat] Syncing {len(products)} products to chat_ai_products")
            
            try:
                # Xóa collection cũ trước khi sync mới để tránh dữ liệu duplicate
                try:
                    chroma_service.client.delete_collection("chat_ai_products")
                    logger.info("[Admin Chat] Deleted existing chat_ai_products collection")
                except Exception as delete_error:
                    logger.warning(f"[Admin Chat] Could not delete existing collection: {str(delete_error)}")
                
                products_collection = chroma_service.client.get_or_create_collection(
                    name="chat_ai_products",
                    metadata={"description": "Product catalog for AI Chat"}
                )
                
                for i, product in enumerate(products):
                    try:
                        logger.info(f"[Admin Chat] Processing product {i+1}/{len(products)}")
                        if product is None:
                            logger.warning(f"[Admin Chat] Skipping None product at index {i}")
                            continue
                        if not isinstance(product, dict):
                            logger.warning(f"[Admin Chat] Skipping non-dict product at index {i}: {type(product)} - {product}")
                            continue
                            
                        doc_id = f"product_{product.get('id', product.get('name', ''))}"
                        
                        # Parse details JSON if it's a string
                        details = product.get('details', {})
                        if details is None:
                            details = {}
                        if isinstance(details, str):
                            try:
                                import json
                                details = json.loads(details)
                            except:
                                details = {}
                        
                        # Extract brand from details
                        brand = details.get('brand', 'N/A') if isinstance(details, dict) else 'N/A'
                        
                        # Tạo content với TẤT CẢ thông tin từ Spring
                        content_parts = []
                        content_parts.append(f"SẢN PHẨM ID: {product.get('id', 'N/A')}")
                        content_parts.append(f"Tên sản phẩm: {product.get('name', 'N/A')}")
                        content_parts.append(f"Giá: {product.get('price', 0):,.0f} VNĐ")
                        content_parts.append(f"Danh mục: {product.get('categoryName', 'N/A')}")
                        content_parts.append(f"Thương hiệu: {brand}")
                        content_parts.append(f"Số lượng tồn kho: {product.get('quantity', 0)}")
                        content_parts.append(f"Trạng thái: {product.get('status', 'N/A')}")
                        content_parts.append(f"Mô tả: {product.get('description', 'N/A')}")
                        
                        # Thêm thông tin seller
                        seller_username = product.get('sellerUsername', 'N/A')
                        seller_id = product.get('sellerId', 'N/A')
                        if seller_username != 'N/A':
                            content_parts.append(f"Người bán: {seller_username} (ID: {seller_id})")
                        
                        # Thêm thông tin bán hàng
                        total_sold = product.get('totalSold', 0)
                        total_revenue = product.get('totalRevenue', 0)
                        if total_sold > 0:
                            content_parts.append(f"Đã bán: {total_sold} sản phẩm")
                            content_parts.append(f"Doanh thu: {total_revenue:,.0f} VNĐ")
                        
                        # Xử lý specifications từ details
                        if isinstance(details, dict) and details:
                            content_parts.append("\nTHÔNG SỐ KỸ THUẬT:")
                            # Extract key specs
                            spec_fields = ['os', 'storage', 'display', 'camera', 'battery', 'processor', 'color', 'origin', 'warranty']
                            for field in spec_fields:
                                value = details.get(field)
                                if value:
                                    if isinstance(value, dict):
                                        # Handle nested objects like camera, display
                                        if field == 'camera':
                                            main = value.get('main', 'N/A')
                                            content_parts.append(f"  - Camera: {main} (chính)")
                                        elif field == 'display':
                                            size = value.get('size', 'N/A')
                                            type_display = value.get('type', 'N/A')
                                            content_parts.append(f"  - Màn hình: {size}, {type_display}")
                                        else:
                                            content_parts.append(f"  - {field}: {value}")
                                    elif isinstance(value, list):
                                        content_parts.append(f"  - {field}: {', '.join(map(str, value))}")
                                    else:
                                        content_parts.append(f"  - {field}: {value}")
                        
                        # Xử lý imageUrls - Lưu cả URL để AI có thể hiển thị ảnh
                        image_urls = product.get('imageUrls', [])
                        if isinstance(image_urls, str):
                            try:
                                image_urls = json.loads(image_urls)
                            except:
                                image_urls = []

                        if image_urls:
                            content_parts.append(f"\nHình ảnh: {len(image_urls)} ảnh")
                            for i, url in enumerate(image_urls[:3]):  # Show first 3 images
                                content_parts.append(f"  - Hình {i+1}: {url}")
                            # Thêm thông tin để AI có thể sử dụng trong markdown
                            content_parts.append(f"  - URL ảnh chính: {image_urls[0] if image_urls else 'N/A'}")
                        content = "\n".join(content_parts)
                        
                        # Tạo metadata với TẤT CẢ thông tin quan trọng + full product data
                        metadata = {
                            "type": "product",
                            "product_id": str(product.get('id', '')),
                            "product_name": product.get('name', ''),
                            "category": product.get('categoryName', ''),
                            "price": float(product.get('price', 0)),
                            "quantity": int(product.get('quantity', 0)),  # Changed from stockQuantity
                            "status": product.get('status', ''),
                            "brand": brand,  # Extracted from details JSON
                            "seller_username": product.get('sellerUsername', ''),
                            "seller_id": str(product.get('sellerId', '')),
                            "total_sold": int(product.get('totalSold', 0)),
                            "total_revenue": float(product.get('totalRevenue', 0)),
                            "description": product.get('description', ''),
                            # Add key specs from details
                            "os": details.get('os', '') if isinstance(details, dict) else '',
                            "storage": details.get('storage', '') if isinstance(details, dict) else '',
                            "display": json.dumps(details.get('display', {})) if isinstance(details.get('display'), dict) else str(details.get('display', '')) if isinstance(details, dict) else '',
                            "camera": json.dumps(details.get('camera', {})) if isinstance(details.get('camera'), dict) else str(details.get('camera', '')) if isinstance(details, dict) else '',
                            "battery": json.dumps(details.get('battery', '')) if isinstance(details.get('battery'), dict) else str(details.get('battery', '')) if isinstance(details, dict) else '',
                            "processor": details.get('processor', '') if isinstance(details, dict) else '',
                            "color": details.get('color', '') if isinstance(details, dict) else '',
                            "origin": details.get('origin', '') if isinstance(details, dict) else '',
                            "warranty": details.get('warranty', '') if isinstance(details, dict) else '',
                            "image_urls": json.dumps(image_urls) if image_urls else '',  # Thêm image URLs để AI có thể sử dụng
                            # Lưu toàn bộ product data để query linh hoạt
                            "full_product_data": json.dumps(product)
                        }
                        
                        products_collection.add(
                            ids=[doc_id],
                            documents=[content],
                            metadatas=[metadata]
                        )
                        synced_data["products"] += 1
                        logger.info(f"[Admin Chat] Successfully processed product {i+1}/{len(products)}: {doc_id}")
                        
                    except Exception as product_error:
                        logger.error(f"[Admin Chat] Error processing product {i+1}: {str(product_error)}")
                        logger.error(f"[Admin Chat] Product data: {product}")
                        continue  # Continue with next product                logger.info(f"[Admin Chat] Successfully synced {synced_data['products']} products to chat_ai_products")
            except Exception as e:
                logger.error(f"[Admin Chat] Error syncing products: {str(e)}")
        
        # 4. Đồng bộ Discounts vào collection chat_ai_discounts
        if "discounts" in system_data and isinstance(system_data["discounts"], list):
            discounts = system_data["discounts"]
            logger.info(f"[Admin Chat] Syncing {len(discounts)} discounts to chat_ai_discounts")
            logger.info(f"[Admin Chat] Full discount data: {str(discounts)}")

            try:
                # Clear existing collection to ensure fresh sync
                try:
                    chroma_service.client.delete_collection("chat_ai_discounts")
                    logger.info("[Admin Chat] Cleared existing chat_ai_discounts collection")
                except Exception as delete_error:
                    logger.warning(f"[Admin Chat] Could not delete existing collection: {str(delete_error)}")

                discounts_collection = chroma_service.client.get_or_create_collection(
                    name="chat_ai_discounts",
                    metadata={"description": "Discount codes for AI Chat"}
                )

                processed_ids = set()  # Track processed IDs to avoid duplicates
                successful_adds = 0

                logger.info(f"[Admin Chat] Starting to process {len(discounts)} discounts...")

                for idx, discount in enumerate(discounts):
                    try:
                        discount_id = discount.get('id')
                        discount_code = discount.get('code', '')

                        # Skip if no ID or code
                        if not discount_id and not discount_code:
                            logger.warning(f"[Admin Chat] Skipping discount {idx+1}: no ID or code")
                            continue

                        # Create unique doc_id
                        if discount_id:
                            doc_id = f"discount_{discount_id}"
                        else:
                            doc_id = f"discount_code_{discount_code}"

                        # Skip duplicates
                        if doc_id in processed_ids:
                            logger.warning(f"[Admin Chat] Skipping duplicate discount {doc_id}")
                            continue

                        processed_ids.add(doc_id)

                        logger.info(f"[Admin Chat] Processing discount {idx+1}/{len(discounts)}: ID={discount_id}, Code={discount_code}, Status={discount.get('status')}")

                        # Tạo content với TẤT CẢ thông tin từ Spring
                        content_parts = []
                        content_parts.append(f"KHUYẾN MÃI ID: {discount_id}")
                        content_parts.append(f"Mã khuyến mãi: {discount_code}")
                        content_parts.append(f"Tên: {discount.get('name', 'N/A')}")
                        content_parts.append(f"Mô tả: {discount.get('description', 'N/A')}")
                        content_parts.append(f"Loại giảm giá: {discount.get('discountType', 'PERCENTAGE')}")
                        content_parts.append(f"Giá trị giảm: {discount.get('discountValue', 0)}")
                        
                        # Handle None values for maxDiscountAmount
                        max_discount = discount.get('maxDiscountAmount')
                        if max_discount is not None:
                            content_parts.append(f"Giá trị tối đa: {max_discount:,.0f} VNĐ")
                        else:
                            content_parts.append("Giá trị tối đa: Không giới hạn")
                        
                        content_parts.append(f"Đơn hàng tối thiểu: {discount.get('minOrderValue', 0):,.0f} VNĐ")
                        content_parts.append(f"Giới hạn sử dụng: {discount.get('usageLimit', 0)}")
                        content_parts.append(f"Đã sử dụng: {discount.get('usedCount', 0)}")
                        content_parts.append(f"Ngày bắt đầu: {discount.get('startDate', 'N/A')}")
                        content_parts.append(f"Ngày kết thúc: {discount.get('endDate', 'N/A')}")
                        content_parts.append(f"Trạng thái: {discount.get('status', 'N/A')}")
                        content_parts.append(f"Được tạo bởi: {discount.get('createdByUsername', 'N/A')}")
                        
                        # Thêm tất cả các trường khác từ Spring
                        additional_fields = ['createdAt', 'updatedAt', 'isActive', 'applicableCategories', 
                                           'applicableProducts', 'excludedCategories', 'excludedProducts',
                                           'customerGroups', 'minQuantity', 'maxQuantity']
                        additional_info = []
                        for field in additional_fields:
                            value = discount.get(field)
                            if value is not None and value != '':
                                if isinstance(value, list):
                                    additional_info.append(f"{field}: {', '.join(map(str, value))}")
                                else:
                                    additional_info.append(f"{field}: {value}")
                        
                        if additional_info:
                            content_parts.append("\nTHÔNG TIN BỔ SUNG:")
                            content_parts.extend([f"  - {info}" for info in additional_info])
                        
                        content = "\n".join(content_parts)

                        # Tạo metadata với TẤT CẢ thông tin quan trọng + full discount data
                        metadata = {
                            "type": "discount",
                            "discount_id": str(discount_id) if discount_id else "",
                            "discount_code": discount_code,
                            "discount_value": float(discount.get('discountValue', 0)),
                            "discount_type": discount.get('discountType', 'PERCENTAGE'),
                            "status": discount.get('status', 'N/A'),
                            "usage_limit": int(discount.get('usageLimit', 0)),
                            "used_count": int(discount.get('usedCount', 0)),
                            "max_discount_amount": float(max_discount or 0),
                            "is_valid": discount.get('isValid', False),
                            "is_expired": discount.get('isExpired', False),
                            # Lưu toàn bộ discount data để query linh hoạt
                            "full_discount_data": json.dumps(discount)
                        }

                        logger.info(f"[Admin Chat] Adding discount {doc_id} to collection...")

                        try:
                            discounts_collection.add(
                                ids=[doc_id],
                                documents=[content],
                                metadatas=[metadata]
                            )
                            synced_data["discounts"] += 1
                            successful_adds += 1
                            logger.info(f"[Admin Chat] ✅ Successfully added discount {doc_id} ({successful_adds}/{len(discounts)})")
                        except Exception as add_error:
                            logger.error(f"[Admin Chat] ❌ Failed to add discount {doc_id}: {str(add_error)}")
                            logger.error(f"[Admin Chat] Content length: {len(content)}")
                            logger.error(f"[Admin Chat] Metadata: {metadata}")
                            # Continue processing other discounts

                    except Exception as item_error:
                        logger.error(f"[Admin Chat] Error adding discount {idx+1} (ID: {discount.get('id')}, Code: {discount.get('code')}): {str(item_error)}")
                        logger.error(f"[Admin Chat] Discount data: {str(discount)}")

                logger.info(f"[Admin Chat] 📊 DISCOUNTS SUMMARY: {successful_adds}/{len(discounts)} discounts successfully synced to chat_ai_discounts")
                logger.info(f"[Admin Chat] Expected: {len(discounts)}, Processed: {successful_adds}, synced_data['discounts']: {synced_data['discounts']}")

            except Exception as e:
                logger.error(f"[Admin Chat] Error syncing discounts: {str(e)}", exc_info=True)
        
        # 5. Đồng bộ Orders vào collection chat_ai_orders
        if "orders" in system_data and isinstance(system_data["orders"], list):
            orders = system_data["orders"]
            logger.info(f"[Admin Chat] Syncing {len(orders)} orders to chat_ai_orders")
            
            try:
                orders_collection = chroma_service.client.get_or_create_collection(
                    name="chat_ai_orders",
                    metadata={"description": "Order history for AI Chat"}
                )
                
                for order in orders:
                    doc_id = f"order_{order.get('id', '')}"
                    
                    # Lấy thông tin user từ Spring data (customerId, customerName)
                    customer_id = order.get('customerId', '')
                    customer_name = order.get('customerName', 'N/A')
                    
                    # Tìm email của customer từ users data nếu có
                    user_email = 'N/A'
                    if "users" in system_data and isinstance(system_data["users"], list):
                        for user in system_data["users"]:
                            if str(user.get('id', '')) == str(customer_id):
                                user_email = user.get('email', 'N/A')
                                break
                    
                    # Tạo content với TẤT CẢ thông tin từ Spring
                    content_parts = []
                    content_parts.append(f"ĐƠN HÀNG ID: {order.get('id', 'N/A')}")
                    content_parts.append(f"Khách hàng ID: {customer_id}")
                    content_parts.append(f"Tên khách hàng: {customer_name}")
                    content_parts.append(f"Email khách hàng: {user_email}")
                    content_parts.append(f"Trạng thái: {order.get('status', 'N/A')}")
                    content_parts.append(f"Tổng tiền: {order.get('totalAmount', 0):,.0f} VNĐ")
                    content_parts.append(f"Tổng số sản phẩm: {order.get('totalItems', 0)}")
                    content_parts.append(f"Ngày tạo: {order.get('createdAt', 'N/A')}")
                    
                    # Thêm tất cả items với đầy đủ thông tin
                    order_items = order.get('items', [])
                    if order_items:
                        content_parts.append("\nCHI TIẾT SẢN PHẨM:")
                        for i, item in enumerate(order_items, 1):
                            content_parts.append(f"  {i}. {item.get('productName', 'N/A')}")
                            content_parts.append(f"     - ID sản phẩm: {item.get('productId', 'N/A')}")
                            content_parts.append(f"     - Số lượng: {item.get('quantity', 0)}")
                            content_parts.append(f"     - Đơn giá: {item.get('price', 0):,.0f} VNĐ")
                            content_parts.append(f"     - Thành tiền: {item.get('subtotal', 0):,.0f} VNĐ")
                    
                    # Thêm tất cả các trường khác từ Spring (nếu có)
                    additional_fields = ['shippingAddress', 'phone', 'paymentMethod', 'paymentStatus', 
                                       'discountAmount', 'finalAmount', 'updatedAt', 'notes']
                    additional_info = []
                    for field in additional_fields:
                        value = order.get(field)
                        if value is not None and value != '':
                            if isinstance(value, dict):
                                additional_info.append(f"{field}: {value}")
                            else:
                                additional_info.append(f"{field}: {value}")
                    
                    if additional_info:
                        content_parts.append("\nTHÔNG TIN BỔ SUNG:")
                        content_parts.extend([f"  - {info}" for info in additional_info])
                    
                    content = "\n".join(content_parts)
                    
                    # Tạo metadata với TẤT CẢ thông tin quan trọng
                    metadata = {
                        "type": "order",
                        "order_id": str(order.get('id', '')),
                        "customer_id": str(customer_id),
                        "customer_name": customer_name,
                        "user_email": user_email,
                        "status": order.get('status', ''),
                        "total_amount": float(order.get('totalAmount', 0)),
                        "total_items": order.get('totalItems', 0),
                        "created_at": order.get('createdAt', ''),
                        # Lưu toàn bộ order data để query linh hoạt
                        "full_order_data": json.dumps(order)
                    }
                    
                    orders_collection.add(
                        ids=[doc_id],
                        documents=[content],
                        metadatas=[metadata]
                    )
                    synced_data["orders"] += 1
                
                logger.info(f"[Admin Chat] Successfully synced {synced_data['orders']} orders to chat_ai_orders")
            except Exception as e:
                logger.error(f"[Admin Chat] Error syncing orders: {str(e)}")
        
        total_documents = sum(synced_data.values())
        
        result = {
            "status": "success",
            "message": "System data synced to ChromaDB successfully",
            "collection": collection_name,
            "synced_data": synced_data,
            "total_documents": total_documents
        }
        
        logger.info(f"[Admin Chat] Sync completed: {result}")
        return JSONResponse(content=result, status_code=200)
        
    except Exception as e:
        logger.error(f"[Admin Chat] Error syncing system data: {str(e)}", exc_info=True)
        return JSONResponse(
            content={
                "status": "error",
                "message": f"Error syncing system data: {str(e)}"
            },
            status_code=500
        )


# ===== MODAL CONFIG MANAGEMENT =====

@router.post("/modal-config")
async def set_modal_config(request: ModalConfigRequest):
    """Lưu config modal cho chat AI"""
    try:
        chroma_service = get_chat_ai_rag_service()
        
        success = chroma_service.set_modal_config(request.modal_name, request.modal_config)
        
        if success:
            return JSONResponse(
                content={
                    "status": "success",
                    "message": f"Modal config '{request.modal_name}' saved successfully"
                },
                status_code=200
            )
        else:
            return JSONResponse(
                content={
                    "status": "error",
                    "message": "Failed to save modal config"
                },
                status_code=500
            )
    except Exception as e:
        logger.error(f"[Admin Chat] Error setting modal config: {str(e)}")
        return JSONResponse(
            content={
                "status": "error",
                "message": f"Error setting modal config: {str(e)}"
            },
            status_code=500
        )

@router.get("/modal-config/active")
async def get_active_modal_config():
    """Lấy modal config đang active"""
    try:
        chroma_service = get_chat_ai_rag_service()
        
        config = chroma_service.get_active_modal_config()
        
        if config:
            return JSONResponse(
                content={
                    "status": "success",
                    "data": config
                },
                status_code=200
            )
        else:
            return JSONResponse(
                content={
                    "status": "success",
                    "data": None,
                    "message": "No active modal config found"
                },
                status_code=200
            )
    except Exception as e:
        logger.error(f"[Admin Chat] Error getting active modal config: {str(e)}")
        return JSONResponse(
            content={
                "status": "error",
                "message": f"Error getting active modal config: {str(e)}"
            },
            status_code=500
        )

@router.get("/modal-config/all")
async def get_all_modal_configs():
    """Lấy tất cả modal configs"""
    try:
        chroma_service = get_chat_ai_rag_service()
        
        configs = chroma_service.get_all_modal_configs()
        
        return JSONResponse(
            content={
                "status": "success",
                "data": configs
            },
            status_code=200
        )
    except Exception as e:
        logger.error(f"[Admin Chat] Error getting all modal configs: {str(e)}")
        return JSONResponse(
            content={
                "status": "error",
                "message": f"Error getting all modal configs: {str(e)}"
            },
            status_code=500
        )

@router.delete("/modal-config/{modal_name}")
async def delete_modal_config(modal_name: str):
    """Xóa modal config"""
    try:
        chroma_service = get_chat_ai_rag_service()
        
        success = chroma_service.delete_modal_config(modal_name)
        
        if success:
            return JSONResponse(
                content={
                    "status": "success",
                    "message": f"Modal config '{modal_name}' deleted successfully"
                },
                status_code=200
            )
        else:
            return JSONResponse(
                content={
                    "status": "error",
                    "message": "Failed to delete modal config"
                },
                status_code=500
            )
    except Exception as e:
        logger.error(f"[Admin Chat] Error deleting modal config: {str(e)}")
@router.get("/modal-config/models")
async def get_available_models():
    """Lấy danh sách models có sẵn từ Groq API"""
    try:
        # Import here to avoid circular imports
        from config.api_config import getGroqChatUrl
        
        # Call Groq API to get models
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{getGroqChatUrl('/models')}")
            if response.status_code == 200:
                data = response.json()
                return JSONResponse(
                    content={
                        "status": "success",
                        "models": data.get("models", []),
                        "default_model": data.get("default_model")
                    },
                    status_code=200
                )
            else:
                return JSONResponse(
                    content={
                        "status": "error",
                        "message": "Failed to fetch models from Groq API"
                    },
                    status_code=500
                )
    except Exception as e:
        logger.error(f"[Admin Chat] Error fetching models: {str(e)}")
        return JSONResponse(
            content={
                "status": "error",
                "message": f"Error fetching models: {str(e)}"
            },
            status_code=500
        )

# ===== USER DATA MANAGEMENT FOR RAG =====

@router.post("/user-data/sync")
async def sync_user_data_to_rag():
    """
    Sync user data (orders, preferences) từ database vào ChromaDB để AI có thể tư vấn

    Note: Hiện tại endpoint này cần được implement với data source thực
    """
    try:
        # TODO: Implement với data source thực (Spring Service hoặc database)
        # Hiện tại chỉ trả về message thông báo

        return JSONResponse(
            content={
                "status": "success",
                "message": "User data sync endpoint ready - cần implement data source",
                "data": {
                    "users_synced": 0,
                    "orders_synced": 0,
                    "note": "Endpoint cần kết nối với Spring Service để lấy user data thực"
                }
            },
            status_code=200
        )

    except Exception as e:
        logger.error(f"[Admin Chat] Error in user data sync: {str(e)}")
        return JSONResponse(
            content={
                "status": "error",
                "message": f"Lỗi khi sync user data: {str(e)}"
            },
            status_code=500
        )

@router.post("/user-data/{user_id}/sync")
async def sync_single_user_data_to_rag(user_id: str):
    """
    Sync data của một user cụ thể vào ChromaDB

    Args:
        user_id: ID của user cần sync
    """
    try:
        from services.data_sync_service import get_data_sync_service

        data_sync_svc = get_data_sync_service()
        chroma_svc = get_chat_ai_rag_service()

        # Get user data
        user_data = data_sync_svc.get_user_by_id(user_id)
        if not user_data:
            return JSONResponse(
                content={
                    "status": "error",
                    "message": f"Không tìm thấy user {user_id}"
                },
                status_code=404
            )

        # Sync user personal data
        user_personal_data = {
            "name": user_data.get('name', ''),
            "email": user_data.get('email', ''),
            "preferences": user_data.get('preferences', {}),
            "registration_date": user_data.get('created_at', ''),
            "last_login": user_data.get('last_login', '')
        }

        chroma_svc.store_user_data(user_id, user_personal_data)

        # Sync user orders
        user_orders = data_sync_svc.get_user_orders(user_id)
        orders_synced = 0
        for order in user_orders:
            chroma_svc.store_user_order(user_id, order)
            orders_synced += 1

        return JSONResponse(
            content={
                "status": "success",
                "message": f"Đã sync user {user_id} và {orders_synced} orders vào RAG system",
                "data": {
                    "user_id": user_id,
                    "orders_synced": orders_synced
                }
            },
            status_code=200
        )

    except Exception as e:
        logger.error(f"[Admin Chat] Error syncing user {user_id} data to RAG: {str(e)}")
        return JSONResponse(
            content={
                "status": "error",
                "message": f"Lỗi khi sync user data: {str(e)}"
            },
            status_code=500
        )

@router.get("/rag-stats")
async def get_rag_stats():
    """
    Lấy thống kê ChromaDB collections cho RAG system
    """
    try:
        chroma_svc = get_chat_ai_rag_service()
        stats = chroma_svc.get_collection_stats()

        return JSONResponse(
            content={
                "status": "success",
                "data": stats
            },
            status_code=200
        )

    except Exception as e:
        logger.error(f"[Admin Chat] Error getting RAG stats: {str(e)}")
        return JSONResponse(
            content={
                "status": "error",
                "message": f"Lỗi khi lấy RAG stats: {str(e)}"
            },
            status_code=500
        )

@router.get("/user-data/{user_id}")
async def get_user_rag_data(user_id: str):
    """
    Lấy thông tin RAG data của một user (orders, personal data)

    Args:
        user_id: ID của user

    Returns:
        User RAG data
    """
    try:
        chroma_svc = get_chat_ai_rag_service()

        # Get user orders collection
        orders_collection = chroma_svc._get_or_create_user_orders_collection()
        orders_results = orders_collection.get(
            where={"user_id": user_id}
        )

        # Get user data collection
        data_collection = chroma_svc._get_or_create_user_data_collection()
        data_results = data_collection.get(
            where={"user_id": user_id}
        )

        user_orders = []
        if orders_results and orders_results["documents"]:
            for i, doc in enumerate(orders_results["documents"]):
                metadata = orders_results["metadatas"][i] if orders_results["metadatas"] else {}
                user_orders.append({
                    "order_id": metadata.get("order_id"),
                    "content": doc,
                    "timestamp": metadata.get("timestamp")
                })

        user_data = None
        if data_results and data_results["documents"]:
            metadata = data_results["metadatas"][0] if data_results["metadatas"] else {}
            user_data = {
                "content": data_results["documents"][0],
                "timestamp": metadata.get("timestamp")
            }

        return JSONResponse(
            content={
                "status": "success",
                "data": {
                    "user_id": user_id,
                    "orders": user_orders,
                    "personal_data": user_data,
                    "orders_count": len(user_orders)
                }
            },
            status_code=200
        )

    except Exception as e:
        logger.error(f"[Admin Chat] Error getting user RAG data: {str(e)}")
        return JSONResponse(
            content={
                "status": "error",
                "message": f"Lỗi khi lấy user RAG data: {str(e)}"
            },
            status_code=500
        )

@router.delete("/user-data/{user_id}")
async def delete_user_rag_data(user_id: str):
    """
    Xóa toàn bộ RAG data của một user (orders, personal data)

    Args:
        user_id: ID của user

    Returns:
        Delete status
    """
    try:
        chroma_svc = get_chat_ai_rag_service()

        # Delete user orders
        orders_collection = chroma_svc._get_or_create_user_orders_collection()
        orders_to_delete = orders_collection.get(where={"user_id": user_id})
        if orders_to_delete and orders_to_delete["ids"]:
            orders_collection.delete(ids=orders_to_delete["ids"])

        # Delete user data
        data_collection = chroma_svc._get_or_create_user_data_collection()
        data_to_delete = data_collection.get(where={"user_id": user_id})
        if data_to_delete and data_to_delete["ids"]:
            data_collection.delete(ids=data_to_delete["ids"])

        return JSONResponse(
            content={
                "status": "success",
                "message": f"Đã xóa RAG data của user {user_id}"
            },
            status_code=200
        )

    except Exception as e:
        logger.error(f"[Admin Chat] Error deleting user RAG data: {str(e)}")
        return JSONResponse(
            content={
                "status": "error",
                "message": f"Lỗi khi xóa user RAG data: {str(e)}"
            },
            status_code=500
        )
