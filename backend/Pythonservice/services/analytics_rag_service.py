"""
Analytics RAG Service
Manages RAG for business analytics - separate from customer chat
Uses separate ChromaDB instance (chroma_analytics)
"""
import uuid
from typing import List, Dict, Optional, Any
from datetime import datetime
import chromadb


class AnalyticsRAGService:
    """RAG service specifically for business analytics"""
    
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
        self._init_collections()
        print(f"[Analytics RAG] Initialized with storage at: {chroma_path}")
    
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
        
        print(f"[Analytics RAG] Collections initialized: {self.business_data_collection_name}, {self.orders_analytics_collection_name}, {self.trends_collection_name}")
    
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
    
    def search_business_data(
        self,
        query: str,
        data_type: Optional[str] = None,
        n_results: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search business data for analytics
        
        Args:
            query: Search query
            data_type: Filter by data type
            n_results: Number of results
            
        Returns:
            List of relevant business data
        """
        try:
            data_items = []
            
            # Search in actual collections with data
            search_collections = ['products', 'orders', 'categories', 'business', 'users']
            
            for collection_name in search_collections:
                try:
                    collection = self.chroma_client.get_collection(name=collection_name)
                    
                    results = collection.query(
                        query_texts=[query],
                        n_results=min(n_results, 5)  # Limit per collection
                    )
                    
                    if results['ids'] and len(results['ids']) > 0:
                        for i, item_id in enumerate(results['ids'][0]):
                            data_items.append({
                                'id': item_id,
                                'content': results['documents'][0][i],
                                'metadata': results['metadatas'][0][i] if results['metadatas'] and results['metadatas'][0] else None,
                                'relevance': 1 - results['distances'][0][i] if 'distances' in results and results['distances'] else 1.0,
                                'collection': collection_name
                            })
                            
                except Exception as e:
                    print(f"[Analytics RAG] Error searching {collection_name}: {e}")
                    continue
            
            # Sort by relevance and limit results
            data_items.sort(key=lambda x: x.get('relevance', 0), reverse=True)
            data_items = data_items[:n_results]
            
            print(f"[Analytics RAG] Found {len(data_items)} relevant business data items from {len(search_collections)} collections")
            return data_items
            
        except Exception as e:
            print(f"[Analytics RAG] Search error: {e}")
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
