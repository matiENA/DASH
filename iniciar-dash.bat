@echo off
title Iniciar Entorno DASH (Monorepo Backend 3005 + Frontend React 3000)
echo ============================================================
echo   🚀 Iniciando DASH — Tablero Operativo de Flota (Monorepo)
echo   - Backend Hot RAM Engine  ➔  http://localhost:3005 (.\backend)
echo   - Frontend React 19 SPA   ➔  http://localhost:3000 (.\frontend)
echo ============================================================

REM Cerrar instancias previas si estuvieran corriendo
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3005 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

REM 1. Iniciar Backend Web Service (Hot RAM) con auto-reload
cd /d "%~dp0backend"
start "Backend - DASH Hot RAM (Puerto 3005)" cmd /k "npm run dev"

ping 127.0.0.1 -n 3 > nul

REM 2. Iniciar Frontend React SPA
cd /d "%~dp0frontend"
start "Frontend - DASH React Vite (Puerto 3000)" cmd /k "npx vite --port 3000"

ping 127.0.0.1 -n 3 > nul

echo.
echo ✅ DASH iniciado correctamente.
echo 🌐 Abriendo en: http://localhost:3000
start http://localhost:3000
echo.
