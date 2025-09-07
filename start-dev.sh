#!/bin/bash

# AI Autograder Development Startup Script

echo "🚀 Starting AI Autograder Development Environment"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Creating .env file from template..."
    cp env.example .env
    echo "📝 Please edit .env file with your OpenAI API key and other settings"
    exit 1
fi

# Check if Redis is running (for local development)
if ! command -v redis-cli &> /dev/null; then
    echo "⚠️  Redis not found. Please install Redis:"
    echo "   macOS: brew install redis && brew services start redis"
    echo "   Ubuntu: sudo apt-get install redis-server && sudo systemctl start redis-server"
    exit 1
fi

if ! redis-cli ping &> /dev/null; then
    echo "⚠️  Redis is not running. Starting Redis..."
    if command -v brew &> /dev/null; then
        brew services start redis
    elif command -v systemctl &> /dev/null; then
        sudo systemctl start redis-server
    else
        echo "❌ Please start Redis manually"
        exit 1
    fi
    sleep 2
fi

# Start database and Redis
echo "🗄️  Starting PostgreSQL and Redis..."
docker-compose up -d postgres redis

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 5

# Check if Python virtual environment exists
if [ ! -d "backend/venv" ]; then
    echo "🐍 Creating Python virtual environment..."
    cd backend
    python -m venv venv
    source venv/bin/activate
    pip install -r ../requirements.txt
    cd ..
fi

# Function to start backend
start_backend() {
    echo "🔧 Starting FastAPI backend..."
    cd backend
    source venv/bin/activate
    # Use SQLite for local development to avoid DB connectivity issues
    export DATABASE_URL="sqlite:///./autograder.db"
    uvicorn app.main:app --reload --port 8000 &
    BACKEND_PID=$!
    cd ..
}

# Function to start Celery worker
start_celery() {
    echo "🔄 Starting Celery worker..."
    cd backend
    source venv/bin/activate
    # Ensure Celery uses the same SQLite database URL when running locally
    export DATABASE_URL="sqlite:///./autograder.db"
    celery -A app.services.grading_service worker --loglevel=info &
    CELERY_PID=$!
    cd ..
}

# Function to start frontend
start_frontend() {
    echo "⚛️  Starting React frontend..."
    cd frontend
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing Node.js dependencies..."
        npm install
    fi
    npm start &
    FRONTEND_PID=$!
    cd ..
}

# Start all services
start_backend
start_celery
start_frontend

echo ""
echo "✅ All services started!"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID 2>/dev/null
    kill $CELERY_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    docker-compose stop
    echo "✅ All services stopped"
    exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT

# Wait for user to stop
wait
