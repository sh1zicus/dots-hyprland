#!/usr/bin/env bash

# Directory paths
XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
XDG_CACHE_HOME="${XDG_CACHE_HOME:-$HOME/.cache}"
XDG_STATE_HOME="${XDG_STATE_HOME:-$HOME/.local/state}"
CONFIG_DIR="$XDG_CONFIG_HOME/ags"
CACHE_DIR="$XDG_CACHE_HOME/ags"
STATE_DIR="$XDG_STATE_HOME/ags"

# Check if no arguments are passed
if [ $# -eq 0 ]; then
    echo "Usage: $0 /path/to/image (--apply)"
    exit 1
fi

# Set default values and read the current settings
colormodefile="$STATE_DIR/user/colormode.txt"
lightdark="dark"
transparency="opaque"
materialscheme="vibrant"
terminalscheme="$XDG_CONFIG_HOME/ags/scripts/templates/terminal/scheme-base.json"

# Create or read color mode settings
if [ ! -f $colormodefile ]; then
    echo "dark" > $colormodefile
    echo "opaque" >> $colormodefile
    echo "vibrant" >> $colormodefile
elif [[ $(wc -l < $colormodefile) -ne 4 || $(wc -w < $colormodefile) -ne 4 ]]; then
    echo "dark" > $colormodefile
    echo "opaque" >> $colormodefile
    echo "vibrant" >> $colormodefile
    echo "yesgradience" >> $colormodefile
else
    lightdark=$(sed -n '1p' $colormodefile)
    transparency=$(sed -n '2p' $colormodefile)
    materialscheme=$(sed -n '3p' $colormodefile)
    if [ "$materialscheme" = "monochrome" ]; then
        terminalscheme="$XDG_CONFIG_HOME/ags/scripts/templates/terminal/scheme-monochrome.json"
    fi
fi

# Determine color generation backend
backend="material"
if [ ! -f "$STATE_DIR/user/colorbackend.txt" ]; then
    echo "material" > "$STATE_DIR/user/colorbackend.txt"
else
    backend=$(cat "$STATE_DIR/user/colorbackend.txt")
fi

# Color Generation Logic (in-line version)
generate_colors() {
    local imgpath=$1
    local apply=$2

    if [[ "$backend" = "material" ]]; then
        smartflag=''
        if [ "$3" = "--smart" ]; then
            smartflag='--smart'
        fi
        # Generate material colors
        "$CONFIG_DIR/scripts/color_generation/generate_colors_material.py" --path "$imgpath" \
            --mode "$lightdark" --scheme "$materialscheme" --transparency "$transparency" \
            --termscheme "$terminalscheme" --blend_bg_fg \
            --cache "$STATE_DIR/user/color.txt" $smartflag \
            > "$CACHE_DIR/user/generated/material_colors.scss

        if [ "$apply" = "--apply" ]; then
            cp "$CACHE_DIR/user/generated/material_colors.scss" "$STATE_DIR/scss/_material.scss"
            "$CONFIG_DIR/scripts/color_generation/applycolor.sh"
        fi
    elif [[ "$backend" = "pywal" ]]; then
        # Use pywal to generate colors
        wal -c
        wal -i "$imgpath" -n "$lightdark" -q
        cp "$XDG_CACHE_HOME/wal/colors.scss" "$CACHE_DIR/user/generated/material_colors.scss"

        cat "$CONFIG_DIR/scripts/color_generation/pywal_to_material.scss" >> "$CACHE_DIR/user/generated/material_colors.scss"

        if [ "$apply" = "--apply" ]; then
            sass -I "$STATE_DIR/scss" -I "$CONFIG_DIR/scss/fallback" "$CACHE_DIR/user/generated/material_colors.scss" "$CACHE_DIR/user/generated/colors_classes.scss" --style compressed
            sed -i "s/ { color//g" "$CACHE_DIR/user/generated/colors_classes.scss"
            sed -i "s/\./$/g" "$CACHE_DIR/user/generated/colors_classes.scss"
            sed -i "s/}//g" "$CACHE_DIR/user/generated/colors_classes.scss"
            if [ "$lightdark" = "-l" ]; then
                echo "\$darkmode: false;" >> "$CACHE_DIR/user/generated/colors_classes.scss"
            else
                echo "\$darkmode: true;" >> "$CACHE_DIR/user/generated/colors_classes.scss"
            fi

            cp "$CACHE_DIR/user/generated/colors_classes.scss" "$STATE_DIR/scss/_material.scss"
            "$CONFIG_DIR/scripts/color_generation/applycolor.sh"
        fi
    fi
}

# Main script logic
if [[ "$1" = "#"* ]]; then
    # If argument is a color code
    generate_colors "$1" "$2"
elif [[ -f "$1" ]]; then
    # If argument is an image file path
    generate_colors "$1" "$2"
else
    echo "Invalid argument: $1"
    exit 1
fi
