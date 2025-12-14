# Python API Service - Gemini AI & ChromaDB

API service tích hợp Google Gemini AI và ChromaDB vector database với Swagger documentation.

## 🌐 Public Access

**API URL:** `http://14.183.200.75:5000`

**Swagger Documentation:** `http://14.183.200.75:5000/docs`

**Test Stream Chat:** Mở file `test_stream.html` trong trình duyệt

---

## 🚀 Cài đặt

### 1. Tạo virtual environment:
```bash
python3 -m venv venv
```

### 2. Chạy server:
```bash
./start.sh
```

Script sẽ tự động:
- Kiểm tra và tạo virtual environment
- Cài đặt dependencies
- Load biến môi trường từ `.env`
- Khởi động Flask server

---

## 📚 API Endpoints

### 🔍 Health Check
- **GET** `/health/` - Kiểm tra trạng thái API

### 🤖 Gemini AI
- **GET** `/gemini/models` - Danh sách các Gemini models có sẵn
- **POST** `/gemini/chat` - Chat với Gemini (response đầy đủ)
- **POST** `/gemini/chat/stream` - Chat với Gemini (streaming response)
- **POST** `/gemini/chat/rag` - Chat với Gemini sử dụng RAG prompts
- **POST** `/gemini/chat/rag/stream` - Chat RAG với streaming

### 🎯 RAG Prompts Management
- **POST** `/rag/prompts` - Thêm RAG prompt mới
- **GET** `/rag/prompts` - Xem tất cả RAG prompts
- **GET** `/rag/prompts/{id}` - Xem prompt theo ID
- **PUT** `/rag/prompts/{id}` - Cập nhật prompt
- **DELETE** `/rag/prompts/{id}` - Xóa prompt
- **DELETE** `/rag/prompts?category={name}` - Xóa prompts theo category
- **GET** `/rag/stats` - Thống kê RAG prompts

### 💾 ChromaDB
- **GET** `/chroma/collections` - Danh sách collections
- **GET** `/chroma/collection/{name}` - Xem dữ liệu trong collection
- **DELETE** `/chroma/collection/{name}` - Xóa collection
- **POST** `/chroma/documents` - Thêm documents vào collection
- **POST** `/chroma/query` - Tìm kiếm trong collection

### 📊 Business Analytics
- **POST** `/api/analytics/analyze` - Phân tích dữ liệu kinh doanh với AI
- **POST** `/api/analytics/sync-from-spring` - Đồng bộ dữ liệu từ Spring Service
- **POST** `/api/analytics/process-document` - Xử lý tài liệu doanh nghiệp
- **GET** `/api/analytics/data/all` - Lấy tất cả dữ liệu analytics
- **GET** `/api/analytics/stats` - Thống kê ChromaDB collections

---

## 📄 Document Processing Service

Hệ thống xử lý tài liệu doanh nghiệp tự động với AI search capabilities.

### 🎯 Tính năng chính

- **Đa dạng định dạng**: PDF, DOCX, XLSX, XLS, CSV, TXT
- **Trích xuất thông minh**: Tự động detect MIME type và xử lý phù hợp
- **Lưu trữ vector**: Documents được vectorize và lưu trong ChromaDB
- **AI Search**: Tích hợp với analytics AI để tìm kiếm nội dung
- **Metadata đầy đủ**: Lưu trữ thông tin file, processing status, timestamps

### 🔄 Workflow xử lý tài liệu

```
Upload File → Spring Service → Sync API → DocumentProcessor → 
Extract Text → ChromaDB (business_documents) → AI Search
```

### 📋 Định dạng hỗ trợ

| Định dạng | MIME Type | Tính năng đặc biệt |
|-----------|-----------|-------------------|
| **PDF** | `application/pdf` | Extract text từ tất cả pages |
| **DOCX** | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | Tables, paragraphs |
| **XLSX/XLS** | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | Multiple sheets, data analysis |
| **CSV** | `text/csv` | Column detection, data preview |
| **TXT** | `text/plain` | Encoding detection (UTF-8, Latin-1) |

### 🚀 Sử dụng

#### Xử lý tài liệu riêng lẻ

```bash
curl -X POST http://14.183.200.75:5000/api/analytics/process-document \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "/path/to/document.xlsx",
    "business_id": "biz_123",
    "business_username": "company_name",
    "file_name": "market_prices.xlsx",
    "file_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "description": "Market price reference"
  }'
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
    "content_length": 15432
  },
  "message": "Tài liệu đã được xử lý và lưu thành công"
}
```

#### Đồng bộ từ Spring Service

```bash
curl -X POST http://14.183.200.75:5000/api/analytics/sync-from-spring \
  -H "Content-Type: application/json" \
  -d '{
    "spring_service_url": "http://localhost:8089/api/v1",
    "auth_token": "your_jwt_token",
    "clear_existing": false
  }'
```

**Tự động xử lý:**
- ✅ Phát hiện documents trong `businessDocuments`
- ✅ Resolve đường dẫn file từ Spring Service
- ✅ Extract text content từ tất cả files
- ✅ Lưu vào `business_documents` collection
- ✅ Cập nhật metadata và processing status

#### AI Search trong documents

```bash
curl -X POST http://14.183.200.75:5000/api/analytics/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "query": "giá thị trường iPhone",
    "data_types": ["business"],
    "model": "gemini-2.5-flash"
  }'
```

**AI sẽ tự động:**
- 🔍 Search trong `business_documents` collection
- 📊 Analyze pricing data từ Excel files
- 💡 Generate insights về market prices
- 📈 Compare với business data khác

### 📊 ChromaDB Collections

| Collection | Mục đích | Data Types |
|------------|----------|------------|
| `business_data` | Products, categories, business metrics | JSON objects |
| `orders_analytics` | Order data và patterns | JSON objects |
| `trends` | Business trends và insights | JSON objects |
| `business_documents` | **Documents đã xử lý** | **Extracted text + metadata** |
| `revenue_overview` | Revenue statistics | JSON objects |

### 🔧 Cấu hình Document Processing

#### Dependencies cần thiết
```txt
PyPDF2==3.0.1          # PDF processing
python-docx==1.1.0     # Word documents
pandas==2.1.4          # Excel/CSV processing
openpyxl==3.1.2        # Excel file support
```

#### File Path Resolution
- **Spring Service**: Lưu đường dẫn tương đối `uploads/documents/filename.xlsx`
- **Python Service**: Tự động resolve thành đường dẫn tuyệt đối
- **Fallback**: Tìm trong thư mục hiện tại nếu không tìm thấy

#### Error Handling
- **File not found**: Fallback với metadata-only content
- **Unsupported format**: Skip với error logging
- **Extraction failed**: Lưu error message trong content
- **Processing status**: Tracked trong metadata

### 📈 Monitoring & Stats

```bash
# Xem thống kê ChromaDB
curl http://14.183.200.75:5000/api/analytics/stats

# Response
{
  "business_documents": {
    "count": 5,
    "total_content_length": 125000,
    "extraction_success_rate": 0.95
  },
  "business_data": {
    "count": 156,
    "collections": ["products", "categories", "users"]
  }
}
```

**📖 Chi tiết Document Processing:** [`README_DOCUMENT_PROCESSING.md`](./README_DOCUMENT_PROCESSING.md)

---

## 📖 Hướng dẫn sử dụng

### Chat với Gemini AI

**Chat bình thường:**
```bash
curl -X POST http://14.183.200.75:5000/gemini/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Xin chào, bạn là ai?",
    "model": "gemini-2.5-flash"
  }'
```

**Chat streaming:**
```bash
curl -N -X POST http://14.183.200.75:5000/gemini/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Viết một câu chuyện ngắn",
    "model": "gemini-2.5-flash"
  }'
```

### ChromaDB - Thêm documents

```bash
curl -X POST http://14.183.200.75:5000/chroma/documents \
  -H "Content-Type: application/json" \
  -d '{
    "collection_name": "my_docs",
    "documents": [
      "Python là ngôn ngữ lập trình phổ biến",
      "JavaScript được sử dụng cho web development"
    ],
    "metadatas": [
      {"source": "wiki", "category": "programming"},
      {"source": "wiki", "category": "web"}
    ]
  }'
```

### ChromaDB - Tìm kiếm

```bash
curl -X POST http://14.183.200.75:5000/chroma/query \
  -H "Content-Type: application/json" \
  -d '{
    "collection_name": "my_docs",
    "query_texts": ["ngôn ngữ lập trình"],
    "n_results": 5
  }'
```

### ChromaDB - Xem tất cả collections

```bash
curl http://14.183.200.75:5000/chroma/collections
```

### RAG Prompts - Thêm prompt

```bash
curl -X POST http://14.183.200.75:5000/rag/prompts \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Always greet users warmly and professionally",
    "category": "greeting",
    "tags": ["customer-service", "friendly"]
  }'
```

### RAG Prompts - Xem prompts

```bash
# Xem tất cả
curl http://14.183.200.75:5000/rag/prompts

# Lọc theo category
curl "http://14.183.200.75:5000/rag/prompts?category=greeting"

# Xem thống kê
curl http://14.183.200.75:5000/rag/stats
```

### Chat với RAG (AI sử dụng prompts đã lưu)

```bash
curl -X POST http://14.183.200.75:5000/gemini/chat/rag \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, how are you?",
    "model": "gemini-2.5-flash"
  }'
```

---

## 🔧 Cấu hình
# AI API Keys (Shared between customer chat and analytics)
GOOGLE_API_KEY=
GROQ_API_KEY=

# Server Configuration
SERVER_HOST=0.0.0.0
SERVER_PORT=5000
SERVER_IP=14.183.200.75

# Spring Service Configuration
SPRING_SERVICE_HOST=14.183.200.75
SPRING_SERVICE_PORT=8089
SPRING_SERVICE_URL=http://14.183.200.75:8089/api/v1

# ChromaDB Paths (Separated databases)
CHROMA_CUSTOMER_PATH=./chroma_customer
CHROMA_ANALYTICS_PATH=./chroma_analytics
### Cấu trúc thư mục
```
backend/Pythonservice/
├── app.py              # Main application
├── routes/             # API routes
│   ├── health.py       # Health check
│   ├── gemini.py       # Gemini AI endpoints
│   ├── chroma.py       # ChromaDB endpoints
│   └── rag.py          # RAG Prompts endpoints
├── services/           # Business logic
│   └── rag_prompt_service.py  # RAG prompts management
├── chroma_analytics/    # Unified ChromaDB storage for all business data and analytics
├── requirements.txt    # Dependencies
├── start.sh           # Start script
├── test_stream.html   # Test streaming chat
├── README.md          # Main documentation
├── README_DOCUMENT_PROCESSING.md  # Document processing guide
└── README_RAG.md      # RAG system detailed guide
```

---

## 🌟 Models Available

- **gemini-2.5-flash** - Nhanh nhất, phù hợp cho chat
- **gemini-2.5-pro** - Mạnh nhất, phù hợp cho tác vụ phức tạp
- **gemini-2.0-flash** - Ổn định

---

## 🔐 CORS

API đã được cấu hình CORS để cho phép truy cập từ mọi origin.

---

## 🎯 RAG System

Hệ thống RAG (Retrieval-Augmented Generation) cho phép quản lý prompts cho AI:

1. **Push prompts** vào ChromaDB qua API
2. **Quản lý prompts** (thêm, sửa, xóa, xem)
3. **Chat với RAG** - AI tự động áp dụng prompts khi trả lời

**Xem chi tiết:** [`README_RAG.md`](./README_RAG.md)

### Workflow cơ bản:
1. Push prompts: `POST /rag/prompts`
2. Xem prompts: `GET /rag/prompts`
3. Chat với AI: `POST /gemini/chat/rag` (AI sẽ follow prompts)

---

## 📝 Notes

- ChromaDB data được lưu trong thư mục `./chroma_data` và `./chroma_analytics`
- RAG prompts được lưu trong collection `rag_prompts`
- Gemini models list được cache khi khởi động server
- Streaming sử dụng Server-Sent Events (SSE)
- API key Gemini được load từ biến môi trường

---

## 🆘 Troubleshooting

**Lỗi NumPy:**
```bash
./venv/bin/pip install "numpy<2.0.0" --force-reinstall
```

**Server không khởi động:**
- Kiểm tra port 5000 có bị chiếm không
- Kiểm tra API key Gemini trong `.env`

**CORS error:**
- Đảm bảo server đang chạy
- Kiểm tra URL trong code frontend
