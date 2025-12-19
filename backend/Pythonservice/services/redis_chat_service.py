"""
Redis Chat History Service
Manages chat session history using Redis
"""
import redis
import json
import os
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel

class ChatMessage(BaseModel):
    """Chat message model for Redis storage"""
    role: str
    content: str
    timestamp: str

class RedisChatService:
    """Service for managing chat history in Redis"""
    
    def __init__(self, host: str = None, port: int = None, db: int = None, 
                 password: str = None, ttl: int = None):
        """Initialize Redis connection
        
        Args:
            host: Redis host (default from REDIS_HOST env var)
            port: Redis port (default from REDIS_PORT env var)
            db: Redis database (default from REDIS_DB env var)
            password: Redis password (default from REDIS_PASSWORD env var)
            ttl: Time to live in seconds (default from CHAT_HISTORY_TTL env var)
        """
        self.redis_host = host or os.getenv('REDIS_HOST', 'localhost')
        self.redis_port = port or int(os.getenv('REDIS_PORT', 6379))
        self.redis_db = db or int(os.getenv('REDIS_DB', 0))
        self.redis_password = password or os.getenv('REDIS_PASSWORD', None)
        self.ttl = ttl or int(os.getenv('CHAT_HISTORY_TTL', 86400))  # 24 hours default
        
        try:
            self.client = redis.Redis(
                host=self.redis_host,
                port=self.redis_port,
                db=self.redis_db,
                password=self.redis_password if self.redis_password else None,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_keepalive=True
            )
            # Test connection
            self.client.ping()
            print(f"[Redis] Connected to {self.redis_host}:{self.redis_port}")
        except Exception as e:
            print(f"[Redis] Connection failed: {str(e)}")
            self.client = None
    
    def get_session_key(self, session_id: str) -> str:
        """Generate Redis key for session"""
        return f"chat:session:{session_id}"
    
    def get_user_session_key(self, user_id: str, session_id: str) -> str:
        """Generate user-specific session key to ensure user isolation"""
        # This creates a namespace per user for session data
        return f"chat:user:{user_id}:session:{session_id}"
    
    def get_user_sessions_key(self, user_id: str) -> str:
        """Generate Redis key for user's session list"""
        return f"chat:user:{user_id}:sessions"
    
    def get_message_key(self, session_id: str, index: int) -> str:
        """Generate Redis key for individual message"""
        return f"chat:message:{session_id}:{index}"
    
    def save_message(self, session_id: str, user_id: str, role: str, content: str, model: str, timestamp: str) -> bool:
        """Save single message to Redis with user association and isolation
        
        Args:
            session_id: Chat session ID
            user_id: User ID (for linking sessions to users)
            role: Message role ('user' or 'assistant')
            content: Message content
            model: Model used (for tracking)
            timestamp: ISO format timestamp
        
        Returns:
            True if message saved successfully
        """
        if not self.client:
            return False
        
        try:
            # Use user-specific session key for isolation
            user_session_key = self.get_user_session_key(user_id, session_id)
            user_sessions_key = self.get_user_sessions_key(user_id)
            
            # Create message dict with user_id for context
            message_data = {
                "role": role,
                "content": content,
                "model": model,
                "timestamp": timestamp,
                "user_id": user_id
            }
            
            # Store message as JSON
            message_json = json.dumps(message_data, ensure_ascii=False)
            
            # Add to sorted set with timestamp as score for ordering
            timestamp_obj = datetime.fromisoformat(timestamp)
            timestamp_score = timestamp_obj.timestamp()
            self.client.zadd(user_session_key, {message_json: timestamp_score})
            
            # Add session to user's session list (if not already there)
            self.client.sadd(user_sessions_key, session_id)
            
            # Store session metadata with user_id for verification
            session_meta = {
                "session_id": session_id,
                "user_id": user_id,
                "created_at": timestamp,
                "last_updated": timestamp,
                "message_count": self.client.zcard(user_session_key)
            }
            session_meta_key = f"chat:user:{user_id}:session:{session_id}:meta"
            self.client.hset(session_meta_key, mapping=session_meta)
            
            # Set expiration for all keys
            self.client.expire(user_session_key, self.ttl)
            self.client.expire(user_sessions_key, self.ttl)
            self.client.expire(session_meta_key, self.ttl)
            
            return True
        except Exception as e:
            print(f"[Redis Error] Failed to save message: {str(e)}")
            return False
    
    def get_session_history(self, session_id: str, user_id: str = None) -> List[dict]:
        """Get all messages from a session
        
        Args:
            session_id: The session ID to retrieve
            user_id: Optional user_id for user-specific lookup (recommended for security)
        
        Returns:
            List of message dicts with role, content, model, timestamp
        """
        if not self.client:
            return []
        
        try:
            # If user_id provided, use user-specific key (recommended)
            if user_id:
                session_key = self.get_user_session_key(user_id, session_id)
            else:
                # Fallback to session_key (for backward compatibility)
                session_key = self.get_session_key(session_id)
            
            # Get all messages in order (oldest first)
            messages_json = self.client.zrange(session_key, 0, -1)
            
            messages = []
            for msg_json in messages_json:
                try:
                    msg_dict = json.loads(msg_json)
                    messages.append(msg_dict)
                except:
                    continue
            
            return messages
        except Exception as e:
            print(f"[Redis Error] Failed to get session history: {str(e)}")
            return []
    
    def clear_session(self, session_id: str, user_id: str = None) -> bool:
        """Clear all messages from a session
        
        Args:
            session_id: Session to clear
            user_id: Optional user_id for user-specific lookup
        """
        if not self.client:
            return False
        
        try:
            # Use user-specific key if user_id provided
            if user_id:
                session_key = self.get_user_session_key(user_id, session_id)
                meta_key = f"chat:user:{user_id}:session:{session_id}:meta"
                self.client.delete(meta_key)
            else:
                session_key = self.get_session_key(session_id)
            
            self.client.delete(session_key)
            return True
        except Exception as e:
            print(f"[Redis Error] Failed to clear session: {str(e)}")
            return False
    
    def get_session_size(self, session_id: str, user_id: str = None) -> int:
        """Get number of messages in session
        
        Args:
            session_id: Session ID
            user_id: Optional user_id for user-specific lookup
        """
        if not self.client:
            return 0
        
        try:
            # Use user-specific key if user_id provided
            if user_id:
                session_key = self.get_user_session_key(user_id, session_id)
            else:
                session_key = self.get_session_key(session_id)
            
            return self.client.zcard(session_key)
        except Exception as e:
            print(f"[Redis Error] Failed to get session size: {str(e)}")
            return 0
    
    def get_all_sessions(self) -> List[str]:
        """Get all active chat sessions"""
        if not self.client:
            return []
        
        try:
            pattern = "chat:session:*"
            keys = self.client.keys(pattern)
            # Extract session IDs from keys
            sessions = [key.replace("chat:session:", "") for key in keys]
            return sessions
        except Exception as e:
            print(f"[Redis Error] Failed to get sessions: {str(e)}")
            return []
    
    def get_session_info(self, session_id: str) -> dict:
        """Get session metadata"""
        if not self.client:
            return {}
        
        try:
            session_key = self.get_session_key(session_id)
            size = self.client.zcard(session_key)
            ttl = self.client.ttl(session_key)
            
            return {
                "session_id": session_id,
                "message_count": size,
                "ttl_seconds": ttl if ttl > 0 else None,
                "exists": size > 0
            }
        except Exception as e:
            print(f"[Redis Error] Failed to get session info: {str(e)}")
            return {}
    
    def is_connected(self) -> bool:
        """Check if Redis is connected"""
        if not self.client:
            return False
        
        try:
            self.client.ping()
            return True
        except:
            return False
    
    def get_user_sessions(self, user_id: str) -> List[str]:
        """Get all session IDs for a user
        
        Args:
            user_id: User ID
            
        Returns:
            List of session IDs associated with the user
        """
        if not self.client:
            return []
        
        try:
            user_sessions_key = self.get_user_sessions_key(user_id)
            sessions = self.client.smembers(user_sessions_key)
            return sorted(list(sessions), reverse=True)  # Most recent first
        except Exception as e:
            print(f"[Redis Error] Failed to get user sessions: {str(e)}")
            return []
    
    def get_user_full_history(self, user_id: str) -> dict:
        """Get full chat history for a user across all sessions
        
        Args:
            user_id: User ID
            
        Returns:
            Dict with all sessions and their messages, filtered by user_id
        """
        if not self.client:
            return {}
        
        try:
            sessions = self.get_user_sessions(user_id)
            user_history = {
                "user_id": user_id,
                "sessions": [],
                "total_sessions": len(sessions),
                "total_messages": 0
            }
            
            for session_id in sessions:
                # Pass user_id to get_session_history for security
                session_messages = self.get_session_history(session_id, user_id)
                
                if session_messages:
                    session_data = {
                        "session_id": session_id,
                        "message_count": len(session_messages),
                        "messages": session_messages
                    }
                    user_history["sessions"].append(session_data)
                    user_history["total_messages"] += len(session_messages)
            
            return user_history
        except Exception as e:
            print(f"[Redis Error] Failed to get user full history: {str(e)}")
            return {}
    
    def get_session_context(self, session_id: str, user_id: str, limit: int = 20) -> List[dict]:
        """Get recent messages from a session for context
        
        Args:
            session_id: Session ID
            user_id: User ID (REQUIRED for security validation)
            limit: Maximum number of recent messages to retrieve
            
        Returns:
            List of recent messages from this user only
        """
        if not self.client:
            return []
        
        try:
            # Use user-specific session key for security
            session_key = self.get_user_session_key(user_id, session_id)
            
            # Get the most recent 'limit' messages
            messages_json = self.client.zrange(session_key, -limit, -1)
            
            messages = []
            for msg_json in messages_json:
                try:
                    msg_dict = json.loads(msg_json)
                    # Verify user_id matches for security
                    if msg_dict.get("user_id") == user_id:
                        messages.append(msg_dict)
                except:
                    continue
            
            return messages
        except Exception as e:
            print(f"[Redis Error] Failed to get session context: {str(e)}")
            return []
    
    def clear_user_history(self, user_id: str) -> bool:
        """Clear all chat history for a user
        
        Args:
            user_id: User ID
            
        Returns:
            True if successful
        """
        if not self.client:
            return False
        
        try:
            # Get all sessions for user
            sessions = self.get_user_sessions(user_id)
            
            for session_id in sessions:
                self.clear_session(session_id)
            
            # Clear user sessions set
            user_sessions_key = self.get_user_sessions_key(user_id)
            self.client.delete(user_sessions_key)
            
            return True
        except Exception as e:
            print(f"[Redis Error] Failed to clear user history: {str(e)}")
            return False
            return True
        except:
            return False

# Global instance
_redis_service: Optional[RedisChatService] = None

def get_redis_service() -> RedisChatService:
    """Get or create Redis service instance"""
    global _redis_service
    if _redis_service is None:
        _redis_service = RedisChatService()
    return _redis_service

def set_redis_service(service: RedisChatService) -> None:
    """Set Redis service instance"""
    global _redis_service
    _redis_service = service
