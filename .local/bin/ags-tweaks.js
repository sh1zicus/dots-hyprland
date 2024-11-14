#!/usr/bin/gjs

imports.gi.versions.Gtk = '4.0';
const { GObject, Gtk, Gio, GLib } = imports.gi;

const CONFIG_FILE = GLib.build_filenamev([GLib.get_home_dir(), '.ags/config.json']);

let app = new Gtk.Application({
    application_id: 'org.gnome.AGSTweaks'
});

function loadConfig() {
    try {
        let [success, contents] = GLib.file_get_contents(CONFIG_FILE);
        return JSON.parse(new TextDecoder().decode(contents));
    } catch(e) {
        print('Error loading config:', e);
        return null;
    }
}

function saveConfig(newValues) {
    try {
        let currentConfig = loadConfig();
        if (!currentConfig) return;

        // Обновляем только измененные секции
        currentConfig.appearance.layerSmoke = newValues.appearance.layerSmoke;
        currentConfig.appearance.layerSmokeStrength = newValues.appearance.layerSmokeStrength;
        currentConfig.appearance.barRoundCorners = newValues.appearance.barRoundCorners;
        currentConfig.appearance.fakeScreenRounding = newValues.appearance.fakeScreenRounding;
        
        currentConfig.animations.durationSmall = newValues.animations.durationSmall;
        currentConfig.animations.durationLarge = newValues.animations.durationLarge;
        
        currentConfig.overview.scale = newValues.overview.scale;
        currentConfig.overview.numOfRows = newValues.overview.numOfRows;
        currentConfig.overview.numOfCols = newValues.overview.numOfCols;
        
        currentConfig.dock.enabled = newValues.dock.enabled;
        currentConfig.dock.hiddenThickness = newValues.dock.hiddenThickness;

        print('Saving config:', JSON.stringify(currentConfig, null, 2));
        
        // Сохраняем конфиг
        let contents = JSON.stringify(currentConfig, null, 2);
        let success = GLib.file_set_contents(CONFIG_FILE, contents);
        
        if (!success) {
            print('Failed to save config');
            return;
        }

        print('Config saved, restarting AGS...');
        
        // Перезапускаем AGS
        GLib.spawn_command_line_async('bash -c "ags -q && sleep 1 && ags"');
    } catch (e) {
        print('Error saving config:', e);
    }
}

app.connect('activate', () => {
    let config = loadConfig();
    if (!config) return;

    let win = new Gtk.ApplicationWindow({
        application: app,
        title: 'AGS Configuration',
        default_width: 400,
        default_height: 600
    });

    let mainBox = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 10,
        margin_start: 10,
        margin_end: 10,
        margin_top: 10,
        margin_bottom: 10
    });

    // Appearance
    let appearanceFrame = new Gtk.Frame({ label: 'Appearance' });
    let appearanceBox = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 5,
        margin_start: 10,
        margin_end: 10,
        margin_top: 10,
        margin_bottom: 10
    });

    // Layer Smoke
    let smokeSwitch = new Gtk.Switch({
        active: config.appearance.layerSmoke,
        valign: Gtk.Align.CENTER
    });
    appearanceBox.append(createSettingRow('Layer Smoke', smokeSwitch));

    // Smoke Strength
    let smokeStrength = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            value: config.appearance.layerSmokeStrength,
            lower: 0,
            upper: 1,
            step_increment: 0.1
        }),
        digits: 1,
        value: config.appearance.layerSmokeStrength,
        valign: Gtk.Align.CENTER
    });
    appearanceBox.append(createSettingRow('Smoke Strength', smokeStrength));

    // Bar Round Corners
    let barCorners = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            value: config.appearance.barRoundCorners,
            lower: 0,
            upper: 30,
            step_increment: 1
        }),
        value: config.appearance.barRoundCorners,
        valign: Gtk.Align.CENTER
    });
    appearanceBox.append(createSettingRow('Bar Round Corners', barCorners));

    // Screen Rounding
    let screenRounding = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            value: config.appearance.fakeScreenRounding,
            lower: 0,
            upper: 30,
            step_increment: 1
        }),
        value: config.appearance.fakeScreenRounding,
        valign: Gtk.Align.CENTER
    });
    appearanceBox.append(createSettingRow('Screen Rounding', screenRounding));

    appearanceFrame.set_child(appearanceBox);
    mainBox.append(appearanceFrame);

    // Animations
    let animationsFrame = new Gtk.Frame({ label: 'Animations' });
    let animationsBox = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 5,
        margin_start: 10,
        margin_end: 10,
        margin_top: 10,
        margin_bottom: 10
    });

    // Small Duration
    let smallDuration = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            value: config.animations.durationSmall,
            lower: 0,
            upper: 1000,
            step_increment: 10
        }),
        value: config.animations.durationSmall,
        valign: Gtk.Align.CENTER
    });
    animationsBox.append(createSettingRow('Small Duration', smallDuration));

    // Large Duration
    let largeDuration = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            value: config.animations.durationLarge,
            lower: 0,
            upper: 1000,
            step_increment: 10
        }),
        value: config.animations.durationLarge,
        valign: Gtk.Align.CENTER
    });
    animationsBox.append(createSettingRow('Large Duration', largeDuration));

    animationsFrame.set_child(animationsBox);
    mainBox.append(animationsFrame);

    // Overview
    let overviewFrame = new Gtk.Frame({ label: 'Overview' });
    let overviewBox = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 5,
        margin_start: 10,
        margin_end: 10,
        margin_top: 10,
        margin_bottom: 10
    });

    // Scale
    let scale = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            value: config.overview.scale,
            lower: 0,
            upper: 1,
            step_increment: 0.01
        }),
        digits: 2,
        value: config.overview.scale,
        valign: Gtk.Align.CENTER
    });
    overviewBox.append(createSettingRow('Scale', scale));

    // Rows
    let rows = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            value: config.overview.numOfRows,
            lower: 1,
            upper: 10,
            step_increment: 1
        }),
        value: config.overview.numOfRows,
        valign: Gtk.Align.CENTER
    });
    overviewBox.append(createSettingRow('Rows', rows));

    // Columns
    let cols = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            value: config.overview.numOfCols,
            lower: 1,
            upper: 10,
            step_increment: 1
        }),
        value: config.overview.numOfCols,
        valign: Gtk.Align.CENTER
    });
    overviewBox.append(createSettingRow('Columns', cols));

    overviewFrame.set_child(overviewBox);
    mainBox.append(overviewFrame);

    // Dock
    let dockFrame = new Gtk.Frame({ label: 'Dock' });
    let dockBox = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 5,
        margin_start: 10,
        margin_end: 10,
        margin_top: 10,
        margin_bottom: 10
    });

    // Dock Enabled
    let dockEnabled = new Gtk.Switch({
        active: config.dock.enabled,
        valign: Gtk.Align.CENTER
    });
    dockBox.append(createSettingRow('Dock Enabled', dockEnabled));

    // Hidden Thickness
    let hiddenThickness = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            value: config.dock.hiddenThickness,
            lower: 0,
            upper: 100,
            step_increment: 1
        }),
        value: config.dock.hiddenThickness,
        valign: Gtk.Align.CENTER
    });
    dockBox.append(createSettingRow('Hidden Thickness', hiddenThickness));

    dockFrame.set_child(dockBox);
    mainBox.append(dockFrame);

    // Save Button
    let saveButton = new Gtk.Button({
        label: 'Save & Restart AGS',
        halign: Gtk.Align.END,
        margin_top: 10
    });

    saveButton.connect('clicked', () => {
        let newValues = {
            appearance: {
                layerSmoke: smokeSwitch.get_active(),
                layerSmokeStrength: smokeStrength.get_value(),
                barRoundCorners: barCorners.get_value(),
                fakeScreenRounding: screenRounding.get_value()
            },
            animations: {
                durationSmall: smallDuration.get_value(),
                durationLarge: largeDuration.get_value()
            },
            overview: {
                scale: scale.get_value(),
                numOfRows: rows.get_value(),
                numOfCols: cols.get_value()
            },
            dock: {
                enabled: dockEnabled.get_active(),
                hiddenThickness: hiddenThickness.get_value()
            }
        };

        print('Saving values:', JSON.stringify(newValues, null, 2));
        saveConfig(newValues);
        win.close();
    });

    mainBox.append(saveButton);

    let scroll = new Gtk.ScrolledWindow({
        child: mainBox,
        vexpand: true
    });

    win.set_child(scroll);
    win.present();
});

function createSettingRow(label, widget) {
    let box = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        spacing: 10
    });
    
    box.append(new Gtk.Label({
        label: label,
        halign: Gtk.Align.START,
        hexpand: true
    }));
    box.append(widget);
    
    return box;
}

app.run([]); 