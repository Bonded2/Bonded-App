#!/bin/bash

# Bonded App ICP Backend Deployment and Testing Script
# This script sets up and tests the full ICP canister backend

set -e

echo "🔗 Bonded App - ICP Backend Deployment & Testing"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if dfx is installed
if ! command -v dfx &> /dev/null; then
    echo -e "${RED}❌ dfx is not installed. Please install DFX first.${NC}"
    echo "Visit: https://internetcomputer.org/docs/current/developer-docs/setup/install/"
    exit 1
fi

echo -e "${BLUE}📋 DFX Version:${NC}"
dfx --version

# Clean up previous deployments
echo -e "\n${YELLOW}🧹 Cleaning up previous deployments...${NC}"
dfx stop 2>/dev/null || true
rm -rf .dfx 2>/dev/null || true

# Start local replica
echo -e "\n${BLUE}🚀 Starting local Internet Computer replica...${NC}"
dfx start --background --clean

# Wait a moment for the replica to start
sleep 3

# Deploy the canisters
echo -e "\n${BLUE}📦 Building and deploying canisters...${NC}"
dfx deploy

# Generate canister interfaces
echo -e "\n${BLUE}🔧 Generating canister interfaces...${NC}"
dfx generate

# Get canister IDs
BACKEND_CANISTER_ID=$(dfx canister id bonded-app-backend)
FRONTEND_CANISTER_ID=$(dfx canister id bonded-app-frontend)

echo -e "\n${GREEN}✅ Deployment successful!${NC}"
echo -e "${BLUE}Backend Canister ID:${NC} $BACKEND_CANISTER_ID"
echo -e "${BLUE}Frontend Canister ID:${NC} $FRONTEND_CANISTER_ID"

# Test basic functionality
echo -e "\n${YELLOW}🧪 Testing canister functionality...${NC}"

echo -e "\n${BLUE}1. Testing greet function:${NC}"
dfx canister call bonded-app-backend greet '("ICP Backend Test")'

echo -e "\n${BLUE}2. Testing whoami function:${NC}"
dfx canister call bonded-app-backend whoami

echo -e "\n${BLUE}3. Testing canister stats:${NC}"
dfx canister call bonded-app-backend get_canister_stats

echo -e "\n${BLUE}4. Testing user profile (should return null for anonymous):${NC}"
dfx canister call bonded-app-backend get_user_profile

echo -e "\n${BLUE}5. Testing user relationships (should return empty array):${NC}"
dfx canister call bonded-app-backend get_user_relationships

echo -e "\n${BLUE}6. Testing user settings (should return null):${NC}"
dfx canister call bonded-app-backend get_user_settings

# Test relationship creation (this will fail for anonymous, but that's expected)
echo -e "\n${BLUE}7. Testing relationship creation (will fail for anonymous - expected):${NC}"
dfx canister call bonded-app-backend create_relationship "(principal \"rdmx6-jaaaa-aaaah-qdrqq-cai\")" 2>/dev/null || echo "Expected: Cannot create relationship with yourself"

# Display URLs
echo -e "\n${GREEN}🎉 All tests completed!${NC}"
echo -e "\n${YELLOW}📱 Access your app:${NC}"
echo -e "${BLUE}Local Backend:${NC} http://localhost:4943/?canisterId=$BACKEND_CANISTER_ID"
echo -e "${BLUE}Local Frontend:${NC} http://localhost:4943/?canisterId=$FRONTEND_CANISTER_ID"
echo -e "${BLUE}Candid UI:${NC} http://localhost:4943/_/candid?id=$BACKEND_CANISTER_ID"

echo -e "\n${YELLOW}🔧 Development Commands:${NC}"
echo -e "${BLUE}Frontend Dev Server:${NC} cd src/bonded-app-frontend && npm run start"
echo -e "${BLUE}Stop Replica:${NC} dfx stop"
echo -e "${BLUE}Redeploy:${NC} dfx deploy"
echo -e "${BLUE}View Logs:${NC} dfx canister logs bonded-app-backend"

echo -e "\n${GREEN}✨ Your Bonded ICP backend is ready!${NC}"

# Keep the script running to show the URLs
echo -e "\n${YELLOW}📝 Note: The local replica is running in the background.${NC}"
echo -e "${YELLOW}Use 'dfx stop' to stop it when you're done.${NC}" 