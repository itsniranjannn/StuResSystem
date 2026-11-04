@echo off
rem Starts MySQL, the API and the UI in three windows. Run setup-mysql.cmd and "npm run db:setup" once first.
cd /d "%~dp0"
start "Anka MySQL" cmd /k start-mysql.cmd
timeout /t 8 /nobreak >nul
start "Anka API" cmd /k "cd backend && npm start"
start "Anka UI" cmd /k "cd frontend && npm run dev"
timeout /t 6 /nobreak >nul
start http://localhost:5191
