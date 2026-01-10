"""
Analytics RAG Service
Manages RAG for business analytics - separate from customer chat
Uses separate ChromaDB instance (chroma_analytics)
"""
import uuid
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
import chromadb
import hashlib
import json


class AnalyticsRAGService:
    """RAG service specifically for business analytics with caching"""
    
    def __init__(self, chroma_path: str = "./chroma_analytics"):
        """
        Initialize Analytics RAG Service with separate ChromaDB
        
        Args:
            chroma_path: Path to analytics ChromaDB storage
        """
        self.chroma_client = chromadb.PersistentClient(path=chroma_path)
        self.business_data_collection_name = "business_data"
        self.orders_analytics_collection_name = "orders_analytics"
        self.trends_collection_name = "trends"
        self.business_documents_collection_name = "business_documents"
        
        # Add query cache for performance
        self._query_cache = {}
        self._cache_ttl = 300  # 5 minutes cache
        self._max_cache_size = 100
        
        self._init_collections()
        print(f"[Analytics RAG] Initialized with storage at: {chroma_path}")
        print(f"[Analytics RAG] Query cache enabled (TTL: {self._cache_ttl}s, Max size: {self._max_cache_size})")
    
    def _get_cache_key(self, query: str, params: Dict[str, Any]) -> str:
        """Generate cache key from query and parameters"""
        cache_data = {
            'query': query,
            'params': params
        }
        cache_str = json.dumps(cache_data, sort_keys=True)
        return hashlib.md5(cache_str.encode()).hexdigest()
    
    def _get_from_cache(self, cache_key: str) -> Optional[Any]:
        """Get result from cache if valid"""
        if cache_key in self._query_cache:
            cached_item = self._query_cache[cache_key]
            if datetime.now() < cached_item['expires_at']:
                print(f"[Analytics RAG] Cache HIT for key: {cache_key[:16]}...")
                return cached_item['data']
            else:
                # Remove expired item
                del self._query_cache[cache_key]
        return None
    
    def _add_to_cache(self, cache_key: str, data: Any) -> None:
        """Add result to cache with expiration"""
        # Limit cache size
        if len(self._query_cache) >= self._max_cache_size:
            # Remove oldest item
            oldest_key = min(self._query_cache.keys(), 
                           key=lambda k: self._query_cache[k]['created_at'])
            del self._query_cache[oldest_key]
        
        self._query_cache[cache_key] = {
            'data': data,
            'created_at': datetime.now(),
            'expires_at': datetime.now() + timedelta(seconds=self._cache_ttl)
        }
        print(f"[Analytics RAG] Cached result for key: {cache_key[:16]}... (cache size: {len(self._query_cache)})")
    
    def clear_cache(self) -> int:
        """Clear all cached queries"""
        count = len(self._query_cache)
        self._query_cache.clear()
        print(f"[Analytics RAG] Cleared {count} cached queries")
        return count
    
    def _init_collections(self):
        """Initialize analytics-specific collections"""
        self.business_data_collection = self.chroma_client.get_or_create_collection(
            name=self.business_data_collection_name,
            metadata={"description": "Business data for analytics"}
        )
        
        self.orders_analytics_collection = self.chroma_client.get_or_create_collection(
            name=self.orders_analytics_collection_name,
            metadata={"description": "Order data for analytics"}
        )
        
        self.trends_collection = self.chroma_client.get_or_create_collection(
            name=self.trends_collection_name,
            metadata={"description": "Business trends and insights"}
        )
        
        self.business_documents_collection = self.chroma_client.get_or_create_collection(
            name=self.business_documents_collection_name,
            metadata={"description": "Business documents for AI search"}
        )
        
        print(f"[Analytics RAG] Collections initialized: {self.business_data_collection_name}, {self.orders_analytics_collection_name}, {self.trends_collection_name}, {self.business_documents_collection_name}")
    
    def store_business_data(
        self,
        data_id: str,
        data_content: str,
        data_type: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Store business data for analytics
        
        Args:
            data_id: Unique data ID
            data_content: Text content of business data
            data_type: Type of data (e.g., 'revenue', 'sales', 'inventory')
            metadata: Additional metadata
            
        Returns:
            Result dictionary
        """
        data_metadata = {
            "data_type": data_type,
            "stored_at": datetime.now().isoformat(),
            "purpose": "analytics"
        }
        
        if metadata:
            data_metadata.update(metadata)
        
        self.business_data_collection.upsert(
            documents=[data_content],
            metadatas=[data_metadata],
            ids=[data_id]
        )
        
        print(f"[Analytics RAG] Stored business data: {data_id}")
        
        return {
            "id": data_id,
            "data_type": data_type,
            "message": "Business data stored successfully"
        }
    
    def store_order_analytics(
        self,
        order_id: str,
        order_summary: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Store order data for analytics purposes
        
        Args:
            order_id: Order ID
            order_summary: Summary text of order for analytics
            metadata: Additional metadata (customer_id, total, products, etc.)
            
        Returns:
            Result dictionary
        """
        order_metadata = {
            "order_id": order_id,
            "stored_at": datetime.now().isoformat(),
            "purpose": "analytics"
        }
        
        if metadata:
            order_metadata.update(metadata)
        
        self.orders_analytics_collection.upsert(
            documents=[order_summary],
            metadatas=[order_metadata],
            ids=[f"order_{order_id}"]
        )
        
        print(f"[Analytics RAG] Stored order analytics: {order_id}")
        
        return {
            "order_id": order_id,
            "message": "Order analytics stored successfully"
        }
    
    def store_product_data(
        self,
        product_id: str,
        product_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Store comprehensive product data including details
        
        Args:
            product_id: Product ID
            product_data: Complete product information including details
            
        Returns:
            Result dictionary
        """
        # Extract key information for text content
        product_content = f"""
Product ID: {product_data.get('id', product_id)}
Name: {product_data.get('name', '')}
Description: {product_data.get('description', '')}
Price: {product_data.get('price', 0)} VND
Quantity: {product_data.get('quantity', 0)}
Status: {product_data.get('status', 'UNKNOWN')}
Category: {product_data.get('categoryName', '')}
Seller: {product_data.get('sellerUsername', '')}
"""
        
        # Add details information if available
        if product_data.get('details'):
            try:
                import json
                details = json.loads(product_data['details']) if isinstance(product_data['details'], str) else product_data['details']
                
                if details:
                    product_content += "\nProduct Details:\n"
                    
                    # Basic details
                    if details.get('brand'):
                        product_content += f"Brand: {details['brand']}\n"
                    if details.get('model'):
                        product_content += f"Model: {details['model']}\n"
                    if details.get('color'):
                        product_content += f"Color: {details['color']}\n"
                    if details.get('warranty'):
                        product_content += f"Warranty: {details['warranty']}\n"
                    if details.get('storage'):
                        product_content += f"Storage: {details['storage']}\n"
                    if details.get('type'):
                        product_content += f"Type: {details['type']}\n"
                    
                    # Features
                    if details.get('features') and isinstance(details['features'], list):
                        product_content += f"Features: {', '.join(details['features'])}\n"
                    
                    # Specifications
                    if details.get('specifications') and isinstance(details['specifications'], dict):
                        product_content += "Specifications:\n"
                        for key, value in details['specifications'].items():
                            product_content += f"  {key}: {value}\n"
                    
                    # Connectivity
                    if details.get('connectivity') and isinstance(details['connectivity'], list):
                        product_content += f"Connectivity: {', '.join(details['connectivity'])}\n"
                    
                    # Accessories
                    if details.get('accessories') and isinstance(details['accessories'], list):
                        product_content += f"Accessories: {', '.join(details['accessories'])}\n"
                    
                    # Dimensions and Weight
                    if details.get('dimensions'):
                        product_content += f"Dimensions: {details['dimensions']}\n"
                    if details.get('weight'):
                        product_content += f"Weight: {details['weight']}\n"
                        
            except json.JSONDecodeError:
                print(f"[Analytics RAG] Invalid JSON in product details for {product_id}")
            except Exception as e:
                print(f"[Analytics RAG] Error parsing product details for {product_id}: {e}")
        
        # Prepare metadata with all product information
        product_metadata = {
            "data_type": "product",
            "product_id": str(product_data.get('id', product_id)),
            "name": product_data.get('name', ''),
            "category": product_data.get('categoryName', ''),
            "status": product_data.get('status', 'UNKNOWN'),
            "price": float(product_data.get('price', 0)),
            "quantity": int(product_data.get('quantity', 0)),
            "seller": product_data.get('sellerUsername', ''),
            "seller_id": str(product_data.get('sellerId', '')),
            "has_details": bool(product_data.get('details')),
            "stored_at": datetime.now().isoformat(),
            "purpose": "analytics"
        }
        
        # Add parsed details to metadata if available
        if product_data.get('details'):
            try:
                import json
                details = json.loads(product_data['details']) if isinstance(product_data['details'], str) else product_data['details']
                if details:
                    # Store key details in metadata for easy filtering
                    if details.get('brand'):
                        product_metadata['brand'] = details['brand']
                    if details.get('model'):
                        product_metadata['model'] = details['model']
                    if details.get('color'):
                        product_metadata['color'] = details['color']
                    if details.get('warranty'):
                        product_metadata['warranty'] = details['warranty']
                    # Store full details as JSON string
                    product_metadata['details_json'] = json.dumps(details, ensure_ascii=False)
            except:
                pass
        
        # Store in business_data_collection with product-specific ID
        self.business_data_collection.upsert(
            documents=[product_content],
            metadatas=[product_metadata],
            ids=[f"product_{product_id}"]
        )
        
        print(f"[Analytics RAG] Stored product data: {product_id} with details: {bool(product_data.get('details'))}")
        
        return {
            "product_id": product_id,
            "has_details": bool(product_data.get('details')),
            "message": "Product data stored successfully"
        }
    
    def store_multiple_products(
        self,
        products_data: List[Dict[str, Any]],
        batch_size: int = 50
    ) -> Dict[str, Any]:
        """
        Store multiple products at once with batch processing for performance
        
        Args:
            products_data: List of product data dictionaries
            batch_size: Number of products to process per batch
            
        Returns:
            Result summary
        """
        results = {
            "total_products": len(products_data),
            "products_with_details": 0,
            "products_without_details": 0,
            "batches_processed": 0,
            "errors": []
        }
        
        # Process in batches for better performance
        for batch_start in range(0, len(products_data), batch_size):
            batch_end = min(batch_start + batch_size, len(products_data))
            batch = products_data[batch_start:batch_end]
            
            try:
                # Prepare batch data
                batch_documents = []
                batch_metadatas = []
                batch_ids = []
                
                for product in batch:
                    try:
                        product_id = str(product.get('id', ''))
                        if not product_id:
                            results["errors"].append("Missing product ID")
                            continue
                        
                        # Build product content
                        product_content = self._build_product_content(product, product_id)
                        product_metadata = self._build_product_metadata(product, product_id)
                        
                        batch_documents.append(product_content)
                        batch_metadatas.append(product_metadata)
                        batch_ids.append(f"product_{product_id}")
                        
                        if product.get('details'):
                            results["products_with_details"] += 1
                        else:
                            results["products_without_details"] += 1
                            
                    except Exception as e:
                        results["errors"].append(f"Error preparing product {product.get('id', 'unknown')}: {str(e)}")
                
                # Batch upsert
                if batch_documents:
                    try:
                        self.business_data_collection.upsert(
                            documents=batch_documents,
                            metadatas=batch_metadatas,
                            ids=batch_ids
                        )
                        results["batches_processed"] += 1
                        print(f"[Analytics RAG] Batch {results['batches_processed']}: Stored {len(batch_documents)} products")
                    except Exception as e:
                        results["errors"].append(f"Batch upsert error: {str(e)}")
                        
            except Exception as e:
                results["errors"].append(f"Batch processing error: {str(e)}")
        
        print(f"[Analytics RAG] Stored {results['total_products']} products in {results['batches_processed']} batches, {results['products_with_details']} with details")
        
        # Clear cache after bulk update
        self.clear_cache()
        
        return results
    
    def _build_product_content(self, product_data: Dict[str, Any], product_id: str) -> str:
        """Build product content text for embedding"""
        product_content = f"""
Product ID: {product_data.get('id', product_id)}
Name: {product_data.get('name', '')}
Description: {product_data.get('description', '')}
Price: {product_data.get('price', 0)} VND
Quantity: {product_data.get('quantity', 0)}
Status: {product_data.get('status', 'UNKNOWN')}
Category: {product_data.get('categoryName', '')}
Seller: {product_data.get('sellerUsername', '')}
"""
        
        # Add details information if available
        if product_data.get('details'):
            try:
                import json
                details = json.loads(product_data['details']) if isinstance(product_data['details'], str) else product_data['details']
                
                if details:
                    product_content += "\nProduct Details:\n"
                    
                    # Basic details
                    for field in ['brand', 'model', 'color', 'warranty', 'storage', 'type']:
                        if details.get(field):
                            product_content += f"{field.title()}: {details[field]}\n"
                    
                    # Features
                    if details.get('features') and isinstance(details['features'], list):
                        product_content += f"Features: {', '.join(details['features'])}\n"
                    
                    # Specifications
                    if details.get('specifications') and isinstance(details['specifications'], dict):
                        product_content += "Specifications:\n"
                        for key, value in details['specifications'].items():
                            product_content += f"  {key}: {value}\n"
                    
                    # Connectivity
                    if details.get('connectivity') and isinstance(details['connectivity'], list):
                        product_content += f"Connectivity: {', '.join(details['connectivity'])}\n"
                    
                    # Accessories, Dimensions, Weight
                    if details.get('accessories') and isinstance(details['accessories'], list):
                        product_content += f"Accessories: {', '.join(details['accessories'])}\n"
                    if details.get('dimensions'):
                        product_content += f"Dimensions: {details['dimensions']}\n"
                    if details.get('weight'):
                        product_content += f"Weight: {details['weight']}\n"
                        
            except json.JSONDecodeError:
                print(f"[Analytics RAG] Invalid JSON in product details for {product_id}")
            except Exception as e:
                print(f"[Analytics RAG] Error parsing product details for {product_id}: {e}")
        
        return product_content
    
    def _build_product_metadata(self, product_data: Dict[str, Any], product_id: str) -> Dict[str, Any]:
        """Build product metadata for filtering"""
        product_metadata = {
            "data_type": "product",
            "product_id": str(product_data.get('id', product_id)),
            "name": product_data.get('name', ''),
            "category": product_data.get('categoryName', ''),
            "status": product_data.get('status', 'UNKNOWN'),
            "price": float(product_data.get('price', 0)),
            "quantity": int(product_data.get('quantity', 0)),
            "seller": product_data.get('sellerUsername', ''),
            "seller_id": str(product_data.get('sellerId', '')),
            "has_details": bool(product_data.get('details')),
            "stored_at": datetime.now().isoformat(),
            "purpose": "analytics"
        }
        
        # Add parsed details to metadata if available
        if product_data.get('details'):
            try:
                import json
                details = json.loads(product_data['details']) if isinstance(product_data['details'], str) else product_data['details']
                if details:
                    # Store key details in metadata for easy filtering
                    for field in ['brand', 'model', 'color', 'warranty']:
                        if details.get(field):
                            product_metadata[field] = details[field]
                    # Store full details as JSON string (truncated)
                    details_json = json.dumps(details, ensure_ascii=False)
                    if len(details_json) > 4000:
                        details_json = details_json[:4000] + '...'
                    product_metadata['details_json'] = details_json
            except:
                pass
        
        return product_metadata
    
    def store_system_data(
        self,
        system_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Store comprehensive system analytics data
        
        Args:
            system_data: Complete system data from analytics endpoint
            
        Returns:
            Storage result summary
        """
        storage_results = {
            "timestamp": datetime.now().isoformat(),
            "products_stored": 0,
            "orders_stored": 0,
            "users_stored": 0,
            "categories_stored": 0,
            "details": {}
        }
        
        # Store products data
        if system_data.get('products') and system_data['products'].get('all_products'):
            products_result = self.store_multiple_products(system_data['products']['all_products'])
            storage_results["products_stored"] = products_result["total_products"]
            storage_results["details"]["products"] = products_result
        
        # Store orders data
        if system_data.get('orders') and system_data['orders'].get('recent_orders'):
            orders = system_data['orders']['recent_orders']
            for order in orders:
                try:
                    order_id = str(order.get('id', ''))
                    if order_id:
                        # Create order summary for storage
                        order_summary = f"""
Order ID: {order.get('id', '')}
Customer: {order.get('customerName', '')}
Status: {order.get('status', '')}
Total Amount: {order.get('totalAmount', 0)} VND
Items: {order.get('totalItems', 0)}
Date: {order.get('createdAt', '')}
Items Detail: {order.get('items', [])}
"""
                        order_metadata = {
                            "customer_id": str(order.get('customerId', '')),
                            "total_amount": float(order.get('totalAmount', 0)),
                            "status": order.get('status', ''),
                            "total_items": int(order.get('totalItems', 0))
                        }
                        
                        self.store_order_analytics(order_id, order_summary, order_metadata)
                        storage_results["orders_stored"] += 1
                except Exception as e:
                    print(f"[Analytics RAG] Error storing order {order.get('id', 'unknown')}: {e}")
        
        # Store users data
        if system_data.get('customers') and system_data['customers'].get('all_users'):
            users = system_data['customers']['all_users']
            for user in users:
                try:
                    user_id = str(user.get('id', ''))
                    if user_id:
                        user_content = f"""
User ID: {user.get('id', '')}
Username: {user.get('username', '')}
Email: {user.get('email', '')}
Role: {user.get('role', '')}
Status: {user.get('accountStatus', '')}
Address: {user.get('address', '')}
Phone: {user.get('phoneNumber', '')}
"""
                        user_metadata = {
                            "data_type": "user",
                            "user_id": user_id,
                            "username": user.get('username', ''),
                            "role": user.get('role', ''),
                            "status": user.get('accountStatus', ''),
                            "stored_at": datetime.now().isoformat()
                        }
                        
                        self.business_data_collection.upsert(
                            documents=[user_content],
                            metadatas=[user_metadata],
                            ids=[f"user_{user_id}"]
                        )
                        storage_results["users_stored"] += 1
                except Exception as e:
                    print(f"[Analytics RAG] Error storing user {user.get('id', 'unknown')}: {e}")
        
        # Store categories data
        if system_data.get('products') and system_data['products'].get('categories'):
            categories = system_data['products']['categories']
            for category in categories:
                try:
                    category_id = str(category.get('id', ''))
                    if category_id:
                        category_content = f"""
Category ID: {category.get('id', '')}
Name: {category.get('name', '')}
Description: {category.get('description', '')}
Status: {category.get('status', '')}
Product Count: {category.get('productCount', 0)}
"""
                        category_metadata = {
                            "data_type": "category",
                            "category_id": category_id,
                            "name": category.get('name', ''),
                            "status": category.get('status', ''),
                            "product_count": int(category.get('productCount', 0)),
                            "stored_at": datetime.now().isoformat()
                        }
                        
                        self.business_data_collection.upsert(
                            documents=[category_content],
                            metadatas=[category_metadata],
                            ids=[f"category_{category_id}"]
                        )
                        storage_results["categories_stored"] += 1
                except Exception as e:
                    print(f"[Analytics RAG] Error storing category {category.get('id', 'unknown')}: {e}")
        
        # Store system overview as summary document
        if system_data.get('overview'):
            overview = system_data['overview']
            overview_content = f"""
System Overview - {datetime.now().isoformat()}
Total Products: {overview.get('total_products', 0)}
Total Orders: {overview.get('total_orders', 0)}
Total Customers: {overview.get('total_customers', 0)}
Total Users: {overview.get('total_users', 0)}
Total Revenue: {overview.get('total_revenue', 0)} VND
Monthly Revenue: {overview.get('monthly_revenue', 0)} VND
Weekly Revenue: {overview.get('weekly_revenue', 0)} VND
Daily Revenue: {overview.get('daily_revenue', 0)} VND
"""
            overview_metadata = {
                "data_type": "system_overview",
                "timestamp": datetime.now().isoformat(),
                "total_products": int(overview.get('total_products', 0)),
                "total_orders": int(overview.get('total_orders', 0)),
                "total_customers": int(overview.get('total_customers', 0)),
                "total_revenue": float(overview.get('total_revenue', 0))
            }
            
            self.business_data_collection.upsert(
                documents=[overview_content],
                metadatas=[overview_metadata],
                ids=["system_overview"]
            )
        
        print(f"[Analytics RAG] System data storage complete: {storage_results['products_stored']} products, {storage_results['orders_stored']} orders, {storage_results['users_stored']} users, {storage_results['categories_stored']} categories")
        
        return storage_results
    
    def store_order_analytics(
        self,
        order_id: str,
        order_content: str,
        order_metadata: Dict[str, Any]
    ) -> bool:
        """
        Store order analytics data in Chroma DB
        
        Args:
            order_id: Unique order identifier
            order_content: Order content text
            order_metadata: Order metadata
            
        Returns:
            Success status
        """
        try:
            # Add standard metadata
            order_metadata.update({
                "data_type": "order",
                "order_id": order_id,
                "stored_at": datetime.now().isoformat()
            })
            
            # Store in collection
            self.business_data_collection.upsert(
                documents=[order_content],
                metadatas=[order_metadata],
                ids=[f"order_{order_id}"]
            )
            
            print(f"[Analytics RAG] Stored order analytics for order {order_id}")
            return True
            
        except Exception as e:
            print(f"[Analytics RAG] Error storing order analytics for {order_id}: {e}")
            return False
    
    def search_business_data(
        self,
        query: str,
        data_type: Optional[str] = None,
        n_results: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search business data for analytics with enhanced error handling and caching
        
        Args:
            query: Search query
            data_type: Filter by data type
            n_results: Number of results
            
        Returns:
            List of relevant business data
        """
        if not query or not query.strip():
            print("[Analytics RAG] Empty query provided")
            return []
        
        # Check cache first
        cache_key = self._get_cache_key(query, {'data_type': data_type, 'n_results': n_results})
        cached_result = self._get_from_cache(cache_key)
        if cached_result is not None:
            return cached_result
            
        try:
            data_items = []
            
            # Search in actual collections with data
            search_collections = ['products', 'orders', 'categories', 'business', 'users', 'business_documents']
            
            # If data_type specified, prioritize that collection
            if data_type and data_type in search_collections:
                search_collections = [data_type] + [c for c in search_collections if c != data_type]
            
            successful_searches = 0
            failed_collections = []
            
            for collection_name in search_collections:
                try:
                    # Check if collection exists
                    try:
                        collection = self.chroma_client.get_collection(name=collection_name)
                    except Exception as e:
                        print(f"[Analytics RAG] Collection '{collection_name}' not found, skipping")
                        continue
                    
                    # Check if collection has data
                    count = collection.count()
                    if count == 0:
                        print(f"[Analytics RAG] Collection '{collection_name}' is empty, skipping")
                        continue
                    
                    # Perform search with timeout protection
                    results = collection.query(
                        query_texts=[query],
                        n_results=min(n_results, 5)  # Limit per collection
                    )
                    
                    if results['ids'] and len(results['ids']) > 0:
                        for i, item_id in enumerate(results['ids'][0]):
                            # Validate result data
                            if not item_id:
                                continue
                                
                            relevance = 1.0
                            if 'distances' in results and results['distances'] and len(results['distances'][0]) > i:
                                distance = results['distances'][0][i]
                                relevance = max(0.0, min(1.0, 1 - distance))  # Clamp to [0, 1]
                            
                            data_items.append({
                                'id': item_id,
                                'content': results['documents'][0][i] if results['documents'] and len(results['documents'][0]) > i else '',
                                'metadata': results['metadatas'][0][i] if results['metadatas'] and results['metadatas'][0] and len(results['metadatas'][0]) > i else {},
                                'relevance': relevance,
                                'collection': collection_name
                            })
                        
                        successful_searches += 1
                            
                except Exception as e:
                    failed_collections.append(collection_name)
                    print(f"[Analytics RAG] Error searching '{collection_name}': {str(e)}")
                    continue
            
            # Sort by relevance and limit results
            data_items.sort(key=lambda x: x.get('relevance', 0), reverse=True)
            data_items = data_items[:n_results]
            
            # Cache the result
            self._add_to_cache(cache_key, data_items)
            
            # Log search results
            if data_items:
                print(f"[Analytics RAG] Found {len(data_items)} relevant items from {successful_searches} collections")
                if failed_collections:
                    print(f"[Analytics RAG] Failed to search: {', '.join(failed_collections)}")
            else:
                print(f"[Analytics RAG] No results found for query: '{query[:100]}'")
                if failed_collections:
                    print(f"[Analytics RAG] Some collections failed: {', '.join(failed_collections)}")
            
            return data_items
            
        except Exception as e:
            import traceback
            print(f"[Analytics RAG] Critical search error: {str(e)}")
            traceback.print_exc()
            return []
    
    def search_order_patterns(
        self,
        query: str,
        n_results: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Search order data to find patterns
        
        Args:
            query: Search query for patterns
            n_results: Number of results
            
        Returns:
            List of relevant orders
        """
        try:
            # Search in actual orders collection
            orders_collection = self.chroma_client.get_collection(name="orders")
            
            results = orders_collection.query(
                query_texts=[query],
                n_results=n_results
            )
            
            orders = []
            if results['ids'] and len(results['ids']) > 0:
                for i, item_id in enumerate(results['ids'][0]):
                    orders.append({
                        'id': item_id,
                        'summary': results['documents'][0][i],
                        'metadata': results['metadatas'][0][i] if results['metadatas'] and results['metadatas'][0] else None,
                        'relevance': 1 - results['distances'][0][i] if 'distances' in results and results['distances'] else 1.0,
                        'collection': 'orders'
                    })
            
            print(f"[Analytics RAG] Found {len(orders)} relevant order patterns")
            return orders
            
        except Exception as e:
            print(f"[Analytics RAG] Order search error: {e}")
            return []
    
    def store_trend(
        self,
        trend_id: str,
        trend_description: str,
        trend_type: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Store identified business trend
        
        Args:
            trend_id: Trend ID
            trend_description: Description of the trend
            trend_type: Type of trend (e.g., 'sales_increase', 'seasonal_pattern')
            metadata: Additional metadata
            
        Returns:
            Result dictionary
        """
        trend_metadata = {
            "trend_type": trend_type,
            "identified_at": datetime.now().isoformat()
        }
        
        if metadata:
            trend_metadata.update(metadata)
        
        self.trends_collection.upsert(
            documents=[trend_description],
            metadatas=[trend_metadata],
            ids=[trend_id]
        )
        
        print(f"[Analytics RAG] Stored trend: {trend_id}")
        
        return {
            "trend_id": trend_id,
            "trend_type": trend_type,
            "message": "Trend stored successfully"
        }
    
    def get_all_business_data(self, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get all business data for comprehensive analysis
        
        Args:
            limit: Maximum number of items to return
            
        Returns:
            List of all business data
        """
        try:
            all_data = []
            
            # Get data from actual collections that have data
            collection_names = ['products', 'orders', 'categories', 'business', 'users', 'system_stats']
            
            for collection_name in collection_names:
                try:
                    collection = self.chroma_client.get_collection(name=collection_name)
                    data = collection.get()
                    
                    if data['ids']:
                        items_to_add = min(limit - len(all_data), len(data['ids']))
                        for i in range(items_to_add):
                            all_data.append({
                                'id': data['ids'][i],
                                'content': data['documents'][i],
                                'metadata': data['metadatas'][i] if data['metadatas'] and i < len(data['metadatas']) else None,
                                'collection': collection_name
                            })
                        
                        if len(all_data) >= limit:
                            break
                            
                except Exception as e:
                    print(f"[Analytics RAG] Error getting data from {collection_name}: {e}")
                    continue
            
            print(f"[Analytics RAG] Retrieved {len(all_data)} business data items from {len(collection_names)} collections")
            return all_data
            
        except Exception as e:
            print(f"[Analytics RAG] Error retrieving all data: {e}")
            return []
    
    def get_stats(self) -> Dict[str, Any]:
        """Get statistics about analytics RAG data"""
        try:
            stats = {}
            total_count = 0
            
            # Get stats from actual collections (exclude chat_history and rag_prompts)
            collection_names = ['products', 'orders', 'categories', 'business', 'users', 'system_stats']
            
            for collection_name in collection_names:
                try:
                    collection = self.chroma_client.get_collection(name=collection_name)
                    count = collection.count()
                    if count > 0:  # Only include non-empty collections
                        stats[collection_name] = count
                        total_count += count
                except Exception as e:
                    print(f"[Analytics RAG] Error getting stats for {collection_name}: {e}")
                    # Skip collections that don't exist or have errors
            
            return {
                "total_documents": total_count,
                "collections": stats,
                "storage_path": "./chroma_analytics",
                "collections_count": len(stats),
                "note": "Only showing collections with data"
            }
            
        except Exception as e:
            print(f"[Analytics RAG] Error getting stats: {e}")
            return {
                "total_documents": 0,
                "collections": {},
                "storage_path": "./chroma_analytics",
                "error": str(e)
            }

    def store_business_document(
        self,
        document_id: str,
        document_content: str,
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Store business document in ChromaDB for AI search
        
        Args:
            document_id: Unique document identifier
            document_content: Full text content of the document
            metadata: Document metadata
            
        Returns:
            Dict containing storage result
        """
        try:
            # Store in business documents collection
            self.business_documents_collection.add(
                documents=[document_content],
                metadatas=[metadata],
                ids=[document_id]
            )
            
            print(f"[Analytics RAG] Stored business document: {document_id}")
            
            return {
                "success": True,
                "document_id": document_id,
                "collection": self.business_documents_collection_name,
                "message": "Document stored successfully"
            }
            
        except Exception as e:
            print(f"[Analytics RAG] Error storing business document {document_id}: {e}")
            return {
                "success": False,
                "document_id": document_id,
                "error": str(e),
                "message": "Failed to store document"
            }

    def search_business_documents(
        self,
        query: str,
        business_id: Optional[str] = None,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Search business documents using semantic search
        
        Args:
            query: Search query
            business_id: Optional business ID filter
            limit: Maximum results to return
            
        Returns:
            List of matching documents with metadata
        """
        try:
            # Build search filter if business_id provided
            search_filter = None
            if business_id:
                search_filter = {"business_id": business_id}
            
            results = self.business_documents_collection.query(
                query_texts=[query],
                n_results=limit,
                where=search_filter
            )
            
            # Format results
            documents = []
            if results['documents'] and len(results['documents']) > 0:
                for i, doc in enumerate(results['documents'][0]):
                    metadata = results['metadatas'][0][i] if results['metadatas'] else {}
                    distance = results['distances'][0][i] if results['distances'] else None
                    
                    documents.append({
                        "document_id": results['ids'][0][i],
                        "content": doc,
                        "metadata": metadata,
                        "similarity_score": 1 - distance if distance else None
                    })
            
            print(f"[Analytics RAG] Found {len(documents)} business documents for query: {query}")
            return documents
            
        except Exception as e:
            print(f"[Analytics RAG] Error searching business documents: {e}")
            return []
