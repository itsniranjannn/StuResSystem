@echo off
rem Step 1: installs the packages for the API and the web app (needs Node.js 20 or later).
cd /d "%~dp0"
echo Installing backend packages ...
cd backend && call npm install && cd ..
echo Installing frontend packages ...
cd frontend && call npm install && cd ..
echo.
echo Done. Next: edit backend\.env (set DB_PASSWORD), then run 2-setup-database.cmd
pause
