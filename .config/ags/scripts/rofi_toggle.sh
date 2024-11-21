#!/bin/bash

# Check if Rofi is already running
if pgrep -x "rofi" > /dev/null; then
    # If running, kill it
    pkill -x "rofi"
else
    # If not running, launch Rofi
    rofi -show drun -show-icons
fi

