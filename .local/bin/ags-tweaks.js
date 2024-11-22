#!/usr/bin/gjs
imports.gi.versions.Gtk = '4.0';
imports.gi.versions.Adw = '1';
imports.gi.versions.Gdk = '4.0';
const { GObject, Gtk, Gio, GLib, Adw, Gdk } = imports.gi;

const CONFIG_FILE = GLib.build_filenamev([GLib.get_home_dir(), '.ags/config.json']);

// Вспомогательные функции
const createWidget = (type, props = {}) => Object.assign(new type(), props);

const createSpinButton = (value, min, max, step, digits = 0) => createWidget(Gtk.SpinButton, {
    adjustment: new Gtk.Adjustment({ value: value || 0, lower: min, upper: max, step_increment: step }),
    digits: digits,
    valign: Gtk.Align.CENTER,
    value: value || 0
});

const createSettingRow = (label, widget, description = '') => {
    const box = createWidget(Gtk.Box, {
        orientation: Gtk.Orientation.VERTICAL,
        css_classes: ['settings-row']
    });
    
    const headerBox = createWidget(Gtk.Box, {
        orientation: Gtk.Orientation.HORIZONTAL,
        spacing: 10
    });
    
    headerBox.append(createWidget(Gtk.Label, {
        label: label,
        halign: Gtk.Align.START,
        hexpand: true
    }));
    headerBox.append(widget);
    
    box.append(headerBox);
    
    if (description) {
        box.append(createWidget(Gtk.Label, {
            label: description,
            halign: Gtk.Align.START,
            css_classes: ['settings-description'],
            wrap: true
        }));
    }
    
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

// Добавляем стили
const css = new Gtk.CssProvider();
const cssData = `
    .settings-page {
        margin: 24px 12px;
    }
    
    .settings-group {
        margin-bottom: 24px;
    }
    
    .settings-group-title {
        margin-bottom: 12px;
        font-weight: bold;
    }
    
    .settings-row {
        padding: 12px;
        border-radius: 12px;
        margin-bottom: 1px;
    }
    
    .settings-row:hover {
        background-color: alpha(@theme_fg_color, 0.03);
    }
    
    .settings-description {
        font-size: 0.9em;
        color: alpha(@theme_fg_color, 0.7);
        margin-top: 4px;
    }
    
    .footer-box {
        padding: 12px;
        margin: 0;
    }

    .footer-separator {
        margin: 0;
    }

    .save-button {
        padding: 8px 16px;
        margin: 6px;
    }

    .save-button:disabled {
        opacity: 0.7;
    }

    .save-button-box {
        spacing: 8px;
    }
`;

css.load_from_data(cssData, -1);

// Новая функция для создания группы настроек
const createSettingsGroup = (title, rows) => {
    const group = createWidget(Gtk.Box, {
        orientation: Gtk.Orientation.VERTICAL,
        css_classes: ['settings-group'],
        spacing: 8
    });

    group.append(createWidget(Gtk.Label, {
        label: title,
        halign: Gtk.Align.START,
        css_classes: ['settings-group-title']
    }));

    rows.forEach(row => group.append(row));
    return group;
};

app.connect('activate', () => {
    const config = loadConfig();
    if (!config) return;

    Gtk.StyleContext.add_provider_for_display(
        Gdk.Display.get_default(),
        css,
        Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
    );

    const win = createWidget(Gtk.ApplicationWindow, {
        application: app,
        title: 'AGS Configuration',
        default_width: 900,
        default_height: 680
    });

    // Создаем все виджеты
    // Interface widgets
    const barCorners = createSpinButton(config.appearance.barRoundCorners || 0, 0, 100, 1);
    const screenRounding = createSpinButton(config.appearance.fakeScreenRounding || 0, 0, 100, 1);
    const smokeSwitch = createWidget(Gtk.Switch, {
        active: config.appearance.layerSmoke,
        valign: Gtk.Align.CENTER
    });
    const smokeStrength = createSpinButton(config.appearance.layerSmokeStrength || 0.2, 0, 1, 0.1, 1);
    const barPositionCombo = createWidget(Gtk.ComboBoxText, { valign: Gtk.Align.CENTER });
    ['top', 'bottom'].forEach(pos => barPositionCombo.append_text(pos));
    barPositionCombo.set_active(['top', 'bottom'].indexOf(config.bar?.position || 'top'));

    // Overview widgets
    const scale = createSpinButton(config.overview.scale || 0.18, 0, 1, 0.01, 2);
    const rows = createSpinButton(config.overview.numOfRows || 2, 1, 10, 1);
    const cols = createSpinButton(config.overview.numOfCols || 5, 1, 10, 1);
    const wsNumScale = createSpinButton(config.overview.wsNumScale || 0.09, 0, 1, 0.01, 2);
    const wsNumMarginScale = createSpinButton(config.overview.wsNumMarginScale || 0.07, 0, 1, 0.01, 2);

    // AI widgets
    const gptProviderCombo = createWidget(Gtk.ComboBoxText, { valign: Gtk.Align.CENTER });
    ['openrouter', 'openai', 'anthropic'].forEach(provider => gptProviderCombo.append_text(provider));
    gptProviderCombo.set_active(['openrouter', 'openai', 'anthropic'].indexOf(config.ai?.defaultGPTProvider || 'openrouter'));

    const searchAICombo = createWidget(Gtk.ComboBoxText, { valign: Gtk.Align.CENTER });
    ['gemini', 'gpt', 'none'].forEach(ai => searchAICombo.append_text(ai));
    searchAICombo.set_active(['gemini', 'gpt', 'none'].indexOf(config.ai?.onSearch || 'gemini'));

    const temperatureScale = createSpinButton(config.ai?.defaultTemperature || 0.9, 0, 2, 0.1, 1);
    const writingCursor = createWidget(Gtk.Entry, {
        text: config.ai?.writingCursor || " ...",
        valign: Gtk.Align.CENTER
    });
    const enhancementsSwitch = createWidget(Gtk.Switch, {
        active: config.ai?.enhancements || true,
        valign: Gtk.Align.CENTER
    });
    const historySwitch = createWidget(Gtk.Switch, {
        active: config.ai?.useHistory || true,
        valign: Gtk.Align.CENTER
    });
    const safetySwitch = createWidget(Gtk.Switch, {
        active: config.ai?.safety || true,
        valign: Gtk.Align.CENTER
    });

    // System widgets
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
    const proxyUrl = createWidget(Gtk.Entry, {
        text: config.ai?.proxyUrl || "",
        valign: Gtk.Align.CENTER,
        placeholder_text: "http://proxy:port"
    });

    // Animation widgets
    const choreographyDelay = createSpinButton(config.animations.choreographyDelay || 25, 0, 1000, 5);
    const smallDuration = createSpinButton(config.animations.durationSmall || 100, 0, 1000, 10);
    const largeDuration = createSpinButton(config.animations.durationLarge || 100, 0, 1000, 10);

    // Weather widgets
    const cityEntry = createWidget(Gtk.Entry, {
        text: config.weather?.city || "",
        valign: Gtk.Align.CENTER
    });
    const unitCombo = createWidget(Gtk.ComboBoxText, { valign: Gtk.Align.CENTER });
    ['C', 'F'].forEach(unit => unitCombo.append_text(unit));
    unitCombo.set_active(['C', 'F'].indexOf(config.weather?.preferredUnit || 'C'));

    // Translator widgets
    const fromLangCombo = createWidget(Gtk.ComboBoxText, { valign: Gtk.Align.CENTER });
    const toLangCombo = createWidget(Gtk.ComboBoxText, { valign: Gtk.Align.CENTER });
    const languages = config.sidebar?.translater?.languages || {
        'auto': 'Auto',
        'en': 'English',
        'ru': 'Russian'
    };
    
    Object.entries(languages).forEach(([code, name]) => {
        fromLangCombo.append_text(`${name} (${code})`);
        toLangCombo.append_text(`${name} (${code})`);
    });

    const currentFromLang = config.sidebar?.translater?.from || 'auto';
    const currentToLang = config.sidebar?.translater?.to || 'en';
    
    fromLangCombo.set_active(Object.keys(languages).indexOf(currentFromLang));
    toLangCombo.set_active(Object.keys(languages).indexOf(currentToLang));

    // Создаем UI компоненты
    const sidebar = new Gtk.StackSidebar({
        vexpand: true,
        width_request: 180
    });

    const stack = new Gtk.Stack({
        transition_type: Gtk.StackTransitionType.SLIDE_LEFT_RIGHT,
        transition_duration: 200,
        hexpand: true
    });

    sidebar.set_stack(stack);

    // Interface Page
    const interfacePage = createPage([
        createSettingsGroup('Bar Settings', [
            createSettingRow('Bar Position', barPositionCombo, 'Set the position of the main bar'),
            createSettingRow('Bar Round Corners', barCorners, 'Adjust the roundness of the bar corners'),
            createSettingRow('Screen Rounding', screenRounding, 'Set the screen corner rounding')
        ]),
        createSettingsGroup('Effects', [
            createSettingRow('Layer Smoke Effect', smokeSwitch, 'Enable smoke effect layer'),
            createSettingRow('Smoke Strength', smokeStrength, 'Adjust the intensity of the smoke effect')
        ])
    ]);
    interfacePage.css_classes = ['settings-page'];
    stack.add_titled(interfacePage, 'interface', 'Interface');

    // Overview Page
    const overviewPage = createPage([
        createSettingsGroup('Workspace Layout', [
            createSettingRow('Scale', scale, 'Overall scale of the overview'),
            createSettingRow('Number of Rows', rows, 'Number of workspace rows'),
            createSettingRow('Number of Columns', cols, 'Number of workspace columns')
        ]),
        createSettingsGroup('Workspace Numbers', [
            createSettingRow('Number Scale', wsNumScale, 'Scale of workspace numbers'),
            createSettingRow('Number Margin', wsNumMarginScale, 'Margin around workspace numbers')
        ])
    ]);
    overviewPage.css_classes = ['settings-page'];
    stack.add_titled(overviewPage, 'overview', 'Overview');

    // Sidebar AI Page
    const aiPage = createPage([
        createSettingsGroup('AI Providers', [
            createSettingRow('Default GPT Provider', gptProviderCombo, 'Select your preferred GPT provider'),
            createSettingRow('Search AI', searchAICombo, 'AI to use for search functionality'),
            createSettingRow('Temperature', temperatureScale, 'AI response creativity (higher = more creative)')
        ]),
        createSettingsGroup('AI Features', [
            createSettingRow('Writing Cursor', writingCursor, 'Cursor animation during AI typing'),
            createSettingRow('Enable Enhancements', enhancementsSwitch, 'Enable AI response enhancements'),
            createSettingRow('Use History', historySwitch, 'Remember conversation history'),
            createSettingRow('Safety Mode', safetySwitch, 'Enable content filtering')
        ])
    ]);
    aiPage.css_classes = ['settings-page'];
    stack.add_titled(aiPage, 'ai', 'Sidebar AI');

    // System Page
    const systemPage = createPage([
        createSettingsGroup('Dark Mode', [
            createSettingRow('Auto Dark Mode', darkModeSwitch, 'Automatically switch between light and dark themes'),
            createSettingRow('Dark Mode From', darkModeFrom, 'Start time for dark mode (HH:MM)'),
            createSettingRow('Dark Mode To', darkModeTo, 'End time for dark mode (HH:MM)')
        ]),
        createSettingsGroup('System Settings', [
            createSettingRow('Keyboard Flag', keyboardFlagSwitch, 'Show keyboard layout flag'),
            createSettingRow('Proxy URL', proxyUrl, 'HTTP proxy for network connections')
        ])
    ]);
    systemPage.css_classes = ['settings-page'];
    stack.add_titled(systemPage, 'system', 'System');

    // Animation Page
    const animationPage = createPage([
        createSettingsGroup('Animation Timing', [
            createSettingRow('Choreography Delay', choreographyDelay, 'Delay between animation steps'),
            createSettingRow('Small Duration', smallDuration, 'Duration for small animations'),
            createSettingRow('Large Duration', largeDuration, 'Duration for large animations')
        ])
    ]);
    animationPage.css_classes = ['settings-page'];
    stack.add_titled(animationPage, 'animations', 'Animations');

    // Weather Page
    const weatherPage = createPage([
        createSettingsGroup('Weather Settings', [
            createSettingRow('City', cityEntry, 'Your city name for weather information'),
            createSettingRow('Temperature Unit', unitCombo, 'Preferred temperature unit')
        ])
    ]);
    weatherPage.css_classes = ['settings-page'];
    stack.add_titled(weatherPage, 'weather', 'Weather');

    // Translator Page
    const translatorPage = createPage([
        createSettingsGroup('Translation Settings', [
            createSettingRow('Translate From', fromLangCombo, 'Source language'),
            createSettingRow('Translate To', toLangCombo, 'Target language')
        ])
    ]);
    translatorPage.css_classes = ['settings-page'];
    stack.add_titled(translatorPage, 'translator', 'Translator');

    // Создаем футер
    const footerSeparator = createWidget(Gtk.Separator, {
        orientation: Gtk.Orientation.HORIZONTAL,
        css_classes: ['footer-separator']
    });

    const footerBox = createWidget(Gtk.Box, {
        orientation: Gtk.Orientation.HORIZONTAL,
        halign: Gtk.Align.END,
        css_classes: ['footer-box']
    });

    // Создаем кнопку с спиннером
    const saveButtonBox = createWidget(Gtk.Box, {
        orientation: Gtk.Orientation.HORIZONTAL,
        spacing: 8,
        css_classes: ['save-button-box']
    });

    const saveButtonSpinner = createWidget(Gtk.Spinner, {
        visible: false
    });

    const saveButtonLabel = createWidget(Gtk.Label, {
        label: 'Save & Restart AGS'
    });

    saveButtonBox.append(saveButtonLabel);
    saveButtonBox.append(saveButtonSpinner);

    const saveButton = createWidget(Gtk.Button, {
        css_classes: ['suggested-action', 'save-button']
    });
    saveButton.set_child(saveButtonBox);

    footerBox.append(saveButton);

    // Создаем основной контейнер с прокруткой
    const scrolledWindow = createWidget(Gtk.ScrolledWindow, {
        vexpand: true
    });
    scrolledWindow.set_child(stack);

    // Собираем интерфейс
    const contentBox = createWidget(Gtk.Box, {
        orientation: Gtk.Orientation.VERTICAL,
        hexpand: true
    });

    contentBox.append(scrolledWindow);
    contentBox.append(footerSeparator);  // Добавляем разделитель перед футером
    contentBox.append(footerBox);

    const mainBox = createWidget(Gtk.Box, {
        orientation: Gtk.Orientation.HORIZONTAL
    });

    mainBox.append(sidebar);
    mainBox.append(new Gtk.Separator({ orientation: Gtk.Orientation.VERTICAL }));
    mainBox.append(contentBox);

    win.set_child(mainBox);
    win.present();

    // Обновляем обработчик сохранения
    saveButton.connect('clicked', () => {
        // Отключаем кнопку и показываем спиннер
        saveButton.sensitive = false;
        saveButtonSpinner.visible = true;
        saveButtonSpinner.start();
        saveButtonLabel.label = 'Applying changes...';

        const newValues = {
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
            },
            ai: {
                defaultGPTProvider: ['openrouter', 'openai', 'anthropic'][gptProviderCombo.get_active()],
                onSearch: ['gemini', 'gpt', 'none'][searchAICombo.get_active()],
                defaultTemperature: temperatureScale.get_value(),
                enhancements: enhancementsSwitch.get_active(),
                useHistory: historySwitch.get_active(),
                safety: safetySwitch.get_active(),
                writingCursor: writingCursor.get_text(),
                proxyUrl: proxyUrl.get_text()
            },
            sidebar: {
                translater: {
                    from: Object.keys(languages)[fromLangCombo.get_active()],
                    to: Object.keys(languages)[toLangCombo.get_active()],
                    languages: languages
                }
            },
            bar: {
                position: ['top', 'bottom'][barPositionCombo.get_active()],
                modes: config.bar?.modes || ['normal'],
                wallpaper_folder: config.bar?.wallpaper_folder || ''
            }
        };

        try {
            print('Saving new values:', JSON.stringify(newValues, null, 2));
            
            // Сохраняем конфиг
            const contents = JSON.stringify(newValues, null, 2);
            const success = GLib.file_set_contents(CONFIG_FILE, contents);
            
            if (!success) {
                throw new Error('Failed to save config file');
            }

            // Перезапускаем AGS
            GLib.spawn_command_line_async('killall ags');
            
            // Ждем 2 секунды перед перезапуском
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
                GLib.spawn_command_line_async('ags');
                
                // Возвращаем кнопку в исходное состояние через 1 секунду
                GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
                    saveButton.sensitive = true;
                    saveButtonSpinner.visible = false;
                    saveButtonSpinner.stop();
                    saveButtonLabel.label = 'Save & Restart AGS';
                    return false;
                });
                
                return false;
            });

        } catch (e) {
            print('Error saving config:', e);
            
            // Показываем диалог с ошибкой
            const dialog = new Gtk.MessageDialog({
                transient_for: win,
                modal: true,
                buttons: Gtk.ButtonsType.OK,
                message_type: Gtk.MessageType.ERROR,
                text: 'Error saving configuration',
                secondary_text: e.toString()
            });
            
            dialog.connect('response', () => {
                dialog.destroy();
                // Возвращаем кнопку в исходное состояние
                saveButton.sensitive = true;
                saveButtonSpinner.visible = false;
                saveButtonSpinner.stop();
                saveButtonLabel.label = 'Save & Restart AGS';
            });
            
            dialog.show();
        }
    });
});

app.run([]); 