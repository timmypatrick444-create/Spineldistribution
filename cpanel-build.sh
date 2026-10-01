#!/bin/bash
# =====================================================================
# Spinel Distribution - 1-Click Direct cPanel Build & Deploy Script
# =====================================================================
# Run this directly in the cPanel Terminal inside your application directory:
#   bash cpanel-build.sh
#
# This script:
# 1. Installs all required packages directly on the cPanel server
# 2. Compiles the optimized production frontend with Vite
# 3. Compiles the ultra-fast Node.js server bundle (server.cjs)
# 4. Triggers Phusion Passenger to reload your live website automatically
# =====================================================================

set -e

# 0. Auto-detect CloudLinux / cPanel Nodevenv if node or npm is not in standard PATH
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Node or NPM not found in current PATH. Searching for cPanel Nodevenv..."
  VENV_ACTIVATE=$(find "$HOME/nodevenv" -name activate 2>/dev/null | head -n 1)
  if [ -n "$VENV_ACTIVATE" ] && [ -f "$VENV_ACTIVATE" ]; then
    echo "Found cPanel Node environment: $VENV_ACTIVATE"
    source "$VENV_ACTIVATE"
  fi
fi

echo "--------------------------------------------------------"
echo "  SPINEL DISTRIBUTION - CPANEL PRODUCTION BUILD SCRIPT  "
echo "--------------------------------------------------------"
echo "Target directory: $(pwd)"
echo "Node path:        $(which node 2>/dev/null || echo 'Not found')"
echo "Node version:     $(node -v 2>/dev/null || echo 'Node not detected')"
echo "NPM version:      $(npm -v 2>/dev/null || echo 'NPM not detected')"
echo "--------------------------------------------------------"

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is not active in this shell."
  echo "Please activate your Node.js environment from cPanel 'Setup Node.js App' (copy the activate command at the top of your app)."
  exit 1
fi

# 1. Install dependencies
echo "[1/4] Installing dependencies on cPanel server..."
npm install --no-audit --prefer-offline || npm install

# 2. Compile frontend and server bundle
echo "[2/4] Compiling frontend assets and Node.js server bundle..."
npm run build

# 3. Clean up any temporary caches or sourcemaps
echo "[3/4] Cleaning build artifacts..."
rm -f dist/server.cjs.map server.cjs.map

# 4. Trigger Phusion Passenger Restart
echo "[4/4] Triggering Phusion Passenger Node.js reload..."
mkdir -p tmp
touch tmp/restart.txt

echo "--------------------------------------------------------"
echo " SUCCESS! Spinel Distribution is built and deployed live."
echo " Live site restarted via Phusion Passenger (tmp/restart.txt)"
echo "--------------------------------------------------------"
