#!/bin/bash

# Paths configuration
THUMBNAIL_DIR="$HOME/Pictures/Wallpapers/thumbnails"
WALLPAPER_DIR="$HOME/Pictures/Wallpapers"

# Create thumbnail directory
mkdir -p "$THUMBNAIL_DIR"

# Process wallpapers
find "$WALLPAPER_DIR" -type f \( -iname "*.jpg" -o -iname "*.png" \) | while read -r file; do
    # Get filename without path
    base_name=$(basename "$file")
    
    # Set thumbnail path
    thumbnail="$THUMBNAIL_DIR/$base_name"
    
    # Generate thumbnail if doesn't exist
    if [ ! -f "$thumbnail" ]; then
        magick "$file" -resize 150x90^ -gravity center -extent 150x90 "$thumbnail"
    fi
done