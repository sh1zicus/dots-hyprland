#!/usr/bin/gjs
imports.gi.versions.Gtk = '4.0';
imports.gi.versions.Adw = '1';

const { Gtk, Adw, Gio, GLib } = imports.gi;
const ByteArray = imports.byteArray;

// Утилиты для работы с файлами
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

// Загружаем конфигурацию
const HOME = GLib.get_home_dir();
const CONFIG_PATH = `${HOME}/.config/ags/modules/.configuration/user_options.default.json`;

let config;
try {
    const contents = readFileSync(CONFIG_PATH);
    config = JSON.parse(contents);
} catch (error) {
    console.error('Error reading config:', error);
    config = {};
}

// Инициализируем приложение
Adw.init();

const app = new Adw.Application({
    application_id: 'org.gnome.AGSTweaks'
});

app.connect('activate', () => {
    const win = new Adw.ApplicationWindow({
        application: app,
        default_width: 1000,
        default_height: 680,
        title: 'Settings'
    });

    // Передаем window в createMainView
    const mainView = createMainView(win);
    win.set_content(mainView);
    win.present();
});

function createMainView(window) {
    const mainBox = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        vexpand: true
    });

    // Правая часть с основным контентом
    const rightBox = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        hexpand: true
    });

    const mainHeader = new Gtk.HeaderBar({
        show_title_buttons: true,
        css_classes: ['flat']
    });

    const headerTitle = new Gtk.Label({
        label: 'Внешний вид'
    });

    mainHeader.set_title_widget(headerTitle);
    rightBox.append(mainHeader);

    // Фиксированный контейнер для сайдбара
    const sidebarContainer = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        width_request: 240,
        vexpand: true,
        hexpand: false,
        css_classes: ['sidebar-container']
    });

    // Внутренний контейнер, который может расширяться
    const leftBox = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        vexpand: true,
        hexpand: true
    });

    // Заголовок сайдбара
    const sidebarHeader = new Gtk.HeaderBar({
        show_title_buttons: false,
        css_classes: ['flat'],
        hexpand: true
    });

    const sidebarTitle = new Gtk.Label({
        label: 'Настройки',
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

    // Поиск
    const searchEntry = new Gtk.SearchEntry({
        placeholder_text: 'Поиск',
        margin_start: 12,
        margin_end: 12,
        margin_top: 6,
        margin_bottom: 6,
        visible: false,
        hexpand: true
    });

    // Список с возможностью расширения
    const listBox = new Gtk.ListBox({
        selection_mode: Gtk.SelectionMode.SINGLE,
        css_classes: ['navigation-sidebar'],
        hexpand: true
    });

    // Контейнер для основного контента
    const contentStack = new Gtk.Stack({
        transition_type: Gtk.StackTransitionType.CROSSFADE,
        hexpand: true
    });

    // Создаем вкладки и контент
    const pages = [
        {
            id: 'appearance',
            title: 'Внешний вид',
            icon: 'preferences-desktop-appearance-symbolic',
            content: createAppearancePage()
        },
        {
            id: 'windows',
            title: 'Окна',
            icon: 'preferences-system-windows-symbolic',
            content: createWindowsPage()
        },
        {
            id: 'keyboard',
            title: 'Клавиатура',
            icon: 'input-keyboard-symbolic',
            content: createKeyboardPage()
        }
    ];

    pages.forEach(page => {
        // Создаем элемент сайдбара
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

        // Добавляем страницу в stack
        contentStack.add_named(page.content, page.id);
    });

    // Обновляем заголовок при переключении
    listBox.connect('row-selected', (box, row) => {
        if (row) {
            const pageTitle = row.get_child().get_last_child().get_label();
            headerTitle.set_label(pageTitle);
            contentStack.set_visible_child_name(row.name);
        }
    });

    // Выбираем первую вкладку по умолчанию
    listBox.select_row(listBox.get_row_at_index(0));

    rightBox.append(contentStack);

    searchButton.connect('toggled', () => {
        searchEntry.visible = searchButton.active;
    });

    leftBox.append(sidebarHeader);
    leftBox.append(searchEntry);
    leftBox.append(listBox);

    // Добавляем внутренний контейнер в фиксированный
    sidebarContainer.append(leftBox);

    // Добавляем контейнеры в основной бокс
    mainBox.append(sidebarContainer);
    mainBox.append(rightBox);

    window.connect('close-request', () => {
        app.quit();
    });

    return mainBox;
}

function createAppearancePage() {
    const box = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 12,
        margin_start: 12,
        margin_end: 12,
        margin_top: 12
    });

    const group = new Adw.PreferencesGroup({
        title: 'Тема'
    });

    const row = new Adw.ActionRow({
        title: 'Тёмный режим',
        subtitle: 'Переключить тёмную тему'
    });

    const toggle = new Gtk.Switch({
        active: true,
        valign: Gtk.Align.CENTER
    });

    row.add_suffix(toggle);
    group.add(row);
    box.append(group);

    return box;
}

function createWindowsPage() {
    const box = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 12,
        margin_start: 12,
        margin_end: 12,
        margin_top: 12
    });

    const group = new Adw.PreferencesGroup({
        title: 'Поведение окон'
    });

    const row = new Adw.ActionRow({
        title: 'Фокус по наведению',
        subtitle: 'Окна активируются при наведении курсора'
    });

    const toggle = new Gtk.Switch({
        valign: Gtk.Align.CENTER
    });

    row.add_suffix(toggle);
    group.add(row);
    box.append(group);

    return box;
}

function createKeyboardPage() {
    const box = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 12,
        margin_start: 12,
        margin_end: 12,
        margin_top: 12
    });

    const group = new Adw.PreferencesGroup({
        title: 'Раскладка'
    });

    const row = new Adw.ActionRow({
        title: 'Переключение раскладки',
        subtitle: 'Alt + Shift'
    });

    const button = new Gtk.Button({
        label: 'Изменить',
        valign: Gtk.Align.CENTER
    });

    row.add_suffix(button);
    group.add(row);
    box.append(group);

    return box;
}

function createWelcomePage() {
    const welcomeBox = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        valign: Gtk.Align.CENTER,
        halign: Gtk.Align.CENTER,
        vexpand: true,
        spacing: 12
    });

    const icon = new Gtk.Image({
        icon_name: 'preferences-system-symbolic',
        pixel_size: 128,
        css_classes: ['dim-label']
    });

    const title = new Gtk.Label({
        label: 'Welcome to Settings',
        css_classes: ['title-1']
    });

    const subtitle = new Gtk.Label({
        label: 'Choose a category from the sidebar',
        css_classes: ['dim-label']
    });

    welcomeBox.append(icon);
    welcomeBox.append(title);
    welcomeBox.append(subtitle);

    return welcomeBox;
}

app.run([]); 