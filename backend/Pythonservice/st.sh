#!/bin/bash

# Script để khởi động Python Service với Redis
# Sử dụng: bash start_with_redis.sh

echo "========================================"
echo "  Starting AI Agent for Business"
echo "========================================"

# Kiểm tra Redis
echo "[1/3] Kiểm tra Redis..."
if redis-cli ping > /dev/null 2>&1; then
    echo "✓ Redis đang chạy"
else
    echo "✗ Redis không chạy, khởi động..."
    sudo systemctl start redis-server
    if redis-cli ping > /dev/null 2>&1; then
        echo "✓ Redis khởi động thành công"
    else
        echo "✗ Không thể khởi động Redis!"
        exit 1
    fi
fi

# Kiểm tra port 5000
echo ""
echo "[2/3] Kiểm tra port 5000..."
PID=$(lsof -i :5000 2>/dev/null | grep python | awk '{print $2}' | head -1)
if [ ! -z "$PID" ]; then
    echo "⚠ Tìm thấy process Python đang chạy (PID: $PID), dừng nó..."
    kill -9 $PID 2>/dev/null
    sleep 2
fi
echo "✓ Port 5000 sẵn sàng"

# Khởi động Python Service
echo ""
echo "[3/3] Khởi động Python Service..."
cd "$(dirname "$0")"

# Kiểm tra .env
if [ ! -f .env ]; then
    echo "✗ Lỗi: Không tìm thấy file .env"
    exit 1
fi

# Khởi động với uvicorn
python3 -m uvicorn app:app \
    --host 0.0.0.0 \
    --port 5000 \
    --reload \
    --log-level info

echo ""
echo "========================================"
echo "  Service stopped"
echo "========================================"
