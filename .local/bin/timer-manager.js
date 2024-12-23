#!/usr/bin/env gjs

imports.gi.versions.Gtk = '4.0';
imports.gi.versions.Adw = '1';

const { Gtk, Adw, GLib, Gio } = imports.gi;

const app = new Adw.Application({
    application_id: 'com.github.timer-manager'
});

let activeTimers = [];
let mainWindow = null;

// Простой интерфейс для StatusNotifierItem
const SNI_INTERFACE = `
<node>
  <interface name="org.kde.StatusNotifierItem">
    <property name="Category" type="s" access="read"/>
    <property name="Id" type="s" access="read"/>
    <property name="Title" type="s" access="read"/>
    <property name="Status" type="s" access="read"/>
    <property name="IconName" type="s" access="read"/>
    <property name="Menu" type="o" access="read"/>
    <method name="Activate">
      <arg direction="in" type="i" name="x"/>
      <arg direction="in" type="i" name="y"/>
    </method>
    <method name="ContextMenu">
      <arg direction="in" type="i" name="x"/>
      <arg direction="in" type="i" name="y"/>
    </method>
  </interface>
</node>`;

const DBUSMENU_INTERFACE = `
<node>
  <interface name="com.canonical.dbusmenu">
    <method name="GetLayout">
      <arg type="i" direction="in" name="parentId"/>
      <arg type="i" direction="in" name="recursionDepth"/>
      <arg type="as" direction="in" name="propertyNames"/>
      <arg type="u" direction="out" name="revision"/>
      <arg type="(ia{sv}av)" direction="out" name="layout"/>
    </method>
    <method name="Event">
      <arg type="i" direction="in" name="id"/>
      <arg type="s" direction="in" name="eventId"/>
      <arg type="v" direction="in" name="data"/>
      <arg type="u" direction="in" name="timestamp"/>
    </method>
  </interface>
</node>`;

function createTrayIcon() {
    const nodeInfo = Gio.DBusNodeInfo.new_for_xml(SNI_INTERFACE);
    const menuInfo = Gio.DBusNodeInfo.new_for_xml(DBUSMENU_INTERFACE);
    
    // Создаем объект меню
    const menuObject = Gio.DBusExportedObject.wrapJSObject(menuInfo.interfaces[0], {
        GetLayout: (parentId, recursionDepth, propertyNames) => {
            const layout = {
                id: 0,
                properties: {
                    'type': 'standard'
                },
                children: [
                    {
                        id: 1,
                        properties: {
                            'label': 'Show Window',
                            'enabled': GLib.Variant.new_boolean(true)
                        }
                    },
                    {
                        id: 2,
                        properties: {
                            'label': 'Stop All Timers',
                            'enabled': GLib.Variant.new_boolean(true)
                        }
                    },
                    {
                        id: 3,
                        properties: {
                            'type': 'separator'
                        }
                    },
                    {
                        id: 4,
                        properties: {
                            'label': 'Quit',
                            'enabled': GLib.Variant.new_boolean(true)
                        }
                    }
                ]
            };
            return [0, layout];
        },

        Event: (id, eventId, data, timestamp) => {
            if (eventId !== 'clicked') return;

            switch (id) {
                case 1: // Show Window
                    GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                        if (mainWindow) {
                            mainWindow.present();
                        } else {
                            createWindow();
                        }
                        return GLib.SOURCE_REMOVE;
                    });
                    break;
                case 2: // Stop All Timers
                    activeTimers.forEach(timer => timer.stop());
                    break;
                case 4: // Quit
                    activeTimers.forEach(timer => timer.stop());
                    app.quit();
                    break;
            }
        }
    });

    menuObject.export(Gio.DBus.session, '/MenuBar');

    const sniObject = Gio.DBusExportedObject.wrapJSObject(nodeInfo.interfaces[0], {
        Category: 'ApplicationStatus',
        Id: 'timer-manager',
        Title: 'Timer Manager',
        Status: 'Active',
        IconName: 'alarm-symbolic',
        Menu: '/MenuBar',
        
        Activate: (x, y) => {
            GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                if (mainWindow) {
                    if (mainWindow.visible) {
                        mainWindow.hide();
                    } else {
                        mainWindow.present();
                    }
                } else {
                    createWindow();
                }
                return GLib.SOURCE_REMOVE;
            });
        },

        ContextMenu: (x, y) => {
            // При правом клике показываем меню
            // Меню должно показаться автоматически благодаря DBus
        }
    });

    try {
        sniObject.export(Gio.DBus.session, '/StatusNotifierItem');

        // Регистрируем в StatusNotifierWatcher
        const connection = Gio.DBus.session;
        connection.call(
            'org.kde.StatusNotifierWatcher',
            '/StatusNotifierWatcher',
            'org.kde.StatusNotifierWatcher',
            'RegisterStatusNotifierItem',
            new GLib.Variant('(s)', ['/StatusNotifierItem']),
            null,
            Gio.DBusCallFlags.NONE,
            -1,
            null,
            null
        );

        return [sniObject, menuObject];
    } catch (error) {
        print(`Failed to create tray icon: ${error.message}`);
        return null;
    }
}

// Создаем уведомление с действиями
function createNotification() {
    const notification = new Gio.Notification();
    notification.set_title('Timer Manager');
    notification.set_body('Application is running in background');
    notification.set_icon(new Gio.ThemedIcon({ name: 'alarm-symbolic' }));
    notification.add_button('Show', 'app.show');
    notification.add_button('Quit', 'app.quit');
    notification.set_priority(Gio.NotificationPriority.LOW);
    app.send_notification('timer-manager-running', notification);
}

class Timer {
    constructor(name, minutes) {
        this.name = name;
        this.minutes = minutes;
        this.remainingSeconds = minutes * 60;
        this.isRunning = false;
        this.sourceId = null;
    }

    start(onTick, onComplete) {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.sourceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
            if (this.remainingSeconds <= 0) {
                this.stop();
                onComplete();
                return GLib.SOURCE_REMOVE;
            }
            
            this.remainingSeconds--;
            onTick(this.remainingSeconds);
            return GLib.SOURCE_CONTINUE;
        });
    }

    stop() {
        if (!this.isRunning) return;
        
        if (this.sourceId) {
            GLib.source_remove(this.sourceId);
            this.sourceId = null;
        }
        this.isRunning = false;
    }
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function playSound() {
    const soundCommands = [
        'canberra-gtk-play -i complete',
        'canberra-gtk-play -i bell',
        'paplay /usr/share/sounds/freedesktop/stereo/complete.oga',
        'paplay /usr/share/sounds/freedesktop/stereo/bell.oga',
        'play /usr/share/sounds/freedesktop/stereo/complete.oga',
    ];

    for (const cmd of soundCommands) {
        try {
            GLib.spawn_command_line_async(cmd);
            return;
        } catch (error) {
            continue;
        }
    }
}

function createWindow() {
    if (mainWindow) {
        mainWindow.present();
        return;
    }

    mainWindow = new Adw.ApplicationWindow({
        application: app,
        title: 'Timer Manager',
        default_width: 350,
        default_height: 400,
        resizable: false
    });

    const headerBar = new Adw.HeaderBar({
        css_classes: ['flat']
    });

    const mainBox = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 10,
        margin_top: 10,
        margin_bottom: 10,
        margin_start: 10,
        margin_end: 10,
    });

    // Preset buttons
    const presetBox = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        spacing: 5,
        homogeneous: true,
    });

    const presets = [
        { name: '5m', minutes: 5 },
        { name: '10m', minutes: 10 },
        { name: '15m', minutes: 15 },
        { name: '30m', minutes: 30 }
    ];

    presets.forEach(preset => {
        const presetButton = new Gtk.Button({
            label: preset.name,
            css_classes: ['accent'],
        });
        presetButton.connect('clicked', () => {
            timeSpinButton.value = preset.minutes;
        });
        presetBox.append(presetButton);
    });

    // Input area
    const inputBox = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        spacing: 10,
    });

    const nameEntry = new Gtk.Entry({
        placeholder_text: 'Timer Name',
        hexpand: true,
    });

    const timeSpinButton = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 1,
            upper: 1440,
            step_increment: 1,
        }),
        value: 5,
        width_request: 80,
    });

    const addButton = new Gtk.Button({
        icon_name: 'list-add-symbolic',
        css_classes: ['suggested-action', 'circular'],
    });

    // Timer list
    const listBox = new Gtk.ListBox({
        selection_mode: Gtk.SelectionMode.NONE,
        css_classes: ['boxed-list'],
    });

    const scrolled = new Gtk.ScrolledWindow({
        vexpand: true,
        css_classes: ['card'],
    });
    scrolled.set_child(listBox);

    addButton.connect('clicked', () => {
        const name = nameEntry.text || 'Timer';
        const minutes = timeSpinButton.value;
        const timer = new Timer(name, minutes);
        activeTimers.push(timer);

        const row = new Gtk.ListBoxRow();
        const box = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 10,
            margin_top: 5,
            margin_bottom: 5,
            margin_start: 10,
            margin_end: 10,
        });

        const label = new Gtk.Label({
            label: name,
            hexpand: true,
            xalign: 0,
            css_classes: ['heading'],
        });

        const timeLabel = new Gtk.Label({
            label: formatTime(timer.remainingSeconds),
            css_classes: ['numeric'],
        });

        const startButton = new Gtk.Button({
            icon_name: 'media-playback-start-symbolic',
            css_classes: ['suggested-action', 'circular'],
        });

        const deleteButton = new Gtk.Button({
            icon_name: 'user-trash-symbolic',
            css_classes: ['destructive-action', 'circular'],
        });

        startButton.connect('clicked', () => {
            if (timer.isRunning) {
                timer.stop();
                startButton.icon_name = 'media-playback-start-symbolic';
                startButton.remove_css_class('destructive-action');
                startButton.add_css_class('suggested-action');
            } else {
                timer.start(
                    (remaining) => {
                        timeLabel.label = formatTime(remaining);
                    },
                    () => {
                        startButton.icon_name = 'media-playback-start-symbolic';
                        startButton.remove_css_class('destructive-action');
                        startButton.add_css_class('suggested-action');
                        playSound();
                        GLib.spawn_command_line_async(
                            'notify-send "Timer Manager" "Application minimized. Run timer-manager.js to restore." -i alarm-symbolic'
                        );
                    }
                );
                startButton.icon_name = 'media-playback-stop-symbolic';
                startButton.remove_css_class('suggested-action');
                startButton.add_css_class('destructive-action');
            }
        });

        deleteButton.connect('clicked', () => {
            timer.stop();
            listBox.remove(row);
            activeTimers = activeTimers.filter(t => t !== timer);
        });

        box.append(label);
        box.append(timeLabel);
        box.append(startButton);
        box.append(deleteButton);
        row.set_child(box);
        listBox.append(row);

        nameEntry.text = '';
        timeSpinButton.value = 5;
    });

    inputBox.append(nameEntry);
    inputBox.append(timeSpinButton);
    inputBox.append(addButton);

    mainBox.append(headerBar);
    mainBox.append(presetBox);
    mainBox.append(inputBox);
    mainBox.append(scrolled);

    mainWindow.set_content(mainBox);

    // Добавляем обработчик закрытия окна
    mainWindow.connect('close-request', () => {
        if (activeTimers.some(t => t.isRunning)) {
            mainWindow.hide();
            createNotification();
            return true;
        }
        mainWindow = null;
        return false;
    });

    mainWindow.present();
}

// Добавляем функцию для остановки всех таймеров
function stopAllTimers() {
    activeTimers.forEach(timer => timer.stop());
}

let trayIcon = null;

app.connect('activate', () => {
    if (!trayIcon) {
        trayIcon = createTrayIcon();
    }
    createWindow();
});

app.run([]); 