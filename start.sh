#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

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

# ---------------------------------------------------------------------------
# Python: venv'i etkinleştir
# ---------------------------------------------------------------------------
if [ ! -f "$BACKEND_DIR/.venv/bin/activate" ]; then
  echo "HATA: venv bulunamadı: $BACKEND_DIR/.venv"
  echo "  Çözüm: cd backend && python3 -m venv .venv && pip install -e ."
  exit 1
fi

source "$BACKEND_DIR/.venv/bin/activate"

# Sanity check
if ! command -v uvicorn >/dev/null 2>&1; then
  echo "HATA: uvicorn bulunamadı. venv kurulumunu kontrol edin."
  exit 1
fi

# ---------------------------------------------------------------------------
# Node / npm: nvm, homebrew veya sistem PATH'inden bul
# ---------------------------------------------------------------------------
NODE=""

# 1. nvm
if [ -f "$HOME/.nvm/nvm.sh" ]; then
  export NVM_DIR="$HOME/.nvm"
  NVM_NODE=$(ls "$NVM_DIR/versions/node/" 2>/dev/null | sort -V | tail -1)
  if [ -n "$NVM_NODE" ]; then
    NODE="$NVM_DIR/versions/node/$NVM_NODE/bin/node"
  fi
fi

# 2. Homebrew
if [ -z "$NODE" ] || [ ! -x "$NODE" ]; then
  for candidate in /opt/homebrew/bin/node /usr/local/bin/node; do
    if [ -x "$candidate" ]; then
      NODE="$candidate"
      break
    fi
  done
fi

# 3. which fallback
if [ -z "$NODE" ] || [ ! -x "$NODE" ]; then
  NODE=$(which node 2>/dev/null)
fi

if [ -z "$NODE" ] || [ ! -x "$NODE" ]; then
  echo "HATA: Node.js bulunamadı. Node.js v18+ kurulumu gerekli."
  exit 1
fi

# node_modules yoksa npm install çalıştır
VITE="$FRONTEND_DIR/node_modules/.bin/vite"
if [ ! -f "$VITE" ]; then
  NPM="$(dirname "$NODE")/npm"
  echo "Frontend bağımlılıkları yükleniyor..."
  cd "$FRONTEND_DIR" && "$NPM" install
fi

echo "ContentHub başlatılıyor..."
echo "  Python  : $(python3 --version)"
echo "  Node    : $("$NODE" --version)"
echo ""

# ---------------------------------------------------------------------------
# .env kontrolü — kritik production değerleri set edilmemişse uyarı ver
# ---------------------------------------------------------------------------
ENV_FILE="$BACKEND_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "  UYARI: backend/.env bulunamadı."
  echo "         Dev fallback'lar devreye girecek (JWT secret, encryption key)."
  echo "         Production için: cp backend/.env.example backend/.env ve doldurun."
  echo ""
else
  # JWT secret boş mu? Boşsa dev fallback insecure mode warning.
  if grep -qE '^CONTENTHUB_JWT_SECRET=\s*$' "$ENV_FILE" 2>/dev/null \
     || ! grep -qE '^CONTENTHUB_JWT_SECRET=' "$ENV_FILE" 2>/dev/null; then
    echo "  UYARI: CONTENTHUB_JWT_SECRET .env içinde boş veya yok."
    echo "         Dev fallback kullanılacak (production'da güvensiz)."
    echo "         Üretmek için: openssl rand -hex 32"
    echo ""
  fi
fi

# ---------------------------------------------------------------------------
# DB: Alembic migration — her başlatmada schema'nın güncel olduğunu garanti et
# ---------------------------------------------------------------------------
cd "$BACKEND_DIR"
echo "  Alembic migration kontrol ediliyor..."
if ! python -m alembic upgrade head; then
  echo "HATA: Alembic migration başarısız. Uygulama başlatılmıyor."
  echo "  Detay için: cd backend && python -m alembic upgrade head"
  exit 1
fi
echo "  Schema güncel ✓"
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
cd "$BACKEND_DIR"
uvicorn app.main:app --port 8000 &
BACKEND_PID=$!
echo "  Backend  → http://localhost:8000  (PID: $BACKEND_PID)"

sleep 1

# Frontend
cd "$FRONTEND_DIR"
"$NODE" "$VITE" --port 5173 &
FRONTEND_PID=$!
echo "  Frontend → http://localhost:5173  (PID: $FRONTEND_PID)"

echo ""
echo "Durdurmak için Ctrl+C"
echo ""

wait
