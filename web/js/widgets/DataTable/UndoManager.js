// #region undo_manager
class UndoManager {
    constructor(table, max_stack = 10) {
        this.table = table;
        this.max_stack = max_stack;
        this.undo_stack = [];
        this.redo_stack = [];
    }

    save_state() {
        let state = {
            raw_data: this.table.raw_data.slice(),
            filtered_data: this.table.filtered_data.slice(),
            sort_state: { ...this.table.sort_state },
            global_filter: this.table.global_search_text,
            column_filters: JSON.parse(JSON.stringify(this.table.filter_manager.active_filters)),
            selected: new Set(this.table.selected)
        };
        this.undo_stack.push(state);
        if (this.undo_stack.length > this.max_stack) this.undo_stack.shift();
        this.redo_stack = [];
    }

    restore_state(state) {
        this.table.raw_data = state.raw_data;
        this.table.filtered_data = state.filtered_data;
        this.table.sort_state = state.sort_state;
        this.table.global_search_text = state.global_filter;
        this.table.filter_manager.active_filters = state.column_filters;
        this.table.selected = state.selected;
        if (this.table.filter_input) this.table.filter_input.value = this.table.global_search_text;
        this.table.apply_filters_and_sort();
        if (this.table.options.on_data_change) this.table.options.on_data_change();
    }

    undo() {
        if (this.undo_stack.length === 0) return;
        let current = {
            raw_data: this.table.raw_data.slice(),
            filtered_data: this.table.filtered_data.slice(),
            sort_state: { ...this.table.sort_state },
            global_filter: this.table.global_search_text,
            column_filters: JSON.parse(JSON.stringify(this.table.filter_manager.active_filters)),
            selected: new Set(this.table.selected)
        };
        let prev = this.undo_stack.pop();
        this.redo_stack.push(current);
        this.restore_state(prev);
    }

    redo() {
        if (this.redo_stack.length === 0) return;
        let next = this.redo_stack.pop();
        let current = {
            raw_data: this.table.raw_data.slice(),
            filtered_data: this.table.filtered_data.slice(),
            sort_state: { ...this.table.sort_state },
            global_filter: this.table.global_search_text,
            column_filters: JSON.parse(JSON.stringify(this.table.filter_manager.active_filters)),
            selected: new Set(this.table.selected)
        };
        this.undo_stack.push(current);
        this.restore_state(next);
    }
}
// #endregion