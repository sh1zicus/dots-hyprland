#!/usr/bin/gjs
imports.gi.versions.Gtk = '4.0';
imports.gi.versions.Adw = '1';
imports.gi.versions.Gdk = '4.0';

const { Gtk, Adw, Gio, GLib, Gdk } = imports.gi;
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

function createBarPage() {
    const box = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 12,
        margin_start: 12,
        margin_end: 12,
        margin_top: 12
    });

    const generalGroup = new Adw.PreferencesGroup({ title: 'General' });
    
    const positionRow = new Adw.ActionRow({
        title: 'Position',
        subtitle: 'Bar position on screen'
    });
    const positionCombo = createComboBox();
    positionCombo.append('top', 'Top');
    positionCombo.append('bottom', 'Bottom');
    positionCombo.set_active_id(config.bar?.position ?? 'top');
    positionCombo.connect('changed', () => {
        if (!config.bar) config.bar = {};
        config.bar.position = positionCombo.get_active_id();
    });
    positionRow.add_suffix(positionCombo);
    generalGroup.add(positionRow);

    const heightRow = new Adw.ActionRow({
        title: 'Height',
        subtitle: 'Bar height in pixels'
    });
    const heightScale = createScale(config.bar?.height ?? 32, 24, 48, 0);
    heightScale.connect('value-changed', () => {
        if (!config.bar) config.bar = {};
        config.bar.height = heightScale.get_value();
    });
    heightRow.add_suffix(heightScale);
    generalGroup.add(heightRow);

    const spacingRow = new Adw.ActionRow({
        title: 'Spacing',
        subtitle: 'Space between elements'
    });
    const spacingScale = createScale(config.bar?.spacing ?? 8, 0, 16, 0);
    spacingScale.connect('value-changed', () => {
        if (!config.bar) config.bar = {};
        config.bar.spacing = spacingScale.get_value();
    });
    spacingRow.add_suffix(spacingScale);
    generalGroup.add(spacingRow);

    const monitorsGroup = new Adw.PreferencesGroup({ title: 'Monitors' });

    const monitorBehaviorRow = new Adw.ActionRow({
        title: 'Monitor Behavior',
        subtitle: 'Bar display on multiple monitors'
    });
    const monitorCombo = createComboBox();
    monitorCombo.append('primary', 'Primary Only');
    monitorCombo.append('all', 'All Monitors');
    monitorCombo.set_active_id(config.bar?.monitors ?? 'primary');
    monitorCombo.connect('changed', () => {
        if (!config.bar) config.bar = {};
        config.bar.monitors = monitorCombo.get_active_id();
    });
    monitorBehaviorRow.add_suffix(monitorCombo);
    monitorsGroup.add(monitorBehaviorRow);

    const elementsGroup = new Adw.PreferencesGroup({ title: 'Elements' });

    const elements = {
        'Show Workspaces': 'showWorkspaces',
        'Show Taskbar': 'showTaskbar',
        'Show System Tray': 'showSystemTray',
        'Show Clock': 'showClock',
        'Show Power Menu': 'showPowerMenu',
        'Show Media': 'showMedia',
        'Show Network': 'showNetwork',
        'Show Volume': 'showVolume',
        'Show Battery': 'showBattery',
        'Show Notifications': 'showNotifications'
    };

    Object.entries(elements).forEach(([title, key]) => {
        const row = new Adw.ActionRow({
            title: title
        });
        const toggle = new Gtk.Switch({
            active: config.bar?.elements?.[key] ?? true,
            valign: Gtk.Align.CENTER
        });
        toggle.connect('notify::active', () => {
            if (!config.bar) config.bar = {};
            if (!config.bar.elements) config.bar.elements = {};
            config.bar.elements[key] = toggle.active;
        });
        row.add_suffix(toggle);
        elementsGroup.add(row);
    });

    const styleGroup = new Adw.PreferencesGroup({ title: 'Style' });

    const paddingRow = new Adw.ActionRow({
        title: 'Padding',
        subtitle: 'Bar content padding'
    });
    const paddingScale = createScale(config.bar?.padding ?? 8, 0, 16, 0);
    paddingScale.connect('value-changed', () => {
        if (!config.bar) config.bar = {};
        config.bar.padding = paddingScale.get_value();
    });
    paddingRow.add_suffix(paddingScale);
    styleGroup.add(paddingRow);

    const roundnessRow = new Adw.ActionRow({
        title: 'Roundness',
        subtitle: 'Bar corner radius'
    });
    const roundnessScale = createScale(config.bar?.roundness ?? 0, 0, 16, 0);
    roundnessScale.connect('value-changed', () => {
        if (!config.bar) config.bar = {};
        config.bar.roundness = roundnessScale.get_value();
    });
    roundnessRow.add_suffix(roundnessScale);
    styleGroup.add(roundnessRow);

    box.append(generalGroup);
    box.append(monitorsGroup);
    box.append(elementsGroup);
    box.append(styleGroup);
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

    const layerRow = new Adw.ActionRow({
        title: 'Layer',
        subtitle: 'Dock layer position'
    });
    const layerCombo = createComboBox();
    layerCombo.append('top', 'Top');
    layerCombo.append('bottom', 'Bottom');
    layerCombo.set_active_id(config.dock?.layer ?? 'top');
    layerCombo.connect('changed', () => {
        if (!config.dock) config.dock = {};
        config.dock.layer = layerCombo.get_active_id();
    });
    layerRow.add_suffix(layerCombo);
    dockGroup.add(layerRow);

    const monitorExclusivityRow = new Adw.ActionRow({
        title: 'Monitor Exclusivity',
        subtitle: 'Show dock only on primary monitor'
    });
    const exclusivitySwitch = new Gtk.Switch({
        active: config.dock?.monitorExclusivity ?? true,
        valign: Gtk.Align.CENTER
    });
    exclusivitySwitch.connect('notify::active', () => {
        if (!config.dock) config.dock = {};
        config.dock.monitorExclusivity = exclusivitySwitch.active;
    });
    monitorExclusivityRow.add_suffix(exclusivitySwitch);
    dockGroup.add(monitorExclusivityRow);

    const hiddenThicknessRow = new Adw.ActionRow({
        title: 'Hidden Thickness',
        subtitle: 'Dock thickness when hidden (px)'
    });
    const thicknessScale = createScale(config.dock?.hiddenThickness ?? 4, 1, 10, 0);
    thicknessScale.connect('value-changed', () => {
        if (!config.dock) config.dock = {};
        config.dock.hiddenThickness = thicknessScale.get_value();
    });
    hiddenThicknessRow.add_suffix(thicknessScale);
    dockGroup.add(hiddenThicknessRow);

    const iconSizeRow = new Adw.ActionRow({
        title: 'Icon Size',
        subtitle: 'Size of dock icons (px)'
    });
    const iconSizeScale = createScale(config.dock?.iconSize ?? 48, 24, 64, 0);
    iconSizeScale.connect('value-changed', () => {
        if (!config.dock) config.dock = {};
        config.dock.iconSize = iconSizeScale.get_value();
    });
    iconSizeRow.add_suffix(iconSizeScale);
    dockGroup.add(iconSizeRow);

    const appsGroup = new Adw.PreferencesGroup({ title: 'Applications' });

    const searchIconsRow = new Adw.ActionRow({
        title: 'Search Pinned Icons',
        subtitle: 'Search for pinned application icons'
    });
    const searchIconsSwitch = new Gtk.Switch({
        active: config.dock?.searchPinnedAppIcons ?? false,
        valign: Gtk.Align.CENTER
    });
    searchIconsSwitch.connect('notify::active', () => {
        if (!config.dock) config.dock = {};
        config.dock.searchPinnedAppIcons = searchIconsSwitch.active;
    });
    searchIconsRow.add_suffix(searchIconsSwitch);
    appsGroup.add(searchIconsRow);

    const pinnedAppsRow = new Adw.ActionRow({
        title: 'Pinned Applications',
        subtitle: 'List of pinned applications (comma-separated)'
    });
    const pinnedAppsEntry = createEntry((config.dock?.pinnedApps ?? []).join(', '));
    pinnedAppsEntry.connect('changed', () => {
        if (!config.dock) config.dock = {};
        config.dock.pinnedApps = pinnedAppsEntry.text.split(',').map(s => s.trim()).filter(s => s);
    });
    pinnedAppsRow.add_suffix(pinnedAppsEntry);
    appsGroup.add(pinnedAppsRow);

    box.append(dockGroup);
    box.append(appsGroup);
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

function createMainView(window) {
    const outerBox = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        vexpand: true
    });

    const contentBox = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        vexpand: true
    });

    const sidebarContainer = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        width_request: 280,
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
        placeholder_text: 'Search Settings',
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

    // Функция для поиска текста в дочерних виджетах
    function findTextInWidget(widget, searchText) {
        if (!widget) return false;
        
        // Проверяем текст в Gtk.Label
        if (widget instanceof Gtk.Label) {
            return widget.label.toLowerCase().includes(searchText);
        }
        
        // Проверяем текст в Adw.ActionRow
        if (widget.constructor.name === 'AdwActionRow') {
            return widget.title.toLowerCase().includes(searchText) || 
                   widget.subtitle?.toLowerCase().includes(searchText);
        }

        // Рекурсивно проверяем дочерние элементы
        if (widget.get_first_child) {
            let child = widget.get_first_child();
            while (child) {
                if (findTextInWidget(child, searchText)) return true;
                child = child.get_next_sibling();
            }
        }
        
        return false;
    }

    listBox.set_filter_func((row) => {
        if (!searchEntry.text) return true;
        const searchText = searchEntry.text.toLowerCase();
        
        // Проверяем заголовок страницы
        const pageTitle = row.get_child().get_last_child().label.toLowerCase();
        if (pageTitle.includes(searchText)) return true;

        // Получаем контент страницы и ищем в нем
        const pageId = row.name;
        const pageContent = contentStack.get_child_by_name(pageId);
        return findTextInWidget(pageContent, searchText);
    });

    searchEntry.connect('search-changed', () => {
        listBox.invalidate_filter();
        
        // Если есть результаты поиска, выбираем первый найденный элемент
        if (searchEntry.text) {
            let foundRow = null;
            let child = listBox.get_first_child();
            while (child) {
                if (child.visible) {
                    foundRow = child;
                    break;
                }
                child = child.get_next_sibling();
            }
            if (foundRow) {
                listBox.select_row(foundRow);
                contentStack.set_visible_child_name(foundRow.name);
                const pageTitle = foundRow.get_child().get_last_child().get_label();
                headerTitle.set_label(pageTitle);
            }
        }
    });

    searchButton.connect('toggled', () => {
        searchEntry.visible = searchButton.active;
        if (!searchButton.active) {
            searchEntry.text = '';
        } else {
            searchEntry.grab_focus();
        }
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

    const contentStack = new Gtk.Stack({
        transition_type: Gtk.StackTransitionType.CROSSFADE,
        hexpand: true,
        vexpand: true
    });

    const scrolledWindow = new Gtk.ScrolledWindow({
        vexpand: true,
        hexpand: true
    });

    scrolledWindow.set_child(contentStack);
    rightBox.append(mainHeader);
    rightBox.append(scrolledWindow);

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

    leftBox.append(sidebarHeader);
    leftBox.append(searchEntry);
    leftBox.append(listBox);

    sidebarContainer.append(leftBox);

    contentBox.append(sidebarContainer);
    contentBox.append(rightBox);

    const footer = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        margin_top: 12,
        margin_bottom: 12,
        margin_start: 12,
        margin_end: 12,
        halign: Gtk.Align.END,
        css_classes: ['toolbar'],
        hexpand: true
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
            writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
            
            const tempLog = '/tmp/ags_restart.log';
            GLib.file_set_contents(tempLog, '');
            
            GLib.spawn_command_line_async('killall ags');
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 800, () => {
                GLib.spawn_command_line_async(`ags > ${tempLog} 2>&1`);
                
                let attempts = 40;
                const checkAgs = () => {
                    try {
                        const log = readFileSync(tempLog);
                        if (log && log.includes('Service started')) {
                            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
                                restartButton.sensitive = true;
                                icon.visible = true;
                                spinner.visible = false;
                                spinner.stop();
                                label.label = 'Save & Restart';
                                GLib.spawn_command_line_async(`rm -f ${tempLog}`);
                                return GLib.SOURCE_REMOVE;
                            });
                            return GLib.SOURCE_REMOVE;
                        }
                        
                        attempts--;
                        if (attempts <= 0) {
                            restartButton.sensitive = true;
                            icon.visible = true;
                            spinner.visible = false;
                            spinner.stop();
                            label.label = 'Save & Restart';
                            GLib.spawn_command_line_async(`rm -f ${tempLog}`);
                            return GLib.SOURCE_REMOVE;
                        }
                        
                        return GLib.SOURCE_CONTINUE;
                    } catch (error) {
                        return GLib.SOURCE_CONTINUE;
                    }
                };

                GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, checkAgs);
                return GLib.SOURCE_REMOVE;
            });
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
    outerBox.append(contentBox);
    outerBox.append(footer);

    return outerBox;
}

Adw.init();

const pages = [
    {
        id: 'appearance',
        title: 'Appearance',
        icon: 'preferences-desktop-appearance-symbolic',
        content: createAppearancePage()
    },
    {
        id: 'bar',
        title: 'Bar',
        icon: 'view-grid-symbolic',
        content: createBarPage()
    },
    {
        id: 'animations',
        title: 'Animations',
        icon: 'view-reveal-symbolic',
        content: createAnimationsPage()
    },
    {
        id: 'overview',
        title: 'Overview',
        icon: 'view-app-grid-symbolic',
        content: createOverviewPage()
    },
    {
        id: 'dock',
        title: 'Dock',
        icon: 'view-paged-symbolic',
        content: createDockPage()
    },
    {
        id: 'applications',
        title: 'Applications',
        icon: 'application-x-executable-symbolic',
        content: createApplicationsPage()
    },
    {
        id: 'system',
        title: 'System',
        icon: 'emblem-system-symbolic',
        content: createSystemPage()
    }
];

const app = new Gtk.Application({
    application_id: 'org.gnome.AGSTweaks',
    flags: Gio.ApplicationFlags.FLAGS_NONE
});

app.connect('activate', () => {
    const win = new Gtk.Window({
        application: app,
        title: 'AGS Settings',
        default_width: 1000,
        default_height: 680,
        icon_name: 'preferences-system-symbolic'
    });

    win.connect('close-request', () => {
        app.quit();
        return true;
    });

    const mainView = createMainView(win);
    win.set_child(mainView);
    win.present();
});

app.run([]); 