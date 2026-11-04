/**
 * DockWorkspace: two-pane split container with an always shown primary pane and an optional secondary pane.
 * Pane bodies are reused across rebuilds, so host content survives show, hide, swap and re-layout.
 */
class DockWorkspace {
    static _style_ready = false;
    static _css_href = DockWorkspace.find_css_href();

    /**
     * Reads options; the DOM is built by render().
     * @param {HTMLElement|null} parent - Mount element; when falsy the host attaches .element itself.
     */
    constructor(parent, options = {}) {
        let opts = options || {};
        let pick = (value, fallback) => (typeof value === 'number' ? value : fallback);
        this.parent = parent || null;
        this.primary_id = opts.primary_id || 'log';
        this.secondary_id = opts.secondary_id || 'python';
        this.panes = {};
        this.min_split = pick(opts.min_split, 15);
        this.max_split = pick(opts.max_split, 85);
        this.orientation = opts.orientation === 'vertical' ? 'vertical' : 'horizontal';
        this.show_headers = opts.show_headers !== false;
        this.on_secondary_toggle = typeof opts.on_secondary_toggle === 'function' ? opts.on_secondary_toggle : null;
        this.on_layout_change = typeof opts.on_layout_change === 'function' ? opts.on_layout_change : null;
        this._split = pick(opts.default_split, 50);
        this._secondary_visible = false;
        this._order = [this.primary_id, this.secondary_id];
        this._bodies = {};
        this._pane_els = [];
        this._root = null;
        this._theme = null;
        this._drag = null;
        this._frame = 0;
        for (let id of this._order) {
            let meta = (opts.panes && opts.panes[id]) || {};
            this.panes[id] = { title: meta.title || id, icon: meta.icon || '' };
        }
    }

    // #region styles
    /**
     * Returns the stylesheet URL next to this script, or the default project path.
     */
    static find_css_href() {
        let src = document.currentScript ? document.currentScript.src : '';
        if (/\/DockWorkspace\.js(\?.*)?$/.test(src)) {
            return src.replace(/\.js(\?.*)?$/, '.css');
        }
        return 'web/js/widgets/DockWorkspace/DockWorkspace.css';
    }

    /**
     * Adds the widget stylesheet (id dock_workspace_css) to the head once per page.
     */
    static ensure_style() {
        if (DockWorkspace._style_ready || document.getElementById('dock_workspace_css')) {
            DockWorkspace._style_ready = true;
            return;
        }
        let link = document.createElement('link');
        link.id = 'dock_workspace_css';
        link.rel = 'stylesheet';
        link.href = DockWorkspace._css_href;
        document.head.appendChild(link);
        DockWorkspace._style_ready = true;
    }
    // #endregion styles

    // #region public_api
    /**
     * Root element, null before render.
     */
    get element() {
        return this._root;
    }

    /**
     * Builds the DOM once and mounts it; later calls do nothing.
     */
    render() {
        if (this._root) {
            return this;
        }
        DockWorkspace.ensure_style();
        this._root = document.createElement('div');
        this._root.className = 'dw_root dw_' + this.orientation;
        if (this._theme) {
            ThemeManager.apply(this._root, this._theme);
        }
        this._rebuild();
        if (this.parent) {
            this.parent.appendChild(this._root);
        }
        return this;
    }

    /**
     * Returns the body element of a pane, or null for unknown ids and panes never displayed.
     */
    get_pane_body(id) {
        return this._bodies[id] || null;
    }

    /**
     * Shows the secondary pane beside the primary and calls on_secondary_toggle(true).
     */
    show_secondary() {
        this._secondary_visible = true;
        this._rebuild();
        if (this.on_secondary_toggle) {
            this.on_secondary_toggle(true);
        }
    }

    /**
     * Hides the secondary pane so the primary fills the workspace; calls on_secondary_toggle(false).
     */
    hide_secondary() {
        this._secondary_visible = false;
        this._rebuild();
        if (this.on_secondary_toggle) {
            this.on_secondary_toggle(false);
        }
    }

    /**
     * True when the secondary pane is shown.
     */
    is_secondary_visible() {
        return this._secondary_visible;
    }

    /**
     * Returns the primary pane percentage, independent of display order.
     */
    get_split() {
        return this._split;
    }

    /**
     * Clamps and applies the primary pane percentage, then fires on_layout_change.
     */
    set_split(pct) {
        if (typeof pct !== 'number' || isNaN(pct)) {
            return;
        }
        this._split = this._clamp(pct);
        this._apply_sizes();
        this._fire_layout();
    }

    /**
     * Switches between horizontal and vertical.
     */
    toggle_orientation() {
        this.set_orientation(this.orientation === 'vertical' ? 'horizontal' : 'vertical');
    }

    /**
     * Sets 'vertical' or horizontal for anything else; always fires on_layout_change.
     */
    set_orientation(orientation) {
        this.orientation = orientation === 'vertical' ? 'vertical' : 'horizontal';
        if (this._root) {
            this._root.classList.toggle('dw_vertical', this.orientation === 'vertical');
            this._root.classList.toggle('dw_horizontal', this.orientation === 'horizontal');
            this._apply_sizes();
        }
        this._fire_layout();
    }

    /**
     * Reverses the display order of the panes; the split keeps meaning the primary percentage.
     */
    swap_panes() {
        this._order.reverse();
        this._rebuild();
        this._fire_layout();
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
     * Clamps a percentage to [min_split, max_split].
     */
    _clamp(pct) {
        return Math.min(this.max_split, Math.max(this.min_split, pct));
    }

    /**
     * Recreates pane, header and gutter elements for the displayed panes, reusing their bodies.
     */
    _rebuild() {
        if (!this._root) {
            return;
        }
        this._root.replaceChildren();
        this._pane_els = [];
        let shown = this._secondary_visible ? this._order : [this.primary_id];
        shown.forEach((id, index) => {
            if (index > 0) {
                this._root.appendChild(this._build_gutter());
            }
            let pane = this._build_pane(id);
            this._pane_els.push(pane);
            this._root.appendChild(pane);
        });
        this._apply_sizes();
    }

    /**
     * Builds one pane element with an optional header around its persistent body.
     */
    _build_pane(id) {
        let pane = document.createElement('div');
        pane.className = 'dw_pane';
        pane.setAttribute('data-pane-id', id);
        if (this.show_headers) {
            let header = document.createElement('div');
            header.className = 'dw_pane_header';
            if (this.panes[id].icon) {
                let icon = document.createElement('i');
                icon.className = this.panes[id].icon;
                header.appendChild(icon);
            }
            let title = document.createElement('span');
            title.textContent = this.panes[id].title;
            header.appendChild(title);
            pane.appendChild(header);
        }
        if (!this._bodies[id]) {
            this._bodies[id] = document.createElement('div');
            this._bodies[id].className = 'dw_pane_body';
        }
        pane.appendChild(this._bodies[id]);
        return pane;
    }

    /**
     * Sets flex bases: the first displayed pane gets P percent, the second the rest.
     */
    _apply_sizes() {
        if (this._pane_els.length === 1) {
            this._pane_els[0].style.flex = '1 1 100%';
            return;
        }
        if (this._pane_els.length !== 2) {
            return;
        }
        let first_pct = this._order[0] === this.primary_id ? this._split : 100 - this._split;
        this._pane_els[0].style.flex = '1 1 ' + first_pct + '%';
        this._pane_els[1].style.flex = '1 1 ' + (100 - first_pct) + '%';
    }

    /**
     * Calls on_layout_change with the current layout snapshot.
     */
    _fire_layout() {
        if (this.on_layout_change) {
            this.on_layout_change({
                split_pct: this._split,
                orientation: this.orientation,
                secondary_visible: this._secondary_visible
            });
        }
    }
    // #endregion layout

    // #region gutter_drag
    /**
     * Creates a divider wired for pointer dragging.
     */
    _build_gutter() {
        let gutter = document.createElement('div');
        gutter.className = 'dw_gutter';
        gutter.addEventListener('pointerdown', event => this._on_pointer_down(event, gutter));
        gutter.addEventListener('pointermove', event => this._on_pointer_move(event));
        gutter.addEventListener('pointerup', event => this._on_pointer_end(event, gutter));
        gutter.addEventListener('pointercancel', event => this._on_pointer_end(event, gutter));
        return gutter;
    }

    /**
     * Starts a drag: records the root box and display order and captures the pointer.
     */
    _on_pointer_down(event, gutter) {
        if (event.pointerType === 'mouse' && event.button !== 0) {
            return;
        }
        event.preventDefault();
        this._drag = { rect: this._root.getBoundingClientRect(), primary_first: this._order[0] === this.primary_id };
        gutter.classList.add('dw_dragging');
        try {
            gutter.setPointerCapture(event.pointerId);
        } catch (error) {
        }
    }

    /**
     * Stores the clamped percentage at once; the visual update runs at most once per frame.
     */
    _on_pointer_move(event) {
        if (!this._drag) {
            return;
        }
        let rect = this._drag.rect;
        let horizontal = this.orientation === 'horizontal';
        let offset = horizontal ? event.clientX - rect.left : event.clientY - rect.top;
        let length = horizontal ? rect.width : rect.height;
        let pct = length > 0 ? (offset / length) * 100 : this._split;
        if (!this._drag.primary_first) {
            pct = 100 - pct;
        }
        this._split = this._clamp(pct);
        if (!this._frame) {
            this._frame = requestAnimationFrame(() => {
                this._frame = 0;
                this._apply_sizes();
            });
        }
    }

    /**
     * Ends a drag, applies final sizes and fires on_layout_change.
     */
    _on_pointer_end(event, gutter) {
        if (!this._drag) {
            return;
        }
        this._drag = null;
        gutter.classList.remove('dw_dragging');
        try {
            gutter.releasePointerCapture(event.pointerId);
        } catch (error) {
        }
        if (this._frame) {
            cancelAnimationFrame(this._frame);
            this._frame = 0;
        }
        this._apply_sizes();
        this._fire_layout();
    }
    // #endregion gutter_drag

    // #region registry
    /**
     * Builds a demo instance for the widget registry; the primary pane body is the content container.
     */
    static build_for_registry(host, options) {
        if (options.width > 0) {
            host.style.width = options.width + 'px';
        }
        if (options.height > 0) {
            host.style.height = options.height + 'px';
        }
        let dock = new DockWorkspace(host, options).render();
        if (options.show_secondary) {
            dock.show_secondary();
        }
        for (let id of [dock.primary_id, dock.secondary_id]) {
            let body = dock.get_pane_body(id);
            if (body) {
                body.setAttribute('data-dw_placeholder', dock.panes[id].title + ' pane');
            }
        }
        return { instance: dock, content_container: dock.get_pane_body(dock.primary_id) };
    }
    // #endregion registry
}

window.DockWorkspace = DockWorkspace;
if (window.WidgetRegistry) {
    WidgetRegistry.register('dock_workspace', {
        label: 'Dock Workspace',
        category: 'containers',
        container: true,
        options: [
            { name: 'primary_id', type: 'string', default: 'main' },
            { name: 'secondary_id', type: 'string', default: 'side' },
            { name: 'panes', type: 'json', default: { main: { title: 'Main' }, side: { title: 'Side' } } },
            { name: 'show_secondary', type: 'bool', default: true },
            { name: 'default_split', type: 'number', default: 60 },
            { name: 'min_split', type: 'number', default: 15 },
            { name: 'max_split', type: 'number', default: 85 },
            { name: 'orientation', type: 'select', choices: ['horizontal', 'vertical'], default: 'horizontal' },
            { name: 'show_headers', type: 'bool', default: true },
            { name: 'width', type: 'number', default: 560 },
            { name: 'height', type: 'number', default: 260 }
        ],
        build: (host, options) => DockWorkspace.build_for_registry(host, options)
    });
}
