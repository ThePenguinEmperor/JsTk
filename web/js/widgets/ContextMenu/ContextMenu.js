/**
 * ContextMenu: custom right-click menu bound to an element, with icons, async actions,
 * nested submenus, keyboard navigation, optional search and per-type extra items.
 */
class ContextMenu {
    static CSS_URL = (document.currentScript && document.currentScript.src)
        ? document.currentScript.src.replace(/\.js(\?.*)?$/, '.css')
        : 'web/js/widgets/ContextMenu/ContextMenu.css';
    static active_menu = null;
    static custom_css_count = 0;

    /**
     * Binds a right-click menu to bound_el; throws when bound_el is not an element.
     * @param {object} opts - enable_search, theme_class, custom_css, on_before_show(item_type, event).
     */
    constructor(bound_el, opts = {}) {
        if (!(bound_el instanceof HTMLElement)) {
            throw new Error('ContextMenu: the bound element must be a valid DOM element');
        }
        let options = opts || {};
        ContextMenu.ensure_css();
        this.bound_el = bound_el;
        this.enable_search = options.enable_search === true;
        this.on_before_show = typeof options.on_before_show === 'function' ? options.on_before_show : null;
        this.theme_class = options.theme_class ? String(options.theme_class) : '';
        this.is_submenu = options.is_submenu === true;
        this.items = [];
        this.items_by_type = {};
        this.is_visible = false;
        this.last_clicked_object = null;
        this.search_term = '';
        this.parent_menu = null;
        this.parent_item_el = null;
        this.child_menu = null;
        this.active_type = null;
        this.theme_vars = null;
        this.focus_on_show = true;
        this.rows = [];
        this.focus_index = -1;
        this.search_input = null;
        this.get_type_from_event = this.get_type_from_event.bind(this);
        this.build_container();
        this.bind_events();
        if (options.custom_css) {
            this.apply_custom_css(options.custom_css);
        }
    }

    // #region setup
    /**
     * Adds the stylesheet link to the document head once per page.
     */
    static ensure_css() {
        if (document.getElementById('cm_styles')) {
            return;
        }
        let link = document.createElement('link');
        link.id = 'cm_styles';
        link.rel = 'stylesheet';
        link.href = ContextMenu.CSS_URL;
        document.head.appendChild(link);
    }

    /**
     * Creates the detached menu container and its item list.
     */
    build_container() {
        this.menu_el = document.createElement('div');
        this.menu_el.className = 'cm_menu' + (this.theme_class ? ' ' + this.theme_class : '');
        this.menu_el.setAttribute('role', 'menu');
        this.menu_el.tabIndex = -1;
        if (typeof window.get_next_z_index === 'function') {
            this.menu_el.style.zIndex = window.get_next_z_index();
        }
        this.list_el = document.createElement('div');
        this.list_el.className = 'cm_list';
        this.menu_el.appendChild(this.list_el);
    }

    /**
     * Wires the outside-click and right-click listeners (root menus only) and keyboard handling.
     */
    bind_events() {
        this._on_doc_down = e => this.on_document_mousedown(e);
        this._on_context = e => this.on_context_menu(e);
        this._on_key = e => this.on_key(e);
        if (!this.is_submenu) {
            document.addEventListener('mousedown', this._on_doc_down, true);
            this.bound_el.addEventListener('contextmenu', this._on_context);
        }
        this.menu_el.addEventListener('keydown', this._on_key);
    }

    /**
     * Hides the menu and removes every listener; the instance is unusable afterwards.
     */
    destroy() {
        this.hide();
        document.removeEventListener('mousedown', this._on_doc_down, true);
        this.bound_el.removeEventListener('contextmenu', this._on_context);
        this.menu_el.removeEventListener('keydown', this._on_key);
    }

    /**
     * Injects css_string as a new style element; every call adds one more element.
     */
    apply_custom_css(css_string) {
        if (!css_string) {
            return;
        }
        ContextMenu.custom_css_count += 1;
        let style = document.createElement('style');
        style.id = 'cm_custom_' + ContextMenu.custom_css_count;
        style.textContent = String(css_string);
        document.head.appendChild(style);
    }

    /**
     * Applies a preset name or a CSS variable object inline on the menu; submenus inherit it.
     */
    set_theme(theme) {
        if (!window.ThemeManager) {
            return;
        }
        let vars = ThemeManager.resolve(theme);
        if (vars) {
            this.theme_vars = vars;
            ThemeManager.apply(this.menu_el, vars);
        }
    }
    // #endregion setup

    // #region items
    /**
     * Replaces all base items; non-arrays become an empty list.
     */
    set_items(items) {
        this.items = Array.isArray(items) ? items.slice() : [];
        this.render();
    }

    /**
     * Appends one base item.
     */
    add_item(item) {
        this.items.push(item);
        this.render();
    }

    /**
     * Removes the first base item whose label equals label.
     */
    remove_item(label) {
        let index = this.items.findIndex(item => item && item.label === label);
        if (index >= 0) {
            this.items.splice(index, 1);
            this.render();
        }
    }

    /**
     * Removes all base items.
     */
    clear_items() {
        this.items = [];
        this.render();
    }

    /**
     * Registers extra items shown when the right-clicked element matches type.
     */
    add_type_items(type, items) {
        if (!type) {
            return;
        }
        this.items_by_type[type] = Array.isArray(items) ? items.slice() : [];
    }

    /**
     * Removes the extra items registered for type.
     */
    remove_type_items(type) {
        if (this.has_type(type)) {
            delete this.items_by_type[type];
        }
    }

    /**
     * True when type has a registration.
     */
    has_type(type) {
        let known = !!type && Object.prototype.hasOwnProperty.call(this.items_by_type, type);
        return known;
    }

    /**
     * Finds the innermost registered type for a right-click: data-type first, then class names.
     * @returns {object|null} { type, element } or null.
     */
    get_type_from_event(e) {
        let match_el = el => {
            if (!el || el.nodeType !== 1) {
                return null;
            }
            let data_type = el.getAttribute('data-type');
            if (this.has_type(data_type)) {
                return data_type;
            }
            return [...el.classList].find(cls => this.has_type(cls)) || null;
        };
        let el = e && e.target;
        while (el && el !== this.bound_el && el !== document.body) {
            let type = match_el(el);
            if (type) {
                return { type: type, element: el };
            }
            el = el.parentElement;
        }
        let own_type = this.bound_el !== document.body ? match_el(this.bound_el) : null;
        return own_type ? { type: own_type, element: this.bound_el } : null;
    }
    // #endregion items

    // #region rendering
    /**
     * Rebuilds the item rows from base items, active type items and the search filter.
     */
    render() {
        this.close_child();
        this.sync_search_input();
        this.list_el.replaceChildren();
        this.rows = [];
        this.focus_index = -1;
        let entries = this.items.slice();
        let typed = this.has_type(this.active_type) ? this.items_by_type[this.active_type] : null;
        if (typed && typed.length) {
            entries = entries.concat([{ type: 'separator' }], typed);
        }
        let term = this.enable_search ? String(this.search_term || '').toLowerCase() : '';
        if (term) {
            entries = entries.filter(item => item && typeof item.label === 'string' && item.label.toLowerCase().includes(term));
        }
        for (let def of entries) {
            this.list_el.appendChild(this.render_entry(def));
        }
    }

    /**
     * Creates or removes the search input so it matches enable_search; the input is kept between renders.
     */
    sync_search_input() {
        if (this.enable_search && !this.search_input) {
            this.search_input = document.createElement('input');
            this.search_input.type = 'text';
            this.search_input.className = 'cm_search';
            this.search_input.placeholder = 'Search...';
            this.search_input.setAttribute('autocomplete', 'off');
            this.search_input.addEventListener('input', () => {
                this.search_term = this.search_input.value;
                this.render();
                this.set_focus(0, false);
            });
            this.menu_el.insertBefore(this.search_input, this.list_el);
        } else if (!this.enable_search && this.search_input) {
            this.search_input.remove();
            this.search_input = null;
        }
        if (this.search_input && this.search_input.value !== this.search_term) {
            this.search_input.value = this.search_term;
        }
    }

    /**
     * Renders one entry as a separator, a group or an item row.
     */
    render_entry(def) {
        if (def && (def.type === 'separator' || def.separator === true)) {
            let separator = document.createElement('div');
            separator.className = 'cm_separator';
            separator.setAttribute('role', 'separator');
            return separator;
        }
        if (def && def.type === 'group') {
            let group = document.createElement('div');
            group.className = 'cm_group';
            group.setAttribute('role', 'group');
            for (let child of (Array.isArray(def.items) ? def.items : [])) {
                group.appendChild(this.render_entry(child));
            }
            return group;
        }
        return this.render_item(def && typeof def === 'object' ? def : {});
    }

    /**
     * Renders an item row and records it for keyboard navigation.
     */
    render_item(def) {
        let has_sub = ContextMenu.has_submenu(def);
        if (!def.label && !def.html && !has_sub) {
            console.warn('[context_menu] item without label, html or submenu; use { type: "separator" } for a divider');
        }
        let index = this.rows.length;
        let row = document.createElement('div');
        row.className = 'cm_item';
        row.setAttribute('role', 'menuitem');
        row.setAttribute('data-index', String(index));
        row.tabIndex = 0;
        ContextMenu.fill_item(row, def);
        if (has_sub) {
            row.classList.add('cm_has_submenu');
            row.setAttribute('aria-haspopup', 'menu');
        }
        if (def.disabled) {
            row.classList.add('cm_disabled');
            row.setAttribute('aria-disabled', 'true');
        }
        row.addEventListener('mouseenter', () => this.on_item_hover(index));
        row.addEventListener('click', e => {
            e.stopPropagation();
            this.activate(index);
        });
        this.rows.push({ el: row, def: def });
        return row;
    }

    /**
     * Fills a row with the optional icon and the html or label content.
     */
    static fill_item(row, def) {
        if (def.icon) {
            let icon = document.createElement('span');
            icon.className = 'cm_icon';
            if (def.icon instanceof HTMLElement) {
                icon.appendChild(def.icon);
            } else if (String(def.icon).startsWith('<')) {
                icon.innerHTML = def.icon;
            } else {
                icon.textContent = String(def.icon);
            }
            row.appendChild(icon);
        }
        let content = document.createElement('span');
        if (def.html) {
            content.className = 'cm_html';
            content.innerHTML = def.html;
        } else {
            content.className = 'cm_label';
            content.textContent = def.label === null || def.label === undefined ? '' : String(def.label);
        }
        row.appendChild(content);
    }

    /**
     * True when def has a non-empty submenu array.
     */
    static has_submenu(def) {
        let has_sub = !!def && Array.isArray(def.submenu) && def.submenu.length > 0;
        return has_sub;
    }
    // #endregion rendering

    // #region show_hide
    /**
     * Opens the menu at page coordinates; parent_menu and parent_item_el are set for submenus.
     * @param {string|null} item_type - Registered type whose items are appended after a separator.
     */
    show(x, y, parent_menu = null, parent_item_el = null, item_type = null) {
        if (!parent_menu) {
            let active = ContextMenu.active_menu;
            if (active && active !== this) {
                active.hide();
            }
            ContextMenu.active_menu = this;
        }
        this.parent_menu = parent_menu;
        this.parent_item_el = parent_item_el;
        this.active_type = item_type;
        this.render();
        let el = this.menu_el;
        el.style.visibility = 'hidden';
        el.style.left = '0px';
        el.style.top = '0px';
        el.classList.add('cm_open');
        if (!el.isConnected) {
            document.body.appendChild(el);
        }
        if (typeof window.get_next_z_index === 'function') {
            el.style.zIndex = window.get_next_z_index();
        }
        let pos = { x: x, y: y };
        if (!parent_menu) {
            pos = this.clamp_position(x, y, el.offsetWidth || 180, el.offsetHeight || 32 * Math.max(1, this.rows.length));
        }
        el.style.left = pos.x + 'px';
        el.style.top = pos.y + 'px';
        el.style.visibility = '';
        this.is_visible = true;
        setTimeout(() => this.focus_after_show(), 0);
    }

    /**
     * Keeps a root menu inside the visible viewport, 8px from the right and bottom edges.
     */
    clamp_position(x, y, width, height) {
        let sx = window.scrollX;
        let sy = window.scrollY;
        let right = sx + document.documentElement.clientWidth;
        let bottom = sy + document.documentElement.clientHeight;
        let left = x + width > right - 8 ? Math.max(sx, right - width - 8) : x;
        let top = y + height > bottom - 8 ? Math.max(sy, bottom - height - 8) : y;
        return { x: left, y: top };
    }

    /**
     * Highlights the first item and moves keyboard focus into the menu.
     */
    focus_after_show() {
        if (!this.is_visible) {
            return;
        }
        if (this.search_input) {
            this.set_focus(0, false);
            this.search_input.focus();
        } else if (this.focus_on_show) {
            this.set_focus(0, true);
            if (!this.rows.length) {
                this.menu_el.focus();
            }
        }
    }

    /**
     * Closes this menu level and its submenus, then re-renders base items only.
     */
    hide() {
        if (!this.is_visible) {
            return;
        }
        if (ContextMenu.active_menu === this) {
            ContextMenu.active_menu = null;
        }
        this.is_visible = false;
        this.close_child();
        this.menu_el.classList.remove('cm_open');
        this.menu_el.remove();
        if (this.parent_item_el) {
            this.parent_item_el.classList.remove('cm_submenu_active');
        }
        if (this.parent_menu && this.parent_menu.child_menu === this) {
            this.parent_menu.child_menu = null;
        }
        this.active_type = null;
        this.render();
    }

    /**
     * Hides the whole menu tree from its root.
     */
    hide_tree() {
        let root = this;
        while (root.parent_menu) {
            root = root.parent_menu;
        }
        root.hide();
    }

    /**
     * Hides the menu when a press lands outside it and outside every open submenu level.
     */
    on_document_mousedown(e) {
        if (!this.is_visible) {
            return;
        }
        let level = this;
        while (level) {
            if (level.menu_el.contains(e.target)) {
                return;
            }
            level = level.child_menu;
        }
        this.hide();
    }

    /**
     * Handles a right-click on the bound element; the innermost bound menu wins.
     */
    on_context_menu(e) {
        e.preventDefault();
        if (e.cm_handled) {
            return;
        }
        e.cm_handled = true;
        this.last_clicked_object = e.target;
        let match = this.get_type_from_event(e);
        let item_type = match ? match.type : null;
        if (this.on_before_show) {
            try {
                this.on_before_show(item_type, e);
            } catch (error) {
                console.warn('[context_menu] on_before_show failed', error);
            }
        }
        this.show(e.pageX, e.pageY, null, null, item_type);
    }
    // #endregion show_hide

    // #region submenus
    /**
     * Opens the submenu of the row at index beside it, closing any other open submenu.
     */
    open_submenu(index, from_keyboard) {
        let row = this.rows[index];
        if (!row || !ContextMenu.has_submenu(row.def) || row.def.disabled) {
            return;
        }
        this.set_focus(index, from_keyboard);
        if (this.child_menu && this.child_menu.parent_item_el === row.el) {
            if (from_keyboard) {
                this.child_menu.set_focus(0, true);
            }
            return;
        }
        this.close_child();
        let child = new ContextMenu(row.el, { is_submenu: true, theme_class: this.theme_class });
        if (this.theme_vars) {
            child.set_theme(this.theme_vars);
        }
        child.focus_on_show = from_keyboard;
        child.set_items(row.def.submenu);
        let pos = ContextMenu.submenu_position(child, row.el);
        this.child_menu = child;
        row.el.classList.add('cm_submenu_active');
        child.show(pos.x, pos.y, this, row.el, null);
    }

    /**
     * Measures child off-screen and returns a page position beside item_el that fits the viewport.
     */
    static submenu_position(child, item_el) {
        let el = child.menu_el;
        el.style.visibility = 'hidden';
        el.style.left = '-10000px';
        el.style.top = '0px';
        el.classList.add('cm_open');
        document.body.appendChild(el);
        let width = el.offsetWidth || 180;
        let height = el.offsetHeight || 32 * Math.max(1, child.rows.length);
        let rect = item_el.getBoundingClientRect();
        let sx = window.scrollX;
        let sy = window.scrollY;
        let x = rect.right + sx + 2;
        if (x + width > sx + document.documentElement.clientWidth) {
            x = Math.max(sx, rect.left + sx - width - 2);
        }
        let y = rect.top + sy;
        if (y + height > sy + document.documentElement.clientHeight) {
            y = Math.max(sy, rect.bottom + sy - height);
        }
        return { x: x, y: y };
    }

    /**
     * Closes and disposes the open submenu, if any.
     */
    close_child() {
        let child = this.child_menu;
        if (!child) {
            return;
        }
        this.child_menu = null;
        child.destroy();
    }

    /**
     * Closes this submenu and returns focus to the parent's highlighted item.
     */
    back_to_parent() {
        let parent = this.parent_menu;
        parent.close_child();
        parent.set_focus(parent.focus_index, true);
    }
    // #endregion submenus

    // #region interaction
    /**
     * Highlights the row at index; moves DOM focus to it when move_focus is true.
     */
    set_focus(index, move_focus) {
        for (let row of this.rows) {
            row.el.classList.remove('cm_focused');
        }
        let row = this.rows[index];
        this.focus_index = row ? index : -1;
        if (!row) {
            return;
        }
        row.el.classList.add('cm_focused');
        if (move_focus) {
            row.el.focus({ preventScroll: true });
        }
    }

    /**
     * Highlights a hovered row and opens or closes submenus to match.
     */
    on_item_hover(index) {
        let row = this.rows[index];
        if (ContextMenu.has_submenu(row.def) && !row.def.disabled) {
            this.open_submenu(index, false);
            return;
        }
        this.close_child();
        this.set_focus(index, false);
    }

    /**
     * Runs the row's action and hides the tree; submenu rows open their submenu instead.
     * Disabled and busy rows are ignored for mouse and keyboard alike.
     */
    activate(index) {
        let row = this.rows[index];
        if (!row || row.def.disabled || row.el.classList.contains('cm_busy')) {
            return;
        }
        if (ContextMenu.has_submenu(row.def)) {
            this.open_submenu(index, true);
            return;
        }
        if (typeof row.def.action === 'function' && row.def.async === true) {
            this.run_async(row);
            return;
        }
        this.hide_tree();
        if (typeof row.def.action === 'function') {
            try {
                row.def.action();
            } catch (error) {
                console.error('[context_menu] action failed', error);
            }
        }
    }

    /**
     * Runs an async action with a spinner in its row, then restores the row and hides the tree.
     */
    run_async(row) {
        let result = null;
        try {
            result = row.def.action();
        } catch (error) {
            console.error('[context_menu] action failed', error);
        }
        if (!result || typeof result.then !== 'function') {
            this.hide_tree();
            return;
        }
        let saved = [...row.el.childNodes];
        let spinner = document.createElement('span');
        spinner.className = 'cm_spinner';
        row.el.classList.add('cm_busy');
        row.el.replaceChildren(spinner);
        let finish = () => {
            row.el.classList.remove('cm_busy');
            row.el.replaceChildren(...saved);
            if (row.el.isConnected) {
                this.hide_tree();
            }
        };
        result.then(finish, error => {
            console.error('[context_menu] async action failed', error);
            finish();
        });
    }

    /**
     * Keyboard navigation: arrows move and open or close submenus, Enter or Space activates, Escape closes.
     */
    on_key(e) {
        let count = this.rows.length;
        if (!count) {
            return;
        }
        let in_search = e.target === this.search_input;
        let current = this.rows[this.focus_index];
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.set_focus((this.focus_index + 1) % count, true);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.set_focus(this.focus_index <= 0 ? count - 1 : this.focus_index - 1, true);
        } else if (e.key === 'ArrowRight' && current && ContextMenu.has_submenu(current.def)) {
            e.preventDefault();
            this.open_submenu(this.focus_index, true);
        } else if (e.key === 'ArrowLeft' && this.parent_menu && !in_search) {
            e.preventDefault();
            this.back_to_parent();
        } else if (e.key === 'Enter' || (e.key === ' ' && !in_search)) {
            e.preventDefault();
            this.activate(this.focus_index);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            if (this.parent_menu) {
                this.back_to_parent();
            } else {
                this.hide();
            }
        }
    }
    // #endregion interaction

    // #region registry_helpers
    /**
     * Copies item definitions, giving action-less items a notification action so demo menus react.
     */
    static with_log_actions(items) {
        let list = Array.isArray(items) ? items : [];
        return list.map(item => {
            if (!item || typeof item !== 'object') {
                return item;
            }
            let copy = Object.assign({}, item);
            if (Array.isArray(copy.submenu)) {
                copy.submenu = ContextMenu.with_log_actions(copy.submenu);
            }
            if (Array.isArray(copy.items)) {
                copy.items = ContextMenu.with_log_actions(copy.items);
            }
            if (copy.label && typeof copy.action !== 'function' && !ContextMenu.has_submenu(copy)) {
                copy.action = () => console.log('[context_menu] picked: ' + copy.label);
            }
            return copy;
        });
    }
    // #endregion registry_helpers
}

window.ContextMenu = ContextMenu;
if (window.WidgetRegistry) {
    WidgetRegistry.register('context_menu', {
        label: 'Context Menu',
        category: 'menus',
        container: false,
        options: [
            { name: 'area_text', type: 'string', default: 'Right-click here' },
            { name: 'enable_search', type: 'bool', default: false },
            { name: 'theme_class', type: 'string', default: '' },
            {
                name: 'items',
                type: 'json',
                default: [
                    { label: 'Copy', icon: 'C' },
                    { label: 'Paste', icon: 'P' },
                    { type: 'separator' },
                    { label: 'More', submenu: [{ label: 'Rename' }, { label: 'Duplicate' }] },
                    { label: 'Delete', disabled: true }
                ]
            }
        ],
        build: (host, options) => {
            let area = document.createElement('div');
            area.className = 'cm_demo_area';
            area.textContent = options.area_text || '';
            host.appendChild(area);
            let items = options.items;
            if (typeof items === 'string') {
                try {
                    items = JSON.parse(items);
                } catch (error) {
                    console.error('[context_menu] invalid items json', error);
                    items = [];
                }
            }
            let menu = new ContextMenu(area, { enable_search: !!options.enable_search, theme_class: options.theme_class });
            menu.set_items(ContextMenu.with_log_actions(items));
            return menu;
        }
    });
}
