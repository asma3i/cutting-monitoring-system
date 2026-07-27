@echo off
title Cutting Monitoring System - Backend Server
cd /d "%~dp0backend"
echo ========================================
echo   CUTTING MONITORING SYSTEM
echo ========================================
echo.
echo Site accessible sur: http://localhost:8080
echo.
node server.js
echo.
echo Server stopped. Press any key to exit.
pause >nul
