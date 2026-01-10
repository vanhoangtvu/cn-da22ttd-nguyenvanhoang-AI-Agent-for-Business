# 🐳 Docker Setup Guide - AI Agent for Business

Hướng dẫn chạy toàn bộ dự án bằng Docker và Docker Compose.

---

## 📋 **Yêu Cầu**

- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB RAM trở lên
- 10GB disk space

---

## 🚀 **Quick Start - Production**

### 1. **Chuẩn bị môi trường**

```bash
# Copy file .env mẫu
cp .env.docker .env

# Cập nhật các biến môi trường trong .env
# Đặc biệt là GROQ_API_KEY và GOOGLE_API_KEY
nano .env
```

### 2. **Build và chạy tất cả services**

```bash
# Build và start tất cả containers
docker-compose up -d --build

# Xem logs
docker-compose logs -f

# Xem logs của service cụ thể
docker-compose logs -f spring-service
docker-compose logs -f python-service
docker-compose logs -f frontend
```

### 3. **Kiểm tra services**

```bash
# Kiểm tra trạng thái containers
docker-compose ps

# Kiểm tra health
docker-compose ps
```

**URLs**:
- Frontend: http://localhost:3009
- Spring API: http://localhost:8089/api/v1
- Python API: http://localhost:5000
- Swagger UI: http://localhost:8089/api/v1/swagger-ui.html
- API Docs: http://localhost:5000/docs

---

## 💻 **Development Mode**

Chế độ development với hot-reload và debugging.

### 1. **Chạy development stack**

```bash
# Build và start với hot-reload
docker-compose -f docker-compose.dev.yml up -d --build

# Xem logs realtime
docker-compose -f docker-compose.dev.yml logs -f
```

### 2. **Debug**

**Spring Boot Debug**:
- Port: 5005
- IntelliJ/VSCode: Connect remote debugger to localhost:5005

**Python Debug**:
- Code có hot-reload tự động
- Thêm breakpoint trong code

**Next.js**:
- Hot-reload tự động
- React DevTools hoạt động bình thường

### 3. **Stop development**

```bash
docker-compose -f docker-compose.dev.yml down
```

---

## 🛠️ **Các Lệnh Hữu Ích**

### **Quản lý Containers**

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart service cụ thể
docker-compose restart spring-service

# Stop và xóa volumes (cẩn thận - mất data!)
docker-compose down -v

# Rebuild service cụ thể
docker-compose up -d --build spring-service
```

### **Logs & Monitoring**

```bash
# Xem logs tất cả services
docker-compose logs

# Follow logs realtime
docker-compose logs -f

# Logs của 1 service với 100 dòng gần nhất
docker-compose logs --tail=100 python-service

# Xem resource usage
docker stats
```

### **Exec vào Container**

```bash
# Spring Service
docker-compose exec spring-service sh

# Python Service
docker-compose exec python-service bash

# Frontend
docker-compose exec frontend sh

# MySQL
docker-compose exec mysql mysql -u root -p

# Redis
docker-compose exec redis redis-cli -a redispass
```

### **Database Operations**

```bash
# Backup MySQL
docker-compose exec mysql mysqldump -u root -p${MYSQL_ROOT_PASSWORD} AI_Agent_db > backup.sql

# Restore MySQL
docker-compose exec -T mysql mysql -u root -p${MYSQL_ROOT_PASSWORD} AI_Agent_db < backup.sql

# Access MySQL CLI
docker-compose exec mysql mysql -u aiagent -p${MYSQL_PASSWORD} AI_Agent_db
```

### **Clean Up**

```bash
# Stop và xóa containers
docker-compose down

# Xóa volumes (mất data!)
docker-compose down -v

# Xóa images
docker-compose down --rmi all

# Clean up Docker system
docker system prune -a --volumes
```

---

## 📦 **Services Architecture**

```
┌─────────────────────────────────────────┐
│           Docker Network                │
│      (ai-agent-network)                 │
│                                         │
│  ┌──────────┐  ┌──────────────┐       │
│  │ Frontend │  │ Spring Boot  │       │
│  │ :3009    │──│ :8089        │       │
│  └──────────┘  └──────┬───────┘       │
│                       │                 │
│  ┌──────────┐  ┌─────▼────────┐       │
│  │ Python   │  │    MySQL     │       │
│  │ :5000    │──│    :3306     │       │
│  └─────┬────┘  └──────────────┘       │
│        │                               │
│  ┌─────▼────────┐                     │
│  │    Redis     │                     │
│  │    :6379     │                     │
│  └──────────────┘                     │
└─────────────────────────────────────────┘
```

---

## 🔧 **Configuration**

### **Environment Variables**

File `.env` chính:

```bash
# MySQL
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=AI_Agent_db
MYSQL_USER=aiagent
MYSQL_PASSWORD=aiagentpass

# Redis
REDIS_PASSWORD=redispass

# API Keys
GROQ_API_KEY=your_groq_api_key_here
GOOGLE_API_KEY=your_google_api_key_here

# JWT
JWT_SECRET_KEY=your_secret_key_here

# URLs (for production deployment)
NEXT_PUBLIC_API_URL=http://localhost:8089/api/v1
NEXT_PUBLIC_PYTHON_API_URL=http://localhost:5000
```

### **Volumes**

Persistent volumes được tạo:

- `mysql_data`: MySQL database
- `redis_data`: Redis persistence
- `chroma_analytics`: Analytics ChromaDB
- `chroma_chat_ai`: Chat AI ChromaDB
- `spring_logs`: Spring Boot logs
- `python_logs`: Python service logs

---

## 🐛 **Troubleshooting**

### **Container không start**

```bash
# Xem logs chi tiết
docker-compose logs service-name

# Kiểm tra container status
docker-compose ps

# Restart service
docker-compose restart service-name
```

### **Port conflicts**

```bash
# Kiểm tra port đang dùng
netstat -tuln | grep :3306
netstat -tuln | grep :8089

# Hoặc thay đổi port trong docker-compose.yml
ports:
  - "3307:3306"  # Map sang port khác
```

### **Out of memory**

```bash
# Tăng memory limit cho Docker Desktop
# Settings > Resources > Memory: 4GB+

# Hoặc giới hạn memory cho service cụ thể
services:
  spring-service:
    mem_limit: 1g
    mem_reservation: 512m
```

### **Rebuild từ đầu**

```bash
# Xóa toàn bộ và build lại
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### **Database connection issues**

```bash
# Kiểm tra MySQL có sẵn sàng chưa
docker-compose exec mysql mysqladmin ping -h localhost

# Kiểm tra logs MySQL
docker-compose logs mysql

# Reset database
docker-compose down -v
docker-compose up -d mysql
```

---

## 🚢 **Production Deployment**

### **1. Build Production Images**

```bash
# Build optimized images
docker-compose build --no-cache

# Tag images for registry
docker tag ai-agent-frontend:latest your-registry/ai-agent-frontend:v1.0.0
docker tag ai-agent-spring:latest your-registry/ai-agent-spring:v1.0.0
docker tag ai-agent-python:latest your-registry/ai-agent-python:v1.0.0
```

### **2. Push to Registry**

```bash
# Login to registry
docker login your-registry

# Push images
docker push your-registry/ai-agent-frontend:v1.0.0
docker push your-registry/ai-agent-spring:v1.0.0
docker push your-registry/ai-agent-python:v1.0.0
```

### **3. Deploy trên Server**

```bash
# Trên production server
git clone your-repo
cd AI-Agent-for-Business

# Setup environment
cp .env.docker .env
nano .env  # Update production values

# Pull và start
docker-compose pull
docker-compose up -d

# Setup SSL với Nginx/Caddy
# Cấu hình reverse proxy cho các services
```

### **4. Health Monitoring**

```bash
# Setup monitoring với Prometheus + Grafana
# Hoặc sử dụng docker health checks

docker-compose ps  # Kiểm tra health status
```

---

## 📊 **Performance Tips**

1. **Use BuildKit**: 
   ```bash
   export DOCKER_BUILDKIT=1
   export COMPOSE_DOCKER_CLI_BUILD=1
   ```

2. **Multi-stage builds**: Đã implement trong Dockerfiles

3. **Layer caching**: Dependencies được cache riêng

4. **Resource limits**: Set trong production compose

5. **Use Alpine images**: Giảm image size

---

## 🔒 **Security Checklist**

- [ ] Đổi tất cả passwords mặc định
- [ ] Sử dụng secrets thay vì env vars (production)
- [ ] Không expose database ports ra ngoài
- [ ] Sử dụng non-root users trong containers
- [ ] Enable HTTPS với SSL certificates
- [ ] Regular security updates cho base images
- [ ] Scan images với `docker scan`

---

## 📚 **Tài Liệu Tham Khảo**

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Best Practices](https://docs.docker.com/develop/dev-best-practices/)

---

**Happy Dockerizing! 🐳**
