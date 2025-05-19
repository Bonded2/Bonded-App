#!/bin/bash
set -e

echo "🔍 Debug: Current directory $(pwd)"
echo "🔍 Debug: Listing directories"
ls -la

echo "🔍 Debug: Checking if src directory exists"
if [ -d "src" ]; then
  echo "✅ src directory exists"
  ls -la src/
else
  echo "❌ src directory does not exist"
fi

echo "🔍 Debug: Checking if src/bonded-app-frontend directory exists"
if [ -d "src/bonded-app-frontend" ]; then
  echo "✅ src/bonded-app-frontend directory exists"
  ls -la src/bonded-app-frontend/
else
  echo "❌ src/bonded-app-frontend directory does not exist"
fi

# Try to build from wherever we can find the package.json
if [ -d "src/bonded-app-frontend" ]; then
  echo "📦 Installing dependencies in src/bonded-app-frontend"
  cd src/bonded-app-frontend
  npm install
  npm run build
  echo "✅ Build completed in src/bonded-app-frontend"
elif [ -f "package.json" ]; then
  echo "📦 Installing dependencies in root directory"
  npm install
  npm run build
  echo "✅ Build completed in root directory"
else
  echo "❌ No suitable build directory found"
  exit 1
fi