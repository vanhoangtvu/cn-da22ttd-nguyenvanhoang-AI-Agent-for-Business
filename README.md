# 🤖 AI Agent for Business

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-16.0.6-black.svg)](https://nextjs.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.0.0-green.svg)](https://spring.io/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109.0-teal.svg)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

**🎯 Hệ thống AI thông minh hỗ trợ doanh nghiệp trong việc bán hàng, chăm sóc khách hàng, tư vấn sản phẩm và đề xuất chiến lược kinh doanh dựa trên dữ liệu nội bộ**

[📖 Tài Liệu](#-tài-liệu-api) • [🚀 Cài Đặt](#-cài-đặt-nhanh) • [🏗️ Kiến Trúc](#%EF%B8%8F-kiến-trúc-hệ-thống) • [🔥 Tính Năng](#-tính-năng-chính)

---

</div>

## 📚 **Thông Tin Đồ Án**

> **Đồ Án Chuyên Ngành - Đại Học Trà Vinh**

| | |
|---|---|
| **🎓 Sinh viên thực hiện** | Nguyễn Văn Hoàng |
| **🆔 MSSV** | 110122078 |
| **🏫 Khoa** | Công Nghệ Thông Tin |
| **🏛️ Trường** | Đại Học Trà Vinh |
| **👨‍🏫 Giáo viên hướng dẫn** | ThS. TS. Nguyễn Bảo Ân |
| **📧 Email** | nguyenvanhoang@example.com |
| **💻 GitHub** | [vanhoangtvu](https://github.com/vanhoangtvu) |

---

## 🎯 **Tổng Quan Dự Án**

**AI Agent for Business** là một hệ thống quản lý và hỗ trợ kinh doanh thông minh được xây dựng với kiến trúc microservices hiện đại. Hệ thống kết hợp sức mạnh của AI (Google Gemini & Groq) với công nghệ web tiên tiến để cung cấp:

### ✨ **Tính Năng Chính**

#### 🛍️ **E-commerce Platform**
- 🏪 Cửa hàng trực tuyến với đầy đủ tính năng
- 🛒 Giỏ hàng và thanh toán thông minh
- 📦 Quản lý đơn hàng real-time
- 👤 Quản lý tài khoản và hồ sơ

#### 🤖 **AI Chat Agent**
- 💬 Chatbot AI thông minh hỗ trợ khách hàng 24/7
- 🔍 Tìm kiếm và tư vấn sản phẩm bằng ngôn ngữ tự nhiên
- 🛒 Thêm sản phẩm vào giỏ hàng trực tiếp từ chat
- 📊 Hiển thị sản phẩm với hình ảnh trong cuộc trò chuyện
- 🧠 Tích hợp Google Gemini và Groq AI

#### 📊 **Business Analytics Dashboard**
- 📈 Phân tích kinh doanh với AI
- 💡 Đề xuất chiến lược thông minh
- 📄 Xử lý tài liệu tự động (PDF, Excel, Word, CSV)
- 🔍 Tìm kiếm ngữ nghĩa với ChromaDB
- 📉 Báo cáo doanh thu theo ngày/tuần/tháng

#### 🔐 **Phân Quyền Đa Cấp**
- 👑 **ADMIN**: Quản lý toàn hệ thống
- 🏢 **BUSINESS**: Quản lý sản phẩm và báo cáo
- 👥 **CUSTOMER**: Mua sắm và đặt hàng

---

## 🏗️ **Kiến Trúc Hệ Thống**

### 📐 **Kiến Trúc Tổng Thể**

```mermaid
graph TB
    subgraph "🌐 Frontend Layer"
        FE[Next.js 16<br/>Port: 3009]
    end
    
    subgraph "⚙️ Backend Services"
        SPRING[Spring Boot 4.0<br/>Port: 8089<br/>API Gateway]
        PYTHON[Python FastAPI<br/>Port: 5000<br/>AI Service]
    end
    
    subgraph "💾 Data Layer"
        MYSQL[(MySQL 8.0<br/>Business Data)]
        CHROMA[(ChromaDB<br/>Vector DB)]
        REDIS[(Redis<br/>Chat History)]
    end
    
    subgraph "🤖 AI Services"
        GEMINI[Google Gemini<br/>2.5 Pro/Flash]
        GROQ[Groq AI<br/>Llama 3.1]
    end
    
    FE --> SPRING
    FE --> PYTHON
    SPRING --> MYSQL
    PYTHON --> CHROMA
    PYTHON --> REDIS
    PYTHON --> GEMINI
    PYTHON --> GROQ
    SPRING <-.Sync.-> PYTHON
    
    style FE fill:#61dafb
    style SPRING fill:#6db33f
    style PYTHON fill:#009688
    style MYSQL fill:#4479a1
    style CHROMA fill:#ff6b6b
    style REDIS fill:#dc382d
    style GEMINI fill:#4285f4
    style GROQ fill:#ff6b35
```

### 🔄 **Luồng Dữ Liệu**

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant F as Next.js Frontend
    participant S as Spring Boot
    participant P as Python AI
    participant DB as MySQL
    participant V as ChromaDB
    participant AI as AI Models

    Note over U,AI: 🛍️ E-commerce Flow
    U->>F: Browse products
    F->>S: GET /shop/products
    S->>DB: Query products
    DB-->>S: Product data
    S-->>F: Products JSON
    F-->>U: Display products

    Note over U,AI: 🤖 AI Chat Flow
    U->>F: Ask product question
    F->>P: POST /api/groq-chat/send
    P->>V: Vector search products
    V-->>P: Relevant products
    P->>AI: Generate response
    AI-->>P: AI response
    P-->>F: Response + Products
    F-->>U: Display chat

    Note over U,AI: 📊 Analytics Flow
    S->>P: POST /api/analytics/sync-from-spring
    P->>V: Store vectors
    U->>F: Request analytics
    F->>P: POST /api/analytics/analyze
    P->>V: Query data
    P->>AI: Analyze
    AI-->>P: Insights
    P-->>F: Analytics
```

---

## 📦 **Chi Tiết Các Services**

### 1️⃣ **Frontend Service (Next.js)**

**📍 Vị trí:** `/frontend`  
**🌐 Port:** 3009  
**⚙️ Framework:** Next.js 16.0.6 (App Router)

#### **Công Nghệ**
- ⚛️ **React 19.2.0** - UI framework
- 🎨 **Tailwind CSS 4** - Styling
- 📝 **TypeScript 5** - Type safety
- 🎯 **Lucide React** - Icons
- 📄 **React Markdown** - Markdown rendering

#### **Cấu Trúc Thư Mục**
```
frontend/
├── src/
│   ├── app/                    # App Router pages
│   │   ├── page.tsx           # 🏠 Homepage
│   │   ├── ai-chat/           # 🤖 AI Chat interface
│   │   ├── cart/              # 🛒 Shopping cart
│   │   ├── checkout/          # 💳 Checkout page
│   │   ├── login/             # 🔐 Login page
│   │   ├── register/          # ✍️ Register page
│   │   ├── profile/           # 👤 User profile
│   │   ├── orders/            # 📦 Order history
│   │   └── admin/             # 👑 Admin panel
│   │       ├── ai-insights/   # 📊 AI analytics
│   │       ├── ai-agent-chat/ # 🤖 Admin AI chat
│   │       ├── products/      # 📦 Product management
│   │       ├── categories/    # 🏷️ Category management
│   │       ├── orders/        # 📋 Order management
│   │       └── users/         # 👥 User management
│   ├── components/            # Reusable components
│   │   ├── Navbar.tsx        # Navigation bar
│   │   ├── ProductCard.tsx   # Product display
│   │   ├── CartDrawer.tsx    # Cart sidebar
│   │   └── ...
│   ├── lib/                   # API clients
│   │   └── apiClient.ts      # API integration
│   ├── config/                # Configuration
│   │   └── apiConfig.ts      # API endpoints
│   └── utils/                 # Utilities
│       └── authUtils.ts      # Auth helpers
└── public/                    # Static assets
```

#### **Tính Năng Pages**

| Page | Route | Mô Tả | Auth |
|------|-------|-------|------|
| 🏠 Homepage | `/` | Landing page, featured products | Public |
| 🤖 AI Chat | `/ai-chat` | AI chatbot interface | Public |
| 🛒 Cart | `/cart` | Shopping cart | Any |
| 💳 Checkout | `/checkout` | Order checkout | Customer |
| 🔐 Login | `/login` | User login | Public |
| ✍️ Register | `/register` | User registration | Public |
| 👤 Profile | `/profile` | User profile | Any |
| 📦 Orders | `/orders` | Order history | Customer |
| 📊 AI Insights | `/admin/ai-insights` | Business analytics | Admin/Business |
| 🤖 Agent Chat | `/admin/ai-agent-chat` | Admin AI chat | Admin/Business |
| 📦 Products Admin | `/admin/products` | Product management | Admin/Business |
| 🏷️ Categories Admin | `/admin/categories` | Category management | Admin/Business |
| 📋 Orders Admin | `/admin/orders` | Order management | Admin/Business |
| 👥 Users Admin | `/admin/users` | User management | Admin/Business |

#### **API Integration**
```typescript
// src/config/apiConfig.ts
export const API_BASE_URL = 'http://localhost:8089/api/v1'
export const PYTHON_API_URL = 'http://localhost:5000'
```

---

### 2️⃣ **Python AI Service (FastAPI)**

**📍 Vị trí:** `/backend/Pythonservice`  
**🌐 Port:** 5000  
**⚙️ Framework:** FastAPI 0.109.0

#### **Công Nghệ**
- ⚡ **FastAPI** - Modern async web framework
- 🤖 **Google Gemini** - AI analysis
- 🚀 **Groq AI** - Fast inference
- 💾 **ChromaDB** - Vector database
- 🔴 **Redis** - Chat history cache
- 📄 **Document Processing** - PDF, Excel, Word, CSV

#### **Cấu Trúc Service**
```
Pythonservice/
├── app.py                      # 🚀 Main application
├── requirements.txt            # 📦 Dependencies
├── st.sh                       # 🔧 Startup script
├── .env                        # 🔐 Environment config
├── routes/                     # 🛣️ API Routes
│   ├── health.py              # 🏥 Health check
│   ├── groq_chat.py           # 🤖 Customer chat
│   ├── admin_chat.py          # 👑 Admin chat
│   ├── analytics.py           # 📊 Business analytics
│   ├── business_analytics.py  # 📈 Extended analytics
│   ├── data_sync.py           # 🔄 Data synchronization
│   └── agent_actions.py       # 🎯 Agent actions
├── services/                   # 💼 Business Logic
│   ├── ai_service.py          # 🤖 AI service wrapper
│   ├── analytics_rag_service.py    # 📊 RAG for analytics
│   ├── chat_ai_rag_chroma_service.py # 💬 Chat RAG
│   ├── data_sync_service.py   # 🔄 Sync service
│   ├── document_processing_service.py # 📄 Doc processor
│   ├── redis_chat_service.py  # 🔴 Redis cache
│   ├── jwt_util.py            # 🔐 JWT utilities
│   └── rag_prompt_service.py  # 📝 Prompt templates
├── chroma_analytics/           # 💾 Analytics vector DB
└── chroma_chat_ai/            # 💾 Chat vector DB
```

#### **API Endpoints**

##### 🏥 **Health & System**
| Method | Endpoint | Mô Tả |
|--------|----------|-------|
| `GET` | `/` | Service info |
| `GET` | `/health/` | Health check |

##### 🤖 **Customer Chat (Groq)**
| Method | Endpoint | Mô Tả |
|--------|----------|-------|
| `POST` | `/api/groq-chat/send` | Send chat message |
| `GET` | `/api/groq-chat/history/{session_id}` | Get chat history |
| `POST` | `/api/groq-chat/clear/{session_id}` | Clear history |
| `GET` | `/api/groq-chat/sessions` | List sessions |

##### 👑 **Admin Chat Management**
| Method | Endpoint | Mô Tả |
|--------|----------|-------|
| `GET` | `/api/admin/chat/sessions` | List all sessions |
| `GET` | `/api/admin/chat/sessions/{session_id}` | Get session |
| `DELETE` | `/api/admin/chat/sessions/{session_id}` | Delete session |
| `GET` | `/api/admin/chat/stats` | Chat statistics |

##### 📊 **Business Analytics**
| Method | Endpoint | Mô Tả |
|--------|----------|-------|
| `POST` | `/api/analytics/analyze` | AI analysis |
| `POST` | `/api/analytics/data` | Save business data |
| `POST` | `/api/analytics/orders` | Save order analytics |
| `POST` | `/api/analytics/trends` | Save trends |
| `GET` | `/api/analytics/data/all` | Get all data |
| `GET` | `/api/analytics/stats` | Database stats |
| `GET` | `/api/analytics/models` | Available AI models |
| `POST` | `/api/analytics/process-document` | Process document |
| `POST` | `/api/analytics/sync-from-spring` | Sync from Spring |

##### 🎯 **Agent Actions**
| Method | Endpoint | Mô Tả |
|--------|----------|-------|
| `POST` | `/api/agent/add-to-cart` | Add to cart |
| `POST` | `/api/agent/view-cart` | View cart |
| `POST` | `/api/agent/search-products` | Search products |

#### **ChromaDB Collections**

| Collection | Mục Đích | Dữ Liệu |
|------------|----------|---------|
| `business_data` | Business analytics | JSON + Metadata |
| `orders_analytics` | Order analysis | Order JSON |
| `business_documents` | Document search | Text + Embeddings |
| `trends` | Business trends | Trend JSON |
| `products` | Product search | Product JSON |
| `orders` | Order data | Order JSON |
| `categories` | Category data | Category JSON |
| `users` | User data | User JSON |

#### **AI Models**

##### Google Gemini
- `gemini-2.5-pro` - 2M tokens context (phân tích phức tạp)
- `gemini-2.5-flash` - 1M tokens (chat nhanh)
- `gemini-1.5-pro` - 2M tokens (analytics)
- `gemini-1.5-flash` - 1M tokens (general)

##### Groq
- `llama-3.1-70b-versatile` - Sức mạnh tối đa
- `llama-3.1-8b-instant` - Nhanh nhất
- `mixtral-8x7b-32768` - Đa nhiệm

#### **Environment Variables**
```env
# Server Configuration
SERVER_HOST=0.0.0.0
SERVER_PORT=5000
SERVER_IP=localhost

# AI API Keys
GOOGLE_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key

# ChromaDB
CHROMA_ANALYTICS_PATH=./chroma_analytics

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=
CHAT_HISTORY_TTL=86400

# Spring Service
SPRING_SERVICE_URL=http://localhost:8089/api/v1
```

---

### 3️⃣ **Spring Boot Service (Java)**

**📍 Vị trí:** `/backend/SpringService`  
**🌐 Port:** 8089  
**⚙️ Framework:** Spring Boot 4.0.0  
**📍 Base Path:** `/api/v1`

#### **Công Nghệ**
- ☕ **Java 17** - Programming language
- 🌱 **Spring Boot 4.0** - Application framework
- 🛡️ **Spring Security** - Security & JWT auth
- 🗃️ **Spring Data JPA** - ORM (Hibernate)
- 🐬 **MySQL 8.0** - Relational database
- 📚 **Swagger/OpenAPI** - API documentation
- 🔐 **BCrypt** - Password encryption
- 🎫 **JWT** - Token authentication

#### **Cấu Trúc Service**
```
SpringService/
├── src/main/java/com/business/springservice/
│   ├── SpringServiceApplication.java  # 🚀 Main app
│   ├── config/                        # ⚙️ Configuration
│   │   ├── SecurityConfig.java       # 🔐 Security config
│   │   ├── DataInitializer.java      # 📊 Data seeding
│   │   ├── CorsConfig.java           # 🌐 CORS config
│   │   └── SwaggerConfig.java        # 📚 API docs config
│   ├── controller/                    # 🎮 REST Controllers
│   │   ├── AuthController.java       # 🔐 Auth endpoints
│   │   ├── UserController.java       # 👤 User management
│   │   ├── ProfileController.java    # 👤 Profile management
│   │   ├── CategoryController.java   # 🏷️ Category CRUD
│   │   ├── ProductController.java    # 📦 Product CRUD
│   │   ├── ShopController.java       # 🏪 Public shop
│   │   ├── OrderController.java      # 📋 Order management
│   │   ├── BusinessDocumentController.java # 📄 Documents
│   │   └── DashboardController.java  # 📊 Analytics
│   ├── dto/                           # 📦 Data Transfer Objects
│   │   ├── LoginRequest.java
│   │   ├── RegisterRequest.java
│   │   ├── ProductDTO.java
│   │   ├── OrderDTO.java
│   │   └── ...
│   ├── entity/                        # 🗃️ JPA Entities
│   │   ├── User.java                 # 👤 User entity
│   │   ├── Category.java             # 🏷️ Category entity
│   │   ├── Product.java              # 📦 Product entity
│   │   ├── Order.java                # 📋 Order entity
│   │   ├── OrderItem.java            # 📦 Order item entity
│   │   └── BusinessDocument.java     # 📄 Document entity
│   ├── enums/                         # 📝 Enumerations
│   │   ├── Role.java                 # 👥 User roles
│   │   ├── AccountStatus.java        # 🚦 Account status
│   │   ├── OrderStatus.java          # 📦 Order status
│   │   └── Status.java               # 🔄 General status
│   ├── repository/                    # 🗄️ Data Repositories
│   │   ├── UserRepository.java
│   │   ├── CategoryRepository.java
│   │   ├── ProductRepository.java
│   │   ├── OrderRepository.java
│   │   └── ...
│   ├── security/                      # 🔐 Security
│   │   ├── JwtUtil.java              # JWT utilities
│   │   ├── JwtAuthenticationFilter.java # JWT filter
│   │   └── RoleAuthorizationFilter.java # Role filter
│   └── service/                       # 💼 Business Services
│       ├── AuthService.java
│       ├── UserService.java
│       ├── CategoryService.java
│       ├── ProductService.java
│       ├── OrderService.java
│       └── ...
├── src/main/resources/
│   └── application.yml                # 📝 Configuration
└── pom.xml                            # 📦 Maven dependencies
```

#### **Database Configuration**
```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/AI_Agent_db
    username: root
    password: 1111
  jpa:
    hibernate:
      ddl-auto: create  # Recreate DB on restart
    show-sql: true
server:
  port: 8089
  servlet:
    context-path: /api/v1
```

#### **API Endpoints**

##### 🔐 **Authentication (Public)**
| Method | Endpoint | Mô Tả |
|--------|----------|-------|
| `POST` | `/auth/register` | Đăng ký tài khoản |
| `POST` | `/auth/login` | Đăng nhập |

##### 👤 **User Management (Admin/Business)**
| Method | Endpoint | Mô Tả |
|--------|----------|-------|
| `GET` | `/users` | Danh sách users |
| `GET` | `/users/{id}` | Chi tiết user |
| `POST` | `/users` | Tạo user mới |
| `PATCH` | `/users/{id}` | Cập nhật user |
| `PATCH` | `/users/{id}/status?status=ACTIVE` | Đổi trạng thái |
| `DELETE` | `/users/{id}` | Xóa user |

##### 👤 **Profile Management (All)**
| Method | Endpoint | Mô Tả |
|--------|----------|-------|
| `GET` | `/profile` | Xem profile |
| `PATCH` | `/profile` | Cập nhật profile |
| `POST` | `/profile/change-password` | Đổi mật khẩu |

##### 🏪 **Shop (Public)**
| Method | Endpoint | Mô Tả |
|--------|----------|-------|
| `GET` | `/shop/products` | Tất cả sản phẩm |
| `GET` | `/shop/products/{id}` | Chi tiết sản phẩm |
| `GET` | `/shop/categories` | Tất cả danh mục |
| `GET` | `/shop/categories/{id}` | Chi tiết danh mục |
| `GET` | `/shop/products/category/{categoryId}` | Sản phẩm theo danh mục |
| `GET` | `/shop/products/search?keyword={keyword}` | Tìm kiếm sản phẩm |

##### 🏷️ **Category Management (Admin/Business)**
| Method | Endpoint | Mô Tả |
|--------|----------|-------|
| `GET` | `/admin/categories` | Tất cả categories |
| `GET` | `/admin/categories/{id}` | Chi tiết category |
| `POST` | `/admin/categories` | Tạo category |
| `PATCH` | `/admin/categories/{id}` | Cập nhật category |
| `PATCH` | `/admin/categories/{id}/status?status=ACTIVE` | Đổi trạng thái |
| `DELETE` | `/admin/categories/{id}` | Xóa category |

##### 📦 **Product Management (Admin/Business)**
| Method | Endpoint | Mô Tả |
|--------|----------|-------|
| `GET` | `/admin/products` | Tất cả products |
| `GET` | `/admin/products/{id}` | Chi tiết product |
| `GET` | `/admin/products/category/{categoryId}` | Products theo category |
| `GET` | `/admin/products/seller/{sellerId}` | Products của seller |
| `GET` | `/admin/products/search?keyword={keyword}` | Tìm kiếm products |
| `POST` | `/admin/products` | Tạo product |
| `PATCH` | `/admin/products/{id}` | Cập nhật product |
| `PATCH` | `/admin/products/{id}/status?status=ACTIVE` | Đổi trạng thái |
| `DELETE` | `/admin/products/{id}` | Xóa product |

##### 📋 **Orders (Customer)**
| Method | Endpoint | Mô Tả |
|--------|----------|-------|
| `POST` | `/orders` | Tạo đơn hàng |
| `GET` | `/orders/my-orders` | Lịch sử đơn hàng |
| `GET` | `/orders/{id}` | Chi tiết đơn hàng |
| `POST` | `/orders/{id}/cancel` | Hủy đơn hàng |
| `PATCH` | `/orders/{id}/address` | Cập nhật địa chỉ |

##### 📋 **Order Management (Admin/Business)**
| Method | Endpoint | Mô Tã |
|--------|----------|-------|
| `GET` | `/admin/orders` | Tất cả orders |
| `GET` | `/admin/orders/{id}` | Chi tiết order |
| `GET` | `/admin/orders/customer/{customerId}` | Orders của customer |
| `GET` | `/admin/orders/status/{status}` | Orders theo status |
| `PATCH` | `/admin/orders/{id}/status?status=CONFIRMED` | Cập nhật status |

##### 📄 **Business Documents (Business)**
| Method | Endpoint | Mô Tả |
|--------|----------|-------|
| `POST` | `/admin/business-documents` | Upload tài liệu |
| `GET` | `/admin/business-documents/my-documents` | Tài liệu của mình |
| `GET` | `/admin/business-documents/{id}` | Chi tiết tài liệu |
| `GET` | `/admin/business-documents/business/{businessId}` | Tài liệu của business |
| `DELETE` | `/admin/business-documents/{id}` | Xóa tài liệu |

##### 📊 **Dashboard & Reports**
| Method | Endpoint | Mô Tả |
|--------|----------|-------|
| `GET` | `/admin/dashboard/admin-stats` | Thống kê toàn hệ thống |
| `GET` | `/admin/dashboard/business-stats` | Thống kê business |
| `GET` | `/admin/dashboard/revenue/daily?days=7` | Doanh thu theo ngày |
| `GET` | `/admin/dashboard/revenue/weekly?weeks=4` | Doanh thu theo tuần |
| `GET` | `/admin/dashboard/revenue/monthly?months=6` | Doanh thu theo tháng |
| `GET` | `/admin/dashboard/admin/revenue/daily?days=7` | Doanh thu hệ thống/ngày |
| `GET` | `/admin/dashboard/admin/revenue/weekly?weeks=4` | Doanh thu hệ thống/tuần |
| `GET` | `/admin/dashboard/admin/revenue/monthly?months=6` | Doanh thu hệ thống/tháng |

#### **Database Schema**

##### **Users**
```sql
id, username, email, password (BCrypt), role (ADMIN/BUSINESS/CUSTOMER),
accountStatus (ACTIVE/INACTIVE/SUSPENDED/BANNED), address, phoneNumber,
createdAt, updatedAt
```

##### **Categories**
```sql
id, name, description, imageUrl, status (ACTIVE/INACTIVE),
createdAt, updatedAt
```

##### **Products**
```sql
id, name, description, price, quantity, imageUrls (JSON),
categoryId, sellerId, status (ACTIVE/INACTIVE), createdAt, updatedAt
```

##### **Orders**
```sql
id, customerId, customerName, customerEmail, customerPhone,
shippingAddress, totalAmount, status (PENDING/CONFIRMED/PROCESSING/
SHIPPING/DELIVERED/CANCELLED/RETURNED), note, createdAt, updatedAt
```

##### **OrderItems**
```sql
id, orderId, productId, productName, productPrice, quantity, subtotal
```

##### **BusinessDocuments**
```sql
id, businessId, fileName, fileType, filePath, fileSize,
description, uploadedAt
```

#### **Security & Authentication**

##### JWT Token
Tất cả API (trừ Public) yêu cầu JWT token:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

##### Filter Chain
1. **JwtAuthenticationFilter** - Xác thực JWT token
2. **RoleAuthorizationFilter** - Kiểm tra role

##### Default Users
```
Admin:     admin@ai.com     / hoang123 (ADMIN)
Business:  business@ai.com  / hoang123 (BUSINESS)
Customer:  customer@ai.com  / hoang123 (CUSTOMER)
```

---

## 🚀 **Cài Đặt Nhanh**

### 📋 **Yêu Cầu Hệ Thống**

- ☕ **Java 17** (Spring Service)
- 🐍 **Python 3.8+** (Python Service)
- 📦 **Node.js 18+** & npm (Frontend)
- 🐬 **MySQL 8.0+** (Database)
- 🔴 **Redis** (Optional - Chat history)
- 🔑 **API Keys**: Google Gemini, Groq

### 🔧 **Cài Đặt Chi Tiết**

#### **1. Clone Repository**
```bash
git clone https://github.com/vanhoangtvu/AI-Agent-for-Business.git
cd AI-Agent-for-Business
```

#### **2. Cài Đặt MySQL Database**
```bash
# Tạo database
mysql -u root -p1111 -e "CREATE DATABASE AI_Agent_db;"
```

#### **3. Cài Đặt Redis (Optional)**
```bash
# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis

# macOS
brew install redis
brew services start redis
```

#### **4. Spring Boot Service**
```bash
cd backend/SpringService

# Chỉnh sửa application.yml nếu cần
# spring.datasource.password: your_mysql_password

# Chạy service
mvn spring-boot:run

# Server chạy tại: http://localhost:8089/api/v1
# Swagger UI: http://localhost:8089/api/v1/swagger-ui.html
```

#### **5. Python AI Service**
```bash
cd backend/Pythonservice

# Tạo và cấu hình .env
cp .env.example .env

# Chỉnh sửa .env với API keys của bạn
# GOOGLE_API_KEY=your_gemini_key
# GROQ_API_KEY=your_groq_key

# Chạy service (script tự động tạo venv và cài dependencies)
chmod +x st.sh
./st.sh

# Server chạy tại: http://localhost:5000
# API Docs: http://localhost:5000/docs
```

#### **6. Frontend (Next.js)**
```bash
cd frontend

# Tạo .env.local nếu cần
cp .env.example .env.local

# Cài dependencies
npm install

# Chạy development server
npm run dev

# Frontend chạy tại: http://localhost:3009
```

### ✅ **Kiểm Tra Services**

```bash
# Spring Boot
curl http://localhost:8089/api/v1/shop/products

# Python AI
curl http://localhost:5000/health/

# Frontend
open http://localhost:3009
```

---

## 🎯 **Hướng Dẫn Sử Dụng**

### 👤 **Đối Với Khách Hàng (CUSTOMER)**

1. **🏠 Duyệt Sản Phẩm**
   - Truy cập http://localhost:3009
   - Xem danh sách sản phẩm
   - Tìm kiếm, lọc theo danh mục

2. **🤖 Chat Với AI Agent**
   - Click "Agent Chat" trên navbar
   - Hỏi về sản phẩm: "Cho tôi xem smartphone giá dưới 10 triệu"
   - AI sẽ hiển thị sản phẩm với hình ảnh
   - Click "Thêm vào giỏ" để thêm sản phẩm

3. **🛒 Mua Hàng**
   - Thêm sản phẩm vào giỏ hàng
   - Xem giỏ hàng
   - Tiến hành checkout
   - Xem lịch sử đơn hàng tại `/orders`

### 👑 **Đối Với Admin/Business**

1. **📊 Quản Lý Sản Phẩm**
   - Đăng nhập: admin@ai.com / hoang123
   - Truy cập `/admin/products`
   - Thêm/sửa/xóa sản phẩm

2. **📈 Phân Tích AI**
   - Truy cập `/admin/ai-insights`
   - Hỏi AI: "Phân tích doanh thu tháng này"
   - Upload tài liệu để AI phân tích

3. **📋 Quản Lý Đơn Hàng**
   - Truy cập `/admin/orders`
   - Cập nhật trạng thái đơn hàng
   - Xem thống kê

---

## 📖 **Tài Liệu API**

### **Swagger/OpenAPI Documentation**

- **Spring Boot API**: http://localhost:8089/api/v1/swagger-ui.html
- **Python AI API**: http://localhost:5000/docs
- **Python ReDoc**: http://localhost:5000/redoc

### **Postman Collection**

Xem chi tiết trong các file README của từng service:
- [Frontend README](frontend/README.md)
- [Python Service README](backend/Pythonservice/README.md)
- [Spring Service README](backend/SpringService/README.md)

---

## 🛠️ **Technology Stack**

### **Frontend**
- ⚛️ Next.js 16.0.6 (React 19.2.0)
- 🎨 Tailwind CSS 4
- 📝 TypeScript 5
- 🎯 Lucide Icons
- 📄 React Markdown

### **Backend - Spring Boot**
- ☕ Java 17
- 🌱 Spring Boot 4.0.0
- 🗃️ Spring Data JPA (Hibernate)
- 🔐 Spring Security + JWT
- 🐬 MySQL 8.0
- 📚 Swagger/OpenAPI 3

### **Backend - Python AI**
- 🐍 Python 3.8+
- ⚡ FastAPI 0.109.0
- 🤖 Google Gemini AI
- 🚀 Groq AI (Llama 3.1)
- 💾 ChromaDB 0.4.22
- 🔴 Redis 5.0.1
- 📄 PyPDF2, python-docx, pandas, openpyxl

### **Database & Cache**
- 🐬 MySQL 8.0 (Relational DB)
- 💾 ChromaDB (Vector DB)
- 🔴 Redis (Cache)

---

## 🌟 **Tính Năng Nổi Bật**

### 🤖 **AI Chat Agent**
- Trò chuyện tự nhiên bằng tiếng Việt
- Tìm kiếm sản phẩm thông minh
- Hiển thị sản phẩm với hình ảnh trong chat
- Thêm vào giỏ hàng trực tiếp từ chat
- Lưu lịch sử trò chuyện với Redis

### 📊 **Business Analytics**
- Phân tích dữ liệu với AI
- Xử lý tài liệu tự động
- Vector search với ChromaDB
- Báo cáo doanh thu chi tiết
- Đề xuất chiến lược kinh doanh

### 🛍️ **E-commerce**
- Quản lý sản phẩm đa cấp
- Giỏ hàng thông minh
- Checkout đơn giản
- Theo dõi đơn hàng
- Phân quyền đa cấp

### 🔐 **Security**
- JWT Authentication
- Role-based Access Control (RBAC)
- BCrypt password encryption
- Secure API endpoints

---

## 🔧 **Environment Variables**

### **Python Service (.env)**
```env
# Server
SERVER_HOST=0.0.0.0
SERVER_PORT=5000
SERVER_IP=localhost

# AI Keys
GOOGLE_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key

# ChromaDB
CHROMA_ANALYTICS_PATH=./chroma_analytics

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=
CHAT_HISTORY_TTL=86400

# Spring Service
SPRING_SERVICE_URL=http://localhost:8089/api/v1
```

### **Spring Service (application.yml)**
```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/AI_Agent_db
    username: root
    password: 1111
server:
  port: 8089
  servlet:
    context-path: /api/v1
```

### **Frontend (.env.local)**
```env
NEXT_PUBLIC_API_URL=http://localhost:8089/api/v1
NEXT_PUBLIC_PYTHON_API_URL=http://localhost:5000
```

---

## 🐛 **Khắc Phục Sự Cố**

### **Lỗi Kết Nối Database**
```bash
# Kiểm tra MySQL đang chạy
sudo systemctl status mysql

# Kiểm tra database tồn tại
mysql -u root -p1111 -e "SHOW DATABASES;"
```

### **Lỗi API Key**
```bash
# Kiểm tra .env file
cat backend/Pythonservice/.env | grep API_KEY

# Test Gemini API
curl -H "Authorization: Bearer $GOOGLE_API_KEY" \
     https://generativelanguage.googleapis.com/v1/models
```

### **Lỗi Port Đã Được Sử Dụng**
```bash
# Tìm process sử dụng port
lsof -i :8089  # Spring Boot
lsof -i :5000  # Python
lsof -i :3009  # Frontend

# Kill process
kill -9 <PID>
```

### **Chrome DB Issues**
```bash
# Reset ChromaDB
rm -rf backend/Pythonservice/chroma_analytics
rm -rf backend/Pythonservice/chroma_chat_ai

# Restart Python service
cd backend/Pythonservice
./st.sh
```

---

## 📝 **Notes**

- 🔄 Database sử dụng `ddl-auto: create` - tạo mới mỗi lần khởi động Spring Boot
- 📁 File upload lưu tại `backend/SpringService/uploads/documents/`
- 🎯 Sản phẩm ACTIVE hiển thị ở `/shop/*`, tất cả hiển thị ở `/admin/*`
- 🛒 Customer chỉ hủy order khi status là PENDING hoặc CONFIRMED
- 🔴 Redis là optional - nếu không có, chat history không được lưu lâu dài

---

## 📄 **License**

Copyright © 2025 Nguyễn Văn Hoàng - Đại Học Trà Vinh

---

## 📞 **Liên Hệ**

- **📧 Email**: nguyenvanhoang@example.com
- **💻 GitHub**: [@vanhoangtvu](https://github.com/vanhoangtvu)
- **🏫 Trường**: Đại Học Trà Vinh
- **👨‍🏫 Giảng viên**: ThS. TS. Nguyễn Bảo Ân

---

<div align="center">

**⭐ Nếu project này hữu ích, hãy cho một star! ⭐**

**Cập nhật lần cuối**: Tháng 12/2025

Made with ❤️ by Nguyễn Văn Hoàng

</div>
