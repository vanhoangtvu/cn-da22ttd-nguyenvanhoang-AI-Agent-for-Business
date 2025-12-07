"""
Chat History Service
Manages chat history stored in ChromaDB for context-aware AI responses
"""
import uuid
from typing import List, Dict, Optional, Any
from datetime import datetime
import json


class ChatHistoryService:
    def __init__(self, chroma_client):
        """
        Initialize Chat History Service
        
        Args:
            chroma_client: ChromaDB client instance
        """
        self.chroma_client = chroma_client
        self.collection_name = "chat_history"
        self._init_collection()
    
    def _init_collection(self):
        """Initialize or get the chat history collection"""
        self.collection = self.chroma_client.get_or_create_collection(
            name=self.collection_name,
            metadata={"description": "Chat history for context-aware AI responses"}
        )
    
    def save_message(
        self,
        session_id: str,
        role: str,  # 'user' or 'assistant'
        content: str,
        user_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Save a chat message to ChromaDB
        
        Args:
            session_id: Unique session/conversation ID
            role: 'user' or 'assistant'
            content: Message content
            user_id: Optional user ID for personalization
            metadata: Additional metadata
            
        Returns:
            Dictionary with message info
        """
        message_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        message_metadata = {
            "session_id": session_id,
            "role": role,
            "user_id": user_id or "anonymous",
            "timestamp": timestamp,
            "message_index": self._get_message_count(session_id)
        }
        
        if metadata:
            message_metadata.update(metadata)
        
        # Store message
        self.collection.add(
            documents=[content],
            metadatas=[message_metadata],
            ids=[message_id]
        )
        
        return {
            "id": message_id,
            "session_id": session_id,
            "role": role,
            "content": content,
            "timestamp": timestamp,
            "message": "Message saved successfully"
        }
    
    def _get_message_count(self, session_id: str) -> int:
        """Get the count of messages in a session"""
        try:
            results = self.collection.get(
                where={"session_id": session_id}
            )
            return len(results['ids']) if results['ids'] else 0
        except:
            return 0
    
    def get_session_history(
        self,
        session_id: str,
        limit: Optional[int] = 20
    ) -> List[Dict[str, Any]]:
        """
        Get chat history for a session
        
        Args:
            session_id: Session ID
            limit: Maximum number of messages to return
            
        Returns:
            List of messages ordered by timestamp
        """
        try:
            results = self.collection.get(
                where={"session_id": session_id},
                limit=limit if limit else 100
            )
            
            if not results['ids']:
                return []
            
            messages = []
            for i in range(len(results['ids'])):
                messages.append({
                    "id": results['ids'][i],
                    "content": results['documents'][i],
                    "role": results['metadatas'][i].get('role', 'user'),
                    "timestamp": results['metadatas'][i].get('timestamp', ''),
                    "message_index": results['metadatas'][i].get('message_index', 0)
                })
            
            # Sort by message_index
            messages.sort(key=lambda x: x['message_index'])
            
            return messages
        except Exception as e:
            print(f"Error getting session history: {e}")
            return []
    
    def get_context_for_ai(
        self,
        session_id: str,
        max_messages: int = 10
    ) -> str:
        """
        Get formatted chat history as context for AI
        
        Args:
            session_id: Session ID
            max_messages: Maximum number of recent messages to include
            
        Returns:
            Formatted string of chat history
        """
        messages = self.get_session_history(session_id, limit=max_messages * 2)
        
        if not messages:
            return ""
        
        # Get the last N messages
        recent_messages = messages[-max_messages:] if len(messages) > max_messages else messages
        
        # Format for AI context
        context_lines = ["=== LỊCH SỬ HỘI THOẠI GẦN ĐÂY ==="]
        for msg in recent_messages:
            role_label = "Người dùng" if msg['role'] == 'user' else "AI"
            context_lines.append(f"{role_label}: {msg['content']}")
        context_lines.append("=== KẾT THÚC LỊCH SỬ ===\n")
        
        return "\n".join(context_lines)
    
    def search_similar_conversations(
        self,
        query: str,
        user_id: Optional[str] = None,
        n_results: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Search for similar past conversations using semantic search
        
        Args:
            query: Search query
            user_id: Optional user ID to filter
            n_results: Number of results
            
        Returns:
            List of similar messages
        """
        try:
            where_filter = None
            if user_id:
                where_filter = {"user_id": user_id}
            
            results = self.collection.query(
                query_texts=[query],
                n_results=n_results,
                where=where_filter
            )
            
            if not results['ids'] or not results['ids'][0]:
                return []
            
            similar = []
            for i in range(len(results['ids'][0])):
                similar.append({
                    "id": results['ids'][0][i],
                    "content": results['documents'][0][i],
                    "role": results['metadatas'][0][i].get('role', 'user'),
                    "session_id": results['metadatas'][0][i].get('session_id', ''),
                    "distance": results['distances'][0][i] if results.get('distances') else None
                })
            
            return similar
        except Exception as e:
            print(f"Error searching similar conversations: {e}")
            return []
    
    def delete_session(self, session_id: str) -> Dict[str, Any]:
        """
        Delete all messages in a session
        
        Args:
            session_id: Session ID to delete
            
        Returns:
            Delete result
        """
        try:
            results = self.collection.get(
                where={"session_id": session_id}
            )
            
            if results['ids']:
                self.collection.delete(ids=results['ids'])
                return {
                    "session_id": session_id,
                    "deleted_count": len(results['ids']),
                    "message": "Session deleted successfully"
                }
            
            return {
                "session_id": session_id,
                "deleted_count": 0,
                "message": "No messages found for this session"
            }
        except Exception as e:
            raise Exception(f"Error deleting session: {e}")
    
    def get_user_sessions(
        self,
        user_id: str,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Get all sessions for a user
        
        Args:
            user_id: User ID
            limit: Maximum sessions to return
            
        Returns:
            List of session summaries
        """
        try:
            results = self.collection.get(
                where={"user_id": user_id}
            )
            
            if not results['ids']:
                return []
            
            # Group by session_id
            sessions = {}
            for i in range(len(results['ids'])):
                session_id = results['metadatas'][i].get('session_id', '')
                if session_id not in sessions:
                    sessions[session_id] = {
                        "session_id": session_id,
                        "message_count": 0,
                        "first_message": results['documents'][i][:100],
                        "last_timestamp": results['metadatas'][i].get('timestamp', '')
                    }
                sessions[session_id]["message_count"] += 1
                
                # Update last timestamp if newer
                current_ts = results['metadatas'][i].get('timestamp', '')
                if current_ts > sessions[session_id]["last_timestamp"]:
                    sessions[session_id]["last_timestamp"] = current_ts
            
            # Convert to list and sort by last_timestamp
            session_list = list(sessions.values())
            session_list.sort(key=lambda x: x['last_timestamp'], reverse=True)
            
            return session_list[:limit]
        except Exception as e:
            print(f"Error getting user sessions: {e}")
            return []
    
    def get_stats(self) -> Dict[str, Any]:
        """Get statistics about chat history"""
        try:
            all_data = self.collection.get()
            
            if not all_data['ids']:
                return {
                    "total_messages": 0,
                    "total_sessions": 0,
                    "total_users": 0,
                    "collection_name": self.collection_name
                }
            
            sessions = set()
            users = set()
            
            for metadata in all_data['metadatas']:
                sessions.add(metadata.get('session_id', ''))
                users.add(metadata.get('user_id', ''))
            
            return {
                "total_messages": len(all_data['ids']),
                "total_sessions": len(sessions),
                "total_users": len(users),
                "collection_name": self.collection_name
            }
        except Exception as e:
            return {
                "error": str(e),
                "collection_name": self.collection_name
            }

    def get_all_sessions(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get all chat sessions for admin management"""
        try:
            all_data = self.collection.get()
            
            if not all_data['ids']:
                return []
            
            sessions = {}
            for i, doc_id in enumerate(all_data['ids']):
                metadata = all_data['metadatas'][i]
                session_id = metadata.get('session_id', '')
                
                if session_id not in sessions:
                    sessions[session_id] = {
                        "session_id": session_id,
                        "user_id": metadata.get('user_id', 'anonymous'),
                        "message_count": 0,
                        "first_timestamp": metadata.get('timestamp', ''),
                        "last_timestamp": metadata.get('timestamp', ''),
                        "last_message": all_data['documents'][i][:100] if all_data['documents'][i] else ''
                    }
                
                sessions[session_id]["message_count"] += 1
                current_ts = metadata.get('timestamp', '')
                
                if current_ts < sessions[session_id]["first_timestamp"]:
                    sessions[session_id]["first_timestamp"] = current_ts
                if current_ts > sessions[session_id]["last_timestamp"]:
                    sessions[session_id]["last_timestamp"] = current_ts
                    sessions[session_id]["last_message"] = all_data['documents'][i][:100] if all_data['documents'][i] else ''
            
            session_list = list(sessions.values())
            session_list.sort(key=lambda x: x['last_timestamp'], reverse=True)
            
            return session_list[:limit]
        except Exception as e:
            print(f"Error getting all sessions: {e}")
            return []
