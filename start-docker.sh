#!/bin/bash

# 🚀 Quick Start Script - AI Agent for Business
# Script tự động để start toàn bộ dự án với Docker

set -e

echo "🐳 AI Agent for Business - Docker Quick Start"
echo "=============================================="
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker chưa được cài đặt!"
    echo "👉 Cài đặt Docker tại: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose chưa được cài đặt!"
    echo "👉 Cài đặt Docker Compose tại: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker và Docker Compose đã sẵn sàng"
echo ""

# Check .env file
if [ ! -f .env ]; then
    echo "⚠️  File .env chưa tồn tại. Đang tạo từ .env.docker..."
    cp .env.docker .env
    echo "✅ Đã tạo file .env"
    echo ""
    echo "⚠️  QUAN TRỌNG: Vui lòng cập nhật các API keys trong file .env:"
    echo "   - GROQ_API_KEY"
    echo "   - GOOGLE_API_KEY"
    echo ""
    read -p "Nhấn Enter sau khi đã cập nhật .env hoặc Ctrl+C để thoát..."
fi

# Choose mode
echo "Chọn chế độ chạy:"
echo "1) Production (tối ưu, không hot-reload)"
echo "2) Development (hot-reload, debugging)"
echo ""
read -p "Nhập lựa chọn (1 hoặc 2) [1]: " mode
mode=${mode:-1}

if [ "$mode" = "2" ]; then
    COMPOSE_FILE="docker-compose.dev.yml"
    echo "🛠️  Chế độ: Development"
else
    COMPOSE_FILE="docker-compose.yml"
    echo "🚀 Chế độ: Production"
fi

echo ""
echo "📦 Đang build và start các services..."
echo ""

# Build and start
docker-compose -f $COMPOSE_FILE up -d --build

echo ""
echo "⏳ Đang chờ services khởi động..."
sleep 10

# Check status
echo ""
echo "📊 Trạng thái các services:"
docker-compose -f $COMPOSE_FILE ps

echo ""
echo "✅ Dự án đã sẵn sàng!"
echo ""
echo "🌐 URLs:"
echo "   Frontend:  http://localhost:3009"
echo "   Spring:    http://localhost:8089/api/v1"
echo "   Python:    http://localhost:5000"
echo "   Swagger:   http://localhost:8089/api/v1/swagger-ui.html"
echo "   API Docs:  http://localhost:5000/docs"
echo ""
echo "📝 Xem logs:"
echo "   docker-compose -f $COMPOSE_FILE logs -f"
echo ""
echo "🛑 Dừng services:"
echo "   docker-compose -f $COMPOSE_FILE down"
echo ""
