#!/bin/bash

BACKEND_DIR="$(cd "$(dirname "$0")/backend" && pwd)"
FRONTEND_DIR="$(cd "$(dirname "$0")/frontend" && pwd)"

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo ""
  echo "ContentHub kapatılıyor..."

  if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID"
  fi

  if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID"
  fi

  wait
  echo "ContentHub kapatıldı."
  exit 0
}

trap cleanup SIGINT SIGTERM

echo "ContentHub başlatılıyor..."
echo ""

# Portları temizle
for PORT in 8000 5173; do
  PIDS=$(lsof -ti :$PORT 2>/dev/null)
  if [ -n "$PIDS" ]; then
    echo "  Port $PORT temizleniyor (PID: $PIDS)..."
    echo "$PIDS" | xargs kill -9 2>/dev/null
    sleep 0.5
  fi
done

# Backend
source "$BACKEND_DIR/.venv/bin/activate"
cd "$BACKEND_DIR"
uvicorn app.main:app --port 8000 --reload &
BACKEND_PID=$!
echo "  Backend  → http://localhost:8000  (PID: $BACKEND_PID)"

# Kısa bekleme — backend socket'i açsın
sleep 1

# Frontend
cd "$FRONTEND_DIR"
npm run dev -- --port 5173 &
FRONTEND_PID=$!
echo "  Frontend → http://localhost:5173  (PID: $FRONTEND_PID)"

echo ""
echo "Durdurmak için Ctrl+C"
echo ""

wait
