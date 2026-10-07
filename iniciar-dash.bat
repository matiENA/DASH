@echo off
title Iniciar Entorno de Prueba DASH (Backend 3005 + Frontend 3000)
echo ============================================================
echo   Iniciando Entorno de Prueba DASH
echo   - Backend Web Service  ➔  http://localhost:3005
echo   - Frontend Static Site ➔  http://localhost:3000
echo ============================================================

cd /d "%~dp0backend"
start "Backend - DASH Web Service (Puerto 3005)" cmd /k "npm start"

timeout /t 2 /nobreak > nul

cd /d "%~dp0frontend"
start "Frontend - DASH Static Site (Puerto 3000)" cmd /k "npm start"

timeout /t 2 /nobreak > nul

echo.
echo Ambos servicios han sido levantados.
echo Abriendo Dashboard en: http://localhost:3000
start http://localhost:3000
echo.
