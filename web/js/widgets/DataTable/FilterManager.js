// #region filter_manager
class FilterManager {
    constructor(table, options = {}) {
        this.table = table;
        this.live_filter = options.live_filter !== false;
        this.on_filter_change = options.on_filter_change || null;
        this.active_filters = {};
        this.active_popup = null;
        this.filter_indicators = new Map();
    }

    show_filter_popup(field, anchor) {
        if (this.active_popup) this.close_popup();
        let values = this._get_unique_values(field);
        values.sort();
        let popup = document.createElement('div');
        popup.className = 'data_table_filter_popup';
        popup.style.cssText = `position:absolute; background:white; border:1px solid #ccc; border-radius:4px; padding:8px; box-shadow:0 2px 8px rgba(0,0,0,0.15); z-index:1000; max-height:300px; display:flex; flex-direction:column; min-width:200px;`;
        let rect = anchor.getBoundingClientRect();
        popup.style.top = `${rect.bottom + window.scrollY}px`;
        popup.style.left = `${rect.left + window.scrollX}px`;

        let search = document.createElement('input');
        search.type = 'text';
        search.placeholder = 'Search...';
        search.style.cssText = 'width:100%; padding:4px; margin-bottom:8px; box-sizing:border-box;';
        popup.appendChild(search);

        let list_container = document.createElement('div');
        list_container.style.overflowY = 'auto';
        list_container.style.flex = '1';
        popup.appendChild(list_container);

        let btn_row = document.createElement('div');
        btn_row.style.display = 'flex';
        btn_row.style.gap = '5px';
        btn_row.style.marginTop = '8px';
        btn_row.style.justifyContent = 'space-between';
        let select_all_btn = document.createElement('button');
        select_all_btn.textContent = 'Select All';
        select_all_btn.style.fontSize = '10px';
        let include_all_btn = document.createElement('button');
        include_all_btn.textContent = 'Include All';
        include_all_btn.style.fontSize = '10px';
        let exclude_all_btn = document.createElement('button');
        exclude_all_btn.textContent = 'Exclude All';
        exclude_all_btn.style.fontSize = '10px';
        let clear_all_btn = document.createElement('button');
        clear_all_btn.textContent = 'Clear All';
        clear_all_btn.style.fontSize = '10px';
        btn_row.appendChild(select_all_btn);
        btn_row.appendChild(include_all_btn);
        btn_row.appendChild(exclude_all_btn);
        btn_row.appendChild(clear_all_btn);
        popup.appendChild(btn_row);

        if (!this.live_filter) {
            let apply_row = document.createElement('div');
            apply_row.style.display = 'flex';
            apply_row.style.justifyContent = 'flex-end';
            apply_row.style.marginTop = '8px';
            let apply_btn = document.createElement('button');
            apply_btn.textContent = 'Apply';
            apply_btn.style.padding = '4px 12px';
            apply_btn.onclick = () => {
                this.apply_filters();
                this.close_popup();
            };
            apply_row.appendChild(apply_btn);
            popup.appendChild(apply_row);
        }

        let render = (filter_text) => {
            list_container.innerHTML = '';
            let filtered_vals = values.filter(v => v.toLowerCase().includes(filter_text.toLowerCase()));
            let current = this.active_filters[field] || {};
            for (let val of filtered_vals) {
                let item = document.createElement('div');
                item.style.cssText = 'display:flex; align-items:center; gap:8px; padding:4px; cursor:pointer; border-bottom:1px solid #eee;';
                let include = current.include?.has(val);
                let exclude = current.exclude?.has(val);
                let icon = '\u26AA';
                if (include) icon = '\u2705';
                else if (exclude) icon = '\u274C';
                let icon_span = document.createElement('span');
                icon_span.textContent = icon;
                icon_span.style.width = '20px';
                let label = document.createElement('span');
                label.textContent = val;
                item.appendChild(icon_span);
                item.appendChild(label);
                item.onclick = (e) => {
                    e.stopPropagation();
                    this.toggle_filter(field, val);
                    if (this.live_filter) this.apply_filters();
                    render(search.value);
                };
                list_container.appendChild(item);
            }
        };
        search.addEventListener('input', (e) => render(e.target.value));
        render('');

        select_all_btn.onclick = () => {
            let current = this.active_filters[field] || {};
            for (let val of values) {
                if (!current.exclude?.has(val)) {
                    if (!current.include) current.include = new Set();
                    current.include.add(val);
                    if (current.exclude) current.exclude.delete(val);
                }
            }
            this.active_filters[field] = current;
            if (this.live_filter) this.apply_filters();
            render(search.value);
        };
        include_all_btn.onclick = () => {
            this.active_filters[field] = { include: new Set(values) };
            if (this.live_filter) this.apply_filters();
            render(search.value);
        };
        exclude_all_btn.onclick = () => {
            this.active_filters[field] = { exclude: new Set(values) };
            if (this.live_filter) this.apply_filters();
            render(search.value);
        };
        clear_all_btn.onclick = () => {
            delete this.active_filters[field];
            if (this.live_filter) this.apply_filters();
            render(search.value);
        };

        document.body.appendChild(popup);
        this.active_popup = popup;
        let close_handler = (e) => {
            if (!popup.contains(e.target)) {
                this.close_popup();
                document.removeEventListener('click', close_handler);
            }
        };
        setTimeout(() => document.addEventListener('click', close_handler), 0);
    }

    toggle_filter(field, value) {
        if (!this.active_filters[field]) this.active_filters[field] = {};
        let f = this.active_filters[field];
        if (f.include?.has(value)) {
            f.include.delete(value);
            if (!f.exclude) f.exclude = new Set();
            f.exclude.add(value);
        } else if (f.exclude?.has(value)) {
            f.exclude.delete(value);
        } else {
            if (!f.include) f.include = new Set();
            f.include.add(value);
        }
        if (f.include?.size === 0) delete f.include;
        if (f.exclude?.size === 0) delete f.exclude;
        if (Object.keys(f).length === 0) delete this.active_filters[field];
    }

    apply_filters() {
        if (this.on_filter_change) this.on_filter_change();
        this.update_indicators();
    }

    update_indicators() {
        for (let [field, filter] of Object.entries(this.active_filters)) {
            let indicator = this.filter_indicators.get(field);
            if (!indicator) {
                let headers = this.table.table_header.children;
                for (let i = 0; i < headers.length; i++) {
                    let col = this.table.columns[i];
                    if (col.field === field) {
                        indicator = document.createElement('span');
                        indicator.className = 'filter_indicator';
                        indicator.textContent = '\uD83D\uDD0D';
                        indicator.style.marginLeft = '5px';
                        indicator.style.fontSize = '10px';
                        indicator.title = 'Filter active';
                        headers[i].appendChild(indicator);
                        this.filter_indicators.set(field, indicator);
                        break;
                    }
                }
            }
            if (indicator) indicator.style.display = 'inline';
        }
        for (let [field, indicator] of this.filter_indicators.entries()) {
            if (!this.active_filters[field]) indicator.style.display = 'none';
        }
    }

    clear_all_filters() {
        this.active_filters = {};
        this.update_indicators();
        if (this.on_filter_change) this.on_filter_change();
    }

    close_popup() {
        if (this.active_popup) {
            this.active_popup.remove();
            this.active_popup = null;
        }
    }

    _get_unique_values(field) {
        let data = this.table.raw_data;
        let active = this.active_filters;
        for (let [f, filter] of Object.entries(active)) {
            if (f === field) continue;
            if (filter.include && filter.include.size) {
                data = data.filter(row => filter.include.has(String(row[f])));
            } else if (filter.exclude && filter.exclude.size) {
                data = data.filter(row => !filter.exclude.has(String(row[f])));
            }
        }
        let values = new Set();
        for (let row of data) {
            let val = row[field];
            if (val !== undefined && val !== null) values.add(String(val));
        }
        return Array.from(values);
    }
}
// #endregion