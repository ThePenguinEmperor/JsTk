/**
 * ListSelector: searchable list where each item is selected, off or (optionally) excluded.
 * Selected items keep a user order changed by drag and drop. Exposed as window.ListSelector.
 */
class ListSelector {
    static CSS_URL = (document.currentScript && document.currentScript.src)
        ? document.currentScript.src.replace(/\.js(\?.*)?$/, '.css')
        : 'web/js/widgets/ListSelector/ListSelector.css';
    static ICONS = {
        copy: '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" fill="none" stroke="currentColor"/><path d="M1.5 8.5v-7h7" fill="none" stroke="currentColor"/></svg>',
        check: '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M1.5 6.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
        ban: '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M2.8 2.8l6.4 6.4" stroke="currentColor" stroke-width="1.3"/></svg>',
        clear: '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5"/></svg>'
    };

    /**
     * Builds the widget and appends it to container.
     * @param {Object} opts - items, selected, excluded, on_change, allow_exclude, sub_status_map,
     *     status_color_dict (stored only), extra_context_menu_items (array or fn(row_or_null)).
     */
    constructor(container, opts) {
        let options = opts || {};
        this.container = container;
        this.items = (options.items || []).slice();
        this.selected = (options.selected || []).slice();
        this.excluded = (options.excluded || []).slice();
        this.on_change = typeof options.on_change === 'function' ? options.on_change : null;
        this.allow_exclude = options.allow_exclude === true;
        this.sub_status_map = options.sub_status_map || {};
        this.status_color_dict = options.status_color_dict || {};
        this.extra_context_menu_items = options.extra_context_menu_items || null;
        this.search_text = '';
        this.drag_item = null;
        this.menu = null;
        ListSelector.ensure_styles();
        this._build();
        this._render();
    }

    // #region public_api
    /**
     * Returns copies of the selected (ordered) and excluded lists.
     */
    get_value() {
        return { selected: this.selected.slice(), excluded: this.excluded.slice() };
    }

    /**
     * Replaces items and both state lists; keeps the search text; does not call on_change.
     */
    set_items(items, selected, excluded) {
        this.items = (items || []).slice();
        this.selected = (selected || []).slice();
        this.excluded = (excluded || []).slice();
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
        if (document.getElementById('ls_styles')) {
            return;
        }
        let link = document.createElement('link');
        link.id = 'ls_styles';
        link.rel = 'stylesheet';
        link.href = ListSelector.CSS_URL;
        document.head.appendChild(link);
    }
    // #endregion public_api

    // #region building
    /**
     * Creates the root, search input, list and context menu.
     */
    _build() {
        this.root = document.createElement('div');
        this.root.className = 'ls_root';
        let search_row = document.createElement('div');
        search_row.className = 'ls_search_row';
        this.search_input = document.createElement('input');
        this.search_input.type = 'text';
        this.search_input.className = 'ls_search';
        this.search_input.placeholder = 'Search items...';
        this.search_input.autocomplete = 'off';
        this.search_input.addEventListener('input', () => {
            this.search_text = this.search_input.value;
            this._render();
        });
        search_row.appendChild(this.search_input);
        this.list_el = document.createElement('div');
        this.list_el.className = 'ls_list';
        this.root.append(search_row, this.list_el);
        this.container.appendChild(this.root);
        if (typeof window.ContextMenu !== 'function') {
            console.warn('[list_selector] context_menu_missing: right-click menu disabled');
            return;
        }
        this.menu = new ContextMenu(this.list_el, {
            on_before_show: (type, event) => {
                let row = event && event.target && event.target.closest ? event.target.closest('.ls_row') : null;
                this.menu.set_items(this._menu_items(row));
            }
        });
    }
    // #endregion building

    // #region rendering
    /**
     * Rebuilds the grouped list for the current state and search text.
     */
    _render() {
        this.list_el.textContent = '';
        let needle = this.search_text.trim().toLowerCase();
        let matches = item => !needle || String(item).toLowerCase().includes(needle);
        let selected = this.selected.filter(matches);
        let excluded = this.excluded.filter(matches);
        let off = this.items.filter(item => this._state_of(item) === 'off' && matches(item));
        if (!selected.length && !excluded.length && !off.length) {
            let empty = document.createElement('div');
            empty.className = 'ls_empty';
            empty.textContent = needle ? 'No items match.' : 'No items.';
            this.list_el.appendChild(empty);
            return;
        }
        this._render_group('Selected', selected, 'selected');
        this._render_group('Excluded', excluded, 'excluded');
        this._render_group((selected.length || excluded.length) ? 'Off' : null, off, 'off');
    }

    /**
     * Appends an optional group label followed by its rows.
     */
    _render_group(title, items, state) {
        if (!items.length) {
            return;
        }
        if (title) {
            let label = document.createElement('div');
            label.className = 'ls_group_label';
            label.textContent = title;
            this.list_el.appendChild(label);
        }
        for (let item of items) {
            this.list_el.appendChild(this._build_row(item, state));
        }
    }

    /**
     * Builds one row with a status dot, click cycling and drag support for selected rows.
     */
    _build_row(item, state) {
        let row = document.createElement('div');
        row.className = 'ls_row ls_row_' + state;
        row.dataset.item = item;
        row.dataset.state = state;
        let sub_status = this.sub_status_map[item];
        if (sub_status) {
            row.setAttribute('data-sub-status', sub_status);
            row.classList.add('ls_sub_' + sub_status);
        }
        let dot = document.createElement('span');
        dot.className = 'ls_dot';
        let text = document.createElement('span');
        text.className = 'ls_text';
        text.textContent = item;
        row.append(dot, text);
        row.addEventListener('click', () => this._cycle(item));
        if (state === 'selected') {
            this._bind_drag(row, item);
        }
        return row;
    }
    // #endregion rendering

    // #region state
    /**
     * Returns 'selected', 'excluded' or 'off' for an item.
     */
    _state_of(item) {
        if (this.selected.includes(item)) {
            return 'selected';
        }
        return this.excluded.includes(item) ? 'excluded' : 'off';
    }

    /**
     * Moves an item to its next state, re-renders and notifies.
     */
    _cycle(item) {
        let state = this._state_of(item);
        this.selected = this.selected.filter(value => value !== item);
        this.excluded = this.excluded.filter(value => value !== item);
        if (state === 'off') {
            this.selected.push(item);
        } else if (state === 'selected' && this.allow_exclude) {
            this.excluded.push(item);
        }
        this._changed();
    }

    /**
     * Applies a bulk action: 'select_all', 'exclude_all' or 'clear_all'.
     */
    _bulk(action) {
        let all = this._all_items();
        this.selected = action === 'select_all' ? all : [];
        this.excluded = action === 'exclude_all' ? all : [];
        this._changed();
    }

    /**
     * Returns items plus any selected or excluded strings missing from items.
     */
    _all_items() {
        let all = this.items.slice();
        for (let item of this.selected.concat(this.excluded)) {
            if (!all.includes(item)) {
                all.push(item);
            }
        }
        return all;
    }

    /**
     * Re-renders and calls on_change with copies.
     */
    _changed() {
        this._render();
        if (this.on_change) {
            this.on_change(this.get_value());
        }
    }
    // #endregion state

    // #region drag_and_drop
    /**
     * Wires drag events of a selected row to reorder the selected list.
     */
    _bind_drag(row, item) {
        row.draggable = true;
        row.addEventListener('dragstart', event => {
            this.drag_item = item;
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', item);
            row.classList.add('ls_dragging');
        });
        row.addEventListener('dragover', event => {
            if (this.drag_item === null || this.drag_item === item) {
                return;
            }
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            row.classList.add('ls_drag_target');
        });
        row.addEventListener('dragleave', event => {
            if (!row.contains(event.relatedTarget)) {
                row.classList.remove('ls_drag_target');
            }
        });
        row.addEventListener('drop', event => {
            event.preventDefault();
            let moving = this.drag_item;
            this.drag_item = null;
            if (moving === null || moving === item) {
                return;
            }
            let from = this.selected.indexOf(moving);
            let to = this.selected.indexOf(item);
            this.selected.splice(from, 1);
            this.selected.splice(to, 0, moving);
            this._changed();
        });
        row.addEventListener('dragend', () => {
            this.drag_item = null;
            for (let el of this.list_el.querySelectorAll('.ls_dragging, .ls_drag_target')) {
                el.classList.remove('ls_dragging', 'ls_drag_target');
            }
        });
    }
    // #endregion drag_and_drop

    // #region context_menu
    /**
     * Builds the right-click entries for a row element or null.
     */
    _menu_items(row) {
        let icons = ListSelector.ICONS;
        let entries = [];
        if (row) {
            entries.push({ label: 'Copy value', icon: icons.copy, action: () => ListSelector.copy_text(row.dataset.item) });
        }
        entries.push({ label: 'Copy all selected', icon: icons.copy, action: () => ListSelector.copy_text(this._selection_text()) });
        entries.push({ type: 'separator' });
        if (this.allow_exclude) {
            entries.push({ label: 'Include all', icon: icons.check, action: () => this._bulk('select_all') });
            entries.push({ label: 'Exclude all', icon: icons.ban, action: () => this._bulk('exclude_all') });
        } else {
            entries.push({ label: 'Select all', icon: icons.check, action: () => this._bulk('select_all') });
        }
        entries.push({ type: 'separator' });
        entries.push({ label: 'Clear all', icon: icons.clear, action: () => this._bulk('clear_all') });
        let extras = this._extra_items(row);
        if (extras.length) {
            entries.push({ type: 'separator' });
            entries = entries.concat(extras);
        }
        return entries;
    }

    /**
     * Resolves configured extra menu entries; returns [] on error or a non-array.
     */
    _extra_items(row) {
        let extras = this.extra_context_menu_items;
        if (typeof extras === 'function') {
            try {
                extras = extras(row || null);
            } catch (error) {
                console.warn('[list_selector] extra_menu_items_failed', error);
                return [];
            }
        }
        return Array.isArray(extras) ? extras : [];
    }

    /**
     * Returns the clipboard text for "Copy all selected".
     */
    _selection_text() {
        if (!this.allow_exclude) {
            return this.selected.join('\n');
        }
        return 'Selected:\n' + this.selected.join('\n') + '\n\nExcluded:\n' + this.excluded.join('\n');
    }

    /**
     * Copies text with the Clipboard API, falling back to a hidden text area and execCommand.
     */
    static copy_text(text) {
        let fallback = () => {
            let area = document.createElement('textarea');
            area.value = text;
            area.readOnly = true;
            area.style.position = 'fixed';
            area.style.left = '-9999px';
            document.body.appendChild(area);
            area.select();
            try {
                document.execCommand('copy');
            } catch (error) {
                console.warn('[list_selector] copy_failed', error);
            }
            area.remove();
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).catch(fallback);
            return;
        }
        fallback();
    }
    // #endregion context_menu
}

window.ListSelector = ListSelector;
if (window.WidgetRegistry) {
    WidgetRegistry.register('list_selector', {
        label: 'List Selector',
        category: 'inputs',
        container: false,
        options: [
            { name: 'items', type: 'json', default: ['id', 'name', 'email', 'role', 'created_at', 'last_login'] },
            { name: 'selected', type: 'json', default: ['name', 'email'] },
            { name: 'excluded', type: 'json', default: ['last_login'] },
            { name: 'allow_exclude', type: 'bool', default: true },
            { name: 'sub_status_map', type: 'json', default: { role: 'group' } }
        ],
        build: (host, options) => new ListSelector(host, options)
    });
}
