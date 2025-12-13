"""
Customer RAG Service
Manages RAG for customer chat - separate from business analytics
Uses separate ChromaDB instance (chroma_customer)
"""
import uuid
from typing import List, Dict, Optional, Any
from datetime import datetime
import chromadb


class CustomerRAGService:
    """RAG service specifically for customer chat"""
    
    def __init__(self, chroma_path: str = "./chroma_customer"):
        """
        Initialize Customer RAG Service with separate ChromaDB
        
        Args:
            chroma_path: Path to customer ChromaDB storage
        """
        self.chroma_client = chromadb.PersistentClient(path=chroma_path)
        self.prompts_collection_name = "rag_prompts_customer"
        self.products_collection_name = "products_customer"
        self._init_collections()
        print(f"[Customer RAG] Initialized with storage at: {chroma_path}")
    
    def _init_collections(self):
        """Initialize customer-specific collections"""
        self.prompts_collection = self.chroma_client.get_or_create_collection(
            name=self.prompts_collection_name,
            metadata={"description": "RAG prompts for customer chat"}
        )
        
        self.products_collection = self.chroma_client.get_or_create_collection(
            name=self.products_collection_name,
            metadata={"description": "Product information for customer queries"}
        )
        
        print(f"[Customer RAG] Collections initialized: {self.prompts_collection_name}, {self.products_collection_name}")
    
    def push_prompt(
        self,
        prompt: str,
        category: Optional[str] = None,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Push a new RAG prompt for customer chat
        
        Args:
            prompt: The prompt text
            category: Category of the prompt
            tags: List of tags
            metadata: Additional metadata
            
        Returns:
            Dictionary with prompt info and ID
        """
        prompt_id = str(uuid.uuid4())
        
        prompt_metadata = {
            "category": category or "general",
            "tags": ",".join(tags) if tags else "",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "type": "customer_chat"
        }
        
        if metadata:
            prompt_metadata.update(metadata)
        
        self.prompts_collection.add(
            documents=[prompt],
            metadatas=[prompt_metadata],
            ids=[prompt_id]
        )
        
        print(f"[Customer RAG] Added prompt: {prompt_id}")
        
        return {
            "id": prompt_id,
            "prompt": prompt,
            "category": prompt_metadata["category"],
            "tags": tags or [],
            "metadata": prompt_metadata,
            "message": "Customer chat prompt added successfully"
        }
    
    def search_prompts(self, query: str, n_results: int = 3) -> List[Dict[str, Any]]:
        """
        Search for relevant prompts based on query
        
        Args:
            query: Search query
            n_results: Number of results to return
            
        Returns:
            List of relevant prompts
        """
        try:
            results = self.prompts_collection.query(
                query_texts=[query],
                n_results=n_results
            )
            
            prompts = []
            if results['ids'] and len(results['ids']) > 0:
                for i, prompt_id in enumerate(results['ids'][0]):
                    prompts.append({
                        'id': prompt_id,
                        'prompt': results['documents'][0][i],
                        'metadata': results['metadatas'][0][i],
                        'distance': results['distances'][0][i] if 'distances' in results else None
                    })
            
            print(f"[Customer RAG] Found {len(prompts)} relevant prompts for query")
            return prompts
            
        except Exception as e:
            print(f"[Customer RAG] Search error: {e}")
            return []
    
    def add_product_info(self, product_id: str, product_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Add product information for customer queries
        
        Args:
            product_id: Product ID
            product_data: Product information (name, description, price, etc.)
            
        Returns:
            Result dictionary
        """
        # Create searchable document
        document = f"""
        Product: {product_data.get('name', 'Unknown')}
        Description: {product_data.get('description', 'No description')}
        Price: {product_data.get('price', 0)} VND
        Category: {product_data.get('category', 'General')}
        Stock: {product_data.get('quantity', 0)} items
        """
        
        metadata = {
            "product_id": product_id,
            "name": product_data.get('name', ''),
            "price": str(product_data.get('price', 0)),
            "category": product_data.get('category', ''),
            "added_at": datetime.now().isoformat(),
            "type": "product"
        }
        
        self.products_collection.upsert(
            documents=[document],
            metadatas=[metadata],
            ids=[f"product_{product_id}"]
        )
        
        print(f"[Customer RAG] Added/Updated product: {product_id}")
        
        return {
            "product_id": product_id,
            "message": "Product information added to customer RAG"
        }
    
    def search_products(self, query: str, n_results: int = 5) -> List[Dict[str, Any]]:
        """
        Search for products based on customer query
        
        Args:
            query: Customer search query
            n_results: Number of results
            
        Returns:
            List of relevant products
        """
        try:
            results = self.products_collection.query(
                query_texts=[query],
                n_results=n_results
            )
            
            products = []
            if results['ids'] and len(results['ids']) > 0:
                for i, item_id in enumerate(results['ids'][0]):
                    products.append({
                        'id': item_id,
                        'content': results['documents'][0][i],
                        'metadata': results['metadatas'][0][i],
                        'relevance': 1 - results['distances'][0][i] if 'distances' in results else 1.0
                    })
            
            print(f"[Customer RAG] Found {len(products)} relevant products")
            return products
            
        except Exception as e:
            print(f"[Customer RAG] Product search error: {e}")
            return []
    
    def get_stats(self) -> Dict[str, Any]:
        """Get statistics about customer RAG data"""
        prompts_count = self.prompts_collection.count()
        products_count = self.products_collection.count()
        
        return {
            "total_prompts": prompts_count,
            "total_products": products_count,
            "collections": [self.prompts_collection_name, self.products_collection_name],
            "storage_path": "./chroma_customer"
        }
