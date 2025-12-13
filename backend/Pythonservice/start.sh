#!/bin/bash

# Start script for AI Agent Python Service
# Uses environment variables from .env file

echo "=========================================="
echo "🚀 AI Agent for Business"
echo "   Separated Architecture v3.0"
echo "=========================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.example to .env and configure it"
    echo ""
    echo "  cp .env.example .env"
    echo "  nano .env"
    echo ""
    exit 1
fi

# Load environment variables
echo "📝 Loading environment variables..."
export $(cat .env | grep -v '^#' | xargs)

# Check required API keys
if [ -z "$GOOGLE_API_KEY" ] || [ "$GOOGLE_API_KEY" = "your_gemini_api_key_here" ]; then
    echo "⚠️  Warning: GOOGLE_API_KEY not configured properly"
fi

if [ -z "$GROQ_API_KEY" ] || [ "$GROQ_API_KEY" = "your_groq_api_key_here" ]; then
    echo "⚠️  Warning: GROQ_API_KEY not configured properly"
fi

# Get server configuration
SERVER_HOST=${SERVER_HOST:-0.0.0.0}
SERVER_PORT=${SERVER_PORT:-5000}
SERVER_IP=${SERVER_IP:-localhost}

echo "✓ Environment loaded"
echo ""
echo "Server Configuration:"
echo "  Host: ${SERVER_HOST}"
echo "  Port: ${SERVER_PORT}"
echo "  Public IP: ${SERVER_IP}"
echo ""

# Check if port is already in use
if lsof -Pi :${SERVER_PORT} -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Warning: Port ${SERVER_PORT} is already in use!"
    echo "Please stop the existing service or change SERVER_PORT in .env"
    exit 1
fi

# Check Python version
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "🐍 Python version: ${python_version}"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install/upgrade dependencies
if [ ! -f "venv/.deps_installed" ] || [ requirements.txt -nt venv/.deps_installed ]; then
    echo "📦 Installing/updating dependencies..."
    pip install --upgrade pip
    pip install -r requirements.txt
    touch venv/.deps_installed
else
    echo "✓ Dependencies already installed"
fi

echo ""
echo "=========================================="
echo "Starting server..."
echo "=========================================="
echo ""

# Start the application
python app.py

# Note: If you want to run in background with logging:
# nohup python app.py > service.log 2>&1 &
# echo $! > service.pid
# echo "✓ Service started in background (PID: $(cat service.pid))"
# echo "  View logs: tail -f service.log"
# echo "  Stop service: kill $(cat service.pid)"
