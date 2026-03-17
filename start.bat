@echo off
:: FinTrack — One-command start script (Windows)
:: Usage: start.bat  or  start.bat --dev

title FinTrack v2.0.0
echo.
echo   FinTrack v2.0.0
echo   -----------------------------------------

cd /d "%~dp0server"

:: Create .env if missing
if not exist ".env" (
  echo   First run — creating .env from template...
  copy ".env.example" ".env" >nul
  echo   IMPORTANT: Open server\.env and set a strong JWT_SECRET before use.
)

:: Install dependencies if missing
if not exist "node_modules" (
  echo   Installing dependencies...
  call npm install --silent
  echo   Dependencies installed.
)

echo.
echo   Starting server...
echo   Open in browser: http://localhost:3001
echo   Press Ctrl+C to stop
echo.

if "%~1"=="--dev" (
  call npm run dev
) else (
  call npm start
)

pause
