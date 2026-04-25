#!/bin/bash
# ─────────────────────────────────────────────
# Allocra Backend — Local Setup & Run
# Usage: bash run.sh [migrate|dev|prod]
# ─────────────────────────────────────────────

set -e
cd "$(dirname "$0")"

MODE=${1:-dev}

if [ ! -f .env ]; then
  echo "❌ .env file not found. Copy .env.example and fill in your values."
  echo "   cp .env.example .env"
  exit 1
fi

if ! python -c "import venv" &>/dev/null; then
  echo "❌ Python venv module not available."
  exit 1
fi

if [ ! -d .venv ]; then
  echo "📦 Creating virtual environment..."
  python3 -m venv .venv
fi

source .venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt

if [ "$MODE" = "migrate" ]; then
  echo "🗃  Running Alembic migrations..."
  alembic upgrade head
  echo "✅ Migrations complete."
  exit 0
fi

if [ "$MODE" = "dev" ]; then
  echo "🗃  Applying migrations..."
  alembic upgrade head
  echo "🚀 Starting Allocra API (dev mode)..."
  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
fi

if [ "$MODE" = "prod" ]; then
  echo "🗃  Applying migrations..."
  alembic upgrade head
  echo "🚀 Starting Allocra API (production)..."
  uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4 --loop uvloop
fi
