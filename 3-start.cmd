@echo off
rem Step 3: starts the API (port 5000) and the web app (port 5191) and opens the browser.
cd /d "%~dp0"
start "Anka API" cmd /k "cd backend && npm start"
timeout /t 5 /nobreak >nul
start "Anka UI" cmd /k "cd frontend && npm run dev"
timeout /t 6 /nobreak >nul
start http://localhost:5191
