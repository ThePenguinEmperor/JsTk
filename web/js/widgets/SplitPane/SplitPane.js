/**
 * SplitPane: resizable two-pane layout with a draggable, keyboard and touch friendly divider.
 * One primary pane owns a pixel size; the other pane takes the remaining space.
 */
class SplitPane {
    static _style_ready = false;
    static _css_href = SplitPane.find_css_href();

    /**
     * Reads options and any stored state; the DOM is built by render().
     * @param {HTMLElement|null} container - Mount element, or null to append .element manually.
     */
    constructor(container, options = {}) {
        let opts = options || {};
        let pick = (value, fallback) => (typeof value === 'number' ? value : fallback);
        this.container = container || null;
        this.orientation = opts.orientation === 'vertical' ? 'vertical' : 'horizontal';
        this.primary = opts.primary === 'last' ? 'last' : 'first';
        this.min_size = pick(opts.min_size, 80);
        this.max_size = pick(opts.max_size, 800);
        this.handle_size = pick(opts.handle_size, 6);
        this.keyboard_step = pick(opts.keyboard_step, 16);
        this.collapsible = opts.collapsible !== false;
        this.storage_key = opts.storage_key || null;
        this.on_resize = typeof opts.on_resize === 'function' ? opts.on_resize : null;
        this.on_collapse = typeof opts.on_collapse === 'function' ? opts.on_collapse : null;
        this._size = pick(opts.size, 240);
        this._collapsed = !!opts.collapsed;
        this._theme = null;
        this._root = null;
        this._pane_a = null;
        this._pane_b = null;
        this._handle = null;
        this._drag = null;
        this._frame = 0;
        SplitPane.ensure_style();
        this._load_state();
        this._size = this._clamp(this._size);
    }

    // #region styles
    /**
     * Returns the stylesheet URL next to this script, or the default project path.
     */
    static find_css_href() {
        let src = document.currentScript ? document.currentScript.src : '';
        if (/\/SplitPane\.js(\?.*)?$/.test(src)) {
            return src.replace(/\.js(\?.*)?$/, '.css');
        }
        return 'web/js/widgets/SplitPane/SplitPane.css';
    }

    /**
     * Adds the widget stylesheet link to the document head once per page.
     */
    static ensure_style() {
        if (SplitPane._style_ready || document.getElementById('sp_style')) {
            SplitPane._style_ready = true;
            return;
        }
        let link = document.createElement('link');
        link.id = 'sp_style';
        link.rel = 'stylesheet';
        link.href = SplitPane._css_href;
        document.head.appendChild(link);
        SplitPane._style_ready = true;
    }
    // #endregion styles

    // #region properties
    /**
     * First pane (left or top), null before render.
     */
    get pane_a() {
        return this._pane_a;
    }

    /**
     * Second pane (right or bottom), null before render.
     */
    get pane_b() {
        return this._pane_b;
    }

    /**
     * The pane that owns the pixel size.
     */
    get primary_pane() {
        return this.primary === 'last' ? this._pane_b : this._pane_a;
    }

    /**
     * True while the primary pane is collapsed.
     */
    get is_collapsed() {
        return this._collapsed;
    }

    /**
     * Root element, null before render.
     */
    get element() {
        return this._root;
    }
    // #endregion properties

    // #region public_api
    /**
     * Builds the DOM once and mounts it; later calls do nothing.
     */
    render() {
        if (this._root) {
            return this;
        }
        let horizontal = this.orientation === 'horizontal';
        this._root = document.createElement('div');
        this._root.className = 'sp_root sp_' + this.orientation;
        this._pane_a = document.createElement('div');
        this._pane_b = document.createElement('div');
        this._pane_a.className = 'sp_pane sp_pane_a';
        this._pane_b.className = 'sp_pane sp_pane_b';
        this.primary_pane.classList.add('sp_primary');
        this._handle = document.createElement('div');
        this._handle.className = 'sp_handle';
        this._handle.tabIndex = 0;
        this._handle.setAttribute('role', 'separator');
        this._handle.setAttribute('aria-orientation', horizontal ? 'vertical' : 'horizontal');
        this._handle.setAttribute('aria-valuemin', String(this.min_size));
        this._handle.setAttribute('aria-valuemax', String(this.max_size));
        this._root.append(this._pane_a, this._handle, this._pane_b);
        this._handle.addEventListener('pointerdown', this._on_pointer_down.bind(this));
        this._handle.addEventListener('pointermove', this._on_pointer_move.bind(this));
        this._handle.addEventListener('pointerup', this._on_pointer_end.bind(this));
        this._handle.addEventListener('pointercancel', this._on_pointer_end.bind(this));
        this._handle.addEventListener('dblclick', this._on_double_click.bind(this));
        this._handle.addEventListener('keydown', this._on_key_down.bind(this));
        if (this._theme) {
            ThemeManager.apply(this._root, this._theme);
        }
        this._apply_layout();
        if (this.container) {
            this.container.appendChild(this._root);
        }
        return this;
    }

    /**
     * Clamps and applies a new primary size, persists it and fires on_resize; keeps the collapsed flag.
     */
    set_size(px) {
        this._size = this._clamp(px);
        this._apply_layout();
        this._save_state();
        this._fire_resize();
        return this;
    }

    /**
     * Returns the remembered primary size in px, also while collapsed.
     */
    get_size() {
        return this._size;
    }

    /**
     * Collapses the primary pane to zero; no-op when already collapsed or not collapsible.
     */
    collapse() {
        if (!this._collapsed && this.collapsible) {
            this._set_collapsed(true);
        }
        return this;
    }

    /**
     * Restores the remembered size; works even when not collapsible.
     */
    expand() {
        if (this._collapsed) {
            this._set_collapsed(false);
        }
        return this;
    }

    /**
     * Flips the collapsed state under the collapse and expand rules.
     */
    toggle() {
        if (this._collapsed) {
            return this.expand();
        }
        return this.collapse();
    }

    /**
     * Applies a preset name or CSS variable object to the root; held until render when called early.
     */
    set_theme(theme) {
        if (!window.ThemeManager || !ThemeManager.resolve(theme)) {
            return;
        }
        this._theme = theme;
        if (this._root) {
            ThemeManager.apply(this._root, theme);
        }
    }
    // #endregion public_api

    // #region layout
    /**
     * Converts to a number and clamps to [min_size, max_size]; non-finite values become min_size.
     */
    _clamp(px) {
        let value = Number(px);
        if (!isFinite(value)) {
            return this.min_size;
        }
        return Math.min(this.max_size, Math.max(this.min_size, value));
    }

    /**
     * Writes grid tracks, collapsed class and ARIA value for the current state.
     */
    _apply_layout() {
        if (!this._root) {
            return;
        }
        let size = this._collapsed ? 0 : this._size;
        let tracks = [size + 'px', this.handle_size + 'px', 'minmax(0, 1fr)'];
        if (this.primary === 'last') {
            tracks.reverse();
        }
        let template = tracks.join(' ');
        this._root.style.gridTemplateColumns = this.orientation === 'horizontal' ? template : '';
        this._root.style.gridTemplateRows = this.orientation === 'vertical' ? template : '';
        this._root.classList.toggle('sp_collapsed', this._collapsed);
        this._handle.setAttribute('aria-valuenow', String(size));
    }

    /**
     * Sets the collapsed flag, re-lays out, persists and fires on_collapse.
     */
    _set_collapsed(collapsed) {
        this._collapsed = collapsed;
        this._apply_layout();
        this._save_state();
        if (this.on_collapse) {
            this.on_collapse(this._collapsed, this);
        }
    }

    /**
     * Calls on_resize with the remembered size when configured.
     */
    _fire_resize() {
        if (this.on_resize) {
            this.on_resize(this._size, this);
        }
    }
    // #endregion layout

    // #region interaction
    /**
     * Returns the pointer coordinate along the main axis.
     */
    _axis(event) {
        return this.orientation === 'horizontal' ? event.clientX : event.clientY;
    }

    /**
     * Starts a drag and captures the pointer.
     */
    _on_pointer_down(event) {
        if (event.pointerType === 'mouse' && event.button !== 0) {
            return;
        }
        event.preventDefault();
        this._drag = { start: this._axis(event), size: this._size };
        this._root.classList.add('sp_dragging');
        try {
            this._handle.setPointerCapture(event.pointerId);
        } catch (error) {
        }
    }

    /**
     * Updates the size from the pointer delta; layout writes run at most once per frame.
     * A drag reopens a collapsed pane without firing on_collapse.
     */
    _on_pointer_move(event) {
        if (!this._drag) {
            return;
        }
        let delta = this._axis(event) - this._drag.start;
        if (this.primary === 'last') {
            delta = -delta;
        }
        this._size = this._clamp(this._drag.size + delta);
        this._collapsed = false;
        if (!this._frame) {
            this._frame = requestAnimationFrame(() => {
                this._frame = 0;
                this._apply_layout();
                this._fire_resize();
            });
        }
    }

    /**
     * Ends a drag, applies the final layout, persists and fires on_resize.
     */
    _on_pointer_end(event) {
        if (!this._drag) {
            return;
        }
        this._drag = null;
        this._root.classList.remove('sp_dragging');
        try {
            this._handle.releasePointerCapture(event.pointerId);
        } catch (error) {
        }
        if (this._frame) {
            cancelAnimationFrame(this._frame);
            this._frame = 0;
        }
        this._apply_layout();
        this._save_state();
        this._fire_resize();
    }

    /**
     * Toggles collapse on double click when collapsible.
     */
    _on_double_click() {
        if (this.collapsible) {
            this.toggle();
        }
    }

    /**
     * Moves the divider by keyboard_step in the arrow direction.
     */
    _on_key_down(event) {
        let keys = this.orientation === 'horizontal'
            ? { ArrowLeft: -1, ArrowRight: 1 }
            : { ArrowUp: -1, ArrowDown: 1 };
        let direction = keys[event.key];
        if (!direction) {
            return;
        }
        event.preventDefault();
        if (this.primary === 'last') {
            direction = -direction;
        }
        this.set_size(this._size + direction * this.keyboard_step);
    }
    // #endregion interaction

    // #region persistence
    /**
     * Reads size and collapsed from localStorage; each valid field overrides the options.
     */
    _load_state() {
        if (!this.storage_key) {
            return;
        }
        try {
            let record = JSON.parse(localStorage.getItem('sp_' + this.storage_key));
            if (record && typeof record === 'object') {
                this._size = typeof record.size === 'number' ? record.size : this._size;
                this._collapsed = typeof record.collapsed === 'boolean' ? record.collapsed : this._collapsed;
            }
        } catch (error) {
        }
    }

    /**
     * Writes size and collapsed to localStorage; storage errors are ignored.
     */
    _save_state() {
        if (!this.storage_key) {
            return;
        }
        try {
            localStorage.setItem('sp_' + this.storage_key, JSON.stringify({ size: this._size, collapsed: this._collapsed }));
        } catch (error) {
        }
    }
    // #endregion persistence

    // #region registry
    /**
     * Builds a demo instance for the widget registry, sized host and labelled empty panes.
     */
    static build_for_registry(host, options) {
        if (options.width > 0) {
            host.style.width = options.width + 'px';
        }
        if (options.height > 0) {
            host.style.height = options.height + 'px';
        }
        let split = new SplitPane(host, options).render();
        split.pane_a.setAttribute('data-sp_placeholder', 'Pane A');
        split.pane_b.setAttribute('data-sp_placeholder', 'Pane B');
        return { instance: split, content_container: split.pane_a };
    }
    // #endregion registry
}

window.SplitPane = SplitPane;
if (window.WidgetRegistry) {
    WidgetRegistry.register('split_pane', {
        label: 'Split Pane',
        category: 'containers',
        container: true,
        options: [
            { name: 'orientation', type: 'select', choices: ['horizontal', 'vertical'], default: 'horizontal' },
            { name: 'primary', type: 'select', choices: ['first', 'last'], default: 'first' },
            { name: 'size', type: 'number', default: 200 },
            { name: 'min_size', type: 'number', default: 80 },
            { name: 'max_size', type: 'number', default: 800 },
            { name: 'handle_size', type: 'number', default: 6 },
            { name: 'keyboard_step', type: 'number', default: 16 },
            { name: 'collapsed', type: 'bool', default: false },
            { name: 'collapsible', type: 'bool', default: true },
            { name: 'storage_key', type: 'string', default: '' },
            { name: 'width', type: 'number', default: 520 },
            { name: 'height', type: 'number', default: 260 }
        ],
        build: (host, options) => SplitPane.build_for_registry(host, options)
    });
}
