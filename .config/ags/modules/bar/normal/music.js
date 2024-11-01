const { GLib } = imports.gi;
import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
import Mpris from 'resource:///com/github/Aylur/ags/service/mpris.js';
const { Box, Button, EventBox, Label, Overlay, Revealer, Scrollable } = Widget;
const { execAsync, exec } = Utils;
import { AnimatedCircProg } from "../../.commonwidgets/cairo_circularprogress.js";
import { MaterialIcon } from '../../.commonwidgets/materialicon.js';
import { showMusicControls } from '../../../variables.js';

const CUSTOM_MODULE_CONTENT_INTERVAL_FILE = `${GLib.get_user_cache_dir()}/ags/user/scripts/custom-module-interval.txt`;
const CUSTOM_MODULE_CONTENT_SCRIPT = `${GLib.get_user_cache_dir()}/ags/user/scripts/custom-module-poll.sh`;
const CUSTOM_MODULE_LEFTCLICK_SCRIPT = `${GLib.get_user_cache_dir()}/ags/user/scripts/custom-module-leftclick.sh`;
const CUSTOM_MODULE_RIGHTCLICK_SCRIPT = `${GLib.get_user_cache_dir()}/ags/user/scripts/custom-module-rightclick.sh`;
const CUSTOM_MODULE_MIDDLECLICK_SCRIPT = `${GLib.get_user_cache_dir()}/ags/user/scripts/custom-module-middleclick.sh`;
const CUSTOM_MODULE_SCROLLUP_SCRIPT = `${GLib.get_user_cache_dir()}/ags/user/scripts/custom-module-scrollup.sh`;
const CUSTOM_MODULE_SCROLLDOWN_SCRIPT = `${GLib.get_user_cache_dir()}/ags/user/scripts/custom-module-scrolldown.sh`;

function trimTrackTitle(title) {
    if (!title) return '';
    const cleanPatterns = [
        /【[^】]*】/,
        " [FREE DOWNLOAD]",
    ];
    return cleanPatterns.reduce((str, pattern) => str.replace(pattern, ''), title);
}

const BarGroup = ({ child }) => Box({
    className: 'bar-group-margin bar-sides',
    children: [
        Box({
            className: 'bar-group bar-group-standalone bar-group-pad-system',
            children: [child],
        }),
    ]
});

const BarResource = (name, icon, command, circprogClassName = 'bar-batt-circprog', textClassName = 'txt-onSurfaceVariant', iconClassName = 'bar-batt') => {
    const resourceCircProg = AnimatedCircProg({
        className: `${circprogClassName}`,
        vpack: 'center',
        hpack: 'center',
    });
    const resourceLabel = Label({
        className: `txt-smallie ${textClassName}`,
    });
    const widget = Button({
        onClicked: () => Utils.execAsync(['bash', '-c', `${userOptions.asyncGet().apps.taskManager}`]).catch(print),
        child: Box({
            className: `spacing-h-4 ${textClassName}`,
            children: [
                Box({
                    homogeneous: true,
                    children: [Overlay({
                        child: Box({
                            vpack: 'center',
                            className: `${iconClassName}`,
                            homogeneous: true,
                            children: [MaterialIcon(icon, 'small')],
                        }),
                        overlays: [resourceCircProg]
                    })]
                }),
                resourceLabel,
            ],
            setup: (self) => self.poll(5000, () => {
                execAsync(['bash', '-c', command])
                    .then((output) => {
                        const value = Math.round(Number(output));
                        resourceCircProg.css = `font-size: ${value}px;`;
                        resourceLabel.label = `${value}%`;
                        widget.tooltipText = `${name}: ${value}%`;
                    }).catch(print);
            }),
        })
    });
    return widget;
}

const TrackProgress = () => AnimatedCircProg({
    className: 'bar-music-circprog',
    vpack: 'center', 
    hpack: 'center',
    extraSetup: (self) => self
        .hook(Mpris, () => {
            const mpris = Mpris.getPlayer('');
            if (!mpris) return;
            self.css = `font-size: ${Math.max(mpris.position / mpris.length * 100, 0)}px;`;
        })
        .poll(3000, self => {
            const mpris = Mpris.getPlayer('');
            if (!mpris) return;
            self.css = `font-size: ${Math.max(mpris.position / mpris.length * 100, 0)}px;`;
        }),
});

const switchToRelativeWorkspace = async (self, num) => {
    try {
        const Hyprland = (await import('resource:///com/github/Aylur/ags/service/hyprland.js')).default;
        Hyprland.messageAsync(`dispatch workspace ${num > 0 ? '+' : ''}${num}`).catch(print);
    } catch {
        execAsync([`${App.configDir}/scripts/sway/swayToRelativeWs.sh`, `${num}`]).catch(print);
    }
}

export default () => {
    const playingState = Box({
        homogeneous: true,
        children: [Overlay({
            child: Box({
                vpack: 'center',
                className: 'bar-music-playstate',
                homogeneous: true,
                children: [Label({
                    vpack: 'center',
                    className: 'bar-music-playstate-txt',
                    justification: 'center',
                    setup: (self) => self.hook(Mpris, () => {
                        const mpris = Mpris.getPlayer('');
                        self.label = mpris?.playBackStatus === 'Playing' ? 'pause' : 'play_arrow';
                    }),
                })],
                setup: (self) => self.hook(Mpris, () => {
                    const mpris = Mpris.getPlayer('');
                    if (!mpris) return;
                    self.toggleClassName('bar-music-playstate-playing', mpris.playBackStatus === 'Playing');
                    self.toggleClassName('bar-music-playstate', true);
                }),
            }),
            overlays: [TrackProgress()]
        })]
    });

    const trackTitle = Label({
        hexpand: true,
        className: 'txt-smallie bar-music-txt',
        truncate: 'end',
        maxWidthChars: 1,
        setup: (self) => self.hook(Mpris, () => {
            const mpris = Mpris.getPlayer('');
            self.label = mpris ? 
                `${trimTrackTitle(mpris.trackTitle)} • ${mpris.trackArtists.join(', ')}` :
                getString('No media');
        }),
    });

    const musicStuff = Box({
        className: 'spacing-h-10',
        hexpand: true,
        children: [playingState, trackTitle]
    });

    const SystemResourcesOrCustomModule = () => {
        if (GLib.file_test(CUSTOM_MODULE_CONTENT_SCRIPT, GLib.FileTest.EXISTS)) {
            const interval = Number(Utils.readFile(CUSTOM_MODULE_CONTENT_INTERVAL_FILE)) || 5000;
            return BarGroup({
                child: Button({
                    child: Label({
                        className: 'txt-smallie txt-onSurfaceVariant',
                        useMarkup: true,
                        setup: (self) => Utils.timeout(1, () => {
                            self.label = exec(CUSTOM_MODULE_CONTENT_SCRIPT);
                            self.poll(interval, () => {
                                self.label = exec(CUSTOM_MODULE_CONTENT_SCRIPT);
                            });
                        })
                    }),
                    onPrimaryClickRelease: () => execAsync(CUSTOM_MODULE_LEFTCLICK_SCRIPT).catch(print),
                    onSecondaryClickRelease: () => execAsync(CUSTOM_MODULE_RIGHTCLICK_SCRIPT).catch(print),
                    onMiddleClickRelease: () => execAsync(CUSTOM_MODULE_MIDDLECLICK_SCRIPT).catch(print),
                    onScrollUp: () => execAsync(CUSTOM_MODULE_SCROLLUP_SCRIPT).catch(print),
                    onScrollDown: () => execAsync(CUSTOM_MODULE_SCROLLDOWN_SCRIPT).catch(print),
                })
            });
        }

        return BarGroup({
            child: Box({
                children: [
                    BarResource(getString('RAM Usage'), 'memory', 
                        `LANG=C free | awk '/^Mem/ {printf("%.2f\\n", ($3/$2) * 100)}'`,
                        'bar-ram-circprog', 'bar-ram-txt', 'bar-ram-icon'),
                    Revealer({
                        revealChild: true,
                        transition: 'slide_left',
                        transitionDuration: userOptions.asyncGet().animations.durationLarge,
                        child: Box({
                            className: 'spacing-h-10 margin-left-10',
                            children: [
                                BarResource(getString('Swap Usage'), 'swap_horiz',
                                    `LANG=C free | awk '/^Swap/ {if ($2 > 0) printf("%.2f\\n", ($3/$2) * 100); else print "0";}'`,
                                    'bar-swap-circprog', 'bar-swap-txt', 'bar-swap-icon'),
                                BarResource(getString('CPU Usage'), 'settings_motion_mode',
                                    `LANG=C top -bn1 | grep Cpu | sed 's/\\,/\\./g' | awk '{print $2}'`,
                                    'bar-cpu-circprog', 'bar-cpu-txt', 'bar-cpu-icon'),
                            ]
                        }),
                        setup: (self) => self.hook(Mpris, () => {
                            self.revealChild = !Mpris.getPlayer('');
                        }),
                    })
                ],
            })
        });
    };

    return EventBox({
        onScrollUp: (self) => switchToRelativeWorkspace(self, -1),
        onScrollDown: (self) => switchToRelativeWorkspace(self, +1),
        child: Box({
            className: 'spacing-h-4',
            children: [
                SystemResourcesOrCustomModule(),
                EventBox({
                    child: BarGroup({ child: musicStuff }),
                    onPrimaryClick: () => showMusicControls.setValue(!showMusicControls.value),
                    onSecondaryClick: () => execAsync(['bash', '-c', 'playerctl next || playerctl position `bc <<< "100 * $(playerctl metadata mpris:length) / 1000000 / 100"` &']).catch(print),
                    onMiddleClick: () => execAsync('playerctl play-pause').catch(print),
                    setup: (self) => self.on('button-press-event', (_, event) => {
                        if (event.get_button()[1] === 8)
                            execAsync('playerctl previous').catch(print);
                    }),
                })
            ]
        })
    });
}
