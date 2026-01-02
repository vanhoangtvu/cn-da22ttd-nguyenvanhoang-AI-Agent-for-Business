# 🤖 AI Agent for Business

**Hệ thống quản lý và hỗ trợ kinh doanh thông minh với AI**

---

## 📚 **Thông Tin Đồ Án**

| Thông tin | Chi tiết |
|-----------|----------|
| **🎓 Sinh viên** | Nguyễn Văn Hoàng |
| **🆔 MSSV** | 110122078 |
| **🏫 Trường** | Đại Học Trà Vinh |
| **🏛️ Khoa** | Công Nghệ Thông Tin |
| **👨‍🏫 GVHD** | ThS. TS. Nguyễn Bảo Ân |
| **📧 Email** | nguyenvanhoang@example.com |
| **💻 GitHub** | [@vanhoangtvu](https://github.com/vanhoangtvu) |

---

## 🎯 **Tổng Quan Dự Án**

AI Agent for Business là hệ thống e-commerce kết hợp AI thông minh, giúp:
- 🛍️ Khách hàng mua sắm và chat với AI assistant
- 📊 Doanh nghiệp phân tích kinh doanh với AI
- 🤖 Tự động hóa quy trình bán hàng và chăm sóc khách hàng

---

## ✨ **Chức Năng Chính**

### 👥 **Dành cho Khách hàng**
- 🛒 Browse và search sản phẩm
- 🤖 Chat với AI về sản phẩm (tiếng Việt/Anh)
- 🛍️ Thêm vào giỏ hàng từ chat
- 💳 Checkout và thanh toán
- 📦 Theo dõi đơn hàng

### 👑 **Dành cho Admin/Business**
- 📊 Dashboard thống kê (doanh thu, đơn hàng, sản phẩm)
- 📦 Quản lý sản phẩm, danh mục, đơn hàng
- 👥 Quản lý người dùng và phân quyền
- 💰 Quản lý mã giảm giá
- 📄 Upload tài liệu để AI phân tích
- 🤖 AI Insights: Phân tích kinh doanh, dự báo, đề xuất chiến lược

### 🤖 **AI Features**
- Natural language chat về sản phẩm
- RAG (Retrieval-Augmented Generation) với ChromaDB
- Product recommendations thông minh
- Business analytics và forecasting
- Document processing (PDF, Excel, Word, CSV)

---

## 🛠️ **Công Nghệ Sử Dụng**

### **Frontend**
- ⚛️ Next.js 16.0.6 (App Router)
- 🎨 React 19.2.0
- 📝 TypeScript 5
- 🎨 Tailwind CSS 4
- 🎯 Lucide Icons

### **Backend - Spring Boot**
- ☕ Java 17
- 🌱 Spring Boot 4.0.0
- 🔐 Spring Security + JWT
- 🗃️ Spring Data JPA (Hibernate)
- 🐬 MySQL 8.0

### **Backend - Python AI**
- 🐍 Python 3.8+
- ⚡ FastAPI 0.109.0
- 🤖 Google Gemini AI (2.5 Pro/Flash)
- 🚀 Groq AI (Llama 3.1, Mixtral)
- 💾 ChromaDB 0.4.22 (Vector Database)
- 🔴 Redis 5.0.1 (Session Cache)
- 📄 PyPDF2, python-docx, pandas, openpyxl

---

## 🏗️ **Kiến Trúc Hệ Thống**

```
┌─────────────────┐
│  Frontend       │
│  Next.js:3009   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼────┐ ┌─▼──────────┐
│ Spring │ │ Python AI  │
│ :8089  │ │ :5000      │
└───┬────┘ └─┬──────────┘
    │        │
┌───▼────┐ ┌▼───────┐
│ MySQL  │ │ChromaDB│
│        │ │ Redis  │
└────────┘ └────────┘
```

**Ports:**
- Frontend: `http://localhost:3009`
- Spring Boot: `http://localhost:8089/api/v1`
- Python AI: `http://localhost:5000`

---

## 🚀 **Cài Đặt & Chạy**

### **1. Cài đặt MySQL**
```bash
mysql -u root -p -e "CREATE DATABASE AI_Agent_db;"
```

### **2. Spring Boot Service**
```bash
cd backend/SpringService
mvn spring-boot:run
# Chạy tại: http://localhost:8089/api/v1
```

### **3. Python AI Service**
```bash
cd backend/Pythonservice

# Tạo file .env với API keys
echo "GOOGLE_API_KEY=your_gemini_key" > .env
echo "GROQ_API_KEY=your_groq_key" >> .env

# Chạy service
chmod +x st.sh
./st.sh
# Chạy tại: http://localhost:5000
```

### **4. Frontend**
```bash
cd frontend
npm install
npm run dev
# Chạy tại: http://localhost:3009
```

---

## 🔑 **Tài Khoản Mặc Định**

```
Admin:    admin@ai.com / hoang123
Business: business@ai.com / hoang123  
Customer: customer@ai.com / hoang123
```

---

## 📖 **API Documentation**

- **Spring Boot**: http://localhost:8089/api/v1/swagger-ui.html
- **Python AI**: http://localhost:5000/docs

---

## 🔄 **Workflow Chính**

### **Customer Journey**
```
Browse Products → Chat với AI → Add to Cart → Checkout → Track Order
```

### **Business Analytics**
```
Upload Documents → AI Processing → ChromaDB Storage → Query Analytics → AI Insights
```

### **Data Flow**
```
Spring Boot (MySQL) → Sync → Python AI (ChromaDB) → AI Analysis
```

---

## 📦 **Database Schema**

**MySQL (Spring Boot):**
- `users` - Người dùng (ADMIN/BUSINESS/CUSTOMER)
- `products` - Sản phẩm
- `categories` - Danh mục
- `orders` - Đơn hàng
- `order_items` - Chi tiết đơn hàng
- `carts` - Giỏ hàng
- `cart_items` - Chi tiết giỏ hàng
- `discounts` - Mã giảm giá
- `business_documents` - Tài liệu kinh doanh

**ChromaDB (Python AI):**
- `products` - Vector embeddings sản phẩm
- `business_data` - Dữ liệu kinh doanh
- `orders_analytics` - Phân tích đơn hàng
- `business_documents` - Tài liệu với full-text search
- `trends` - Xu hướng kinh doanh

---

## 🌟 **Tính Năng Nổi Bật**

### 🤖 **AI Chat Assistant**
- Hiểu tiếng Việt và tiếng Anh
- RAG với ChromaDB cho context chính xác
- Recommend sản phẩm dựa trên conversation
- Action buttons: Add to cart, View details
- Lưu lịch sử chat trên Redis

### 📊 **Business Intelligence**
- AI phân tích tài liệu tự động
- Revenue forecasting
- Customer behavior analysis  
- Product performance insights
- Strategic recommendations

### 🔐 **Security**
- JWT authentication với 24h expiry
- BCrypt password hashing
- Role-based access control (RBAC)
- CORS configuration

---

## 🛠️ **Tech Highlights**

- **Microservices Architecture**: Frontend, Spring Boot, Python AI services
- **AI Integration**: Google Gemini 2.5 Pro + Groq Llama 3.1
- **RAG Pattern**: ChromaDB vector search + AI generation
- **Session Management**: Redis cho chat history
- **Document Processing**: Auto-extract từ PDF/Excel/Word/CSV
- **Payment**: VietQR integration

---

## 📝 **Notes**

- Database auto-recreate mỗi lần restart Spring Boot (`ddl-auto: create`)
- Redis optional - nếu không có, chat history không persist
- File uploads lưu tại `backend/SpringService/uploads/documents/`
- Sample data tự động tạo: 8 categories, 20+ products

---

## 📄 **License**

Copyright © 2025 Nguyễn Văn Hoàng - Đại Học Trà Vinh

---

## 📞 **Liên Hệ**

- **📧 Email**: nguyenvanhoang@example.com
- **💻 GitHub**: [@vanhoangtvu](https://github.com/vanhoangtvu)
- **🏫 Trường**: Đại Học Trà Vinh
- **👨‍🏫 GVHD**: ThS. TS. Nguyễn Bảo Ân

---

<div align="center">

**Made with ❤️ by Nguyễn Văn Hoàng**

**Cập nhật**: Tháng 01/2026

</div>
