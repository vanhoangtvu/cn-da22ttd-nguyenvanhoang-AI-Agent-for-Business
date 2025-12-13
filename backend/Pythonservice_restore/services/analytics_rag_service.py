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
            where_filter = {"data_type": data_type} if data_type else None
            
            results = self.business_data_collection.query(
                query_texts=[query],
                n_results=n_results,
                where=where_filter
            )
            
            data_items = []
            if results['ids'] and len(results['ids']) > 0:
                for i, item_id in enumerate(results['ids'][0]):
                    data_items.append({
                        'id': item_id,
                        'content': results['documents'][0][i],
                        'metadata': results['metadatas'][0][i],
                        'relevance': 1 - results['distances'][0][i] if 'distances' in results else 1.0
                    })
            
            print(f"[Analytics RAG] Found {len(data_items)} relevant business data items")
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
            results = self.orders_analytics_collection.query(
                query_texts=[query],
                n_results=n_results
            )
            
            orders = []
            if results['ids'] and len(results['ids']) > 0:
                for i, item_id in enumerate(results['ids'][0]):
                    orders.append({
                        'id': item_id,
                        'summary': results['documents'][0][i],
                        'metadata': results['metadatas'][0][i],
                        'relevance': 1 - results['distances'][0][i] if 'distances' in results else 1.0
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
            # Get data from all collections
            business_data = self.business_data_collection.get()
            orders_data = self.orders_analytics_collection.get()
            trends_data = self.trends_collection.get()
            
            all_data = []
            
            # Process business data
            if business_data['ids']:
                for i, item_id in enumerate(business_data['ids'][:limit]):
                    all_data.append({
                        'id': item_id,
                        'content': business_data['documents'][i],
                        'metadata': business_data['metadatas'][i],
                        'collection': 'business_data'
                    })
            
            # Process orders data
            if orders_data['ids']:
                for i, item_id in enumerate(orders_data['ids'][:limit]):
                    all_data.append({
                        'id': item_id,
                        'content': orders_data['documents'][i],
                        'metadata': orders_data['metadatas'][i],
                        'collection': 'orders_analytics'
                    })
            
            print(f"[Analytics RAG] Retrieved {len(all_data)} business data items")
            return all_data
            
        except Exception as e:
            print(f"[Analytics RAG] Error retrieving all data: {e}")
            return []
    
    def get_stats(self) -> Dict[str, Any]:
        """Get statistics about analytics RAG data"""
        business_count = self.business_data_collection.count()
        orders_count = self.orders_analytics_collection.count()
        trends_count = self.trends_collection.count()
        
        return {
            "total_business_data": business_count,
            "total_orders": orders_count,
            "total_trends": trends_count,
            "collections": [
                self.business_data_collection_name,
                self.orders_analytics_collection_name,
                self.trends_collection_name
            ],
            "storage_path": "./chroma_analytics"
        }
