const { Gio, GLib } = imports.gi;
import App from 'resource:///com/github/Aylur/ags/app.js';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
const { execAsync, exec } = Utils;
import Todo from "../../services/todo.js";
import { darkMode } from '../.miscutils/system.js';

export const hasUnterminatedBackslash = str => /\\+$/.test(str);

export function launchCustomCommand(command) {
    const [cmd, ...args] = command.toLowerCase().split(' ');
    const execScript = (script, params = '') => 
        execAsync([`bash`, `-c`, `${App.configDir}/scripts/${script}`, params]).catch(print);
        
    const commands = {
        '>raw': () => {
            Utils.execAsync('hyprctl -j getoption input:accel_profile')
                .then(output => {
                    const value = JSON.parse(output).str.trim();
                    execAsync(['bash', '-c', 
                        `hyprctl keyword input:accel_profile '${value != "[[EMPTY]]" && value != "" ? "[[EMPTY]]" : "flat"}'`
                    ]).catch(print);
                });
        },
        '>img': () => execScript('color_generation/switchwall.sh', '&'),
        '>color': () => {
            if (!args[0]) execScript('color_generation/switchcolor.sh --pick', '&');
            else if (args[0][0] === '#') execScript(`color_generation/switchcolor.sh "${args[0]}"`, '&');
        },
        '>light': () => darkMode.value = false,
        '>dark': () => darkMode.value = true,
        '>badapple': () => {
            const userStateDir = GLib.get_user_state_dir();
            execAsync([`bash`, `-c`, 
                `mkdir -p ${userStateDir}/ags/user && 
                 sed -i "3s/.*/monochrome/" ${userStateDir}/ags/user/colormode.txt`])
                .then(() => execScript('color_generation/switchcolor.sh'))
                .catch(print);
        },
        '>adw': () => execScript('color_generation/switchcolor.sh "#3584E4" --no-gradience', '&'),
        '>adwaita': () => execScript('color_generation/switchcolor.sh "#3584E4" --no-gradience', '&'),
        '>grad': () => execScript('color_generation/switchcolor.sh - --yes-gradience', '&'),
        '>gradience': () => execScript('color_generation/switchcolor.sh - --yes-gradience', '&'), 
        '>nograd': () => execScript('color_generation/switchcolor.sh - --no-gradience', '&'),
        '>nogradience': () => execScript('color_generation/switchcolor.sh - --no-gradience', '&'),
        '>material': () => {
            const userStateDir = GLib.get_user_state_dir();
            execAsync([`bash`, `-c`, 
                `mkdir -p ${userStateDir}/ags/user && 
                 echo "material" > ${userStateDir}/ags/user/colorbackend.txt`])
                .then(() => execScript('color_generation/switchwall.sh --noswitch'))
                .catch(print);
        },
        '>pywal': () => {
            const userStateDir = GLib.get_user_state_dir();
            execAsync([`bash`, `-c`, 
                `mkdir -p ${userStateDir}/ags/user && 
                 echo "pywal" > ${userStateDir}/ags/user/colorbackend.txt`])
                .then(() => execScript('color_generation/switchwall.sh --noswitch'))
                .catch(print);
        },
        '>todo': () => Todo.add(args.join(' ')),
        '>shutdown': () => execAsync(['bash', '-c', 'systemctl poweroff || loginctl poweroff']).catch(print),
        '>reboot': () => execAsync(['bash', '-c', 'systemctl reboot || loginctl reboot']).catch(print),
        '>sleep': () => execAsync(['bash', '-c', 'systemctl suspend || loginctl suspend']).catch(print),
        '>logout': () => execAsync(['bash', '-c', 'pkill Hyprland || pkill sway']).catch(print)
    };

    commands[cmd]?.();
}

export const execAndClose = (command, terminal) => {
    App.closeWindow('overview');
    if (terminal) {
        execAsync(['bash', '-c', `${userOptions.asyncGet().apps.terminal} fish -C "${command}"`, '&']).catch(print);
    } else {
        execAsync(command).catch(print);
    }
};

export const couldBeMath = str => /^[0-9.+*/-]/.test(str);

export const expandTilde = path => path.startsWith('~') ? GLib.get_home_dir() + path.slice(1) : path;

const getFileIcon = fileInfo => fileInfo.get_icon()?.get_names()[0] || 'text-x-generic';

export function ls({ path = '~', silent = false }) {
    try {
        const expandedPath = expandTilde(path).replace(/\/$/, '');
        const folder = Gio.File.new_for_path(expandedPath);
        const enumerator = folder.enumerate_children('standard::*', Gio.FileQueryInfoFlags.NONE, null);
        
        const contents = [];
        let fileInfo;
        while ((fileInfo = enumerator.next_file(null))) {
            const fileName = fileInfo.get_display_name();
            const isDirectory = fileInfo.get_file_type() === Gio.FileType.DIRECTORY;
            
            contents.push({
                parentPath: expandedPath,
                name: fileName,
                type: isDirectory ? 'folder' : fileName.split('.').pop(),
                icon: getFileIcon(fileInfo)
            });
        }
        
        return contents.sort((a, b) => {
            const aIsFolder = a.type === 'folder';
            const bIsFolder = b.type === 'folder';
            return aIsFolder === bIsFolder ? a.name.localeCompare(b.name) : bIsFolder ? 1 : -1;
        });
    } catch (e) {
        if (!silent) console.log(e);
        return [];
    }
}
