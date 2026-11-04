/**
 * TabbedContainer: tab bar plus content area with pinning, fixed slots, badges, drag reorder,
 * a fast travel context menu and an optional split view backed by DockWorkspace.
 * The main instance owns events and split state; a second instance serves the split pane.
 */
class TabbedContainer {
    static _style_ready = false;
    static _css_href = TabbedContainer.find_css_href();
    static _drag = null;
    static ICONS = {
        pin: '<svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor"><path d="M10.5 1.5l4 4-1.6.8-2.9 2.9.6 3.6-1.1 1.1-3.2-3.2-3.8 3.8H1.8v-.7l3.8-3.8-3.2-3.2 1.1-1.1 3.6.6 2.9-2.9z"/></svg>',
        lock: '<svg viewBox="0 0 16 16" width="10" height="10" fill="currentColor"><path d="M4 7V5a4 4 0 0 1 8 0v2h1v8H3V7zm2 0h4V5a2 2 0 0 0-4 0z"/></svg>',
        close: '<svg viewBox="0 0 16 16" width="9" height="9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
        check: '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8.5l3 3 7-7"/></svg>'
    };

    /**
     * Stores options; render() must run before any tab operation.
     * @param {HTMLElement} mount - Element the widget appends into; also the set_theme target.
     */
    constructor(mount, options = {}) {
        this.mount = mount;
        this.options = Object.assign({
            id: null,
            allow_pin: false,
            max_pinned: null,
            extra_context_menu_items: null,
            before_close: null,
            max_label_chars: null,
            allow_split: true
        }, options || {});
        this.tabs = [];
        this.active_id = null;
        this._main = this;
        this._pane_name = 'primary';
        this._peer = null;
        this._dock = null;
        this._split_open = false;
        this._split_orientation = 'horizontal';
        this._suppress_split = 0;
        this._menu = null;
        this._root = null;
        this._bar = null;
        this._pinned_zone = null;
        this._scroll_zone = null;
        this._actions_zone = null;
        this._content_area = null;
    }

    // #region styles
    /**
     * Returns the stylesheet URL next to this script, or the default project path.
     */
    static find_css_href() {
        let src = document.currentScript ? document.currentScript.src : '';
        if (/\/TabbedContainer\.js(\?.*)?$/.test(src)) {
            return src.replace(/\.js(\?.*)?$/, '.css');
        }
        return 'web/js/widgets/TabbedContainer/TabbedContainer.css';
    }

    /**
     * Adds the widget stylesheet (id tc_style) to the head once per page.
     */
    static ensure_style() {
        if (TabbedContainer._style_ready || document.getElementById('tc_style')) {
            TabbedContainer._style_ready = true;
            return;
        }
        let link = document.createElement('link');
        link.id = 'tc_style';
        link.rel = 'stylesheet';
        link.href = TabbedContainer._css_href;
        document.head.appendChild(link);
        TabbedContainer._style_ready = true;
    }

    /**
     * Escapes text for safe use inside HTML.
     */
    static escape_html(text) {
        let div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML.replace(/"/g, '&quot;');
    }
    // #endregion styles

    // #region rendering
    /**
     * Builds the root, tab bar zones and content area and appends them to the mount.
     */
    render() {
        TabbedContainer.ensure_style();
        let make = (class_name, parent) => {
            let el = document.createElement('div');
            el.className = class_name;
            if (parent) {
                parent.appendChild(el);
            }
            return el;
        };
        this._root = make('tc_root');
        if (this.options.id) {
            this._root.id = this.options.id;
        }
        this._bar = make('tc_bar', this._root);
        this._pinned_zone = make('tc_pinned_zone', this._bar);
        this._scroll_zone = make('tc_scroll_zone', this._bar);
        this._actions_zone = make('tc_actions_zone', this._bar);
        this._content_area = make('tc_content_area', this._root);
        this._scroll_zone.addEventListener('wheel', event => this._on_wheel(event), { passive: false });
        this._bar.addEventListener('dragover', event => this._on_bar_drag_over(event));
        this._bar.addEventListener('drop', event => this._on_bar_drop(event));
        this._bar.addEventListener('contextmenu', event => this._on_context_menu(event));
        if (!window.ContextMenu) {
            console.warn('[tabbed_container] context_menu_missing: right-click menu unavailable');
        }
        this.mount.appendChild(this._root);
        return this;
    }

    /**
     * Rebuilds all tab buttons in both zones and re-applies active classes without firing events.
     */
    _render_bar() {
        this._pinned_zone.replaceChildren();
        this._scroll_zone.replaceChildren();
        for (let tab of this.tabs) {
            if (tab.pinned) {
                this._pinned_zone.appendChild(this._build_button(tab));
            }
        }
        for (let tab of this._scroll_order()) {
            this._scroll_zone.appendChild(this._build_button(tab));
        }
        this._sync_active();
    }

    /**
     * Orders non-pinned tabs: fixed tabs take their 1-based slot, regular tabs fill gaps, always-last tabs follow.
     */
    _scroll_order() {
        let regular = this.tabs.filter(tab => this._kind(tab) === 'regular');
        let fixed = this.tabs.filter(tab => !tab.pinned && tab.fixed_pos !== null);
        let last = this.tabs.filter(tab => !tab.pinned && tab.fixed_pos === null && tab.always_last);
        let slots = new Array(regular.length + fixed.length).fill(null);
        for (let tab of fixed) {
            let slot = Math.min(Math.max(Math.floor(tab.fixed_pos) - 1, 0), slots.length - 1);
            while (slot < slots.length && slots[slot]) {
                slot += 1;
            }
            if (slot >= slots.length) {
                slot = slots.lastIndexOf(null);
            }
            slots[slot] = tab;
        }
        let queue = regular.slice();
        for (let i = 0; i < slots.length; i++) {
            slots[i] = slots[i] || queue.shift();
        }
        return slots.concat(last);
    }

    /**
     * Creates one tab button: icon, lock or pin, label, badge and close control.
     */
    _build_button(tab) {
        let kind = this._kind(tab);
        let btn = document.createElement('div');
        btn.className = 'tc_tab' + (tab.pinned ? ' tc_pinned' : '') + (kind === 'locked' ? ' tc_locked' : '');
        btn.setAttribute('role', 'tab');
        btn.setAttribute('data-tab_id', String(tab.id));
        btn.draggable = kind === 'regular';
        if (tab.icon) {
            btn.appendChild(this._make_span('tc_tab_icon', tab.icon));
        }
        if (kind === 'locked') {
            btn.appendChild(this._make_span('tc_lock', TabbedContainer.ICONS.lock, 'Fixed tab: cannot be moved or pinned'));
        } else if (this._main.options.allow_pin) {
            let pin = this._make_span('tc_pin', TabbedContainer.ICONS.pin, tab.pinned ? 'Unpin tab' : 'Pin tab');
            pin.addEventListener('click', () => this.set_pinned(tab.id, !tab.pinned));
            btn.appendChild(pin);
        }
        let info = this._label_info(tab);
        let label = this._make_span('tc_label', '');
        label.textContent = info.text;
        btn.appendChild(label);
        if (tab.badge !== null) {
            let badge = this._make_span('tc_badge', '');
            badge.textContent = tab.badge;
            btn.appendChild(badge);
        }
        if (tab.closable) {
            let close = this._make_span('tc_close', TabbedContainer.ICONS.close, 'Close tab');
            close.addEventListener('click', event => {
                event.stopPropagation();
                this.delete_tab(tab.id);
            });
            btn.appendChild(close);
        }
        btn.title = tab.tooltip || (info.truncated ? tab.label : '');
        btn.addEventListener('click', () => this.switch_tab(tab.id));
        this._wire_drag(btn, tab);
        tab.button = btn;
        return btn;
    }

    /**
     * Creates a span with a class, inner HTML and optional tooltip.
     */
    _make_span(class_name, html, title) {
        let span = document.createElement('span');
        span.className = class_name;
        span.innerHTML = html;
        if (title) {
            span.title = title;
        }
        return span;
    }

    /**
     * Returns the displayed label and whether it was truncated by the label cap.
     */
    _label_info(tab) {
        let cap = 'max_label_chars' in tab ? tab.max_label_chars : this._main.options.max_label_chars;
        if (typeof cap === 'number' && cap >= 1 && tab.label.length > cap) {
            return { text: tab.label.slice(0, Math.floor(cap) - 1) + String.fromCharCode(0x2026), truncated: true };
        }
        return { text: tab.label, truncated: false };
    }

    /**
     * Rebuilds a single tab button in place.
     */
    _refresh_button(tab) {
        let old_button = tab.button;
        let fresh = this._build_button(tab);
        if (old_button && old_button.parentNode) {
            old_button.replaceWith(fresh);
        }
        this._sync_active();
    }

    /**
     * Applies active classes and content visibility for the current active tab.
     */
    _sync_active() {
        for (let tab of this.tabs) {
            let active = String(tab.id) === String(this.active_id);
            tab.content.classList.toggle('tc_hidden', !active);
            if (tab.button) {
                tab.button.classList.toggle('tc_active', active);
            }
        }
    }
    // #endregion rendering

    // #region lookup
    /**
     * Returns 'pinned', 'locked' (fixed or always-last) or 'regular'.
     */
    _kind(tab) {
        if (tab.pinned) {
            return 'pinned';
        }
        return tab.fixed_pos !== null || tab.always_last ? 'locked' : 'regular';
    }

    /**
     * Returns the tab object with this id in this pane, or null.
     */
    _tab(id) {
        let tab = this.tabs.find(item => String(item.id) === String(id));
        return tab || null;
    }

    /**
     * Returns the pane instance (main or split peer) holding the tab, or null.
     */
    _owner(id) {
        let main = this._main;
        let panes = main._peer ? [main, main._peer] : [main];
        let pane = panes.find(item => item._tab(id));
        return pane || null;
    }

    /**
     * Returns every tab of both panes, main pane first.
     */
    _all_tabs() {
        let main = this._main;
        let peer_tabs = main._peer ? main._peer.tabs : [];
        return main.tabs.concat(peer_tabs);
    }
    // #endregion lookup

    // #region events
    /**
     * Dispatches a bubbling CustomEvent on the main root; nothing before render.
     */
    _emit(name, detail) {
        let root = this._main._root;
        if (root) {
            root.dispatchEvent(new CustomEvent(name, { detail: detail, bubbles: true }));
        }
    }

    /**
     * Fires tabbed_list_changed with a snapshot of both panes.
     */
    _emit_list(action, id) {
        let main = this._main;
        let tabs = main.tabs.map(tab => ({ id: tab.id, label: tab.label, pinned: tab.pinned, closable: tab.closable, pane: 'primary' }));
        if (main._peer) {
            tabs = tabs.concat(main._peer.tabs.map(tab => ({ id: tab.id, label: tab.label, pinned: tab.pinned, closable: tab.closable, pane: 'secondary' })));
        }
        this._emit('tabbed_list_changed', { action: action, id: id, pane: this._pane_name, tabs: tabs });
    }

    /**
     * Fires tabbed_split_changed with get_split_state() unless suppressed.
     */
    _emit_split() {
        if (this._main._suppress_split > 0) {
            return;
        }
        this._emit('tabbed_split_changed', this.get_split_state());
    }
    // #endregion events

    // #region tab_api
    /**
     * Adds a tab; only the very first tab auto-activates.
     * @param {Object} options - pinned, closable, fixed_pos (1-based), always_last, content, icon (HTML),
     *     exclude_from_fast_travel, max_label_chars (null disables the cap for this tab).
     */
    create_tab(id, label, options = {}) {
        let opts = options || {};
        if (this._owner(id)) {
            console.warn('[tabbed_container] duplicate_tab_id: ' + id);
            return this;
        }
        let fixed_pos = typeof opts.fixed_pos === 'number' ? opts.fixed_pos : null;
        let always_last = opts.always_last === true;
        let locked = fixed_pos !== null || always_last;
        let tab = {
            id: id,
            label: String(label === undefined || label === null ? id : label),
            pinned: !locked && opts.pinned === true,
            fixed_pos: fixed_pos,
            always_last: always_last,
            icon: opts.icon || '',
            exclude_from_fast_travel: !!opts.exclude_from_fast_travel,
            tooltip: '',
            badge: null,
            button: null,
            content: document.createElement('div')
        };
        tab.closable = !tab.pinned && !locked && opts.closable !== false;
        if ('max_label_chars' in opts) {
            tab.max_label_chars = opts.max_label_chars;
        }
        tab.content.className = 'tc_content tc_hidden';
        if (opts.content instanceof HTMLElement) {
            tab.content.appendChild(opts.content);
        }
        this._content_area.appendChild(tab.content);
        if (tab.pinned) {
            this.tabs.unshift(tab);
        } else {
            this.tabs.push(tab);
        }
        this._render_bar();
        if (this.tabs.length === 1) {
            this._activate(tab.id);
        }
        this._emit_list('create', tab.id);
        return this;
    }

    /**
     * Deletes a tab after the before_close veto hook; pinned tabs cannot be deleted.
     */
    delete_tab(id) {
        let pane = this._owner(id);
        if (!pane) {
            return this;
        }
        let tab = pane._tab(id);
        if (tab.pinned) {
            console.warn('[tabbed_container] pinned_tab_not_deletable: ' + id);
            return this;
        }
        let finish = () => {
            let owner = this._owner(id);
            if (owner) {
                owner._remove_tab(owner._tab(id));
            }
        };
        let hook = this._main.options.before_close;
        let verdict = true;
        if (typeof hook === 'function') {
            try {
                verdict = hook(tab.id);
            } catch (error) {
                console.warn('[tabbed_container] before_close_failed: ' + id, error);
                verdict = true;
            }
        }
        if (verdict && typeof verdict.then === 'function') {
            verdict.then(result => {
                if (result !== false) {
                    finish();
                }
            }, error => console.warn('[tabbed_container] before_close_rejected: ' + id, error));
        } else if (verdict !== false) {
            finish();
        }
        return this;
    }

    /**
     * Removes a tab and its content; the previous tab becomes active when the active one goes.
     */
    _remove_tab(tab) {
        if (!tab || tab.pinned) {
            return;
        }
        let index = this.tabs.indexOf(tab);
        let was_active = String(tab.id) === String(this.active_id);
        this.tabs.splice(index, 1);
        tab.content.remove();
        this._render_bar();
        if (was_active) {
            this.active_id = null;
            let next = this.tabs[index - 1] || this.tabs[0];
            if (next) {
                this._activate(next.id);
            }
        }
        this._emit_list('delete', tab.id);
        this._main._after_pane_change();
    }

    /**
     * Returns the trailing tab bar zone where the host adds its own buttons.
     */
    get_actions_zone() {
        return this._actions_zone;
    }

    /**
     * Sets a pill badge; null, undefined or '' removes it. Badges survive tab bar rebuilds.
     */
    set_tab_badge(id, badge) {
        let pane = this._owner(id);
        if (pane) {
            let tab = pane._tab(id);
            tab.badge = badge === null || badge === undefined || badge === '' ? null : String(badge);
            pane._refresh_button(tab);
        }
        return this;
    }

    /**
     * Sets an explicit tooltip that overrides the truncated-label tooltip; empty clears it.
     */
    set_tab_tooltip(id, tooltip) {
        let pane = this._owner(id);
        if (pane) {
            let tab = pane._tab(id);
            tab.tooltip = tooltip === null || tooltip === undefined ? '' : String(tooltip);
            pane._refresh_button(tab);
        }
        return this;
    }

    /**
     * Updates the full and displayed label; scrolls the tab into view when active.
     */
    rename_tab(id, new_label) {
        let pane = this._owner(id);
        if (!pane) {
            return this;
        }
        let tab = pane._tab(id);
        tab.label = String(new_label);
        pane._refresh_button(tab);
        if (String(pane.active_id) === String(tab.id)) {
            pane._scroll_into_view(tab);
        }
        pane._emit_list('rename', tab.id);
        return this;
    }

    /**
     * Moves a regular tab to an index of the pane's internal order, never before pinned tabs.
     */
    move_tab(id, new_index) {
        let pane = this._owner(id);
        let tab = pane ? pane._tab(id) : null;
        if (!tab || pane._kind(tab) !== 'regular') {
            return this;
        }
        let from = pane.tabs.indexOf(tab);
        let pinned_count = pane.tabs.filter(item => item.pinned).length;
        let target = Math.min(Math.max(Number(new_index) || 0, pinned_count), pane.tabs.length - 1);
        if (target === from) {
            return this;
        }
        pane.tabs.splice(from, 1);
        pane.tabs.splice(target, 0, tab);
        pane._render_bar();
        pane._reselect();
        pane._emit_list('move', tab.id);
        return this;
    }

    /**
     * Activates a tab, shows its content and fires tabbed_tab_selected.
     */
    switch_tab(id) {
        let pane = this._owner(id);
        if (pane) {
            pane._activate(pane._tab(id).id);
        }
        return this;
    }

    /**
     * Sets the active tab of this pane, scrolls its button into view and fires the selected event.
     */
    _activate(id) {
        this.active_id = id;
        this._sync_active();
        this._scroll_into_view(this._tab(id));
        this._emit('tabbed_tab_selected', { id: id, pane: this._pane_name });
    }

    /**
     * Re-applies the active tab after a rebuild, firing the selected event again.
     */
    _reselect() {
        if (this.active_id !== null && this._tab(this.active_id)) {
            this._activate(this.active_id);
        } else {
            this._sync_active();
        }
    }

    /**
     * Scrolls the scroll zone horizontally just enough to show the tab button.
     */
    _scroll_into_view(tab) {
        if (!tab || tab.pinned || !tab.button || !tab.button.isConnected) {
            return;
        }
        let zone_rect = this._scroll_zone.getBoundingClientRect();
        let rect = tab.button.getBoundingClientRect();
        if (rect.left < zone_rect.left) {
            this._scroll_zone.scrollLeft -= zone_rect.left - rect.left;
        } else if (rect.right > zone_rect.right) {
            this._scroll_zone.scrollLeft += rect.right - zone_rect.right;
        }
    }

    /**
     * Empties a tab's content element.
     */
    clear_tab(id) {
        let pane = this._owner(id);
        if (pane) {
            pane._tab(id).content.replaceChildren();
        }
        return this;
    }

    /**
     * Pins (front of the bar, not closable) or unpins (always closable) a tab.
     * Fixed and always-last tabs are never changed; the pin limit shows a MessageBox warning.
     */
    set_pinned(id, pinned) {
        let pane = this._owner(id);
        let tab = pane ? pane._tab(id) : null;
        if (!tab || (tab.fixed_pos !== null || tab.always_last) || (pinned && tab.pinned)) {
            return this;
        }
        if (pinned) {
            let max = this._main.options.max_pinned;
            let count = this._all_tabs().filter(item => item.pinned).length;
            if (typeof max === 'number' && count >= max) {
                let noun = max === 1 ? 'tab' : 'tabs';
                let text = 'Pin limit reached: at most ' + max + ' ' + noun + ' can be pinned. Unpin one first.';
                if (window.MessageBox) {
                    MessageBox.warning(text);
                } else {
                    console.warn('[tabbed_container] pin_limit_reached: ' + max);
                }
                return this;
            }
            pane.tabs.splice(pane.tabs.indexOf(tab), 1);
            pane.tabs.unshift(tab);
        }
        tab.pinned = !!pinned;
        tab.closable = !tab.pinned;
        pane._render_bar();
        pane._reselect();
        pane._emit_list(tab.pinned ? 'pin' : 'unpin', tab.id);
        return this;
    }

    /**
     * Shows or hides the close control of a regular tab.
     */
    set_closable(id, closable) {
        let pane = this._owner(id);
        let tab = pane ? pane._tab(id) : null;
        if (!tab || pane._kind(tab) !== 'regular') {
            return this;
        }
        tab.closable = !!closable;
        pane._render_bar();
        pane._reselect();
        return this;
    }

    /**
     * Returns the tab's content element, or null for unknown ids.
     */
    get_content_div(id) {
        let pane = this._owner(id);
        return pane ? pane._tab(id).content : null;
    }

    /**
     * Applies a preset name or CSS variable object to the mount element.
     */
    set_theme(theme) {
        if (window.ThemeManager && ThemeManager.resolve(theme)) {
            ThemeManager.apply(this.mount, theme);
        }
    }
    // #endregion tab_api

    // #region split_view
    /**
     * Opens the split and moves a movable tab into the second pane, where it becomes active.
     * @param {string} orientation - 'horizontal' (side by side, default) or 'vertical' (stacked).
     */
    split_tab(id, orientation = 'horizontal') {
        let main = this._main;
        let tab = main._tab(id);
        if (!main.options.allow_split || main._split_open || main.tabs.length < 2 || !tab || main._kind(tab) !== 'regular') {
            return this;
        }
        if (!window.DockWorkspace) {
            console.warn('[tabbed_container] dock_workspace_missing: split view unavailable');
            return this;
        }
        main._suppress_split += 1;
        main._open_split(orientation);
        main._transfer(tab.id, main._peer, null, true, false);
        main._suppress_split -= 1;
        main._emit_list('split', tab.id);
        main._emit_split();
        return this;
    }

    /**
     * Moves all second-pane tabs back to the main pane and restores the main container in place.
     */
    close_split() {
        let main = this._main;
        if (!main._split_open) {
            return this;
        }
        for (let tab of main._peer.tabs.slice()) {
            main._transfer(tab.id, main, null, false, true);
        }
        main._dock.hide_secondary();
        let dock_el = main._dock.element;
        if (dock_el.parentNode) {
            dock_el.parentNode.replaceChild(main._root, dock_el);
        }
        main._split_open = false;
        main._reselect();
        main._emit_list('unsplit', null);
        main._emit_split();
        return this;
    }

    /**
     * True while the split view is open.
     */
    is_split() {
        return this._main._split_open;
    }

    /**
     * Moves a movable tab to the end of the other pane and activates it there.
     */
    move_to_other_pane(id) {
        let main = this._main;
        let pane = this._owner(id);
        let tab = pane ? pane._tab(id) : null;
        if (!main._split_open || !tab || pane._kind(tab) !== 'regular') {
            return this;
        }
        main._transfer(tab.id, pane === main ? main._peer : main, null, true, false);
        main._after_pane_change();
        return this;
    }

    /**
     * Returns null when not split, else { orientation, primary_ids, secondary_ids, active_ids, split_pct }.
     */
    get_split_state() {
        let main = this._main;
        if (!main._split_open) {
            return null;
        }
        return {
            orientation: main._split_orientation,
            primary_ids: main.tabs.map(tab => tab.id),
            secondary_ids: main._peer.tabs.map(tab => tab.id),
            active_ids: [main.active_id, main._peer.active_id],
            split_pct: main._dock.get_split()
        };
    }

    /**
     * Restores a get_split_state() snapshot (null closes the split); fires one tabbed_split_changed.
     */
    set_split_state(state) {
        let main = this._main;
        main._suppress_split += 1;
        try {
            main.close_split();
            if (state && typeof state === 'object') {
                main._restore_split(state);
            }
        } finally {
            main._suppress_split -= 1;
        }
        main._emit_split();
        return this;
    }

    /**
     * Re-opens the split from a snapshot using only existing movable main-pane ids.
     */
    _restore_split(state) {
        let wanted = Array.isArray(state.secondary_ids) ? state.secondary_ids : [];
        let tabs = [];
        for (let id of wanted) {
            let tab = this._tab(id);
            if (tab && this._kind(tab) === 'regular' && !tabs.includes(tab)) {
                tabs.push(tab);
            }
        }
        if (!this.options.allow_split || !window.DockWorkspace || !tabs.length || tabs.length >= this.tabs.length) {
            return;
        }
        this._open_split(state.orientation === 'vertical' ? 'vertical' : 'horizontal');
        for (let tab of tabs) {
            this._transfer(tab.id, this._peer, null, false, false);
        }
        let actives = Array.isArray(state.active_ids) ? state.active_ids : [];
        [this, this._peer].forEach((pane, index) => {
            let tab = actives[index] === null || actives[index] === undefined ? null : pane._tab(actives[index]);
            if (tab) {
                pane._activate(tab.id);
            }
        });
        if (typeof state.split_pct === 'number') {
            this._dock.set_split(state.split_pct);
        }
    }

    /**
     * Creates or reuses the DockWorkspace and peer instance and swaps the dock in place of the root.
     */
    _open_split(orientation) {
        this._split_orientation = orientation === 'vertical' ? 'vertical' : 'horizontal';
        this._suppress_split += 1;
        if (!this._dock) {
            this._dock = new DockWorkspace(null, {
                show_headers: false,
                orientation: this._split_orientation,
                primary_id: 'tc_main',
                secondary_id: 'tc_peer',
                on_layout_change: () => this._emit_split()
            });
            this._dock.render();
        }
        this._dock.set_orientation(this._split_orientation);
        let parent = this._root.parentNode;
        if (parent) {
            parent.replaceChild(this._dock.element, this._root);
        }
        this._dock.get_pane_body('tc_main').appendChild(this._root);
        this._dock.show_secondary();
        if (!this._peer) {
            let peer_options = Object.assign({}, this.options, { id: null });
            this._peer = new TabbedContainer(this._dock.get_pane_body('tc_peer'), peer_options);
            this._peer._main = this;
            this._peer._pane_name = 'secondary';
            this._peer.render();
        }
        this._split_open = true;
        this._suppress_split -= 1;
    }

    /**
     * Moves a tab object and its content element into the target pane.
     * @param {number|null} index - Insert position in the target order; null appends. Pinned tabs go to the front.
     * @param {boolean} activate - Activate in the target; otherwise only when the target had no active tab.
     * @param {boolean} quiet - Skip the transfer list event.
     */
    _transfer(id, target, index, activate, quiet) {
        let source = this._owner(id);
        if (!source || source === target) {
            return;
        }
        let tab = source._tab(id);
        let at = source.tabs.indexOf(tab);
        source.tabs.splice(at, 1);
        let pinned_count = target.tabs.filter(item => item.pinned).length;
        let insert = index === null ? target.tabs.length : Math.min(index, target.tabs.length);
        target.tabs.splice(tab.pinned ? pinned_count : Math.max(pinned_count, insert), 0, tab);
        target._content_area.appendChild(tab.content);
        if (String(source.active_id) === String(tab.id)) {
            let next = source.tabs[at - 1] || source.tabs[0];
            source.active_id = next ? next.id : null;
        }
        source._render_bar();
        source._reselect();
        target._render_bar();
        if (activate || target.active_id === null || !target._tab(target.active_id)) {
            target._activate(activate ? tab.id : target.tabs[0].id);
        } else {
            target._reselect();
        }
        if (!quiet) {
            target._emit_list('transfer', tab.id);
        }
    }

    /**
     * Closes the split when a pane became empty, otherwise reports the new split state.
     */
    _after_pane_change() {
        if (!this._split_open) {
            return;
        }
        if (!this.tabs.length || !this._peer.tabs.length) {
            this.close_split();
        } else {
            this._emit_split();
        }
    }
    // #endregion split_view

    // #region drag_and_drop
    /**
     * Returns the active drag when it comes from this container family, else null.
     */
    _accepted_drag() {
        let drag = TabbedContainer._drag;
        return drag && drag.source._main === this._main ? drag : null;
    }

    /**
     * Wires HTML5 drag handlers on a tab button; only regular tabs drag or accept drops.
     */
    _wire_drag(btn, tab) {
        let movable = this._kind(tab) === 'regular';
        btn.addEventListener('dragstart', event => {
            if (!movable) {
                event.preventDefault();
                return;
            }
            TabbedContainer._drag = { source: this, id: tab.id };
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', String(tab.id));
            btn.classList.add('tc_dragging');
        });
        btn.addEventListener('dragend', () => {
            btn.classList.remove('tc_dragging');
            TabbedContainer._drag = null;
        });
        btn.addEventListener('dragover', event => {
            let drag = this._accepted_drag();
            if (movable && drag && String(drag.id) !== String(tab.id)) {
                event.preventDefault();
                btn.classList.add('tc_drop_target');
            }
        });
        btn.addEventListener('dragleave', () => btn.classList.remove('tc_drop_target'));
        btn.addEventListener('drop', event => {
            btn.classList.remove('tc_drop_target');
            let drag = this._accepted_drag();
            if (!movable || !drag || String(drag.id) === String(tab.id)) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            this._drop(drag, this.tabs.indexOf(tab));
        });
    }

    /**
     * Accepts drags over empty tab bar space.
     */
    _on_bar_drag_over(event) {
        if (!event.target.closest('.tc_tab') && this._accepted_drag()) {
            event.preventDefault();
        }
    }

    /**
     * Drops on empty bar space: moves to the end of this pane.
     */
    _on_bar_drop(event) {
        let drag = this._accepted_drag();
        if (event.target.closest('.tc_tab') || !drag) {
            return;
        }
        event.preventDefault();
        this._drop(drag, null);
    }

    /**
     * Reorders within this pane or transfers from the other pane to an index (null for the end).
     */
    _drop(drag, index) {
        TabbedContainer._drag = null;
        if (drag.source === this) {
            this.move_tab(drag.id, index === null ? this.tabs.length - 1 : index);
            return;
        }
        if (!this._main._split_open) {
            return;
        }
        this._main._transfer(drag.id, this, index, true, false);
        this._main._after_pane_change();
    }

    /**
     * Turns the dominant wheel axis into horizontal scrolling of the tab strip.
     */
    _on_wheel(event) {
        let delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        if (delta) {
            event.preventDefault();
            this._scroll_zone.scrollLeft += delta;
        }
    }
    // #endregion drag_and_drop

    // #region context_menu
    /**
     * Opens the tab menu on a right-clicked tab; empty bar space keeps the browser menu.
     */
    _on_context_menu(event) {
        let btn = event.target.closest('.tc_tab');
        let tab = btn ? this._tab(btn.getAttribute('data-tab_id')) : null;
        if (!tab || !window.ContextMenu) {
            return;
        }
        event.preventDefault();
        if (!this._menu) {
            this._menu = new ContextMenu(document.createElement('div'));
        }
        this._menu.set_items(this._menu_items(tab));
        this._menu.show(event.pageX, event.pageY);
    }

    /**
     * Builds fast travel, split and host menu items for a tab.
     */
    _menu_items(tab) {
        let main = this._main;
        let items = [];
        let travel = this.tabs.filter(item => !item.exclude_from_fast_travel).map(item => {
            let active = String(item.id) === String(this.active_id);
            return {
                label: item.label,
                icon: active ? TabbedContainer.ICONS.check : item.icon,
                disabled: active,
                action: () => this.switch_tab(item.id)
            };
        });
        items.push({ label: 'Fast travel to tab', submenu: travel, disabled: !travel.length });
        if (main.options.allow_split && window.DockWorkspace) {
            let locked = this._kind(tab) === 'locked';
            items.push({ type: 'separator' });
            if (!main._split_open) {
                items.push({
                    label: 'Split view',
                    disabled: locked || this.tabs.length < 2,
                    submenu: [
                        { label: 'Split horizontal (side by side)', action: () => this._confirm_unpin(tab, () => main.split_tab(tab.id, 'horizontal')) },
                        { label: 'Split vertical (stacked)', action: () => this._confirm_unpin(tab, () => main.split_tab(tab.id, 'vertical')) }
                    ]
                });
            } else {
                items.push({ label: 'Move to other pane', disabled: locked, action: () => this._confirm_unpin(tab, () => main.move_to_other_pane(tab.id)) });
                items.push({ label: 'Close split', action: () => main.close_split() });
            }
        }
        let extra = main._extra_items(tab.id);
        if (extra.length) {
            items.push({ type: 'separator' });
            items = items.concat(extra);
        }
        return items;
    }

    /**
     * Resolves extra_context_menu_items (array or function); errors and non-arrays give [].
     */
    _extra_items(id) {
        let source = this.options.extra_context_menu_items;
        let result = source;
        if (typeof source === 'function') {
            try {
                result = source(id);
            } catch (error) {
                console.warn('[tabbed_container] extra_menu_items_failed', error);
                result = [];
            }
        }
        return Array.isArray(result) ? result : [];
    }

    /**
     * Runs a move directly, or for a pinned tab asks via UserPrompt to unpin first.
     */
    _confirm_unpin(tab, run) {
        if (!tab.pinned) {
            run();
            return;
        }
        if (!window.UserPrompt) {
            return;
        }
        UserPrompt.ask({
            title: 'Pinned tab',
            text: 'The tab "' + TabbedContainer.escape_html(tab.label) + '" is pinned. Unpin it in order to move it?',
            options: { 'Yes, unpin and move': true, 'No': false },
            default_value: false
        }).then(answer => {
            if (answer === true) {
                this.set_pinned(tab.id, false);
                run();
            }
        });
    }
    // #endregion context_menu

    // #region registry
    /**
     * Builds a demo instance for the widget registry; the first tab's content is the content container.
     */
    static build_for_registry(host, options) {
        if (options.width > 0) {
            host.style.width = options.width + 'px';
        }
        if (options.height > 0) {
            host.style.height = options.height + 'px';
        }
        let container = new TabbedContainer(host, {
            id: options.id || null,
            allow_pin: options.allow_pin,
            max_pinned: options.max_pinned > 0 ? options.max_pinned : null,
            max_label_chars: options.max_label_chars > 0 ? options.max_label_chars : null,
            allow_split: options.allow_split
        }).render();
        let first_id = null;
        for (let spec of (Array.isArray(options.tabs) ? options.tabs : [])) {
            if (!spec || spec.id === undefined || spec.id === null) {
                continue;
            }
            container.create_tab(spec.id, spec.label, spec);
            let content = container.get_content_div(spec.id);
            if (content) {
                content.setAttribute('data-tc_placeholder', (spec.label || spec.id) + ' content');
                first_id = first_id === null ? spec.id : first_id;
            }
        }
        return { instance: container, content_container: first_id === null ? null : container.get_content_div(first_id) };
    }
    // #endregion registry
}

window.TabbedContainer = TabbedContainer;
if (window.WidgetRegistry) {
    WidgetRegistry.register('tabbed_container', {
        label: 'Tabbed Container',
        category: 'containers',
        container: true,
        options: [
            {
                name: 'tabs',
                type: 'json',
                default: [
                    { id: 'overview', label: 'Overview' },
                    { id: 'details', label: 'Details' },
                    { id: 'settings', label: 'Settings', always_last: true }
                ]
            },
            { name: 'id', type: 'string', default: '' },
            { name: 'allow_pin', type: 'bool', default: true },
            { name: 'max_pinned', type: 'number', default: 0 },
            { name: 'max_label_chars', type: 'number', default: 0 },
            { name: 'allow_split', type: 'bool', default: true },
            { name: 'width', type: 'number', default: 520 },
            { name: 'height', type: 'number', default: 260 }
        ],
        build: (host, options) => TabbedContainer.build_for_registry(host, options)
    });
}
