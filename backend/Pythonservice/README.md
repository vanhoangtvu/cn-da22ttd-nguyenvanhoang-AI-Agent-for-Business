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

### File `.env`
```env
FLASK_APP=app.py
FLASK_ENV=development
PORT=5000
GOOGLE_API_KEY=your_api_key_here
```

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
