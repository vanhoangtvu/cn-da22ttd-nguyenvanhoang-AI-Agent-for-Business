# Environment Configuration Guide

## Tổng quan
Dự án đã được cấu hình để sử dụng **biến môi trường** thay vì hardcode địa chỉ IP/URL. Điều này giúp:
- ✅ Dễ dàng triển khai trên nhiều môi trường (dev, staging, production)
- ✅ Bảo mật thông tin nhạy cảm (database credentials, API keys)
- ✅ Thay đổi cấu hình mà không cần rebuild code

## Cấu hình cho từng service

### 1. Frontend (Next.js)

**File:** `/frontend/.env.local` (production) hoặc `.env.example` (template)

```bash
# Spring Boot Backend API URL
NEXT_PUBLIC_API_URL=http://your-production-ip:8089/api/v1

# Python AI Service URL
NEXT_PUBLIC_AI_SERVICE_URL=http://your-production-ip:5000
```

**Lưu ý:**
- Biến phải có prefix `NEXT_PUBLIC_` để exposed ra browser
- File `.env.local` không được commit (đã thêm vào .gitignore)
- Copy từ `.env.example` và điền giá trị thực

### 2. Spring Service (Java)

**File:** `/backend/SpringService/.env` (tạo từ `.env.example`)

```bash
# Database Configuration
DATABASE_URL=jdbc:mysql://your-db-host:3306/AI_Agent_db?allowPublicKeyRetrieval=true&useSSL=false
DATABASE_USERNAME=root
DATABASE_PASSWORD=your_password

# Python Service URL
PYTHON_SERVICE_URL=http://your-python-service:5000

# Spring Service URL (for Swagger documentation)
SPRING_SERVICE_URL=http://your-spring-service:8089/api/v1
```

**Cách sử dụng trong Spring:**
- Trong `application.yml`: `${DATABASE_URL:jdbc:mysql://localhost:3306/AI_Agent_db}`
- Format: `${ENV_VAR:default_value}`
- Hoặc dùng `@Value("${database.url}")` trong Java code

### 3. Python Service

**File:** `/backend/Pythonservice/.env` (tạo từ `.env.example`)

```bash
# Groq API Key
GROQ_API_KEY=your_groq_api_key

# Spring Service URL
SPRING_SERVICE_URL=http://your-spring-service:8089/api/v1

# AI Service URL (this service)
AI_SERVICE_URL=http://localhost:5000

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Secret
JWT_SECRET_KEY=your_jwt_secret
```

**Cách sử dụng trong Python:**
```python
import os
spring_url = os.getenv('SPRING_SERVICE_URL', 'http://localhost:8089/api/v1')
```

## Deployment Instructions

### Development Environment
```bash
# Frontend
cd frontend
cp .env.example .env.local
# Edit .env.local with localhost URLs
npm run dev

# Spring Service
cd backend/SpringService
cp .env.example .env
# Edit .env with localhost configs
./mvnw spring-boot:run

# Python Service
cd backend/Pythonservice
cp .env.example .env
# Edit .env with localhost configs
python app.py
```

### Production Environment
```bash
# Frontend
cd frontend
cp .env.example .env.local
# Edit với production IPs:
# NEXT_PUBLIC_API_URL=http://113.180.22.255:8089/api/v1
# NEXT_PUBLIC_AI_SERVICE_URL=http://113.180.22.255:5000
npm run build
npm start

# Spring Service
cd backend/SpringService
cp .env.example .env
# Edit với production database và services
export DATABASE_URL=jdbc:mysql://113.180.22.255:3306/AI_Agent_db
export PYTHON_SERVICE_URL=http://113.180.22.255:5000
./mvnw spring-boot:run

# Python Service
cd backend/Pythonservice
cp .env.example .env
# Edit với production configs
export SPRING_SERVICE_URL=http://113.180.22.255:8089/api/v1
python app.py
```

## Checklist Triển khai

- [ ] Đã tạo file `.env` / `.env.local` cho từng service
- [ ] Đã cập nhật database credentials
- [ ] Đã cập nhật API keys (Groq, JWT secret...)
- [ ] Đã cập nhật URLs của các services
- [ ] Test kết nối giữa các services
- [ ] Verify không còn hardcode IPs trong code

## Troubleshooting

### Lỗi: Service không kết nối được
```bash
# Check environment variables
echo $SPRING_SERVICE_URL
echo $PYTHON_SERVICE_URL

# Frontend
cat frontend/.env.local

# Test API connection
curl http://your-spring-service:8089/api/v1/health
curl http://your-python-service:5000/health
```

### Lỗi: Database connection failed
```bash
# Verify database URL
echo $DATABASE_URL

# Test MySQL connection
mysql -h your-db-host -u root -p
```

## Best Practices

1. **Never commit `.env` files** - Đã configured trong `.gitignore`
2. **Use `.env.example`** - Template cho team members
3. **Different configs per environment** - Dev, staging, production
4. **Secure sensitive data** - API keys, passwords phải được mã hóa trong production
5. **Document all variables** - Comment trong `.env.example`

## Danh sách biến môi trường

### Frontend
- `NEXT_PUBLIC_API_URL` - Spring Service URL
- `NEXT_PUBLIC_AI_SERVICE_URL` - Python AI Service URL

### Spring Service  
- `DATABASE_URL` - MySQL connection string
- `DATABASE_USERNAME` - Database username
- `DATABASE_PASSWORD` - Database password
- `PYTHON_SERVICE_URL` - Python service URL
- `SPRING_SERVICE_URL` - This service URL (for Swagger)

### Python Service
- `GROQ_API_KEY` - Groq API key
- `SPRING_SERVICE_URL` - Spring service URL
- `AI_SERVICE_URL` - This service URL
- `REDIS_HOST` - Redis host
- `REDIS_PORT` - Redis port
- `JWT_SECRET_KEY` - JWT secret key

---

**Last Updated:** $(date +%Y-%m-%d)
**Status:** ✅ All hardcoded IPs removed, using environment variables
