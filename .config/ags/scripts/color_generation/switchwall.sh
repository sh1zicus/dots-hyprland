#!/usr/bin/env bash

# Adjustable options (placed at the top for easier configuration)
SATURATION="1.5"      # Default saturation level
DARK_MODE="true"      # Default dark mode setting (true/false)
EXTRA_TOOLS="true"    # Default to run extra tools (pywal-related tools)

XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
CONFIG_DIR="$XDG_CONFIG_HOME/ags"

# Function to set the wallpaper
switch() {
    local imgpath=$1

    read scale screenx screeny screensizey < <(hyprctl monitors -j | jq '.[] | select(.focused) | .scale, .x, .y, .height' | xargs)

    # Get cursor position and adjust for screen scaling
    cursorposx=$(hyprctl cursorpos -j | jq '.x' 2>/dev/null || echo 960)
    cursorposx=$(bc <<< "scale=0; ($cursorposx - $screenx) * $scale / 1")
    cursorposy=$(hyprctl cursorpos -j | jq '.y' 2>/dev/null || echo 540)
    cursorposy=$(bc <<< "scale=0; ($cursorposy - $screeny) * $scale / 1")
    cursorposy_inverted=$((screensizey - cursorposy))

    [ -z "$imgpath" ] && exit 1

    # Set wallpaper silently
    swww img "$imgpath" --transition-step 100 --transition-fps 120 \
        --transition-type grow --transition-angle 30 --transition-duration 1 \
        --transition-pos "$cursorposx,$cursorposy_inverted" >/dev/null 2>&1
}

# Function to generate and apply colors with adjustable options
generate_colors() {
    local imgpath=$1
    local saturation=$2
    local dark_mode=$3
    local extra_tools=$4

    [ -z "$imgpath" ] && return 1

    # Silent execution of color generation commands
    "$CONFIG_DIR"/scripts/color_generation/colorgen.sh "$imgpath" --apply --smart >/dev/null 2>&1

    # Adjust saturation if provided
    if [ -n "$saturation" ]; then
        wal -i "$imgpath" --saturate "$saturation" >/dev/null 2>&1
    else
        wal -i "$imgpath" >/dev/null 2>&1
    fi

    # Optionally apply dark mode if enabled
    if [ "$dark_mode" == "true" ]; then
        wal -i "$imgpath" --dark >/dev/null 2>&1
    fi

    # Refresh applications asynchronously if extra tools are requested
    if [ "$extra_tools" == "true" ]; then
        (pywal-discord -p ~/.config/vesktop/themes >/dev/null 2>&1 &)
        (wal-telegram >/dev/null 2>&1 &)
        (pywalfox update >/dev/null 2>&1 &)
        (pywal-spicetify "default" >/dev/null 2>&1 &)
    fi
}

# Main Script Logic
if [ "$1" == "--noswitch" ]; then
    imgpath=$(swww query | awk -F 'image: ' '{print $2}')
    [ -z "$imgpath" ] && exit 1
elif [ -n "$1" ]; then
    switch "$1"

    # Adjustable options can be passed as arguments (optional)
    while getopts "s:d:t:" opt; do
        case "$opt" in
            s) SATURATION="$OPTARG" ;;  # Set saturation
            d) DARK_MODE="$OPTARG" ;;   # Set dark mode (true/false)
            t) EXTRA_TOOLS="$OPTARG" ;; # Enable/disable extra tools (true/false)
            *)
                echo "Usage: $0 [-s saturation] [-d dark_mode] [-t extra_tools]"
                exit 1
                ;;
        esac
    done

    generate_colors "$1" "$SATURATION" "$DARK_MODE" "$EXTRA_TOOLS"
else
    # Prompt user to select an image
    cd "$(xdg-user-dir PICTURES)" || exit 1
    imgpath=$(yad --width 1200 --height 800 --file --add-preview --large-preview --title="Choose wallpaper")
    [ -n "$imgpath" ] && switch "$imgpath"

    # Adjustable options can be passed as arguments (optional)
    while getopts "s:d:t:" opt; do
        case "$opt" in
            s) SATURATION="$OPTARG" ;;  # Set saturation
            d) DARK_MODE="$OPTARG" ;;   # Set dark mode (true/false)
            t) EXTRA_TOOLS="$OPTARG" ;; # Enable/disable extra tools (true/false)
            *)
                echo "Usage: $0 [-s saturation] [-d dark_mode] [-t extra_tools]"
                exit 1
                ;;
        esac
    done

    generate_colors "$imgpath" "$SATURATION" "$DARK_MODE" "$EXTRA_TOOLS"
fi
