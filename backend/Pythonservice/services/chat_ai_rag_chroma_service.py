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
        self.users_collection = None  # Only users collection now
        
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
    
    def _get_or_create_users_collection(self):
        """Lazy initialization của users collection"""
        if self.users_collection is None:
            self.users_collection = self.client.get_or_create_collection(
                name="chat_ai_users",
                metadata={"description": "User profile information for AI Chat"},
            )
        return self.users_collection
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
            collection = self._get_or_create_modal_config_collection()
            
            # Delete existing document first
            try:
                collection.delete(ids=[doc_id])
                print(f"[ChatAIRAGChromaService] Deleted existing modal config {modal_name}")
            except:
                pass  # Ignore if document doesn't exist
            
            config_data = {
                "modal_name": modal_name,
                "model": modal_config.get("model", ""),
                "temperature": modal_config.get("temperature", 0.7),
                "max_tokens": modal_config.get("max_tokens", 1000),
                "system_prompt": modal_config.get("system_prompt", ""),
                "timestamp": datetime.now().isoformat(),
                "is_active": modal_config.get("is_active", False)
            }
            
            collection.add(
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
        Retrieve product context dựa trên query với logic filtering thông minh
        
        Args:
            query: Câu query từ user
            top_k: Số lượng kết quả tối đa
            
        Returns:
            List of relevant products
        """
        # Kiểm tra category từ query
        category_keywords = {
            'điện thoại': ['điện thoại', 'phone', 'smartphone', 'mobile', 'dien thoai'],
            'laptop': ['laptop', 'laptop', 'computer', 'pc'],
            'tablet': ['tablet', 'ipad', 'tab'],
            'tai nghe': ['tai nghe', 'headphone', 'earphone', 'airpods'],
            'phụ kiện': ['phụ kiện', 'accessory', 'charger', 'case']
        }
        
        target_category = None
        query_lower = query.lower()
        for cat, keywords in category_keywords.items():
            if any(keyword in query_lower for keyword in keywords):
                target_category = cat
                break
        
        # Kiểm tra nếu query chứa từ khóa về giá
        price_keywords_low = ['giá rẻ', 'rẻ', 'cheap', 'budget', 'thấp', 'low price', 'affordable', 'giá mềm', 'gia re', 're']
        price_keywords_high = ['cao cấp', 'premium', 'high-end', 'flagship', 'đỉnh cao', 'xịn', 'mạnh']
        is_low_price = any(keyword in query_lower for keyword in price_keywords_low)
        is_high_price = any(keyword in query_lower for keyword in price_keywords_high)
        
        try:
            # Lấy nhiều kết quả hơn để có thể filter
            initial_results = self._get_or_create_product_collection().query(
                query_texts=[query],
                n_results=min(top_k * 4, 25)  # Lấy nhiều hơn để filter
            )
            
            if not initial_results or not initial_results["documents"] or len(initial_results["documents"]) == 0:
                return []
            
            # Parse và filter results
            candidates = []
            for i, doc in enumerate(initial_results["documents"][0]):
                metadata = initial_results["metadatas"][0][i] if initial_results["metadatas"] else {}
                distance = initial_results["distances"][0][i] if initial_results["distances"] else 0
                
                # Extract price và category
                price = self._extract_price_from_content(doc)
                category = self._extract_category_from_content(doc)
                
                candidates.append({
                    "product_id": metadata.get("product_id", ""),
                    "product_name": metadata.get("product_name", ""),
                    "content": doc,
                    "score": 1 - distance,
                    "price": price,
                    "category": category,
                    "metadata": metadata
                })
            
            # Filter theo category và giá
            if target_category:
                # Ưu tiên sản phẩm cùng category
                category_matches = [c for c in candidates if c["category"] == target_category]
                other_matches = [c for c in candidates if c["category"] != target_category]
                
                if is_low_price:
                    # Ưu tiên GIÁ THẤP hơn score - sort theo giá trước, score sau
                    category_matches.sort(key=lambda x: (x["price"] if x["price"] else 999999999, -x["score"]))
                    other_matches.sort(key=lambda x: (x["price"] if x["price"] else 999999999, -x["score"]))
                elif is_high_price:
                    # Sắp xếp theo giá giảm dần trong category phù hợp (ưu tiên sản phẩm đắt)
                    category_matches.sort(key=lambda x: (-(x["price"] if x["price"] else 0), -x["score"]))
                    other_matches.sort(key=lambda x: (-(x["price"] if x["price"] else 0), -x["score"]))
                else:
                    # Sắp xếp theo độ liên quan
                    category_matches.sort(key=lambda x: -x["score"])
                    other_matches.sort(key=lambda x: -x["score"])
                
                # Kết hợp: ưu tiên category phù hợp, sau đó category khác
                filtered_candidates = category_matches[:top_k] + other_matches[:max(0, top_k - len(category_matches))]
            else:
                # Không có category cụ thể
                if is_low_price:
                    candidates.sort(key=lambda x: (x["price"] if x["price"] else 999999999, -x["score"]))
                    filtered_candidates = candidates[:top_k]
                elif is_high_price:
                    candidates.sort(key=lambda x: (-(x["price"] if x["price"] else 0), -x["score"]))
                    filtered_candidates = candidates[:top_k]
                else:
                    candidates.sort(key=lambda x: -x["score"])
                    filtered_candidates = candidates[:top_k]
            
            return filtered_candidates
            
        except Exception as e:
            print(f"[ChatAIRAGChromaService] Error retrieving product context: {e}")
            return []
    
    def _extract_price_from_content(self, content: str) -> Optional[int]:
        """Extract price từ content text"""
        try:
            if "Giá:" in content:
                price_start = content.find("Giá:") + 4
                price_end = content.find("VNĐ", price_start)
                if price_end > price_start:
                    price_str = content[price_start:price_end].strip().replace(',', '').replace(' ', '')
                    return int(price_str)
        except:
            pass
        return None
    
    def _extract_category_from_content(self, content: str) -> str:
        """Extract category từ content text"""
        if "Danh mục:" in content:
            cat_start = content.find("Danh mục:") + 10
            cat_end = content.find("\n", cat_start)
            if cat_end > cat_start:
                category = content[cat_start:cat_end].strip().lower()
                # Normalize category
                if 'điện thoại' in category:
                    return 'điện thoại'
                elif 'laptop' in category:
                    return 'laptop'
                elif 'tablet' in category or 'tab' in category:
                    return 'tablet'
                elif 'tai nghe' in category or 'headphone' in category:
                    return 'tai nghe'
                elif 'phụ kiện' in category:
                    return 'phụ kiện'
                else:
                    return category
        return 'unknown'
    
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
        
        # Add product context with detailed information
        if product_context:
            context_text += "=== THÔNG TIN SẢN PHẨM LIÊN QUAN ===\n"
            for i, item in enumerate(product_context, 1):
                context_text += f"📱 SẢN PHẨM {i}: {item['product_name']} (Độ liên quan: {item['score']:.2f})\n"
                
                # Extract key information from content
                content = item['content']
                
                # Price
                if "Giá:" in content:
                    price_start = content.find("Giá:") + 4
                    price_end = content.find("VNĐ", price_start) + 3
                    if price_end > price_start:
                        price_info = content[price_start:price_end].strip()
                        context_text += f"💰 Giá: {price_info}\n"
                
                # Brand
                if "Thương hiệu:" in content:
                    brand_start = content.find("Thương hiệu:") + 12
                    brand_end = content.find("\n", brand_start)
                    if brand_end > brand_start:
                        brand = content[brand_start:brand_end].strip()
                        if brand and brand != "N/A":
                            context_text += f"🏷️ Thương hiệu: {brand}\n"
                
                # Stock quantity
                if "Số lượng tồn kho:" in content:
                    stock_start = content.find("Số lượng tồn kho:") + 18
                    stock_end = content.find("\n", stock_start)
                    if stock_end > stock_start:
                        stock = content[stock_start:stock_end].strip()
                        context_text += f"📦 Tồn kho: {stock} chiếc\n"
                
                # Specifications
                if "THÔNG SỐ KỸ THUẬT:" in content:
                    spec_start = content.find("THÔNG SỐ KỸ THUẬT:")
                    spec_end = content.find("\n\n", spec_start)
                    if spec_end == -1:
                        spec_end = len(content)
                    specs_section = content[spec_start:spec_end]
                    context_text += f"⚙️ {specs_section}\n"
                
                # Description
                if "Mô tả:" in content:
                    desc_start = content.find("Mô tả:") + 7
                    desc_end = content.find("\n", desc_start)
                    if desc_end > desc_start:
                        desc = content[desc_start:desc_end].strip()
                        if len(desc) > 100:
                            desc = desc[:100] + "..."
                        context_text += f"📝 Mô tả: {desc}\n"
                
                # Image URL for AI to use in markdown
                if "URL ảnh chính:" in content:
                    img_start = content.find("URL ảnh chính:") + 15
                    img_end = content.find("\n", img_start)
                    if img_end == -1:  # URL is at the end of content
                        img_end = len(content)
                    if img_end > img_start:
                        img_url = content[img_start:img_end].strip()
                        if img_url and img_url != "N/A":
                            context_text += f"🖼️ URL hình ảnh: {img_url}\n"
                
                context_text += "\n"
        
        # Add knowledge context
        if knowledge_context:
            context_text += "\n=== KIẾN THỨC LIÊN QUAN ===\n"
            for item in knowledge_context:
                context_text += f"📚 Kiến thức (Độ liên quan: {item['score']:.2f})\n"
                context_text += f"   {item['content'][:300]}...\n\n"
        
        return context_text if context_text else "Không tìm thấy thông tin liên quan."
    
    # === USER-SPECIFIC DATA METHODS ===
    
    def store_user_order(self, user_id: str, order_data: Dict[str, Any]) -> bool:
        """
        DEPRECATED: Order data is now stored in chat_ai_orders collection via Spring Service sync
        
        This method is kept for backward compatibility but no longer stores data.
        
        Args:
            user_id: ID của user
            order_data: Dữ liệu đơn hàng (deprecated)
            
        Returns:
            Always returns True for compatibility
        """
        print(f"[ChatAIRAGChromaService] store_user_order is deprecated. Order data comes from chat_ai_orders collection via Spring Service sync.")
        return True
    
    def store_user_data(self, user_id: str, user_data: Dict[str, Any]) -> bool:
        """
        DEPRECATED: User data is now stored in chat_ai_users collection via Spring Service sync
        
        This method is kept for backward compatibility but no longer stores data.
        
        Args:
            user_id: ID của user
            user_data: Thông tin user (deprecated)
            
        Returns:
            Always returns True for compatibility
        """
        print(f"[ChatAIRAGChromaService] store_user_data is deprecated. User data comes from chat_ai_users collection via Spring Service sync.")
        return True
    
    def retrieve_user_context(self, user_id: str, query: str, top_k_orders: int = 3, top_k_data: int = 1) -> str:
        """
        Retrieve user-specific context từ chat_ai_users và chat_ai_orders collections
        
        Args:
            user_id: ID của user từ JWT token (format: user_X)
            query: User query để tìm context relevant
            top_k_orders: Max orders to retrieve
            top_k_data: Max user data items (deprecated - now uses users collection)
            
        Returns:
            Formatted user context string với đầy đủ thông tin cá nhân
        """
        print(f"[ChatAIRAGChromaService] Retrieving user context for user_id: {user_id}")
        try:
            context_text = ""
            
            # 1. Retrieve user profile information từ chat_ai_users collection
            users_collection = self._get_or_create_users_collection()
            print(f"[ChatAIRAGChromaService] Users collection has {users_collection.count()} documents")
            
            # Extract numeric ID from user_id (e.g., 'user_5' -> '5')
            numeric_user_id = user_id.replace('user_', '') if user_id.startswith('user_') else user_id
            print(f"[ChatAIRAGChromaService] Numeric user ID: {numeric_user_id}")
            
            # Try to get user data by document ID first (most reliable)
            doc_id = f"user_{numeric_user_id}"
            print(f"[ChatAIRAGChromaService] Trying to get user document by ID: {doc_id}")
            try:
                user_doc = users_collection.get(ids=[doc_id])
                if user_doc and user_doc.get("documents") and len(user_doc["documents"]) > 0:
                    print(f"[ChatAIRAGChromaService] Found user document by ID")
                    users_results = user_doc
                else:
                    print(f"[ChatAIRAGChromaService] User document not found by ID, trying metadata filter")
                    users_results = users_collection.get(
                        where={"user_id": numeric_user_id}
                    )
                    print(f"[ChatAIRAGChromaService] Metadata filter results: {len(users_results.get('documents', []))} documents")
            except Exception as e:
                print(f"[ChatAIRAGChromaService] Error getting by ID: {e}, trying metadata filter")
                users_results = users_collection.get(
                    where={"user_id": numeric_user_id}
                )
            
            # If no results, fallback to query
            if not users_results or not users_results.get("documents"):
                print(f"[ChatAIRAGChromaService] No results from get(), trying query")
                users_results = users_collection.query(
                    query_texts=[f"user profile information"],
                    where={"user_id": numeric_user_id},
                    n_results=1
                )
                print(f"[ChatAIRAGChromaService] Query results: {len(users_results.get('documents', [[]])[0]) if users_results.get('documents') else 0} documents found")
            
            if users_results and users_results.get("documents") and len(users_results["documents"]) > 0:
                context_text += "=== THÔNG TIN CÁ NHÂN CỦA BẠN ===\n"
                # Handle both get() and query() result formats
                if isinstance(users_results["documents"][0], list):
                    # query() result format (nested)
                    doc = users_results["documents"][0][0]
                    metadata = users_results["metadatas"][0][0] if users_results.get("metadatas") else {}
                else:
                    # get() result format (flat)
                    doc = users_results["documents"][0]
                    metadata = users_results["metadatas"][0] if users_results.get("metadatas") else {}
                
                # Extract key information for better formatting
                name = metadata.get("username", "N/A")
                email = metadata.get("email", "N/A") 
                phone = metadata.get("phone_number", "N/A")
                address = metadata.get("address", "N/A")
                role = metadata.get("role", "N/A")
                account_status = metadata.get("account_status", "N/A")
                
                context_text += f"Tên: {name}\n"
                context_text += f"Email: {email}\n"
                context_text += f"Số điện thoại: {phone}\n"
                context_text += f"Địa chỉ: {address}\n"
                context_text += f"Vai trò: {role}\n"
                context_text += f"Trạng thái tài khoản: {account_status}\n\n"
                
                # Add full document for additional context
                context_text += f"Thông tin chi tiết:\n{doc}\n\n"
            
            # 2. Retrieve user orders từ chat_ai_orders collection (không phải user_orders)
            orders_collection = self.client.get_or_create_collection(
                name="chat_ai_orders",
                metadata={"description": "Order data for AI Chat RAG"}
            )
            
            # Query orders by customer_id (from user profile)
            customer_id = metadata.get("user_id")  # This is the numeric ID like "5"
            orders_results = orders_collection.query(
                query_texts=[query],
                where={"customer_id": customer_id},  # Query theo customer_id từ user profile
                n_results=top_k_orders
            )
            
            if orders_results and orders_results["documents"] and len(orders_results["documents"]) > 0:
                context_text += "=== LỊCH SỬ ĐƠN HÀNG CỦA BẠN ===\n"
                for i, doc in enumerate(orders_results["documents"][0]):
                    metadata_order = orders_results["metadatas"][0][i] if orders_results["metadatas"] else {}
                    
                    order_id = metadata_order.get('order_id', f'Order {i+1}')
                    status = metadata_order.get('status', 'Unknown')
                    total_amount = metadata_order.get('total_amount', 'N/A')
                    
                    context_text += f"Đơn hàng {order_id}:\n"
                    context_text += f"- Trạng thái: {status}\n"
                    context_text += f"- Tổng tiền: {total_amount}\n"
                    context_text += f"- Chi tiết: {doc[:200]}...\n\n"
            
            return context_text if context_text else "No user-specific context found."
            
        except Exception as e:
            print(f"[ChatAIRAGChromaService] Error retrieving user context: {e}")
            return "Error retrieving user context."
            
        except Exception as e:
            print(f"[ChatAIRAGChromaService] Error retrieving user context: {e}")
            return "Error retrieving user context."
    
    def retrieve_discount_context(self, query: str, top_k: int = 3) -> str:
        """
        Retrieve discount/promotion context từ chat_ai_discounts collection
        
        Args:
            query: User query để tìm discount relevant
            top_k: Max discounts to retrieve
            
        Returns:
            Formatted discount context string
        """
        try:
            discounts_collection = self.client.get_or_create_collection(
                name="chat_ai_discounts",
                metadata={"description": "Discount codes for AI Chat"}
            )
            
            results = discounts_collection.query(
                query_texts=[query],
                n_results=top_k
            )
            
            # Filter results manually for active discounts
            if results and results["documents"] and len(results["documents"]) > 0:
                filtered_docs = []
                filtered_metadatas = []
                filtered_distances = []
                
                for i, doc in enumerate(results["documents"][0]):
                    metadata = results["metadatas"][0][i] if results["metadatas"] else {}
                    
                    # Check if discount is active and valid
                    if (metadata.get("status") == "ACTIVE" and 
                        metadata.get("is_valid", True) and 
                        not metadata.get("is_expired", False)):
                        filtered_docs.append(doc)
                        filtered_metadatas.append(metadata)
                        filtered_distances.append(results["distances"][0][i] if results["distances"] else 0)
                
                # Replace with filtered results
                results["documents"] = [filtered_docs[:top_k]]
                results["metadatas"] = [filtered_metadatas[:top_k]]
                results["distances"] = [filtered_distances[:top_k]]
            
            if not results or not results["documents"] or len(results["documents"]) == 0:
                return ""
            
            context_text = "=== CHƯƠNG TRÌNH KHUYẾN MÃI HIỆN CÓ ===\n"
            
            for i, doc in enumerate(results["documents"][0]):
                metadata = results["metadatas"][0][i] if results["metadatas"] else {}
                score = results["distances"][0][i] if results["distances"] else 0
                
                discount_code = metadata.get("discount_code", "N/A")
                discount_value = metadata.get("discount_value", 0)
                discount_type = metadata.get("discount_type", "PERCENTAGE")
                min_order = metadata.get("min_order_value", 0)
                max_discount = metadata.get("max_discount_amount", 0)
                usage_limit = metadata.get("usage_limit", 0)
                used_count = metadata.get("used_count", 0)
                
                context_text += f"🎫 MÃ: {discount_code} (Độ liên quan: {1-score:.2f})\n"
                
                if discount_type == "PERCENTAGE":
                    context_text += f"   Giảm: {discount_value}%"
                    if max_discount > 0:
                        context_text += f" (tối đa {max_discount:,.0f} VNĐ)"
                else:
                    context_text += f"   Giảm: {discount_value:,.0f} VNĐ"
                
                context_text += f"\n   Đơn tối thiểu: {min_order:,.0f} VNĐ\n"
                context_text += f"   Còn lại: {usage_limit - used_count}/{usage_limit} lượt\n"
                
                # Extract description from document
                if "Mô tả:" in doc:
                    desc_start = doc.find("Mô tả:") + 7
                    desc_end = doc.find("\n", desc_start)
                    if desc_end > desc_start:
                        desc = doc[desc_start:desc_end].strip()
                        context_text += f"   Mô tả: {desc}\n"
                
                context_text += "\n"
            
            return context_text
            
        except Exception as e:
            print(f"[ChatAIRAGChromaService] Error retrieving discount context: {e}")
            return ""
    
    def retrieve_combined_context_with_user(self, user_id: str, query: str, 
                                          top_k_products: int = 3, 
                                          top_k_knowledge: int = 2,
                                          top_k_user: int = 2,
                                          top_k_discounts: int = 2) -> str:
        """
        Retrieve kết hợp tất cả context: products + knowledge + user data + discounts
        
        Args:
            user_id: User ID để lấy user-specific data
            query: User query
            top_k_products: Max products
            top_k_knowledge: Max knowledge items
            top_k_user: Max user-specific items
            top_k_discounts: Max discounts
            
        Returns:
            Formatted context string với bảo mật user data
        """
        # Get general context
        general_context = self.retrieve_combined_context(query, top_k_products, top_k_knowledge)
        
        # Get discount context
        discount_context = self.retrieve_discount_context(query, top_k_discounts)
        
        # Get user-specific context (bảo mật - chỉ data của user hiện tại)
        user_context = self.retrieve_user_context(user_id, query, top_k_user, 1)
        
        # Combine contexts
        full_context = general_context
        if discount_context:
            full_context += "\n\n" + discount_context
        if user_context and user_context != "No user-specific context found.":
            full_context += "\n\n" + user_context
        
        return full_context
    
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
                "users": self._get_or_create_users_collection().count() if self.users_collection else 0,
            }
            return stats
        except Exception as e:
            print(f"[ChatAIRAGChromaService] Error getting stats: {e}")
            return {}
    
    def _format_order_text(self, order: Dict[str, Any]) -> str:
        """Format order data thành text để embedding"""
        parts = []
        
        if "order_id" in order:
            parts.append(f"Order ID: {order['order_id']}")
        
        if "status" in order:
            parts.append(f"Status: {order['status']}")
        
        if "total_amount" in order:
            parts.append(f"Total: ${order['total_amount']}")
        
        if "created_at" in order:
            parts.append(f"Date: {order['created_at']}")
        
        if "items" in order and isinstance(order["items"], list):
            parts.append("Items:")
            for item in order["items"]:
                item_name = item.get("name", "Unknown")
                item_qty = item.get("quantity", 1)
                item_price = item.get("price", 0)
                parts.append(f"  - {item_name} (x{item_qty}) - ${item_price}")
        
        return "\n".join(parts)
    
    def _format_user_data_text(self, user_data: Dict[str, Any]) -> str:
        """Format user data thành text để embedding"""
        parts = []
        
        if "name" in user_data:
            parts.append(f"Name: {user_data['name']}")
        
        if "email" in user_data:
            parts.append(f"Email: {user_data['email']}")
        
        if "role" in user_data:
            parts.append(f"Role: {user_data['role']}")
        
        if "account_status" in user_data:
            parts.append(f"Account Status: {user_data['account_status']}")
        
        if "address" in user_data:
            parts.append(f"Address: {user_data['address']}")
        
        if "phone" in user_data or "phone_number" in user_data:
            phone = user_data.get('phone') or user_data.get('phone_number')
            if phone:
                parts.append(f"Phone: {phone}")
        
        if "user_id" in user_data:
            parts.append(f"User ID: {user_data['user_id']}")
        
        if "preferences" in user_data:
            prefs = user_data["preferences"]
            if isinstance(prefs, dict):
                parts.append("Preferences:")
                for key, value in prefs.items():
                    parts.append(f"  {key}: {value}")
        
        if "purchase_history" in user_data:
            history = user_data["purchase_history"]
            if isinstance(history, list):
                parts.append("Purchase History:")
                for item in history[:5]:  # Limit to 5 recent items
                    parts.append(f"  - {item}")
        
        if "full_info" in user_data:
            full_info = user_data["full_info"]
            if isinstance(full_info, dict):
                parts.append("Complete Information:")
                for key, value in full_info.items():
                    parts.append(f"  {key}: {value}")
        
        return "\n".join(parts)


# === SINGLETON INSTANCE ===
_chat_ai_rag_service: Optional[ChatAIRAGChromaService] = None

def get_chat_ai_rag_service() -> ChatAIRAGChromaService:
    """Get or create Chat AI RAG Chroma service"""
    global _chat_ai_rag_service
    if _chat_ai_rag_service is None:
        _chat_ai_rag_service = ChatAIRAGChromaService()
    return _chat_ai_rag_service
