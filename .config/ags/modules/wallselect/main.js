import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
import App from 'resource:///com/github/Aylur/ags/app.js';
const { GLib } = imports.gi;

const WallpaperButton = (path) => {
    const preview = Widget.Box({
        className: 'preview-box',
        css: `background-image: url("${path}");`,
    });

    return Widget.Button({
        child: preview,
        onClicked: () => {
            Utils.execAsync(`sh ${GLib.get_home_dir()}/.config/ags/scripts/color_generation/switchwall.sh "${path}"`);
            App.closeWindow('wallselect');
        },
    });
};

const WallpaperList = () => {
    const contentBox = Widget.Box({
        hexpand: true,
        homogeneous: false,
        spacing: 8,
        className: 'wallpaper-list',
    });

    const scroll = Widget.Scrollable({
        hexpand: true,
        vexpand: false,
        hscroll: 'always',
        vscroll: 'never',
        child: contentBox,
        className: 'scroll-box',
    });

    const container = Widget.EventBox({
        onScrollUp: () => {
            const adj = scroll.get_hadjustment();
            const newValue = adj.get_value() - 100;
            adj.set_value(newValue);
        },
        onScrollDown: () => {
            const adj = scroll.get_hadjustment();
            const newValue = adj.get_value() + 100;
            adj.set_value(newValue);
        },
        child: Widget.Box({
            vertical: true,
            className: 'sidebar-module',
            children: [scroll],
        }),
    });

    const loadWallpapers = () => {
        const wallpaperDir = GLib.get_home_dir() + '/Pictures/Wallpapers';
        try {
            const files = Utils.exec(`find "${wallpaperDir}" -type f -name "*.jpg"`)
                .split('\n')
                .filter(f => f);
            
            files.forEach(file => {
                const button = WallpaperButton(file);
                if (button) contentBox.add(button);
            });
        } catch (e) {
            console.error('Error loading wallpapers:', e);
        }
    };

    loadWallpapers();
    return container;
};

export default () => Widget.Window({
    name: 'wallselect',
    anchor: ['top', 'left', 'right'],
    child: Widget.Box({
        vertical: true,
        className: 'wallpaper-window',
        children: [WallpaperList()],
    }),
}); 