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