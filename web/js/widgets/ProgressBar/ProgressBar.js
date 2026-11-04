/**
 * ProgressBar: data-agnostic progress indicator with determinate, indeterminate and colored state modes.
 */
class ProgressBar {
    static CSS_URL = (document.currentScript && document.currentScript.src)
        ? document.currentScript.src.replace(/\.js(\?.*)?$/, '.css')
        : 'web/js/widgets/ProgressBar/ProgressBar.css';
    static STATES = ['idle', 'running', 'success', 'error'];

    /**
     * Stores options; no DOM is built until render().
     * @param {object} opts - value, indeterminate, label, show_percent, state, compact, on_click(event, bar).
     */
    constructor(container, opts = {}) {
        let options = opts || {};
        ProgressBar.ensure_css();
        this.container = container || null;
        this._value = ProgressBar.clamp_value(options.value);
        this._indeterminate = !!options.indeterminate;
        this._label = options.label === null || options.label === undefined ? '' : String(options.label);
        this._show_percent = options.show_percent !== false;
        this._state = ProgressBar.normalize_state(options.state);
        this._compact = !!options.compact;
        this._on_click = typeof options.on_click === 'function' ? options.on_click : null;
        this._pending_theme = null;
        this._root = null;
        this._label_el = null;
        this._percent_el = null;
        this._track_el = null;
        this._fill_el = null;
    }

    // #region helpers
    /**
     * Adds the stylesheet link to the document head once per page.
     */
    static ensure_css() {
        if (document.getElementById('pb_styles')) {
            return;
        }
        let link = document.createElement('link');
        link.id = 'pb_styles';
        link.rel = 'stylesheet';
        link.href = ProgressBar.CSS_URL;
        document.head.appendChild(link);
    }

    /**
     * Converts input to a finite number clamped to 0..1; anything else becomes 0.
     */
    static clamp_value(value) {
        let num = Number(value);
        if (!Number.isFinite(num)) {
            return 0;
        }
        return Math.min(1, Math.max(0, num));
    }

    /**
     * Returns a known state name, or 'idle'.
     */
    static normalize_state(state) {
        let known = ProgressBar.STATES.includes(state);
        return known ? state : 'idle';
    }
    // #endregion helpers

    // #region rendering
    /**
     * Builds the DOM once, applies current state and theme, and appends it to the container.
     */
    render() {
        if (this._root) {
            return this;
        }
        this._root = document.createElement('div');
        let info = document.createElement('div');
        info.className = 'pb_info';
        this._label_el = document.createElement('span');
        this._label_el.className = 'pb_label';
        this._percent_el = document.createElement('span');
        this._percent_el.className = 'pb_percent';
        info.append(this._label_el, this._percent_el);
        this._track_el = document.createElement('div');
        this._track_el.className = 'pb_track';
        this._track_el.setAttribute('role', 'progressbar');
        this._track_el.setAttribute('aria-valuemin', '0');
        this._track_el.setAttribute('aria-valuemax', '100');
        this._fill_el = document.createElement('div');
        this._fill_el.className = 'pb_fill';
        this._track_el.appendChild(this._fill_el);
        if (!this._compact) {
            this._root.appendChild(info);
        }
        this._root.appendChild(this._track_el);
        if (this._on_click) {
            this._root.addEventListener('click', e => this._on_click(e, this));
        }
        if (this._pending_theme && window.ThemeManager) {
            ThemeManager.apply(this._root, this._pending_theme);
        }
        this.apply_state();
        if (this.container) {
            this.container.appendChild(this._root);
        }
        return this;
    }

    /**
     * Pushes the stored state into the DOM; no-op before render().
     */
    apply_state() {
        if (!this._root) {
            return;
        }
        let classes = ['pb_root', 'pb_' + this._state];
        if (this._compact) {
            classes.push('pb_compact');
        }
        if (this._indeterminate) {
            classes.push('pb_indeterminate');
        }
        if (this._on_click) {
            classes.push('pb_clickable');
        }
        this._root.className = classes.join(' ');
        let percent = Math.round(this._value * 100);
        this._label_el.textContent = this._label;
        this._percent_el.textContent = (this._indeterminate || !this._show_percent) ? '' : percent + '%';
        this._fill_el.style.width = this._indeterminate ? '' : percent + '%';
        this._track_el.setAttribute('aria-label', this._label || 'Progress');
        if (this._indeterminate) {
            this._track_el.removeAttribute('aria-valuenow');
        } else {
            this._track_el.setAttribute('aria-valuenow', String(percent));
        }
    }
    // #endregion rendering

    // #region public_api
    /**
     * Sets the fill fraction and leaves indeterminate mode.
     */
    set_progress(value) {
        this._value = ProgressBar.clamp_value(value);
        this._indeterminate = false;
        this.apply_state();
        return this;
    }

    /**
     * Turns the animated mode on or off; the stored value is kept.
     */
    set_indeterminate(flag) {
        this._indeterminate = !!flag;
        this.apply_state();
        return this;
    }

    /**
     * Sets the label as plain text.
     */
    set_label(text) {
        this._label = text === null || text === undefined ? '' : String(text);
        this.apply_state();
        return this;
    }

    /**
     * Sets the color state; unknown values become 'idle'.
     */
    set_state(state) {
        this._state = ProgressBar.normalize_state(state);
        this.apply_state();
        return this;
    }

    /**
     * Resets value, state and indeterminate mode; the label is kept.
     */
    reset() {
        this._value = 0;
        this._state = 'idle';
        this._indeterminate = false;
        this.apply_state();
        return this;
    }

    /**
     * Applies a preset name or a CSS variable object on the root; held until render() if called earlier.
     */
    set_theme(theme) {
        this._pending_theme = theme;
        if (this._root && window.ThemeManager) {
            ThemeManager.apply(this._root, theme);
        }
    }

    /**
     * Current fill fraction, 0 to 1.
     */
    get value() {
        return this._value;
    }

    /**
     * Current state name.
     */
    get state() {
        return this._state;
    }

    /**
     * True while the animated mode is on.
     */
    get is_indeterminate() {
        return this._indeterminate;
    }

    /**
     * Root element, or null before render().
     */
    get element() {
        return this._root;
    }
    // #endregion public_api
}

window.ProgressBar = ProgressBar;
if (window.WidgetRegistry) {
    WidgetRegistry.register('progress_bar', {
        label: 'Progress Bar',
        category: 'display',
        container: false,
        options: [
            { name: 'value', type: 'number', default: 0.45 },
            { name: 'label', type: 'string', default: 'Uploading files' },
            { name: 'state', type: 'select', default: 'running', choices: ['idle', 'running', 'success', 'error'] },
            { name: 'indeterminate', type: 'bool', default: false },
            { name: 'show_percent', type: 'bool', default: true },
            { name: 'compact', type: 'bool', default: false }
        ],
        build: (host, options) => new ProgressBar(host, options).render()
    });
}
