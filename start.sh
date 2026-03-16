#!/bin/bash
# FinTrack — Quick start script
echo "🚀 Starting FinTrack..."

cd "$(dirname "$0")/server"

if [ ! -f ".env" ]; then
  echo "⚙️  First run: creating .env from example..."
  cp .env.example .env
  # Generate a random JWT secret automatically
  SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
  sed -i "s/change-me-to-a-long-random-secret-string/$SECRET/" .env
  echo "✅ .env created with auto-generated JWT secret"
fi

if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

echo "✅ Server starting at http://localhost:3001"
echo "   Open http://localhost:3001 in your browser"
echo "   Press Ctrl+C to stop"
echo ""
npm start
