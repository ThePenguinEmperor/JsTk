/**
 * Table: data grid widget on AG Grid Community with search, column value filters,
 * a cell context menu, keyboard copy, column actions and CSV-style export through a host callback.
 */
class Table {
    static ENGINE_URL = 'https://cdn.jsdelivr.net/npm/ag-grid-community@31.3.4/dist/ag-grid-community.min.js';
    static LEGACY_CSS_URLS = [
        'https://cdn.jsdelivr.net/npm/ag-grid-community@31.3.4/styles/ag-grid.css',
        'https://cdn.jsdelivr.net/npm/ag-grid-community@31.3.4/styles/ag-theme-alpine.css'
    ];
    static ROW_ID_KEY = '_tbl_row_idx';
    static SELECT_COL = '_tbl_select';
    static SCRIPT_URL = document.currentScript ? document.currentScript.src : '';
    static engine_promise = null;
    static instance_count = 0;
    static ICONS = {
        refresh: '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9"/><path d="M13.5 2.5v3h-3"/></svg>',
        save: '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2.5 2.5h9l2 2v9h-11z"/><path d="M5 2.5v3.5h5V2.5"/><rect x="4.5" y="9" width="7" height="4.5"/></svg>',
        filter: '<svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor"><path d="M1.5 2h13l-5 6v5.5l-3-1.5V8z"/></svg>',
        copy: '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="5" width="8.5" height="9" rx="1"/><path d="M3 11V2.5h7.5"/></svg>',
        edit: '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2.5 13.5l.7-3L11 2.7l2.3 2.3L5.5 12.8z"/><path d="M9.8 3.9l2.3 2.3"/></svg>',
        clear_filter: '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1.5 2h10l-4 5v5l-2.5-1.5V7z"/><path d="M11 10l4 4M15 10l-4 4"/></svg>'
    };

    /**
     * Builds the table inside a container element or CSS selector.
     * @throws {Error} When the container cannot be resolved.
     */
    constructor(container, options = {}) {
        let el = typeof container === 'string' ? document.querySelector(container) : container;
        if (!(el instanceof HTMLElement)) {
            throw new Error('Table container not found: ' + container);
        }
        Table.instance_count += 1;
        this.uid = 'tbl_' + Table.instance_count;
        this.container = el;
        this.options = Object.assign(Table.default_options(), options);
        this.options.filter_popup = Object.assign({ apply_text: 'Apply' }, options.filter_popup || {});
        this.grid = null;
        this.grid_api = null;
        this.original_data = [];
        this.filtered_data = null;
        this.column_order = Array.isArray(options.initial_column_order) ? options.initial_column_order.slice() : null;
        this.filter_state = {};
        this.search_term = '';
        this.column_fields = [];
        this.use_id_field = false;
        this.saved_scroll = null;
        this.edit_mode = false;
        this.edit_button = null;
        this.search_box = null;
        this.search_input = null;
        this.menu = null;
        this.popup = null;
        this.popup_list = null;
        this.popup_field = null;
        this.loading_el = null;
        this.hint_timer = null;
        this.hint_anchor = null;
        this.header_observer = null;
        this.resize_observer = null;
        this.on_doc_mousedown = null;
        this.container.classList.add('tbl_root');
        if (this.options.inject_default_css) {
            Table.ensure_css();
        }
        this.apply_custom_css(this.options.custom_css);
        this.build_dom();
        if (this.options.enable_filter) {
            this.build_filter_popup();
        }
        this.build_header_controls();
        this.bind_events();
        if (this.options.enable_edit && this.options.edit_on_start) {
            this.set_edit_mode(true);
        }
        if (typeof this.options.fetch_data === 'function' && !this.options.initial_data) {
            this.update();
        } else if (this.options.initial_data) {
            this.set_data(this.options.initial_data, this.options.initial_column_order);
        }
    }

    // #region setup
    /**
     * Returns a fresh copy of the default options.
     */
    static default_options() {
        return {
            fetch_data: null,
            initial_data: null,
            initial_column_order: null,
            on_save: null,
            on_error: null,
            on_grid_ready: null,
            on_grid_size_changed: null,
            enable_search: false,
            enable_refresh: true,
            enable_save: true,
            enable_selection: false,
            enable_edit: false,
            edit_on_start: false,
            on_selection_change: null,
            on_cell_edit: null,
            on_edit_rejected: null,
            column_editors: null,
            enable_filter: true,
            enable_context_menu: true,
            select_row_on_context_menu: false,
            context_menu_items: null,
            loading_text: 'Loading data...',
            empty_state_message: 'No data to display',
            default_col_def: { resizable: true, sortable: true, filter: false },
            column_actions: null,
            column_defs_override: null,
            column_tooltips: null,
            action_column: null,
            autosize_columns: true,
            grid_options: {},
            inject_default_css: true,
            custom_css: null,
            theme: null,
            ag_grid_cdn: Table.ENGINE_URL,
            ag_grid_css_urls: Table.LEGACY_CSS_URLS
        };
    }

    /**
     * Links the widget stylesheet once per page, resolved next to this script.
     */
    static ensure_css() {
        let href = Table.SCRIPT_URL ? new URL('Table.css', Table.SCRIPT_URL).href : 'web/js/widgets/Table/Table.css';
        Table.add_link('tbl_css', href);
    }

    /**
     * Appends a stylesheet link to the head unless an element with that id exists.
     */
    static add_link(id, href) {
        if (document.getElementById(id)) {
            return;
        }
        let link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
    }

    /**
     * Clears the container and creates the optional header bar and the grid area.
     */
    build_dom() {
        let o = this.options;
        this.container.innerHTML = '';
        this.header_el = null;
        if (o.enable_search || o.enable_refresh || o.enable_save || o.enable_edit) {
            this.header_el = document.createElement('div');
            this.header_el.className = 'tbl_header';
            this.container.appendChild(this.header_el);
        }
        this.grid_el = document.createElement('div');
        this.grid_el.className = 'tbl_grid ag-theme-alpine';
        this.container.appendChild(this.grid_el);
    }

    /**
     * Creates the search box, refresh and save buttons, each only when enabled.
     */
    build_header_controls() {
        let o = this.options;
        if (!this.header_el) {
            return;
        }
        if (o.enable_search) {
            this.build_search();
        }
        if (o.enable_refresh) {
            this.make_button(Table.ICONS.refresh, 'Refresh Table', () => {
                this.clear_search_box();
                this.refresh();
            });
        }
        if (o.enable_edit) {
            this.edit_button = this.make_button(Table.ICONS.edit, 'Edit mode', () => this.set_edit_mode(!this.edit_mode));
            this.edit_button.setAttribute('aria-pressed', 'false');
        }
        if (o.enable_save) {
            this.make_button(Table.ICONS.save, 'Save Table', () => this.save());
        }
    }

    /**
     * Creates the header search box; uses InputWithClr when loaded, else a plain input.
     */
    build_search() {
        let holder = document.createElement('div');
        holder.className = 'tbl_search';
        this.header_el.appendChild(holder);
        if (window.InputWithClr) {
            this.search_box = new InputWithClr(holder, {
                placeholder: 'Search table...',
                type: 'search',
                input_attrs: { autocomplete: 'search' },
                on_input: value => this.apply_search(value)
            });
            return;
        }
        this.search_input = document.createElement('input');
        this.search_input.className = 'tbl_search_input';
        this.search_input.type = 'search';
        this.search_input.placeholder = 'Search table...';
        this.search_input.setAttribute('autocomplete', 'search');
        this.search_input.addEventListener('input', () => this.apply_search(this.search_input.value));
        holder.appendChild(this.search_input);
    }

    /**
     * Adds a focusable icon button to the header; Enter and Space also activate it.
     */
    make_button(icon_html, title, handler) {
        let btn = document.createElement('span');
        btn.className = 'tbl_btn';
        btn.tabIndex = 0;
        btn.title = title;
        btn.setAttribute('role', 'button');
        btn.innerHTML = icon_html;
        btn.addEventListener('click', handler);
        btn.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handler();
            }
        });
        this.header_el.appendChild(btn);
        return btn;
    }

    /**
     * Wires the context menu, keyboard copy and container resize handling.
     */
    bind_events() {
        if (this.options.enable_context_menu) {
            this.grid_el.addEventListener('contextmenu', e => this.handle_context_menu(e));
            this.grid_el.addEventListener('keydown', e => this.handle_copy_key(e));
        }
        if (window.ResizeObserver) {
            this.resize_observer = new ResizeObserver(() => {
                if (!this.options.autosize_columns && this.grid_api) {
                    this.grid_api.sizeColumnsToFit();
                }
            });
            this.resize_observer.observe(this.container);
        }
    }
    // #endregion setup

    // #region data
    /**
     * Fetches rows through fetch_data and renders them, keeping column filters.
     */
    async update() {
        let fetch_data = this.options.fetch_data;
        if (typeof fetch_data !== 'function') {
            this.report_error('No fetch_data function provided');
            return;
        }
        this.saved_scroll = this.read_scroll();
        this.show_loading(true);
        try {
            let result = (await fetch_data()) || {};
            this.show_loading(false);
            if (result.error) {
                this.report_error(result.error);
                return;
            }
            if (!Array.isArray(result.data) || !result.data.length) {
                if (this.grid) {
                    this.grid.setGridOption('rowData', []);
                }
                return;
            }
            if (Array.isArray(result.column_order) && result.column_order.length) {
                this.column_order = result.column_order.slice();
            }
            this.store_rows(result.data);
            this.filtered_data = this.filter_rows(null);
            await this.render(this.view_rows());
            this.update_filter_icons();
        } catch (error) {
            this.show_loading(false);
            this.report_error('Failed to load data: ' + error.message);
        }
    }

    /**
     * Reloads data through fetch_data without returning the promise.
     */
    refresh() {
        this.update();
    }

    /**
     * Replaces the rows without fetching; does not re-apply filters or search.
     */
    async set_data(data, column_order) {
        if (column_order) {
            this.column_order = column_order.slice();
        }
        this.store_rows(Array.isArray(data) ? data : []);
        this.filtered_data = null;
        await this.render(this.original_data);
    }

    /**
     * Stores a copy of the rows and assigns hidden positional ids when rows have no own id.
     */
    store_rows(rows) {
        let first = rows[0];
        this.original_data = rows.slice();
        this.use_id_field = !!first && typeof first === 'object' && Object.prototype.hasOwnProperty.call(first, 'id');
        if (this.use_id_field) {
            return;
        }
        rows.forEach((row, idx) => {
            if (row && typeof row === 'object') {
                Object.defineProperty(row, Table.ROW_ID_KEY, { value: String(idx), configurable: true, writable: true, enumerable: false });
            }
        });
    }

    /**
     * Returns the rows that should be displayed: filtered (if any) then searched.
     */
    view_rows() {
        let base = this.filtered_data || this.original_data;
        let term = this.search_term.toLowerCase();
        if (!term) {
            return base;
        }
        return base.filter(row => Table.row_matches(row, term));
    }

    /**
     * True when any own enumerable field of the row contains the lowercase term.
     */
    static row_matches(row, term) {
        if (!row || typeof row !== 'object') {
            return false;
        }
        return Object.keys(row).some(key => row[key] !== null && row[key] !== undefined && String(row[key]).toLowerCase().includes(term));
    }

    /**
     * Pushes rows into the existing grid, or renders a grid when none exists yet.
     */
    show_rows(rows) {
        if (this.grid) {
            this.grid.setGridOption('rowData', rows);
            return;
        }
        this.render(rows);
    }

    /**
     * Returns the rows shown by the grid in display order, or the stored rows without a grid.
     */
    displayed_rows() {
        let rows = [];
        if (!this.grid_api) {
            return (this.filtered_data || this.original_data).slice();
        }
        this.grid_api.forEachNodeAfterFilterAndSort(node => {
            if (node.data) {
                rows.push(node.data);
            }
        });
        return rows;
    }

    /**
     * Exports the displayed rows through on_save and downloads the returned blob.
     */
    async save() {
        let on_save = this.options.on_save;
        if (typeof on_save !== 'function') {
            this.report_error('No on_save function provided');
            return;
        }
        try {
            let result = (await on_save(this.displayed_rows())) || {};
            if (!result.blob) {
                throw new Error('on_save returned no blob');
            }
            let url = URL.createObjectURL(result.blob);
            let link = document.createElement('a');
            link.href = url;
            link.download = result.filename || 'table.csv';
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (error) {
            this.report_error('Save failed: ' + error.message);
        }
    }

    /**
     * Filters the displayed rows by text; an empty term restores the unsearched rows.
     * @param {string} search_value - Term to use; when empty, the search box value is read.
     */
    apply_search(search_value) {
        let term = search_value;
        if (term === undefined || term === null || term === '') {
            term = this.get_search_box_value();
        }
        this.search_term = String(term || '').trim();
        this.show_rows(this.view_rows());
    }

    /**
     * Returns the current search box text, or an empty string.
     */
    get_search_box_value() {
        if (this.search_box) {
            return this.search_box.get_value();
        }
        return this.search_input ? this.search_input.value : '';
    }

    /**
     * Empties the search box and the active search term.
     */
    clear_search_box() {
        this.search_term = '';
        if (this.search_box) {
            this.search_box.set_value('');
        } else if (this.search_input) {
            this.search_input.value = '';
        }
    }
    // #endregion data

    // #region grid
    /**
     * Loads the grid engine once per page; legacy theme also links the engine stylesheets.
     * @returns {Promise<Object>} The agGrid global.
     */
    static load_engine_script(url, css_urls) {
        if (Array.isArray(css_urls)) {
            css_urls.forEach((href, idx) => Table.add_link('tbl_engine_css_' + idx, href));
        }
        if (window.agGrid) {
            return Promise.resolve(window.agGrid);
        }
        if (!Table.engine_promise) {
            Table.engine_promise = new Promise((resolve, reject) => {
                let script = document.createElement('script');
                script.src = url;
                script.onload = () => (window.agGrid ? resolve(window.agGrid) : reject(new Error('agGrid global missing')));
                script.onerror = () => {
                    Table.engine_promise = null;
                    reject(new Error('cannot load ' + url));
                };
                document.head.appendChild(script);
            });
        }
        return Table.engine_promise;
    }

    /**
     * Returns the grid engine, reporting an error and returning null when it cannot load.
     */
    async load_engine() {
        let legacy = this.options.theme === 'legacy';
        try {
            return await Table.load_engine_script(this.options.ag_grid_cdn, legacy ? this.options.ag_grid_css_urls : null);
        } catch (error) {
            this.report_error('Failed to load grid engine: ' + error.message);
            return null;
        }
    }

    /**
     * Shows rows; swaps them in place when the column set is unchanged, else rebuilds the grid.
     */
    async render(display_rows) {
        let engine = await this.load_engine();
        if (!engine) {
            return;
        }
        let fields = this.compute_fields();
        if (this.grid && Table.same_set(fields, this.column_fields)) {
            this.grid.setGridOption('rowData', display_rows);
            return;
        }
        this.destroy_grid();
        this.column_fields = fields;
        this.grid = engine.createGrid(this.grid_el, this.build_grid_options(fields, display_rows));
        if (this.options.enable_filter) {
            this.observe_header();
        }
    }

    /**
     * True when both arrays hold the same values regardless of order.
     */
    static same_set(a, b) {
        if (a.length !== b.length) {
            return false;
        }
        let set_b = new Set(b);
        return a.every(item => set_b.has(item));
    }

    /**
     * Column fields from the first row, ordered by column_order, plus override and action fields.
     */
    compute_fields() {
        let o = this.options;
        let first = this.original_data[0];
        let keys = first && typeof first === 'object' ? Object.keys(first) : [];
        let fields = [];
        let add = field => {
            if (!fields.includes(field)) {
                fields.push(field);
            }
        };
        (this.column_order || []).filter(field => keys.includes(field)).forEach(add);
        keys.forEach(add);
        Object.keys(o.column_defs_override || {}).forEach(add);
        if (o.action_column && o.action_column.field) {
            add(o.action_column.field);
        }
        return fields;
    }

    /**
     * Builds the engine options; widget event handlers always override grid_options.
     */
    build_grid_options(fields, rows) {
        let o = this.options;
        let base = {
            columnDefs: this.build_column_defs(fields),
            rowData: rows,
            getRowId: params => this.row_id_of(params.data),
            defaultColDef: Object.assign({}, o.default_col_def),
            domLayout: 'normal',
            overlayNoRowsTemplate: '<span class="tbl_empty">' + Table.escape_html(o.empty_state_message) + '</span>'
        };
        if (o.theme && o.theme !== 'legacy') {
            base.theme = o.theme;
        }
        if (o.enable_selection) {
            base.rowSelection = 'multiple';
            base.suppressRowClickSelection = true;
            base.onSelectionChanged = () => this.handle_selection_changed();
        }
        if (o.enable_edit) {
            base.suppressClickEdit = !this.edit_mode;
            base.stopEditingWhenCellsLoseFocus = true;
            base.onCellValueChanged = params => this.handle_cell_edit(params);
        }
        return Object.assign(base, o.grid_options || {}, {
            onGridReady: params => this.handle_grid_ready(params),
            onGridSizeChanged: params => this.handle_grid_size_changed(params),
            onCellMouseOver: params => this.handle_cell_over(params),
            onCellMouseOut: () => this.cancel_hint()
        });
    }

    /**
     * Builds all column definitions; the checkbox column comes first when selection is enabled.
     */
    build_column_defs(fields) {
        let defs = fields.map(field => this.build_column_def(field));
        if (this.options.enable_selection) {
            defs.unshift({
                colId: Table.SELECT_COL,
                headerName: '',
                checkboxSelection: true,
                headerCheckboxSelection: true,
                headerCheckboxSelectionFilteredOnly: true,
                width: 44,
                minWidth: 44,
                maxWidth: 44,
                pinned: 'left',
                lockPosition: true,
                sortable: false,
                filter: false,
                resizable: false,
                editable: false,
                suppressAutoSize: true,
                suppressSizeToFit: true,
                suppressMovable: true
            });
        }
        return defs;
    }

    /**
     * Builds one column definition with formatting, tooltips, actions and overrides.
     */
    build_column_def(field) {
        let o = this.options;
        let override = (o.column_defs_override || {})[field] || {};
        let action_col = o.action_column;
        if (action_col && action_col.field === field) {
            return Object.assign({
                field: field,
                headerName: action_col.header_name || '',
                sortable: false,
                filter: false,
                resizable: false,
                cellRenderer: params => this.render_action_cell(params)
            }, override);
        }
        let def = { field: field, headerName: field, valueFormatter: params => Table.format_value(params.value) };
        if (o.enable_edit) {
            def.editable = true;
            def.cellClassRules = { tbl_cell_editable: () => this.edit_mode };
            let spec = (o.column_editors || {})[field];
            if (spec) {
                Object.assign(def, this.editor_def(field, spec));
            }
        }
        let tip = (o.column_tooltips || {})[field];
        if (typeof tip === 'function') {
            def.tooltipValueGetter = tip;
        } else if (typeof tip === 'string') {
            def.tooltipValueGetter = () => tip;
        }
        let actions = (o.column_actions || {})[field];
        if (actions) {
            let on_click = actions.on_click || actions.onClick;
            let on_double = actions.on_double_click || actions.onDoubleClick;
            if (typeof on_click === 'function') {
                def.onCellClicked = on_click;
            }
            if (typeof on_double === 'function') {
                def.onCellDoubleClicked = params => this.run_double_click(actions, on_double, params);
            }
        }
        return Object.assign(def, override);
    }

    /**
     * Returns the stable grid row id: the id field, or the hidden position.
     */
    row_id_of(data) {
        if (!data) {
            return '';
        }
        if (this.use_id_field) {
            return String(data.id);
        }
        return data[Table.ROW_ID_KEY] !== undefined ? data[Table.ROW_ID_KEY] : '';
    }

    /**
     * Renders the action column cell as icon buttons that do not reach grid click handlers.
     */
    render_action_cell(params) {
        let wrap = document.createElement('div');
        wrap.className = 'tbl_action_cell';
        for (let def of (this.options.action_column.buttons || [])) {
            let btn = document.createElement('span');
            btn.className = 'tbl_action_btn';
            btn.title = def.title || '';
            btn.innerHTML = def.icon || '';
            btn.addEventListener('click', e => {
                e.stopPropagation();
                if (typeof def.on_click === 'function') {
                    def.on_click(params.data, params);
                }
            });
            btn.addEventListener('dblclick', e => e.stopPropagation());
            wrap.appendChild(btn);
        }
        return wrap;
    }

    /**
     * Runs a double-click action, asking for confirmation first when configured.
     */
    async run_double_click(actions, handler, params) {
        let show = actions.show_value_on_double_click || actions.showValueOnDoubleClick;
        if (show && !(await this.confirm_dialog('Path: ' + params.value + '\nDo you want to open it?', 'Open Log'))) {
            return;
        }
        handler(params);
    }

    /**
     * Asks a yes/no question through MessageBox.confirm when available, else native confirm.
     */
    async confirm_dialog(text, title) {
        if (window.MessageBox && typeof MessageBox.confirm === 'function') {
            return !!(await MessageBox.confirm(text, title));
        }
        return window.confirm(text);
    }

    /**
     * Stores the ready API, notifies the host, then sizes columns and restores scroll on the next tick.
     */
    handle_grid_ready(params) {
        this.grid_api = params.api;
        if (typeof this.options.on_grid_ready === 'function') {
            this.options.on_grid_ready(params);
        }
        setTimeout(() => {
            if (this.grid_api !== params.api) {
                return;
            }
            this.size_columns();
            this.restore_scroll(this.saved_scroll);
            this.saved_scroll = null;
        }, 0);
    }

    /**
     * Calls on_grid_size_changed, or re-fits columns when autosize is off.
     */
    handle_grid_size_changed(params) {
        if (typeof this.options.on_grid_size_changed === 'function') {
            this.options.on_grid_size_changed(params.api);
        } else if (!this.options.autosize_columns) {
            params.api.sizeColumnsToFit();
        } else {
            this.size_columns();
        }
    }

    /**
     * Sizes columns to content, or stretches them to the grid width.
     */
    size_columns() {
        if (!this.grid_api) {
            return;
        }
        if (this.options.autosize_columns) {
            this.grid_api.autoSizeAllColumns();
            this.fill_free_space();
        } else {
            this.grid_api.sizeColumnsToFit();
        }
    }

    /**
     * Stretches the columns to the grid width only when the content leaves free space.
     */
    fill_free_space() {
        let columns = this.grid_api.getAllDisplayedColumns();
        let total = columns.reduce((sum, column) => sum + column.getActualWidth(), 0);
        if (this.grid_el && total > 0 && total < this.grid_el.clientWidth - 20) {
            this.grid_api.sizeColumnsToFit();
        }
    }

    // #region selection_and_edit
    /**
     * Notifies the host when the set of selected rows changes.
     */
    handle_selection_changed() {
        if (typeof this.options.on_selection_change === 'function') {
            this.options.on_selection_change(this.get_selected_rows());
        }
        this.container.classList.toggle('tbl_has_selection', this.get_selected_rows().length > 0);
    }

    /**
     * Returns the selected row objects; empty without a grid or when selection is off.
     */
    get_selected_rows() {
        return this.grid_api && this.options.enable_selection ? this.grid_api.getSelectedRows() : [];
    }

    /**
     * Selects every row that passes the current filter.
     */
    select_all() {
        if (this.grid_api && this.options.enable_selection) {
            this.grid_api.selectAllFiltered();
        }
    }

    /**
     * Clears the row selection.
     */
    clear_selection() {
        if (this.grid_api) {
            this.grid_api.deselectAll();
        }
    }

    /**
     * Turns cell editing on or off; does nothing when enable_edit is false.
     */
    set_edit_mode(on) {
        if (!this.options.enable_edit) {
            return;
        }
        this.edit_mode = !!on;
        if (this.grid_api) {
            this.grid_api.stopEditing();
            this.grid_api.setGridOption('suppressClickEdit', !this.edit_mode);
            this.grid_api.refreshCells({ force: true });
        }
        this.container.classList.toggle('tbl_editing', this.edit_mode);
        if (this.edit_button) {
            this.edit_button.classList.toggle('tbl_btn_active', this.edit_mode);
            this.edit_button.setAttribute('aria-pressed', String(this.edit_mode));
        }
    }

    /**
     * True while cells can be edited.
     */
    is_edit_mode() {
        return this.edit_mode;
    }

    /**
     * Returns the column definition parts for one editor spec:
     * { type: text|int|number|bool|select|autocomplete|readonly, choices, allow_free_text, min, max, required, max_length, validate }.
     */
    editor_def(field, spec) {
        let type = spec.type || 'text';
        let part = {};
        if (type === 'readonly' || spec.readonly === true) {
            part.editable = false;
            part.cellClassRules = {};
            return part;
        }
        part.valueSetter = params => this.apply_edit(field, spec, params);
        if (type === 'bool') {
            part.editable = false;
            part.cellRenderer = params => this.render_check_cell(params);
        }
        if (type === 'select') {
            part.cellEditor = 'agSelectCellEditor';
            part.cellEditorParams = { values: (spec.choices || []).slice() };
        }
        if (type === 'autocomplete') {
            part.cellEditor = Table.AutoCompleteEditor;
            part.cellEditorPopup = true;
            part.cellEditorParams = { choices: (spec.choices || []).slice(), allow_free_text: spec.allow_free_text === true };
        }
        return part;
    }

    /**
     * Checks a typed value against its editor spec.
     * @returns {Object} { ok, value, reason }.
     */
    static check_edit_value(spec, raw) {
        let type = spec.type || 'text';
        let empty = raw === null || raw === undefined || raw === '';
        if (type === 'bool') {
            return { ok: true, value: raw === true || raw === 'true' };
        }
        if (empty) {
            return spec.required ? { ok: false, reason: 'A value is required' } : { ok: true, value: null };
        }
        let value = raw;
        if (type === 'int' || type === 'number') {
            value = Number(raw);
            if (!Number.isFinite(value) || (type === 'int' && !Number.isInteger(value))) {
                return { ok: false, reason: type === 'int' ? 'Enter a whole number' : 'Enter a number' };
            }
            if (typeof spec.min === 'number' && value < spec.min) {
                return { ok: false, reason: 'Minimum is ' + spec.min };
            }
            if (typeof spec.max === 'number' && value > spec.max) {
                return { ok: false, reason: 'Maximum is ' + spec.max };
            }
            return { ok: true, value: value };
        }
        value = String(raw);
        let listed = Array.isArray(spec.choices) && spec.choices.map(String).includes(value);
        if ((type === 'select' || (type === 'autocomplete' && spec.allow_free_text !== true)) && !listed) {
            return { ok: false, reason: 'Pick a value from the list' };
        }
        if (typeof spec.max_length === 'number' && value.length > spec.max_length) {
            return { ok: false, reason: 'At most ' + spec.max_length + ' characters' };
        }
        return { ok: true, value: value };
    }

    /**
     * Value setter of an edited column: validates, stores the value in the row and reports rejections.
     */
    apply_edit(field, spec, params) {
        let result = Table.check_edit_value(spec, params.newValue);
        if (result.ok && typeof spec.validate === 'function') {
            let verdict = spec.validate(result.value, params.data);
            if (verdict !== true && verdict !== undefined) {
                result = { ok: false, reason: typeof verdict === 'string' ? verdict : 'Value rejected' };
            }
        }
        if (!result.ok) {
            if (typeof this.options.on_edit_rejected === 'function') {
                this.options.on_edit_rejected({ row: params.data, field: field, value: params.newValue, reason: result.reason });
            }
            return false;
        }
        if (params.data[field] === result.value) {
            return false;
        }
        params.data[field] = result.value;
        return true;
    }

    /**
     * Renders a checkbox that only changes while edit mode is on.
     */
    render_check_cell(params) {
        let box = document.createElement('input');
        box.type = 'checkbox';
        box.className = 'tbl_cell_check';
        box.checked = params.value === true;
        box.addEventListener('click', event => {
            if (!this.edit_mode) {
                event.preventDefault();
                return;
            }
            params.node.setDataValue(params.colDef.field, box.checked);
        });
        return box;
    }

    /**
     * Reports an edited cell to the host; the row object in the stored data already holds the new value.
     */
    handle_cell_edit(params) {
        if (typeof this.options.on_cell_edit === 'function') {
            this.options.on_cell_edit({
                row: params.data,
                field: params.colDef.field,
                old_value: params.oldValue,
                new_value: params.newValue
            });
        }
    }
    // #endregion selection_and_edit

    /**
     * Returns the grid body scroll offsets, or null without a grid.
     */
    read_scroll() {
        let body = this.grid_el.querySelector('.ag-body-viewport');
        let center = this.grid_el.querySelector('.ag-center-cols-viewport');
        if (!body) {
            return null;
        }
        return { top: body.scrollTop, left: center ? center.scrollLeft : 0 };
    }

    /**
     * Applies remembered scroll offsets to the grid body.
     */
    restore_scroll(pos) {
        if (!pos) {
            return;
        }
        let body = this.grid_el.querySelector('.ag-body-viewport');
        if (body) {
            body.scrollTop = pos.top;
        }
        for (let el of this.grid_el.querySelectorAll('.ag-center-cols-viewport, .ag-body-horizontal-scroll-viewport')) {
            el.scrollLeft = pos.left;
        }
    }

    /**
     * Returns the engine API once the grid is ready, otherwise null.
     */
    get_grid_api() {
        return this.grid_api;
    }

    /**
     * Destroys the current grid and its header observer.
     */
    destroy_grid() {
        if (this.header_observer) {
            this.header_observer.disconnect();
            this.header_observer = null;
        }
        if (this.grid) {
            this.grid.destroy();
        }
        this.grid = null;
        this.grid_api = null;
        this.column_fields = [];
    }
    // #endregion grid

    // #region filters
    /**
     * Builds the floating filter popup on the body and the outside-press handler.
     */
    build_filter_popup() {
        this.popup = document.createElement('div');
        this.popup.className = 'tbl_filter_popup';
        this.popup.id = this.uid + '_filter_popup';
        this.popup_list_host = document.createElement('div');
        this.popup_list_host.className = 'tbl_filter_list';
        let apply_btn = document.createElement('button');
        apply_btn.type = 'button';
        apply_btn.className = 'tbl_filter_apply';
        apply_btn.textContent = this.options.filter_popup.apply_text || 'Apply';
        apply_btn.addEventListener('click', () => this.close_filter_popup());
        this.popup.appendChild(this.popup_list_host);
        this.popup.appendChild(apply_btn);
        document.body.appendChild(this.popup);
        this.on_doc_mousedown = e => {
            let target = e.target;
            if (!this.popup_field || this.popup.contains(target) || (target.closest && target.closest('.context_menu'))) {
                return;
            }
            this.close_filter_popup();
        };
        document.addEventListener('mousedown', this.on_doc_mousedown, true);
    }

    /**
     * Adds filter icons to header cells and watches the header for new cells.
     */
    observe_header() {
        let header = this.grid_el.querySelector('.ag-header');
        this.decorate_headers();
        if (!header || !window.MutationObserver) {
            return;
        }
        this.header_observer = new MutationObserver(() => this.decorate_headers());
        this.header_observer.observe(header, { childList: true, subtree: true });
    }

    /**
     * Appends a funnel icon to every data column header that lacks one.
     */
    decorate_headers() {
        let action_field = this.options.action_column ? this.options.action_column.field : null;
        for (let cell of this.grid_el.querySelectorAll('.ag-header-cell[col-id]')) {
            let field = cell.getAttribute('col-id');
            if (field === action_field || field === Table.SELECT_COL || cell.querySelector('.tbl_filter_icon')) {
                continue;
            }
            let icon = document.createElement('span');
            icon.className = 'tbl_filter_icon';
            icon.title = 'Filter';
            icon.setAttribute('data-field', field);
            icon.innerHTML = Table.ICONS.filter;
            icon.addEventListener('mousedown', e => e.stopPropagation());
            icon.addEventListener('click', e => {
                e.stopPropagation();
                e.preventDefault();
                this.open_filter_popup(field, icon);
            });
            (cell.querySelector('.ag-header-cell-label') || cell).appendChild(icon);
        }
        this.update_filter_icons();
    }

    /**
     * Colors each filter icon by whether its column has active include or exclude values.
     */
    update_filter_icons() {
        for (let icon of this.grid_el.querySelectorAll('.tbl_filter_icon')) {
            icon.classList.toggle('tbl_filter_active', this.has_filter(icon.getAttribute('data-field')));
        }
    }

    /**
     * True when the column has any selected or excluded values.
     */
    has_filter(field) {
        let state = this.filter_state[field];
        return !!state && (state.selected.length > 0 || state.excluded.length > 0);
    }

    /**
     * Prepares set-based checks for all filtered columns except skip_field.
     */
    build_checks(skip_field) {
        return Object.keys(this.filter_state)
            .filter(field => field !== skip_field && this.has_filter(field))
            .map(field => ({
                field: field,
                selected: new Set(this.filter_state[field].selected),
                excluded: new Set(this.filter_state[field].excluded)
            }));
    }

    /**
     * Returns original rows passing every column filter except skip_field.
     * @returns {Array|null} Null when no filter applies and skip_field is null, so callers fall back to all rows.
     */
    filter_rows(skip_field) {
        let checks = this.build_checks(skip_field);
        if (!checks.length && skip_field === null) {
            return null;
        }
        return this.original_data.filter(row => checks.every(check => {
            let value = row ? row[check.field] : null;
            let text = value === null || value === undefined ? null : String(value);
            if (check.excluded.has(text)) {
                return false;
            }
            return check.selected.size === 0 || check.selected.has(text);
        }));
    }

    /**
     * Distinct string values of a column in first-seen order, from current rows passing the other filters.
     */
    distinct_values(field) {
        let seen = new Set();
        for (let row of this.filter_rows(field)) {
            let value = row ? row[field] : null;
            if (value !== null && value !== undefined) {
                seen.add(String(value));
            }
        }
        return [...seen];
    }

    /**
     * Opens the filter popup for a column directly below its icon.
     */
    open_filter_popup(field, icon) {
        let state = this.filter_state[field] || { selected: [], excluded: [] };
        let rect = icon.getBoundingClientRect();
        this.popup_field = field;
        this.fill_filter_list(this.distinct_values(field), state);
        this.popup.style.left = rect.left + 'px';
        this.popup.style.top = (rect.bottom + 4) + 'px';
        this.popup.style.zIndex = String(this.popup_z_index(icon));
        this.popup.classList.add('tbl_filter_open');
        let popup_rect = this.popup.getBoundingClientRect();
        if (popup_rect.right > window.innerWidth - 4) {
            this.popup.style.left = Math.max(4, window.innerWidth - popup_rect.width - 4) + 'px';
        }
    }

    /**
     * Returns a stacking order above the icon's ancestors and above earlier floating layers.
     */
    popup_z_index(icon) {
        let highest = 0;
        for (let el = icon; el && el !== document.body; el = el.parentElement) {
            let value = parseInt(getComputedStyle(el).zIndex, 10);
            if (!isNaN(value)) {
                highest = Math.max(highest, value);
            }
        }
        let next = typeof window.get_next_z_index === 'function' ? window.get_next_z_index() : 3;
        return Math.max(highest + 1, next);
    }

    /**
     * Loads values into the ListSelector, or into a simple built-in list when it is not loaded.
     */
    fill_filter_list(values, state) {
        if (!window.ListSelector) {
            this.popup_list = null;
            this.render_fallback_list(values, state);
            return;
        }
        if (this.popup_list instanceof window.ListSelector) {
            this.popup_list.set_items(values, state.selected, state.excluded);
            return;
        }
        this.popup_list_host.innerHTML = '';
        this.popup_list = new ListSelector(this.popup_list_host, {
            items: values,
            selected: state.selected,
            excluded: state.excluded,
            allow_exclude: true,
            on_change: value => this.set_filter_state(value)
        });
    }

    /**
     * Renders a minimal three-state value list; click cycles off, include, exclude.
     */
    render_fallback_list(values, state) {
        let current = { selected: state.selected.slice(), excluded: state.excluded.slice() };
        let all = [...new Set([...current.selected, ...current.excluded, ...values])];
        this.popup_list_host.innerHTML = '';
        for (let value of all) {
            let row = document.createElement('div');
            row.className = 'tbl_fallback_row';
            row.textContent = value;
            let paint = () => {
                row.classList.toggle('tbl_fallback_selected', current.selected.includes(value));
                row.classList.toggle('tbl_fallback_excluded', current.excluded.includes(value));
            };
            row.addEventListener('click', () => {
                if (current.selected.includes(value)) {
                    current.selected = current.selected.filter(item => item !== value);
                    current.excluded.push(value);
                } else if (current.excluded.includes(value)) {
                    current.excluded = current.excluded.filter(item => item !== value);
                } else {
                    current.selected.push(value);
                }
                paint();
                this.set_filter_state(current);
            });
            paint();
            this.popup_list_host.appendChild(row);
        }
    }

    /**
     * Stores the open column's filter state and refreshes icon colors; rows change on apply.
     */
    set_filter_state(value) {
        if (!this.popup_field) {
            return;
        }
        this.filter_state[this.popup_field] = {
            selected: (value.selected || []).slice(),
            excluded: (value.excluded || []).slice()
        };
        if (!this.has_filter(this.popup_field)) {
            delete this.filter_state[this.popup_field];
        }
        this.update_filter_icons();
    }

    /**
     * Hides the filter popup and applies the filters.
     */
    close_filter_popup() {
        if (!this.popup_field) {
            return;
        }
        this.popup_field = null;
        this.popup.classList.remove('tbl_filter_open');
        this.apply_filters();
    }

    /**
     * Filters the original rows by all column filters, then re-applies the active search.
     */
    apply_filters() {
        this.filtered_data = this.filter_rows(null);
        this.show_rows(this.view_rows());
        this.update_filter_icons();
    }

    /**
     * Removes every column filter and shows the unfiltered rows.
     */
    clear_filters() {
        this.filter_state = {};
        this.filtered_data = null;
        this.show_rows(this.view_rows());
        this.update_filter_icons();
    }
    // #endregion filters

    // #region context_menu
    /**
     * Opens the cell menu on right-click; without ContextMenu, offers to clear filters.
     */
    handle_context_menu(e) {
        let cell = this.cell_from_target(e.target);
        e.preventDefault();
        e.stopPropagation();
        if (!window.ContextMenu) {
            if (window.confirm('Clear all filters?')) {
                this.clear_filters();
            }
            return;
        }
        if (!this.menu) {
            this.menu = new ContextMenu(document.createElement('div'));
        }
        if (this.options.select_row_on_context_menu && cell.node && !cell.node.isSelected()) {
            cell.node.setSelected(true, true);
        }
        this.menu.set_items(this.build_menu_items(cell));
        this.menu.show(e.pageX, e.pageY);
    }

    /**
     * Resolves the grid cell under a target into meta data, element and row node.
     */
    cell_from_target(target) {
        let cell_el = target && target.closest ? target.closest('.ag-cell') : null;
        if (!cell_el || !this.grid_api) {
            return { meta: {}, cell_el: null, node: null };
        }
        let row_el = cell_el.closest('.ag-row');
        let row_idx = row_el ? parseInt(row_el.getAttribute('row-index'), 10) : NaN;
        let node = isNaN(row_idx) ? null : this.grid_api.getDisplayedRowAtIndex(row_idx);
        let field = cell_el.getAttribute('col-id');
        let column = this.grid_api.getColumn(field);
        let def = column ? column.getColDef() : null;
        let data = node ? node.data : null;
        return {
            meta: {
                target: cell_el,
                field: field,
                header_name: (def && def.headerName) || field,
                row_idx: row_idx,
                row_data: data,
                value: data ? data[field] : undefined
            },
            cell_el: cell_el,
            node: node
        };
    }

    /**
     * Builds Copy Cell, host items and Clear All Filters menu entries.
     */
    build_menu_items(cell) {
        let items = [
            { label: 'Copy Cell', icon: Table.ICONS.copy, action: () => this.copy_cell_text(cell.cell_el) },
            { type: 'separator' }
        ];
        let extra = this.options.context_menu_items;
        if (extra) {
            try {
                let list = typeof extra === 'function' ? extra(cell.meta) : extra;
                if (Array.isArray(list) && list.length) {
                    items.push(...list, { type: 'separator' });
                }
            } catch (error) {
                this.report_error('Failed to build context menu: ' + error.message);
            }
        }
        items.push({ label: 'Clear All Filters', icon: Table.ICONS.clear_filter, action: () => this.clear_filters() });
        return items;
    }

    /**
     * Copies the trimmed displayed text of a cell.
     */
    copy_cell_text(cell_el) {
        if (!cell_el) {
            this.report_error('No cell selected');
            return;
        }
        let text = cell_el.textContent.trim();
        if (!text) {
            this.report_error('No cell value to copy');
            return;
        }
        this.copy_text(text);
    }

    /**
     * Copies the raw value of the focused cell on Ctrl+C or Cmd+C.
     */
    handle_copy_key(e) {
        if (!(e.ctrlKey || e.metaKey) || String(e.key).toLowerCase() !== 'c' || !this.grid_api) {
            return;
        }
        let focused = this.grid_api.getFocusedCell();
        let node = focused ? this.grid_api.getDisplayedRowAtIndex(focused.rowIndex) : null;
        let value = node && node.data ? node.data[focused.column.getColId()] : null;
        if (value === null || value === undefined) {
            return;
        }
        e.preventDefault();
        this.copy_text(String(value));
    }

    /**
     * Writes text to the clipboard, falling back to a temporary textarea copy.
     */
    async copy_text(text) {
        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(text);
                return;
            } catch (error) {
                if (window.dev_mode === true) {
                    console.log('[DEBUG] clipboard_api_failed=' + error);
                }
            }
        }
        let area = document.createElement('textarea');
        let copied = false;
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.left = '-9999px';
        document.body.appendChild(area);
        area.select();
        try {
            copied = document.execCommand('copy');
        } catch (error) {
            copied = false;
        }
        area.remove();
        if (!copied) {
            this.report_error('Unable to copy value');
        }
    }
    // #endregion context_menu

    // #region feedback
    /**
     * Shows or removes the loading overlay.
     */
    show_loading(visible) {
        if (!visible) {
            if (this.loading_el) {
                this.loading_el.remove();
                this.loading_el = null;
            }
            return;
        }
        if (!this.loading_el) {
            this.loading_el = document.createElement('div');
            this.loading_el.className = 'tbl_loading';
            this.loading_el.textContent = this.options.loading_text;
            this.container.appendChild(this.loading_el);
        }
    }

    /**
     * Schedules a HintPopup with the full text when the hovered cell content overflows.
     */
    handle_cell_over(params) {
        let target = params.event ? params.event.target : null;
        let cell_el = target && target.closest ? target.closest('.ag-cell') : null;
        this.cancel_hint();
        if (!window.HintPopup || !cell_el) {
            return;
        }
        let value_el = cell_el.querySelector('.ag-cell-value') || cell_el;
        let text = cell_el.textContent.trim();
        let overflows = value_el.scrollWidth > value_el.clientWidth || cell_el.scrollWidth > cell_el.clientWidth;
        if (!text || !overflows) {
            return;
        }
        this.hint_timer = setTimeout(() => {
            this.hint_timer = null;
            this.hint_anchor = cell_el;
            window.HintPopup.show(text, cell_el);
        }, 350);
    }

    /**
     * Cancels a pending cell hint and hides a shown one.
     * Without a HintPopup.hide method, a synthetic scroll event triggers its cancel path.
     */
    cancel_hint() {
        if (this.hint_timer) {
            clearTimeout(this.hint_timer);
            this.hint_timer = null;
        }
        if (!this.hint_anchor) {
            return;
        }
        if (window.HintPopup && typeof window.HintPopup.hide === 'function') {
            window.HintPopup.hide();
        } else {
            this.hint_anchor.dispatchEvent(new Event('scroll'));
        }
        this.hint_anchor = null;
    }

    /**
     * Sends a message to on_error, or to MessageBox / alert by default.
     */
    report_error(message) {
        if (typeof this.options.on_error === 'function') {
            this.options.on_error(message);
            return;
        }
        console.error('[table] ' + message);
        if (window.MessageBox && typeof MessageBox.error === 'function') {
            MessageBox.error(message);
        } else {
            window.alert(message);
        }
    }

    /**
     * Escapes text for safe use inside HTML.
     */
    static escape_html(text) {
        return String(text === null || text === undefined ? '' : text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /**
     * Display text for a raw value: booleans, empty null, cut timestamps and DD.MM.YY HH:MM:SS dates.
     */
    static format_value(value) {
        if (value === null || value === undefined) {
            return '';
        }
        if (typeof value === 'boolean') {
            return value ? 'true' : 'false';
        }
        if (value instanceof Date) {
            let pad = num => String(num).padStart(2, '0');
            return pad(value.getDate()) + '.' + pad(value.getMonth() + 1) + '.' + pad(value.getFullYear() % 100) + ' ' +
                pad(value.getHours()) + ':' + pad(value.getMinutes()) + ':' + pad(value.getSeconds());
        }
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(value)) {
            return value.slice(0, 19);
        }
        return String(value);
    }
    // #endregion feedback

    // #region lifecycle
    /**
     * Injects extra CSS as a new style element; empty input is ignored.
     */
    apply_custom_css(css_string) {
        if (!css_string) {
            return;
        }
        let style = document.createElement('style');
        style.textContent = css_string;
        document.head.appendChild(style);
    }

    /**
     * Applies a theme preset or variables object to the table and its filter popup.
     */
    set_theme(theme) {
        if (!window.ThemeManager) {
            return;
        }
        ThemeManager.apply(this.container, theme);
        if (this.popup) {
            ThemeManager.apply(this.popup, theme);
        }
    }

    /**
     * Tears down the grid, observers, popup and document listeners.
     */
    destroy() {
        this.cancel_hint();
        this.destroy_grid();
        if (this.resize_observer) {
            this.resize_observer.disconnect();
        }
        if (this.on_doc_mousedown) {
            document.removeEventListener('mousedown', this.on_doc_mousedown, true);
        }
        if (this.popup) {
            this.popup.remove();
        }
        this.container.innerHTML = '';
    }

    /**
     * Builds a small CSV blob from rows, for the registry demo save button.
     */
    static rows_to_csv(rows) {
        let fields = rows.length ? Object.keys(rows[0]) : [];
        let quote = value => '"' + String(value === null || value === undefined ? '' : value).replace(/"/g, '""') + '"';
        let lines = [fields.map(quote).join(',')].concat(rows.map(row => fields.map(field => quote(row[field])).join(',')));
        return new Blob([lines.join('\n')], { type: 'text/csv' });
    }
    // #endregion lifecycle
}

// #region autocomplete_editor
/**
 * Cell editor that uses the AutoComplete widget; falls back to a plain input when it is not loaded.
 */
Table.AutoCompleteEditor = class {
    init(params) {
        this.params = params;
        this.box = window.AutoComplete && customElements.get('auto-complete') ? document.createElement('auto-complete') : document.createElement('input');
        this.box.className = 'tbl_ac_editor';
        if (this.box.set_completion_list) {
            this.box.set_completion_list(params.choices);
            this.box.configure({ allow_free_text: params.allow_free_text });
        }
        this.box.value = params.value === null || params.value === undefined ? '' : String(params.value);
    }

    getGui() {
        return this.box;
    }

    getValue() {
        return this.box.value;
    }

    isPopup() {
        return true;
    }

    afterGuiAttached() {
        let input = this.box.input || this.box;
        input.focus();
        input.select();
    }
};
// #endregion autocomplete_editor

window.Table = Table;
if (window.WidgetRegistry) {
    WidgetRegistry.register('table', {
        label: 'Table',
        category: 'display',
        container: false,
        options: [
            { name: 'data', type: 'json', default: [
                { id: 1, name: 'Alpha', status: 'active', score: 91, updated: '2026-01-12 09:15:22.120' },
                { id: 2, name: 'Bravo', status: 'paused', score: 74, updated: '2026-01-13 11:02:05' },
                { id: 3, name: 'Charlie', status: 'active', score: 88, updated: '2026-01-14 16:40:51' },
                { id: 4, name: 'Delta', status: 'failed', score: 35, updated: '2026-01-15 08:00:00' },
                { id: 5, name: 'Echo', status: 'active', score: 67, updated: '2026-01-16 13:27:44' },
                { id: 6, name: 'Foxtrot', status: 'paused', score: 59, updated: '2026-01-17 19:55:10' }
            ] },
            { name: 'column_order', type: 'json', default: [] },
            { name: 'enable_search', type: 'bool', default: true },
            { name: 'enable_refresh', type: 'bool', default: true },
            { name: 'enable_save', type: 'bool', default: true },
            { name: 'enable_filter', type: 'bool', default: true },
            { name: 'enable_selection', type: 'bool', default: false },
            { name: 'enable_edit', type: 'bool', default: false },
            { name: 'column_editors', type: 'json', default: {} },
            { name: 'enable_context_menu', type: 'bool', default: true },
            { name: 'autosize_columns', type: 'bool', default: true },
            { name: 'empty_state_message', type: 'string', default: 'No data to display' },
            { name: 'loading_text', type: 'string', default: 'Loading data...' }
        ],
        build: (host, options) => {
            let data = Array.isArray(options.data) ? options.data : [];
            if (!host.style.height) {
                host.style.height = '300px';
            }
            return new Table(host, {
                initial_data: data,
                initial_column_order: options.column_order && options.column_order.length ? options.column_order : null,
                fetch_data: async () => ({ data: data.map(row => Object.assign({}, row)) }),
                on_save: async rows => ({ blob: Table.rows_to_csv(rows), filename: 'table.csv' }),
                enable_search: options.enable_search,
                enable_refresh: options.enable_refresh,
                enable_save: options.enable_save,
                enable_filter: options.enable_filter,
                enable_selection: options.enable_selection === true,
                enable_edit: options.enable_edit === true,
                column_editors: options.column_editors && typeof options.column_editors === 'object' ? options.column_editors : null,
                enable_context_menu: options.enable_context_menu,
                autosize_columns: options.autosize_columns,
                empty_state_message: options.empty_state_message,
                loading_text: options.loading_text
            });
        }
    });
}
