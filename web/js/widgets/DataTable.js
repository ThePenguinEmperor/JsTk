// #region data_table_styles_injection
const base_css = `
/* #region data_table */
.data_table_wrapper {
    /* Layout */
    display: flex;
    flex-direction: column;
    /* Dimensions */
    width: 100%;
    height: 100%;
    /* Effects */
    overflow: hidden;
}
.data_table_container {
    /* Layout */
    flex: 1;
    position: relative;
    /* Dimensions */
    overflow: auto;
    /* Borders */
    border: 1px solid var(--dt-border, #ddd);
    border-radius: 4px;
}
.data_table_header {
    /* Layout */
    display: flex;
    position: sticky;
    top: 0;
    /* Colors */
    background-color: var(--dt-header-bg, #f5f5f5);
    /* Borders */
    border-bottom: 2px solid var(--dt-border, #ddd);
    /* Z-index */
    z-index: 1;
}
.data_table_header_cell {
    /* Layout */
    flex: 1 1 auto;
    /* Dimensions */
    padding: 8px;
    /* Typography */
    font-weight: bold;
    /* Effects */
    cursor: default;
}
.data_table_virtual_viewport {
    /* Layout */
    position: relative;
    /* Dimensions */
    overflow-y: auto;
    height: 100%;
}
.data_table_spacer {
    /* Dimensions */
    width: 100%;
    /* Layout */
    position: relative;
}
.data_table_rows_container {
    /* Layout */
    position: relative;
    /* Dimensions */
    width: 100%;
}
.data_table_row {
    /* Layout */
    display: flex;
    align-items: center;
    /* Dimensions */
    width: 100%;
    /* Borders */
    border-bottom: 1px solid #eee;
    /* Effects */
    cursor: pointer;
    transition: background-color 0.2s;
}
.data_table_row:hover {
    /* Colors */
    background-color: var(--dt-row-hover, #f9f9f9);
}
.data_table_cell {
    /* Layout */
    flex: 1 1 auto;
    /* Dimensions */
    padding: 4px 8px;
    /* Typography */
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.sort_indicator {
    /* Dimensions */
    margin-left: 5px;
    /* Typography */
    font-size: 10px;
}
.column_filter_btn {
    /* Colors */
    background: transparent;
    /* Borders */
    border: none;
    /* Typography */
    font-size: 10px;
    /* Effects */
    cursor: pointer;
}
.data_table_filter_popup,
.data_table_context_menu {
    /* Colors */
    background: white;
    /* Borders */
    border: 1px solid #ccc;
    border-radius: 4px;
    /* Effects */
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    /* Z-index */
    z-index: 1000;
}
/* #endregion */
`;

// Inject CSS once
if (!document.getElementById('data_table_styles')) {
    const style_el = document.createElement('style');
    style_el.id = 'data_table_styles';
    style_el.textContent = base_css;
    document.head.appendChild(style_el);
}
// #endregion

// #region helper_classes

/**
 * Manages undo/redo state for DataTable.
 */
class UndoManager {
    /**
     * @param {DataTable} table - The DataTable instance.
     * @param {number} max_stack - Maximum number of states to keep.
     */
    constructor(table, max_stack = 10) {
        this.table = table;
        this.max_stack = max_stack;
        this.undo_stack = [];
        this.redo_stack = [];
    }

    /**
     * Save current state to undo stack.
     */
    save_state() {
        const state = {
            raw_data: this.table.raw_data.slice(),
            filtered_data: this.table.filtered_data.slice(),
            sort_state: { ...this.table.sort_state },
            global_filter: this.table.global_filter,
            column_filters: JSON.parse(JSON.stringify(this.table.column_filters)),
            selected: new Set(this.table.selected)
        };
        this.undo_stack.push(state);
        if (this.undo_stack.length > this.max_stack) this.undo_stack.shift();
        this.redo_stack = [];
    }

    /**
     * Restore a saved state.
     * @param {Object} state - The state to restore.
     */
    restore_state(state) {
        this.table.raw_data = state.raw_data;
        this.table.filtered_data = state.filtered_data;
        this.table.sort_state = state.sort_state;
        this.table.global_filter = state.global_filter;
        this.table.column_filters = state.column_filters;
        this.table.selected = state.selected;
        if (this.table.filter_input) this.table.filter_input.value = this.table.global_filter;
        this.table.apply_filters_and_sort();
        if (this.table.options.on_data_change) this.table.options.on_data_change();
    }

    /**
     * Undo last action.
     */
    undo() {
        if (this.undo_stack.length === 0) return;
        const current = {
            raw_data: this.table.raw_data.slice(),
            filtered_data: this.table.filtered_data.slice(),
            sort_state: { ...this.table.sort_state },
            global_filter: this.table.global_filter,
            column_filters: JSON.parse(JSON.stringify(this.table.column_filters)),
            selected: new Set(this.table.selected)
        };
        const prev = this.undo_stack.pop();
        this.redo_stack.push(current);
        this.restore_state(prev);
    }

    /**
     * Redo last undone action.
     */
    redo() {
        if (this.redo_stack.length === 0) return;
        const next = this.redo_stack.pop();
        const current = {
            raw_data: this.table.raw_data.slice(),
            filtered_data: this.table.filtered_data.slice(),
            sort_state: { ...this.table.sort_state },
            global_filter: this.table.global_filter,
            column_filters: JSON.parse(JSON.stringify(this.table.column_filters)),
            selected: new Set(this.table.selected)
        };
        this.undo_stack.push(current);
        this.restore_state(next);
    }
}

/**
 * Manages row/cell selection for DataTable.
 */
class SelectionManager {
    /**
     * @param {DataTable} table - The DataTable instance.
     */
    constructor(table) {
        this.table = table;
    }

    /**
     * Check if a row is selected.
     * @param {number} row_idx - Row index.
     * @returns {boolean}
     */
    is_row_selected(row_idx) {
        return this.table.selected.has(`row:${row_idx}`);
    }

    /**
     * Check if a cell is selected.
     * @param {number} row_idx - Row index.
     * @param {number} col_idx - Column index.
     * @returns {boolean}
     */
    is_cell_selected(row_idx, col_idx) {
        return this.table.selected.has(`cell:${row_idx},${col_idx}`);
    }

    /**
     * Clear all selections.
     */
    clear() {
        this.table.selected.clear();
    }

    /**
     * Handle row click event.
     * @param {number} row_idx - Row index.
     * @param {MouseEvent} event - Click event.
     */
    handle_row_click(row_idx, event) {
        const mode = this.table.options.multi_select;
        const ctrl = event.ctrlKey;
        if (mode === 'none') return;
        if (!ctrl) this.clear();
        const key = `row:${row_idx}`;
        if (this.table.selected.has(key)) this.table.selected.delete(key);
        else this.table.selected.add(key);
        this.table.render_visible_rows();
    }

    /**
     * Handle cell click event.
     * @param {number} row_idx - Row index.
     * @param {number} col_idx - Column index.
     * @param {MouseEvent} event - Click event.
     */
    handle_cell_click(row_idx, col_idx, event) {
        const mode = this.table.options.multi_select;
        const ctrl = event.ctrlKey;
        if (mode === 'none') return;
        if (mode !== 'cell' && mode !== 'all') return;
        if (!ctrl) this.clear();
        const key = `cell:${row_idx},${col_idx}`;
        if (this.table.selected.has(key)) this.table.selected.delete(key);
        else this.table.selected.add(key);
        this.table.render_visible_rows();
    }

    /**
     * Get all selected rows and cells.
     * @returns {Object} - { rows: Array, cells: Array }
     */
    get_selected() {
        const rows = [];
        const cells = [];
        for (const key of this.table.selected) {
            if (key.startsWith('row:')) {
                const row = parseInt(key.split(':')[1]);
                rows.push({ row, data: this.table.filtered_data[row] });
            } else if (key.startsWith('cell:')) {
                const [r, c] = key.split(':')[1].split(',').map(Number);
                cells.push({
                    row: r,
                    col: c,
                    value: this.table.filtered_data[r][this.table.columns[c].field]
                });
            }
        }
        return { rows, cells };
    }

    /**
     * Get only selected cells.
     * @returns {Array} Array of { row, col, value }
     */
    get_selected_cells() {
        const cells = [];
        for (const key of this.table.selected) {
            if (key.startsWith('cell:')) {
                const [r, c] = key.split(':')[1].split(',').map(Number);
                cells.push({
                    row: r,
                    col: c,
                    value: this.table.filtered_data[r][this.table.columns[c].field]
                });
            }
        }
        return cells;
    }
}
// #endregion

// #region data_table
class DataTable {
    // #region constructor_and_options
    /**
     * Create a new DataTable instance.
     * @param {HTMLElement} container - Container element.
     * @param {Array} columns - Column definitions.
     * @param {Array} data - Initial data array.
     * @param {Object} options - Configuration options.
     */
    constructor(container, columns, data = [], options = {}) {
        this.container = container;
        this.columns = columns;
        this.raw_data = data.slice();
        this.filtered_data = this.raw_data.slice();
        this.options = {
            row_height: options.row_height || 35,
            visible_rows: options.visible_rows || 20,
            sortable: options.sortable !== false,
            filterable: options.filterable !== false,
            editable: options.editable !== false,
            multi_select: options.multi_select || 'row',
            highlight: options.highlight || 'row',
            on_row_click: options.on_row_click || null,
            on_cell_click: options.on_cell_click || null,
            on_column_click: options.on_column_click || null,
            on_table_click: options.on_table_click || null,
            on_selection_change: options.on_selection_change || null,
            on_cell_edit: options.on_cell_edit || null,
            on_data_change: options.on_data_change || null,
            ...options
        };
        // Internal state
        this.sort_state = { column: null, direction: 'asc' };
        this.global_filter = '';
        this.column_filters = {};
        this.selected = new Set();
        this.last_click = null;
        this.scroll_top = 0;
        this._render_frame = null;
        // Helper managers
        this.undo_manager = new UndoManager(this, 10);
        this.selection_manager = new SelectionManager(this);
        // DOM elements
        this.table_container = null;
        this.table_header = null;
        this.virtual_viewport = null;
        this.rows_container = null;
        this.spacer = null;
        this.filter_input = null;

        this.init_ui();
        this.apply_filters_and_sort();
        this.bind_global_events();
    }
    // #endregion

    // #region ui_build
    init_ui() {
        this.container.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'data_table_wrapper';
        wrapper.style.cssText = 'display:flex; flex-direction:column; height:100%; width:100%; overflow:hidden; position:relative;';

        if (this.options.filterable) {
            const filter_bar = document.createElement('div');
            filter_bar.className = 'data_table_filter';
            filter_bar.style.cssText = 'padding:8px; border-bottom:1px solid var(--dt-border, #ddd);';
            const label = document.createElement('label');
            label.textContent = 'Global Filter: ';
            label.style.marginRight = '8px';
            this.filter_input = document.createElement('input');
            this.filter_input.type = 'text';
            this.filter_input.placeholder = 'Search...';
            this.filter_input.style.cssText = 'padding:4px 8px; width:200px;';
            this.filter_input.addEventListener('input', (e) => {
                this.global_filter = e.target.value.toLowerCase();
                this.apply_filters_and_sort();
            });
            filter_bar.appendChild(label);
            filter_bar.appendChild(this.filter_input);
            wrapper.appendChild(filter_bar);
        }

        this.table_container = document.createElement('div');
        this.table_container.className = 'data_table_container';
        this.table_container.style.cssText = 'flex:1; overflow:auto; position:relative; border:1px solid var(--dt-border, #ddd); border-radius:4px;';

        this.table_header = document.createElement('div');
        this.table_header.className = 'data_table_header';
        this.table_header.style.cssText = 'display:flex; position:sticky; top:0; background-color:#f5f5f5; border-bottom:2px solid var(--dt-border, #ddd); z-index:1;';
        this.build_header();

        this.virtual_viewport = document.createElement('div');
        this.virtual_viewport.className = 'data_table_virtual_viewport';
        this.virtual_viewport.style.cssText = 'position:relative; overflow-y:auto; height:100%;';
        this.virtual_viewport.addEventListener('scroll', () => this.on_scroll());

        this.spacer = document.createElement('div');
        this.spacer.className = 'data_table_spacer';
        this.spacer.style.height = '0px';

        this.rows_container = document.createElement('div');
        this.rows_container.className = 'data_table_rows_container';
        this.rows_container.style.position = 'relative';

        this.virtual_viewport.appendChild(this.spacer);
        this.virtual_viewport.appendChild(this.rows_container);
        this.table_container.appendChild(this.table_header);
        this.table_container.appendChild(this.virtual_viewport);
        wrapper.appendChild(this.table_container);
        this.container.appendChild(wrapper);
    }

    build_header() {
        this.table_header.innerHTML = '';
        for (let i = 0; i < this.columns.length; i++) {
            const col = this.columns[i];
            const cell = document.createElement('div');
            cell.className = 'data_table_header_cell';
            cell.style.cssText = `flex:${col.width ? `0 0 ${col.width}` : '1 1 auto'}; padding:8px; cursor:${this.options.sortable && col.sortable !== false ? 'pointer' : 'default'};`;
            cell.textContent = col.header || col.field;
            cell.setAttribute('data-col-index', i);
            cell.setAttribute('data-col-field', col.field);
            if (this.options.sortable && col.sortable !== false) {
                const indicator = document.createElement('span');
                indicator.className = 'sort_indicator';
                indicator.style.marginLeft = '5px';
                indicator.style.fontSize = '10px';
                indicator.textContent = this.sort_state.column === col.field ? (this.sort_state.direction === 'asc' ? '\u25B2' : '\u25BC') : '\u2195';
                cell.appendChild(indicator);
                cell.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.sort_by_column(col.field);
                });
            }
            if (this.options.filterable && col.filterable !== false) {
                const filter_btn = document.createElement('button');
                filter_btn.textContent = '\u25BC';
                filter_btn.className = 'column_filter_btn';
                filter_btn.style.cssText = 'margin-left:5px; padding:2px; font-size:10px; cursor:pointer; background:transparent; border:none;';
                filter_btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.show_column_filter_popup(col.field, cell);
                });
                cell.appendChild(filter_btn);
            }
            cell.addEventListener('click', (e) => {
                if (this.options.on_column_click) this.options.on_column_click(col, i, e);
            });
            this.table_header.appendChild(cell);
        }
    }
    // #endregion

    // #region virtual_scroll
    on_scroll() {
        if (this._render_frame) cancelAnimationFrame(this._render_frame);
        this._render_frame = requestAnimationFrame(() => {
            this.scroll_top = this.virtual_viewport.scrollTop;
            this.render_visible_rows();
        });
    }

    render_visible_rows() {
        const total = this.filtered_data.length;
        if (total === 0) {
            this.spacer.style.height = '0px';
            this.rows_container.innerHTML = '';
            return;
        }
        const row_h = this.options.row_height;
        const view_h = this.virtual_viewport.clientHeight;
        const start = Math.floor(this.scroll_top / row_h);
        const end = Math.min(total, start + Math.ceil(view_h / row_h) + 2);
        this.spacer.style.height = `${total * row_h}px`;
        const fragment = document.createDocumentFragment();
        for (let i = start; i < end; i++) {
            const row = this.build_row_element(i);
            row.style.position = 'absolute';
            row.style.top = `${i * row_h}px`;
            row.style.left = '0';
            row.style.right = '0';
            row.style.height = `${row_h}px`;
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.borderBottom = '1px solid #eee';
            fragment.appendChild(row);
        }
        this.rows_container.innerHTML = '';
        this.rows_container.appendChild(fragment);
    }

    build_row_element(row_index) {
        const row_data = this.filtered_data[row_index];
        const row = document.createElement('div');
        row.className = 'data_table_row';
        row.setAttribute('data-row-index', row_index);
        this.apply_row_style(row, row_index, row_data);
        for (let col_index = 0; col_index < this.columns.length; col_index++) {
            const col = this.columns[col_index];
            let value = row_data[col.field];
            let display = value;
            if (col.renderer) display = col.renderer(value, row_data);
            else if (value === undefined || value === null) display = '';
            const cell = document.createElement('div');
            cell.className = 'data_table_cell';
            cell.style.cssText = `flex:${col.width ? `0 0 ${col.width}` : '1 1 auto'}; padding:4px 8px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`;
            cell.textContent = display;
            cell.setAttribute('data-col-index', col_index);
            cell.setAttribute('data-col-field', col.field);
            cell.setAttribute('data-value', value);
            this.apply_cell_style(cell, row_index, col_index, value, row_data);
            cell.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handle_cell_click(row_index, col_index, value, row_data, e);
            });
            row.appendChild(cell);
        }
        row.addEventListener('click', (e) => this.handle_row_click(row_index, row_data, e));
        return row;
    }

    apply_row_style(row, row_index, row_data) {
        const hl = this.options.highlight;
        if (hl === 'row' && this.selection_manager.is_row_selected(row_index)) {
            row.style.backgroundColor = '#e0f0ff';
        } else if (hl === 'all' && this.selection_manager.is_row_selected(row_index)) {
            row.style.backgroundColor = '#e0f0ff';
        } else {
            row.style.backgroundColor = 'transparent';
        }
        if (this.options.row_style) {
            const custom = this.options.row_style(row_data, row_index);
            if (custom) Object.assign(row.style, custom);
        }
    }

    apply_cell_style(cell, row_index, col_index, value, row_data) {
        const col = this.columns[col_index];
        if (col.conditional_style) {
            const custom = col.conditional_style(value, row_data);
            if (custom) Object.assign(cell.style, custom);
        }
        const hl = this.options.highlight;
        if ((hl === 'cell' || hl === 'all') && this.selection_manager.is_cell_selected(row_index, col_index)) {
            cell.style.backgroundColor = '#e0f0ff';
        }
    }
    // #endregion

    // #region sorting_filtering
    sort_by_column(field) {
        if (!this.options.sortable) return;
        this.undo_manager.save_state();
        if (this.sort_state.column === field) {
            this.sort_state.direction = this.sort_state.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.sort_state = { column: field, direction: 'asc' };
        }
        this.apply_filters_and_sort();
        this.update_sort_indicators();
        if (this.options.on_data_change) this.options.on_data_change();
    }

    apply_filters_and_sort() {
        let filtered = this.raw_data.slice();
        // Global filter
        if (this.global_filter) {
            filtered = filtered.filter(row => {
                for (let key in row) {
                    if (String(row[key]).toLowerCase().includes(this.global_filter)) return true;
                }
                return false;
            });
        }
        // Column filters
        for (const [field, filters] of Object.entries(this.column_filters)) {
            if (filters.include && filters.include.size) {
                filtered = filtered.filter(row => filters.include.has(String(row[field])));
            } else if (filters.exclude && filters.exclude.size) {
                filtered = filtered.filter(row => !filters.exclude.has(String(row[field])));
            }
        }
        // Sort
        if (this.sort_state.column) {
            const col = this.sort_state.column;
            const dir = this.sort_state.direction;
            filtered.sort((a, b) => {
                let av = a[col] ?? '';
                let bv = b[col] ?? '';
                if (typeof av === 'number' && typeof bv === 'number') {
                    return dir === 'asc' ? av - bv : bv - av;
                }
                av = String(av).toLowerCase();
                bv = String(bv).toLowerCase();
                if (av < bv) return dir === 'asc' ? -1 : 1;
                if (av > bv) return dir === 'asc' ? 1 : -1;
                return 0;
            });
        }
        this.filtered_data = filtered;
        this.selection_manager.clear();
        this.virtual_viewport.scrollTop = 0;
        this.render_visible_rows();
    }

    update_sort_indicators() {
        const headers = this.table_header.children;
        for (let i = 0; i < headers.length; i++) {
            const col = this.columns[i];
            const indicator = headers[i].querySelector('.sort_indicator');
            if (indicator) {
                if (this.sort_state.column === col.field) {
                    indicator.textContent = this.sort_state.direction === 'asc' ? '\u25B2' : '\u25BC';
                } else {
                    indicator.textContent = '\u2195';
                }
            }
        }
    }

    show_column_filter_popup(field, anchor) {
        const unique = new Set();
        for (const row of this.raw_data) {
            let val = row[field];
            if (val !== undefined && val !== null) unique.add(String(val));
        }
        const values = Array.from(unique).sort();
        const popup = document.createElement('div');
        popup.className = 'data_table_filter_popup';
        popup.style.cssText = `position:absolute; background:white; border:1px solid #ccc; border-radius:4px; padding:8px; box-shadow:0 2px 8px rgba(0,0,0,0.15); z-index:1000; max-height:300px; overflow-y:auto; min-width:200px;`;
        const rect = anchor.getBoundingClientRect();
        popup.style.top = `${rect.bottom + window.scrollY}px`;
        popup.style.left = `${rect.left + window.scrollX}px`;

        const search = document.createElement('input');
        search.type = 'text';
        search.placeholder = 'Search...';
        search.style.cssText = 'width:100%; padding:4px; margin-bottom:8px;';
        popup.appendChild(search);

        const list = document.createElement('div');
        popup.appendChild(list);

        const render = (filter_text) => {
            list.innerHTML = '';
            const filtered = values.filter(v => v.toLowerCase().includes(filter_text.toLowerCase()));
            for (const val of filtered) {
                const item = document.createElement('div');
                item.style.cssText = 'display:flex; align-items:center; gap:8px; padding:4px; cursor:pointer; border-bottom:1px solid #eee;';
                const current = this.column_filters[field] || {};
                const include = current.include?.has(val);
                const exclude = current.exclude?.has(val);
                let icon = '\u26AA';
                if (include) icon = '\u2705';
                else if (exclude) icon = '\u274C';
                const icon_span = document.createElement('span');
                icon_span.textContent = icon;
                icon_span.style.width = '20px';
                const label = document.createElement('span');
                label.textContent = val;
                item.appendChild(icon_span);
                item.appendChild(label);
                item.onclick = () => {
                    this.toggle_column_filter(field, val);
                    render(search.value);
                };
                list.appendChild(item);
            }
        };
        search.addEventListener('input', (e) => render(e.target.value));
        render('');
        document.body.appendChild(popup);
        const close = (e) => {
            if (!popup.contains(e.target)) {
                popup.remove();
                document.removeEventListener('click', close);
            }
        };
        setTimeout(() => document.addEventListener('click', close), 0);
    }

    toggle_column_filter(field, value) {
        this.undo_manager.save_state();
        if (!this.column_filters[field]) this.column_filters[field] = {};
        const f = this.column_filters[field];
        if (f.include?.has(value)) {
            f.include.delete(value);
            if (!f.exclude) f.exclude = new Set();
            f.exclude.add(value);
        } else if (f.exclude?.has(value)) {
            f.exclude.delete(value);
        } else {
            if (!f.include) f.include = new Set();
            f.include.add(value);
        }
        if (f.include?.size === 0) delete f.include;
        if (f.exclude?.size === 0) delete f.exclude;
        if (Object.keys(f).length === 0) delete this.column_filters[field];
        this.apply_filters_and_sort();
    }
    // #endregion

    // #region selection_management
    handle_row_click(row_index, row_data, event) {
        if (this.options.on_row_click) this.options.on_row_click(row_data, row_index, event);
        this.selection_manager.handle_row_click(row_index, event);
        if (this.options.on_selection_change) this.options.on_selection_change(this.selection_manager.get_selected());
    }

    handle_cell_click(row_index, col_index, value, row_data, event) {
        if (this.options.on_cell_click) this.options.on_cell_click(row_index, col_index, value, row_data, event);
        this.selection_manager.handle_cell_click(row_index, col_index, event);
        if (this.options.on_selection_change) this.options.on_selection_change(this.selection_manager.get_selected());
    }
    // #endregion

    // #region undo_redo
    save_state() {
        this.undo_manager.save_state();
    }

    undo() { this.undo_manager.undo(); }
    redo() { this.undo_manager.redo(); }
    // #endregion

    // #region data_io
    export_csv() {
        const rows = this.filtered_data;
        if (!rows.length) return '';
        const headers = this.columns.map(c => c.header || c.field);
        const lines = [headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',')];
        for (const row of rows) {
            const values = this.columns.map(c => {
                let val = row[c.field];
                if (val === undefined) val = '';
                if (typeof val === 'string') val = `"${val.replace(/"/g, '""')}"`;
                return val;
            });
            lines.push(values.join(','));
        }
        return lines.join('\n');
    }

    import_csv(csv_text, has_header = true) {
        this.undo_manager.save_state();
        const lines = csv_text.trim().split(/\r?\n/);
        if (!lines.length) return;
        let headers;
        let data_lines = lines;
        if (has_header) {
            headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
            data_lines = lines.slice(1);
        } else {
            headers = this.columns.map(c => c.field);
        }
        const new_data = [];
        for (const line of data_lines) {
            const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const row = {};
            for (let i = 0; i < headers.length; i++) {
                row[headers[i]] = values[i] || '';
            }
            new_data.push(row);
        }
        this.set_data(new_data);
    }

    import_from_list_of_dicts(data_array) {
        this.undo_manager.save_state();
        this.set_data(data_array);
    }

    import_from_list_of_lists(data_array, headers = null) {
        this.undo_manager.save_state();
        const cols = headers || this.columns.map(c => c.field);
        const new_data = [];
        for (const row_list of data_array) {
            const row = {};
            for (let i = 0; i < cols.length; i++) {
                row[cols[i]] = row_list[i] !== undefined ? row_list[i] : '';
            }
            new_data.push(row);
        }
        this.set_data(new_data);
    }

    set_data(new_data) {
        this.undo_manager.save_state();
        this.raw_data = new_data.slice();
        this.global_filter = '';
        if (this.filter_input) this.filter_input.value = '';
        this.sort_state = { column: null, direction: 'asc' };
        this.column_filters = {};
        this.selection_manager.clear();
        this.apply_filters_and_sort();
        if (this.options.on_data_change) this.options.on_data_change();
    }

    set_columns(new_columns) {
        this.undo_manager.save_state();
        this.columns = new_columns;
        this.build_header();
        this.apply_filters_and_sort();
    }

    refresh() {
        this.render_visible_rows();
    }
    // #endregion

    // #region event_binding
    bind_global_events() {
        document.addEventListener('keydown', this.handle_keydown.bind(this));
        this.container.addEventListener('contextmenu', this.handle_contextmenu.bind(this));
        this.container.addEventListener('click', (e) => { if (this.options.on_table_click) this.options.on_table_click(e); });
        this.container.addEventListener('dblclick', this.handle_dblclick.bind(this));
    }

    handle_keydown(e) {
        const ctrl = e.ctrlKey || e.metaKey;
        if (ctrl && e.key === 'c') { this.copy_selection(); e.preventDefault(); }
        else if (ctrl && e.key === 'v') { this.paste_to_selection(); e.preventDefault(); }
        else if (ctrl && !e.shiftKey && e.key === 'z') { this.undo(); e.preventDefault(); }
        else if (ctrl && e.shiftKey && e.key === 'Z') { this.redo(); e.preventDefault(); }
    }

    copy_selection() {
        const selected = this.selection_manager.get_selected_cells();
        if (!selected.length) return;
        const rows = [...new Set(selected.map(s => s.row))].sort((a,b)=>a-b);
        const data = rows.map(r => {
            const cells = selected.filter(s => s.row === r).sort((a,b)=>a.col-b.col);
            return cells.map(c => c.value).join('\t');
        }).join('\n');
        navigator.clipboard.writeText(data);
    }

    paste_to_selection() {
        // Placeholder - full implementation would require clipboard parsing and cell update.
        alert('Paste not fully implemented yet');
    }

    handle_contextmenu(e) {
        const cell = e.target.closest('.data_table_cell');
        if (!cell) return;
        e.preventDefault();
        const x = e.clientX, y = e.clientY;
        const menu = document.createElement('div');
        menu.className = 'data_table_context_menu';
        menu.style.cssText = 'position:absolute; background:white; border:1px solid #ccc; border-radius:4px; padding:4px 0; box-shadow:0 2px 8px rgba(0,0,0,0.15); z-index:1001;';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        const items = ['Copy', 'Cut', 'Paste', 'Undo', 'Redo'];
        for (const item of items) {
            const div = document.createElement('div');
            div.textContent = item;
            div.style.cssText = 'padding:4px 12px; cursor:pointer;';
            div.onmouseover = () => div.style.backgroundColor = '#f0f0f0';
            div.onmouseout = () => div.style.backgroundColor = 'white';
            div.onclick = () => {
                if (item === 'Copy') this.copy_selection();
                else if (item === 'Undo') this.undo();
                else if (item === 'Redo') this.redo();
                menu.remove();
            };
            menu.appendChild(div);
        }
        document.body.appendChild(menu);
        const close = (e) => { if (!menu.contains(e.target)) menu.remove(); document.removeEventListener('click', close); };
        setTimeout(() => document.addEventListener('click', close), 0);
    }

    handle_dblclick(e) {
        const cell = e.target.closest('.data_table_cell');
        if (!cell || !this.options.editable) return;
        const row_idx = parseInt(cell.parentElement.getAttribute('data-row-index'));
        const col_idx = parseInt(cell.getAttribute('data-col-index'));
        const col = this.columns[col_idx];
        const old_val = this.filtered_data[row_idx][col.field];
        const input = document.createElement('input');
        input.value = old_val;
        input.style.cssText = 'width:100%; height:100%; border:none; padding:0; background:transparent;';
        cell.innerHTML = '';
        cell.appendChild(input);
        input.focus();
        const save = () => {
            const new_val = input.value;
            if (new_val !== old_val) {
                this.undo_manager.save_state();
                this.filtered_data[row_idx][col.field] = new_val;
                this.raw_data[row_idx][col.field] = new_val;
                this.render_visible_rows();
                if (this.options.on_cell_edit) this.options.on_cell_edit(row_idx, col_idx, new_val, old_val);
                if (this.options.on_data_change) this.options.on_data_change();
            }
            cell.innerHTML = this.filtered_data[row_idx][col.field];
        };
        input.addEventListener('blur', save);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cell.innerHTML = old_val; });
    }
    // #endregion
}
// #endregion