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