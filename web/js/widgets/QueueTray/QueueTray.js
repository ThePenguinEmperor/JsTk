/**
 * QueueTray: horizontal task queue strip built as the queue-tray custom element plus a QueueTray wrapper.
 * set_items reconciles the full queue state with existing chips, keeping scroll and bundle state.
 * Exposes window.QueueTray, window.QueueTrayElement and window.queue_update(tasks).
 */

// #region queue_tray_element
/**
 * Custom element queue-tray: shadow DOM tray with chips, bundles, drag reorder and a minimized tag.
 */
class QueueTrayElement extends HTMLElement {
    static _css_href = QueueTrayElement.find_css_href();
    static ICONS = {
        minus: '<svg viewBox="0 0 16 16" width="10" height="10" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M3 8h10"/></svg>',
        left: '<svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3L5 8l5 5"/></svg>',
        right: '<svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3l5 5-5 5"/></svg>',
        expand: '<svg viewBox="0 0 16 16" width="9" height="9" fill="currentColor"><path d="M5 3l7 5-7 5z"/></svg>'
    };

    /**
     * Builds the shadow DOM immediately so the element works before it is connected.
     */
    constructor() {
        super();
        this._hooks = { on_item_activate: null, on_item_cancel: null, on_reorder: null, host_bridge: null };
        this._order = [];
        this._minimized = false;
        this._drag_id = null;
        this._build_shadow();
        setTimeout(() => this.update_arrow_visibility(), 60);
    }

    // #region setup
    /**
     * Returns the stylesheet URL next to this script, or the default project path.
     */
    static find_css_href() {
        let src = document.currentScript ? document.currentScript.src : '';
        if (/\/QueueTray\.js(\?.*)?$/.test(src)) {
            return src.replace(/\.js(\?.*)?$/, '.css');
        }
        return 'web/js/widgets/QueueTray/QueueTray.css';
    }

    /**
     * Creates the container, minimize button, arrows, list, counter and minimized tag.
     */
    _build_shadow() {
        let shadow = this.attachShadow({ mode: 'open' });
        let link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = QueueTrayElement._css_href;
        let make = (tag, class_name, html) => {
            let el = document.createElement(tag);
            el.className = class_name;
            el.innerHTML = html || '';
            return el;
        };
        this._container = make('div', 'qt_container');
        this._container.tabIndex = 0;
        this._min_btn = make('button', 'qt_min_btn', QueueTrayElement.ICONS.minus);
        this._min_btn.title = 'Minimize';
        this._left_btn = make('button', 'qt_arrow qt_arrow_left', QueueTrayElement.ICONS.left);
        this._right_btn = make('button', 'qt_arrow qt_arrow_right', QueueTrayElement.ICONS.right);
        this._list = make('div', 'qt_list');
        this._counter = make('span', 'qt_counter');
        this._tag = make('span', 'qt_min_tag');
        this._indicator = make('div', 'qt_drop_indicator');
        this._container.append(this._min_btn, this._left_btn, this._list, this._right_btn, this._counter, this._tag);
        shadow.append(link, this._container);
        this._min_btn.addEventListener('click', () => this.toggle_minimize());
        this._tag.addEventListener('click', () => this.toggle_minimize());
        this._left_btn.addEventListener('click', () => this.scroll_left());
        this._right_btn.addEventListener('click', () => this.scroll_right());
        this._list.addEventListener('scroll', () => this.update_arrow_visibility());
        this._list.addEventListener('wheel', event => this._on_wheel(event), { passive: false });
        this._list.addEventListener('dragover', event => this._on_drag_over(event));
        this._list.addEventListener('drop', event => this._on_drop(event));
        this._container.addEventListener('keydown', event => this._on_key_down(event));
        if (window.ResizeObserver) {
            new ResizeObserver(() => this.update_arrow_visibility()).observe(this._list);
        }
        this._refresh_state();
    }

    /**
     * Shallow-merges hook functions into the configuration; unset hooks keep their value.
     * Keys: on_item_activate(id), on_item_cancel(id), on_reorder(ids), host_bridge (optional object with
     * remove_queue_item(id) -> Promise<{ success, tasks }> and reorder_queue(ids)).
     */
    configure(cfg) {
        Object.assign(this._hooks, cfg || {});
    }
    // #endregion setup

    // #region reconcile
    /**
     * Reconciles the tray with the full queue state; chips are reused by id and moved, not recreated.
     */
    set_items(items_array) {
        let items = Array.isArray(items_array) ? items_array : [];
        this._order = this._reconcile(this._order, items, true);
        this.render_children();
    }

    /**
     * Matches entries by string id, updates or creates them and removes the missing ones.
     * @returns {Array} The new entry list in the order of items.
     */
    _reconcile(entries, items, top_level) {
        let known = new Map(entries.map(entry => [String(entry.id), entry]));
        let next = [];
        for (let item of items) {
            if (!item || item.id === undefined || item.id === null || known.get(String(item.id)) === 'used') {
                continue;
            }
            let is_bundle = top_level && item.type === 'bundle';
            let entry = known.get(String(item.id));
            if (entry && entry.is_bundle !== is_bundle) {
                entry.el.remove();
                entry = null;
            }
            entry = entry || this._create_entry(item, is_bundle, top_level);
            known.set(String(item.id), 'used');
            this._update_entry(entry, item);
            next.push(entry);
        }
        for (let entry of known.values()) {
            if (entry !== 'used') {
                entry.el.remove();
            }
        }
        return next;
    }

    /**
     * Creates the DOM for a simple chip or a bundle (header chip plus children row).
     */
    _create_entry(item, is_bundle, top_level) {
        let entry = { id: item.id, is_bundle: is_bundle, expanded: false, children: [], tooltip_key: null };
        entry.chip = this._create_chip(entry, is_bundle);
        if (!is_bundle) {
            entry.el = entry.chip;
        } else {
            entry.el = document.createElement('div');
            entry.el.className = 'qt_bundle';
            entry.children_el = document.createElement('div');
            entry.children_el.className = 'qt_bundle_children';
            entry.el.append(entry.chip, entry.children_el);
        }
        if (top_level) {
            entry.el.classList.add('qt_top');
            entry.el.addEventListener('dragstart', event => this._on_drag_start(event, entry));
            entry.el.addEventListener('dragend', () => this._on_drag_end());
        }
        entry.el.setAttribute('data-id', String(item.id));
        return entry;
    }

    /**
     * Builds a chip with a label and, for simple items, a cancel button and double click activation.
     */
    _create_chip(entry, is_bundle) {
        let chip = document.createElement('div');
        chip.className = is_bundle ? 'qt_chip qt_bundle_header' : 'qt_chip';
        entry.label_el = document.createElement('span');
        entry.label_el.className = 'qt_chip_label';
        if (is_bundle) {
            let toggle = document.createElement('span');
            toggle.className = 'qt_toggle';
            toggle.innerHTML = QueueTrayElement.ICONS.expand;
            toggle.addEventListener('click', event => {
                event.stopPropagation();
                entry.expanded = !entry.expanded;
                this._paint_bundle(entry);
            });
            chip.appendChild(toggle);
            chip.appendChild(entry.label_el);
            return chip;
        }
        let cancel = document.createElement('span');
        cancel.className = 'qt_cancel';
        cancel.textContent = 'x';
        cancel.title = 'Cancel';
        cancel.addEventListener('click', event => {
            event.stopPropagation();
            if (chip.classList.contains('qt_cancellable')) {
                this.handle_cancel(entry.id);
            }
        });
        chip.addEventListener('dblclick', () => {
            if (typeof this._hooks.on_item_activate === 'function') {
                this._hooks.on_item_activate(entry.id);
            }
        });
        chip.append(entry.label_el, cancel);
        return chip;
    }

    /**
     * Copies item fields onto an entry and refreshes its chip; tooltips rebuild only on relevant changes.
     */
    _update_entry(entry, item) {
        entry.id = item.id;
        entry.title = String(item.title === undefined || item.title === null ? '' : item.title);
        entry.type = item.type || 'item';
        entry.status = item.status || 'idle';
        entry.show_cancel = item.show_cancel !== false;
        entry.description = item.description || '';
        entry.action = item.action && typeof item.action === 'object' ? item.action : {};
        entry.child_cancel = !!item.child_cancel;
        entry.el.setAttribute('data-type', entry.type);
        if (entry.is_bundle) {
            entry.children = this._reconcile(entry.children, Array.isArray(item.items) ? item.items : [], false);
            for (let child of entry.children) {
                entry.children_el.appendChild(child.el);
            }
        }
        let running = entry.status === 'running' || entry.children.some(child => child.status === 'running');
        entry.chip.classList.toggle('qt_running', running);
        entry.chip.classList.toggle('qt_scheduled', !running && entry.status === 'scheduled');
        let key = JSON.stringify([entry.title, entry.description, entry.action, entry.children.length]);
        if (key !== entry.tooltip_key) {
            entry.tooltip_key = key;
            entry.chip.title = this._tooltip(entry);
        }
        if (entry.is_bundle) {
            this._paint_bundle(entry);
        } else {
            entry.label_el.textContent = QueueTrayElement.truncate(entry.title);
        }
    }

    /**
     * Returns the chip tooltip text for an item or a bundle.
     */
    _tooltip(entry) {
        if (entry.is_bundle) {
            return 'Bundle: ' + entry.title + ' (' + entry.children.length + ' items)';
        }
        let lines = ['Title: ' + entry.title];
        if (entry.description) {
            lines.push('Note: ' + entry.description);
        }
        for (let [key, value] of Object.entries(entry.action)) {
            lines.push(key + ': ' + (typeof value === 'object' ? JSON.stringify(value) : value));
        }
        return lines.join('\n');
    }

    /**
     * Applies a bundle's expanded state to its label, toggle and children row.
     */
    _paint_bundle(entry) {
        let title = QueueTrayElement.truncate(entry.title);
        entry.label_el.textContent = entry.expanded ? title : title + ' (' + entry.children.length + ')';
        entry.el.classList.toggle('qt_expanded', entry.expanded);
        this.update_arrow_visibility();
    }

    /**
     * Shortens a title to 15 characters plus '...'.
     */
    static truncate(title) {
        return title.length > 15 ? title.slice(0, 15) + '...' : title;
    }
    // #endregion reconcile

    // #region rendering
    /**
     * Re-syncs DOM order with the internal order and keeps the left-edge chip in view.
     */
    render_children() {
        let old_left = this._list.scrollLeft;
        let anchor = null;
        if (old_left > 0) {
            anchor = this._order.find(entry => entry.el.offsetLeft + entry.el.offsetWidth > old_left) || null;
        }
        for (let entry of this._order) {
            this._list.appendChild(entry.el);
        }
        this._refresh_state();
        if (anchor && anchor.el.parentNode === this._list) {
            this._list.scrollLeft = anchor.el.offsetLeft;
        } else {
            this._list.scrollLeft = Math.min(old_left, Math.max(0, this._list.scrollWidth - this._list.clientWidth));
        }
        this.update_arrow_visibility();
    }

    /**
     * Refreshes first-item locks, cancel and drag permissions, counter, minimized tag and visibility.
     */
    _refresh_state() {
        this._order.forEach((entry, index) => {
            let first = index === 0;
            entry.el.classList.toggle('qt_first', first);
            entry.el.draggable = !first && entry.status !== 'scheduled';
            if (!entry.is_bundle) {
                entry.chip.classList.toggle('qt_cancellable', entry.show_cancel && !first);
                return;
            }
            entry.children.forEach((child, child_index) => {
                child.chip.classList.toggle('qt_cancellable', child.show_cancel && !(first && child_index === 0));
            });
        });
        let count = this._leaf_count();
        this._counter.textContent = count + (count === 1 ? ' item' : ' items');
        this._tag.textContent = this._order.length ? count + (count === 1 ? ' task' : ' tasks') : 'Tray is empty';
        this._tag.title = this._minimized_tooltip();
        this._container.classList.toggle('qt_empty', !this._order.length);
        this._container.classList.toggle('qt_minimized', this._minimized);
    }

    /**
     * Counts leaf items: a bundle counts its children, a simple item counts 1.
     */
    _leaf_count() {
        let count = 0;
        for (let entry of this._order) {
            count += entry.is_bundle ? entry.children.length : 1;
        }
        return count;
    }

    /**
     * Lists up to 5 top-level entries for the minimized tag tooltip.
     */
    _minimized_tooltip() {
        if (!this._order.length) {
            return 'No items in queue';
        }
        let lines = this._order.slice(0, 5).map(entry => (
            entry.is_bundle ? entry.title + ' (' + entry.children.length + ' items)' : entry.title
        ));
        if (this._order.length > 5) {
            lines.push('... ' + (this._order.length - 5) + ' more items');
        }
        return lines.join('\n');
    }

    /**
     * Hides the left arrow at the start, the right arrow at the end, both when content fits.
     */
    update_arrow_visibility() {
        let max = this._list.scrollWidth - this._list.clientWidth;
        let left = this._list.scrollLeft;
        this._left_btn.classList.toggle('qt_hidden', max <= 1 || left <= 1);
        this._right_btn.classList.toggle('qt_hidden', max <= 1 || left >= max - 1);
    }
    // #endregion rendering

    // #region public_api
    /**
     * Cancel flow: on_item_cancel hook, else host_bridge.remove_queue_item, else local removal.
     */
    handle_cancel(id) {
        let hooks = this._hooks;
        if (typeof hooks.on_item_cancel === 'function') {
            hooks.on_item_cancel(id);
            return;
        }
        if (hooks.host_bridge && typeof hooks.host_bridge.remove_queue_item === 'function') {
            Promise.resolve(hooks.host_bridge.remove_queue_item(id)).then(result => {
                if (result && result.success && Array.isArray(result.tasks)) {
                    this.set_items(result.tasks);
                }
            }, error => console.error('[queue_tray] remove_queue_item_failed: ' + id, error));
            return;
        }
        this._remove_local(id);
    }

    /**
     * Removes a top-level entry or a bundle child by id and re-renders.
     */
    _remove_local(id) {
        let key = String(id);
        let index = this._order.findIndex(entry => String(entry.id) === key);
        if (index >= 0) {
            this.remove_item(index);
            return;
        }
        for (let bundle of this._order.filter(entry => entry.is_bundle)) {
            let child = bundle.children.find(entry => String(entry.id) === key);
            if (child) {
                bundle.children.splice(bundle.children.indexOf(child), 1);
                child.el.remove();
                bundle.tooltip_key = null;
                bundle.chip.title = this._tooltip(bundle);
                this._paint_bundle(bundle);
                this.render_children();
                return;
            }
        }
    }

    /**
     * Removes the first top-level item locally without notifying any hook.
     */
    remove_first_item() {
        this.remove_item(0);
    }

    /**
     * Removes the top-level item at index locally; out of range indexes are ignored.
     */
    remove_item(index) {
        if (!Number.isInteger(index) || index < 0 || index >= this._order.length) {
            return;
        }
        let entry = this._order.splice(index, 1)[0];
        entry.el.remove();
        this.render_children();
    }

    /**
     * Smoothly scrolls the list 200 px to the left.
     */
    scroll_left() {
        this._list.scrollBy({ left: -200, behavior: 'smooth' });
    }

    /**
     * Smoothly scrolls the list 200 px to the right.
     */
    scroll_right() {
        this._list.scrollBy({ left: 200, behavior: 'smooth' });
    }

    /**
     * Flips between minimized and visible.
     */
    toggle_minimize() {
        this._minimized = !this._minimized;
        this._refresh_state();
        this.update_arrow_visibility();
    }

    /**
     * Forces the minimized state.
     */
    minimize() {
        this._minimized = true;
        this._refresh_state();
    }
    // #endregion public_api

    // #region input
    /**
     * Turns vertical wheel movement into horizontal list scrolling.
     */
    _on_wheel(event) {
        let delta = event.deltaY || event.deltaX;
        if (delta) {
            event.preventDefault();
            this._list.scrollLeft += delta;
        }
    }

    /**
     * Left and Right arrow keys scroll the list by 200 px.
     */
    _on_key_down(event) {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            if (event.key === 'ArrowLeft') {
                this.scroll_left();
            } else {
                this.scroll_right();
            }
        }
    }

    /**
     * Starts a drag of a top-level entry and collapses all bundles for easier targeting.
     */
    _on_drag_start(event, entry) {
        if (!entry.el.draggable) {
            event.preventDefault();
            return;
        }
        this._drag_id = entry.id;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(entry.id));
        for (let bundle of this._order.filter(item => item.is_bundle && item.expanded)) {
            bundle.expanded = false;
            this._paint_bundle(bundle);
        }
    }

    /**
     * Returns the drop target index for an event, or -1 when the position is not a valid target.
     * Targets exclude the first position, the dragged entry and anything at or after the first scheduled item.
     */
    _target_index(event) {
        let el = event.target.closest ? event.target.closest('.qt_top') : null;
        let index = el ? this._order.findIndex(entry => entry.el === el) : -1;
        let scheduled = this._order.findIndex(entry => entry.status === 'scheduled');
        let from = this._order.findIndex(entry => String(entry.id) === String(this._drag_id));
        if (this._drag_id === null || index <= 0 || index === from || (scheduled >= 0 && index >= scheduled)) {
            return -1;
        }
        return index;
    }

    /**
     * Shows a 3px drop indicator just left of a valid target.
     */
    _on_drag_over(event) {
        let index = this._target_index(event);
        if (index < 0) {
            this._indicator.remove();
            return;
        }
        event.preventDefault();
        this._indicator.style.left = Math.max(0, this._order[index].el.offsetLeft - 3) + 'px';
        this._list.appendChild(this._indicator);
    }

    /**
     * Moves the dragged entry before the target, then calls on_reorder, the host bridge or re-renders.
     */
    _on_drop(event) {
        let index = this._target_index(event);
        this._indicator.remove();
        if (index < 0) {
            return;
        }
        event.preventDefault();
        let from = this._order.findIndex(entry => String(entry.id) === String(this._drag_id));
        let moved = this._order.splice(from, 1)[0];
        this._order.splice(from < index ? index - 1 : index, 0, moved);
        let ids = this._order.map(entry => entry.id);
        let bridge = this._hooks.host_bridge;
        if (typeof this._hooks.on_reorder === 'function') {
            this._hooks.on_reorder(ids.slice());
        } else if (bridge && typeof bridge.reorder_queue === 'function') {
            bridge.reorder_queue(ids.slice());
        }
        this.render_children();
    }

    /**
     * Removes the indicator and re-renders after a drag.
     */
    _on_drag_end() {
        this._indicator.remove();
        if (this._drag_id !== null) {
            this._drag_id = null;
            this.render_children();
        }
    }
    // #endregion input
}
// #endregion queue_tray_element

// #region queue_tray_wrapper
/**
 * QueueTray: thin wrapper that creates a detached queue-tray element and forwards calls to it.
 */
class QueueTray {
    /**
     * Creates the element; non-empty options are passed to configure().
     */
    constructor(options = {}) {
        this._element = document.createElement('queue-tray');
        if (options && Object.keys(options).length) {
            this._element.configure(options);
        }
    }

    /**
     * Returns the queue-tray element; the caller appends it.
     */
    render() {
        return this._element;
    }

    /**
     * Reconciles the tray with the full queue state.
     */
    set_items(items) {
        this._element.set_items(items);
    }

    /**
     * Removes the first top-level item locally.
     */
    remove_first_item() {
        this._element.remove_first_item();
    }

    /**
     * Removes the top-level item at index locally.
     */
    remove_item(index) {
        this._element.remove_item(index);
    }

    /**
     * Forces the minimized state.
     */
    minimize() {
        this._element.minimize();
    }

    /**
     * Applies a preset name or CSS variable object to the element; inherited by the shadow tree.
     */
    set_theme(theme) {
        if (window.ThemeManager && ThemeManager.resolve(theme)) {
            ThemeManager.apply(this._element, theme);
        }
    }
}
// #endregion queue_tray_wrapper

if (!customElements.get('queue-tray')) {
    customElements.define('queue-tray', QueueTrayElement);
}
window.QueueTrayElement = QueueTrayElement;
window.QueueTray = QueueTray;
window.queue_update = tasks => {
    let tray = document.querySelector('queue-tray');
    if (tray) {
        tray.set_items(tasks);
    }
};
if (window.WidgetRegistry) {
    WidgetRegistry.register('queue_tray', {
        label: 'Queue Tray',
        category: 'display',
        container: false,
        options: [
            {
                name: 'items',
                type: 'json',
                default: [
                    { id: 1, title: 'Build firmware image', status: 'running', description: 'Nightly build', action: { target: 'release' } },
                    { id: 2, title: 'Run smoke tests' },
                    { id: 3, title: 'Regression bundle', type: 'bundle', items: [
                        { id: 31, title: 'Boot test' },
                        { id: 32, title: 'Memory stress test' }
                    ] },
                    { id: 4, title: 'Upload results' },
                    { id: 5, title: 'Weekly report', status: 'scheduled' }
                ]
            },
            { name: 'minimized', type: 'bool', default: false }
        ],
        build: (host, options) => {
            let tray = new QueueTray();
            host.appendChild(tray.render());
            tray.set_items(Array.isArray(options.items) ? options.items : []);
            if (options.minimized) {
                tray.minimize();
            }
            return tray;
        }
    });
}
