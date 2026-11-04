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