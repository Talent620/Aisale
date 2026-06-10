#!/usr/bin/env bash
# =============================================================================
#  AI Sales OS — one-file launcher (macOS / Linux)
#  First run: installs deps, starts the database, configures .env, seeds demo
#  data and builds the app. Every run: starts the server with the autopilot
#  ticking in the background and opens the browser. Idempotent and safe to
#  re-run — it never wipes data after the first initialisation.
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")"

say()  { printf "\033[1;32m[sales-os]\033[0m %s\n" "$*"; }
fail() { printf "\033[1;31m[sales-os]\033[0m %s\n" "$*" >&2; exit 1; }

# --- 1. Prerequisites -------------------------------------------------------
command -v node >/dev/null 2>&1 || fail "Node.js not found — install Node 20 from https://nodejs.org and re-run."
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
[ "$NODE_MAJOR" -ge 18 ] || fail "Node $NODE_MAJOR is too old — install Node 20 from https://nodejs.org."

# --- 2. Dependencies --------------------------------------------------------
if [ ! -d node_modules ]; then
  say "Installing dependencies (first run, ~1-2 min)…"
  npm install --no-audit --no-fund
fi

# --- 3. Database ------------------------------------------------------------
# Use an already-running Postgres on 5432 if there is one; otherwise start
# the bundled Docker container.
db_up() { (exec 3<>/dev/tcp/127.0.0.1/5432) 2>/dev/null && exec 3>&- && return 0 || return 1; }
if db_up; then
  say "PostgreSQL already running on :5432 — using it."
else
  command -v docker >/dev/null 2>&1 || fail "PostgreSQL is not running and Docker is missing — install Docker Desktop (https://docker.com) or start your own Postgres on :5432."
  say "Starting PostgreSQL (Docker)…"
  docker compose up -d db
  for i in $(seq 1 30); do db_up && break; sleep 1; done
  db_up || fail "Database did not come up — check 'docker compose logs db'."
fi

# --- 4. Configuration -------------------------------------------------------
if [ ! -f .env ]; then
  say "Creating .env with a generated NEXTAUTH_SECRET…"
  SECRET=$(node -p "require('crypto').randomBytes(32).toString('base64')")
  sed "s|please-change-me-run-openssl-rand-base64-32|$SECRET|" .env.example > .env
fi

# --- 5. First-run init: schema + demo data (never repeated) ------------------
if [ ! -f .initialized ]; then
  say "Applying database schema…"
  npx prisma db push
  say "Seeding demo data (login: owner@northstar.studio / demo1234)…"
  npm run db:seed
  date > .initialized
else
  npx prisma db push >/dev/null   # keep schema current after updates; no data loss
fi

# --- 6. Build (only when missing or sources changed) -------------------------
if [ ! -f .next/BUILD_ID ] || [ -n "$(find src prisma package.json -newer .next/BUILD_ID -print -quit 2>/dev/null)" ]; then
  say "Building the app (~1 min)…"
  npm run build
fi

# --- 7. Launch ---------------------------------------------------------------
say "Starting AI Sales OS on http://localhost:3000 (autopilot ticks automatically)."
say "Login: owner@northstar.studio / demo1234 · Stop with Ctrl+C."
( sleep 3
  if command -v open >/dev/null 2>&1; then open "http://localhost:3000"; \
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "http://localhost:3000"; fi ) &
exec npm run start
