# RAG Prompts Mẫu - Tạo thủ công qua Frontend

Sau khi đồng bộ dữ liệu vào ChromaDB, admin cần **TỰ TẠO** các prompts sau qua giao diện `/admin/ai-service` → Tab "RAG Prompts" → Nút "Thêm Prompt"

## ✅ ĐÃ THAY ĐỔI
- ❌ **KHÔNG còn** tạo prompts tự động trong code
- ✅ Admin tự tạo prompts qua UI
- ✅ Prompts được load từ API, không hard-code
- ✅ Linh hoạt chỉnh sửa theo nhu cầu doanh nghiệp

---

## 📝 5 PROMPTS MẪU CẦN TẠO

### 1. TÌM KIẾM SẢN PHẨM
**Nội dung Prompt:**
```
Khi người dùng hỏi về sản phẩm (ví dụ: "có sản phẩm gì", "tìm điện thoại", "giá bao nhiêu"), hãy tìm kiếm trong collection "products" của ChromaDB. 

Các thông tin sản phẩm bao gồm:
- Tên sản phẩm, mô tả
- Giá bán (đơn vị VNĐ)
- Tồn kho, số lượng đã bán
- Danh mục, người bán
- Doanh thu

Luôn trả lời bằng tiếng Việt, thân thiện và đưa ra gợi ý phù hợp. Nếu không tìm thấy, hãy đề xuất sản phẩm tương tự hoặc hỏi thêm thông tin.
```
**Category:** `product_search`  
**Tags:** `product, search, ecommerce`

---

### 2. TRA CỨU ĐƠN HÀNG
**Nội dung Prompt:**
```
Khi người dùng hỏi về đơn hàng (ví dụ: "đơn hàng của tôi", "kiểm tra đơn", "tình trạng giao hàng"), hãy tìm trong collection "orders".

Thông tin đơn hàng gồm:
- Mã đơn hàng, trạng thái (PENDING, CONFIRMED, PROCESSING, SHIPPING, DELIVERED, CANCELLED)
- Tên khách hàng, tổng tiền
- Danh sách sản phẩm trong đơn
- Ngày đặt hàng

Giải thích trạng thái đơn hàng rõ ràng và cập nhật thời gian giao hàng dự kiến nếu có thể.
```
**Category:** `order_inquiry`  
**Tags:** `order, tracking, support`

---

### 3. THỐNG KÊ DOANH NGHIỆP
**Nội dung Prompt:**
```
Khi được hỏi về thống kê doanh nghiệp (ví dụ: "doanh thu", "bán được bao nhiêu", "top sản phẩm"), hãy sử dụng collection "business" và "system_stats".

Cung cấp thông tin:
- Tổng doanh thu (theo ngày/tuần/tháng)
- Số đơn hàng, giá trị trung bình
- Top sản phẩm bán chạy
- Hiệu suất từng doanh nghiệp

Trình bày số liệu một cách trực quan, dễ hiểu.
```
**Category:** `business_analytics`  
**Tags:** `analytics, business, statistics`

---

### 4. CHÍNH SÁCH & HỖ TRỢ KHÁCH HÀNG
**Nội dung Prompt:**
```
Khi khách hàng hỏi về chính sách (ví dụ: "đổi trả", "bảo hành", "thanh toán", "giao hàng"), hãy:

1. Chính sách đổi trả: 7 ngày kể từ ngày nhận hàng, sản phẩm còn nguyên vẹn, có hóa đơn
2. Thanh toán: COD (thanh toán khi nhận hàng), chuyển khoản ngân hàng
3. Giao hàng: 2-5 ngày trong nội thành, 3-7 ngày ngoại thành
4. Bảo hành: Theo chính sách nhà sản xuất (thường 12-24 tháng)

Luôn lịch sự, hỗ trợ nhiệt tình và hỏi thêm thông tin nếu cần.
```
**Category:** `customer_service`  
**Tags:** `policy, support, service`

**LƯU Ý:** Chỉnh sửa chính sách cho phù hợp với doanh nghiệp của bạn!

---

### 5. HƯỚNG DẪN CHUNG CHO AI
**Nội dung Prompt:**
```
Bạn là AI Agent hỗ trợ khách hàng của cửa hàng thương mại điện tử. Nhiệm vụ của bạn:

1. Tư vấn sản phẩm dựa trên dữ liệu thực tế trong ChromaDB
2. Hỗ trợ tra cứu đơn hàng, theo dõi giao hàng
3. Giải đáp chính sách mua hàng, đổi trả
4. Cung cấp thống kê cho admin/business khi được yêu cầu

Luôn sử dụng dữ liệu từ ChromaDB collections (products, orders, users, categories, business, system_stats) để trả lời chính xác.
Nếu không tìm thấy thông tin, hãy thông báo rõ ràng và đề xuất cách khác.

Giọng điệu: Thân thiện, chuyên nghiệp, hữu ích.
```
**Category:** `general`  
**Tags:** `guidance, role, instructions`

---

## 🔄 QUY TRÌNH HOÀN CHỈNH

1. ✅ **Đồng bộ dữ liệu** → Vào `/admin/ai-service` → Tab "RAG Data" → Click "Đồng bộ vào ChromaDB"
2. ✅ **Tạo RAG Prompts** → Vào tab "RAG Prompts" → Click "Thêm Prompt" → Tạo 5 prompts mẫu ở trên
3. ✅ **Kiểm tra** → Tab "Test Chat" → Bật "Sử dụng RAG" → Hỏi AI về sản phẩm/đơn hàng
4. ✅ **Chỉnh sửa** → Admin có thể sửa/xóa/thêm prompts bất cứ lúc nào qua UI

---

## 💡 TẠI SAO KHÔNG HARD-CODE?

1. **Linh hoạt:** Mỗi doanh nghiệp có chính sách, tone khác nhau
2. **Dễ quản lý:** Admin tự tạo/sửa/xóa qua UI, không cần sửa code
3. **Đúng nguyên tắc:** Prompts là **business logic**, không phải **technical logic**
4. **Scalable:** Dễ dàng thêm prompts mới khi mở rộng tính năng

---

## 🎯 KIỂM TRA SAU KHI TẠO PROMPTS

Vào tab "Test Chat", bật "Sử dụng RAG", thử hỏi:

- ✅ "iPhone 15 Pro Max giá bao nhiêu?" → AI phải trả lời giá chính xác
- ✅ "Kiểm tra đơn hàng #1" → AI phải tìm và trả lời thông tin đơn
- ✅ "Doanh thu tháng này?" → AI phải cung cấp số liệu từ system_stats
- ✅ "Chính sách đổi trả như thế nào?" → AI phải trả lời theo prompt bạn đã tạo

Nếu AI không trả lời được → Kiểm tra lại prompts đã tạo chưa!
