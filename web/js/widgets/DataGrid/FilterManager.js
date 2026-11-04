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