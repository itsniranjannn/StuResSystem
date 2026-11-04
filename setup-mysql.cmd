@echo off
rem One-time: initialises the portable MySQL 8.4 stored inside this project (.mysql\), port 3308.
setlocal
set "BASE=%~dp0.mysql"
set "BIN=%BASE%\mysql-8.4.3-winx64\bin\mysqld.exe"
if not exist "%BIN%" (
  echo MySQL not found at %BIN%
  echo Download the MySQL 8.4 Windows ZIP from https://dev.mysql.com/downloads/mysql/ and extract it into .mysql\
  exit /b 1
)
set "FWD=%BASE:\=/%"
(
  echo [mysqld]
  echo basedir=%FWD%/mysql-8.4.3-winx64
  echo datadir=%FWD%/data
  echo port=3308
  echo bind-address=127.0.0.1
  echo character-set-server=utf8mb4
  echo collation-server=utf8mb4_unicode_ci
  echo mysqlx=OFF
) > "%BASE%\my.ini"
if exist "%BASE%\data" (
  echo Data folder already exists; kept it.
) else (
  "%BIN%" --defaults-file="%BASE%\my.ini" --initialize-insecure --console
)
echo Done. Now run start-mysql.cmd and keep it open, then: cd backend ^& npm run db:setup
