@echo off
rem ===========================================================================
rem  AI Sales OS - one-file launcher (Windows). Double-click to run.
rem  First run: installs deps, starts the database, writes .env, seeds demo
rem  data and builds. Every run: starts the server (autopilot ticks itself)
rem  and opens the browser. Safe to re-run - it never wipes existing data.
rem ===========================================================================
setlocal enabledelayedexpansion
cd /d "%~dp0"
title AI Sales OS

echo [sales-os] Checking prerequisites...
where node >nul 2>nul
if errorlevel 1 (
  echo [sales-os] ERROR: Node.js not found. Install Node 20 from https://nodejs.org and run this file again.
  pause & exit /b 1
)

if not exist node_modules (
  echo [sales-os] Installing dependencies - first run, 1-2 minutes...
  call npm install --no-audit --no-fund || (echo [sales-os] npm install failed. & pause & exit /b 1)
)

rem --- Database: reuse Postgres on :5432 if running, else start Docker ------
powershell -NoProfile -Command "exit ((Test-NetConnection -ComputerName 127.0.0.1 -Port 5432 -WarningAction SilentlyContinue).TcpTestSucceeded -eq $true ? 0 : 1)" >nul 2>nul
if not errorlevel 1 (
  echo [sales-os] PostgreSQL already running on :5432 - using it.
) else (
  where docker >nul 2>nul
  if errorlevel 1 (
    echo [sales-os] ERROR: PostgreSQL is not running and Docker is missing.
    echo            Install Docker Desktop from https://docker.com and run this file again.
    pause & exit /b 1
  )
  echo [sales-os] Starting PostgreSQL via Docker...
  docker compose up -d db || (echo [sales-os] Could not start the database. Is Docker Desktop running? & pause & exit /b 1)
  echo [sales-os] Waiting for the database...
  for /l %%i in (1,1,30) do (
    powershell -NoProfile -Command "exit ((Test-NetConnection -ComputerName 127.0.0.1 -Port 5432 -WarningAction SilentlyContinue).TcpTestSucceeded -eq $true ? 0 : 1)" >nul 2>nul
    if not errorlevel 1 goto dbready
    timeout /t 1 /nobreak >nul
  )
  echo [sales-os] ERROR: database did not start. Check: docker compose logs db
  pause & exit /b 1
)
:dbready

rem --- .env with a generated secret (first run only) -------------------------
if not exist .env (
  echo [sales-os] Creating .env with a generated NEXTAUTH_SECRET...
  for /f "delims=" %%s in ('node -p "require('crypto').randomBytes(32).toString('base64')"') do set "SECRET=%%s"
  powershell -NoProfile -Command "(Get-Content .env.example) -replace 'please-change-me-run-openssl-rand-base64-32', $env:SECRET | Set-Content .env"
)

rem --- First-run init: schema + demo data (never repeated) -------------------
if not exist .initialized (
  echo [sales-os] Applying database schema...
  call npx prisma db push || (pause & exit /b 1)
  echo [sales-os] Seeding demo data - login: owner@northstar.studio / demo1234
  call npm run db:seed || (pause & exit /b 1)
  echo %date% %time% > .initialized
) else (
  call npx prisma db push >nul
)

rem --- Build only when missing ------------------------------------------------
if not exist .next\BUILD_ID (
  echo [sales-os] Building the app - about a minute...
  call npm run build || (pause & exit /b 1)
)

echo.
echo [sales-os] Starting AI Sales OS on http://localhost:3000
echo [sales-os] Login: owner@northstar.studio / demo1234  -  close this window to stop.
echo [sales-os] Tip: in Edge/Chrome click "Install app" to get it as a desktop app.
start "" "http://localhost:3000"
call npm run start
pause
