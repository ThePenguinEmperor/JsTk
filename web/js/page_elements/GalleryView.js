// #region gallery_view
/**
 * GalleryView: a showcase of every widget, grouped into sections of realistic scenes.
 * Each panel spans part of a 12 column grid; wide and short widgets get wide, low panels.
 */
class GalleryView {
    static SECTIONS = [
        {
            title: 'Forms and inputs',
            note: 'Controls people type into, switch and pick from.',
            items: [
                { tag: 'toggle_switch', span: 3, height: 'compact', note: 'On, off and locked switches.' },
                { tag: 'input_with_clr', span: 3, height: 'compact', note: 'Text fields with a clear button.' },
                { tag: 'auto_complete', span: 3, height: 'compact', note: 'Filter a list; the second box only accepts listed values.' },
                { tag: 'animated_gif_button', span: 3, height: 'compact', note: 'Still picture; animates on hover.' },
                { tag: 'list_selector', span: 4, height: 'l', note: 'Move columns between selected, excluded and off.' },
                { tag: 'iterable_editor', span: 4, height: 'l', note: 'Edit lists and dictionaries, including nested values.' },
                { tag: 'dynamic_filter', span: 4, height: 'l', note: 'Switch filters on and off and pick how each matches.' }
            ]
        },
        {
            title: 'Data and feedback',
            note: 'Show tables, logs and the progress of running work.',
            items: [
                { tag: 'table', span: 12, height: 'xl', controls: 'table', note: 'Sortable, filterable grid. Use the buttons to try other data shapes.' },
                { tag: 'progress_bar', span: 12, height: 'short', cols: 2, note: 'Running, finished, failed, waiting and compact bars.' },
                { tag: 'queue_tray', span: 12, height: 'short', note: 'Jobs waiting, running and bundled, in a collapsible tray.' },
                { tag: 'ticker_banner', span: 12, height: 'short', note: 'Scrolling notices in three severities.' },
                { tag: 'output_logger', span: 12, height: 'l', controls: 'output_logger', note: 'Live log with colours, search and zoom. Push it to the extreme with the buttons.' }
            ]
        },
        {
            title: 'Layout',
            note: 'Divide a page into panes and tabs; every pane takes any widget.',
            items: [
                { tag: 'split_pane', span: 6, height: 'l', note: 'Two panes with a draggable divider. Drag it or use arrow keys.' },
                { tag: 'dock_workspace', span: 6, height: 'l', controls: 'dock_workspace', note: 'Titled panes that can be shown, hidden, swapped and rotated.' },
                { tag: 'tabbed_container', span: 12, height: 'm', note: 'Tabs with their own content; pin, close and reorder them.' },
                { tag: 'collapsible_section', span: 12, height: 'compact', cols: 3, note: 'Titled sections that open and close; each takes any content.' }
            ]
        },
        {
            title: 'Dialogs, menus and help',
            note: 'Ask questions, show news and guide new users.',
            items: [
                { tag: 'user_prompt', span: 3, height: 'm', cols: 2, note: 'Six prompt styles.' },
                { tag: 'context_menu', span: 3, height: 'm', cols: 1, note: 'Right-click the areas.' },
                { tag: 'changelog', span: 3, height: 'm', note: 'Remembers the last version seen.' },
                { tag: 'guided_tour', span: 3, height: 'm', note: 'Highlights controls one by one.' },
                { tag: 'popup_overlay', span: 4, height: 'compact', custom: 'Popup Overlay', note: 'A modal panel; closes with Esc, x or a click outside.' },
                { tag: 'message_box', span: 4, height: 'compact', custom: 'Message Box', note: 'Short notices next to the control that caused them.' },
                { tag: 'hint_popup', span: 4, height: 'compact', custom: 'Hint Popup', note: 'Themed tooltips that replace native title hints.' }
            ]
        }
    ];

    static EXAMPLES = {
        input_with_clr: [
            { placeholder: 'Search customers...', value: '' },
            { placeholder: 'Email', value: 'jane@example.com', type: 'email' },
            { placeholder: 'Password', value: 'secret-value', type: 'password' }
        ],
        toggle_switch: [
            { label: 'Email notifications', checked: true },
            { label: 'Dark mode', checked: false },
            { label: 'Managed by admin', checked: true, disabled: true }
        ],
        progress_bar: [
            { value: 0.45, label: 'Uploading files', state: 'running' },
            { value: 1, label: 'Backup complete', state: 'success' },
            { value: 0.72, label: 'Sync failed', state: 'error' },
            { label: 'Waiting for server', indeterminate: true, show_percent: false },
            { value: 0.3, label: 'Compact bar', compact: true },
            { value: 0.88, label: 'Almost there', state: 'running' }
        ],
        context_menu: [
            { area_text: 'Right-click this area for a menu' },
            { area_text: 'Right-click for a searchable menu', enable_search: true }
        ],
        user_prompt: [
            { variant: 'question', button_label: 'Confirm', title: 'Delete file?', text: 'This action cannot be undone.', options: { Delete: true, Cancel: false } },
            { variant: 'question', button_label: 'Three choices', title: 'Unsaved changes', text: 'Save your work before closing?', options: { Save: 'save', Discard: 'discard', Cancel: null } },
            { variant: 'input', button_label: 'Ask for input', title: 'Rename', text: 'Enter a new file name.', input_placeholder: 'File name' },
            { variant: 'password', button_label: 'Ask for password', title: 'Unlock', text: 'Enter your password to continue.' },
            { variant: 'question', button_label: 'Timed (8 s)', title: 'Session expiring', text: 'You will be signed out soon.', options: { 'Stay signed in': true, 'Sign out': false }, timeout: 8 },
            { variant: 'question', button_label: 'Formatted text', title: 'Release notes', allow_html: true, text: 'Version <b>2.4</b> adds <i>dark mode</i>, faster search and <b>3 bug fixes</b>.', options: { Continue: true } }
        ],
        auto_complete: [
            { placeholder: 'Type a fruit...' },
            { placeholder: 'Country (prefix match, list only)', filter_mode: 'prefix', allow_free_text: false,
                items: ['Argentina', 'Australia', 'Austria', 'Belgium', 'Brazil', 'Canada', 'Chile', 'China', 'Denmark', 'Egypt'] }
        ],
        iterable_editor: [
            { mode: 'list', title: 'List editor', value: ['alpha', 42, true, null, [1, 2], { key: 'value' }] },
            { mode: 'dict', title: 'Settings editor', value: { host: 'localhost', port: 5432, debug: true, tags: ['api', 'beta'] } }
        ],
        ticker_banner: [
            { severity: 'info', messages: ['Version 2.4 is available', 'Maintenance window tonight at 22:00'] },
            { severity: 'warning', messages: ['Disk usage is above 85 percent on node 3'] },
            { severity: 'error', messages: ['Connection to the build server was lost'] }
        ],
        split_pane: [
            { orientation: 'horizontal', size: 170, width: 0, height: 0 }
        ],
        dock_workspace: [
            { primary_id: 'editor', secondary_id: 'explorer', panes: { editor: { title: 'Editor - main.js' }, explorer: { title: 'Explorer' } }, default_split: 68, width: 0, height: 0 }
        ],
        collapsible_section: [
            { title: 'Account details', expanded: true },
            { title: 'Notifications', expanded: true },
            { title: 'Advanced (starts closed)', expanded: false }
        ],
        tabbed_container: [
            { width: 0, height: 0 }
        ],
        output_logger: [
            { title: 'Build output', demo_output: true }
        ]
    };

    /**
     * Stores the controller; panels are built when build() runs.
     */
    constructor(controller) {
        this.controller = controller;
        this.container = null;
        this.sections = [];
        this.search_input = null;
        this.category_select = null;
        this.count_label = null;
        this.empty_label = null;
        this.cards = [];
    }

    // #region sample_data
    /**
     * Returns a list of fake rows for the table example.
     */
    static sample_rows(count) {
        let names = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel'];
        let states = ['active', 'paused', 'active', 'failed', 'active', 'paused'];
        let rows = [];
        for (let i = 0; i < count; i++) {
            rows.push({
                id: i + 1,
                name: names[i % names.length] + ' ' + (Math.floor(i / names.length) + 1),
                status: states[i % states.length],
                score: 30 + ((i * 37) % 70),
                owner: ['Jane Doe', 'Sam Lee', 'Maria Garcia', 'Chen Wei'][i % 4],
                active: i % 3 !== 0,
                updated: '2026-01-' + String(10 + (i % 18)).padStart(2, '0') + ' ' + String(8 + (i % 10)).padStart(2, '0') + ':15:00'
            });
        }
        return rows;
    }

    /**
     * Returns the example option sets for a tag; the table builds its rows on demand.
     */
    examples_for(tag) {
        if (tag === 'table') {
            return [{
                data: GalleryView.sample_rows(20),
                enable_selection: true,
                enable_edit: true,
                column_editors: {
                    id: { type: 'readonly' },
                    name: { type: 'text', required: true, max_length: 24 },
                    status: { type: 'select', choices: ['active', 'paused', 'failed'] },
                    score: { type: 'int', min: 0, max: 100 },
                    owner: { type: 'autocomplete', choices: ['Jane Doe', 'Sam Lee', 'Maria Garcia', 'Chen Wei'], allow_free_text: false },
                    active: { type: 'bool' }
                }
            }];
        }
        return GalleryView.EXAMPLES[tag] || null;
    }
    // #endregion sample_data

    // #region building
    /**
     * Builds the toolbar and every section inside the container.
     */
    build(container) {
        this.container = container;
        let toolbar = document.createElement('div');
        toolbar.className = 'tester_gallery_toolbar';
        this.search_input = document.createElement('input');
        this.search_input.className = 'tester_input';
        this.search_input.placeholder = 'Search widgets...';
        this.search_input.style.maxWidth = '320px';
        this.search_input.addEventListener('input', () => this.apply_filter());
        this.category_select = document.createElement('select');
        this.category_select.className = 'tester_select';
        this.category_select.style.maxWidth = '220px';
        this.category_select.addEventListener('change', () => this.apply_filter());
        this.count_label = document.createElement('span');
        this.count_label.className = 'tester_gallery_card_tag';
        toolbar.append(this.search_input, this.category_select, this.count_label);
        this.empty_label = document.createElement('div');
        this.empty_label.className = 'tester_gallery_card_tag';
        this.empty_label.textContent = 'No widgets match the filter.';
        this.empty_label.style.display = 'none';
        container.append(toolbar, this.empty_label);
        this.rebuild_cards();
    }

    /**
     * Builds all sections; registered widgets missing from SECTIONS are added to a final section.
     */
    rebuild_cards() {
        for (let section of this.sections) {
            section.root.remove();
        }
        this.sections = [];
        this.cards = [];
        let listed = new Set();
        for (let section of GalleryView.SECTIONS) {
            section.items.forEach(item => listed.add(item.tag));
            this.add_section(section.title, section.note, section.items);
        }
        let extra = WidgetRegistry.list_tags().filter(tag => !listed.has(tag)).map(tag => ({ tag, span: 4, height: 'm', note: WidgetRegistry.get(tag).label }));
        if (extra.length > 0) {
            this.add_section('More widgets', 'Registered widgets that are not placed in a section yet.', extra);
        }
        this.fill_categories();
        this.apply_filter();
    }

    /**
     * Builds one section: a heading and a grid of panels.
     */
    add_section(title, note, items) {
        let root = document.createElement('section');
        root.className = 'tester_showcase_section';
        let head = document.createElement('div');
        head.className = 'tester_showcase_head';
        let heading = document.createElement('h2');
        heading.textContent = title;
        let sub = document.createElement('p');
        sub.textContent = note;
        head.append(heading, sub);
        let grid = document.createElement('div');
        grid.className = 'tester_gallery_grid';
        root.append(head, grid);
        this.container.appendChild(root);
        let section = { root, title, cards: [] };
        this.sections.push(section);
        for (let item of items) {
            if (item.custom || WidgetRegistry.get(item.tag)) {
                this.add_card(grid, section, item);
            }
        }
    }

    /**
     * Fills the category dropdown from the sections.
     */
    fill_categories() {
        this.category_select.innerHTML = '';
        for (let name of ['all', ...this.sections.map(section => section.title)]) {
            let option = document.createElement('option');
            option.value = name;
            option.textContent = name === 'all' ? 'All sections' : name;
            this.category_select.appendChild(option);
        }
    }

    /**
     * Returns the code line that creates the widget with default placement.
     */
    snippet_for(tag) {
        return "document.oc.object_generate('" + tag + "', { parent: 'parent_container', row: 1, col: 1, sticky: 'nsew' });";
    }

    /**
     * Copies the creation snippet of one widget.
     */
    copy_snippet(tag, button) {
        let done = () => {
            button.textContent = 'Copied';
            setTimeout(() => { button.textContent = 'Copy code'; }, 1200);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(this.snippet_for(tag)).then(done, error => console.warn('[gallery] copy_failed', error));
        }
    }

    /**
     * Creates one panel: title, note, buttons and a live scene.
     */
    add_card(grid, section, item) {
        let is_widget = !item.custom;
        let entry = is_widget ? WidgetRegistry.get(item.tag) : null;
        let label = entry ? entry.label : item.custom;
        let card = document.createElement('div');
        card.className = 'tester_gallery_card tester_gallery_height_' + (item.height || 'm');
        card.style.setProperty('--span', item.span || 4);
        let head = document.createElement('div');
        head.className = 'tester_gallery_card_head';
        let meta = document.createElement('div');
        meta.className = 'tester_gallery_card_meta';
        let title_row = document.createElement('div');
        title_row.className = 'tester_gallery_card_titlerow';
        let title = document.createElement('span');
        title.className = 'tester_gallery_card_title';
        title.textContent = label;
        let tag_label = document.createElement('span');
        tag_label.className = 'tester_gallery_card_tag';
        tag_label.textContent = item.tag;
        title_row.append(title, tag_label);
        let note = document.createElement('span');
        note.className = 'tester_gallery_card_note';
        note.textContent = item.note || '';
        meta.append(title_row, note);
        head.appendChild(meta);
        if (is_widget) {
            let copy_btn = document.createElement('button');
            copy_btn.className = 'tester_button tester_button_secondary';
            copy_btn.textContent = 'Copy code';
            copy_btn.addEventListener('click', () => this.copy_snippet(item.tag, copy_btn));
            let add_btn = document.createElement('button');
            add_btn.className = 'tester_button';
            add_btn.textContent = 'Add to Creator';
            add_btn.addEventListener('click', () => this.add_to_creator(item.tag));
            head.append(copy_btn, add_btn);
        }
        let body = document.createElement('div');
        body.className = 'tester_gallery_card_body';
        if (item.cols > 1) {
            body.style.gridTemplateColumns = 'repeat(' + item.cols + ', minmax(0, 1fr))';
        }
        card.appendChild(head);
        let bar = null;
        if (item.controls) {
            bar = document.createElement('div');
            bar.className = 'tester_gallery_controls';
            card.appendChild(bar);
        }
        card.appendChild(body);
        grid.appendChild(card);
        this.build_preview(item, body);
        if (bar) {
            this.build_controls(item, bar, body);
        }
        let record = { card, section, search_text: (label + ' ' + item.tag + ' ' + section.title + ' ' + (item.note || '')).toLowerCase() };
        section.cards.push(record);
        this.cards.push(record);
    }

    /**
     * Builds the live preview; a failing widget shows its error instead of breaking the page.
     */
    build_preview(item, body) {
        try {
            if (item.custom) {
                this.build_custom_demo(item, body);
                return;
            }
            this.build_registered_examples(item, body);
        } catch (error) {
            body.textContent = item.tag + ' failed: ' + error.message;
            console.error('[gallery] preview_failed: ' + item.tag, error);
        }
    }

    /**
     * Builds one instance per example option set; widgets without examples use their defaults.
     */
    build_registered_examples(item, body) {
        let samples = this.examples_for(item.tag) || [{}];
        let cols = item.cols || 1;
        body.widget_hosts = [];
        samples.forEach((options, index) => {
            let host = document.oc.object_generate(item.tag, {
                parent: body, row: Math.floor(index / cols) + 1, col: (index % cols) + 1, sticky: 'nsew', options: options
            });
            body.widget_hosts.push(host);
            this.fill_scene(item.tag, host);
        });
    }
    // #endregion building

    // #region controls
    /**
     * Adds a small button to a control bar.
     */
    add_control(bar, text, handler, secondary) {
        let button = this.make(bar, 'tester_button tester_button_small' + (secondary ? ' tester_button_secondary' : ''), text, 'button');
        button.addEventListener('click', handler);
        return button;
    }

    /**
     * Builds the control bar of a panel and wires it to the widget instance.
     */
    build_controls(item, bar, body) {
        let host = body.widget_hosts && body.widget_hosts[0];
        let instance = host ? host.widget_instance : null;
        if (!instance) {
            return;
        }
        this.make(bar, 'tester_gallery_controls_label', 'Try:', 'span');
        if (item.controls === 'table') {
            this.table_controls(bar, instance, body);
        }
        if (item.controls === 'output_logger') {
            this.logger_controls(bar, instance);
        }
        if (item.controls === 'dock_workspace') {
            this.dock_controls(bar, instance);
        }
    }

    /**
     * Returns rows with many columns of different widths to show horizontal overflow.
     */
    static wide_rows(count) {
        let rows = [];
        for (let i = 0; i < count; i++) {
            rows.push({
                id: i + 1,
                customer: 'Customer number ' + (i + 1),
                email: 'user' + (i + 1) + '@example-company.com',
                country: ['Germany', 'France', 'Brazil', 'Japan'][i % 4],
                plan: ['free', 'team', 'enterprise'][i % 3],
                seats: (i * 3) % 40,
                mrr: (i * 137) % 5000,
                created: '2025-0' + (1 + (i % 9)) + '-1' + (i % 9),
                last_seen: '2026-01-1' + (i % 9) + ' 12:30:00',
                owner: 'Jane Doe',
                region: 'eu-west-' + (1 + (i % 3)),
                notes: 'A long note about this account that does not fit in a narrow column ' + i
            });
        }
        return rows;
    }

    /**
     * Buttons that change the table data and the width of the card.
     */
    table_controls(bar, table, body) {
        let show = rows => table.set_data(rows);
        this.add_control(bar, '3 rows', () => show(GalleryView.sample_rows(3)));
        this.add_control(bar, '20 rows', () => show(GalleryView.sample_rows(20)));
        this.add_control(bar, '2000 rows', () => show(GalleryView.sample_rows(2000)));
        this.add_control(bar, '12 columns', () => show(GalleryView.wide_rows(30)));
        this.add_control(bar, 'Empty', () => show([]), true);
        this.add_control(bar, 'Select all', () => table.select_all(), true);
        this.add_control(bar, 'Clear selection', () => table.clear_selection(), true);
        let edit = this.add_control(bar, 'Edit mode: off', () => {
            table.set_edit_mode(!table.is_edit_mode());
            edit.textContent = 'Edit mode: ' + (table.is_edit_mode() ? 'on' : 'off');
        }, true);
        let status = this.make(bar, 'tester_gallery_controls_label', 'Selected: 0', 'span');
        table.options.on_selection_change = rows => { status.textContent = 'Selected: ' + rows.length; };
        table.options.on_edit_rejected = info => MessageBox.error(info.field + ': ' + info.reason, edit, { position: 'bottom', timeout: 3000 });
        let narrow = false;
        let button = this.add_control(bar, 'Narrow card', () => {
            narrow = !narrow;
            body.style.maxWidth = narrow ? '420px' : '';
            button.textContent = narrow ? 'Full width' : 'Narrow card';
        }, true);
    }

    /**
     * Buttons that feed the logger with different kinds and amounts of text.
     */
    logger_controls(bar, logger) {
        let types = ['stdout', 'info', 'warning', 'stderr', 'error'];
        let count = 0;
        this.add_control(bar, 'Add line', () => logger.add_output('Line ' + (++count) + ' at ' + new Date().toLocaleTimeString(), types[count % types.length]));
        this.add_control(bar, '+1000 lines', () => {
            for (let i = 0; i < 1000; i++) {
                logger.add_output('Batch line ' + (++count) + ' ' + 'x'.repeat(i % 60), types[count % types.length]);
            }
        });
        this.add_control(bar, '+50000 lines', () => {
            for (let i = 0; i < 50000; i++) {
                logger.add_output('Stress line ' + (++count), types[count % types.length]);
            }
        });
        this.add_control(bar, 'Very long line', () => logger.add_output('long ' + 'abcdefghij '.repeat(600), 'warning'));
        this.add_control(bar, 'ANSI colours', () => logger.add_output('\x1b[31mred\x1b[0m \x1b[32mgreen\x1b[0m \x1b[1;34mbold blue\x1b[0m \x1b[4munderline\x1b[0m', 'stdout'));
        let timer = null;
        let stream = this.add_control(bar, 'Start stream', () => {
            if (timer) {
                clearInterval(timer);
                timer = null;
                stream.textContent = 'Start stream';
                return;
            }
            stream.textContent = 'Stop stream';
            timer = setInterval(() => logger.add_output('Streaming line ' + (++count), types[count % types.length]), 120);
        });
        let scroll_on = true;
        let scroll_button = this.add_control(bar, 'Auto-scroll: on', () => {
            scroll_on = !scroll_on;
            logger.set_auto_scroll(scroll_on);
            scroll_button.textContent = 'Auto-scroll: ' + (scroll_on ? 'on' : 'off');
        }, true);
        this.add_control(bar, 'Clear', () => logger.clear_output(), true);
    }

    /**
     * Buttons that show, hide, swap and rotate the dock panes.
     */
    dock_controls(bar, dock) {
        let toggle = this.add_control(bar, 'Hide explorer', () => {
            if (dock.is_secondary_visible()) {
                dock.hide_secondary();
            } else {
                dock.show_secondary();
            }
            toggle.textContent = dock.is_secondary_visible() ? 'Hide explorer' : 'Show explorer';
            this.file_tree(dock.get_pane_body('explorer'));
            this.code_view(dock.get_pane_body('editor'));
        });
        this.add_control(bar, 'Swap panes', () => dock.swap_panes(), true);
        this.add_control(bar, 'Rotate', () => dock.toggle_orientation(), true);
    }
    // #endregion controls

    // #region popup_demos
    /**
     * Builds the demo buttons of the widgets that are not registered.
     */
    build_custom_demo(item, body) {
        let row = this.make(body, 'tester_demo_buttons');
        if (item.tag === 'popup_overlay') {
            this.add_control(row, 'Open popup', () => this.open_popup(false));
            this.add_control(row, 'Open large popup', () => this.open_popup(true), true);
        }
        if (item.tag === 'message_box') {
            for (let type of ['info', 'success', 'warning', 'error']) {
                let button = this.add_control(row, type, () => MessageBox[type]('This is a ' + type + ' message.', button, { position: 'bottom', timeout: 4000 }), type !== 'info');
            }
        }
        if (item.tag === 'hint_popup') {
            let flavors = [
                ['Default', '', 'A plain themed hint instead of the native tooltip.'],
                ['Info', 'info', 'Info: results are cached for five minutes.'],
                ['Success', 'success', 'Success: the file was saved.'],
                ['Warning', 'warning', 'Warning: this action affects 12 other items.'],
                ['Error', 'error', 'Error: the connection to the server failed.']
            ];
            for (let [text, type, hint] of flavors) {
                let button = this.add_control(row, text, () => HintPopup.show(hint, button, { type: type }), text !== 'Default');
                button.setAttribute('title', hint);
                HintPopup.set_type(button, type);
            }
            this.make(row, 'tester_gallery_card_tag', 'Hover for a hint, click to show it at once.', 'span');
        }
    }

    /**
     * Opens a popup with a short form or a long scrolling text.
     */
    open_popup(large) {
        let popup = new PopupOverlay(content => {
            this.make(content, 'tester_message_title', large ? 'Terms of use' : 'Rename project');
            if (large) {
                for (let i = 1; i <= 14; i++) {
                    this.make(content, 'tester_message_text', 'Section ' + i + '. The content of a popup scrolls inside the panel when it is taller than the window.');
                }
                return;
            }
            let input = this.make(content, 'tester_input', undefined, 'input');
            input.value = 'My project';
            let row = this.make(content, 'tester_message_actions');
            this.add_control(row, 'Save', () => popup.close());
            this.add_control(row, 'Cancel', () => popup.close(), true);
        }, large ? { width: 520, height: 360 } : { width: 320 });
        popup.open();
    }
    // #endregion popup_demos


    // #region scenes
    /**
     * Puts different realistic content into each pane of a container widget.
     */
    fill_scene(tag, host) {
        let instance = host.widget_instance;
        if (!instance) {
            return;
        }
        try {
            if (tag === 'split_pane') {
                this.nav_list(instance.pane_a, ['Inbox', 'Starred', 'Sent', 'Drafts', 'Archive'], 0);
                this.message_view(instance.pane_b);
            }
            if (tag === 'dock_workspace') {
                this.file_tree(instance.get_pane_body('explorer'));
                this.code_view(instance.get_pane_body('editor'));
            }
            if (tag === 'collapsible_section') {
                let box = host.content_container;
                if (instance.title === 'Account details') {
                    this.key_values(box);
                } else if (instance.title === 'Notifications') {
                    this.settings_panel(box);
                } else {
                    this.make(box, 'tester_message_text', 'Rarely used options live here. Sections can be nested and hold any widget.');
                }
            }
            if (tag === 'tabbed_container') {
                this.stat_tiles(instance.get_content_div('overview'));
                this.key_values(instance.get_content_div('details'));
                this.settings_panel(instance.get_content_div('settings'));
            }
        } catch (error) {
            console.warn('[gallery] scene_failed: ' + tag, error);
        }
    }

    /**
     * Returns a new div with a class inside a parent.
     */
    make(parent, class_name, text, tag_name) {
        let el = document.createElement(tag_name || 'div');
        el.className = class_name;
        if (text !== undefined) {
            el.textContent = text;
        }
        if (parent) {
            parent.appendChild(el);
        }
        return el;
    }

    /**
     * Adds a vertical navigation list with one active entry.
     */
    nav_list(pane, labels, active) {
        let nav = this.make(pane, 'tester_nav');
        labels.forEach((label, index) => {
            let entry = this.make(nav, 'tester_nav_item' + (index === active ? ' tester_nav_item_active' : ''), label);
            this.make(entry, 'tester_nav_count', String((index * 7 + 3) % 12));
        });
    }

    /**
     * Adds a mail style message preview.
     */
    message_view(pane) {
        let view = this.make(pane, 'tester_message');
        this.make(view, 'tester_message_title', 'Weekly build summary');
        this.make(view, 'tester_message_meta', 'build-bot  /  today 09:14');
        this.make(view, 'tester_message_text', 'All 214 tests passed on the main branch. Two warnings were reported by the linter and one benchmark ran 4 percent slower than last week.');
        let row = this.make(view, 'tester_message_actions');
        this.make(row, 'tester_button tester_button_small', 'Reply', 'button');
        this.make(row, 'tester_button tester_button_secondary tester_button_small', 'Archive', 'button');
    }

    /**
     * Adds a small file tree.
     */
    file_tree(pane) {
        let tree = this.make(pane, 'tester_tree');
        for (let line of ['src', '  app.js', '  theme.css', '  widgets', '    table.js', '    tabs.js', 'docs', '  readme.md', 'package.json']) {
            let depth = line.length - line.trimStart().length;
            let row = this.make(tree, 'tester_tree_row' + (line.trim() === 'app.js' ? ' tester_tree_row_active' : ''), line.trim());
            row.style.paddingLeft = (8 + depth * 6) + 'px';
        }
    }

    /**
     * Adds a code editor look with line numbers.
     */
    code_view(pane) {
        let code = this.make(pane, 'tester_code_view');
        let lines = [
            'import { Table } from "./widgets/table.js";',
            '',
            'const grid = new Table(host, {',
            '    data: rows,',
            '    search: true,',
            '});',
            '',
            'grid.on("select", row => open(row.id));'
        ];
        lines.forEach((text, index) => {
            let row = this.make(code, 'tester_code_row');
            this.make(row, 'tester_code_no', String(index + 1), 'span');
            this.make(row, 'tester_code_text', text, 'span');
        });
    }

    /**
     * Adds three statistic tiles.
     */
    stat_tiles(pane) {
        let tiles = this.make(pane, 'tester_tiles');
        for (let [value, label] of [['1,284', 'Visitors'], ['64%', 'Conversion'], ['$9.8k', 'Revenue']]) {
            let tile = this.make(tiles, 'tester_tile');
            this.make(tile, 'tester_tile_value', value);
            this.make(tile, 'tester_tile_label', label);
        }
    }

    /**
     * Adds a list of label and value pairs.
     */
    key_values(pane) {
        let list = this.make(pane, 'tester_kv');
        for (let [key, value] of [['Owner', 'Jane Doe'], ['Created', '2026-01-12'], ['Region', 'eu-west'], ['Plan', 'Team (12 seats)']]) {
            let row = this.make(list, 'tester_kv_row');
            this.make(row, 'tester_kv_key', key, 'span');
            this.make(row, 'tester_kv_value', value, 'span');
        }
    }

    /**
     * Adds toggle switches as a settings page.
     */
    settings_panel(pane) {
        let panel = this.make(pane, 'tester_settings');
        [{ label: 'Send weekly report', checked: true }, { label: 'Show previews', checked: true }, { label: 'Compact layout', checked: false }]
            .forEach(options => document.oc.object_generate('toggle_switch', { parent: panel, options: options }));
    }
    // #endregion scenes

    // #region actions
    /**
     * Adds the widget to the Creator preview grid below the existing ones and shows the Creator tab.
     */
    add_to_creator(tag) {
        let rows = this.controller.widgets
            .filter(widget => widget.parent_id === this.controller.preview_grid_id)
            .map(widget => widget.row || 1);
        let next_row = rows.length > 0 ? Math.max(...rows) + 1 : 1;
        let params = { tag: tag, row: next_row, col: 1, sticky: 'nsew' };
        let samples = this.examples_for(tag);
        if (samples && WidgetRegistry.get(tag)) {
            params.options = samples[0];
        }
        let widget_id = this.controller.add_widget(params);
        this.controller.show_tab('creator');
        let widget = this.controller.get_widget(widget_id);
        if (widget && this.controller.object_generator) {
            this.controller.object_generator.set_edit_mode(widget);
        }
    }

    /**
     * Hides panels that do not match the search text or section, hides empty sections and updates the count.
     */
    apply_filter() {
        let needle = this.search_input.value.trim().toLowerCase();
        let category = this.category_select.value || 'all';
        let shown = 0;
        for (let item of this.cards) {
            let visible = (needle === '' || item.search_text.includes(needle)) && (category === 'all' || item.section.title === category);
            item.card.style.display = visible ? '' : 'none';
            shown += visible ? 1 : 0;
        }
        for (let section of this.sections) {
            section.root.style.display = section.cards.some(item => item.card.style.display !== 'none') ? '' : 'none';
        }
        this.count_label.textContent = shown + ' of ' + this.cards.length;
        this.empty_label.style.display = shown === 0 ? '' : 'none';
    }
    // #endregion actions
}
// #endregion gallery_view
