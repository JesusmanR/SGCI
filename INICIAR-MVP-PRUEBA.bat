@echo off
chcp 65001 >nul
title SGCI - Lanzador Oficial MVP para Prueba de Usuario (UAT)
echo ===============================================================================
echo   SGCI - SISTEMA DE GESTION DE CONTROL DE INVENTARIOS (MULTI-TENANT SAAS)
echo   Entregable MVP v1.12.0 - 47 Capturas Oficiales + Persistencia API v1
echo ===============================================================================
echo.
cd /d "%~dp0"

echo [1/3] Ejecutando Suite TDD Frontend (11 Suites / 30 Pruebas)...
node frontend\scripts\ejecutar-pruebas-frontend.mjs
if %ERRORLEVEL% neq 0 (
    echo Error en pruebas de Frontend.
    pause
    exit /b 1
)

echo.
echo [2/3] Abriendo Portal Interactivo MVP en http://127.0.0.1:4173 ...
start "" "http://127.0.0.1:4173"

echo.
echo [3/3] Servidor SGCI MVP en ejecucion en http://127.0.0.1:4173 (Ctrl+C para detener)
node scripts\servidor-sgci.mjs
