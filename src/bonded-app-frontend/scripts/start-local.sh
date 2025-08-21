#!/bin/bash

# Start Local Development Script for Bonded App
echo "🚀 Starting Bonded App Local Development..."

# Check if dfx is installed
if ! command -v dfx &> /dev/null; then
    echo "❌ dfx is not installed. Please install dfx first."
    echo "   Visit: https://internetcomputer.org/docs/current/developer-docs/setup/install/"
    exit 1
fi

# Check if dfx is running
if ! dfx ping --network local &> /dev/null; then
    echo "🔧 Starting dfx local network..."
    dfx start --clean --background --network local
    echo "⏳ Waiting for dfx to be ready..."
    sleep 10
else
    echo "✅ dfx local network is already running"
fi

# Deploy canisters to local network
echo "🏗️  Deploying canisters to local network..."
dfx deploy --network local

# Get canister IDs
echo "📋 Canister IDs:"
dfx canister id bonded-app-backend --network local
dfx canister id bonded-app-frontend --network local

# Start frontend development server
echo "🌐 Starting frontend development server..."
echo "   Make sure to set VITE_DFX_NETWORK=local in your .env file"
echo "   Frontend will be available at: http://localhost:3003"
echo "   Local canister will be available at: http://127.0.0.1:4943"

# Keep script running to maintain dfx process
echo "🔄 dfx local network is running. Press Ctrl+C to stop."
wait
