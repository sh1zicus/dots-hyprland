import App from 'resource:///com/github/Aylur/ags/app.js';
import Audio from 'resource:///com/github/Aylur/ags/service/audio.js';
import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
import { MaterialIcon } from './materialicon.js';
import Bluetooth from 'resource:///com/github/Aylur/ags/service/bluetooth.js';
import Network from 'resource:///com/github/Aylur/ags/service/network.js';
import Notifications from 'resource:///com/github/Aylur/ags/service/notifications.js';
import { languages } from './statusicons_languages.js';
const { GLib } = imports.gi;
import { Variable } from 'resource:///com/github/Aylur/ags/variable.js';

// Define time formats
const timeFormat = '%H:%M';
const dateFormat = '%A, %d %B %Y';

const time = new Variable('', {
    poll: [1000,
        () => GLib.DateTime.new_now_local().format(timeFormat),
    ],
});

const date = new Variable('', {
    poll: [1000,
        () => GLib.DateTime.new_now_local().format(dateFormat),
    ],
});

// A guessing function to try to support languages not listed in data/languages.js
function isLanguageMatch(abbreviation, word) {
    const lowerAbbreviation = abbreviation.toLowerCase();
    const lowerWord = word.toLowerCase();
    let j = 0;
    for (let i = 0; i < lowerWord.length; i++) {
        if (lowerWord[i] === lowerAbbreviation[j]) {
            j++;
        }
        if (j === lowerAbbreviation.length) {
            return true;
        }
    }
    return false;
}

export const MicIndicator = () => Widget.Button({
    onClicked: () => {
        if (Audio.microphone)
            Audio.microphone.isMuted = !Audio.microphone.isMuted;
    },
    child: Widget.Box({
        children: [
            Widget.Stack({
                transition: 'slide_up_down',
                transitionDuration: userOptions.asyncGet().animations.durationSmall,
                children: {
                    'true': MaterialIcon('mic_off', 'norm'),
                    'false': MaterialIcon('mic', 'norm'),
                },
                setup: (self) => self.hook(Audio, (stack) => {
                    if (!Audio.microphone) return;
                    stack.shown = String(Audio.microphone.isMuted);
                }),
            }),
        ],
    }),
});

export const SpeakerIndicator = () => Widget.Button({
    onClicked: () => {
        if (Audio.speaker)
            Audio.speaker.isMuted = !Audio.speaker.isMuted;
    },
    child: Widget.Box({
        children: [
            Widget.Stack({
                transition: 'slide_up_down',
                transitionDuration: userOptions.asyncGet().animations.durationSmall,
                children: {
                    'true': MaterialIcon('volume_off', 'norm'),
                    'false': MaterialIcon('volume_up', 'norm'),
                },
                setup: (self) => self.hook(Audio, (stack) => {
                    if (!Audio.speaker) return;
                    stack.shown = String(Audio.speaker.isMuted);
                }),
            }),
        ],
    }),
});

export const NotificationIndicator = (notifCenterName = 'sideright') => {
    const widget = Widget.Revealer({
        transition: 'slide_left',
        transitionDuration: userOptions.asyncGet().animations.durationSmall,
        revealChild: false,
        setup: (self) => self
            .hook(Notifications, (self, id) => {
                if (!id || Notifications.dnd) return;
                if (!Notifications.getNotification(id)) return;
                self.revealChild = true;
            }, 'notified')
            .hook(App, (self, currentName, visible) => {
                if (visible && currentName === notifCenterName) {
                    self.revealChild = false;
                }
            })
        ,
        child: Widget.Box({
            children: [
                MaterialIcon('notifications', 'norm'),
                Widget.Label({
                    className: 'txt-small titlefont',
                    attribute: {
                        unreadCount: 0,
                        update: (self) => self.label = `${self.attribute.unreadCount}`,
                    },
                    setup: (self) => self
                        .hook(Notifications, (self, id) => {
                            if (!id || Notifications.dnd) return;
                            if (!Notifications.getNotification(id)) return;
                            self.attribute.unreadCount++;
                            self.attribute.update(self);
                        }, 'notified')
                        .hook(App, (self, currentName, visible) => {
                            if (visible && currentName === notifCenterName) {
                                self.attribute.unreadCount = 0;
                                self.attribute.update(self);
                            }
                        })
                    ,
                })
            ]
        })
    });
    return widget;
}

export const BluetoothIndicator = () => Widget.Stack({
    transition: 'slide_up_down',
    transitionDuration: userOptions.asyncGet().animations.durationSmall,
    children: {
        'false': Widget.Label({ className: 'txt-norm icon-material', label: 'bluetooth_disabled' }),
        'true': Widget.Label({ className: 'txt-norm icon-material', label: 'bluetooth' }),
    },
    setup: (self) => self
        .hook(Bluetooth, stack => {
            stack.shown = String(Bluetooth.enabled);
        })
    ,
});

const BluetoothDevices = () => Widget.Box({
    className: 'spacing-h-5',
    setup: self => self.hook(Bluetooth, self => {
        self.children = Bluetooth.connected_devices.map((device) => {
            return Widget.Box({
                className: 'bar-bluetooth-device spacing-h-5',
                vpack: 'center',
                tooltipText: device.name,
                children: [
                    Widget.Icon(`${device.iconName}-symbolic`),
                    ...(device.batteryPercentage ? [Widget.Label({
                        className: 'txt-smallie',
                        label: `${device.batteryPercentage}`,
                        setup: (self) => {
                            self.hook(device, (self) => {
                                self.label = `${device.batteryPercentage}`;
                            }, 'notify::batteryPercentage')
                        }
                    })] : []),
                ]
            });
        });
        self.visible = Bluetooth.connected_devices.length > 0;
    }, 'notify::connected-devices'),
})

const NetworkWiredIndicator = () => Widget.Stack({
    transition: 'slide_up_down',
    transitionDuration: userOptions.asyncGet().animations.durationSmall,
    children: {
        'fallback': SimpleNetworkIndicator(),
        'unknown': Widget.Label({ className: 'txt-norm icon-material', label: 'wifi_off' }),
        'disconnected': Widget.Label({ className: 'txt-norm icon-material', label: 'signal_wifi_off' }),
        'connected': Widget.Label({ className: 'txt-norm icon-material', label: 'lan' }),
        'connecting': Widget.Label({ className: 'txt-norm icon-material', label: 'settings_ethernet' }),
    },
    setup: (self) => self.hook(Network, stack => {
        if (!Network.wired)
            return;

        const { internet } = Network.wired;
        if (['connecting', 'connected'].includes(internet))
            stack.shown = internet;
        else if (Network.connectivity !== 'full')
            stack.shown = 'disconnected';
        else
            stack.shown = 'fallback';
    }),
});

const SimpleNetworkIndicator = () => Widget.Icon({
    setup: (self) => self.hook(Network, self => {
        const icon = Network[Network.primary || 'wifi']?.iconName;
        self.icon = icon || '';
        self.visible = icon;
    }),
});

const NetworkWifiIndicator = () => Widget.Stack({
    transition: 'slide_up_down',
    transitionDuration: userOptions.asyncGet().animations.durationSmall,
    children: {
        'disabled': Widget.Label({ className: 'txt-norm icon-material', label: 'wifi_off' }),
        'disconnected': Widget.Label({ className: 'txt-norm icon-material', label: 'signal_wifi_off' }),
        'connecting': Widget.Label({ className: 'txt-norm icon-material', label: 'settings_ethernet' }),
        '0': Widget.Label({ className: 'txt-norm icon-material', label: 'signal_wifi_0_bar' }),
        '1': Widget.Label({ className: 'txt-norm icon-material', label: 'network_wifi_1_bar' }),
        '2': Widget.Label({ className: 'txt-norm icon-material', label: 'network_wifi_2_bar' }),
        '3': Widget.Label({ className: 'txt-norm icon-material', label: 'network_wifi_3_bar' }),
        '4': Widget.Label({ className: 'txt-norm icon-material', label: 'signal_wifi_4_bar' }),
    },
    setup: (self) => self.hook(Network, (stack) => {
        if (!Network.wifi) {
            return;
        }
        if (Network.wifi.internet == 'connected') {
            stack.shown = String(Math.ceil(Network.wifi.strength / 25));
        }
        else if (["disconnected", "connecting"].includes(Network.wifi.internet)) {
            stack.shown = Network.wifi.internet;
        }
    }),
});

export const NetworkIndicator = () => Widget.Stack({
    transition: 'slide_up_down',
    transitionDuration: userOptions.asyncGet().animations.durationSmall,
    children: {
        'fallback': SimpleNetworkIndicator(),
        'wifi': NetworkWifiIndicator(),
        'wired': NetworkWiredIndicator(),
    },
    setup: (self) => self.hook(Network, stack => {
        if (!Network.primary) {
            stack.shown = 'wifi';
            return;
        }
        const primary = Network.primary || 'fallback';
        if (['wifi', 'wired'].includes(primary))
            stack.shown = primary;
        else
            stack.shown = 'fallback';
    }),
});

const HyprlandXkbKeyboardLayout = async ({ useFlag } = {}) => {
    try {
        const Hyprland = (await import('resource:///com/github/Aylur/ags/service/hyprland.js')).default;
        var languageStackArray = [];

        const updateCurrentKeyboards = () => {
            var initLangs = [];
            JSON.parse(Utils.exec('hyprctl -j devices')).keyboards
                .forEach(keyboard => {
                    initLangs.push(...keyboard.layout.split(',').map(lang => lang.trim()));
                });
            initLangs = [...new Set(initLangs)];
            languageStackArray = Array.from({ length: initLangs.length }, (_, i) => {
                const lang = languages.find(lang => lang.layout == initLangs[i]);
                if (!lang) return {
                    [initLangs[i]]: Widget.Label({ label: initLangs[i].toUpperCase() })
                };
                return {
                    [lang.layout]: Widget.Label({ label: (useFlag ? lang.flag : lang.layout.toUpperCase()) })
                };
            });
        };
        updateCurrentKeyboards();
        const widgetRevealer = Widget.Revealer({
            transition: 'slide_left',
            transitionDuration: userOptions.asyncGet().animations.durationSmall,
            revealChild: languageStackArray.length > 1,
        });
        const widgetKids = {
            ...languageStackArray.reduce((obj, lang) => {
                return { ...obj, ...lang };
            }, {}),
            'undef': Widget.Label({ label: '?' }),
        }
        const widgetContent = Widget.Stack({
            transition: 'slide_up_down',
            transitionDuration: userOptions.asyncGet().animations.durationSmall,
            children: widgetKids,
            setup: (self) => self.hook(Hyprland, (stack, kbName, layoutName) => {
                if (!kbName) {
                    return;
                }
                var lang = languages.find(lang => layoutName.includes(lang.name));
                if (lang) {
                    widgetContent.shown = lang.layout;
                }
                else { // Attempt to support langs not listed
                    lang = languageStackArray.find(lang => isLanguageMatch(lang[0], layoutName));
                    if (!lang) stack.shown = 'undef';
                    else stack.shown = lang[0];
                }
            }, 'keyboard-layout'),
        });
        widgetRevealer.child = widgetContent;
        return widgetRevealer;
    } catch {
        return null;
    }
}

const OptionalKeyboardLayout = async () => {
    try {
        return await HyprlandXkbKeyboardLayout({ useFlag: userOptions.asyncGet().appearance.keyboardUseFlag });
    } catch {
        return null;
    }
};
const createKeyboardLayoutInstances = async () => {
    const Hyprland = (await import('resource:///com/github/Aylur/ags/service/hyprland.js')).default;
    const monitorsCount = Hyprland.monitors.length
    const instances = await Promise.all(
        Array.from({ length: monitorsCount }, () => OptionalKeyboardLayout())
    );

    return instances;
};
const optionalKeyboardLayoutInstances = await createKeyboardLayoutInstances()

const BarClock = () => Widget.Box({
    vpack: 'center',
    className: 'spacing-h-4 bar-clock-box',
    children: [
        Widget.Label({
            className: 'bar-time',
            label: time.bind(),
            tooltipText: date.bind(),
        }),
    ],
});

const VPNIndicator = () => Widget.Revealer({
    child: MaterialIcon('key', 'norm'),
    transition: 'slide_left',
    revealChild: false,
    transitionDuration: userOptions.asyncGet().animations.durationSmall,
    setup: (self) => self.hook(Network.vpn, (self) => {
        self.revealChild = (Network.vpn.activatedConnections.length > 0);
    })
})

export const StatusIcons = (props = {}, monitor = 0) => Widget.Box({
    ...props,
    child: Widget.Box({
        className: 'spacing-h-15',
        children: [
            Widget.Box({
                className: 'spacing-h-10 status-icons-group',
                children: [
                    optionalKeyboardLayoutInstances[monitor],
                    MicIndicator(),
                    SpeakerIndicator(),
                    NetworkIndicator(),
                    BluetoothIndicator(),
                    NotificationIndicator(),
                    VPNIndicator(),
                    Widget.Box({
                        className: 'time-with-margin',
                        child: Widget.Label({
                            className: 'bar-time txt-smallie',
                            label: time.bind(),
                            tooltipText: date.bind(),
                        }),
                    }),
                ]
            }),
            BluetoothDevices(),
        ]
    })
});
