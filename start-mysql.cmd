@echo off
rem Starts the portable MySQL inside .mysql\ on port 3308. Keep open; Ctrl+C stops it.
set "BASE=%~dp0.mysql"
"%BASE%\mysql-8.4.3-winx64\bin\mysqld.exe" --defaults-file="%BASE%\my.ini" --console
