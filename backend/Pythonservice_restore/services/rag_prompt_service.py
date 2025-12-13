"""
RAG Prompt Service
Manages RAG prompts stored in ChromaDB for AI responses
"""
import uuid
from typing import List, Dict, Optional, Any
from datetime import datetime


class RAGPromptService:
    def __init__(self, chroma_client):
        """
        Initialize RAG Prompt Service
        
        Args:
            chroma_client: ChromaDB client instance
        """
        self.chroma_client = chroma_client
        self.collection_name = "rag_prompts"
        self._init_collection()
    
    def _init_collection(self):
        """Initialize or get the RAG prompts collection"""
        self.collection = self.chroma_client.get_or_create_collection(
            name=self.collection_name,
            metadata={"description": "RAG prompts for AI responses"}
        )
    
    def push_prompt(
        self,
        prompt: str,
        category: Optional[str] = None,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Push a new RAG prompt to ChromaDB
        
        Args:
            prompt: The prompt text
            category: Category of the prompt (e.g., "greeting", "technical", "sales")
            tags: List of tags for the prompt
            metadata: Additional metadata
            
        Returns:
            Dictionary with prompt info and ID
        """
        # Generate unique ID
        prompt_id = str(uuid.uuid4())
        
        # Prepare metadata
        prompt_metadata = {
            "category": category or "general",
            "tags": ",".join(tags) if tags else "",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        # Add custom metadata
        if metadata:
            prompt_metadata.update(metadata)
        
        # Add to collection
        self.collection.add(
            documents=[prompt],
            metadatas=[prompt_metadata],
            ids=[prompt_id]
        )
        
        return {
            "id": prompt_id,
            "prompt": prompt,
            "category": prompt_metadata["category"],
            "tags": tags or [],
            "metadata": prompt_metadata,
            "message": "Prompt added successfully"
        }
    
    def get_prompts(
        self,
        category: Optional[str] = None,
        tags: Optional[List[str]] = None,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get RAG prompts from ChromaDB
        
        Args:
            category: Filter by category
            tags: Filter by tags
            limit: Maximum number of prompts to return
            
        Returns:
            List of prompts with metadata
        """
        # Build where filter
        where = None
        if category:
            where = {"category": category}
        
        # Get all data from collection
        results = self.collection.get(
            where=where,
            limit=limit
        )
        
        if not results['ids']:
            return []
        
        # Format results
        prompts = []
        for i in range(len(results['ids'])):
            prompt_data = {
                "id": results['ids'][i],
                "prompt": results['documents'][i],
                "metadata": results['metadatas'][i] if results['metadatas'] else {}
            }
            
            # Extract tags from metadata
            if results['metadatas'] and results['metadatas'][i]:
                tags_str = results['metadatas'][i].get('tags', '')
                prompt_data['tags'] = tags_str.split(',') if tags_str else []
                prompt_data['category'] = results['metadatas'][i].get('category', 'general')
            else:
                prompt_data['tags'] = []
                prompt_data['category'] = 'general'
            
            # Filter by tags if specified
            if tags:
                if any(tag in prompt_data['tags'] for tag in tags):
                    prompts.append(prompt_data)
            else:
                prompts.append(prompt_data)
        
        return prompts
    
    def get_prompt_by_id(self, prompt_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a specific prompt by ID
        
        Args:
            prompt_id: The prompt ID
            
        Returns:
            Prompt data or None if not found
        """
        try:
            result = self.collection.get(ids=[prompt_id])
            
            if not result['ids']:
                return None
            
            metadata = result['metadatas'][0] if result['metadatas'] else {}
            tags_str = metadata.get('tags', '')
            
            return {
                "id": result['ids'][0],
                "prompt": result['documents'][0],
                "category": metadata.get('category', 'general'),
                "tags": tags_str.split(',') if tags_str else [],
                "metadata": metadata
            }
        except Exception:
            return None
    
    def update_prompt(
        self,
        prompt_id: str,
        prompt: Optional[str] = None,
        category: Optional[str] = None,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Update an existing RAG prompt
        
        Args:
            prompt_id: The prompt ID to update
            prompt: New prompt text (optional)
            category: New category (optional)
            tags: New tags (optional)
            metadata: New metadata (optional)
            
        Returns:
            Updated prompt info
        """
        # Get existing prompt
        existing = self.get_prompt_by_id(prompt_id)
        if not existing:
            raise ValueError(f"Prompt with ID '{prompt_id}' not found")
        
        # Prepare update data
        update_data = {"ids": [prompt_id]}
        
        if prompt:
            update_data["documents"] = [prompt]
        
        # Update metadata
        new_metadata = existing['metadata'].copy()
        new_metadata['updated_at'] = datetime.now().isoformat()
        
        if category:
            new_metadata['category'] = category
        
        if tags:
            new_metadata['tags'] = ",".join(tags)
        
        if metadata:
            new_metadata.update(metadata)
        
        update_data["metadatas"] = [new_metadata]
        
        # Update in collection
        self.collection.update(**update_data)
        
        return {
            "id": prompt_id,
            "prompt": prompt or existing['prompt'],
            "category": new_metadata.get('category', 'general'),
            "tags": new_metadata.get('tags', '').split(',') if new_metadata.get('tags') else [],
            "metadata": new_metadata,
            "message": "Prompt updated successfully"
        }
    
    def delete_prompt(self, prompt_id: str) -> Dict[str, str]:
        """
        Delete a RAG prompt
        
        Args:
            prompt_id: The prompt ID to delete
            
        Returns:
            Success message
        """
        # Check if prompt exists
        existing = self.get_prompt_by_id(prompt_id)
        if not existing:
            raise ValueError(f"Prompt with ID '{prompt_id}' not found")
        
        # Delete from collection
        self.collection.delete(ids=[prompt_id])
        
        return {
            "id": prompt_id,
            "message": "Prompt deleted successfully"
        }
    
    def delete_all_prompts(self, category: Optional[str] = None) -> Dict[str, Any]:
        """
        Delete all prompts or prompts in a specific category
        
        Args:
            category: Category to delete (if None, deletes all)
            
        Returns:
            Delete result
        """
        if category:
            # Get prompts in category
            prompts = self.get_prompts(category=category)
            ids = [p['id'] for p in prompts]
            
            if ids:
                self.collection.delete(ids=ids)
            
            return {
                "deleted_count": len(ids),
                "category": category,
                "message": f"Deleted {len(ids)} prompts from category '{category}'"
            }
        else:
            # Delete collection and recreate
            count = self.collection.count()
            self.chroma_client.delete_collection(name=self.collection_name)
            self._init_collection()
            
            return {
                "deleted_count": count,
                "message": f"Deleted all {count} prompts"
            }
    
    def get_all_prompts_as_context(
        self,
        category: Optional[str] = None,
        tags: Optional[List[str]] = None
    ) -> str:
        """
        Get all RAG prompts formatted as context string for AI
        
        Args:
            category: Filter by category
            tags: Filter by tags
            
        Returns:
            Formatted context string
        """
        prompts = self.get_prompts(category=category, tags=tags)
        
        if not prompts:
            return "No RAG prompts available."
        
        context_parts = ["=== RAG Prompts Context ===\n"]
        
        for i, prompt_data in enumerate(prompts, 1):
            context_parts.append(f"\n[Prompt {i}]")
            context_parts.append(f"Category: {prompt_data['category']}")
            if prompt_data['tags']:
                context_parts.append(f"Tags: {', '.join(prompt_data['tags'])}")
            context_parts.append(f"Content: {prompt_data['prompt']}")
        
        context_parts.append("\n=== End of RAG Prompts ===\n")
        
        return "\n".join(context_parts)
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get statistics about RAG prompts
        
        Returns:
            Statistics dictionary
        """
        all_prompts = self.get_prompts()
        
        # Count by category
        categories = {}
        for prompt in all_prompts:
            cat = prompt.get('category', 'general')
            categories[cat] = categories.get(cat, 0) + 1
        
        return {
            "total_prompts": len(all_prompts),
            "categories": categories,
            "collection_name": self.collection_name
        }
