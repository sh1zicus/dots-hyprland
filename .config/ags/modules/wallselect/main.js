import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
import App from 'resource:///com/github/Aylur/ags/app.js';
import PopupWindow from '../.widgethacks/popupwindow.js';
import { MaterialIcon } from '../.commonwidgets/materialicon.js';
const { GLib } = imports.gi;

const WallpaperButton = (path) => Widget.Button({
    className: 'wallpaper-button',
    child: Widget.Overlay({
        child: Widget.Box({
            css: `
                background-image: url('${path}');
                background-size: cover;
                background-position: center;
                min-width: 180px;
                min-height: 100px;
                border-radius: 12px;
            `,
        }),
        overlays: [
            Widget.Box({
                className: 'wallpaper-overlay',
                homogeneous: true,
                visible: false,
                child: MaterialIcon('done', 'norm'),
            }),
        ],
    }),
    onClicked: async () => {
        await Utils.execAsync(`sh ${GLib.get_home_dir()}/.config/ags/scripts/color_generation/switchwall.sh "${path}"`);
        App.closeWindow('wallselect');
    },
});

const WallpaperGrid = () => {
    const flowBox = Widget.FlowBox({
        className: 'wallpaper-grid',
        minChildrenPerLine: 3,
        maxChildrenPerLine: 6,
        selectionMode: 'none',
        homogeneous: true,
    });

    const loadWallpapers = async () => {
        const wallpaperDir = `${GLib.get_home_dir()}/Pictures/Wallpapers`;
        try {
            const files = (await Utils.execAsync(`find "${wallpaperDir}" -type f -iname "*.jpg" -o -iname "*.png" -o -iname "*.jpeg"`)).split('\n');
            files.filter(f => f).forEach(file => {
                flowBox.add(WallpaperButton(file));
            });
        } catch (e) {
            console.error('Failed to load wallpapers:', e);
        }
    };

    loadWallpapers();
    return Widget.Scrollable({
        vexpand: true,
        hexpand: true,
        child: flowBox,
    });
};

export default () => PopupWindow({
    keymode: 'on-demand',
    anchor: ['top', 'left', 'right'],
    name: 'wallselect',
    layer: 'overlay',
    child: Widget.Box({
        className: 'sidebar-left',
        vertical: true,
        children: [
            Widget.Box({
                className: 'sidebar-header',
                children: [
                    Widget.Label({
                        className: 'txt-title',
                        label: 'Wallpapers',
                    }),
                    Widget.Box({ hexpand: true }),
                ],
            }),
            WallpaperGrid(),
        ],
    }),
}); 