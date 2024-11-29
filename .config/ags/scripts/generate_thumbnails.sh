#!/bin/bash
set -e  # Exit on errors
set -u  # Treat unset variables as errors

WALLPAPER_DIR="$1"
THUMBNAIL_DIR="$2"

# Ensure the thumbnail directory exists
mkdir -p "$THUMBNAIL_DIR"

# Loop through valid image files
for image in "$WALLPAPER_DIR"/*.{jpg,JPG,jpeg,JPEG,png,PNG}; do
    # Check if the file exists (handles the case where no files match the pattern)
    [ -e "$image" ] || continue

    filename=$(basename "$image")

    # Generate a thumbnail using ImageMagick
    magick "$image" -resize 150x90^ -gravity center -extent 150x90 "$THUMBNAIL_DIR/$filename"
done

echo "Thumbnails generated in $THUMBNAIL_DIR"
