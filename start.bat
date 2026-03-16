@echo off
echo Starting FinTrack...
cd server
if not exist ".env" (
  copy .env.example .env
  echo Created .env — open it and set a JWT_SECRET before using in production
)
if not exist "node_modules" (
  echo Installing dependencies...
  npm install
)
echo Server starting at http://localhost:3001
echo Open http://localhost:3001 in your browser
npm start
