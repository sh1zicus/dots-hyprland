#!/bin/bash
# Этот скрипт удаляет существующие конфиги в .config и копирует новые из текущей директории

source ./scriptdata/environment-variables

set -euo pipefail
cd "$(dirname "$0")"
export base="$(pwd)"

# Определение цветов для вывода
GREEN="\033[0;32m"
RED="\033[0;31m"
BLUE="\033[0;34m"
CYAN="\033[0;36m"
YELLOW="\033[1;33m"
RESET="\033[0m"

# Определение путей для обновления
config_folders=(".config")
excludes=(".config/hypr/custom" ".config/ags/user_options.js" ".config/hypr/hyprland.conf")

get_destination() {
    local file="$1"
    if [ "$(echo $file | cut -d/ -f1)" = ".config" ]; then
        printf "$XDG_CONFIG_HOME/$(echo $file | cut -d/ -f2-)"
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

echo -e "${CYAN}Начинаю обновление конфигурации...${RESET}"
echo -e "${YELLOW}Следующие файлы и папки будут сохранены:${RESET} ${excludes[@]}"

# Сохраняем исключенные файлы
temp_dir="/tmp/dots_backup"
for exc in "${excludes[@]}"; do
    if [ -e "$(get_destination "$exc")" ]; then
        echo -e "${BLUE}Сохраняю ${exc}...${RESET}"
        mkdir -p "$temp_dir/$(dirname "$exc")"
        cp -r "$(get_destination "$exc")" "$temp_dir/$(dirname "$exc")/"
    fi
done

# Удаляем только .config директории, которые есть в репозитории
echo -e "${CYAN}Удаляю старые конфиги...${RESET}"
for dir in "$base/.config"/*; do
    if [ -d "$dir" ]; then
        config_name=$(basename "$dir")
        target_dir="$XDG_CONFIG_HOME/$config_name"
        if [ -d "$target_dir" ]; then
            echo -e "${RED}Удаляю $target_dir${RESET}"
            rm -rf "$target_dir"
        fi
    fi
done

# Восстанавливаем исключенные файлы
if [ -d "$temp_dir" ]; then
    echo -e "${BLUE}Восстанавливаю сохраненные файлы...${RESET}"
    for exc in "${excludes[@]}"; do
        if [ -e "$temp_dir/$exc" ]; then
            mkdir -p "$(dirname "$(get_destination "$exc")")"
            cp -r "$temp_dir/$exc" "$(get_destination "$exc")"
        fi
    done
    rm -rf "$temp_dir"
fi

# Копируем новые файлы
echo -e "${CYAN}Копирую новые файлы...${RESET}"

# Копируем .config файлы
for folder in "${config_folders[@]}"; do
    find "$folder" -type f -print0 | while IFS= read -r -d '' file; do
        if ! file_in_excludes "$file"; then
            destination="$(get_destination "$file")"
            echo -e "${BLUE}Копирую \"$file\" в \"$destination\" ...${RESET}"
            mkdir -p "$(dirname "$destination")"
            cp -f "$base/$file" "$destination"
        else
            echo -e "${YELLOW}Пропускаю $file${RESET}"
        fi
    done
done

# Перезагружаем конфигурации
echo -e "${CYAN}Перезагружаю конфигурации...${RESET}"
# Ждем завершения всех операций копирования
wait

clear

# Проверяем, запущены ли сервисы перед их перезагрузкой
nohup hyprctl reload >/dev/null 2>&1 &
echo -e "${GREEN}Hyprland перезагружен${RESET}"

nohup ags -q >/dev/null 2>&1 && nohup ags >/dev/null 2>&1 &
echo -e "${GREEN}AGS перезапущен${RESET}"

echo -e "${CYAN}Готово! Конфигурация обновлена.${RESET}"