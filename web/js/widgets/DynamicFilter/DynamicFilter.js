/**
 * DynamicFilter: ordered list of column filters, each with an enabled checkbox,
 * a type dropdown and drag-and-drop reordering. Exposed as window.DynamicFilter.
 */
class DynamicFilter {
    static DEFAULT_TYPES = ['include', 'exclude', 'range'];
    static CSS_URL = (document.currentScript && document.currentScript.src)
        ? document.currentScript.src.replace(/\.js(\?.*)?$/, '.css')
        : 'web/js/widgets/DynamicFilter/DynamicFilter.css';
    static HANDLE_SVG = '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">'
        + '<rect x="1" y="2" width="10" height="1.5" fill="currentColor"/>'
        + '<rect x="1" y="5.25" width="10" height="1.5" fill="currentColor"/>'
        + '<rect x="1" y="8.5" width="10" height="1.5" fill="currentColor"/></svg>';

    /**
     * Builds the widget inside container at once.
     * @param {Object} opts - items, on_change(items), types.
     */
    constructor(container, opts) {
        let options = opts || {};
        this.container = container;
        this.types = Array.isArray(options.types) && options.types.length ? options.types.slice() : DynamicFilter.DEFAULT_TYPES.slice();
        this.on_change = typeof options.on_change === 'function' ? options.on_change : null;
        this.items = this._normalize(options.items);
        this.drag_from = null;
        DynamicFilter.ensure_styles();
        this.root = document.createElement('div');
        this.root.className = 'df_root';
        this.list_el = document.createElement('div');
        this.list_el.className = 'df_list';
        this.root.appendChild(this.list_el);
        this.container.appendChild(this.root);
        this._render();
    }

    // #region public_api
    /**
     * Returns fresh { name, type, enabled } copies in display order.
     */
    get_value() {
        return this._normalize(this.items);
    }

    /**
     * Replaces all rows with normalized copies; does not call on_change.
     */
    set_items(items) {
        this.items = this._normalize(items);
        this._render();
    }

    /**
     * Applies a preset name or a CSS variable object to the widget root.
     */
    set_theme(theme) {
        if (window.ThemeManager) {
            ThemeManager.apply(this.root, theme);
        }
    }

    /**
     * Adds the stylesheet link to the document head once per page.
     */
    static ensure_styles() {
        if (document.getElementById('df_styles')) {
            return;
        }
        let link = document.createElement('link');
        link.id = 'df_styles';
        link.rel = 'stylesheet';
        link.href = DynamicFilter.CSS_URL;
        document.head.appendChild(link);
    }
    // #endregion public_api

    // #region rendering
    /**
     * Rebuilds every row, or the empty message.
     */
    _render() {
        this.list_el.textContent = '';
        if (!this.items.length) {
            let empty = document.createElement('div');
            empty.className = 'df_empty';
            empty.textContent = 'No items configured.';
            this.list_el.appendChild(empty);
            return;
        }
        this.items.forEach((item, index) => this.list_el.appendChild(this._build_row(item, index)));
    }

    /**
     * Builds one draggable row bound to its item.
     */
    _build_row(item, index) {
        let row = document.createElement('div');
        row.className = 'df_row' + (item.enabled ? '' : ' df_row_disabled');
        row.draggable = true;
        let handle = document.createElement('span');
        handle.className = 'df_handle';
        handle.title = 'Drag to reorder';
        handle.innerHTML = DynamicFilter.HANDLE_SVG;
        let label = document.createElement('label');
        label.className = 'df_check_label';
        let check = document.createElement('input');
        check.type = 'checkbox';
        check.className = 'df_check';
        check.checked = item.enabled;
        label.appendChild(check);
        let name = document.createElement('span');
        name.className = 'df_name';
        name.textContent = item.name;
        name.title = item.name;
        let select = document.createElement('select');
        select.className = 'df_type';
        for (let type of this.types) {
            let option = document.createElement('option');
            option.value = type;
            option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
            option.selected = type === item.type;
            select.appendChild(option);
        }
        check.addEventListener('change', () => {
            item.enabled = check.checked;
            row.classList.toggle('df_row_disabled', !item.enabled);
            this._notify();
        });
        select.addEventListener('change', () => {
            item.type = select.value;
            this._notify();
        });
        row.append(handle, label, name, select);
        this._bind_drag(row, index);
        return row;
    }
    // #endregion rendering

    // #region drag_and_drop
    /**
     * Wires HTML5 drag events of one row for reordering within this widget.
     */
    _bind_drag(row, index) {
        row.addEventListener('dragstart', event => {
            this.drag_from = index;
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', String(index));
            row.classList.add('df_dragging');
        });
        row.addEventListener('dragover', event => {
            if (this.drag_from === null || this.drag_from === index) {
                return;
            }
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            this._clear_marks('df_drag_target');
            row.classList.add('df_drag_target');
        });
        row.addEventListener('dragleave', event => {
            if (!row.contains(event.relatedTarget)) {
                row.classList.remove('df_drag_target');
            }
        });
        row.addEventListener('drop', event => {
            event.preventDefault();
            let from = this.drag_from;
            this.drag_from = null;
            if (from === null || from === index) {
                return;
            }
            let moved = this.items.splice(from, 1)[0];
            this.items.splice(index, 0, moved);
            this._render();
            this._notify();
        });
        row.addEventListener('dragend', () => {
            this.drag_from = null;
            this._clear_marks('df_dragging');
            this._clear_marks('df_drag_target');
        });
    }

    /**
     * Removes a marker class from all rows.
     */
    _clear_marks(class_name) {
        for (let el of this.list_el.querySelectorAll('.' + class_name)) {
            el.classList.remove(class_name);
        }
    }
    // #endregion drag_and_drop

    // #region helpers
    /**
     * Returns normalized copies of raw items.
     */
    _normalize(items) {
        return (Array.isArray(items) ? items : []).map(item => {
            let source = item || {};
            return {
                name: source.name ? String(source.name) : '',
                type: source.type ? source.type : this.types[0],
                enabled: source.enabled !== false
            };
        });
    }

    /**
     * Calls on_change with a fresh copy of the list.
     */
    _notify() {
        if (this.on_change) {
            this.on_change(this.get_value());
        }
    }
    // #endregion helpers
}

window.DynamicFilter = DynamicFilter;
if (window.WidgetRegistry) {
    WidgetRegistry.register('dynamic_filter', {
        label: 'Dynamic Filter',
        category: 'inputs',
        container: false,
        options: [
            {
                name: 'items',
                type: 'json',
                default: [
                    { name: 'status', type: 'include', enabled: true },
                    { name: 'owner', type: 'exclude', enabled: true },
                    { name: 'created_at', type: 'range', enabled: false }
                ]
            },
            { name: 'types', type: 'json', default: ['include', 'exclude', 'range'] }
        ],
        build: (host, options) => new DynamicFilter(host, options)
    });
}
