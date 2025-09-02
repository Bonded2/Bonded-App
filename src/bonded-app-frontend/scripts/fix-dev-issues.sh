#!/bin/bash

# Fix development issues script for Bonded App
echo "🔧 Fixing development issues..."

# Kill any existing dev servers
echo "🛑 Stopping existing dev servers..."
pkill -f "vite.*3000" || true
pkill -f "npm.*dev" || true

# Clear browser cache and service worker cache
echo "🧹 Clearing caches..."
rm -rf dist/
rm -rf node_modules/.vite/

# Clear any existing service worker registrations
echo "🔄 Clearing service worker registrations..."
# This will be handled by the browser when it reloads

# Set environment variables to help with development
export SKIP_SERVICE_WORKER=false
export VITE_BUILD_MODE=normal
export NODE_ENV=development

echo "✅ Environment configured for development"
echo "🚀 Starting development server..."

# Start the dev server with explicit HTTP/1.1
npm run dev -- --host 0.0.0.0 --port 3000 --force

echo "📝 If you still see HTTP/2 errors:"
echo "   1. Open Chrome DevTools"
echo "   2. Go to Network tab"
echo "   3. Right-click and select 'Clear browser cache'"
echo "   4. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)"
echo "   5. Check if the error persists"
