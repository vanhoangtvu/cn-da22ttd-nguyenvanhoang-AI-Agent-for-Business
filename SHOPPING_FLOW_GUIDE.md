# 🛍️ HƯỚNG DẪN FLOW MUA HÀNG HOÀN CHỈNH

**Ngày cập nhật:** 7 tháng 1, 2026

---

## 📋 TỔNG QUAN FLOW

Flow mua hàng được thiết kế để tạo trải nghiệm mượt mà từ khi khách hàng chọn sản phẩm đến khi hoàn tất đơn hàng.

### 🎯 Mục tiêu:
1. ✅ Hỏi số lượng khi khách muốn mua
2. ✅ Tính toán và hiển thị chi tiết giá
3. ✅ Đề xuất và áp dụng mã giảm giá
4. ✅ Tự động thêm vào giỏ với đúng thông tin
5. ✅ Chuyển đến trang thanh toán với chỉ sản phẩm đã chọn
6. ✅ Cảm ơn và hỏi kiểm tra đơn hàng sau khi đặt

---

## 🔄 CHI TIẾT TỪNG BƯỚC

### BƯỚC 1️⃣: KHÁCH NÓI MUA SẢN PHẨM

**Input từ khách:**
```
"mua iPhone 15"
"cho tôi xem iPad Pro"
"tôi muốn mua MacBook Air"
```

**AI Response:**
```
Tôi sẽ giúp bạn mua [Tên sản phẩm] nhé!

📦 Sản phẩm: [Tên đầy đủ]
💰 Giá: [Giá]đ
🖼️ ![Ảnh sản phẩm](URL)

🔍 Thông số kỹ thuật nổi bật:
- [Spec 1]
- [Spec 2]
- [Spec 3]

❓ Bạn muốn mua bao nhiêu chiếc?
```

**Lưu ý:**
- Hiển thị đầy đủ thông tin sản phẩm
- Hỏi số lượng một cách tự nhiên
- Không tự động add vào giỏ ngay

---

### BƯỚC 2️⃣: KHÁCH TRẢ LỜI SỐ LƯỢNG

**Input từ khách:**
```
"2 chiếc"
"3 cái"
"1 máy"
"5"
```

**AI Response:**
```
Tuyệt vời! Để tôi tính toán cho bạn:

📦 Sản phẩm: [Tên sản phẩm]
🔢 Số lượng: [X] chiếc
💰 Đơn giá: [Giá]đ/chiếc
💵 Tổng tiền: [Tổng]đ

🎁 Bạn có muốn sử dụng mã giảm giá không?
Chúng tôi có các mã sau:

[Hiển thị nút cho mỗi mã giảm giá]
```

**Actions hiển thị:**
- ✅ Nút "🎫 Áp mã [CODE]" cho từng mã giảm giá
- ✅ Nút "⏭️ Bỏ qua, thanh toán luôn"

---

### BƯỚC 3️⃣: KHÁCH CHỌN MÃ GIẢM GIÁ (hoặc bỏ qua)

#### Trường hợp A: Khách chọn mã

**Input từ khách:**
```
Click nút "🎫 Áp mã SAVE10"
hoặc nói: "dùng mã SAVE10"
```

**AI Response:**
```
Tuyệt vời! Mã SAVE10 đã được áp dụng:

📦 Sản phẩm: [Tên sản phẩm] x [SL]
💰 Tổng tiền gốc: [Tổng gốc]đ
🎫 Mã giảm giá: SAVE10 (-10%)
💵 Giảm giá: -[Số tiền giảm]đ
━━━━━━━━━━━━━━━━━━━━
✅ Tổng thanh toán: [Tổng sau giảm]đ

💳 Bạn có muốn thanh toán ngay không?
```

#### Trường hợp B: Khách bỏ qua

**AI Response:**
```
Được rồi! Tổng đơn hàng của bạn:

📦 Sản phẩm: [Tên sản phẩm] x [SL]
💵 Tổng thanh toán: [Tổng]đ

💳 Bạn có muốn thanh toán ngay không?
```

**Actions hiển thị:**
- ✅ Nút "💳 Thanh toán ngay"
- ✅ Nút "🛒 Xem giỏ hàng"

---

### BƯỚC 4️⃣: KHÁCH XÁC NHẬN THANH TOÁN

**Input từ khách:**
```
Click "💳 Thanh toán ngay"
hoặc nói: "có", "thanh toán", "đồng ý"
```

**Hệ thống thực hiện (Backend):**
1. ✅ Tự động thêm sản phẩm vào giỏ hàng với số lượng đã chọn
2. ✅ Tự động áp dụng mã giảm giá (nếu có)
3. ✅ Clear các sản phẩm khác trong giỏ (nếu cần)
4. ✅ Hiển thị action "GO_TO_CHECKOUT"

**AI Response:**
```
Đã thêm [X] [Tên sản phẩm] vào giỏ hàng [với mã giảm giá CODE]!

📦 Sản phẩm: [Tên] x [SL]
[🎫 Mã giảm giá: CODE]
💵 Tổng thanh toán: [Tổng]đ

👇 Vui lòng nhấn nút bên dưới để hoàn tất đơn hàng.
```

**Actions hiển thị:**
- ✅ Nút "💳 Đi tới trang thanh toán" → Chuyển đến `/checkout`

---

### BƯỚC 5️⃣: SAU KHI THANH TOÁN XONG

**Khi khách quay lại chat sau khi thanh toán:**

**AI Response (tự động):**
```
🎉 Cảm ơn bạn đã đặt hàng tại [Tên shop]!

✅ Đơn hàng của bạn đã được ghi nhận và đang được xử lý.

📦 Thông tin đơn hàng:
━━━━━━━━━━━━━━━━━━━━
• Sản phẩm: [Tên] x [SL]
[• Mã giảm giá: CODE]
• Tổng thanh toán: [Tổng]đ
• Trạng thái: Đang xử lý

📱 Bạn có muốn kiểm tra chi tiết đơn hàng vừa đặt không?
```

**Actions hiển thị:**
- ✅ Nút "📦 Xem đơn hàng của tôi"
- ✅ Nút "🛍️ Tiếp tục mua sắm"

---

### BƯỚC 6️⃣: KHÁCH KIỂM TRA ĐƠN HÀNG

**Input từ khách:**
```
Click "📦 Xem đơn hàng của tôi"
hoặc nói: "có", "kiểm tra đơn hàng"
```

**AI Response:**
```
Đây là danh sách đơn hàng của bạn:

📋 Đơn hàng #[ID] - [Ngày]
━━━━━━━━━━━━━━━━━━━━
📦 Sản phẩm: [Tên] x [SL]
💵 Tổng tiền: [Tổng]đ
📍 Trạng thái: [Trạng thái]

Bạn có cần hỗ trợ gì thêm không?
```

**Actions hiển thị:**
- ✅ Nút "📦 Xem tất cả đơn hàng"

---

## ⚙️ IMPLEMENTATION DETAILS

### 1. Backend Logic (groq_chat.py)

#### System Prompt đã cập nhật:
```python
# Đã thêm section "🛍️ FLOW MUA HÀNG HOÀN CHỈNH"
# Lines 850-920 trong groq_chat.py
```

#### Action Detection:
```python
def detect_action_intent(message, products, discounts, ai_response):
    # Detect ADD_TO_CART intent
    # Detect APPLY_DISCOUNT intent  
    # Detect GO_TO_CHECKOUT intent
    # Detect CHECK_ORDERS intent
```

### 2. Frontend Actions (ai-chat/page.tsx)

#### Action Handlers:
```typescript
// GO_TO_CHECKOUT
router.push('/checkout');

// APPLY_DISCOUNT
// Apply discount code to cart

// CHECK_ORDERS
router.push('/orders');
```

### 3. ChromaDB Sync

**Cart Sync (sync_management.py):**
```python
async def sync_cart(chroma_service, data):
    # Sync cart với items_json
    # Store: productId, productName, quantity, price, subtotal
```

**Discount Context:**
```python
def get_discount_context(query):
    # Retrieve available discount codes
    # Filter by validity date
```

---

## 🧪 TEST SCENARIOS

### Test Case 1: Flow hoàn chỉnh với mã giảm giá
```
User: "mua iPhone 15"
AI: [Hỏi số lượng]

User: "2 chiếc"
AI: [Tính toán, hỏi mã giảm giá]

User: Click "Áp mã SAVE10"
AI: [Hiển thị tổng sau giảm, hỏi thanh toán]

User: "thanh toán"
AI: [Thêm vào giỏ, chuyển checkout]

→ Verify: Giỏ hàng có 2 iPhone 15 với mã SAVE10
→ Verify: Trang checkout hiển thị đúng
```

### Test Case 2: Không dùng mã giảm giá
```
User: "mua MacBook"
AI: [Hỏi số lượng]

User: "1"
AI: [Tính toán, hỏi mã giảm giá]

User: "không cần"
AI: [Hỏi thanh toán]

User: "có"
AI: [Thêm vào giỏ, chuyển checkout]

→ Verify: Giỏ hàng có 1 MacBook, không có mã giảm giá
```

### Test Case 3: Sau khi thanh toán
```
User: [Quay lại chat sau checkout]
AI: [Cảm ơn, hỏi kiểm tra đơn hàng]

User: "có"
AI: [Hiển thị đơn hàng vừa đặt]

→ Verify: Đơn hàng hiển thị đúng thông tin
```

---

## 📊 METRICS & TRACKING

### Conversion Tracking:
1. **Step 1 → Step 2:** % khách trả lời số lượng
2. **Step 2 → Step 3:** % khách chọn/bỏ qua mã giảm giá
3. **Step 3 → Step 4:** % khách xác nhận thanh toán
4. **Step 4 → Step 5:** % hoàn tất checkout
5. **Step 5 → Step 6:** % kiểm tra đơn hàng

### Log Events:
```python
# Log mỗi bước trong flow
logger.info(f"[SHOPPING_FLOW] User {user_id} - Step 1: Product selected")
logger.info(f"[SHOPPING_FLOW] User {user_id} - Step 2: Quantity: {qty}")
logger.info(f"[SHOPPING_FLOW] User {user_id} - Step 3: Discount: {code}")
logger.info(f"[SHOPPING_FLOW] User {user_id} - Step 4: Checkout initiated")
logger.info(f"[SHOPPING_FLOW] User {user_id} - Step 5: Order completed")
```

---

## ⚠️ EDGE CASES

### 1. Sản phẩm hết hàng:
```
AI: "Rất tiếc, [Tên sản phẩm] hiện đang hết hàng.
     Tồn kho: 0 chiếc
     
     Bạn có muốn xem sản phẩm tương tự không?"
```

### 2. Số lượng vượt quá tồn kho:
```
AI: "Xin lỗi, chúng tôi chỉ còn [X] chiếc [Tên sản phẩm].
     Bạn có muốn mua [X] chiếc không?"
```

### 3. Mã giảm giá hết hạn:
```
AI: "Mã [CODE] đã hết hạn sử dụng.
     Bạn có muốn xem các mã khác không?"
```

### 4. Khách không trả lời số lượng:
```
[Sau 30s không response]
AI: "Bạn vẫn quan tâm đến [Tên sản phẩm] chứ?
     Để tôi giúp bạn, bạn muốn mua bao nhiêu chiếc?"
```

---

## 🎯 SUCCESS CRITERIA

✅ **Flow mượt mà:** Khách không bị gián đoạn  
✅ **Thông tin đầy đủ:** Mọi chi tiết được hiển thị rõ ràng  
✅ **Tự động hóa:** Giảm thiểu input từ khách  
✅ **Chính xác:** Giỏ hàng chỉ chứa đúng sản phẩm đã chọn  
✅ **Discount:** Mã giảm giá được áp dụng đúng  
✅ **Follow-up:** Cảm ơn và hỗ trợ sau mua hàng  

---

**Lưu ý:** Flow này được thiết kế để tối ưu conversion rate và customer experience. Mọi thay đổi cần test kỹ trước khi deploy.
