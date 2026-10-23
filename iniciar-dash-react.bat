@echo off
title Iniciar Entorno DASH React (Backend 3005 + Frontend React 3000)
echo ============================================================
echo   Iniciando DASH React (Vite + TypeScript)
echo   - Backend Web Service  ➔  http://localhost:3005 (en ..\dash-backend)
echo   - Frontend React SPA   ➔  http://localhost:3000 (en ./)
echo ============================================================

if exist "%~dp0..\dash-backend" (
    cd /d "%~dp0..\dash-backend"
    start "Backend - DASH Web Service (Puerto 3005)" cmd /k "npm start"
    timeout /t 2 /nobreak > nul
) else (
    echo [INFO] Backend local no detectado en ..\dash-backend. Se usara Hot RAM Cloud (sheet-render.onrender.com).
)

cd /d "%~dp0"
start "Frontend - DASH React Vite (Puerto 3000)" cmd /k "npx vite --port 3000"

timeout /t 2 /nobreak > nul

echo.
echo Dashboard React levantado.
echo Abriendo en: http://localhost:3000
start http://localhost:3000
echo.
