import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
const { execAsync, exec } = Utils;
const { Box, EventBox, Label } = Widget;
import {
    ToggleIconBluetooth,
    ToggleIconWifi,
    HyprToggleIcon,
    ModuleNightLight,
    ModuleInvertColors,
    ModuleIdleInhibitor,
    ModuleReloadIcon,
    ModuleSettingsIcon,
    ModulePowerIcon,
    ModuleRawInput,
    ModuleCloudflareWarp
} from "./quicktoggles.js";
import ModuleNotificationList from "./centermodules/notificationlist.js";
import ModuleAudioControls from "./centermodules/audiocontrols.js";
import ModuleWifiNetworks from "./centermodules/wifinetworks.js";
import ModulePowerProfiles from './centermodules/powerprofiles.js';
import ModuleBluetooth from "./centermodules/bluetooth.js";
import ModuleConfigure from "./centermodules/configure.js";
import { ModuleCalendar } from "./calendar.js";
import { getDistroIcon } from '../.miscutils/system.js';
import { MaterialIcon } from '../.commonwidgets/materialicon.js';
import { ExpandingIconTabContainer } from '../.commonwidgets/tabcontainer.js';
import { checkKeybind } from '../.widgetutils/keybind.js';
import { WWO_CODE, WEATHER_SYMBOL } from '../.commondata/weather.js';
import GLib from 'gi://GLib';

const centerWidgets = [
    {
        name: getString('Notifications'),
        materialIcon: 'notifications',
        contentWidget: ModuleNotificationList,
    },
    {
        name: getString('Audio controls'),
        materialIcon: 'volume_up',
        contentWidget: ModuleAudioControls,
    },
    {
        name: 'Power Profiles',
        materialIcon: 'speed',
        contentWidget: ModulePowerProfiles,
    },
    {
        name: getString('Bluetooth'),
        materialIcon: 'bluetooth',
        contentWidget: ModuleBluetooth,
    },
    {
        name: getString('Wifi networks'),
        materialIcon: 'wifi',
        contentWidget: ModuleWifiNetworks,
        onFocus: () => execAsync('nmcli dev wifi list').catch(print),
    },
    {
        name: getString('Live config'),
        materialIcon: 'tune',
        contentWidget: ModuleConfigure,
    },
];

const timeRow = Box({
    className: 'spacing-h-10 sidebar-group-invisible-morehorizpad',
    children: [
        Widget.Icon({
            icon: getDistroIcon(),
            className: 'txt txt-larger',
        }),
        Widget.Label({
            hpack: 'center',
            className: 'txt-small txt',
            setup: (self) => {
                const getUptime = async () => {
                    try {
                        await execAsync(['bash', '-c', 'uptime -p']);
                        return execAsync(['bash', '-c', `uptime -p | sed -e 's/...//;s/ day\\| days/d/;s/ hour\\| hours/h/;s/ minute\\| minutes/m/;s/,[^,]*//2'`]);
                    } catch {
                        return execAsync(['bash', '-c', 'uptime']).then(output => {
                            const uptimeRegex = /up\s+((\d+)\s+days?,\s+)?((\d+):(\d+)),/;
                            const matches = uptimeRegex.exec(output);

                            if (matches) {
                                const days = matches[2] ? parseInt(matches[2]) : 0;
                                const hours = matches[4] ? parseInt(matches[4]) : 0;
                                const minutes = matches[5] ? parseInt(matches[5]) : 0;

                                let formattedUptime = '';

                                if (days > 0) {
                                    formattedUptime += `${days} d `;
                                }
                                if (hours > 0) {
                                    formattedUptime += `${hours} h `;
                                }
                                formattedUptime += `${minutes} m`;

                                return formattedUptime;
                            } else {
                                throw new Error('Failed to parse uptime output');
                            }
                        });
                    }
                };

                self.poll(5000, label => {
                    getUptime().then(upTimeString => {
                        label.label = `${getString("Uptime:"
                        )} ${upTimeString}`;
                    }).catch(err => {
                        console.error(`Failed to fetch uptime: ${err}`);
                    });
                });
            },
        }),
        Widget.Box({ hexpand: true }),
        ModuleReloadIcon({ hpack: 'end' }),
        // ModuleSettingsIcon({ hpack: 'end' }), // Button does work, gnome-control-center is kinda broken
        ModulePowerIcon({ hpack: 'end' }),
    ]
});

const togglesBox = Widget.Box({
    hpack: 'center',
    className: 'sidebar-togglesbox spacing-h-5',
    children: [
        ToggleIconWifi(),
        ToggleIconBluetooth(),
        // await ModuleRawInput(),
        // await HyprToggleIcon('touchpad_mouse', 'No touchpad while typing', 'input:touchpad:disable_while_typing', {}),
        await ModuleNightLight(),
        await ModuleInvertColors(),
        ModuleIdleInhibitor(),
        await ModuleCloudflareWarp(),
    ]
})

export const sidebarOptionsStack = ExpandingIconTabContainer({
    tabsHpack: 'center',
    tabSwitcherClassName: 'sidebar-icontabswitcher',
    icons: centerWidgets.map((api) => api.materialIcon),
    names: centerWidgets.map((api) => api.name),
    children: centerWidgets.map((api) => api.contentWidget()),
    onChange: (self, id) => {
        self.shown = centerWidgets[id].name;
        if (centerWidgets[id].onFocus) centerWidgets[id].onFocus();
    }
});

const WeatherWidget = () => Box({
    hexpand: true,
    hpack: 'center',
    className: 'spacing-h-4 txt-onSurfaceVariant',
    children: [
        MaterialIcon('device_thermostat', 'small'),
        Label({
            label: 'Weather',
        })
    ],
    setup: (self) => self.poll(900000, async (self) => {
        const options = userOptions.asyncGet();
        const WEATHER_CACHE_FOLDER = `${GLib.get_user_cache_dir()}/ags/weather`;
        const WEATHER_CACHE_PATH = WEATHER_CACHE_FOLDER + '/wttr.in.txt';
        Utils.exec(`mkdir -p ${WEATHER_CACHE_FOLDER}`);
        
        const updateWeatherForCity = (city) => execAsync(`curl https://wttr.in/${city.replace(/ /g, '%20')}?format=j1`)
            .then(output => {
                const weather = JSON.parse(output);
                Utils.writeFile(JSON.stringify(weather), WEATHER_CACHE_PATH)
                    .catch(print);
                const weatherCode = weather.current_condition[0].weatherCode;
                const weatherDesc = weather.current_condition[0].weatherDesc[0].value;
                const temperature = weather.current_condition[0][`temp_${options.weather.preferredUnit}`];
                const weatherSymbol = WEATHER_SYMBOL[WWO_CODE[weatherCode]];
                self.children[0].label = weatherSymbol;
                self.children[1].label = `${temperature}°${options.weather.preferredUnit}`;
                self.tooltipText = weatherDesc;
            }).catch((err) => {
                try {
                    const weather = JSON.parse(Utils.readFile(WEATHER_CACHE_PATH));
                    const weatherCode = weather.current_condition[0].weatherCode;
                    const weatherDesc = weather.current_condition[0].weatherDesc[0].value;
                    const temperature = weather.current_condition[0][`temp_${options.weather.preferredUnit}`];
                    const weatherSymbol = WEATHER_SYMBOL[WWO_CODE[weatherCode]];
                    self.children[0].label = weatherSymbol;
                    self.children[1].label = `${temperature}°${options.weather.preferredUnit}`;
                    self.tooltipText = weatherDesc;
                } catch (err) {
                    print(err);
                }
            });
        if (options.weather.city != '' && options.weather.city != null) {
            updateWeatherForCity(options.weather.city.replace(/ /g, '%20'));
        }
        else {
            Utils.execAsync('curl ipinfo.io')
                .then(output => {
                    return JSON.parse(output)['city'].toLowerCase();
                })
                .then(updateWeatherForCity)
                .catch(print)
        }
    }),
});

export default () => Box({
    vexpand: true,
    hexpand: true,
    css: 'min-width: 2px;',
    children: [
        EventBox({
            onPrimaryClick: () => App.closeWindow('sideright'),
            onSecondaryClick: () => App.closeWindow('sideright'),
            onMiddleClick: () => App.closeWindow('sideright'),
        }),
        Box({
            vertical: true,
            vexpand: true,
            className: 'sidebar-right spacing-v-15',
            children: [
                Box({
                    vertical: true,
                    className: 'spacing-v-5',
                    children: [
                        timeRow,
                        togglesBox,
                    ]
                }),
                Box({
                    className: 'sidebar-group',
                    children: [
                        sidebarOptionsStack,
                    ],
                }),
                ModuleCalendar(),
                WeatherWidget(),
            ]
        }),
    ],
    setup: (self) => self
        .on('key-press-event', (widget, event) => { // Handle keybinds
            if (checkKeybind(event, userOptions.asyncGet().keybinds.sidebar.options.nextTab)) {
                sidebarOptionsStack.nextTab();
            }
            else if (checkKeybind(event, userOptions.asyncGet().keybinds.sidebar.options.prevTab)) {
                sidebarOptionsStack.prevTab();
            }
        })
    ,
});
