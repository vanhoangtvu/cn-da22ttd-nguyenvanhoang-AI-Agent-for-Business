# RAG Chat Configuration

Các cấu hình cho RAG-enhanced chat đã được tách ra thành file riêng để có thể tái sử dụng trong tương lai.

## File: `chat_rag_config.py`

### Mục đích
File này chứa tất cả các template prompts, quy tắc và cấu hình cho RAG chat. Có thể được sử dụng lại cho:
- Customer chat service (nếu cần khôi phục)
- Internal chat tools
- Các mục đích chat khác với AI

### Nội dung chính

#### 1. **System Instructions**
- `RAG_SYSTEM_INSTRUCTION_WITH_USER`: Template đầy đủ với thông tin sản phẩm (JSON)
- `RAG_SYSTEM_INSTRUCTION_STREAM`: Template cho streaming (không có products_json)

#### 2. **Quy tắc trong prompts**
- Quy tắc xử lý thông tin người dùng đăng nhập
- Phong cách trả lời (thân thiện, chuyên nghiệp)
- Quy tắc hiển thị sản phẩm (rất quan trọng - không hallucinate)
- Format hiển thị đơn hàng

#### 3. **Cấu hình**
```python
# ChromaDB search config
CHROMA_SEARCH_CONFIG = {
    'collections_to_search': ['products', 'orders', 'categories', 'business', 'users', 'system_stats'],
    'default_n_results': 5,
    'max_results': 10
}

# Chat history config
CHAT_HISTORY_CONFIG = {
    'max_messages': 10,
    'default_max_messages': 10
}

# Product card fields
PRODUCT_CARD_FIELDS = ['id', 'name', 'imageUrl', 'price', 'description', 'stock', 'categoryName']
```

#### 4. **Helper Functions**

##### `build_rag_prompt()`
Build prompt từ các components:
```python
prompt = build_rag_prompt(
    rag_context="...",
    user_context="...",
    relevant_data="...",
    history_context="...",
    user_message="...",
    products_json="...",  # Optional
    use_stream_template=False
)
```

##### `get_user_context_header()`
Tạo header cho user context:
```python
user_context = get_user_context_header(user_info)
# Output: "\n[THÔNG TIN NGƯỜI DÙNG ĐANG CHAT]\n{user_info}\n"
```

##### `get_relevant_data_header()`
Format relevant data với header:
```python
data_header = get_relevant_data_header(data_items)
```

## Cách sử dụng

### 1. Import trong route files
```python
from config.chat_rag_config import (
    build_rag_prompt,
    get_user_context_header,
    get_relevant_data_header,
    CHROMA_SEARCH_CONFIG,
    CHAT_HISTORY_CONFIG
)
```

### 2. Sử dụng trong API endpoint
```python
# Build prompt
full_prompt = build_rag_prompt(
    rag_context=rag_context,
    user_context=user_context,
    relevant_data=relevant_data,
    history_context=history_context,
    user_message=chat_input.message,
    products_json=json.dumps(product_cards, ensure_ascii=False),
    use_stream_template=False  # True for streaming
)

# Generate AI response
response = model.generate_content(full_prompt)
```

## Ưu điểm

✅ **Tái sử dụng**: Dễ dàng import và sử dụng ở nhiều nơi
✅ **Bảo trì**: Chỉ cần sửa 1 chỗ khi thay đổi prompts
✅ **Tổ chức**: Code gọn gàng, tách biệt logic và config
✅ **Backup**: Giữ lại cấu hình để dùng sau nếu cần

## Lưu ý

- File này KHÔNG phụ thuộc vào customer chat service
- Có thể dùng cho bất kỳ service chat nào trong tương lai
- Templates được thiết kế cho tiếng Việt
- Quy tắc hiển thị sản phẩm rất nghiêm ngặt để tránh hallucination

## Version History

- **v1.0.0** (13/12/2025): Tách từ customer chat service, tạo file config độc lập
