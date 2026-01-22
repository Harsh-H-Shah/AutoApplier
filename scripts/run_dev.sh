#!/bin/bash
# AutoApplier Development Server Startup Script
# Runs both backend (FastAPI) and frontend (Next.js) in parallel

# Get the project root directory (parent of scripts/)
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PYTHON="$PROJECT_ROOT/backend/.venv/bin/python"

echo "🚀 Starting AutoApplier Development Environment..."
echo "📁 Project root: $PROJECT_ROOT"
echo ""

# Start backend in background
echo "📦 Starting Backend (FastAPI) on port 8080..."
cd "$PROJECT_ROOT/backend"
$PYTHON main.py dashboard --port 8080 &
BACKEND_PID=$!

# Wait for backend to start
sleep 2

# Start frontend
echo "🎮 Starting Frontend (Next.js) on port 3000..."
cd "$PROJECT_ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Services starting..."
echo "   Backend:  http://localhost:8080"
echo "   Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"

# Trap Ctrl+C to kill both processes
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

# Wait for both
wait
