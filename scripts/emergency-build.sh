#!/bin/bash

# EMERGENCY BUILD SCRIPT
# Use this if your laptop is struggling with even the lightweight builds

echo "🚨 Emergency Build Mode - Minimal Resource Usage"
echo "=================================================="

# Set process limits
ulimit -v 2097152  # Limit virtual memory to 2GB
ulimit -u 100      # Limit processes

# Set environment variables for minimal resource usage
export NODE_OPTIONS="--max-old-space-size=512 --max-semi-space-size=32"
export UV_THREADPOOL_SIZE=1
export VITE_BUILD_MODE="emergency"
export EXCLUDE_AI_MODELS=true

# Reduce system impact
renice 19 $$  # Set lowest priority

echo "Building with absolute minimal resources..."
echo "- Memory limit: 512MB"
echo "- Single thread"
echo "- No AI models"
echo "- Lowest process priority"
echo ""

cd src/bonded-app-frontend

# Use the most basic build possible
npm run build:ultra-light

echo ""
echo "✅ Emergency build complete!"
echo "Note: This build excludes AI features for minimal resource usage"