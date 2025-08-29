#!/bin/bash

# INSTANT DEPLOY - Skip DFX Build Entirely
# Uses pre-built assets and deploys directly to avoid re-processing

echo "⚡ INSTANT DEPLOY - Bypassing DFX Build Process"
echo "=============================================="

# Set minimal environment
export NODE_OPTIONS="--max-old-space-size=256"

# Navigate to frontend
cd src/bonded-app-frontend

echo "🏗️  Building with ultra-minimal settings..."

# Clean and build with minimal resources
rm -rf dist
npm run build:ultra-light

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

# Check build results
FILE_COUNT=$(find dist -type f | wc -l)
DIST_SIZE=$(du -sh dist | cut -f1)

echo "✅ Build completed:"
echo "   📁 Files: $FILE_COUNT"
echo "   📦 Size: $DIST_SIZE"

# Navigate back to root
cd ../..

echo "🚀 Deploying with --no-build flag..."

# Deploy using assets-only configuration (much faster)
dfx deploy bonded-app-frontend --network local --no-asset-upgrade

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 INSTANT DEPLOYMENT SUCCESSFUL!"
    echo "⚡ Frontend deployed without re-building"
    echo "🌐 Your app is ready at the local canister URL"
else
    echo "❌ Deployment failed"
    exit 1
fi
