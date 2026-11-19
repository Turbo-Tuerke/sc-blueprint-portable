@echo off
rem SC Blueprint Dashboard beenden.
if not exist "%~dp0Daten\pid.txt" (echo SC Blueprint laeuft nicht. & timeout /t 3 >nul & exit /b 0)
set /p PID=<"%~dp0Daten\pid.txt"
taskkill /PID %PID% /F >nul 2>&1
del "%~dp0Daten\pid.txt" >nul 2>&1
echo SC Blueprint wurde beendet.
timeout /t 2 >nul
