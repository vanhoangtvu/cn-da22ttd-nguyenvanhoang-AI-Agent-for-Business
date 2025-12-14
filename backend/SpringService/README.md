# AI Agent for Business - Spring Boot Backend

Hệ thống quản lý sản phẩm và đơn hàng cho doanh nghiệp với Spring Boot, JWT Authentication và phân quyền theo Role.

## 📋 Yêu cầu

- Java 17
- Maven 3.6+
- MySQL Server 8.0+
- MySQL root password: 1111

## 🏗️ Cấu trúc dự án

```
src/
├── main/
│   ├── java/com/business/springservice/
│   │   ├── config/         # Configuration (Security, DataInitializer)
│   │   ├── controller/     # REST API Controllers
│   │   ├── dto/            # Data Transfer Objects
│   │   ├── entity/         # JPA Entities
│   │   ├── enums/          # Enumerations (Role, Status, OrderStatus)
│   │   ├── repository/     # Spring Data JPA Repositories
│   │   ├── security/       # JWT & Security Filters
│   │   ├── service/        # Business Logic Services
│   │   └── SpringServiceApplication.java
│   └── resources/
│       └── application.yml
```

## ⚙️ Cấu hình

**Database Configuration (application.yml):**
```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/AI_Agent_db
    username: root
    password: 1111
```

**Server Configuration:**
- Port: 8089
- Context Path: /api/v1
- Swagger UI: http://localhost:8089/api/v1/swagger-ui.html

## 🚀 Khởi động ứng dụng

```bash
mvn spring-boot:run
```

Server sẽ chạy tại: http://localhost:8089/api/v1

## 👥 Phân quyền hệ thống

Hệ thống có 3 loại role:

### 🔴 ADMIN
- Quản lý toàn bộ hệ thống
- Xem thống kê tổng thể
- Quản lý users, categories, products, orders

### 🟠 BUSINESS
- Quản lý sản phẩm của mình
- Upload tài liệu doanh nghiệp
- Xem báo cáo doanh thu riêng
- Quản lý đơn hàng chứa sản phẩm của mình

### 🟢 CUSTOMER
- Đăng ký, đăng nhập
- Xem sản phẩm công khai
- Đặt hàng, xem lịch sử đơn hàng
- Hủy đơn hàng (khi đang PENDING/CONFIRMED)

## 📚 API Documentation

### 🔐 Authentication (Public)

#### POST `/auth/register`
**Mô tả:** Đăng ký tài khoản mới  
**Role:** Public (không cần đăng nhập)  
**Request Body:**
```json
{
  "username": "customer1",
  "email": "customer1@example.com",
  "password": "password123",
  "role": "CUSTOMER",
  "address": "123 Main St",
  "phoneNumber": "0901234567"
}
```

#### POST `/auth/login`
**Mô tả:** Đăng nhập  
**Role:** Public  
**Request Body:**
```json
{
  "email": "customer@ai.com",
  "password": "hoang123"
}
```
**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1...",
  "user": {
    "id": 3,
    "username": "customer",
    "email": "customer@ai.com",
    "role": "CUSTOMER"
  }
}
```

---

### 👤 User Management

#### GET `/users`
**Mô tả:** Lấy danh sách tất cả users  
**Role:** ADMIN, BUSINESS  
**Headers:** Authorization: Bearer {token}

#### GET `/users/{id}`
**Mô tả:** Lấy thông tin user theo ID  
**Role:** ADMIN, BUSINESS

#### POST `/users`
**Mô tả:** Tạo user mới (Admin tạo)  
**Role:** ADMIN, BUSINESS  
**Request Body:**
```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "password123",
  "role": "CUSTOMER",
  "address": "Address",
  "phoneNumber": "0987654321"
}
```

#### PATCH `/users/{id}`
**Mô tả:** Cập nhật thông tin user  
**Role:** ADMIN, BUSINESS

#### PATCH `/users/{id}/status?status=ACTIVE`
**Mô tả:** Cập nhật trạng thái tài khoản (ACTIVE, INACTIVE, SUSPENDED, BANNED)  
**Role:** ADMIN, BUSINESS  
**Query Params:** status (ACTIVE | INACTIVE | SUSPENDED | BANNED)

#### DELETE `/users/{id}`
**Mô tả:** Xóa user  
**Role:** ADMIN, BUSINESS

---

### 👤 Profile Management

#### GET `/profile`
**Mô tả:** Xem profile của user đang đăng nhập  
**Role:** ALL (ADMIN, BUSINESS, CUSTOMER)  
**Headers:** Authorization: Bearer {token}

#### PATCH `/profile`
**Mô tả:** Cập nhật profile  
**Role:** ALL

#### POST `/profile/change-password`
**Mô tả:** Đổi mật khẩu  
**Role:** ALL  
**Request Body:**
```json
{
  "oldPassword": "hoang123",
  "newPassword": "newpassword123"
}
```

---

### 🏪 Shop (Public - Không cần đăng nhập)

#### GET `/shop/products`
**Mô tả:** Xem tất cả sản phẩm ACTIVE  
**Role:** Public

#### GET `/shop/products/{id}`
**Mô tả:** Xem chi tiết sản phẩm  
**Role:** Public

#### GET `/shop/categories`
**Mô tả:** Xem tất cả danh mục ACTIVE  
**Role:** Public

#### GET `/shop/categories/{id}`
**Mô tả:** Xem chi tiết danh mục  
**Role:** Public

#### GET `/shop/products/category/{categoryId}`
**Mô tả:** Xem sản phẩm theo danh mục  
**Role:** Public

#### GET `/shop/products/search?keyword={keyword}`
**Mô tả:** Tìm kiếm sản phẩm  
**Role:** Public

---

### 📦 Category Management (Admin)

#### GET `/admin/categories`
**Mô tả:** Xem tất cả categories (bao gồm ACTIVE và INACTIVE)  
**Role:** ADMIN, BUSINESS  
**Headers:** Authorization: Bearer {token}

#### GET `/admin/categories/{id}`
**Mô tả:** Xem chi tiết category  
**Role:** ADMIN, BUSINESS

#### POST `/admin/categories`
**Mô tả:** Tạo category mới  
**Role:** ADMIN, BUSINESS  
**Request Body:**
```json
{
  "name": "Điện thoại",
  "description": "Điện thoại thông minh",
  "imageUrl": "https://example.com/image.jpg"
}
```

#### PATCH `/admin/categories/{id}`
**Mô tả:** Cập nhật category  
**Role:** ADMIN, BUSINESS

#### PATCH `/admin/categories/{id}/status?status=ACTIVE`
**Mô tả:** Cập nhật trạng thái category (ACTIVE/INACTIVE)  
**Role:** ADMIN, BUSINESS

#### DELETE `/admin/categories/{id}`
**Mô tả:** Xóa category  
**Role:** ADMIN, BUSINESS

---

### 📦 Product Management (Admin/Business)

#### GET `/admin/products`
**Mô tả:** Xem tất cả products (bao gồm ACTIVE và INACTIVE)  
**Role:** ADMIN, BUSINESS  
**Headers:** Authorization: Bearer {token}

#### GET `/admin/products/{id}`
**Mô tả:** Xem chi tiết product  
**Role:** ADMIN, BUSINESS

#### GET `/admin/products/category/{categoryId}`
**Mô tả:** Xem products theo category  
**Role:** ADMIN, BUSINESS

#### GET `/admin/products/seller/{sellerId}`
**Mô tả:** Xem products của seller cụ thể  
**Role:** ADMIN, BUSINESS

#### GET `/admin/products/search?keyword={keyword}`
**Mô tả:** Tìm kiếm products  
**Role:** ADMIN, BUSINESS

#### POST `/admin/products`
**Mô tả:** Tạo product mới (seller tự động = user đang đăng nhập)  
**Role:** ADMIN, BUSINESS  
**Request Body:**
```json
{
  "name": "iPhone 15 Pro",
  "description": "Latest iPhone",
  "price": 29990000,
  "quantity": 50,
  "imageUrls": ["https://example.com/img1.jpg", "https://example.com/img2.jpg"],
  "categoryId": 1
}
```

#### PATCH `/admin/products/{id}`
**Mô tả:** Cập nhật product  
**Role:** ADMIN, BUSINESS

#### PATCH `/admin/products/{id}/status?status=ACTIVE`
**Mô tả:** Cập nhật trạng thái product (ACTIVE/INACTIVE)  
**Role:** ADMIN, BUSINESS

#### DELETE `/admin/products/{id}`
**Mô tả:** Xóa product  
**Role:** ADMIN, BUSINESS

---

### 🛒 Orders (Customer)

#### POST `/orders`
**Mô tả:** Tạo đơn hàng mới (thông tin giao hàng lấy từ profile)  
**Role:** CUSTOMER (hoặc ALL authenticated users)  
**Headers:** Authorization: Bearer {token}  
**Request Body:**
```json
{
  "note": "Giao hàng buổi chiều",
  "items": [
    {"productId": 1, "quantity": 2},
    {"productId": 2, "quantity": 1}
  ]
}
```

#### GET `/orders/my-orders`
**Mô tả:** Xem lịch sử đơn hàng của mình  
**Role:** CUSTOMER (ALL authenticated)

#### GET `/orders/{id}`
**Mô tả:** Xem chi tiết đơn hàng  
**Role:** CUSTOMER (ALL authenticated)

#### POST `/orders/{id}/cancel`
**Mô tả:** Hủy đơn hàng (chỉ khi PENDING hoặc CONFIRMED)  
**Role:** CUSTOMER (ALL authenticated)

#### PATCH `/orders/{id}/address`
**Mô tả:** Cập nhật địa chỉ giao hàng (chỉ khi PENDING hoặc CONFIRMED)  
**Role:** CUSTOMER (ALL authenticated)  
**Request Body:**
```json
{
  "shippingAddress": "456 New Address, District 3"
}
```

---

### 📋 Order Management (Admin/Business)

#### GET `/admin/orders`
**Mô tả:** Xem tất cả đơn hàng  
**Role:** ADMIN, BUSINESS  
**Headers:** Authorization: Bearer {token}

#### GET `/admin/orders/{id}`
**Mô tả:** Xem chi tiết đơn hàng  
**Role:** ADMIN, BUSINESS

#### GET `/admin/orders/customer/{customerId}`
**Mô tả:** Xem đơn hàng của customer cụ thể  
**Role:** ADMIN, BUSINESS

#### GET `/admin/orders/status/{status}`
**Mô tả:** Xem đơn hàng theo trạng thái (PENDING, CONFIRMED, PROCESSING, SHIPPING, DELIVERED, CANCELLED, RETURNED)  
**Role:** ADMIN, BUSINESS

#### PATCH `/admin/orders/{id}/status?status=CONFIRMED`
**Mô tả:** Cập nhật trạng thái đơn hàng  
**Role:** ADMIN, BUSINESS

---

### 📄 Business Documents (Business)

#### POST `/admin/business-documents`
**Mô tả:** Upload tài liệu doanh nghiệp (PDF, DOC, DOCX, XLS, XLSX, CSV, JPG, PNG - Max 10MB)  
**Role:** ADMIN, BUSINESS  
**Headers:** 
- Authorization: Bearer {token}
- Content-Type: multipart/form-data

**Form Data:**
- file: [File]
- description: "Giấy phép kinh doanh" (optional)

#### GET `/admin/business-documents/my-documents`
**Mô tả:** Xem tài liệu của mình  
**Role:** BUSINESS

#### GET `/admin/business-documents/{id}`
**Mô tả:** Xem chi tiết tài liệu  
**Role:** ADMIN, BUSINESS

#### GET `/admin/business-documents/business/{businessId}`
**Mô tả:** Xem tài liệu của business cụ thể (Admin only)  
**Role:** ADMIN

#### DELETE `/admin/business-documents/{id}`
**Mô tả:** Xóa tài liệu  
**Role:** BUSINESS (chỉ xóa tài liệu của mình)

---

### 📊 Dashboard & Reports

#### GET `/admin/dashboard/admin-stats`
**Mô tả:** Thống kê tổng thể hệ thống  
**Role:** ADMIN  
**Response:** Tổng users, categories, products, orders, doanh thu toàn hệ thống

#### GET `/admin/dashboard/business-stats`
**Mô tả:** Thống kê của business đang đăng nhập  
**Role:** BUSINESS  
**Response:** Products, orders, revenue, inventory của business

#### GET `/admin/dashboard/revenue/daily?days=7`
**Mô tả:** Báo cáo doanh thu theo ngày  
**Role:** BUSINESS  
**Params:** days (mặc định: 7)

#### GET `/admin/dashboard/revenue/weekly?weeks=4`
**Mô tả:** Báo cáo doanh thu theo tuần  
**Role:** BUSINESS  
**Params:** weeks (mặc định: 4)

#### GET `/admin/dashboard/revenue/monthly?months=6`
**Mô tả:** Báo cáo doanh thu theo tháng  
**Role:** BUSINESS  
**Params:** months (mặc định: 6)

#### GET `/admin/dashboard/admin/revenue/daily?days=7`
**Mô tả:** Báo cáo doanh thu toàn hệ thống theo ngày  
**Role:** ADMIN

#### GET `/admin/dashboard/admin/revenue/weekly?weeks=4`
**Mô tả:** Báo cáo doanh thu toàn hệ thống theo tuần  
**Role:** ADMIN

#### GET `/admin/dashboard/admin/revenue/monthly?months=6`
**Mô tả:** Báo cáo doanh thu toàn hệ thống theo tháng  
**Role:** ADMIN

---

## 🔒 Security & Authentication

### JWT Token
Tất cả API (trừ Public) yêu cầu JWT token trong header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Filter Chain
1. **JwtAuthenticationFilter** (Order 1)
   - Xác thực JWT token
   - Extract userId, username, role
   - Áp dụng cho: `/profile`, `/cart`, `/admin/*`, `/orders/*`

2. **RoleAuthorizationFilter** (Order 2)
   - Kiểm tra role ADMIN hoặc BUSINESS
   - Áp dụng cho: `/users`, `/users/*`, `/admin/*`

### Default Users (Tự động khởi tạo)
```
Admin:
- Username: admin
- Email: admin@ai.com
- Password: hoang123
- Account Status: ACTIVE

Business:
- Username: business
- Email: business@ai.com
- Password: hoang123
- Account Status: ACTIVE

Customer:
- Username: customer
- Email: customer@ai.com
- Password: hoang123
- Account Status: ACTIVE
```

---

## 📊 Database Schema

### Users
- id, username, email, password (BCrypt), role, accountStatus (ACTIVE/INACTIVE/SUSPENDED/BANNED), address, phoneNumber

### Categories
- id, name, description, imageUrl, status (ACTIVE/INACTIVE)

### Products
- id, name, description, price, quantity, imageUrls (JSON), categoryId, sellerId, status, timestamps

### Orders
- id, customerId, customerName, customerEmail, customerPhone, shippingAddress, totalAmount, status, note, timestamps

### OrderItems
- id, orderId, productId, productName, productPrice, quantity, subtotal

### BusinessDocuments
- id, businessId, fileName, fileType, filePath, fileSize, description, uploadedAt

---

## 🛠️ Tech Stack

- **Spring Boot**: 4.0.0
- **Java**: 17
- **Database**: MySQL 8.0.44
- **Security**: JWT (jjwt 0.12.3), BCrypt password encryption
- **ORM**: Spring Data JPA (Hibernate)
- **Documentation**: Swagger/OpenAPI 3
- **Build Tool**: Maven

---

## 📝 Notes

- Database sử dụng `ddl-auto: create` - database sẽ được tạo mới mỗi lần khởi động
- File upload được lưu tại thư mục `uploads/documents/`
- Sản phẩm và category có status: chỉ hiển thị ACTIVE ở `/shop/*`, hiển thị tất cả ở `/admin/*`
- Customer chỉ hủy được order khi status là PENDING hoặc CONFIRMED
