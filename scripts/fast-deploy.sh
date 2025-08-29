#!/bin/bash

# Fast Deploy Script for Bonded App Frontend
# Optimized for laptop development with minimal resource usage

echo "⚡ Fast Deploy - Optimized for Local Development"
echo "=============================================="

# Set environment for minimal resource usage
export NODE_OPTIONS="--max-old-space-size=512 --max-semi-space-size=32"
export VITE_BUILD_MODE="minimal"
export EXCLUDE_AI_MODELS=true

echo "🏗️  Building with minimal settings..."

# Navigate to frontend directory
cd src/bonded-app-frontend

# Clean previous build
rm -rf dist

# Build with minimal settings
npm run build:minimal

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build completed successfully"

# Check file count and size
FILE_COUNT=$(find dist -type f | wc -l)
DIST_SIZE=$(du -sh dist | cut -f1)

echo "📊 Build Stats:"
echo "   - Files: $FILE_COUNT"
echo "   - Size: $DIST_SIZE"

# Navigate back to root
cd ../..

echo "🚀 Deploying to local network..."

# Deploy with optimized settings
dfx deploy bonded-app-frontend --network local --no-wallet

if [ $? -eq 0 ]; then
    echo "✅ Deployment completed successfully!"
    echo "🌐 Frontend canister deployed locally"
else
    echo "❌ Deployment failed"
    exit 1
fi
