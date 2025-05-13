#!/bin/bash

# Generate PWA icons from the SVG file
# Make sure ImageMagick is installed: sudo apt-get install imagemagick

# Set input and output paths
SVG_FILE="app-icon.svg"
CURRENT_DIR=$(dirname "$0")
cd "$CURRENT_DIR" || exit

echo "Generating PWA icons from $SVG_FILE..."

# Generate standard PWA icons
convert "$SVG_FILE" -resize 192x192 icon-192x192.png
convert "$SVG_FILE" -resize 512x512 icon-512x512.png

# Generate Apple touch icons
convert "$SVG_FILE" -resize 180x180 apple-touch-icon.png
convert "$SVG_FILE" -resize 120x120 apple-touch-icon-120x120.png
convert "$SVG_FILE" -resize 152x152 apple-touch-icon-152x152.png
convert "$SVG_FILE" -resize 167x167 apple-touch-icon-167x167.png

# Generate favicon
convert "$SVG_FILE" -resize 32x32 ../favicon.ico

echo "PWA icons generation complete!" 