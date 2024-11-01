import App from 'resource:///com/github/Aylur/ags/app.js';
import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import Brightness from '../../../services/brightness.js';
import Indicator from '../../../services/indicator.js';

// Кэшируем часто используемые значения
const BRIGHTNESS_STEP = 0.05;
const DEFAULT_WORKSPACE_LABEL = 'Desktop';

const WindowTitle = async () => {
    try {
        const Hyprland = (await import('resource:///com/github/Aylur/ags/service/hyprland.js')).default;
        
        // Создаем общие стили для лейблов
        const commonLabelProps = {
            xalign: 0,
            truncate: 'end',
            maxWidthChars: 1,
        };

        const topLabel = Widget.Label({
            ...commonLabelProps,
            className: 'txt-smaller bar-wintitle-topdesc txt',
            setup: (self) => self.hook(Hyprland.active.client, label => {
                label.label = Hyprland.active.client.class || DEFAULT_WORKSPACE_LABEL;
            }),
        });

        const bottomLabel = Widget.Label({
            ...commonLabelProps, 
            className: 'txt-smallie bar-wintitle-txt',
            setup: (self) => self.hook(Hyprland.active.client, label => {
                label.label = Hyprland.active.client.title || `Workspace ${Hyprland.active.workspace.id}`;
            }),
        });

        return Widget.Scrollable({
            hexpand: true,
            vexpand: true,
            hscroll: 'automatic',
            vscroll: 'never',
            child: Widget.Box({
                vertical: true,
                children: [topLabel, bottomLabel]
            })
        });
    } catch {
        return null;
    }
}

export default async (monitor = 0) => {
    const optionalWindowTitleInstance = await WindowTitle();
    
    // Создаем общий обработчик прокрутки
    const handleScroll = (direction) => {
        Indicator.popup(1);
        Brightness[monitor].screen_value += direction * BRIGHTNESS_STEP;
    };

    return Widget.EventBox({
        onScrollUp: () => handleScroll(1),
        onScrollDown: () => handleScroll(-1),
        onPrimaryClick: () => App.toggleWindow('sideleft'),
        child: Widget.Box({
            homogeneous: false,
            children: [
                Widget.Box({ className: 'bar-corner-spacing' }),
                Widget.Overlay({
                    overlays: [
                        Widget.Box({ hexpand: true }),
                        Widget.Box({
                            className: 'bar-sidemodule',
                            hexpand: true,
                            children: [Widget.Box({
                                vertical: true,
                                className: 'bar-space-button',
                                children: [optionalWindowTitleInstance]
                            })]
                        }),
                    ]
                })
            ]
        })
    });
}
