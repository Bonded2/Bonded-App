#!/bin/bash

echo "🔧 Applying CSP and TensorFlow fixes for Bonded MVP..."

# Stop any running local replica
echo "🛑 Stopping local replica..."
dfx stop

# Clean build artifacts
echo "🧹 Cleaning build artifacts..."
rm -rf src/bonded-app-frontend/dist
rm -rf .dfx

# Build with new configuration
echo "🏗️ Building frontend with CSP fixes..."
cd src/bonded-app-frontend
npm run build
cd ../..

# Deploy to local replica
echo "🚀 Starting local replica and deploying..."
dfx start --background --clean

# Deploy all canisters
echo "📦 Deploying canisters..."
dfx deploy

echo "✅ Deployment complete!"
echo ""
echo "🌐 Access your app at:"
dfx canister call bonded-app-frontend http_request '(record{url="/"; method="GET"; body=blob""; headers=vec{}})'

echo ""
echo "📝 Changes applied:"
echo "   ✅ Updated CSP to allow 'unsafe-eval' and 'wasm-unsafe-eval'"
echo "   ✅ Switched to CDN-only TensorFlow and NSFWJS loading"
echo "   ✅ Removed local library files to prevent conflicts"
echo "   ✅ Enhanced module loading with proper error handling"
echo "   ✅ Added JSDeliver CDN to allowed script sources"
echo ""
echo "🎯 The 'call to Function() blocked by CSP' error should now be resolved!" 