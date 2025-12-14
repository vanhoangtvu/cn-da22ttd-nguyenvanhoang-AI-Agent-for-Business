# API Endpoints - Kiến Trúc Tách Biệt

## 🎯 KIẾN TRÚC MỚI (app_new.py)

### 1️⃣ **Customer Chat APIs** - `/api/customer/*`
*Database: chroma_customer/*

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/customer/chat` | Chat với AI (có RAG) |
| POST | `/api/customer/prompts` | Thêm hướng dẫn trả lời |
| POST | `/api/customer/products` | Thêm thông tin sản phẩm |
| POST | `/api/customer/products/search` | Tìm kiếm sản phẩm |
| GET | `/api/customer/stats` | Xem thống kê customer service |

### 2️⃣ **Business Analytics APIs** - `/api/analytics/*`
*Database: chroma_analytics/*

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/analytics/analyze` | Phân tích dữ liệu kinh doanh |
| POST | `/api/analytics/data` | Lưu dữ liệu kinh doanh |
| POST | `/api/analytics/orders` | Lưu dữ liệu đơn hàng |
| POST | `/api/analytics/trends` | Lưu xu hướng kinh doanh |
| POST | `/api/analytics/sync-from-spring` | Đồng bộ dữ liệu từ Spring Service (tự động xử lý documents) |
| POST | `/api/analytics/process-document` | Xử lý tài liệu doanh nghiệp và lưu vào ChromaDB |
| GET | `/api/analytics/data/all` | Lấy tất cả dữ liệu analytics |
| GET | `/api/analytics/stats` | Xem thống kê analytics |
| GET | `/api/analytics/models` | Xem AI models có sẵn |

### 📄 Document Processing APIs

**Collection Target:** `business_documents` (ChromaDB)

#### Xử lý tài liệu riêng lẻ
| Method | Endpoint | Request Body | Response |
|--------|----------|--------------|----------|
| **POST** | `/api/analytics/process-document` | ```json<br>{<br>  "file_path": "path/to/file.xlsx",<br>  "business_id": "biz_123",<br>  "business_username": "company",<br>  "file_name": "prices.xlsx",<br>  "file_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",<br>  "description": "Market prices"<br>}``` | ```json<br>{<br>  "success": true,<br>  "document_id": "doc_biz_123_123456",<br>  "content_length": 15432,<br>  "message": "Processed successfully"<br>}``` |

#### Đồng bộ tự động (từ Spring Service)
| Method | Endpoint | Auto Processing |
|--------|----------|----------------|
| **POST** | `/api/analytics/sync-from-spring` | ✅ Tự động detect và xử lý tất cả documents<br>✅ Extract text từ PDF, Excel, Word<br>✅ Lưu vào `business_documents` collection<br>✅ AI có thể search ngay lập tức |

#### Định dạng file hỗ trợ
| Format | MIME Type | Processing Features |
|--------|-----------|-------------------|
| **PDF** | `application/pdf` | Multi-page text extraction |
| **Excel** | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | Multi-sheet, data analysis |
| **Word** | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | Tables, formatting |
| **CSV** | `text/csv` | Column detection, data preview |
| **Text** | `text/plain` | Auto-encoding detection |

### 🎯 AI Integration

**Analytics AI tự động sử dụng documents:**
```bash
POST /api/analytics/analyze
{
  "query": "so sánh giá iPhone với thị trường",
  "data_types": ["business"]
}
```

**AI Workflow:**
1. 🔍 Search `business_documents` collection
2. 📊 Extract pricing data từ Excel files  
3. 💡 Generate market comparison insights
4. 📈 Cross-reference với business data khác

### 📊 ChromaDB Architecture

| Collection | Purpose | Data Structure | AI Access |
|------------|---------|----------------|-----------|
| `business_data` | Products, categories, metrics | JSON objects | ✅ Searchable |
| `orders_analytics` | Order patterns & analytics | JSON objects | ✅ Searchable |
| `business_documents` | **Processed documents** | **Extracted text + metadata** | ✅ **AI Search** |
| `trends` | Business insights | JSON objects | ✅ Searchable |
| `revenue_overview` | Revenue statistics | JSON objects | ✅ Searchable |

### 3️⃣ **System APIs** (Backward Compatibility)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/` | API info |
| GET | `/api/status` | System status |
| GET | `/health` | Health check |
| GET | `/ai-config/*` | AI configuration |

---

## 🗂️ KIẾN TRÚC CŨ (app.py) - BACKUP

### Routes cũ (KHÔNG dùng trong production mới):

**Gemini** - `/gemini/*`
- GET `/gemini/models` - List Gemini models
- POST `/gemini/chat` - Chat with Gemini
- POST `/gemini/chat/stream` - Streaming chat
- POST `/gemini/chat/rag` - Chat with RAG
- POST `/gemini/chat/rag/stream` - RAG streaming

**Groq** - `/groq/*`
- GET `/groq/models` - List Groq models
- POST `/groq/chat` - Chat with Groq
- POST `/groq/chat/stream` - Streaming chat
- POST `/groq/chat/rag` - Chat with RAG
- POST `/groq/chat/rag/stream` - RAG streaming
- GET `/groq/health` - Health check

**RAG Prompts** - `/rag/*`
- POST `/rag/prompts` - Push RAG prompt
- GET `/rag/prompts` - Get RAG prompts
- GET `/rag/prompts/{id}` - Get prompt by ID
- PUT `/rag/prompts/{id}` - Update prompt
- DELETE `/rag/prompts/{id}` - Delete prompt
- DELETE `/rag/prompts` - Delete all
- GET `/rag/stats` - Get stats

**Chat History** - `/chat-history/*`
- POST `/chat-history/messages` - Save message
- GET `/chat-history/sessions/{id}` - Get session
- DELETE `/chat-history/sessions/{id}` - Delete session
- POST `/chat-history/search` - Search conversations
- GET `/chat-history/users/{id}/sessions` - User sessions
- GET `/chat-history/stats` - Get stats
- GET `/chat-history/all-sessions` - All sessions

**ChromaDB** - `/chroma/*`
- GET `/chroma/collections` - List collections
- GET `/chroma/collection/{name}` - Get collection
- DELETE `/chroma/collection/{name}` - Delete collection
- POST `/chroma/documents` - Add documents
- POST `/chroma/query` - Query documents

**Business Analytics (Old)** - `/analytics/*`
- GET `/analytics/models` - Get models
- GET `/analytics/data` - Get data
- POST `/analytics/ai-insights` - AI insights

---

## ✅ So Sánh

| Feature | Cũ (app.py) | Mới (app_new.py) |
|---------|-------------|------------------|
| **Customer Chat** | `/gemini/*`, `/groq/*`, `/rag/*` | `/api/customer/*` |
| **Analytics** | `/analytics/*` | `/api/analytics/*` |
| **Database** | Data (`chroma_data`) + Analytics (`chroma_analytics`) | Unified (`chroma_analytics`) |
| **Clarity** | ❌ Phức tạp, lẫn lộn | ✅ Rõ ràng, đơn giản |
| **Scalability** | ❌ Khó scale riêng | ✅ Dễ scale từng service |

---

## 🚀 Sử Dụng

### Production (Dùng app_new.py):
\`\`\`bash
python app_new.py

# Access:
http://14.183.200.75:5000/api/customer/chat
http://14.183.200.75:5000/api/analytics/analyze
http://14.183.200.75:5000/docs
\`\`\`

### Backup (app.py cũ):
\`\`\`bash
python app.py

# Access old endpoints nếu cần
\`\`\`
