#!/usr/bin/gjs
imports.gi.versions.Gtk = '4.0';
imports.gi.versions.Adw = '1';
imports.gi.versions.Gdk = '4.0';

const { Gtk, Adw, Gio, GLib } = imports.gi;
const ByteArray = imports.byteArray;

const HOME = GLib.get_home_dir();
const CONFIG_PATH = `${HOME}/.ags/config.json`;

let config;
try {
    const contents = readFileSync(CONFIG_PATH);
    config = JSON.parse(contents);
} catch (error) {
    console.error('Error reading config:', error);
    config = {};
}

Adw.init();

const app = new Gtk.Application({
    application_id: 'org.gnome.AGSTweaks'
});

app.connect('activate', () => {
    const win = new Gtk.Window({
        default_width: 1000,
        default_height: 680,
        title: 'Settings'
    });

    win.connect('close-request', () => {
        app.quit();
        return true;
    });

    win.set_application(app);
    win.set_resizable(true);
    win.set_decorated(true);

    const mainView = createMainView(win);
    win.set_child(mainView);
    win.present();
});

function readFileSync(path) {
    try {
        let file = Gio.File.new_for_path(path);
        const [success, contents] = file.load_contents(null);
        if (!success) return null;
        return ByteArray.toString(contents);
    } catch (error) {
        console.error('Error reading file:', error);
        return null;
    }
}

function writeFileSync(path, contents) {
    try {
        let file = Gio.File.new_for_path(path);
        file.replace_contents(contents, null, false, Gio.FileCreateFlags.NONE, null);
    } catch (error) {
        console.error('Error writing file:', error);
    }
}

const CONTROL_HEIGHT = 32;
const CONTROL_WIDTH = {
    entry: 200,
    scale: 200,
    combo: 200,
    spin: 80
};

function styleControl(control, width = CONTROL_WIDTH.entry) {
    control.height_request = CONTROL_HEIGHT;
    control.width_request = width;
    control.valign = Gtk.Align.CENTER;
    return control;
}

function createEntry(text = '') {
    return styleControl(new Gtk.Entry({ text: text }));
}

function createScale(value, min, max, digits = 0) {
    return styleControl(new Gtk.Scale({
        orientation: Gtk.Orientation.HORIZONTAL,
        draw_value: true,
        value_pos: Gtk.PositionType.RIGHT,
        digits: digits
    }), CONTROL_WIDTH.scale);
}

function createComboBox() {
    return styleControl(new Gtk.ComboBoxText(), CONTROL_WIDTH.combo);
}

function createSpinButton(value, min, max, step = 1) {
    return styleControl(new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: min,
            upper: max,
            step_increment: step
        }),
        value: value
    }), CONTROL_WIDTH.spin);
}

function createMainView(window) {
    const outerBox = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        vexpand: true
    });

    const mainBox = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        vexpand: true
    });

    const rightBox = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        hexpand: true
    });

    const mainHeader = new Gtk.HeaderBar({
        show_title_buttons: true,
        css_classes: ['flat']
    });

    const headerTitle = new Gtk.Label({
        label: 'Appearance'
    });

    mainHeader.set_title_widget(headerTitle);
    rightBox.append(mainHeader);

    const sidebarContainer = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        width_request: 240,
        vexpand: true,
        hexpand: false,
        css_classes: ['sidebar-container']
    });

    const leftBox = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        vexpand: true,
        hexpand: true
    });

    const sidebarHeader = new Gtk.HeaderBar({
        show_title_buttons: false,
        css_classes: ['flat'],
        hexpand: true
    });

    const sidebarTitle = new Gtk.Label({
        label: 'Settings',
        hexpand: true
    });

    const searchButton = new Gtk.ToggleButton({
        icon_name: 'system-search-symbolic',
        css_classes: ['flat']
    });

    const menuButton = new Gtk.MenuButton({
        icon_name: 'view-more-symbolic',
        css_classes: ['flat']
    });

    sidebarHeader.set_title_widget(sidebarTitle);
    sidebarHeader.pack_start(searchButton);
    sidebarHeader.pack_end(menuButton);

    const searchEntry = new Gtk.SearchEntry({
        placeholder_text: 'Search',
        margin_start: 12,
        margin_end: 12,
        margin_top: 6,
        margin_bottom: 6,
        visible: false,
        hexpand: true
    });

    const listBox = new Gtk.ListBox({
        selection_mode: Gtk.SelectionMode.SINGLE,
        css_classes: ['navigation-sidebar'],
        hexpand: true
    });

    const contentStack = new Gtk.Stack({
        transition_type: Gtk.StackTransitionType.CROSSFADE,
        hexpand: true
    });

    const pages = [
        {
            id: 'appearance',
            title: 'Appearance',
            icon: 'preferences-desktop-appearance-symbolic',
            content: createAppearancePage()
        },
        {
            id: 'animations',
            title: 'Animations',
            icon: 'preferences-desktop-effects-symbolic',
            content: createAnimationsPage()
        },
        {
            id: 'overview',
            title: 'Overview',
            icon: 'view-grid-symbolic',
            content: createOverviewPage()
        },
        {
            id: 'dock',
            title: 'Dock',
            icon: 'dock-symbolic',
            content: createDockPage()
        },
        {
            id: 'applications',
            title: 'Applications',
            icon: 'applications-system-symbolic',
            content: createApplicationsPage()
        },
        {
            id: 'system',
            title: 'System',
            icon: 'preferences-system-symbolic',
            content: createSystemPage()
        }
    ];

    pages.forEach(page => {
        const row = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 8,
            margin_start: 6,
            margin_end: 6,
            margin_top: 3,
            margin_bottom: 3
        });

        const icon = new Gtk.Image({
            icon_name: page.icon
        });

        const label = new Gtk.Label({
            label: page.title,
            xalign: 0,
            hexpand: true
        });

        row.append(icon);
        row.append(label);

        const listBoxRow = new Gtk.ListBoxRow();
        listBoxRow.set_child(row);
        listBoxRow.name = page.id;
        listBox.append(listBoxRow);

        contentStack.add_named(page.content, page.id);
    });

    listBox.connect('row-selected', (box, row) => {
        if (row) {
            const pageTitle = row.get_child().get_last_child().get_label();
            headerTitle.set_label(pageTitle);
            contentStack.set_visible_child_name(row.name);
        }
    });

    listBox.select_row(listBox.get_row_at_index(0));

    rightBox.append(contentStack);

    searchButton.connect('toggled', () => {
        searchEntry.visible = searchButton.active;
    });

    leftBox.append(sidebarHeader);
    leftBox.append(searchEntry);
    leftBox.append(listBox);

    sidebarContainer.append(leftBox);

    mainBox.append(sidebarContainer);
    mainBox.append(rightBox);

    const footer = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        margin_top: 12,
        margin_bottom: 12,
        margin_start: 12,
        margin_end: 12,
        halign: Gtk.Align.END
    });

    const buttonBox = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        spacing: 6
    });

    const icon = new Gtk.Image({
        icon_name: 'document-save-symbolic',
        pixel_size: 16
    });

    const label = new Gtk.Label({
        label: 'Save & Restart'
    });

    const spinner = new Gtk.Spinner({
        visible: false
    });

    buttonBox.append(icon);
    buttonBox.append(label);
    buttonBox.append(spinner);

    const restartButton = new Gtk.Button({
        child: buttonBox,
        tooltip_text: 'Save configuration and restart AGS',
        css_classes: ['suggested-action', 'pill'],
        width_request: 140,
        height_request: 38
    });

    restartButton.get_style_context().add_class('accent');
    
    restartButton.connect('clicked', () => {
        restartButton.sensitive = false;
        icon.visible = false;
        spinner.visible = true;
        spinner.start();
        label.label = 'Saving...';

        try {
            GLib.file_set_contents('/tmp/ags_restart.log', '');
            
            writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
            GLib.spawn_command_line_async('bash -c "killall ags && sleep 0.5 && ags > /tmp/ags_restart.log 2>&1"');
            
            let attempts = 0;
            const checkAgs = () => {
                try {
                    const log = readFileSync('/tmp/ags_restart.log');
                    if (log && log.includes('Service started')) {
                        restartButton.sensitive = true;
                        icon.visible = true;
                        spinner.visible = false;
                        spinner.stop();
                        label.label = 'Save & Restart';
                        GLib.spawn_command_line_async('rm -f /tmp/ags_restart.log');
                        return GLib.SOURCE_REMOVE;
                    }
                    
                    attempts++;
                    if (attempts > 100) {
                        restartButton.sensitive = true;
                        icon.visible = true;
                        spinner.visible = false;
                        spinner.stop();
                        label.label = 'Save & Restart';
                        GLib.spawn_command_line_async('rm -f /tmp/ags_restart.log');
                        return GLib.SOURCE_REMOVE;
                    }
                    
                    return GLib.SOURCE_CONTINUE;
                } catch (error) {
                    return GLib.SOURCE_CONTINUE;
                }
            };

            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, checkAgs);
        } catch (error) {
            console.error('Error saving config or restarting AGS:', error);
            restartButton.sensitive = true;
            icon.visible = true;
            spinner.visible = false;
            spinner.stop();
            label.label = 'Save & Restart';
        }
    });

    footer.append(restartButton);
    outerBox.append(mainBox);
    outerBox.append(footer);

    return outerBox;
}

function createAppearancePage() {
    const box = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 12,
        margin_start: 12,
        margin_end: 12,
        margin_top: 12
    });

    const themeGroup = new Adw.PreferencesGroup({ title: 'Theme' });
    
    const themeRow = new Adw.ActionRow({
        title: 'Color Theme',
        subtitle: 'Select color theme'
    });
    const themeCombo = createComboBox();
    themeCombo.append('dark', 'Dark');
    themeCombo.append('light', 'Light');
    themeCombo.set_active_id(config.theme ?? 'dark');
    themeCombo.connect('changed', () => {
        config.theme = themeCombo.get_active_id();
    });
    themeRow.add_suffix(themeCombo);
    themeGroup.add(themeRow);

    const colorRow = new Adw.ActionRow({
        title: 'Accent Color',
        subtitle: 'Select accent color'
    });
    const colorCombo = createComboBox();
    const colors = ['blue', 'green', 'yellow', 'orange', 'red', 'purple', 'brown'];
    colors.forEach(color => {
        colorCombo.append(color, color.charAt(0).toUpperCase() + color.slice(1));
    });
    colorCombo.set_active_id(config.color ?? 'blue');
    colorCombo.connect('changed', () => {
        config.color = colorCombo.get_active_id();
    });
    colorRow.add_suffix(colorCombo);
    themeGroup.add(colorRow);

    box.append(themeGroup);
    return box;
}

function createAnimationsPage() {
    const box = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 12,
        margin_start: 12,
        margin_end: 12,
        margin_top: 12
    });

    const animGroup = new Adw.PreferencesGroup({ title: 'Animation Settings' });

    const choreographyRow = new Adw.ActionRow({
        title: 'Choreography',
        subtitle: 'Animation choreography type'
    });
    const choreographyCombo = createComboBox();
    choreographyCombo.append('none', 'None');
    choreographyCombo.append('simple', 'Simple');
    choreographyCombo.append('complex', 'Complex');
    choreographyCombo.set_active_id(config.animations?.choreography ?? 'simple');
    choreographyCombo.connect('changed', () => {
        if (!config.animations) config.animations = {};
        config.animations.choreography = choreographyCombo.get_active_id();
    });
    choreographyRow.add_suffix(choreographyCombo);
    animGroup.add(choreographyRow);

    box.append(animGroup);
    return box;
}

function createOverviewPage() {
    const box = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 12,
        margin_start: 12,
        margin_end: 12,
        margin_top: 12
    });

    const layoutGroup = new Adw.PreferencesGroup({ title: 'Layout' });
    
    const gridRow = new Adw.ActionRow({
        title: 'Grid Layout',
        subtitle: 'Number of rows and columns'
    });
    
    const gridBox = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        spacing: 12
    });

    const rowsSpinButton = createSpinButton(config.overview?.numOfRows ?? 2, 1, 10);
    const colsSpinButton = createSpinButton(config.overview?.numOfCols ?? 5, 1, 10);

    rowsSpinButton.connect('value-changed', () => {
        if (!config.overview) config.overview = {};
        config.overview.numOfRows = rowsSpinButton.get_value();
    });

    colsSpinButton.connect('value-changed', () => {
        if (!config.overview) config.overview = {};
        config.overview.numOfCols = colsSpinButton.get_value();
    });

    gridBox.append(new Gtk.Label({ label: 'Rows:' }));
    gridBox.append(rowsSpinButton);
    gridBox.append(new Gtk.Label({ label: 'Columns:' }));
    gridBox.append(colsSpinButton);
    
    gridRow.add_suffix(gridBox);
    layoutGroup.add(gridRow);

    box.append(layoutGroup);
    return box;
}

function createDockPage() {
    const box = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 12,
        margin_start: 12,
        margin_end: 12,
        margin_top: 12
    });

    const dockGroup = new Adw.PreferencesGroup({ title: 'Dock Settings' });
    
    const enabledRow = new Adw.ActionRow({
        title: 'Enable Dock',
        subtitle: 'Show dock on screen'
    });
    const enabledSwitch = new Gtk.Switch({
        active: config.dock?.enabled ?? false,
        valign: Gtk.Align.CENTER
    });
    enabledSwitch.connect('notify::active', () => {
        if (!config.dock) config.dock = {};
        config.dock.enabled = enabledSwitch.active;
    });
    enabledRow.add_suffix(enabledSwitch);
    dockGroup.add(enabledRow);

    box.append(dockGroup);
    return box;
}

function createApplicationsPage() {
    const box = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 12,
        margin_start: 12,
        margin_end: 12,
        margin_top: 12
    });

    const appsGroup = new Adw.PreferencesGroup({ title: 'Default Applications' });

    const apps = {
        'Terminal': 'terminal',
        'Task Manager': 'taskManager',
        'Settings': 'settings',
        'Network': 'network',
        'Bluetooth': 'bluetooth',
        'Image Viewer': 'imageViewer'
    };

    Object.entries(apps).forEach(([title, key]) => {
        const row = new Adw.ActionRow({
            title: title
        });
        const entry = createEntry(config.apps?.[key] ?? '');
        entry.connect('changed', () => {
            if (!config.apps) config.apps = {};
            config.apps[key] = entry.text;
        });
        row.add_suffix(entry);
        appsGroup.add(row);
    });

    box.append(appsGroup);
    return box;
}

function createSystemPage() {
    const box = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 12,
        margin_start: 12,
        margin_end: 12,
        margin_top: 12
    });

    const timeGroup = new Adw.PreferencesGroup({ title: 'Time & Date' });
    const batteryGroup = new Adw.PreferencesGroup({ title: 'Battery' });
    const weatherGroup = new Adw.PreferencesGroup({ title: 'Weather' });

    box.append(timeGroup);
    box.append(batteryGroup);
    box.append(weatherGroup);
    return box;
}

app.run([]); 