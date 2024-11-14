#!/usr/bin/gjs
imports.gi.versions.Gtk = '4.0';
const { GObject, Gtk, Gio, GLib } = imports.gi;

const CONFIG_FILE = GLib.build_filenamev([GLib.get_home_dir(), '.ags/config.json']);

// Вспомогательные функции
const createWidget = (type, props = {}) => Object.assign(new type(), props);

const createSpinButton = (value, min, max, step, digits = 0) => createWidget(Gtk.SpinButton, {
    adjustment: new Gtk.Adjustment({ value: value || 0, lower: min, upper: max, step_increment: step }),
    digits: digits,
    valign: Gtk.Align.CENTER,
    value: value || 0
});

const createSettingRow = (label, widget) => {
    const box = createWidget(Gtk.Box, {
        orientation: Gtk.Orientation.HORIZONTAL,
        spacing: 10
    });
    
    box.append(createWidget(Gtk.Label, {
        label: label,
        halign: Gtk.Align.START,
        hexpand: true
    }));
    box.append(widget);
    
    return box;
};

const createPage = (widgets = []) => {
    const box = createWidget(Gtk.Box, {
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 10,
        margin_start: 10,
        margin_end: 10,
        margin_top: 10,
        margin_bottom: 10
    });
    widgets.forEach(w => box.append(w));
    return box;
};

// Работа с конфигом
const loadConfig = () => {
    try {
        const [success, contents] = GLib.file_get_contents(CONFIG_FILE);
        const config = JSON.parse(new TextDecoder().decode(contents));
        print('Loading config from:', CONFIG_FILE);
        return config;
    } catch(e) {
        print('Error loading config:', e);
        return null;
    }
};

const saveConfig = (newValues) => {
    try {
        const currentConfig = loadConfig();
        if (!currentConfig) return;

        const mergeDeep = (target, source) => {
            for (const key in source) {
                target[key] = source[key] instanceof Object && !Array.isArray(source[key])
                    ? mergeDeep(Object.assign({}, target[key] || {}), source[key])
                    : source[key];
            }
            return target;
        };

        const updatedConfig = mergeDeep(Object.assign({}, currentConfig), newValues);
        const contents = JSON.stringify(updatedConfig, null, 2);
        
        if (!GLib.file_set_contents(CONFIG_FILE, contents)) {
            throw new Error('Failed to save config');
        }

        GLib.spawn_command_line_async('bash -c "killall -9 ags; sleep 2; /usr/bin/ags --replace"');
        GLib.spawn_command_line_async('notify-send "AGS Configuration" "Settings saved and applied"');
    } catch (e) {
        print('Error saving config:', e);
        GLib.spawn_command_line_async('notify-send "AGS Configuration" "Error saving settings"');
    }
};

// Основное приложение
const app = new Gtk.Application({ application_id: 'org.gnome.AGSTweaks' });

app.connect('activate', () => {
    const config = loadConfig();
    if (!config) return;

    const win = createWidget(Gtk.ApplicationWindow, {
        application: app,
        title: 'AGS Configuration',
        default_width: 800,
        default_height: 600
    });

    const notebook = new Gtk.Notebook();
    
    // Overview Settings
    const scale = createSpinButton(config.overview.scale || 0.18, 0, 1, 0.01, 2);
    const rows = createSpinButton(config.overview.numOfRows || 2, 1, 10, 1);
    const cols = createSpinButton(config.overview.numOfCols || 5, 1, 10, 1);
    const wsNumScale = createSpinButton(config.overview.wsNumScale || 0.09, 0, 1, 0.01, 2);
    const wsNumMarginScale = createSpinButton(config.overview.wsNumMarginScale || 0.07, 0, 1, 0.01, 2);

    notebook.append_page(createPage([
        createSettingRow('Scale', scale),
        createSettingRow('Number of Rows', rows),
        createSettingRow('Number of Columns', cols),
        createSettingRow('Workspace Number Scale', wsNumScale),
        createSettingRow('Workspace Number Margin Scale', wsNumMarginScale)
    ]), createWidget(Gtk.Label, { label: 'Overview' }));

    // Appearance Settings
    const smokeSwitch = createWidget(Gtk.Switch, {
        active: config.appearance.layerSmoke,
        valign: Gtk.Align.CENTER
    });
    const smokeStrength = createSpinButton(config.appearance.layerSmokeStrength || 0.2, 0, 1, 0.1, 1);
    const barCorners = createSpinButton(config.appearance.barRoundCorners || 0, 0, 100, 1);
    const screenRounding = createSpinButton(config.appearance.fakeScreenRounding || 0, 0, 100, 1);
    const darkModeSwitch = createWidget(Gtk.Switch, {
        active: config.appearance.autoDarkMode?.enabled || false,
        valign: Gtk.Align.CENTER
    });
    const darkModeFrom = createWidget(Gtk.Entry, {
        text: config.appearance.autoDarkMode?.from || "18:00",
        valign: Gtk.Align.CENTER
    });
    const darkModeTo = createWidget(Gtk.Entry, {
        text: config.appearance.autoDarkMode?.to || "6:00",
        valign: Gtk.Align.CENTER
    });
    const keyboardFlagSwitch = createWidget(Gtk.Switch, {
        active: config.appearance.keyboardUseFlag || false,
        valign: Gtk.Align.CENTER
    });

    notebook.append_page(createPage([
        createSettingRow('Layer Smoke', smokeSwitch),
        createSettingRow('Smoke Strength', smokeStrength),
        createSettingRow('Bar Round Corners', barCorners),
        createSettingRow('Screen Rounding', screenRounding),
        createSettingRow('Auto Dark Mode', darkModeSwitch),
        createSettingRow('Dark Mode From', darkModeFrom),
        createSettingRow('Dark Mode To', darkModeTo),
        createSettingRow('Keyboard Use Flag', keyboardFlagSwitch)
    ]), createWidget(Gtk.Label, { label: 'Appearance' }));

    // Animation Settings
    const choreographyDelay = createSpinButton(config.animations.choreographyDelay || 25, 0, 1000, 5);
    const smallDuration = createSpinButton(config.animations.durationSmall || 100, 0, 1000, 10);
    const largeDuration = createSpinButton(config.animations.durationLarge || 100, 0, 1000, 10);

    notebook.append_page(createPage([
        createSettingRow('Choreography Delay', choreographyDelay),
        createSettingRow('Small Duration', smallDuration),
        createSettingRow('Large Duration', largeDuration)
    ]), createWidget(Gtk.Label, { label: 'Animations' }));

    // Weather Settings
    const cityEntry = createWidget(Gtk.Entry, {
        text: config.weather?.city || "",
        valign: Gtk.Align.CENTER
    });
    const unitCombo = createWidget(Gtk.ComboBoxText, { valign: Gtk.Align.CENTER });
    ['C', 'F'].forEach(unit => unitCombo.append_text(unit));
    unitCombo.set_active(['C', 'F'].indexOf(config.weather?.preferredUnit || 'C'));

    notebook.append_page(createPage([
        createSettingRow('City', cityEntry),
        createSettingRow('Temperature Unit', unitCombo)
    ]), createWidget(Gtk.Label, { label: 'Weather' }));

    // Save Button
    const saveButton = createWidget(Gtk.Button, {
        label: 'Save & Restart AGS',
        halign: Gtk.Align.END,
        margin_top: 10,
        margin_end: 10,
        margin_bottom: 10
    });

    saveButton.connect('clicked', () => {
        const getValues = () => ({
            overview: {
                scale: scale.get_value(),
                numOfRows: rows.get_value(),
                numOfCols: cols.get_value(),
                wsNumScale: wsNumScale.get_value(),
                wsNumMarginScale: wsNumMarginScale.get_value()
            },
            appearance: {
                layerSmoke: smokeSwitch.get_active(),
                layerSmokeStrength: smokeStrength.get_value(),
                barRoundCorners: barCorners.get_value(),
                fakeScreenRounding: screenRounding.get_value(),
                autoDarkMode: {
                    enabled: darkModeSwitch.get_active(),
                    from: darkModeFrom.get_text(),
                    to: darkModeTo.get_text()
                },
                keyboardUseFlag: keyboardFlagSwitch.get_active()
            },
            animations: {
                choreographyDelay: choreographyDelay.get_value(),
                durationSmall: smallDuration.get_value(),
                durationLarge: largeDuration.get_value()
            },
            weather: {
                city: cityEntry.get_text(),
                preferredUnit: ['C', 'F'][unitCombo.get_active()]
            }
        });

        const newValues = getValues();
        Object.keys(config).forEach(key => {
            if (!newValues[key]) newValues[key] = config[key];
        });

        saveConfig(newValues);
        win.close();
    });

    const mainBox = createWidget(Gtk.Box, {
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 10
    });

    mainBox.append(notebook);
    mainBox.append(saveButton);

    win.set_child(createWidget(Gtk.ScrolledWindow, { child: mainBox }));
    win.present();
});

app.run([]); 