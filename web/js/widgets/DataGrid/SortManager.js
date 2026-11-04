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