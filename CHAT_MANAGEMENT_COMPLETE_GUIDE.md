## Complete Guide: AI Chat Management - Lấy Tất Cả Lịch Sử Chat

### Hệ Thống Quản Lý Chat AI

Trang quản lý chat AI `/admin/ai-agent-chat` giúp bạn:
- ✅ Xem tất cả lịch sử chat của tất cả users từ Redis
- ✅ Xem tất cả Chroma DB collections 
- ✅ Quản lý (xóa) sessions chat
- ✅ Debug và kiểm tra dữ liệu Redis

---

## Architecture

### Redis Data Structure (Chat History)
```
chat:user:{user_id}:session:{session_id}   ← Sorted Set chứa tất cả messages
  └─ Messages stored as JSON with timestamp score
  
Format key: chat:user:user-5:session:user-5-session-1766114062576
```

### Chroma DB Structure (Vector Storage)
```
Collections:
  - chat_ai_products    (lưu product data)
  - chat_ai_knowledge   (lưu knowledge base)
  - chat_ai_context     (lưu context cho AI)
```

---

## API Endpoints

### Main Endpoints (Quản Lý)

| Endpoint | Method | Mô Tả |
|----------|--------|-------|
| `/api/admin/chat-stats` | GET | Lấy thống kê (tổng users, sessions, messages) |
| `/api/admin/users-chat-history` | GET | Lấy lịch sử chat của TẤT CẢ users |
| `/api/admin/user/{user_id}/chat-history` | GET | Lấy lịch sử chat của một user |
| `/api/admin/user/{user_id}/sessions` | DELETE | Xóa tất cả sessions của user |
| `/api/admin/user/{user_id}/session/{session_id}` | DELETE | Xóa một session cụ thể |
| `/api/admin/clear-all-chat-data` | DELETE | Xóa TẤT CẢ chat data |
| `/api/admin/chroma-collections` | GET | Lấy tất cả Chroma collections |
| `/api/admin/chroma/collection/{name}` | GET/DELETE | Quản lý collection |

### Debug Endpoints (Kiểm Tra)

| Endpoint | Mô Tả |
|----------|-------|
| `/api/admin/debug/redis-status` | Kiểm tra Redis connection và statistics |
| `/api/admin/debug/all-data` | Xem tất cả dữ liệu chat từ Redis |

### Test Data

| Endpoint | Method | Mô Tả |
|----------|--------|-------|
| `/api/admin/test-data/populate` | POST | Tạo test data (3 users, nhiều sessions) |

---

## How to Use

### Step 1: Mở Trang Quản Lý
1. Đăng nhập với tài khoản ADMIN
2. Vào: `Admin Dashboard → Chat Agent` (hoặc `/admin/ai-agent-chat`)

### Step 2: Kiểm Tra Dữ Liệu

**Nếu không có dữ liệu:**
1. Scroll xuống, sẽ thấy "No chat data found"
2. Nhấn nút "📝 Populate Test Data"
3. Trang sẽ auto-reload và hiển thị test data

**Để Debug:**
1. Nhấn nút "🔍 Debug Redis" - Xem Redis connection status
2. Nhấn nút "📊 All Data" - Xem chi tiết tất cả dữ liệu

### Step 3: Quản Lý Chat History (Redis Tab)
- Thấy danh sách tất cả users với sessions của họ
- Click vào user để xem sessions
- Xóa individual sessions hoặc tất cả data của user
- Refresh data bằng nút "Refresh"

### Step 4: Quản Lý Collections (Chroma Tab)
- Xem tất cả Chroma collections
- Xem document count của mỗi collection
- Xóa individual collection hoặc tất cả

---

## Key Data Points

### Test Data Format
```json
{
  "user_id": "user-1001",
  "total_sessions": 2,
  "total_messages": 12,
  "sessions": [
    {
      "session_id": "user-1001-session-1",
      "message_count": 6,
      "created_at": "2025-12-19T10:30:00"
    }
  ]
}
```

### Redis Keys Pattern
```
chat:user:user-1001:session:user-1001-session-1         ← Sorted set messages
chat:user:user-1001:sessions                             ← Set of session IDs
```

### Message Storage (Redis Sorted Set)
```json
{
  "role": "user",
  "content": "Test message",
  "model": "groq/llama-3.1-8b-instant",
  "timestamp": "2025-12-19T10:30:00.123456",
  "user_id": "user-1001"
}
```

---

## Debug Process

### Nếu vẫn không thấy dữ liệu:

1. **Kiểm tra Redis Connection:**
   - Nhấn "🔍 Debug Redis"
   - Kiểm tra `redis_connected: true`
   - Xem `total_session_keys` > 0

2. **Kiểm tra tất cả dữ liệu:**
   - Nhấn "📊 All Data"
   - Sẽ hiển thị chi tiết tất cả sessions và messages

3. **Kiểm tra Backend Logs:**
   - Xem backend terminal
   - Tìm logs `[Admin Chat]` hoặc `[Admin Debug]`

4. **Test API trực tiếp:**
   ```bash
   # Test stats endpoint
   curl http://localhost:8000/api/admin/chat-stats
   
   # Populate test data
   curl -X POST http://localhost:8000/api/admin/test-data/populate
   
   # Get all users
   curl http://localhost:8000/api/admin/users-chat-history
   
   # Debug Redis
   curl http://localhost:8000/api/admin/debug/redis-status
   ```

---

## Common Issues & Solutions

### ❌ "No chat data found"

**Nguyên nhân:** Không có data trong Redis hoặc query sai format

**Giải pháp:**
1. Click "🔍 Debug Redis" để kiểm tra status
2. Click "📝 Populate Test Data" để tạo test data
3. Nhấn "Refresh" để reload

### ❌ "Redis connection error"

**Nguyên nhân:** Redis không chạy hoặc không kết nối được

**Giải pháp:**
1. Kiểm tra backend logs
2. Restart backend service
3. Kiểm tra Redis host/port trong environment

### ❌ "0 messages showing"

**Nguyên nhân:** Messages không được đếm đúng (đang fix từ message:* keys sang zcard)

**Giải pháp:**
1. Backend đã fix để dùng `zcard()` thay vì `keys("message:*")`
2. Restart backend
3. Populate test data lại

---

## Features Implemented

✅ **Redis Chat History Management**
- Lấy stats tất cả chats
- Lấy history của tất cả users
- Xóa individual sessions
- Xóa tất cả data của user
- Clear tất cả chat data

✅ **Chroma DB Management**
- Xem tất cả collections
- Xem document counts
- Xóa individual collections
- Clear tất cả Chroma data

✅ **Debug Features**
- Redis connection status
- Show all data endpoint
- Detailed logging
- Test data population

✅ **Frontend UI**
- Tab navigation (Redis/Chroma)
- Stats dashboard
- User search
- Session management
- Debug buttons
- Confirmation dialogs

---

## Testing Checklist

- [ ] Trang quản lý load thành công
- [ ] Click "📝 Populate Test Data" - tạo test data thành công
- [ ] Thấy danh sách users và sessions
- [ ] Stats dashboard hiển thị đúng số liệu
- [ ] Search users hoạt động
- [ ] Delete individual session hoạt động
- [ ] Delete all user data hoạt động
- [ ] Chroma tab hiển thị collections
- [ ] Debug Redis button hoạt động
- [ ] All Data button hiển thị chi tiết

---

## Architecture Diagram

```
Frontend (Next.js)
    ↓
/admin/ai-agent-chat
    ├─ Redis Tab (Chat History)
    │   ├─ Stats Dashboard
    │   ├─ User List
    │   └─ Session Management
    └─ Chroma Tab (Collections)
        ├─ Collection List
        └─ Collection Management
    ↓
Backend (FastAPI)
    ├─ /api/admin/chat-stats
    ├─ /api/admin/users-chat-history
    ├─ /api/admin/user/{id}/sessions
    ├─ /api/admin/chroma-collections
    ├─ /api/admin/debug/redis-status
    └─ /api/admin/debug/all-data
    ↓
Services
    ├─ RedisChatService
    │   └─ Redis (localhost:6379)
    └─ ChatAIRAGChromaService
        └─ Chroma DB (./chroma_chat_ai)
```

---

## Next Steps

1. **Verify tất cả dữ liệu hiển thị:**
   - Test với Populate Test Data
   - Kiểm tra tất cả sessions xuất hiện

2. **Test Delete Operations:**
   - Xóa individual sessions
   - Xóa tất cả user data
   - Clear all chat data

3. **Monitor Production:**
   - Kiểm tra logs khi có users chat
   - Verify sessions được lưu đúng format
   - Monitor Redis memory usage

4. **Optimization:**
   - Add pagination cho lớn data
   - Add export chat history
   - Add import chat data
   - Add chat search functionality

