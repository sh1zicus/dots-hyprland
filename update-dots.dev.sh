#!/bin/bash
# This script removes existing configs in .config and copies new ones from the current directory

source ./scriptdata/environment-variables

set -euo pipefail
cd "$(dirname "$0")"
export base="$(pwd)"

# Define colors for output
GREEN="\033[0;32m"
RED="\033[0;31m"
BLUE="\033[0;34m"
CYAN="\033[0;36m"
YELLOW="\033[1;33m"
RESET="\033[0m"

# Define paths for update
config_folders=(".config")
excludes=(".config/hypr/custom" ".config/ags/user_options.js" ".config/hypr/hyprland.conf")

get_destination() {
    local file="$1"
    if [ "$(echo $file | cut -d/ -f1)" = ".config" ]; then
        printf "$XDG_CONFIG_HOME/$(echo $file | cut -d/ -f2-)"
    elif [ "$(echo $file | cut -d/ -f1-2)" = ".local/bin" ]; then
        printf "$XDG_BIN_HOME/$(echo $file | cut -d/ -f3-)"
    fi
}

file_in_excludes() {
    local file="$1"
    for exc in "${excludes[@]}"; do
        if [[ $file == "$exc"* ]]; then
            return 0
        fi
    done
    return 1
}

echo -e "${CYAN}Starting configuration update...${RESET}"
echo -e "${YELLOW}The following files and folders will be preserved:${RESET} ${excludes[@]}"

# Preserve excluded files
temp_dir="/tmp/dots_backup"
for exc in "${excludes[@]}"; do
    if [ -e "$(get_destination "$exc")" ]; then
        echo -e "${BLUE}Saving ${exc}...${RESET}"
        mkdir -p "$temp_dir/$(dirname "$exc")"
        cp -r "$(get_destination "$exc")" "$temp_dir/$(dirname "$exc")/"
    fi
done

# Remove only .config directories that are in the repository
echo -e "${CYAN}Removing old configs...${RESET}"
for dir in "$base/.config"/*; do
    if [ -d "$dir" ]; then
        config_name=$(basename "$dir")
        target_dir="$XDG_CONFIG_HOME/$config_name"
        if [ -d "$target_dir" ]; then
            echo -e "${RED}Removing $target_dir${RESET}"
            rm -rf "$target_dir"
        fi
    fi
done

# Restore excluded files
if [ -d "$temp_dir" ]; then
    echo -e "${BLUE}Restoring saved files...${RESET}"
    for exc in "${excludes[@]}"; do
        if [ -e "$temp_dir/$exc" ]; then
            mkdir -p "$(dirname "$(get_destination "$exc")")"
            cp -r "$temp_dir/$exc" "$(get_destination "$exc")"
        fi
    done
    rm -rf "$temp_dir"
fi

# Copy new files
echo -e "${CYAN}Copying new files...${RESET}"

# Update AGS config.json
echo -e "${BLUE}Updating ~/.ags/config.json...${RESET}"
mkdir -p "$HOME/.ags"
cp -f "$base/.config/ags/modules/.configuration/user_options.default.json" "$HOME/.ags/config.json"

# Update local bin files
echo -e "${BLUE}Updating ~/.local/bin files...${RESET}"
mkdir -p "$XDG_BIN_HOME"
if [ -d "$base/.local/bin" ]; then
    cp -f "$base/.local/bin/"* "$XDG_BIN_HOME/"
    chmod +x "$XDG_BIN_HOME"/*
fi

# Copy .config files
for folder in "${config_folders[@]}"; do
    find "$folder" -type f -print0 | while IFS= read -r -d '' file; do
        if ! file_in_excludes "$file"; then
            destination="$(get_destination "$file")"
            echo -e "${BLUE}Copying \"$file\" to \"$destination\" ...${RESET}"
            mkdir -p "$(dirname "$destination")"
            cp -f "$base/$file" "$destination"
        else
            echo -e "${YELLOW}Skipping $file${RESET}"
        fi
    done
done

# Reload configurations
echo -e "${CYAN}Reloading configurations...${RESET}"
# Wait for all copy operations to complete
wait

clear

# Check if services are running before restarting them
nohup hyprctl reload >/dev/null 2>&1 &
echo -e "${GREEN}Hyprland reloaded${RESET}"

nohup ags -q >/dev/null 2>&1 && nohup ags >/dev/null 2>&1 &
echo -e "${GREEN}AGS restarted${RESET}"

echo -e "${CYAN}Done! Configuration updated.${RESET}"