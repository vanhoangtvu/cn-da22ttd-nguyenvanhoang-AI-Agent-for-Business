# AI Chat - Trang Chat Chính của Hệ Thống

## 📋 Tổng Quan

Trang AI Chat là tính năng chính của hệ thống, cho phép người dùng:
- Chat với AI thông qua Groq API
- Lưu trữ lịch sử chat với Redis
- Quản lý nhiều sessions
- Xem lịch sử cuộc trò chuyện

## 📂 Vị Trí File

```
frontend/src/app/ai-chat/page.tsx    # Trang chat chính
```

## 🎨 Tính Năng

### 1. **Giao Diện Chủ Yếu**
- **Sidebar bên trái**: Quản lý sessions, tạo chat mới, xem lịch sử
- **Chat area chính**: Hiển thị messages và input
- **Top bar**: Lựa chọn model AI, thông tin session

### 2. **Chức Năng Chính**

#### Chat
- Gửi tin nhắn tới AI
- Nhận response từ Groq
- Messages tự động lưu vào Redis

#### Session Management
- Tạo cuộc trò chuyện mới (`+ Cuộc trò chuyện mới`)
- Chuyển giữa các sessions
- Hiển thị số message của mỗi session

#### History
- Xem toàn bộ lịch sử chat (modal)
- Lịch sử được tổ chức theo sessions
- Cho biết thời gian cuộc trò chuyện

#### User Features
- User ID được tạo tự động và lưu trong localStorage
- Session ID liên kết với user
- Toàn bộ chat history gắn với user_id

#### Xóa Lịch Sử
- Nút "🗑️ Xóa lịch sử" để xóa toàn bộ chat của user
- Xác nhận trước khi xóa

### 3. **Model Selection**
- Dropdown chọn model AI
- Động từ API (/api/groq-chat/models)
- Hỗ trợ nhiều models khác nhau

## 🔌 API Endpoints Được Sử Dụng

```
POST    /api/groq-chat/chat              # Gửi message
GET     /api/groq-chat/models            # Lấy danh sách models
GET     /api/groq-chat/history/{id}      # Lấy history của session
GET     /api/groq-chat/user/{id}/history # Lấy history của user
GET     /api/groq-chat/user/{id}/sessions # Lấy sessions của user
GET     /api/groq-chat/user/{id}/context/{sid} # Lấy context
DELETE  /api/groq-chat/user/{id}/history # Xóa history của user
```

## 💾 Data Structure

### Message Object
```json
{
  "role": "user" | "assistant",
  "content": "Message text",
  "model": "model-name",
  "timestamp": "ISO-8601",
  "user_id": "user-id"
}
```

### Session
```json
{
  "session_id": "session-id",
  "message_count": 10,
  "messages": [...]
}
```

### User History
```json
{
  "user_id": "user-id",
  "sessions": [{...}],
  "total_sessions": 5,
  "total_messages": 50
}
```

## 🔐 LocalStorage Keys

```javascript
user_id              // ID của user hiện tại
current_session_id   // Session ID đang active
```

## 🎯 User Flow

1. **Truy cập trang**: `/ai-chat`
2. **Tự động tạo user_id** nếu chưa có
3. **Tạo session mới** hoặc load session cũ
4. **Chat với AI**: Nhập message → Gửi → Nhận response
5. **Xem lịch sử**: Click "📋 Lịch sử"
6. **Chuyển session**: Click vào session trong sidebar
7. **Xóa lịch sử**: Click "🗑️ Xóa lịch sử"

## 🚀 Cách Sử Dụng

### Khởi chạy Frontend
```bash
cd frontend
npm run dev
```

### Truy cập
```
http://localhost:3000/ai-chat
```

## 🎨 Styling

- **Dark Mode**: Slate color scheme (dark background)
- **Responsive**: Hoạt động trên mobile, tablet, desktop
- **Animations**: Smooth transitions, loading spinner
- **Gradients**: Blue-to-indigo gradients

## 📱 Responsive Design

- **Mobile**: Full width, sidebar có thể toggle
- **Tablet**: Adapted layout
- **Desktop**: Full sidebar + main area

## ⚙️ Configuration

### API Base URL
```javascript
http://14.164.29.11:5000/api/groq-chat
```

### Default Model
```javascript
openai/gpt-oss-20b
```

### Limit Context
```javascript
20 messages (default)
```

## 🔧 Customization

### Thay đổi API URL
File: `frontend/src/app/ai-chat/page.tsx`
```typescript
const response = await fetch('http://14.164.29.11:5000/api/groq-chat/chat', {
  // ...
});
```

### Thay đổi Model Mặc Định
```typescript
const [selectedModel, setSelectedModel] = useState<string>('openai/gpt-oss-20b');
```

### Thay đổi Context Limit
```typescript
const limit = 20;  // Thay đổi số này
```

## 🐛 Debugging

### Xem localStorage
```javascript
localStorage.getItem('user_id')
localStorage.getItem('current_session_id')
```

### Clear localStorage
```javascript
localStorage.clear()
```

### Network Debugging
- Mở DevTools (F12)
- Tab Network để xem API calls
- Tab Console để xem errors

## 🔗 Integration Points

### Homepage (`page.tsx`)
- Added AI Chat button in header
- Icon: Sparkles (✨)
- Link: `/ai-chat`

### Navigation
- Accessible từ header
- Full page mode (not a widget)

## 📊 Performance

- **Message loading**: Instant (from Redis)
- **API calls**: ~500ms-1s per message
- **History retrieval**: ~200ms
- **UI updates**: Real-time with React hooks

## 🚨 Error Handling

- Network errors: Shows error message
- API errors: Displays error notification
- Missing user_id: Auto-generates new one
- Missing session: Creates new session

## 🔄 Real-time Updates

Messages are updated in real-time using:
- useState hooks
- useRef for auto-scroll
- useEffect for side effects

## 📝 Future Enhancements

- [ ] Voice input/output
- [ ] Message search
- [ ] Export conversations
- [ ] Share sessions
- [ ] Collaborative chat
- [ ] Image upload
- [ ] Code syntax highlighting
- [ ] Typing indicators
