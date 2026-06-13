#!/bin/bash
# Page Proxy - 一键启动脚本
# LAN Service Unified Proxy Workstation

set -e


# Unset global PORT to prevent interference (e.g. PORT=4000 from other env)
unset PORT
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Use PAGE_PROXY_PORT if set, otherwise default to 39197
export PAGE_PROXY_PORT="${PAGE_PROXY_PORT:-39197}"

echo "📦 Page Proxy - 局域网服务统一代理工作台"
echo "========================================"

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js is not installed. Please install Node.js 18+ first."
  exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install server dependencies
if [ ! -d "apps/server/node_modules" ]; then
  echo "📥 Installing server dependencies..."
  cd apps/server && npm install --production && cd ../..
fi

# Install web dependencies and build
if [ ! -d "apps/web/node_modules" ]; then
  echo "📥 Installing frontend dependencies..."
  cd apps/web && npm install && cd ../..
fi

# Build frontend
echo "🔨 Building frontend..."
cd apps/web && npm run build && cd ../..

# Start server
echo ""
echo "🚀 Starting server on port ${PAGE_PROXY_PORT}..."
echo "   Access: http://0.0.0.0:${PAGE_PROXY_PORT}"
echo "   LAN:    http://<your-ip>:${PAGE_PROXY_PORT}"
echo ""
cd apps/server && exec node src/index.js
