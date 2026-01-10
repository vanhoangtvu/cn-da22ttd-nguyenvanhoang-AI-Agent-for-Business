#!/bin/bash

# Đường dẫn dự án
PROJECT_ROOT="/home/hv/DuAn/CSN/AI-Agent-for-Business"

echo "🚀 Đang khởi động AgentBiz System..."

# 1. Start Python Service
# Kiểm tra xem venv có tồn tại không, nếu không thì dùng python hệ thống hoặc báo lỗi
echo "Starting Python Service..."
gnome-terminal --tab --title="🐍 Python Service" -- bash -c "cd $PROJECT_ROOT/backend/Pythonservice && if [ -d 'venv' ]; then source venv/bin/activate; fi && python3 app.py; exec bash"

# 2. Start Spring Boot Service
echo "Starting Spring Boot Service..."
gnome-terminal --tab --title="🍃 Spring Service" -- bash -c "cd $PROJECT_ROOT/backend/SpringService && ./mvnw spring-boot:run; exec bash"

# 3. Start Frontend
echo "Starting Frontend..."
gnome-terminal --tab --title="💻 Frontend" -- bash -c "cd $PROJECT_ROOT/frontend && npm run dev; exec bash"

echo "✅ Đã gửi lệnh khởi chạy cho cả 3 services!"
echo "Vui lòng đợi một vài phút để các service khởi động hoàn tất."
