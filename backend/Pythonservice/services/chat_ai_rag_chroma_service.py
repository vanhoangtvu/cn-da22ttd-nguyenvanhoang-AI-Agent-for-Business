"""
Chroma DB Service for Chat AI RAG
Dùng riêng để lưu trữ product data, knowledge base cho AI Agent Chat
Session thì lưu ở Redis (đã có sẵn)
"""

import chromadb
from typing import Optional, List, Dict, Any
import os
from pathlib import Path
import json
from datetime import datetime

class ChatAIRAGChromaService:
    """
    Service quản lý Chroma DB cho Chat AI RAG
    - Lưu trữ product data, knowledge base
    - Retrieval context cho AI responses
    - Embedding và similarity search
    """
    
    def __init__(self, persist_dir: str = "./chroma_chat_ai"):
        """
        Khởi tạo Chroma DB service cho Chat AI
        
        Args:
            persist_dir: Thư mục lưu trữ Chroma DB
        """
        self.persist_dir = persist_dir
        
        # Tạo thư mục nếu chưa tồn tại
        Path(self.persist_dir).mkdir(parents=True, exist_ok=True)
        
        # Khởi tạo Chroma client với cấu hình mới
        # Sử dụng PersistentClient thay vì cách cũ
        try:
            self.client = chromadb.PersistentClient(path=self.persist_dir)
        except Exception as e:
            # Fallback to old API if PersistentClient not available
            print(f"Using legacy Chroma client: {e}")
            settings = chromadb.config.Settings(
                chroma_db_impl="duckdb+parquet",
                persist_directory=self.persist_dir,
                anonymized_telemetry=False,
                allow_reset=True,
            )
            self.client = chromadb.Client(settings)
        
        # Collections
        self.product_collection = None
        self.knowledge_collection = None
        self.context_collection = None
        self.modal_config_collection = None
        
        # Remove automatic initialization
        # self._initialize_collections()
    
    def _get_or_create_product_collection(self):
        """Lazy initialization của product collection"""
        if self.product_collection is None:
            self.product_collection = self.client.get_or_create_collection(
                name="chat_ai_products",
                metadata={"description": "Product data for AI Chat RAG"},
            )
        return self.product_collection
    
    def _get_or_create_knowledge_collection(self):
        """Lazy initialization của knowledge collection"""
        if self.knowledge_collection is None:
            self.knowledge_collection = self.client.get_or_create_collection(
                name="chat_ai_knowledge",
                metadata={"description": "Knowledge base for AI Chat"},
            )
        return self.knowledge_collection
    
    def _get_or_create_context_collection(self):
        """Lazy initialization của context collection"""
        if self.context_collection is None:
            self.context_collection = self.client.get_or_create_collection(
                name="chat_ai_context",
                metadata={"description": "Context data for Chat responses"},
            )
        return self.context_collection
    
    def _get_or_create_modal_config_collection(self):
        """Lazy initialization của modal config collection"""
        if self.modal_config_collection is None:
            self.modal_config_collection = self.client.get_or_create_collection(
                name="chat_ai_modal_config",
                metadata={"description": "Modal configuration for AI Chat"},
            )
        return self.modal_config_collection
        """Khởi tạo các collections cho Chat AI RAG"""
        try:
            # Collection cho product data
            self.product_collection = self.client.get_or_create_collection(
                name="chat_ai_products",
                metadata={"description": "Product data for AI Chat RAG"},
            )
            
            # Collection cho knowledge base
            self.knowledge_collection = self.client.get_or_create_collection(
                name="chat_ai_knowledge",
                metadata={"description": "Knowledge base for AI Chat"},
            )
            
            # Collection cho context retrieval
            self.context_collection = self.client.get_or_create_collection(
                name="chat_ai_context",
                metadata={"description": "Context data for Chat responses"},
            )
            
            print("[ChatAIRAGChromaService] Collections initialized successfully")
        except Exception as e:
            print(f"[ChatAIRAGChromaService] Error initializing collections: {e}")
            raise
    
    # === PRODUCT DATA OPERATIONS ===
    
    def add_product(self, product_id: int, product_data: Dict[str, Any]) -> bool:
        """
        Thêm product vào Chroma
        
        Args:
            product_id: ID của product
            product_data: Dữ liệu product (name, price, description, etc.)
            
        Returns:
            True nếu thành công
        """
        try:
            doc_id = f"product_{product_id}"
            
            # Tạo text để embedding từ product data
            text_content = self._format_product_text(product_data)
            
            self._get_or_create_product_collection().add(
                ids=[doc_id],
                documents=[text_content],
                metadatas=[{
                    "product_id": str(product_id),
                    "product_name": product_data.get("name", ""),
                    "price": str(product_data.get("price", 0)),
                    "category": product_data.get("category", ""),
                    "timestamp": datetime.now().isoformat(),
                }]
            )
            
            print(f"[ChatAIRAGChromaService] Product {product_id} added successfully")
            return True
        except Exception as e:
            print(f"[ChatAIRAGChromaService] Error adding product {product_id}: {e}")
            return False
    
    def delete_product(self, product_id: int) -> bool:
        """Xóa product khỏi Chroma"""
        try:
            doc_id = f"product_{product_id}"
            self._get_or_create_product_collection().delete(ids=[doc_id])
            print(f"[ChatAIRAGChromaService] Product {product_id} deleted")
            return True
        except Exception as e:
            print(f"[ChatAIRAGChromaService] Error deleting product {product_id}: {e}")
            return False
    
    def add_products_batch(self, products: List[Dict[str, Any]]) -> int:
        """
        Thêm nhiều products cùng lúc
        
        Args:
            products: List of product dicts
            
        Returns:
            Số lượng products added thành công
        """
        success_count = 0
        for product in products:
            if self.add_product(product.get("id"), product):
                success_count += 1
        return success_count
    
    # === KNOWLEDGE BASE OPERATIONS ===
    
    def add_knowledge(self, knowledge_id: str, content: str, metadata: Dict = None) -> bool:
        """
        Thêm knowledge base content
        
        Args:
            knowledge_id: ID của knowledge item
            content: Nội dung knowledge
            metadata: Meta data
            
        Returns:
            True nếu thành công
        """
        try:
            doc_id = f"knowledge_{knowledge_id}"
            
            meta = metadata or {}
            meta["timestamp"] = datetime.now().isoformat()
            meta["knowledge_id"] = knowledge_id
            
            self._get_or_create_knowledge_collection().add(
                ids=[doc_id],
                documents=[content],
                metadatas=[meta]
            )
            
            print(f"[ChatAIRAGChromaService] Knowledge {knowledge_id} added")
            return True
        except Exception as e:
            print(f"[ChatAIRAGChromaService] Error adding knowledge: {e}")
            return False
    
    def delete_knowledge(self, knowledge_id: str) -> bool:
        """Xóa knowledge"""
        try:
            doc_id = f"knowledge_{knowledge_id}"
            self._get_or_create_knowledge_collection().delete(ids=[doc_id])
            return True
        except Exception as e:
            print(f"[ChatAIRAGChromaService] Error deleting knowledge: {e}")
            return False
    
    # === MODAL CONFIG OPERATIONS ===
    
    def set_modal_config(self, modal_name: str, modal_config: Dict[str, Any]) -> bool:
        """
        Lưu config modal cho chat AI
        
        Args:
            modal_name: Tên modal (vd: 'gpt-4', 'claude-3', etc.)
            modal_config: Config của modal
            
        Returns:
            True nếu thành công
        """
        try:
            doc_id = f"modal_config_{modal_name}"
            
            config_data = {
                "modal_name": modal_name,
                "model": modal_config.get("model", ""),
                "temperature": modal_config.get("temperature", 0.7),
                "max_tokens": modal_config.get("max_tokens", 1000),
                "system_prompt": modal_config.get("system_prompt", ""),
                "timestamp": datetime.now().isoformat(),
                "is_active": modal_config.get("is_active", False)
            }
            
            self._get_or_create_modal_config_collection().add(
                ids=[doc_id],
                documents=[f"Modal config for {modal_name}: {json.dumps(modal_config)}"],
                metadatas=[config_data]
            )
            
            print(f"[ChatAIRAGChromaService] Modal config {modal_name} saved")
            return True
        except Exception as e:
            print(f"[ChatAIRAGChromaService] Error saving modal config {modal_name}: {e}")
            return False
    
    def get_active_modal_config(self) -> Optional[Dict[str, Any]]:
        """
        Lấy modal config đang active
        
        Returns:
            Modal config hoặc None nếu không có
        """
        try:
            results = self._get_or_create_modal_config_collection().query(
                query_texts=["active modal config"],
                where={"is_active": True},
                n_results=1
            )
            
            if results and results["documents"] and len(results["documents"]) > 0:
                metadata = results["metadatas"][0][0] if results["metadatas"] else {}
                return {
                    "modal_name": metadata.get("modal_name", "Default Config"),
                    "model": metadata.get("model", "openai/gpt-oss-20b"),
                    "temperature": metadata.get("temperature", 0.7),
                    "max_tokens": metadata.get("max_tokens", 1000),
                    "system_prompt": metadata.get("system_prompt", ""),
                    "is_active": metadata.get("is_active", False)
                }
            return None
        except Exception as e:
            print(f"[ChatAIRAGChromaService] Error getting active modal config: {e}")
            return None
    
    def get_all_modal_configs(self) -> List[Dict[str, Any]]:
        """
        Lấy tất cả modal configs
        
        Returns:
            List of modal configs
        """
        try:
            results = self._get_or_create_modal_config_collection().query(
                query_texts=["modal config"],
                n_results=100
            )
            
            configs = []
            if results and results["metadatas"]:
                for metadata in results["metadatas"][0]:
                    configs.append({
                        "modal_name": metadata.get("modal_name"),
                        "model": metadata.get("model", ""),
                        "temperature": metadata.get("temperature", 0.7),
                        "max_tokens": metadata.get("max_tokens", 1000),
                        "system_prompt": metadata.get("system_prompt", ""),
                        "timestamp": metadata.get("timestamp"),
                        "is_active": metadata.get("is_active", False)
                    })
            return configs
        except Exception as e:
            print(f"[ChatAIRAGChromaService] Error getting all modal configs: {e}")
            return []
    
    def delete_modal_config(self, modal_name: str) -> bool:
        """Xóa modal config"""
        try:
            doc_id = f"modal_config_{modal_name}"
            self._get_or_create_modal_config_collection().delete(ids=[doc_id])
            print(f"[ChatAIRAGChromaService] Modal config {modal_name} deleted")
            return True
        except Exception as e:
            print(f"[ChatAIRAGChromaService] Error deleting modal config {modal_name}: {e}")
            return False
    
    def retrieve_product_context(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Retrieve product context dựa trên query
        
        Args:
            query: Câu query từ user
            top_k: Số lượng kết quả tối đa
            
        Returns:
            List of relevant products
        """
        try:
            results = self._get_or_create_product_collection().query(
                query_texts=[query],
                n_results=top_k
            )
            
            if not results or not results["documents"] or len(results["documents"]) == 0:
                return []
            
            # Format results
            context = []
            for i, doc in enumerate(results["documents"][0]):
                metadata = results["metadatas"][0][i] if results["metadatas"] else {}
                distance = results["distances"][0][i] if results["distances"] else 0
                
                context.append({
                    "product_id": metadata.get("product_id", ""),
                    "product_name": metadata.get("product_name", ""),
                    "content": doc,
                    "score": 1 - distance,  # Convert distance to similarity score
                    "metadata": metadata
                })
            
            return context
        except Exception as e:
            print(f"[ChatAIRAGChromaService] Error retrieving product context: {e}")
            return []
    
    def retrieve_knowledge_context(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        Retrieve knowledge base context
        
        Args:
            query: Query string
            top_k: Max results
            
        Returns:
            List of relevant knowledge items
        """
        try:
            results = self._get_or_create_knowledge_collection().query(
                query_texts=[query],
                n_results=top_k
            )
            
            if not results or not results["documents"] or len(results["documents"]) == 0:
                return []
            
            context = []
            for i, doc in enumerate(results["documents"][0]):
                metadata = results["metadatas"][0][i] if results["metadatas"] else {}
                distance = results["distances"][0][i] if results["distances"] else 0
                
                context.append({
                    "knowledge_id": metadata.get("knowledge_id", ""),
                    "content": doc,
                    "score": 1 - distance,
                    "metadata": metadata
                })
            
            return context
        except Exception as e:
            print(f"[ChatAIRAGChromaService] Error retrieving knowledge context: {e}")
            return []
    
    def retrieve_combined_context(self, query: str, top_k_products: int = 3, top_k_knowledge: int = 2) -> str:
        """
        Retrieve kết hợp product + knowledge context để dùng cho AI response
        
        Args:
            query: User query
            top_k_products: Max products
            top_k_knowledge: Max knowledge items
            
        Returns:
            Formatted context string
        """
        product_context = self.retrieve_product_context(query, top_k_products)
        knowledge_context = self.retrieve_knowledge_context(query, top_k_knowledge)
        
        context_text = ""
        
        # Add product context
        if product_context:
            context_text += "=== RELATED PRODUCTS ===\n"
            for item in product_context:
                context_text += f"- {item['product_name']} (Score: {item['score']:.2f})\n"
                context_text += f"  {item['content'][:200]}...\n\n"
        
        # Add knowledge context
        if knowledge_context:
            context_text += "\n=== RELEVANT KNOWLEDGE ===\n"
            for item in knowledge_context:
                context_text += f"- Knowledge (Score: {item['score']:.2f})\n"
                context_text += f"  {item['content'][:200]}...\n\n"
        
        return context_text if context_text else "No relevant context found."
    
    # === UTILITY METHODS ===
    
    def _format_product_text(self, product: Dict[str, Any]) -> str:
        """Format product data thành text để embedding"""
        parts = []
        
        if "name" in product:
            parts.append(f"Product: {product['name']}")
        
        if "description" in product:
            parts.append(f"Description: {product['description']}")
        
        if "category" in product:
            parts.append(f"Category: {product['category']}")
        
        if "price" in product:
            parts.append(f"Price: {product['price']}")
        
        if "tags" in product:
            parts.append(f"Tags: {', '.join(product['tags'])}")
        
        return "\n".join(parts)
    
    def clear_all_collections(self) -> bool:
        """Clear toàn bộ collections (cẩn thận!)"""
        try:
            self.client.reset()
            self._initialize_collections()
            print("[ChatAIRAGChromaService] All collections cleared and reinitialized")
            return True
        except Exception as e:
            print(f"[ChatAIRAGChromaService] Error clearing collections: {e}")
            return False
    
    def get_collection_stats(self) -> Dict[str, int]:
        """Lấy thống kê collections"""
        try:
            stats = {
                "products": self._get_or_create_product_collection().count() if self.product_collection else 0,
                "knowledge": self._get_or_create_knowledge_collection().count() if self.knowledge_collection else 0,
                "context": self._get_or_create_context_collection().count() if self.context_collection else 0,
                "modal_configs": self._get_or_create_modal_config_collection().count() if self.modal_config_collection else 0,
            }
            return stats
        except Exception as e:
            print(f"[ChatAIRAGChromaService] Error getting stats: {e}")
            return {}


# === SINGLETON INSTANCE ===
_chat_ai_rag_service: Optional[ChatAIRAGChromaService] = None

def get_chat_ai_rag_service() -> ChatAIRAGChromaService:
    """Get or create Chat AI RAG Chroma service"""
    global _chat_ai_rag_service
    if _chat_ai_rag_service is None:
        _chat_ai_rag_service = ChatAIRAGChromaService()
    return _chat_ai_rag_service
