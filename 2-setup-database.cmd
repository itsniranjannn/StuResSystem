@echo off
rem Step 2: creates the database "student_result_system" in YOUR MySQL and loads the tables and demo data.
rem It uses the connection in backend\.env (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD). MySQL must be running.
cd /d "%~dp0backend"
call npm run db:setup
echo.
echo If you saw "Seeded" above, the database is ready. Next: run 3-start.cmd
pause
