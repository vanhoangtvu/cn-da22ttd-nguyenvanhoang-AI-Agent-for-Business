# 📄 Document Processing Service

Hệ thống xử lý tài liệu doanh nghiệp tự động với AI search capabilities cho Python API Service.

## 🎯 Tổng quan

Document Processing Service là thành phần cốt lõi của hệ thống AI Agent for Business, cho phép:

- **Tự động xử lý** tài liệu từ nhiều định dạng khác nhau
- **Vectorize và lưu trữ** trong ChromaDB cho AI search
- **Tích hợp hoàn chỉnh** với analytics AI
- **Workflow tự động** từ upload đến AI insights

## 🔄 Kiến trúc hệ thống

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Spring Service │───▶│  Python API      │───▶│   ChromaDB       │
│   (File Upload)  │    │  (Processing)    │    │  (Vector Store)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Analytics AI   │
                       │   (Search &      │
                       │    Insights)     │
                       └─────────────────┘
```

## 📋 Tính năng chi tiết

### 🎯 Document Processing Core

#### 1. **Multi-Format Support**
- **PDF**: PyPDF2 - Extract text từ tất cả pages
- **DOCX**: python-docx - Tables, paragraphs, formatting
- **XLSX/XLS**: pandas + openpyxl - Multi-sheet, data analysis
- **CSV**: pandas - Column detection, data preview
- **TXT**: Built-in - Auto-encoding (UTF-8, Latin-1)

#### 2. **Intelligent File Detection**
```python
def _detect_file_type(self, file_path: str, mime_type: str) -> str:
    # MIME type mapping
    mime_mapping = {
        'application/pdf': 'pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'text/csv': 'csv',
        'text/plain': 'txt'
    }
    # Fallback to file extension
```

#### 3. **Smart Path Resolution**
```python
def resolve_spring_file_path(relative_path):
    # Auto-resolve Spring Service paths
    possible_paths = [
        '../SpringService/' + relative_path,
        '/absolute/path/to/SpringService/' + relative_path,
        os.getenv('SPRING_UPLOAD_PATH') + relative_path
    ]
```

### 📊 ChromaDB Integration

#### Collections Architecture
```python
# Analytics RAG Service Collections
self.business_data_collection_name = "business_data"
self.orders_analytics_collection_name = "orders_analytics"
self.trends_collection_name = "trends"
self.business_documents_collection_name = "business_documents"  # NEW
```

#### Document Storage Structure
```json
{
  "id": "document_1",
  "content": "DOCUMENT CONTENT:\n--- Sheet: Sheet1 ---\nProduct data...",
  "metadata": {
    "data_type": "document",
    "document_id": "1",
    "business_id": "1",
    "business_username": "admin",
    "file_name": "gia ca thi truong.xlsx",
    "file_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "file_path_original": "uploads/documents/74b81f04-b087-46a5-936b-84d7d01739e6.xlsx",
    "file_path_resolved": "/full/path/to/file.xlsx",
    "file_size": 11205,
    "description": "Gia ca thi truong",
    "uploaded_at": "2025-12-14T22:41:25.121531",
    "stored_at": "2025-12-14T22:53:52.995152",
    "extraction_success": true,
    "content_length": 5356,
    "processing_timestamp": "2025-12-14T22:53:52.995164",
    "excel_sheets": "[{\"name\": \"Sheet1\", \"rows\": 54, \"columns\": 4}]"
  }
}
```

### 🤖 AI Integration

#### Search Business Data
```python
def search_business_data(self, query: str, data_type: Optional[str] = None, n_results: int = 10):
    search_collections = [
        'products', 'orders', 'categories', 'business', 'users',
        'business_documents'  # Include documents in AI search
    ]
```

#### Analytics API Integration
```python
@router.post("/analyze")
async def analyze_business_data(request: AnalyticsRequest):
    # Gather relevant data including documents
    business_data = analytics_rag_service.search_business_data(
        query=request.query,
        n_results=10
    )
    # AI processes both structured data and document content
```

## 🚀 API Endpoints

### 1. Process Single Document
```http
POST /api/analytics/process-document
Content-Type: application/json

{
  "file_path": "/path/to/document.xlsx",
  "business_id": "biz_123",
  "business_username": "company_name",
  "file_name": "market_prices.xlsx",
  "file_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "description": "Market price reference data"
}
```

**Response:**
```json
{
  "success": true,
  "document_id": "doc_biz_123_1640995200",
  "content_length": 15432,
  "metadata": {
    "business_id": "biz_123",
    "file_name": "market_prices.xlsx",
    "extraction_success": true,
    "content_length": 15432,
    "excel_sheets": "[{\"name\": \"Sheet1\", \"rows\": 54, \"columns\": 4}]"
  },
  "message": "Tài liệu đã được xử lý và lưu thành công"
}
```

### 2. Auto Sync from Spring Service
```http
POST /api/analytics/sync-from-spring
Content-Type: application/json

{
  "spring_service_url": "http://localhost:8089/api/v1",
  "auth_token": "jwt_token",
  "clear_existing": false
}
```

**Auto Processing:**
- Detect `businessDocuments` in Spring response
- Resolve file paths automatically
- Process each document based on MIME type
- Store in `business_documents` collection
- Update sync statistics

### 3. AI Analytics with Documents
```http
POST /api/analytics/analyze
Content-Type: application/json

{
  "query": "so sánh giá iPhone với thị trường",
  "data_types": ["business"],
  "model": "gemini-2.5-flash"
}
```

**AI Response includes:**
- Pricing data from uploaded Excel files
- Market comparison insights
- Business intelligence from documents
- Cross-referenced analytics

## 🔧 Technical Implementation

### Dependencies
```txt
# Core processing
PyPDF2==3.0.1
python-docx==1.1.0
pandas==2.1.4
openpyxl==3.1.2

# Vector database
chromadb==0.4.22

# FastAPI
fastapi==0.109.0
pydantic==2.5.3
```

### Error Handling
```python
try:
    extracted_text, metadata = doc_processor.extract_text_from_file(file_path, file_type)
    if not metadata.get("extraction_success"):
        # Fallback content
        extracted_text = f"Error extracting content: {metadata.get('error')}"
except Exception as e:
    # Complete failure handling
    extracted_text = f"Processing failed: {str(e)}"
```

### Performance Optimization
- **Batch Processing**: Process multiple documents efficiently
- **Memory Management**: Stream processing for large files
- **Caching**: File path resolution caching
- **Async Processing**: Non-blocking document processing

## 📊 Monitoring & Analytics

### Collection Statistics
```bash
GET /api/analytics/stats
```
```json
{
  "business_documents": {
    "count": 5,
    "total_content_length": 125000,
    "extraction_success_rate": 0.95,
    "average_processing_time": 2.3
  }
}
```

### Processing Metrics
- **Success Rate**: Percentage of successful extractions
- **Processing Time**: Average time per document
- **File Size Distribution**: Statistics on document sizes
- **Format Distribution**: Breakdown by file type

## 🔍 Troubleshooting

### Common Issues

#### 1. File Not Found
```
Error: File not found during sync process
Solution: Check Spring Service upload directory path
```

#### 2. Unsupported Format
```
Error: Không hỗ trợ định dạng file
Solution: Verify MIME type mapping in _detect_file_type()
```

#### 3. Extraction Failed
```
Error: PDF extraction error
Solution: Check file corruption or use alternative library
```

#### 4. AI Not Finding Documents
```
Issue: AI search returns no document results
Solution: Verify 'business_documents' in search_collections array
```

### Debug Commands
```bash
# Test document processing
python3 -c "
from services.document_processing_service import get_document_processor
processor = get_document_processor()
text, meta = processor.extract_text_from_file('test.xlsx', 'xlsx')
print(f'Success: {meta[\"extraction_success\"]}, Length: {len(text)}')
"

# Test ChromaDB search
python3 -c "
from services.analytics_rag_service import AnalyticsRAGService
rag = AnalyticsRAGService()
results = rag.search_business_data('giá thị trường')
print(f'Found {len(results)} results from documents')
"
```

## 🚀 Future Enhancements

### Planned Features
- **OCR Support**: Image-based PDF processing
- **Multi-language**: Enhanced encoding support
- **Document Classification**: Auto-categorize documents
- **Version Control**: Track document changes
- **Advanced Search**: Semantic search with filters
- **Real-time Processing**: WebSocket-based progress updates

### Performance Improvements
- **GPU Acceleration**: CUDA-based text processing
- **Distributed Processing**: Multi-worker document processing
- **Caching Layer**: Redis-based metadata caching
- **Compression**: Optimized storage for large documents

---

## 📞 Support

For technical issues or feature requests:
- Check logs in `/backend/Pythonservice/logs/`
- Verify file permissions on upload directories
- Test with sample documents of each format
- Monitor ChromaDB collection statistics

---

*Document Processing Service v1.0 - AI Agent for Business*</content>
<parameter name="filePath">/home/hv/DuAn/CSN/AI-Agent-for-Business/backend/Pythonservice/README_DOCUMENT_PROCESSING.md