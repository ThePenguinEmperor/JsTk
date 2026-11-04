// #region selection_manager
class SelectionManager {
    constructor(table) {
        this.table = table;
    }

    is_row_selected(row_idx) {
        return this.table.selected.has(`row:${row_idx}`);
    }

    is_cell_selected(row_idx, col_idx) {
        return this.table.selected.has(`cell:${row_idx},${col_idx}`);
    }

    clear() {
        this.table.selected.clear();
    }

    handle_row_click(row_idx, event) {
        let mode = this.table.options.multi_select;
        let ctrl = event.ctrlKey;
        if (mode === 'none') return;
        if (!ctrl) this.clear();
        let key = `row:${row_idx}`;
        if (this.table.selected.has(key)) this.table.selected.delete(key);
        else this.table.selected.add(key);
        this.table.render_visible_rows();
    }

    handle_cell_click(row_idx, col_idx, event) {
        let mode = this.table.options.multi_select;
        let ctrl = event.ctrlKey;
        if (mode === 'none') return;
        if (mode !== 'cell' && mode !== 'all') return;
        if (!ctrl) this.clear();
        let key = `cell:${row_idx},${col_idx}`;
        if (this.table.selected.has(key)) this.table.selected.delete(key);
        else this.table.selected.add(key);
        this.table.render_visible_rows();
    }

    get_selected() {
        let rows = [];
        let cells = [];
        for (let key of this.table.selected) {
            if (key.startsWith('row:')) {
                let row = parseInt(key.split(':')[1]);
                rows.push({ row: row, data: this.table.filtered_data[row] });
            } else if (key.startsWith('cell:')) {
                let parts = key.split(':')[1].split(',').map(Number);
                cells.push({
                    row: parts[0],
                    col: parts[1],
                    value: this.table.filtered_data[parts[0]][this.table.columns[parts[1]].field]
                });
            }
        }
        return { rows, cells };
    }

    get_selected_cells() {
        let cells = [];
        for (let key of this.table.selected) {
            if (key.startsWith('cell:')) {
                let parts = key.split(':')[1].split(',').map(Number);
                cells.push({
                    row: parts[0],
                    col: parts[1],
                    value: this.table.filtered_data[parts[0]][this.table.columns[parts[1]].field]
                });
            }
        }
        return cells;
    }
}
// #endregion