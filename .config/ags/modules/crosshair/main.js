import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import { enableClickthrough } from "../.widgetutils/clickthrough.js";

export default (monitor = 0, ) => {
    return Widget.Window({
        monitor,
        name: `crosshair${monitor}`,
        layer: 'overlay',
        type: 'dock',
        exclusivity: 'exclusive',
        visible: false,
        className: 'crosshair',
        child: Widget.Box({
            vertical: true,
            child: Widget.Box({
                vertical: true,
                child: Widget.Icon({
                    icon: 'crosshair-symbolic',
                    css: `
                        font-size: ${userOptions.asyncGet().gaming.crosshair.size}px;
                        color: ${userOptions.asyncGet().gaming.crosshair.color};
                    `,
                }),
                css: `
                    margin-bottom: 37px;
                `
            }),
        }),
        setup: (window) => {
            enableClickthrough(window);
            // Make the window ignore pointer events
            window.set_property('can-focus', false);
            window.set_property('can-target', false);
            window.set_property('accepts-focus', false);
            window.set_property('focus-on-map', false);
        },
    });
}
