// #region data_table
class DataTable {
    constructor(container, columns, data = [], options = {}) {
        if (!document.getElementById('datatable_injected_css')) {
            let style = document.createElement('style');
            style.id = 'datatable_injected_css';
            style.textContent = `
                .data_table_wrapper { display: flex; flex-direction: column; width: 100%; height: 100%; overflow: hidden; }
                .data_table_container { flex: 1; overflow: auto; position: relative; border: 1px solid #ddd; border-radius: 4px; background: white; }
                .data_table_header { display: flex; position: sticky; top: 0; background-color: #f5f5f5; border-bottom: 2px solid #ddd; z-index: 1; }
                .data_table_header_cell { flex: 1 1 auto; padding: 8px; font-weight: bold; cursor: default; display: flex; align-items: center; }
                .data_table_virtual_viewport { position: relative; overflow-y: auto; height: 100%; }
                .data_table_spacer { width: 100%; position: relative; }
                .data_table_rows_container { position: absolute; top: 0; left: 0; right: 0; width: 100%; }
                .data_table_row { display: flex; align-items: center; width: 100%; border-bottom: 1px solid #eee; cursor: pointer; transition: background-color 0.2s; background-color: white; }
                .data_table_row:hover { background-color: #f9f9f9; }
                .data_table_cell { flex: 1 1 auto; padding: 4px 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-right: 1px solid #f0f0f0; }
                .sort_indicator { margin-left: 5px; font-size: 10px; }
                .column_filter_btn { background: transparent; border: none; font-size: 10px; cursor: pointer; margin-left: 4px; }
                .filter_indicator { margin-left: 4px; font-size: 10px; }
                .data_table_filter_popup, .data_table_context_menu { background: white; border: 1px solid #ccc; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 1000; }
            `;
            document.head.appendChild(style);
        }

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
            inline_edit: options.inline_edit !== false,
            live_filter: options.live_filter !== false,
            fit_columns: options.fit_columns || 'content',
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
        this.sort_state = { column: null, direction: 'asc' };
        this.global_search_text = '';
        this.selected = new Set();
        this.scroll_top = 0;
        this._render_frame = null;
        this._focused_cell = null;
        this.undo_manager = new UndoManager(this, 10);
        this.selection_manager = new SelectionManager(this);
        this.filter_manager = new FilterManager(this, {
            live_filter: this.options.live_filter,
            on_filter_change: () => this.apply_filters_and_sort()
        });
        this.context_menu_manager = new ContextMenuManager(this);
        this.table_container = null;
        this.table_header = null;
        this.virtual_viewport = null;
        this.rows_container = null;
        this.spacer = null;
        this._resize_observer = null;
        this._editing_cell = null;
        this.filter_input = null;

        this.init_ui();
        this.apply_filters_and_sort();
        this.bind_global_events();
    }

    init_ui() {
        this.container.innerHTML = '';
        let wrapper = document.createElement('div');
        wrapper.className = 'data_table_wrapper';
        wrapper.style.cssText = 'display:flex; flex-direction:column; height:100%; width:100%; overflow:hidden; position:relative;';

        this.table_container = document.createElement('div');
        this.table_container.className = 'data_table_container';
        this.table_container.style.cssText = 'flex:1; overflow:auto; position:relative; border:1px solid #ddd; border-radius:4px; background:white;';

        this.table_header = document.createElement('div');
        this.table_header.className = 'data_table_header';
        this.table_header.style.cssText = 'display:flex; position:sticky; top:0; background-color:#f5f5f5; border-bottom:2px solid #ddd; z-index:1;';
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
        this.rows_container.style.position = 'absolute';
        this.rows_container.style.top = '0';
        this.rows_container.style.left = '0';
        this.rows_container.style.right = '0';
        this.rows_container.style.width = '100%';

        this.virtual_viewport.appendChild(this.spacer);
        this.virtual_viewport.appendChild(this.rows_container);
        this.table_container.appendChild(this.table_header);
        this.table_container.appendChild(this.virtual_viewport);
        wrapper.appendChild(this.table_container);
        this.container.appendChild(wrapper);

        this._force_initial_render();
        this._resize_observer = new ResizeObserver(() => this._schedule_render());
        this._resize_observer.observe(this.virtual_viewport);
        this._resize_observer.observe(this.table_container);
    }

    _force_initial_render() {
        let attempts = 0;
        let try_render = () => {
            let height = this.virtual_viewport.clientHeight;
            if (height > 0 || attempts > 20) {
                this.render_visible_rows();
                this.align_columns();
                setTimeout(() => {
                    if (this.rows_container.children.length === 0) {
                        this._fallback_render_all_rows();
                    }
                }, 100);
            } else {
                attempts++;
                setTimeout(try_render, 50);
            }
        };
        setTimeout(try_render, 50);
    }

    _fallback_render_all_rows() {
        this.spacer.style.height = '0px';
        this.rows_container.innerHTML = '';
        let fragment = document.createDocumentFragment();
        for (let i = 0; i < this.filtered_data.length; i++) {
            let row = this.build_row_element(i);
            row.style.position = 'relative';
            row.style.top = '0';
            row.style.marginBottom = `${this.options.row_height}px`;
            fragment.appendChild(row);
        }
        this.rows_container.appendChild(fragment);
        this.virtual_viewport.style.overflowY = 'scroll';
    }

    _schedule_render() {
        if (this._render_frame) cancelAnimationFrame(this._render_frame);
        this._render_frame = requestAnimationFrame(() => {
            let height = this.virtual_viewport.clientHeight;
            if (height > 0) {
                this.render_visible_rows();
            } else {
                setTimeout(() => this._schedule_render(), 50);
            }
        });
    }

    build_header() {
        this.table_header.innerHTML = '';
        for (let i = 0; i < this.columns.length; i++) {
            let col = this.columns[i];
            let cell = document.createElement('div');
            cell.className = 'data_table_header_cell';
            let flex_val = '1 1 auto';
            if (col.width) {
                flex_val = `0 0 ${col.width}`;
            } else if (this.options.fit_columns === 'stretch') {
                flex_val = '1 1 0';
            }
            cell.style.cssText = `flex:${flex_val}; padding:8px; cursor:${this.options.sortable && col.sortable !== false ? 'pointer' : 'default'}; display:flex; align-items:center;`;
            cell.textContent = col.header || col.field;
            cell.setAttribute('data-col-index', i);
            cell.setAttribute('data-col-field', col.field);
            if (this.options.sortable && col.sortable !== false) {
                let indicator = document.createElement('span');
                indicator.className = 'sort_indicator';
                indicator.style.marginLeft = '5px';
                indicator.style.fontSize = '10px';
                indicator.textContent = '\u2195';
                cell.appendChild(indicator);
                cell.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.sort_by_column(col.field);
                });
            }
            if (this.options.filterable && col.filterable !== false) {
                let filter_btn = document.createElement('button');
                filter_btn.textContent = '\u25BC';
                filter_btn.className = 'column_filter_btn';
                filter_btn.style.cssText = 'margin-left:5px; padding:2px; font-size:10px; cursor:pointer; background:transparent; border:none;';
                filter_btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.filter_manager.show_filter_popup(col.field, cell);
                });
                cell.appendChild(filter_btn);
            }
            cell.addEventListener('click', (e) => {
                if (this.options.on_column_click) this.options.on_column_click(col, i, e);
            });
            this.table_header.appendChild(cell);
        }
    }

    on_scroll() {
        if (this._render_frame) cancelAnimationFrame(this._render_frame);
        this._render_frame = requestAnimationFrame(() => {
            this.scroll_top = this.virtual_viewport.scrollTop;
            this.render_visible_rows();
        });
    }

    render_visible_rows() {
        let total = this.filtered_data.length;
        if (total === 0) {
            this.spacer.style.height = '0px';
            this.rows_container.innerHTML = '';
            return;
        }
        let row_h = this.options.row_height;
        let view_h = this.virtual_viewport.clientHeight;
        let start = Math.floor(this.scroll_top / row_h);
        let end = Math.min(total, start + Math.ceil(view_h / row_h) + 2);
        this.spacer.style.height = `${total * row_h}px`;
        let fragment = document.createDocumentFragment();
        for (let i = start; i < end; i++) {
            let row = this.build_row_element(i);
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
        if (this._focused_cell) {
            let cell = this.get_cell_element(this._focused_cell.row, this._focused_cell.col);
            if (cell && document.activeElement !== cell) {
                cell.setAttribute('tabindex', '0');
                cell.focus();
            }
        }
    }

    build_row_element(row_index) {
        let row_data = this.filtered_data[row_index];
        let row = document.createElement('div');
        row.className = 'data_table_row';
        row.setAttribute('data-row-index', row_index);
        this.apply_row_style(row, row_index, row_data);
        for (let col_index = 0; col_index < this.columns.length; col_index++) {
            let col = this.columns[col_index];
            let value = row_data[col.field];
            let display = value;
            if (col.renderer) display = col.renderer(value, row_data);
            else if (value === undefined || value === null) display = '';
            let cell = document.createElement('div');
            cell.className = 'data_table_cell';
            let flex_val = '1 1 auto';
            if (col.width) {
                flex_val = `0 0 ${col.width}`;
            } else if (this.options.fit_columns === 'stretch') {
                flex_val = '1 1 0';
            }
            cell.style.cssText = `flex:${flex_val}; padding:4px 8px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; background:white;`;
            if (col._computed_width) {
                cell.style.width = col._computed_width + 'px';
                cell.style.minWidth = col._computed_width + 'px';
                cell.style.maxWidth = col._computed_width + 'px';
            }
            cell.textContent = display;
            cell.setAttribute('data-col-index', col_index);
            cell.setAttribute('data-col-field', col.field);
            cell.setAttribute('data-value', value);
            cell.setAttribute('data-row-index', row_index);
            cell.setAttribute('tabindex', '-1');
            this.apply_cell_style(cell, row_index, col_index, value, row_data);
            cell.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handle_cell_click(row_index, col_index, value, row_data, e);
            });
            if (this.options.inline_edit) {
                cell.addEventListener('dblclick', (e) => {
                    e.stopPropagation();
                    this.start_inline_edit(row_index, col_index, cell);
                });
            }
            row.appendChild(cell);
        }
        row.addEventListener('click', (e) => this.handle_row_click(row_index, row_data, e));
        return row;
    }

    apply_row_style(row, row_index, row_data) {
        let hl = this.options.highlight;
        if ((hl === 'row' || hl === 'all') && this.selection_manager.is_row_selected(row_index)) {
            row.style.backgroundColor = '#e0f0ff';
        } else {
            row.style.backgroundColor = 'white';
        }
        if (this.options.row_style) {
            let custom = this.options.row_style(row_data, row_index);
            if (custom) Object.assign(row.style, custom);
        }
    }

    apply_cell_style(cell, row_index, col_index, value, row_data) {
        let col = this.columns[col_index];
        if (col.conditional_style) {
            let custom = col.conditional_style(value, row_data);
            if (custom) Object.assign(cell.style, custom);
        }
        let hl = this.options.highlight;
        if ((hl === 'cell' || hl === 'all') && this.selection_manager.is_cell_selected(row_index, col_index)) {
            cell.style.backgroundColor = '#e0f0ff';
        }
    }

    start_inline_edit(row_index, col_index, cell_element) {
        if (this._editing_cell) this.cancel_inline_edit();
        let col = this.columns[col_index];
        let old_value = this.filtered_data[row_index][col.field];
        let input = document.createElement('input');
        input.type = 'text';
        input.value = old_value;
        input.style.cssText = 'width:100%; height:100%; border:none; padding:2px; margin:-2px; background:white;';
        cell_element.innerHTML = '';
        cell_element.appendChild(input);
        input.focus();
        input.select();

        let save = () => {
            let new_value = input.value;
            if (new_value !== old_value) {
                this.undo_manager.save_state();
                this.filtered_data[row_index][col.field] = new_value;
                this.raw_data[row_index][col.field] = new_value;
                this.render_visible_rows();
                if (this.options.on_cell_edit) this.options.on_cell_edit(row_index, col_index, new_value, old_value);
                if (this.options.on_data_change) this.options.on_data_change();
            } else {
                cell_element.innerHTML = old_value;
            }
            this._editing_cell = null;
            cell_element.setAttribute('tabindex', '-1');
        };

        let cancel = () => {
            cell_element.innerHTML = old_value;
            this._editing_cell = null;
            cell_element.setAttribute('tabindex', '-1');
        };

        input.addEventListener('blur', save);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); save(); }
            else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
        });
        this._editing_cell = { row_index, col_index, element: cell_element, input };
        cell_element.setAttribute('tabindex', '0');
    }

    cancel_inline_edit() {
        if (this._editing_cell) {
            let { element, row_index, col_index } = this._editing_cell;
            let old_value = this.filtered_data[row_index][this.columns[col_index].field];
            element.innerHTML = old_value;
            this._editing_cell = null;
            element.setAttribute('tabindex', '-1');
        }
    }

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
        if (this.global_search_text) {
            filtered = filtered.filter(row => {
                for (let key in row) {
                    if (String(row[key]).toLowerCase().includes(this.global_search_text)) return true;
                }
                return false;
            });
        }
        let active_filters = this.filter_manager.active_filters;
        for (let [field, filters] of Object.entries(active_filters)) {
            if (filters.include && filters.include.size) {
                filtered = filtered.filter(row => filters.include.has(String(row[field])));
            } else if (filters.exclude && filters.exclude.size) {
                filtered = filtered.filter(row => !filters.exclude.has(String(row[field])));
            }
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
        this.selection_manager.clear();
        this._focused_cell = null;
        this.virtual_viewport.scrollTop = 0;
        this.render_visible_rows();
        this.filter_manager.update_indicators();
        this.align_columns();
        if (this.options.on_data_change) this.options.on_data_change();
    }

    update_sort_indicators() {
        let headers = this.table_header.children;
        for (let i = 0; i < headers.length; i++) {
            let col = this.columns[i];
            let indicator = headers[i].querySelector('.sort_indicator');
            if (indicator) {
                if (this.sort_state.column === col.field) {
                    indicator.textContent = this.sort_state.direction === 'asc' ? '\u25B2' : '\u25BC';
                } else {
                    indicator.textContent = '\u2195';
                }
            }
        }
    }

    set_global_search(text) {
        this.global_search_text = text.toLowerCase();
        this.apply_filters_and_sort();
    }

    clear_all_filters() {
        this.filter_manager.clear_all_filters();
        this.global_search_text = '';
        this.apply_filters_and_sort();
    }

    handle_row_click(row_index, row_data, event) {
        if (this.options.on_row_click) this.options.on_row_click(row_data, row_index, event);
        this.selection_manager.handle_row_click(row_index, event);
        if (this.options.on_selection_change) this.options.on_selection_change(this.selection_manager.get_selected());
        this.focus_cell(row_index, 0);
    }

    handle_cell_click(row_index, col_index, value, row_data, event) {
        if (this.options.on_cell_click) this.options.on_cell_click(row_index, col_index, value, row_data, event);
        this.selection_manager.handle_cell_click(row_index, col_index, event);
        if (this.options.on_selection_change) this.options.on_selection_change(this.selection_manager.get_selected());
        this.focus_cell(row_index, col_index);
    }

    bind_global_events() {
        document.addEventListener('keydown', this.handle_keydown.bind(this));
        this.container.addEventListener('contextmenu', (e) => this.context_menu_manager.show(e));
        this.container.addEventListener('click', (e) => { if (this.options.on_table_click) this.options.on_table_click(e); });
    }

    focus_cell(row, col) {
        if (this._focused_cell) {
            let prev = this.get_cell_element(this._focused_cell.row, this._focused_cell.col);
            if (prev) prev.setAttribute('tabindex', '-1');
        }
        this._focused_cell = { row, col };
        let row_top = row * this.options.row_height;
        let viewport = this.virtual_viewport;
        if (row_top < viewport.scrollTop) {
            viewport.scrollTop = row_top;
        } else if (row_top + this.options.row_height > viewport.scrollTop + viewport.clientHeight) {
            viewport.scrollTop = row_top + this.options.row_height - viewport.clientHeight;
        }
        let try_focus = () => {
            let cell = this.get_cell_element(row, col);
            if (cell) {
                cell.setAttribute('tabindex', '0');
                cell.focus();
            } else {
                setTimeout(try_focus, 20);
            }
        };
        try_focus();
    }

    move_cursor(delta_row, delta_col, extend = false) {
        if (!this._focused_cell) {
            if (this.filtered_data.length) this.focus_cell(0, 0);
            return;
        }
        let new_row = this._focused_cell.row + delta_row;
        let new_col = this._focused_cell.col + delta_col;
        new_row = Math.min(Math.max(0, new_row), this.filtered_data.length - 1);
        new_col = Math.min(Math.max(0, new_col), this.columns.length - 1);
        if (extend) {
            let start_row = this._focused_cell.row;
            let start_col = this._focused_cell.col;
            this.selection_manager.clear();
            for (let r = Math.min(start_row, new_row); r <= Math.max(start_row, new_row); r++) {
                for (let c = Math.min(start_col, new_col); c <= Math.max(start_col, new_col); c++) {
                    this.selection_manager.handle_cell_click(r, c, { ctrlKey: false });
                }
            }
            this.render_visible_rows();
            if (this.options.on_selection_change) this.options.on_selection_change(this.selection_manager.get_selected());
        }
        this.focus_cell(new_row, new_col);
    }

    get_cell_element(row, col) {
        let rows = this.rows_container.children;
        for (let i = 0; i < rows.length; i++) {
            let row_el = rows[i];
            if (parseInt(row_el.getAttribute('data-row-index')) === row) {
                return row_el.children[col];
            }
        }
        return null;
    }

    handle_keydown(e) {
        let ctrl = e.ctrlKey || e.metaKey;
        let shift = e.shiftKey;
        if (ctrl && e.key === 'c') { this.copy_selection(); e.preventDefault(); }
        else if (ctrl && e.key === 'v') { this.paste_to_selection(); e.preventDefault(); }
        else if (ctrl && !shift && e.key === 'z') { this.undo_manager.undo(); e.preventDefault(); }
        else if (ctrl && shift && e.key === 'Z') { this.undo_manager.redo(); e.preventDefault(); }
        else if (e.key === 'ArrowUp') { this.move_cursor(-1, 0, shift); e.preventDefault(); }
        else if (e.key === 'ArrowDown') { this.move_cursor(1, 0, shift); e.preventDefault(); }
        else if (e.key === 'ArrowLeft') { this.move_cursor(0, -1, shift); e.preventDefault(); }
        else if (e.key === 'ArrowRight') { this.move_cursor(0, 1, shift); e.preventDefault(); }
        else if (e.key === 'Escape' && this._editing_cell) { this.cancel_inline_edit(); e.preventDefault(); }
    }

    copy_selection() {
        let selected = this.selection_manager.get_selected_cells();
        if (!selected.length) return;
        let rows = [...new Set(selected.map(s => s.row))].sort((a,b)=>a-b);
        let data = rows.map(r => {
            let cells = selected.filter(s => s.row === r).sort((a,b)=>a.col-b.col);
            return cells.map(c => c.value).join('\t');
        }).join('\n');
        navigator.clipboard.writeText(data);
    }

    paste_to_selection() {
        alert('Paste not fully implemented yet');
    }

    align_columns() {
        let headers = this.table_header.children;
        for (let i = 0; i < headers.length; i++) {
            let header = headers[i];
            let col = this.columns[i];
            if (col.width) continue;
            let width = header.offsetWidth;
            if (width < 10) {
                setTimeout(() => this.align_columns(), 50);
                return;
            }
            header.style.width = width + 'px';
            header.style.minWidth = width + 'px';
            header.style.maxWidth = width + 'px';
            let rows = this.rows_container.children;
            for (let r = 0; r < rows.length; r++) {
                let cell = rows[r].children[i];
                if (cell) {
                    cell.style.width = width + 'px';
                    cell.style.minWidth = width + 'px';
                    cell.style.maxWidth = width + 'px';
                }
            }
            col._computed_width = width;
        }
    }

    export_csv() {
        let rows = this.filtered_data;
        if (!rows.length) return '';
        let headers = this.columns.map(c => c.header || c.field);
        let lines = [headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',')];
        for (let row of rows) {
            let values = this.columns.map(c => {
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
        let lines = csv_text.trim().split(/\r?\n/);
        if (!lines.length) return;
        let headers, data_lines = lines;
        if (has_header) {
            headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
            data_lines = lines.slice(1);
        } else {
            headers = this.columns.map(c => c.field);
        }
        let new_data = [];
        for (let line of data_lines) {
            let values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            let row = {};
            for (let i = 0; i < headers.length; i++) row[headers[i]] = values[i] || '';
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
        let cols = headers || this.columns.map(c => c.field);
        let new_data = [];
        for (let row_list of data_array) {
            let row = {};
            for (let i = 0; i < cols.length; i++) row[cols[i]] = row_list[i] !== undefined ? row_list[i] : '';
            new_data.push(row);
        }
        this.set_data(new_data);
    }

    set_data(new_data) {
        this.undo_manager.save_state();
        this.raw_data = new_data.slice();
        this.global_search_text = '';
        this.sort_state = { column: null, direction: 'asc' };
        this.filter_manager.clear_all_filters();
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
        this.align_columns();
    }

    undo() { this.undo_manager.undo(); }
    redo() { this.undo_manager.redo(); }
}
// #endregion