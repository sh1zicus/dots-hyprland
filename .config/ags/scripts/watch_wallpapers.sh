#!/bin/bash

THUMBNAIL_DIR="$HOME/Pictures/Wallpapers/thumbnails"
WALLPAPER_DIR="$HOME/Pictures/Wallpapers"

# Create thumbnail directory if it doesn't exist
mkdir -p "$THUMBNAIL_DIR"

# Generate thumbnails for all wallpapers
find "$WALLPAPER_DIR" -type f \( -iname "*.jpg" -o -iname "*.png" \) | while read -r file; do
    base_name=$(basename "$file")
    thumbnail="$THUMBNAIL_DIR/$base_name"
    if [ ! -f "$thumbnail" ]; then
        magick "$file" -resize 300x300^ -gravity center -extent 300x300 "$thumbnail"
    fi
done
