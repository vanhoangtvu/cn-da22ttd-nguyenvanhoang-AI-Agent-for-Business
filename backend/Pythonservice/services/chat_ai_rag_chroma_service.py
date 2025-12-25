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
        self.carts_collection = None  # Cart data collection
        
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
    
    def _get_or_create_carts_collection(self):
        """Lazy initialization của carts collection"""
        if self.carts_collection is None:
            self.carts_collection = self.client.get_or_create_collection(
                name="chat_ai_carts",
                metadata={"description": "Cart data for AI Chat context"},
            )
        return self.carts_collection
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
                    "status": product_data.get("status", "ACTIVE"),
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
    
    def get_all_products_for_ai(self, query: str = "") -> str:
        """
        Lấy TOÀN BỘ sản phẩm từ ChromaDB với đề xuất thông minh
        
        Features:
        - Detect mục đích sử dụng (gaming, văn phòng, chụp ảnh...)
        - Detect khoảng giá
        - Highlight sản phẩm nổi bật cho mỗi category
        - Gợi ý thông minh dựa trên query
        
        Args:
            query: Query từ user
            
        Returns:
            Formatted string với đề xuất thông minh
        """
        try:
            collection = self._get_or_create_product_collection()
            total_count = collection.count()
            
            if total_count == 0:
                return "Hiện tại shop chưa có sản phẩm nào."
            
            print(f"[ChatAIRAGChromaService] Getting ALL {total_count} products for AI with smart recommendations")
            
            # Lấy TẤT CẢ sản phẩm từ collection
            all_results = collection.get(
                limit=total_count,
                include=["documents", "metadatas"]
            )
            
            if not all_results or not all_results.get("documents"):
                return "Không thể lấy dữ liệu sản phẩm."
            
            # Parse và tổ chức sản phẩm theo category
            products_by_category = {}
            all_products = []
            
            for i, doc in enumerate(all_results["documents"]):
                metadata = all_results["metadatas"][i] if all_results.get("metadatas") else {}
                
                # Extract thông tin
                price = self._extract_price_from_content(doc)
                category = self._extract_category_from_content(doc)
                product_name = metadata.get("product_name", f"Sản phẩm {i+1}")
                
                # Extract thêm thông tin cho đề xuất thông minh
                brand = self._extract_field_from_content(doc, "Thương hiệu:")
                stock = self._extract_field_from_content(doc, "Số lượng tồn kho:")
                img_url = self._extract_field_from_content(doc, "URL ảnh chính:")
                
                product_info = {
                    "id": metadata.get("product_id", ""),
                    "name": product_name,
                    "price": price,
                    "category": category,
                    "brand": brand,
                    "stock": int(stock) if stock and stock.isdigit() else 0,
                    "img_url": img_url,
                    "status": metadata.get("status", "ACTIVE"),
                    "content": doc
                }
                
                all_products.append(product_info)
                
                # Tổ chức theo category
                if category not in products_by_category:
                    products_by_category[category] = []
                products_by_category[category].append(product_info)
            
            # === FILTER CHỈ LẤY SẢN PHẨM ACTIVE ===
            # Lọc bỏ sản phẩm không hoạt động trước khi đề xuất
            active_products = []
            active_by_category = {}
            for p in all_products:
                status = p.get('status', 'ACTIVE')
                if status == 'ACTIVE' or status == '':
                    active_products.append(p)
                    cat = p.get('category', 'Khác')
                    if cat not in active_by_category:
                        active_by_category[cat] = []
                    active_by_category[cat].append(p)
            
            all_products = active_products
            products_by_category = active_by_category
            print(f"[ChatAIRAGChromaService] Filtered to {len(all_products)} ACTIVE products")
            
            # === FILTER GAMING LAPTOPS ===
            is_gaming_query = any(kw in query.lower() for kw in [
                'gaming', 'game', 'choi game', 'chơi game', 'rog', 'legion'
            ])
            if is_gaming_query and 'laptop' in query.lower():
                # Filter for gaming laptops only
                gaming_laptops = [
                    p for p in all_products
                    if 'laptop' in (p.get('category') or '').lower() and
                       any(gaming_kw in (p.get('name') or '').lower() for gaming_kw in ['rog', 'legion', 'gaming', 'tuf'])
                ]
                if gaming_laptops:
                    all_products = gaming_laptops
                    # Update category dict
                    products_by_category = {'Laptop': gaming_laptops}
                    print(f"[ChatAIRAGChromaService] Gaming filter applied: {len(gaming_laptops)} gaming laptops")
            
            # === PHÂN TÍCH QUERY THÔNG MINH ===
            query_lower = query.lower()
            
            # 1. Detect mục đích sử dụng
            purpose_keywords = {
                'gaming': ['gaming', 'game', 'chơi game', 'fps', 'pubg', 'lol', 'liên quân'],
                'văn phòng': ['văn phòng', 'làm việc', 'office', 'word', 'excel', 'công việc'],
                'chụp ảnh': ['chụp ảnh', 'camera', 'photography', 'quay phim', 'selfie', 'chụp hình'],
                'học tập': ['học tập', 'sinh viên', 'học sinh', 'học online', 'học trực tuyến'],
                'giải trí': ['giải trí', 'xem phim', 'nghe nhạc', 'youtube', 'netflix', 'tiktok']
            }
            
            detected_purpose = None
            for purpose, keywords in purpose_keywords.items():
                if any(kw in query_lower for kw in keywords):
                    detected_purpose = purpose
                    break
            
            # 2. Detect yêu cầu về giá
            is_low_price = any(kw in query_lower for kw in ['giá rẻ', 'rẻ', 'cheap', 'budget', 'thấp', 'tiết kiệm', 'sinh viên'])
            is_high_price = any(kw in query_lower for kw in ['cao cấp', 'premium', 'flagship', 'đắt', 'xịn', 'tốt nhất', 'pro', 'ultra'])
            is_mid_price = any(kw in query_lower for kw in ['tầm trung', 'vừa phải', 'không quá đắt', 'mid-range'])
            
            # 3. Detect khoảng giá cụ thể
            price_range = None
            if 'dưới 5 triệu' in query_lower or 'duoi 5 trieu' in query_lower:
                price_range = (0, 5000000)
            elif 'dưới 10 triệu' in query_lower or 'duoi 10 trieu' in query_lower:
                price_range = (0, 10000000)
            elif 'dưới 15 triệu' in query_lower or 'duoi 15 trieu' in query_lower:
                price_range = (0, 15000000)
            elif 'dưới 20 triệu' in query_lower or 'duoi 20 trieu' in query_lower:
                price_range = (0, 20000000)
            elif '10 đến 20 triệu' in query_lower or '10-20 triệu' in query_lower:
                price_range = (10000000, 20000000)
            elif '20 đến 30 triệu' in query_lower or '20-30 triệu' in query_lower:
                price_range = (20000000, 30000000)
            elif 'trên 30 triệu' in query_lower or 'tren 30 trieu' in query_lower:
                price_range = (30000000, 999999999)
            
            # 4. Detect category từ query
            target_category = None
            category_keywords = {
                'điện thoại': ['điện thoại', 'phone', 'smartphone', 'mobile', 'dien thoai', 'iphone', 'samsung', 'xiaomi'],
                'laptop': ['laptop', 'máy tính', 'notebook', 'macbook', 'pc'],
                'tai nghe': ['tai nghe', 'headphone', 'earphone', 'airpods', 'earbuds'],
                'đồng hồ thông minh': ['đồng hồ', 'smartwatch', 'apple watch', 'galaxy watch']
            }
            
            for cat, keywords in category_keywords.items():
                if any(kw in query_lower for kw in keywords):
                    target_category = cat
                    break
            
            # 5. Detect SẢN PHẨM/THƯƠNG HIỆU CỤ THỂ từ query
            specific_product_keywords = {
                # Apple ecosystem - phải đặt trước để ưu tiên
                'apple': ['apple', 'táo', 'hệ sinh thái apple'],
                # Laptop brands/products
                'macbook': ['macbook', 'mac book'],
                'dell': ['dell', 'xps'],
                'hp': ['hp ', 'hp pavilion', 'hp probook'],
                'lenovo': ['lenovo', 'thinkpad', 'ideapad', 'legion'],
                'asus': ['asus', 'vivobook', 'zenbook', 'rog'],
                'acer': ['acer', 'aspire', 'swift'],
                # Phone brands/products
                'iphone': ['iphone', 'ip '],
                'samsung': ['samsung', 'galaxy'],
                'xiaomi': ['xiaomi', 'redmi', 'poco', 'mi '],
                'oppo': ['oppo', 'find x'],
                'vivo': ['vivo'],
                'realme': ['realme'],
                'oneplus': ['oneplus', 'one plus'],
                'google': ['google', 'pixel'],
                'nothing': ['nothing phone'],
                # Headphones
                'airpods': ['airpods', 'air pods'],
                'sony headphone': ['sony wf', 'sony wh', 'xm4', 'xm5'],
                'bose': ['bose', 'quietcomfort'],
                'jabra': ['jabra'],
                'jbl': ['jbl'],
                'edifier': ['edifier'],
                'anker': ['anker', 'soundcore'],
                'sennheiser': ['sennheiser'],
                # Smartwatch
                'apple watch': ['apple watch', 'iwatch'],
            }
            
            detected_specific_product = None
            for product_name, keywords in specific_product_keywords.items():
                if any(kw in query_lower for kw in keywords):
                    detected_specific_product = product_name
                    break
            
            # Detect comparison query (so sánh nhiều sản phẩm)
            is_comparison = any(kw in query_lower for kw in [
                'so sánh', 'so sanh', 'so với', 'so voi', 'với', 'voi', 
                'hay', 'hoặc', 'hoac', 'vs', 'versus', 'compare'
            ])
            
            # Filter sản phẩm theo sản phẩm/thương hiệu cụ thể
            # SKIP nếu là comparison query để trả về tất cả products liên quan
            if detected_specific_product and not is_comparison:
                keywords_to_match = specific_product_keywords[detected_specific_product]
                filtered_products = []
                for prod in all_products:
                    product_name_lower = prod['name'].lower()
                    brand_lower = (prod['brand'] or '').lower()
                    # Kiểm tra tên sản phẩm hoặc thương hiệu có match không
                    if any(kw in product_name_lower or kw in brand_lower for kw in keywords_to_match):
                        filtered_products.append(prod)
                
                if filtered_products:
                    # Tạo products_by_category mới chỉ chứa sản phẩm matching
                    products_by_category = {}
                    for prod in filtered_products:
                        cat = prod['category']
                        if cat not in products_by_category:
                            products_by_category[cat] = []
                        products_by_category[cat].append(prod)
                    
                    all_products = filtered_products
                    total_count = len(filtered_products)
                    print(f"[ChatAIRAGChromaService] Filtered to {total_count} products matching '{detected_specific_product}'")
            
            # === FORMAT OUTPUT VỚI ĐỀ XUẤT THÔNG MINH ===
            context_text = f"=== TOÀN BỘ SẢN PHẨM CỦA SHOP ({total_count} sản phẩm) ===\n\n"
            
            # Phân tích yêu cầu của khách hàng
            context_text += "🎯 PHÂN TÍCH YÊU CẦU KHÁCH HÀNG:\n"
            if detected_specific_product:
                context_text += f"  • ⭐ SẢN PHẨM CỤ THỂ: {detected_specific_product.upper()} ({total_count} sản phẩm tìm thấy)\n"
            if target_category:
                context_text += f"  • Danh mục quan tâm: {target_category.upper()}\n"
            if detected_purpose:
                context_text += f"  • Mục đích sử dụng: {detected_purpose.upper()}\n"
            if is_low_price:
                context_text += f"  • Ngân sách: GIÁ RẺ / TIẾT KIỆM\n"
            elif is_high_price:
                context_text += f"  • Ngân sách: CAO CẤP / PREMIUM\n"
            elif is_mid_price:
                context_text += f"  • Ngân sách: TẦM TRUNG\n"
            if price_range:
                context_text += f"  • Khoảng giá: {price_range[0]:,} - {price_range[1]:,} VNĐ\n"
            context_text += "\n"
            
            # Thống kê theo category với sản phẩm nổi bật
            context_text += "📊 THỐNG KÊ VÀ ĐỀ XUẤT THEO DANH MỤC:\n\n"
            
            for cat, prods in products_by_category.items():
                prices = [p['price'] for p in prods if p['price']]
                if not prices:
                    continue
                
                min_price = min(prices)
                max_price = max(prices)
                avg_price = sum(prices) // len(prices)
                
                # Tìm sản phẩm nổi bật cho category này
                cheapest = min(prods, key=lambda x: x['price'] if x['price'] else 999999999)
                most_expensive = max(prods, key=lambda x: x['price'] if x['price'] else 0)
                best_stock = max(prods, key=lambda x: x['stock'] if x['stock'] else 0)
                
                context_text += f"━━━ {cat.upper()} ({len(prods)} sản phẩm) ━━━\n"
                context_text += f"💰 Giá: {min_price:,} - {max_price:,} VNĐ (TB: {avg_price:,} VNĐ)\n"
                context_text += f"⭐ RẺ NHẤT: {cheapest['name']} - {cheapest['price']:,} VNĐ\n"
                context_text += f"👑 CAO CẤP NHẤT: {most_expensive['name']} - {most_expensive['price']:,} VNĐ\n"
                if best_stock['stock'] > 0:
                    context_text += f"📦 TỒN KHO NHIỀU: {best_stock['name']} ({best_stock['stock']} chiếc)\n"
                context_text += "\n"
            
            # Filter sản phẩm theo yêu cầu
            def filter_products(prods):
                filtered = prods.copy()
                
                # Filter theo price range
                if price_range:
                    filtered = [p for p in filtered if p['price'] and price_range[0] <= p['price'] <= price_range[1]]
                
                # Sort theo yêu cầu
                if is_low_price:
                    filtered.sort(key=lambda x: x['price'] if x['price'] else 999999999)
                elif is_high_price:
                    filtered.sort(key=lambda x: -(x['price'] if x['price'] else 0))
                else:
                    # Mặc định sort theo tồn kho (phổ biến)
                    filtered.sort(key=lambda x: -x['stock'])
                
                return filtered
            
            # Chi tiết sản phẩm theo category
            context_text += "\n📱 CHI TIẾT TẤT CẢ SẢN PHẨM:\n"
            
            # Nếu có target_category, ưu tiên hiển thị category đó trước
            categories_order = list(products_by_category.keys())
            if target_category and target_category in categories_order:
                categories_order.remove(target_category)
                categories_order.insert(0, target_category)
            
            for cat in categories_order:
                prods = products_by_category[cat]
                filtered_prods = filter_products(prods)
                
                is_target = cat == target_category
                highlight = "⭐" if is_target else ""
                
                context_text += f"\n{highlight}━━━ {cat.upper()} ({len(filtered_prods)} sản phẩm) ━━━{highlight}\n"
                
                for idx, prod in enumerate(filtered_prods, 1):
                    price_str = f"{prod['price']:,}" if prod['price'] else "?"
                    
                    # Đánh dấu sản phẩm đặc biệt (rút gọn tags)
                    tags = []
                    if prod == min(prods, key=lambda x: x['price'] if x['price'] else 999999999):
                        tags.append("💰RẺ NHẤT")
                    if prod == max(prods, key=lambda x: x['price'] if x['price'] else 0):
                        tags.append("👑CAO CẤP")
                    
                    tag_str = f" [{', '.join(tags)}]" if tags else ""
                    brand_str = f" | {prod['brand']}" if prod['brand'] and prod['brand'] != "N/A" else ""
                    stock_str = f" | SL:{prod['stock']}" if prod['stock'] else ""
                    
                    # Format compact: số. Tên - Giá [tags] | Brand | Stock
                    context_text += f"{idx}. {prod['name']} - {price_str} VNĐ{tag_str}{brand_str}{stock_str}\n"
                    
                    # Hiển thị ảnh cho TẤT CẢ sản phẩm
                    if prod['img_url'] and prod['img_url'] != "N/A":
                        context_text += f"   🖼️ {prod['img_url']}\n"
            
            # Gợi ý thông minh cho AI
            context_text += "\n\n🤖 HƯỚNG DẪN TƯ VẤN CHO AI:\n"
            context_text += f"📌 Tổng: {total_count} sản phẩm trong {len(products_by_category)} danh mục\n"
            
            if target_category:
                target_prods = products_by_category.get(target_category, [])
                context_text += f"📌 Khách đang tìm {target_category.upper()}: {len(target_prods)} sản phẩm\n"
            
            if detected_purpose:
                context_text += f"📌 Mục đích: {detected_purpose} - Hãy đề xuất sản phẩm phù hợp với nhu cầu này\n"
            
            if is_low_price:
                context_text += "📌 Khách muốn GIÁ RẺ → Ưu tiên đề xuất sản phẩm có giá THẤP NHẤT trong danh mục\n"
            elif is_high_price:
                context_text += "📌 Khách muốn CAO CẤP → Ưu tiên đề xuất sản phẩm PREMIUM, flagship\n"
            elif is_mid_price:
                context_text += "📌 Khách muốn TẦM TRUNG → Đề xuất sản phẩm cân bằng giá-hiệu năng\n"
            
            if price_range:
                # Đếm sản phẩm trong khoảng giá
                in_range = [p for p in all_products if p['price'] and price_range[0] <= p['price'] <= price_range[1]]
                context_text += f"📌 Trong khoảng giá {price_range[0]:,}-{price_range[1]:,}: {len(in_range)} sản phẩm phù hợp\n"
            
            context_text += "\n📌 Luôn so sánh 2-3 sản phẩm, nêu ưu/nhược điểm, và đưa ra đề xuất cuối cùng!"
            
            print(f"[ChatAIRAGChromaService] Formatted {total_count} products with smart recommendations, context length: {len(context_text)}")
            return context_text
            
        except Exception as e:
            print(f"[ChatAIRAGChromaService] Error getting all products: {e}")
            import traceback
            traceback.print_exc()
            return f"Lỗi khi lấy dữ liệu sản phẩm: {str(e)}"
    
    def _extract_field_from_content(self, content: str, field_name: str) -> str:
        """Helper để extract field từ content"""
        if field_name in content:
            start = content.find(field_name) + len(field_name)
            end = content.find("\n", start)
            if end == -1:
                end = len(content)
            if end > start:
                return content[start:end].strip()
        return ""
    
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
        
        QUAN TRỌNG: Giờ đây sẽ lấy TOÀN BỘ sản phẩm của shop để AI biết hết
        
        Args:
            query: User query
            top_k_products: IGNORED - giờ lấy tất cả sản phẩm
            top_k_knowledge: Max knowledge items
            
        Returns:
            Formatted context string với TOÀN BỘ sản phẩm
        """
        # Lấy TOÀN BỘ sản phẩm của shop
        all_products_context = self.get_all_products_for_ai(query)
        
        # Lấy knowledge context
        knowledge_context = self.retrieve_knowledge_context(query, top_k_knowledge)
        
        context_text = all_products_context + "\n"
        
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
    
    # === CART DATA OPERATIONS ===
    
    def sync_carts_from_analytics(self, admin_token: str) -> int:
        """
        Đồng bộ cart data từ Spring Analytics API vào ChromaDB
        
        Args:
            admin_token: JWT token của admin để gọi Analytics API
            
        Returns:
            Số lượng carts đã sync
        """
        import httpx
        
        try:
            spring_url = os.getenv("SPRING_SERVICE_URL", "http://14.164.29.11:8089/api/v1")
            
            with httpx.Client(timeout=30.0) as client:
                response = client.get(
                    f"{spring_url}/admin/analytics/system-data",
                    headers={"Authorization": f"Bearer {admin_token}"}
                )
                
                if response.status_code != 200:
                    print(f"[ChatAIRAGChromaService] Failed to fetch analytics: {response.status_code}")
                    return 0
                
                data = response.json()
                carts = data.get('carts', [])
                
                if not carts:
                    print("[ChatAIRAGChromaService] No carts found in analytics data")
                    return 0
                
                # Clear old cart data
                self.clear_carts()
                
                cart_collection = self._get_or_create_carts_collection()
                synced = 0
                
                for cart in carts:
                    user_id = cart.get('userId')
                    username = cart.get('username', '')
                    items = cart.get('items', [])
                    total_value = cart.get('totalValue', 0)
                    
                    # Format cart content for embedding
                    cart_content = f"Giỏ hàng của {username} (user_id: {user_id}):\n"
                    for item in items:
                        cart_content += f"- {item.get('productName')} x{item.get('quantity')} = {item.get('subtotal'):,.0f}đ\n"
                    cart_content += f"Tổng giá trị: {total_value:,.0f}đ"
                    
                    cart_collection.upsert(
                        ids=[f"cart_user_{user_id}"],
                        documents=[cart_content],
                        metadatas=[{
                            "user_id": str(user_id),
                            "username": username,
                            "total_items": len(items),
                            "total_value": str(total_value),
                            "items_json": json.dumps(items, ensure_ascii=False),
                            "synced_at": datetime.now().isoformat()
                        }]
                    )
                    synced += 1
                
                print(f"[ChatAIRAGChromaService] Synced {synced} carts from Analytics API")
                return synced
                
        except Exception as e:
            print(f"[ChatAIRAGChromaService] Error syncing carts: {e}")
            return 0
    
    def get_user_cart_context(self, user_id: str) -> str:
        """
        Lấy cart context của user từ ChromaDB để đưa vào AI chat
        
        Args:
            user_id: ID của user (dạng 'user_5' hoặc '5')
            
        Returns:
            Formatted cart context string
        """
        try:
            # Normalize user_id
            if user_id.startswith("user_"):
                numeric_id = user_id.replace("user_", "")
            else:
                numeric_id = user_id
            
            cart_collection = self._get_or_create_carts_collection()
            
            # Debug: Check all carts in collection
            all_carts = cart_collection.get()
            print(f"[ChatAIRAGChromaService] Looking for cart of user_id: {user_id} (numeric: {numeric_id})")
            print(f"[ChatAIRAGChromaService] Available cart IDs: {all_carts.get('ids', [])}")
            
            # Try to get by cart_user_X id
            result = cart_collection.get(ids=[f"cart_user_{numeric_id}"])
            print(f"[ChatAIRAGChromaService] Query result for cart_user_{numeric_id}: {len(result.get('documents', [])) if result else 0} documents")
            
            if result and result.get('documents') and result['documents'][0]:
                metadata = result['metadatas'][0] if result.get('metadatas') else {}
                items_json = metadata.get('items_json', '[]')
                items = json.loads(items_json)
                
                cart_text = "\n\n=== GIỎ HÀNG THỰC TẾ CỦA KHÁCH ===\n"
                for item in items:
                    cart_text += f"- {item.get('productName')} (ID: {item.get('productId')}) | SL: {item.get('quantity')} | Giá: {item.get('productPrice'):,.0f}đ | Thành tiền: {item.get('subtotal'):,.0f}đ\n"
                
                total_value = metadata.get('total_value', '0')
                cart_text += f"Tổng tiền giỏ hàng: {float(total_value):,.0f}đ\n"
                cart_text += "📌 LƯU Ý CHO AI: Đây là giỏ hàng thực tế từ database. Khi khách nói 'đặt hàng sản phẩm trong giỏ', hãy xác nhận các sản phẩm này."
                
                return cart_text
            
            return ""
            
        except Exception as e:
            print(f"[ChatAIRAGChromaService] Error getting user cart context: {e}")
            return ""
    
    def clear_carts(self):
        """Xóa tất cả cart data trong ChromaDB"""
        try:
            cart_collection = self._get_or_create_carts_collection()
            # Get all existing cart IDs
            all_data = cart_collection.get()
            if all_data and all_data.get('ids'):
                cart_collection.delete(ids=all_data['ids'])
                print(f"[ChatAIRAGChromaService] Cleared {len(all_data['ids'])} carts")
        except Exception as e:
            print(f"[ChatAIRAGChromaService] Error clearing carts: {e}")


# === SINGLETON INSTANCE ===
_chat_ai_rag_service: Optional[ChatAIRAGChromaService] = None

def get_chat_ai_rag_service() -> ChatAIRAGChromaService:
    """Get or create Chat AI RAG Chroma service"""
    global _chat_ai_rag_service
    if _chat_ai_rag_service is None:
        _chat_ai_rag_service = ChatAIRAGChromaService()
    return _chat_ai_rag_service
