@echo off
title Iniciar DASH (Backend Web Service + Frontend)
echo ============================================================
echo   Iniciando DASH Local
echo   Backend: http://localhost:3000
echo   Frontend: http://localhost:3000/ o directo desde frontend/
echo ============================================================

cd /d "%~dp0backend"
start "DASH - Backend Web Service (Puerto 3000)" cmd /k "npm start"

timeout /t 2 /nobreak > nul

echo.
echo Servidor Backend iniciado en puerto 3000.
echo Abriendo Dashboard en el navegador...
start "" "%~dp0frontend\index.html"
echo.
