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