from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

# Create router
router = APIRouter()

# Global variable for chroma client (will be set from app.py)
chroma_client = None

def set_chroma_client(client):
    """Set the ChromaDB client"""
    global chroma_client
    chroma_client = client

# Pydantic models
class CollectionInfo(BaseModel):
    name: str
    count: int

class DocumentInput(BaseModel):
    collection_name: str = Field(..., description="Collection name")
    documents: List[str] = Field(..., description="List of documents to add")
    metadatas: Optional[List[Dict[str, Any]]] = Field(None, description="List of metadata objects")
    ids: Optional[List[str]] = Field(None, description="List of document IDs")

class QueryInput(BaseModel):
    collection_name: str = Field(..., description="Collection name")
    query_texts: List[str] = Field(..., description="Query texts")
    n_results: int = Field(default=5, description="Number of results")

class CollectionData(BaseModel):
    collection_name: str
    count: int
    ids: List[str]
    documents: List[str]
    metadatas: Optional[List[Dict[str, Any]]]

class DocumentResponse(BaseModel):
    message: str
    collection_name: str
    count: int

class QueryResponse(BaseModel):
    collection_name: str
    results: Dict[str, Any]

class DeleteResponse(BaseModel):
    message: str


@router.get("/collections", response_model=List[CollectionInfo], summary="List collections")
async def list_collections():
    """Get all ChromaDB collections"""
    try:
        collections = chroma_client.list_collections()
        return [
            {
                'name': col.name,
                'count': col.count()
            }
            for col in collections
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Error listing collections: {str(e)}')


@router.get("/collection/{collection_name}", response_model=CollectionData, summary="Get collection")
async def get_collection(collection_name: str):
    """Get all documents from a collection"""
    try:
        collection = chroma_client.get_or_create_collection(name=collection_name)
        data = collection.get()
        return {
            'collection_name': collection_name,
            'count': collection.count(),
            'ids': data['ids'],
            'documents': data['documents'],
            'metadatas': data['metadatas']
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Error getting collection: {str(e)}')


@router.delete("/collection/{collection_name}", response_model=DeleteResponse, summary="Delete collection")
async def delete_collection(collection_name: str):
    """Delete a collection"""
    try:
        chroma_client.delete_collection(name=collection_name)
        return {'message': f'Collection {collection_name} deleted successfully'}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Error deleting collection: {str(e)}')


@router.post("/documents", response_model=DocumentResponse, status_code=201, summary="Add documents")
async def add_documents(document_input: DocumentInput):
    """Add documents to a collection"""
    try:
        if not document_input.documents:
            raise HTTPException(status_code=400, detail='Documents are required')
        
        # Generate IDs if not provided
        ids = document_input.ids
        if not ids:
            ids = [f"doc_{i}" for i in range(len(document_input.documents))]
        
        collection = chroma_client.get_or_create_collection(name=document_input.collection_name)
        collection.add(
            documents=document_input.documents,
            metadatas=document_input.metadatas,
            ids=ids
        )
        
        return {
            'message': f'Added {len(document_input.documents)} documents to {document_input.collection_name}',
            'collection_name': document_input.collection_name,
            'count': collection.count()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Error adding documents: {str(e)}')


@router.post("/query", response_model=QueryResponse, summary="Query documents")
async def query_documents(query_input: QueryInput):
    """Query documents from a collection"""
    try:
        if not query_input.query_texts:
            raise HTTPException(status_code=400, detail='Query texts are required')
        
        collection = chroma_client.get_or_create_collection(name=query_input.collection_name)
        results = collection.query(
            query_texts=query_input.query_texts,
            n_results=query_input.n_results
        )
        
        return {
            'collection_name': query_input.collection_name,
            'results': results
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Error querying documents: {str(e)}')
