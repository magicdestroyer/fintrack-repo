#!/usr/bin/env bash
# FinTrack — One-command start script (Mac / Linux)
# Usage: ./start.sh [--dev]

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER="$DIR/server"

echo ""
echo "  FinTrack v2.0.0"
echo "  ─────────────────────────────────────────"

# ── .env setup ────────────────────────────────────────────────────────────────
if [ ! -f "$SERVER/.env" ]; then
  echo "  First run detected — creating .env from template..."
  cp "$SERVER/.env.example" "$SERVER/.env"

  # Auto-generate a secure JWT secret
  if command -v node &> /dev/null; then
    SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
    # macOS uses BSD sed, Linux uses GNU sed — handle both
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s/change-me-to-a-long-random-secret-string-minimum-32-chars/$SECRET/" "$SERVER/.env"
    else
      sed -i  "s/change-me-to-a-long-random-secret-string-minimum-32-chars/$SECRET/" "$SERVER/.env"
    fi
    echo "  ✅ JWT_SECRET auto-generated in server/.env"
  else
    echo "  ⚠️  Node not found — please set JWT_SECRET manually in server/.env"
  fi
fi

# ── Install dependencies ──────────────────────────────────────────────────────
if [ ! -d "$SERVER/node_modules" ]; then
  echo "  Installing dependencies..."
  (cd "$SERVER" && npm install --silent)
  echo "  ✅ Dependencies installed"
fi

# ── Start ──────────────────────────────────────────────────────────────────────
echo "  ✅ Starting server..."
echo ""
echo "  Open in browser: http://localhost:3001"
echo "  Press Ctrl+C to stop"
echo ""

if [[ "${1:-}" == "--dev" ]]; then
  (cd "$SERVER" && npm run dev)
else
  (cd "$SERVER" && npm start)
fi
