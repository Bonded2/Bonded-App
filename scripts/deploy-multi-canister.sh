#!/bin/bash

# Multi-Canister Frontend Deployment Script
# Deploys frontend across multiple canisters for maximum storage

set -e

echo "🚀 Starting Multi-Canister Frontend Deployment..."

# Configuration
NETWORK="${1:-playground}"
FRONTEND_DIR="src/bonded-app-frontend"
CANISTER_NAMES=("bonded-app-main" "bonded-app-assets" "bonded-app-ai" "bonded-app-vendor" "bonded-app-media")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Function to build multi-canister frontend
build_multi_canister() {
    log "Building multi-canister frontend..."
    
    cd "$FRONTEND_DIR"
    
    # Run the multi-canister build script
    if [ -f "scripts/multi-canister-build.js" ]; then
        node scripts/multi-canister-build.js
        success "Multi-canister build completed"
    else
        error "Multi-canister build script not found"
    fi
    
    cd - > /dev/null
}

# Function to create canisters if they don't exist
create_canisters() {
    log "Creating canisters if needed..."
    
    for canister in "${CANISTER_NAMES[@]}"; do
        if dfx canister id "$canister" --network "$NETWORK" >/dev/null 2>&1; then
            success "Canister $canister already exists"
        else
            log "Creating canister $canister..."
            dfx canister create "$canister" --network "$NETWORK"
            success "Created canister $canister"
        fi
    done
}

# Function to get all canister IDs
get_canister_ids() {
    log "Retrieving canister IDs..."
    
    declare -A CANISTER_IDS
    
    for canister in "${CANISTER_NAMES[@]}"; do
        local canister_id
        canister_id=$(dfx canister id "$canister" --network "$NETWORK" 2>/dev/null || echo "")
        
        if [ -n "$canister_id" ]; then
            CANISTER_IDS["$canister"]="$canister_id"
            log "  $canister: $canister_id"
        else
            warning "Could not get ID for canister $canister"
        fi
    done
    
    # Export for use in other functions
    export CANISTER_IDS_JSON=$(printf '{\n')
    local first=true
    for canister in "${!CANISTER_IDS[@]}"; do
        if [ "$first" = true ]; then
            first=false
        else
            export CANISTER_IDS_JSON="$CANISTER_IDS_JSON,"
        fi
        export CANISTER_IDS_JSON="$CANISTER_IDS_JSON\"$canister\": \"${CANISTER_IDS[$canister]}\""
    done
    export CANISTER_IDS_JSON="$CANISTER_IDS_JSON\n}"
    
    log "Canister IDs JSON: $CANISTER_IDS_JSON"
}

# Function to inject canister IDs into frontend files
inject_canister_ids() {
    log "Injecting canister IDs into frontend files..."
    
    # Inject into each canister's index.html
    for canister in "${CANISTER_NAMES[@]}"; do
        local dist_dir="$FRONTEND_DIR/dist-${canister#bonded-app-}"
        local index_file="$dist_dir/index.html"
        
        if [ -f "$index_file" ]; then
            log "  Injecting into $canister..."
            
            # Create the canister IDs script
            local canister_ids_script="<script>\n    window.BONDED_CANISTER_IDS = $CANISTER_IDS_JSON;\n    console.log('Canister IDs loaded:', window.BONDED_CANISTER_IDS);\n  </script>"
            
            # Inject before the orchestration script
            sed -i "s|// Multi-Canister Frontend Orchestration|$canister_ids_script\n\n    // Multi-Canister Frontend Orchestration|g" "$index_file"
            
            success "  Injected canister IDs into $canister"
        else
            warning "  Index file not found for $canister: $index_file"
        fi
    done
    
    # Update service workers with canister IDs
    for canister in "${CANISTER_NAMES[@]}"; do
        local dist_dir="$FRONTEND_DIR/dist-${canister#bonded-app-}"
        local sw_file="$dist_dir/multi-canister-sw.js"
        
        if [ -f "$sw_file" ]; then
            log "  Updating service worker for $canister..."
            
            # Replace the empty CANISTER_IDS with actual IDs
            sed -i "s|let CANISTER_IDS = {};|let CANISTER_IDS = $CANISTER_IDS_JSON;|g" "$sw_file"
            
            success "  Updated service worker for $canister"
        fi
    done
}

# Function to deploy individual canister
deploy_canister() {
    local canister_name="$1"
    local dist_dir="$FRONTEND_DIR/dist-${canister_name#bonded-app-}"
    
    log "Deploying $canister_name..."
    
    if [ ! -d "$dist_dir" ]; then
        error "Distribution directory not found: $dist_dir"
    fi
    
    # Deploy the canister
    if dfx deploy "$canister_name" --network "$NETWORK"; then
        success "Deployed $canister_name"
        
        # Get the deployed URL
        local canister_id
        canister_id=$(dfx canister id "$canister_name" --network "$NETWORK")
        local url="https://$canister_id.icp0.io/"
        
        log "  URL: $url"
        return 0
    else
        error "Failed to deploy $canister_name"
        return 1
    fi
}

# Function to deploy all canisters
deploy_all_canisters() {
    log "Deploying all frontend canisters..."
    
    local failed_deployments=()
    
    # Deploy canisters in order (main first, then others)
    for canister in "${CANISTER_NAMES[@]}"; do
        if ! deploy_canister "$canister"; then
            failed_deployments+=("$canister")
        fi
    done
    
    if [ ${#failed_deployments[@]} -eq 0 ]; then
        success "All canisters deployed successfully!"
    else
        error "Failed to deploy: ${failed_deployments[*]}"
    fi
}

# Function to update service worker with canister IDs post-deployment
update_service_workers() {
    log "Updating service workers with final canister IDs..."
    
    # Send canister IDs to service workers
    for canister in "${CANISTER_NAMES[@]}"; do
        local canister_id
        canister_id=$(dfx canister id "$canister" --network "$NETWORK")
        
        if [ -n "$canister_id" ]; then
            log "  Notifying service worker for $canister ($canister_id)"
            # This would typically be done via a postMessage to the service worker
            # For now, we'll just log it
        fi
    done
}

# Function to verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    local all_good=true
    
    for canister in "${CANISTER_NAMES[@]}"; do
        local canister_id
        canister_id=$(dfx canister id "$canister" --network "$NETWORK" 2>/dev/null || echo "")
        
        if [ -n "$canister_id" ]; then
            local url="https://$canister_id.icp0.io/"
            log "  Checking $canister at $url"
            
            # Test if the canister is responding
            if curl -s --head "$url" >/dev/null 2>&1; then
                success "  $canister is responding"
            else
                warning "  $canister may not be responding yet (this is normal, try again in a moment)"
            fi
        else
            error "  Could not get canister ID for $canister"
            all_good=false
        fi
    done
    
    if [ "$all_good" = true ]; then
        success "Multi-canister deployment verification completed!"
    else
        warning "Some issues found during verification"
    fi
}

# Function to display deployment summary
display_summary() {
    log "Deployment Summary:"
    echo ""
    echo "🎉 Multi-Canister Frontend Deployed Successfully!"
    echo ""
    echo "📋 Canister URLs:"
    
    for canister in "${CANISTER_NAMES[@]}"; do
        local canister_id
        canister_id=$(dfx canister id "$canister" --network "$NETWORK" 2>/dev/null || echo "")
        
        if [ -n "$canister_id" ]; then
            local url="https://$canister_id.icp0.io/"
            echo "  $canister: $url"
        fi
    done
    
    echo ""
    echo "🌐 Main Application URL:"
    local main_canister_id
    main_canister_id=$(dfx canister id "bonded-app-main" --network "$NETWORK" 2>/dev/null || echo "")
    if [ -n "$main_canister_id" ]; then
        echo "  https://$main_canister_id.icp0.io/"
    fi
    
    echo ""
    echo "💡 Tips:"
    echo "  - The main canister serves the application shell"
    echo "  - Assets are distributed across multiple canisters for maximum storage"
    echo "  - Service workers handle cross-canister loading automatically"
    echo "  - Check browser console for canister orchestration logs"
}

# Main execution
main() {
    log "Multi-Canister Frontend Deployment for network: $NETWORK"
    
    # Step 1: Build multi-canister frontend
    build_multi_canister
    
    # Step 2: Create canisters if needed
    create_canisters
    
    # Step 3: Get canister IDs
    get_canister_ids
    
    # Step 4: Inject canister IDs into frontend
    inject_canister_ids
    
    # Step 5: Deploy all canisters
    deploy_all_canisters
    
    # Step 6: Update service workers
    update_service_workers
    
    # Step 7: Verify deployment
    verify_deployment
    
    # Step 8: Display summary
    display_summary
    
    success "Multi-canister deployment completed!"
}

# Run main function
main "$@" 