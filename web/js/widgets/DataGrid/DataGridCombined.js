
/* --- Begin: CellNode.js --- */

/**
 * Reusable cell wrapper - updates its DOM element without re-creating it.
 */
class CellNode {
    /**
     * @param {HTMLElement} element - The <div> representing the cell.
     * @param {number} col_index - Index of the column.
     * @param {string} field - Field name.
     */
    constructor(element, col_index, field) {
        this.element = element;
        this.col_index = col_index;
        this.field = field;
        element.setAttribute('data-col-index', col_index);
        element.setAttribute('data-col-field', field);
        element.setAttribute('data-value', '');
    }

    /**
     * Update the cell's content and style based on provided parameters.
     * @param {any} value - The cell value.
     * @param {Object} style - Pre-computed inline style object.
     * @param {string} [renderer_output] - Optional pre-rendered text.
     */
    update(value, style, renderer_output) {
        this.element.textContent = renderer_output !== undefined ? renderer_output : (value ?? '');
        this.element.setAttribute('data-value', value);
        // Apply inline styles
        for (let prop in style) {
            this.element.style[prop] = style[prop];
        }
    }
}

/* --- Begin: ColumnDef.js --- */

/**
 * Column definition - configuration for a single column.
 * @typedef {Object} ColumnDef
 * @property {string} field - Data field name.
 * @property {string} header - Column header text.
 * @property {number} [width] - Fixed width in pixels (optional).
 * @property {boolean} [sortable] - Whether the column can be sorted.
 * @property {boolean} [filterable] - Whether the column can be filtered.
 * @property {Function} [renderer] - Custom cell renderer (value, rowData) => string.
 * @property {Function} [conditional_style] - (value, rowData) => style object.
 * @property {Object} [cell_style] - Static style object for all cells in this column.
 */

/* --- Begin: CustomScrollbar.js --- */

class CustomScrollbar {
    constructor(container, options) {
        this.container = container;
        this.orientation = options.orientation || 'vertical';
        this.total_rows = options.total_rows || 0;
        this.viewport_rows = options.viewport_rows || 0;
        this.row_height = options.row_height || 35;
        this.on_scroll = options.on_scroll || (() => {});
        this.current_ratio = 0;
        this.arrow_timer = null;
        this.arrow_step = 0;
        this._inject_styles();
        this._build_dom();
        this._attach_events();
        this._update_thumb();
    }

    _inject_styles() {
        if (document.getElementById('custom_scrollbar_styles')) return;
        let style = document.createElement('style');
        style.id = 'custom_scrollbar_styles';
        style.textContent = `
            .custom_scrollbar {
                display: flex;
                flex-direction: column;
                align-items: center;
                background: #f0f0f0;
                border-left: 1px solid #ddd;
                width: 8px;
                position: absolute;
                right: 0;
                top: 0;
                bottom: 0;
                z-index: 10;
            }
            .custom_scrollbar_horizontal {
                flex-direction: row;
                bottom: 0;
                left: 0;
                right: 0;
                height: 8px;
                width: auto;
                border-left: none;
                border-top: 1px solid #ddd;
            }
            .custom_scrollbar_track {
                flex: 1;
                position: relative;
                width: 100%;
                background: #f0f0f0;
            }
            .custom_scrollbar_thumb {
                position: absolute;
                background: #aaa;
                border-radius: 4px;
                cursor: pointer;
                transition: background 0.2s;
            }
            .custom_scrollbar_thumb:hover {
                background: #666;
            }
            .custom_scrollbar_vertical .custom_scrollbar_thumb {
                width: 100%;
                left: 0;
            }
            .custom_scrollbar_horizontal .custom_scrollbar_thumb {
                height: 100%;
                top: 0;
            }
            .custom_scrollbar_prev, .custom_scrollbar_next {
                background: #e0e0e0;
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 8px;
                width: 100%;
                height: 12px;
                line-height: 12px;
                color: #555;
            }
            .custom_scrollbar_prev:hover, .custom_scrollbar_next:hover {
                background: #ccc;
            }
            .custom_scrollbar_horizontal .custom_scrollbar_prev,
            .custom_scrollbar_horizontal .custom_scrollbar_next {
                width: 12px;
                height: 100%;
            }
        `;
        document.head.appendChild(style);
    }

    _build_dom() {
        this.wrapper = document.createElement('div');
        this.wrapper.className = `custom_scrollbar custom_scrollbar_${this.orientation}`;

        this.track = document.createElement('div');
        this.track.className = 'custom_scrollbar_track';

        this.thumb = document.createElement('div');
        this.thumb.className = 'custom_scrollbar_thumb';

        this.prev_btn = document.createElement('button');
        this.prev_btn.className = 'custom_scrollbar_prev';
        this.prev_btn.textContent = this.orientation === 'vertical' ? '\u25B2' : '\u25C0';

        this.next_btn = document.createElement('button');
        this.next_btn.className = 'custom_scrollbar_next';
        this.next_btn.textContent = this.orientation === 'vertical' ? '\u25BC' : '\u25B6';

        this.track.appendChild(this.thumb);
        this.wrapper.appendChild(this.prev_btn);
        this.wrapper.appendChild(this.track);
        this.wrapper.appendChild(this.next_btn);
        this.container.appendChild(this.wrapper);
    }

    _attach_events() {
        let drag_start = 0;
        let start_pos = 0;
        let on_move = (e) => {
            let delta = (this.orientation === 'vertical' ? e.clientY : e.clientX) - drag_start;
            let new_pos = start_pos + delta;
            let max_move = this._get_max_move();
            new_pos = Math.min(max_move, Math.max(0, new_pos));
            let ratio = new_pos / max_move;
            this.set_scroll_ratio(ratio);
        };
        let on_up = () => {
            document.removeEventListener('mousemove', on_move);
            document.removeEventListener('mouseup', on_up);
        };
        this.thumb.addEventListener('mousedown', (e) => {
            e.preventDefault();
            drag_start = this.orientation === 'vertical' ? e.clientY : e.clientX;
            start_pos = parseFloat(this.thumb.style[this.orientation === 'vertical' ? 'top' : 'left']) || 0;
            document.addEventListener('mousemove', on_move);
            document.addEventListener('mouseup', on_up);
        });

        this.track.addEventListener('click', (e) => {
            if (e.target === this.thumb) return;
            let rect = this.track.getBoundingClientRect();
            let click_pos = (this.orientation === 'vertical' ? e.clientY - rect.top : e.clientX - rect.left);
            let thumb_size = this.orientation === 'vertical' ? this.thumb.offsetHeight : this.thumb.offsetWidth;
            let new_pos = click_pos - thumb_size / 2;
            let max_move = this._get_max_move();
            new_pos = Math.min(max_move, Math.max(0, new_pos));
            let ratio = new_pos / max_move;
            this.set_scroll_ratio(ratio);
        });

        let startArrowScrolling = (direction) => {
            if (this.arrow_timer) clearInterval(this.arrow_timer);
            this.arrow_step = 10;
            let scrollStep = () => {
                let maxStep = Math.max(10, Math.floor(this.total_rows * 0.1));
                let stepRows = Math.min(maxStep, this.arrow_step);
                let ratioDelta = stepRows / this.total_rows;
                let newRatio = this.current_ratio + (direction === 'up' ? -ratioDelta : ratioDelta);
                this.set_scroll_ratio(newRatio);
                this.arrow_step = Math.min(maxStep, this.arrow_step + 5);
            };
            this.arrow_timer = setInterval(scrollStep, 50);
        };
        let stopArrowScrolling = () => {
            if (this.arrow_timer) {
                clearInterval(this.arrow_timer);
                this.arrow_timer = null;
            }
        };
        this.prev_btn.addEventListener('mousedown', () => startArrowScrolling('up'));
        this.prev_btn.addEventListener('mouseup', stopArrowScrolling);
        this.prev_btn.addEventListener('mouseleave', stopArrowScrolling);
        this.next_btn.addEventListener('mousedown', () => startArrowScrolling('down'));
        this.next_btn.addEventListener('mouseup', stopArrowScrolling);
        this.next_btn.addEventListener('mouseleave', stopArrowScrolling);

        let wheelStepRows = 30;
        this.container.addEventListener('wheel', (e) => {
            let delta = (this.orientation === 'vertical' ? e.deltaY : e.deltaX);
            let stepRows = (delta > 0 ? wheelStepRows : -wheelStepRows);
            let ratioDelta = stepRows / this.total_rows;
            let newRatio = this.current_ratio + ratioDelta;
            this.set_scroll_ratio(newRatio);
            e.preventDefault();
        });
    }

    _get_max_move() {
        let track_size = this.orientation === 'vertical' ? this.track.clientHeight : this.track.clientWidth;
        let thumb_size = this.orientation === 'vertical' ? this.thumb.offsetHeight : this.thumb.offsetWidth;
        return track_size - thumb_size;
    }

    _update_thumb() {
        if (this.total_rows <= this.viewport_rows) {
            this.wrapper.style.display = 'none';
            return;
        }
        this.wrapper.style.display = 'flex';
        let track_size = this.orientation === 'vertical' ? this.track.clientHeight : this.track.clientWidth;
        let thumb_ratio = this.viewport_rows / this.total_rows;
        let thumb_size = Math.max(20, track_size * thumb_ratio);
        if (this.orientation === 'vertical') {
            this.thumb.style.height = thumb_size + 'px';
        } else {
            this.thumb.style.width = thumb_size + 'px';
        }
        let max_move = this._get_max_move();
        let current_pos = this.current_ratio * max_move;
        if (this.orientation === 'vertical') {
            this.thumb.style.top = current_pos + 'px';
        } else {
            this.thumb.style.left = current_pos + 'px';
        }
    }

    set_scroll_ratio(ratio) {
        this.current_ratio = Math.min(1, Math.max(0, ratio));
        let max_move = this._get_max_move();
        let new_pos = this.current_ratio * max_move;
        if (this.orientation === 'vertical') {
            this.thumb.style.top = new_pos + 'px';
        } else {
            this.thumb.style.left = new_pos + 'px';
        }
        this.on_scroll(this.current_ratio);
    }

    set_total_rows(rows) {
        this.total_rows = rows;
        this._update_thumb();
    }

    set_viewport_rows(rows) {
        this.viewport_rows = rows;
        this._update_thumb();
    }
}

/* --- Begin: DOMPool.js --- */

/**
 * Pre-allocates and manages a pool of RowNode instances.
 */
class DOMPool {
    /**
     * @param {HTMLElement} container - The <div> that will hold the rows.
     * @param {number} pool_size - Number of rows to keep in the pool.
     * @param {number} col_count - Number of columns.
     * @param {Array<ColumnDef>} columns - Column definitions.
     */
    constructor(container, pool_size, col_count, columns) {
        this.container = container;
        this.pool = [];
        for (let i = 0; i < pool_size; i++) {
            let row_div = document.createElement('div');
            row_div.className = 'data_table_row';
            container.appendChild(row_div);
            let row_node = new RowNode(row_div, col_count, columns);
            this.pool.push(row_node);
        }
    }

    /**
     * Get the RowNode at a given pool index.
     * @param {number} index
     * @returns {RowNode}
     */
    get(index) {
        return this.pool[index];
    }

    /**
     * Number of rows in the pool.
     * @returns {number}
     */
    size() {
        return this.pool.length;
    }
}

/* --- Begin: EditManager.js --- */

// #region edit_manager
class EditManager {
    constructor(model, dom_manager, on_change) {
        this.model = model;
        this.dom = dom_manager;
        this.on_change = on_change;
        this.dom.add_event_listener('dblclick', this.handle_dblclick.bind(this));
    }

    handle_dblclick(event) {
        let cell = event.target.closest('.data_table_cell');
        if (!cell) return;
        let row_idx = parseInt(cell.parentElement.getAttribute('data-row-index'));
        let col_idx = parseInt(cell.getAttribute('data-col-index'));
        if (isNaN(row_idx) || isNaN(col_idx)) return;
        let col = this.model.columns[col_idx];
        let field = col.field;
        let old_value = this.model.get_cell_value(row_idx, field);

        if (col.type === 'boolean' || typeof old_value === 'boolean') {
            this._edit_boolean(cell, row_idx, col_idx, field, old_value, col);
        } else {
            this._edit_text(cell, row_idx, col_idx, field, old_value, col);
        }
    }

    _edit_text(cell, row_idx, col_idx, field, old_value, col) {
        cell.innerHTML = '';
        cell.style.position = 'relative';
        cell.style.padding = '0';
        let input = document.createElement('input');
        input.value = old_value;
        input.style.width = '100%';
        input.style.height = '100%';
        input.style.border = 'none';
        input.style.outline = 'none';
        input.style.padding = '4px 8px';
        input.style.boxSizing = 'border-box';
        input.style.position = 'absolute';
        input.style.left = '0';
        input.style.top = '0';
        input.style.margin = '0';
        cell.appendChild(input);
        input.focus();
        input.select();

        let save = () => {
            let new_value = input.value;
            this.model.set_cell_value(row_idx, field, new_value);
            if (col.width === 'auto') {
                let header_cell = this.dom.header.querySelector(`[data-col-index="${col_idx}"]`);
                if (header_cell) {
                    let new_width = Math.max(header_cell.offsetWidth, (new_value.length * 8) + 20) + 'px';
                    col.width = new_width;
                    this.dom.update_column_widths(this.model.columns);
                }
            }
            if (this.on_change) this.on_change();
        };
        input.addEventListener('blur', save);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') save();
            else if (e.key === 'Escape') {
                cell.innerHTML = old_value;
                if (this.on_change) this.on_change();
            }
        });
    }

    _edit_boolean(cell, row_idx, col_idx, field, old_value, col) {
        cell.innerHTML = '';
        cell.style.padding = '0';
        let select = document.createElement('select');
        let option_true = document.createElement('option');
        option_true.value = 'true';
        option_true.textContent = 'true';
        let option_false = document.createElement('option');
        option_false.value = 'false';
        option_false.textContent = 'false';
        select.appendChild(option_true);
        select.appendChild(option_false);
        select.value = old_value ? 'true' : 'false';
        select.style.width = '100%';
        select.style.height = '100%';
        select.style.border = 'none';
        select.style.outline = 'none';
        select.style.padding = '4px 8px';
        select.style.boxSizing = 'border-box';
        cell.appendChild(select);
        select.focus();

        let save = () => {
            let new_value = select.value === 'true';
            this.model.set_cell_value(row_idx, field, new_value);
            if (this.on_change) this.on_change();
        };
        select.addEventListener('blur', save);
        select.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') save();
            else if (e.key === 'Escape') {
                cell.innerHTML = old_value ? '\u2705' : '\u274C';
                if (this.on_change) this.on_change();
            }
        });
    }
}
// #endregion

/* --- Begin: FilterManager.js --- */

// #region filter_manager
class FilterManager {
    constructor(model, dom_manager, on_change) {
        this.model = model;
        this.dom = dom_manager;
        this.on_change = on_change;
    }

    set_global_filter(text) {
        this.model.global_filter = text.toLowerCase();
        this.apply_filters();
    }

    clear_all_filters() {
        this.model.global_filter = '';
        this.model.column_filters.clear();
        this.apply_filters();
    }

    apply_filters() {
        let filtered = this.model.raw_data.slice();
        if (this.model.global_filter) {
            filtered = filtered.filter(row => {
                for (let key in row) {
                    if (String(row[key]).toLowerCase().includes(this.model.global_filter)) return true;
                }
                return false;
            });
        }
        // column filters (simplified - expand as needed)
        for (let [field, filter_set] of this.model.column_filters.entries()) {
            if (filter_set.include && filter_set.include.size) {
                filtered = filtered.filter(row => filter_set.include.has(String(row[field])));
            } else if (filter_set.exclude && filter_set.exclude.size) {
                filtered = filtered.filter(row => !filter_set.exclude.has(String(row[field])));
            }
        }
        this.model.filtered_data = filtered;
        if (this.on_change) this.on_change();
    }
}
// #endregion

/* --- Begin: GridAPI.js --- */

// #region grid_api
class GridAPI {
    constructor(container, columns, data, options = {}) {
        this.options = {
            row_height: options.row_height || 35,
            max_rows: options.max_rows || Infinity,
            sortable: options.sortable !== false,
            filterable: options.filterable !== false,
            inline_edit: options.inline_edit !== false,
            live_filter: options.live_filter !== false,
            ...options
        };
        if (data.length > this.options.max_rows) {
            console.warn(`Data truncated to ${this.options.max_rows} rows.`);
            data = data.slice(0, this.options.max_rows);
        }

        container.style.position = 'relative';
        this.loading_overlay = this._create_loading_overlay();
        container.appendChild(this.loading_overlay);
        this._inject_styles();

        this.model = new GridDataModel(data, columns);
        this.dom = new GridDOMManager(container, columns);
        this.dom.update_column_widths(columns);

        // DEBUG: Check initial container and viewport sizes
        console.log('[GridAPI] container height:', container.clientHeight);
        console.log('[GridAPI] viewport height:', this.dom.get_viewport_height());

        // Wait for layout
        setTimeout(() => {
            this._initialize_grid(container, columns, data);
        }, 0);
    }

    _initialize_grid(container, columns, data) {
        console.log('[GridAPI] _initialize_grid called');
        console.log('[GridAPI] container height after timeout:', container.clientHeight);
        console.log('[GridAPI] viewport height after timeout:', this.dom.get_viewport_height());

        let visible_rows = Math.max(1, Math.ceil(this.dom.get_viewport_height() / this.options.row_height));
        let pool_size = Math.max(visible_rows, 30) + 10;
        console.log('[GridAPI] visible_rows:', visible_rows);
        console.log('[GridAPI] pool_size:', pool_size);

        this.pool = new DOMPool(this.dom.get_rows_container(), pool_size, columns.length, columns);
        this.scroller = new VirtualScroller(this.dom, this.pool, this.model, this.options.row_height, this.model.get_row_count());

        this.selection = new SelectionManager(this.model, this.dom, () => this.scroller.refresh());
        this.sort = new SortManager(this.model, this.dom, () => {
            this.update_total_rows();
            this.scroller.refresh();
        });
        this.filter = new FilterManager(this.model, this.dom, () => {
            this.update_total_rows();
            this.scroller.refresh();
        });
        this.edit = new EditManager(this.model, this.dom, () => this.scroller.refresh());

        this.dom.on_column_filter = (field, value, action) => {
            if (!this.model.column_filters.has(field)) {
                this.model.column_filters.set(field, { include: new Set(), exclude: new Set() });
            }
            let filter_set = this.model.column_filters.get(field);
            if (action === 'include') {
                filter_set.include.add(value);
                filter_set.exclude.delete(value);
            } else if (action === 'exclude') {
                filter_set.exclude.add(value);
                filter_set.include.delete(value);
            } else if (action === 'clear') {
                filter_set.include.clear();
                filter_set.exclude.clear();
            }
            this.filter.apply_filters();
        };

        this._resize_observer = new ResizeObserver(() => {
            if (this.scroller) this.scroller.refresh();
        });
        this._resize_observer.observe(container);

        this._setup_middle_click_autoscroll();

        this.show_loading(false);
        setTimeout(() => {
            console.log('[GridAPI] extra refresh after 50ms');
            if (this.scroller) this.scroller.refresh();
        }, 50);
    }

    _setup_middle_click_autoscroll() {
        let viewport = this.dom.viewport;
        let start_x = 0;
        let start_y = 0;
        let start_scroll_left = 0;
        let is_scrolling = false;

        viewport.addEventListener('mousedown', (e) => {
            if (e.button === 1) {
                e.preventDefault();
                is_scrolling = true;
                start_x = e.clientX;
                start_y = e.clientY;
                start_scroll_left = viewport.scrollLeft;
                document.body.style.cursor = 'grabbing';
            }
        });
        document.addEventListener('mousemove', (e) => {
            if (!is_scrolling) return;
            let dx = e.clientX - start_x;
            let dy = e.clientY - start_y;
            viewport.scrollLeft = start_scroll_left - dx;
            let vertical_scroll = this.dom.scrollbar;
            if (vertical_scroll && dy !== 0) {
                let ratio_delta = (dy / 100) * (vertical_scroll.total_rows / Math.max(1, vertical_scroll.viewport_rows));
                vertical_scroll.set_scroll_ratio(vertical_scroll.current_ratio - ratio_delta);
            }
        });
        document.addEventListener('mouseup', (e) => {
            if (e.button === 1) {
                is_scrolling = false;
                document.body.style.cursor = 'default';
            }
        });
    }

    update_total_rows() {
        if (this.scroller) this.scroller.total_rows = this.model.get_row_count();
    }

    add_row(row_data) {
        this.model.raw_data.push(row_data);
        this.model.filtered_data.push(row_data);
        this.update_total_rows();
        if (this.scroller) this.scroller.refresh();
    }

    _create_loading_overlay() {
        let overlay = document.createElement('div');
        overlay.className = 'data_table_loading_overlay';
        overlay.innerHTML = '<div class="spinner"></div><div class="loading_text">Loading...</div>';
        overlay.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(255,255,255,0.8); display:flex; align-items:center; justify-content:center; z-index:1000; flex-direction:column; gap:10px; display:none;';
        return overlay;
    }

    _inject_styles() {
        if (document.getElementById('datatable_loading_styles')) return;
        let style = document.createElement('style');
        style.id = 'datatable_loading_styles';
        style.textContent = `
            .data_table_loading_overlay .spinner {
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #3498db;
                border-radius: 50%;
                animation: data_table_spin 1s linear infinite;
            }
            @keyframes data_table_spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            .data_table_loading_overlay .loading_text {
                font-family: 'Segoe UI', sans-serif;
                font-size: 14px;
                color: #333;
            }
        `;
        document.head.appendChild(style);
    }

    show_loading(show) {
        if (this.loading_overlay) this.loading_overlay.style.display = show ? 'flex' : 'none';
    }

    set_global_filter(text) {
        if (this.filter) this.filter.set_global_filter(text);
    }

    clear_all_filters() {
        if (this.filter) this.filter.clear_all_filters();
    }

    export_csv() {
        let headers = this.model.columns.map(c => c.header || c.field);
        let rows = this.model.filtered_data.filter(r => r !== undefined && r !== null);
        let lines = [headers.join(',')];
        for (let row of rows) {
            let values = this.model.columns.map(c => {
                let val = row[c.field];
                if (val === undefined) return '';
                if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
                return val;
            });
            lines.push(values.join(','));
        }
        return lines.join('\n');
    }

    async import_csv(csv_text, has_header = true) {
        this.show_loading(true);
        let lines = csv_text.trim().split(/\r?\n/);
        if (!lines.length) {
            this.show_loading(false);
            return;
        }
        let headers;
        let data_lines = lines;
        if (has_header) {
            headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
            data_lines = lines.slice(1);
        } else {
            headers = this.model.columns.map(c => c.field);
        }
        let new_data = [];
        for (let line of data_lines) {
            let values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            let row = {};
            for (let i = 0; i < headers.length; i++) row[headers[i]] = values[i] || '';
            new_data.push(row);
        }
        this.model.raw_data = new_data.slice();
        this.model.filtered_data = this.model.raw_data.slice();
        this.model.cell_overrides.clear();
        this.model.row_metadata.clear();
        if (this.scroller) {
            this.scroller.total_rows = this.model.get_row_count();
            this.scroller.refresh();
        }
        this.show_loading(false);
    }
}
// #endregion

/* --- Begin: GridDataModel.js --- */

// #region grid_data_model
class GridDataModel {
    constructor(raw_data, columns) {
        this.raw_data = raw_data.slice();          // may contain undefined holes
        this.filtered_data = this.raw_data.slice(); // must filter out undefined
        this.columns = columns;
        this.cell_overrides = new Map();
        this.row_metadata = new Map();
        this.sort_state = { column: null, direction: 'asc' };
        this.global_filter = '';
        this.column_filters = new Map();
    }

    get_row_count() {
        return this.filtered_data.filter(r => r !== undefined && r !== null).length;
    }

    get_row(view_index) {
        // Ensure we return a valid row or empty object
        let row = this.filtered_data[view_index];
        if (row === undefined || row === null) {
            // Create a placeholder row with default values
            row = {};
            for (let col of this.columns) {
                row[col.field] = '';
            }
            this.filtered_data[view_index] = row;
        }
        return row;
    }

    get_cell_value(view_index, field) {
        let override_key = `${view_index}:${field}`;
        if (this.cell_overrides.has(override_key)) {
            return this.cell_overrides.get(override_key);
        }
        let row = this.get_row(view_index);
        return row[field];
    }

    set_cell_value(view_index, field, value) {
        let override_key = `${view_index}:${field}`;
        this.cell_overrides.set(override_key, value);
        let row = this.get_row(view_index);
        row[field] = value;
    }

    get_cell_style(view_index, field) {
        // same as before
        let col = this.columns.find(c => c.field === field);
        let row_meta = this.row_metadata.get(view_index);
        let override_key = `${view_index}:${field}:style`;
        let style = {};
        if (this.cell_overrides.has(override_key)) {
            style = { ...this.cell_overrides.get(override_key) };
        }
        if (col && col.cell_style) Object.assign(style, col.cell_style);
        if (col && col.conditional_style) {
            let value = this.get_cell_value(view_index, field);
            let cond = col.conditional_style(value, this.get_row(view_index));
            if (cond) Object.assign(style, cond);
        }
        if (row_meta && row_meta.style) Object.assign(style, row_meta.style);
        return style;
    }

    apply_filters_and_sort() {
        let filtered = this.raw_data.filter(r => r !== undefined && r !== null);
        if (this.global_filter) {
            filtered = filtered.filter(row => {
                for (let key in row) {
                    if (String(row[key]).toLowerCase().includes(this.global_filter)) return true;
                }
                return false;
            });
        }
        // column filters (simplified)
        for (let [field, filter_set] of this.column_filters.entries()) {
            // implementation depends on filter_set structure
        }
        if (this.sort_state.column) {
            let col = this.sort_state.column;
            let dir = this.sort_state.direction;
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
    }
}
// #endregion

/* --- Begin: GridDOMManager.js --- */

class GridDOMManager {
    constructor(container, columns) {
        this.container = container;
        this.columns = columns;
        this.wrapper = null;
        this.header = null;
        this.viewport = null;
        this.rows_container = null;
        this.scrollbar = null;
        this.scrollbar_container = null;
        this.on_column_filter = null;
        this._build_dom();
        this._inject_styles();
        this._attach_column_resize();
        this._attach_filter_popups();
    }

    _build_dom() {
        this.container.innerHTML = '';
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'data_table_wrapper';

        this.header = document.createElement('div');
        this.header.className = 'data_table_header';
        this._build_header();

        let body = document.createElement('div');
        body.className = 'data_table_body';

        this.viewport = document.createElement('div');
        this.viewport.className = 'data_table_viewport';
        this.viewport.style.overflowX = 'auto';
        this.viewport.style.overflowY = 'hidden';
        this.viewport.style.position = 'relative';
        this.viewport.style.flex = '1';

        this.rows_container = document.createElement('div');
        this.rows_container.className = 'data_table_rows_container';
        this.rows_container.style.position = 'relative';
        this.rows_container.style.width = this._get_total_width() + 'px';

        this.viewport.appendChild(this.rows_container);

        this.scrollbar_container = document.createElement('div');
        this.scrollbar_container.className = 'data_table_vscroll_container';
        this.scrollbar_container.style.width = '12px';
        this.scrollbar_container.style.position = 'relative';
        this.scrollbar_container.style.flexShrink = '0';

        body.appendChild(this.viewport);
        body.appendChild(this.scrollbar_container);

        this.wrapper.appendChild(this.header);
        this.wrapper.appendChild(body);
        this.container.appendChild(this.wrapper);

        this.viewport.addEventListener('scroll', () => {
            this.header.scrollLeft = this.viewport.scrollLeft;
        });
    }

    _build_header() {
        this.header.innerHTML = '';
        for (let i = 0; i < this.columns.length; i++) {
            let col = this.columns[i];
            let cell = document.createElement('div');
            cell.className = 'data_table_header_cell';
            cell.textContent = col.header || col.field;
            cell.setAttribute('data-col-index', i);
            cell.setAttribute('data-col-field', col.field);
            cell.style.width = col.width || '100px';
            cell.style.boxSizing = 'border-box';

            let indicator = document.createElement('span');
            indicator.className = 'sort_indicator';
            indicator.textContent = '\u2195';
            cell.appendChild(indicator);

            let filter_btn = document.createElement('button');
            filter_btn.textContent = '\u25BC';
            filter_btn.className = 'column_filter_btn';
            cell.appendChild(filter_btn);

            let resizer = document.createElement('div');
            resizer.className = 'column_resizer';
            cell.appendChild(resizer);

            this.header.appendChild(cell);
        }
    }

    _inject_styles() {
        if (document.getElementById('datatable_injected_css')) return;
        let style = document.createElement('style');
        style.id = 'datatable_injected_css';
        style.textContent = `
            .data_table_wrapper { display: flex; flex-direction: column; width: 100%; height: 100%; overflow: hidden; position: relative; }
            .data_table_body { display: flex; flex: 1; min-height: 0; }
            .data_table_viewport { position: relative; flex: 1; overflow-x: auto; overflow-y: hidden; }
            .data_table_header { display: flex; position: sticky; top: 0; background: #f5f5f5; border-bottom: 2px solid #ddd; z-index: 2; overflow: hidden; }
            .data_table_header_cell { flex: 0 0 auto; padding: 8px; font-weight: bold; display: flex; align-items: center; border-right: 1px solid #ddd; position: relative; box-sizing: border-box; }
            .data_table_rows_container { position: relative; }
            .data_table_row { display: flex; align-items: center; width: 100%; border-bottom: 1px solid #eee; cursor: pointer; background: white; position: absolute; left: 0; right: 0; }
            .data_table_row:hover { background: #f9f9f9; }
            .data_table_cell { flex: 0 0 auto; padding: 4px 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-right: 1px solid #f0f0f0; box-sizing: border-box; }
            .sort_indicator { margin-left: 5px; font-size: 10px; cursor: pointer; }
            .column_filter_btn { background: transparent; border: none; font-size: 10px; cursor: pointer; margin-left: 4px; }
            .column_resizer { position: absolute; right: 0; top: 0; bottom: 0; width: 5px; cursor: col-resize; background: transparent; z-index: 3; }
            .column_resizer:hover { background: #ccc; }
            .data_table_cell.selected { background-color: #d0e8ff; }
            .filter_popup { position: absolute; background: white; border: 1px solid #ccc; box-shadow: 0 2px 5px rgba(0,0,0,0.2); z-index: 10; padding: 5px; display: none; }
            .filter_popup input[type="text"] { width: 150px; margin-bottom: 5px; }
            .filter_popup button { margin-right: 5px; }
            .data_table_vscroll_container { position: relative; }
        `;
        document.head.appendChild(style);
    }

    _get_total_width() {
        let total = 0;
        for (let col of this.columns) {
            total += parseFloat(col.width) || 100;
        }
        return total;
    }

    update_column_widths(columns) {
        this.columns = columns;
        let rules = '';
        for (let i = 0; i < columns.length; i++) {
            let width = columns[i].width || '100px';
            rules += `.data_table_cell[data-col-index="${i}"], .data_table_header_cell[data-col-index="${i}"] { width: ${width}; flex: none; }\n`;
        }
        let col_style = document.getElementById('datatable_col_widths');
        if (col_style) col_style.textContent = rules;
        else {
            let style = document.createElement('style');
            style.id = 'datatable_col_widths';
            style.textContent = rules;
            document.head.appendChild(style);
        }
        this.rows_container.style.width = this._get_total_width() + 'px';
        let header_cells = this.header.querySelectorAll('.data_table_header_cell');
        header_cells.forEach((cell, i) => {
            cell.style.width = columns[i].width || '100px';
            cell.style.boxSizing = 'border-box';
        });
        // Update all existing cells in rows
        let all_cells = this.rows_container.querySelectorAll('.data_table_cell');
        all_cells.forEach(cell => {
            let col_idx = parseInt(cell.getAttribute('data-col-index'));
            if (!isNaN(col_idx) && columns[col_idx]) {
                cell.style.width = columns[col_idx].width || '100px';
                cell.style.boxSizing = 'border-box';
            }
        });
    }

    _attach_column_resize() {
        let resize_frame = null;
        this.header.addEventListener('mousedown', (e) => {
            if (!e.target.classList.contains('column_resizer')) return;
            e.preventDefault();
            let cell = e.target.parentElement;
            let colIndex = parseInt(cell.getAttribute('data-col-index'));
            let startX = e.clientX;
            let startWidth = cell.offsetWidth;

            let onMove = (moveEvent) => {
                if (resize_frame) cancelAnimationFrame(resize_frame);
                resize_frame = requestAnimationFrame(() => {
                    let newWidth = startWidth + (moveEvent.clientX - startX);
                    if (newWidth < 30) newWidth = 30;
                    this.columns[colIndex].width = newWidth + 'px';
                    this.update_column_widths(this.columns);
                });
            };
            let onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    }

    _attach_filter_popups() {
        this.header.addEventListener('click', (e) => {
            if (!e.target.classList.contains('column_filter_btn')) return;
            e.stopPropagation();
            let btn = e.target;
            let cell = btn.parentElement;
            let colIndex = parseInt(cell.getAttribute('data-col-index'));
            let col = this.columns[colIndex];
            let field = col.field;

            let existing = this.header.querySelector('.filter_popup.active');
            if (existing) existing.classList.remove('active');

            let popup = cell.querySelector('.filter_popup');
            if (!popup) {
                popup = document.createElement('div');
                popup.className = 'filter_popup';
                popup.innerHTML = `
                    <input type="text" placeholder="Filter value...">
                    <div>
                        <button class="apply_include">Include</button>
                        <button class="apply_exclude">Exclude</button>
                        <button class="clear_filter">Clear</button>
                    </div>
                `;
                cell.appendChild(popup);
                popup.style.display = 'block';
                popup.classList.add('active');

                popup.querySelector('.apply_include').addEventListener('click', () => {
                    let val = popup.querySelector('input').value.trim();
                    if (val && this.on_column_filter) {
                        this.on_column_filter(field, val, 'include');
                        popup.style.display = 'none';
                        popup.classList.remove('active');
                    }
                });
                popup.querySelector('.apply_exclude').addEventListener('click', () => {
                    let val = popup.querySelector('input').value.trim();
                    if (val && this.on_column_filter) {
                        this.on_column_filter(field, val, 'exclude');
                        popup.style.display = 'none';
                        popup.classList.remove('active');
                    }
                });
                popup.querySelector('.clear_filter').addEventListener('click', () => {
                    if (this.on_column_filter) {
                        this.on_column_filter(field, null, 'clear');
                    }
                    popup.style.display = 'none';
                    popup.classList.remove('active');
                });
            } else {
                popup.style.display = 'block';
                popup.classList.add('active');
            }
        });
    }

    init_scrollbar(total_rows, viewport_rows, row_height, on_scroll) {
        this.scrollbar = new CustomScrollbar(this.scrollbar_container, {
            orientation: 'vertical',
            total_rows: total_rows,
            viewport_rows: viewport_rows,
            row_height: row_height,
            on_scroll: (ratio) => on_scroll(ratio)
        });
        this.scrollbar_container.style.display = 'block';
    }

    update_scrollbar(total_rows, viewport_rows) {
        if (this.scrollbar) {
            this.scrollbar.set_total_rows(total_rows);
            this.scrollbar.set_viewport_rows(viewport_rows);
        }
    }

    get_viewport_height() {
        return this.viewport.clientHeight;
    }

    get_rows_container() {
        return this.rows_container;
    }

    add_event_listener(type, handler) {
        this.wrapper.addEventListener(type, handler);
    }
}

/* --- Begin: RowDef.js --- */

/**
 * Row metadata - stores row-level style, selection, and expansion state.
 */
class RowDef {
    /**
     * @param {number} index - Original row index in raw data.
     * @param {Object} [options]
     * @param {boolean} [options.selected] - Whether the row is selected.
     * @param {boolean} [options.expanded] - Whether the row is expanded (for future grouping).
     * @param {Object} [options.style] - Inline style object for the row.
     */
    constructor(index, options = {}) {
        this.index = index;
        this.selected = options.selected || false;
        this.expanded = options.expanded || false;
        this.style = options.style || {};
    }
}

/* --- Begin: RowNode.js --- */

/**
 * Reusable row wrapper - contains an array of CellNode instances.
 */
class RowNode {
    /**
     * @param {HTMLElement} row_element - The <div> representing the row.
     * @param {number} col_count - Number of columns.
     * @param {Array<ColumnDef>} columns - Column definitions.
     */
    constructor(row_element, col_count, columns) {
        this.element = row_element;
        this.cells = [];
        this.current_row_index = -1;
        for (let i = 0; i < col_count; i++) {
            let cell_div = document.createElement('div');
            cell_div.className = 'data_table_cell';
            cell_div.setAttribute('data-col-index', i);
            cell_div.setAttribute('data-col-field', columns[i].field);
            cell_div.style.width = columns[i].width || '100px';
            cell_div.style.boxSizing = 'border-box';
            row_element.appendChild(cell_div);
            let cell_node = new CellNode(cell_div, i, columns[i].field);
            this.cells.push(cell_node);
        }
    }

    /**
     * Update the row with data from a given row index.
     * @param {number} row_index - Index in the filtered data.
     * @param {Object} row_data - The row object.
     * @param {GridDataModel} model - The data model.
     * @param {Array<ColumnDef>} columns - Column definitions.
     */
    update(row_index, row_data, model, columns) {
        this.current_row_index = row_index;
        this.element.setAttribute('data-row-index', row_index);
        for (let col_idx = 0; col_idx < columns.length; col_idx++) {
            let col = columns[col_idx];
            let value = model.get_cell_value(row_index, col.field);
            let style = model.get_cell_style(row_index, col.field);
            let rendered = col.renderer ? col.renderer(value, row_data) : undefined;
            this.cells[col_idx].update(value, style, rendered);
        }
        let row_meta = model.row_metadata.get(row_index);
        if (row_meta && row_meta.style) {
            for (let prop in row_meta.style) {
                this.element.style[prop] = row_meta.style[prop];
            }
        }
    }
}

/* --- Begin: SelectionManager.js --- */

// #region selection_manager
class SelectionManager {
    constructor(model, dom_manager, on_change) {
        this.model = model;
        this.dom = dom_manager;
        this.on_change = on_change;
        this.selected_cells = new Set();
        this.anchor_cell = null;
        this.is_dragging = false;
        this.drag_start_cell = null;
        this.dom.add_event_listener('mousedown', this.handle_mousedown.bind(this));
        this.dom.add_event_listener('mouseup', this.handle_mouseup.bind(this));
        this.dom.add_event_listener('mousemove', this.handle_mousemove.bind(this));
        document.addEventListener('keydown', this.handle_keydown.bind(this));
        document.addEventListener('copy', this.handle_copy.bind(this));
        document.addEventListener('paste', this.handle_paste.bind(this));
    }

    get_cell_key(row, col) { return `${row}:${col}`; }

    clear_selection() {
        this.selected_cells.clear();
        this.highlight_selection();
        if (this.on_change) this.on_change();
    }

    select_cell(row, col, add_to_selection = false) {
        let key = this.get_cell_key(row, col);
        if (!add_to_selection) this.selected_cells.clear();
        if (this.selected_cells.has(key)) this.selected_cells.delete(key);
        else this.selected_cells.add(key);
        this.highlight_selection();
        if (this.on_change) this.on_change();
    }

    select_range(start_row, start_col, end_row, end_col) {
        let min_row = Math.min(start_row, end_row);
        let max_row = Math.max(start_row, end_row);
        let min_col = Math.min(start_col, end_col);
        let max_col = Math.max(start_col, end_col);
        this.selected_cells.clear();
        for (let r = min_row; r <= max_row; r++) {
            for (let c = min_col; c <= max_col; c++) {
                this.selected_cells.add(this.get_cell_key(r, c));
            }
        }
        this.highlight_selection();
        if (this.on_change) this.on_change();
    }

    select_row(row) {
        this.selected_cells.clear();
        for (let c = 0; c < this.model.columns.length; c++) {
            this.selected_cells.add(this.get_cell_key(row, c));
        }
        this.highlight_selection();
        if (this.on_change) this.on_change();
    }

    select_column(col) {
        this.selected_cells.clear();
        for (let r = 0; r < this.model.get_row_count(); r++) {
            this.selected_cells.add(this.get_cell_key(r, col));
        }
        this.highlight_selection();
        if (this.on_change) this.on_change();
    }

    highlight_selection() {
        let all_cells = this.dom.rows_container.querySelectorAll('.data_table_cell');
        all_cells.forEach(cell => cell.classList.remove('selected'));
        this.selected_cells.forEach(key => {
            let [row, col] = key.split(':').map(Number);
            let row_node = this.dom.rows_container.querySelector(`[data-row-index="${row}"]`);
            if (row_node) {
                let cell = row_node.querySelector(`[data-col-index="${col}"]`);
                if (cell) cell.classList.add('selected');
            }
        });
    }

    handle_mousedown(event) {
        let target = event.target;
        if (target.closest('.data_table_header_cell')) {
            let col_idx = parseInt(target.closest('.data_table_header_cell').getAttribute('data-col-index'));
            this.select_column(col_idx);
            event.preventDefault();
            return;
        }
        let cell = target.closest('.data_table_cell');
        if (!cell) return;
        let row_idx = parseInt(cell.parentElement.getAttribute('data-row-index'));
        let col_idx = parseInt(cell.getAttribute('data-col-index'));
        if (isNaN(row_idx)) return;
        this.is_dragging = true;
        this.drag_start_cell = { row: row_idx, col: col_idx };
        if (event.shiftKey && this.anchor_cell) {
            this.select_range(this.anchor_cell.row, this.anchor_cell.col, row_idx, col_idx);
        } else {
            this.anchor_cell = { row: row_idx, col: col_idx };
            if (event.ctrlKey || event.metaKey) {
                let key = this.get_cell_key(row_idx, col_idx);
                if (this.selected_cells.has(key)) this.selected_cells.delete(key);
                else this.selected_cells.add(key);
                this.highlight_selection();
                if (this.on_change) this.on_change();
            } else {
                this.select_cell(row_idx, col_idx, false);
            }
        }
        event.preventDefault();
    }

    handle_mouseup(event) {
        if (this.is_dragging) {
            this.is_dragging = false;
            let cell = event.target.closest('.data_table_cell');
            if (cell && this.drag_start_cell) {
                let row = parseInt(cell.parentElement.getAttribute('data-row-index'));
                let col = parseInt(cell.getAttribute('data-col-index'));
                if (this.drag_start_cell.row !== row || this.drag_start_cell.col !== col) {
                    this.select_range(this.drag_start_cell.row, this.drag_start_cell.col, row, col);
                }
            }
        }
    }

    handle_mousemove(event) {
        if (!this.is_dragging) return;
        let cell = event.target.closest('.data_table_cell');
        if (!cell) return;
        let row = parseInt(cell.parentElement.getAttribute('data-row-index'));
        let col = parseInt(cell.getAttribute('data-col-index'));
        this.select_range(this.drag_start_cell.row, this.drag_start_cell.col, row, col);
    }

    handle_keydown(event) {
        if (event.key === 'Escape') {
            this.clear_selection();
            return;
        }
        if (!this.anchor_cell) return;
        let row = this.anchor_cell.row;
        let col = this.anchor_cell.col;
        if (event.key === 'ArrowUp') row = Math.max(0, row - 1);
        else if (event.key === 'ArrowDown') row = Math.min(this.model.get_row_count() - 1, row + 1);
        else if (event.key === 'ArrowLeft') col = Math.max(0, col - 1);
        else if (event.key === 'ArrowRight') col = Math.min(this.model.columns.length - 1, col + 1);
        else return;

        if (event.ctrlKey && event.shiftKey) {
            this.select_range(this.anchor_cell.row, this.anchor_cell.col, row, col);
        } else if (event.shiftKey) {
            this.select_range(this.anchor_cell.row, this.anchor_cell.col, row, col);
        } else {
            this.anchor_cell = { row, col };
            this.select_cell(row, col, false);
        }
        event.preventDefault();
    }

    handle_copy(event) {
        if (this.selected_cells.size === 0) return;
        let data = this.get_selected_data_as_csv();
        event.clipboardData.setData('text/plain', data);
        event.preventDefault();
    }

    handle_paste(event) {
        if (this.selected_cells.size === 0) return;
        let text = event.clipboardData.getData('text/plain');
        if (!text) return;
        let rows = text.trim().split(/\r?\n/).map(line => line.split(/\t|,| /));
        let start_key = this.selected_cells.values().next().value;
        let [start_row, start_col] = start_key.split(':').map(Number);
        for (let i = 0; i < rows.length; i++) {
            for (let j = 0; j < rows[i].length; j++) {
                let target_row = start_row + i;
                let target_col = start_col + j;
                if (target_row >= this.model.get_row_count() || target_col >= this.model.columns.length) continue;
                let field = this.model.columns[target_col].field;
                let value = rows[i][j];
                if (value === 'true') value = true;
                else if (value === 'false') value = false;
                else if (!isNaN(value) && value !== '') value = Number(value);
                else value = String(value);
                this.model.set_cell_value(target_row, field, value);
            }
        }
        this.highlight_selection();
        if (this.on_change) this.on_change();
        event.preventDefault();
    }

    get_selected_data_as_csv() {
        let keys = Array.from(this.selected_cells).map(k => k.split(':').map(Number));
        if (keys.length === 0) return '';
        let min_row = Math.min(...keys.map(k => k[0]));
        let max_row = Math.max(...keys.map(k => k[0]));
        let min_col = Math.min(...keys.map(k => k[1]));
        let max_col = Math.max(...keys.map(k => k[1]));
        let lines = [];
        for (let r = min_row; r <= max_row; r++) {
            let row = [];
            for (let c = min_col; c <= max_col; c++) {
                if (this.selected_cells.has(this.get_cell_key(r, c))) {
                    row.push(this.model.get_cell_value(r, this.model.columns[c].field));
                } else {
                    row.push('');
                }
            }
            lines.push(row.join(','));
        }
        return lines.join('\n');
    }
}
// #endregion

/* --- Begin: SortManager.js --- */

// #region sort_manager
class SortManager {
    constructor(model, dom_manager, on_change) {
        this.model = model;
        this.dom = dom_manager;
        this.on_change = on_change;
        this.dom.add_event_listener('click', this.handle_header_click.bind(this));
    }

    handle_header_click(event) {
        let header = event.target.closest('.data_table_header_cell');
        if (!header) return;
        let col_index = parseInt(header.getAttribute('data-col-index'));
        let field = this.model.columns[col_index].field;
        if (this.model.sort_state.column === field) {
            this.model.sort_state.direction = this.model.sort_state.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.model.sort_state = { column: field, direction: 'asc' };
        }
        this.apply_sort();
        if (this.on_change) this.on_change();
    }

    apply_sort() {
        let col = this.model.sort_state.column;
        let dir = this.model.sort_state.direction;
        if (!col) return;
        // Sort filtered_data in-place
        this.model.filtered_data.sort((a, b) => {
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
}
// #endregion

/* --- Begin: VirtualScroller.js --- */

class VirtualScroller {
    constructor(dom_manager, pool, model, row_height, total_rows) {
        this.dom = dom_manager;
        this.pool = pool;
        this.model = model;
        this.row_height = row_height;
        this.total_rows = total_rows;
        this.visible_start = 0;
        this.visible_end = 0;
        this._initial_render_done = false;
        this._schedule_initial_render();
    }

    _schedule_initial_render() {
        requestAnimationFrame(() => {
            this._init_scrollbar_and_render();
        });
    }

    _init_scrollbar_and_render() {
        let viewport_rows = Math.max(1, Math.ceil(this.dom.get_viewport_height() / this.row_height));
        console.log('[VirtualScroller] viewport_rows:', viewport_rows);
        console.log('[VirtualScroller] total_rows:', this.total_rows);
        this.dom.init_scrollbar(this.total_rows, viewport_rows, this.row_height, (ratio) => this.on_scroll_ratio(ratio));
        this.visible_start = 0;
        this.visible_end = Math.min(this.total_rows, this.visible_start + viewport_rows + 2);
        console.log('[VirtualScroller] visible_start:', this.visible_start);
        console.log('[VirtualScroller] visible_end:', this.visible_end);
        this._initial_render_done = true;
        this.render();
    }

    on_scroll_ratio(ratio) {
        let max_start = Math.max(0, this.total_rows - 1);
        let new_start = Math.floor(ratio * max_start);
        new_start = Math.min(Math.max(0, new_start), this.total_rows - 1);
        let viewport_h = this.dom.get_viewport_height();
        let visible_rows = Math.ceil(viewport_h / this.row_height);
        let new_end = Math.min(this.total_rows, new_start + visible_rows + 2);
        if (new_start === this.visible_start && new_end === this.visible_end) return;
        this.visible_start = new_start;
        this.visible_end = new_end;
        this.render();
    }

    render() {
        if (!this._initial_render_done) return;
        let row_h = this.row_height;
        let total = this.total_rows;
        let pool_size = this.pool.size();
        console.log('[VirtualScroller] render() called. pool_size:', pool_size, 'visible_start:', this.visible_start, 'visible_end:', this.visible_end);
        for (let i = 0; i < pool_size; i++) {
            let row_node = this.pool.get(i);
            let row_index = this.visible_start + i;
            if (row_index >= this.visible_end || row_index >= total) {
                row_node.element.style.display = 'none';
                continue;
            }
            row_node.element.style.display = 'flex';
            row_node.element.style.position = 'absolute';
            row_node.element.style.top = ((row_index - this.visible_start) * row_h) + 'px';
            let row_data = this.model.get_row(row_index);
            row_node.update(row_index, row_data, this.model, this.model.columns);
        }
        let viewport_rows = Math.max(1, Math.ceil(this.dom.get_viewport_height() / row_h));
        this.dom.update_scrollbar(this.total_rows, viewport_rows);
    }

    refresh() {
        this.render();
    }
}
