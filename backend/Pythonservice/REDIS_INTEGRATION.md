# Redis Chat History Integration

## Overview
The Groq Chat service now persists all chat messages to Redis, enabling users to maintain chat history across sessions.

## Configuration

### Environment Variables
Add these to your `.env` file:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=                    # Leave empty if no password
CHAT_HISTORY_TTL=86400             # 24 hours (in seconds)
```

### Starting Redis

**Option 1: Using Docker**
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

**Option 2: Local Installation**
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis-server

# Windows (using WSL or Docker recommended)
```

## API Endpoints

### 1. Chat with Session Persistence
**Endpoint:** `POST /api/groq-chat/chat`

```json
{
    "message": "What is Python?",
    "model": "openai/gpt-oss-20b",
    "session_id": "user-123-abc"
}
```

**Response:**
```json
{
    "message": "Python is a high-level programming language...",
    "model": "openai/gpt-oss-20b",
    "timestamp": "2024-01-15T10:30:45.123456",
    "tokens_used": 256,
    "finish_reason": "stop"
}
```

**Notes:**
- `session_id` is optional. If not provided, one will be auto-generated
- Both user message and AI response are saved to Redis
- Messages are stored with TTL (expire after 24 hours by default)

### 2. Simple Chat with Session Persistence
**Endpoint:** `POST /api/groq-chat/simple-chat`

```
POST /api/groq-chat/simple-chat?message=Hello&session_id=user-123
```

**Response:** Same as `/chat` endpoint

### 3. Retrieve Chat History
**Endpoint:** `GET /api/groq-chat/history/{session_id}`

```bash
curl http://localhost:5000/api/groq-chat/history/user-123-abc
```

**Response:**
```json
{
    "session_id": "user-123-abc",
    "messages": [
        {
            "role": "user",
            "content": "What is Python?",
            "model": "openai/gpt-oss-20b",
            "timestamp": "2024-01-15T10:30:45.123456"
        },
        {
            "role": "assistant",
            "content": "Python is a high-level programming language...",
            "model": "openai/gpt-oss-20b",
            "timestamp": "2024-01-15T10:30:46.234567"
        }
    ],
    "message_count": 2,
    "last_message_time": "2024-01-15T10:30:46.234567"
}
```

### 4. List All Active Sessions
**Endpoint:** `GET /api/groq-chat/sessions`

```bash
curl http://localhost:5000/api/groq-chat/sessions
```

**Response:**
```json
{
    "sessions": [
        "user-123-abc",
        "user-456-def",
        "user-789-ghi"
    ],
    "total_sessions": 3
}
```

### 5. Clear Chat History
**Endpoint:** `DELETE /api/groq-chat/history/{session_id}`

```bash
curl -X DELETE http://localhost:5000/api/groq-chat/history/user-123-abc
```

**Response:**
```json
{
    "status": "success",
    "message": "Chat history cleared for session user-123-abc"
}
```

## Implementation Details

### Redis Data Structure
Messages are stored in Redis using sorted sets for chronological ordering:

```
Key: chat:session:{session_id}
Type: Sorted Set
Value: JSON-serialized message objects
Score: Timestamp (for ordering)
```

### Service Files

1. **`services/redis_chat_service.py`** (NEW)
   - `RedisChatService` class with methods:
     - `save_message()` - Store a message
     - `get_session_history()` - Retrieve all messages for a session
     - `clear_session()` - Delete a session
     - `get_session_size()` - Get message count
     - `get_all_sessions()` - List active sessions
     - `get_session_info()` - Get session metadata
     - `is_connected()` - Check Redis connection

2. **`routes/groq_chat.py`** (UPDATED)
   - Updated endpoints with session_id support
   - New endpoints: `/history/{session_id}`, `/sessions`, `DELETE /history/{session_id}`
   - Redis integration in chat handlers
   - Response models for history operations

3. **`app.py`** (UPDATED)
   - Redis service initialization on startup
   - Connection testing and logging
   - Error handling with graceful degradation

## Usage Examples

### Frontend Integration

```typescript
// Generate or retrieve user session ID
const sessionId = localStorage.getItem('chatSessionId') 
    || `session-${Date.now()}`;
localStorage.setItem('chatSessionId', sessionId);

// Send message with session persistence
const response = await fetch('/api/groq-chat/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        message: userMessage,
        model: selectedModel,
        session_id: sessionId
    })
});

// Retrieve chat history on page load
const history = await fetch(`/api/groq-chat/history/${sessionId}`);
const { messages } = await history.json();
```

### Python Client Example

```python
import requests
import json

BASE_URL = "http://localhost:5000/api/groq-chat"
session_id = "user-demo-001"

# Send message
response = requests.post(
    f"{BASE_URL}/chat",
    json={
        "message": "Explain machine learning",
        "model": "openai/gpt-oss-20b",
        "session_id": session_id
    }
)
print(response.json())

# Get history
history = requests.get(f"{BASE_URL}/history/{session_id}")
print(json.dumps(history.json(), indent=2))

# List all sessions
sessions = requests.get(f"{BASE_URL}/sessions")
print(sessions.json())
```

## Data Persistence & Cleanup

- **TTL (Time To Live):** Messages expire after 24 hours (configurable via `CHAT_HISTORY_TTL`)
- **Auto-Cleanup:** Redis automatically deletes expired messages
- **Manual Cleanup:** Use `DELETE /api/groq-chat/history/{session_id}` to manually clear a session

## Performance Characteristics

| Operation | Time Complexity | Notes |
|-----------|-----------------|-------|
| Save message | O(log N) | Sorted set insert |
| Get history | O(N) | N = number of messages |
| List sessions | O(M) | M = number of sessions |
| Clear session | O(log N) | Sorted set delete |

- **Memory:** ~200 bytes per message (avg)
- **Throughput:** >10,000 messages/second on standard Redis

## Troubleshooting

### Redis Connection Error
```
[Redis Chat] WARNING: Could not connect to Redis at localhost:6379
```

**Solution:**
- Verify Redis is running: `redis-cli ping` (should return "PONG")
- Check host/port in `.env` file
- Verify firewall rules allow port 6379

### Chat History Not Persisting
1. Verify Redis is connected (check startup logs)
2. Confirm `session_id` is being passed to endpoints
3. Check Redis keys: `redis-cli KEYS "chat:session:*"`

### Slow Performance
1. Check Redis memory: `redis-cli INFO memory`
2. Monitor network latency to Redis
3. Consider Redis cluster for high volume

## Future Enhancements

- [ ] Session expiration policies
- [ ] User authentication integration
- [ ] Search/filter chat history
- [ ] Export conversation to PDF/JSON
- [ ] Message analytics and insights
- [ ] Multi-user shared sessions
- [ ] Message reactions/reactions
