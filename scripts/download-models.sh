#!/bin/bash

# AI Models Download Script for Bonded App
# Downloads required models for NSFW detection and text classification

echo "🚀 Downloading AI Models for Bonded App"
echo "========================================"

# Create models directory
MODELS_DIR="src/bonded-app-frontend/public/models"
mkdir -p "$MODELS_DIR"

echo "📁 Models directory: $MODELS_DIR"

# Function to download file with progress
download_file() {
    local url=$1
    local output=$2
    local description=$3
    
    echo "📥 Downloading $description..."
    if command -v wget >/dev/null 2>&1; then
        wget --progress=bar:force:noscroll -O "$output" "$url"
    elif command -v curl >/dev/null 2>&1; then
        curl -L -o "$output" "$url"
    else
        echo "❌ Error: Neither wget nor curl found. Please install one of them."
        exit 1
    fi
    
    if [ -f "$output" ]; then
        echo "✅ Downloaded: $output"
    else
        echo "❌ Failed to download: $output"
    fi
}

# NSFW Detection Models
echo ""
echo "🔞 Downloading NSFW Detection Models..."

# Create NSFW models directory
mkdir -p "$MODELS_DIR/nsfw-mobilenet-v2"

# Download MobileNetV2 model files
download_file \
    "https://d1zv2aa77w1v6m.cloudfront.net/nsfwjs_mobilenet_v2_140_224/model.json" \
    "$MODELS_DIR/nsfw-mobilenet-v2/model.json" \
    "NSFW MobileNetV2 model.json"

download_file \
    "https://d1zv2aa77w1v6m.cloudfront.net/nsfwjs_mobilenet_v2_140_224/group1-shard1of1.bin" \
    "$MODELS_DIR/nsfw-mobilenet-v2/group1-shard1of1.bin" \
    "NSFW MobileNetV2 weights"

# Create InceptionV3 models directory
mkdir -p "$MODELS_DIR/nsfw-inception-v3"

download_file \
    "https://d1zv2aa77w1v6m.cloudfront.net/nsfwjs_mobilenet_v2_140_224/model.json" \
    "$MODELS_DIR/nsfw-inception-v3/model.json" \
    "NSFW InceptionV3 model.json"

download_file \
    "https://d1zv2aa77w1v6m.cloudfront.net/nsfwjs_mobilenet_v2_140_224/group1-shard1of1.bin" \
    "$MODELS_DIR/nsfw-inception-v2/group1-shard1of1.bin" \
    "NSFW InceptionV3 weights"

echo ""
echo "🎯 Model Download Summary:"
echo "=========================="
echo "✅ NSFW Detection: MobileNetV2 + InceptionV3"
echo ""
echo "📁 Models saved to: $MODELS_DIR"
echo ""
echo "🚀 You can now run the app with AI capabilities!"
echo "💡 Note: First run may take longer as models are loaded into memory"
