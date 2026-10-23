@echo off
title Iniciar Catálogo Storybook DASH (Puerto 6006)
echo ============================================================
echo   Iniciando Storybook para DASH React
echo   - Galería de Componentes: http://localhost:6006
echo ============================================================

cd /d "%~dp0frontend-react"
start "Storybook DASH (Puerto 6006)" cmd /k "npm run storybook"

timeout /t 3 /nobreak > nul

echo.
echo Abriendo Storybook en el navegador: http://localhost:6006
start http://localhost:6006
echo.
