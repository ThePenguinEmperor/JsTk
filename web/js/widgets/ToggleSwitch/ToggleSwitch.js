/**
 * ToggleSwitch: on/off pill switch that wraps a visually hidden native checkbox.
 */
class ToggleSwitch extends WidgetBase {
    static CSS_URL = (document.currentScript && document.currentScript.src)
        ? document.currentScript.src.replace(/\.js(\?.*)?$/, '.css')
        : 'web/js/widgets/ToggleSwitch/ToggleSwitch.css';

    /**
     * Builds the switch and appends it to parent when parent is given.
     * @param {object} options - label, checked, on_change(is_on), id, title, disabled.
     */
    constructor(parent, options = {}) {
        super();
        let opts = options || {};
        ToggleSwitch.ensure_css();
        this.on_change = typeof opts.on_change === 'function' ? opts.on_change : null;
        this._root = document.createElement('label');
        this._root.className = 'ts_root';
        this._input = document.createElement('input');
        this._input.type = 'checkbox';
        this._input.className = 'ts_input';
        this._input.setAttribute('role', 'switch');
        this._input.checked = !!opts.checked;
        if (opts.id) {
            this._input.id = opts.id;
        }
        if (opts.title) {
            this._root.title = opts.title;
        }
        let track = document.createElement('span');
        track.className = 'ts_track';
        let knob = document.createElement('span');
        knob.className = 'ts_knob';
        track.appendChild(knob);
        this._text = document.createElement('span');
        this._text.className = 'ts_text';
        this._text.textContent = opts.label || '';
        this._root.append(this._input, track, this._text);
        this.listen(this._input, 'change', () => {
            if (this.on_change) {
                this.on_change(this._input.checked);
            }
            this.emit('change', this._input.checked);
        });
        this.set_disabled(opts.disabled);
        if (parent) {
            parent.appendChild(this._root);
        }
    }

    // #region styles
    /**
     * Adds the stylesheet link to the document head once per page.
     */
    static ensure_css() {
        if (document.getElementById('ts_styles')) {
            return;
        }
        let link = document.createElement('link');
        link.id = 'ts_styles';
        link.rel = 'stylesheet';
        link.href = ToggleSwitch.CSS_URL;
        document.head.appendChild(link);
    }
    // #endregion styles

    // #region public_api
    /**
     * Current boolean state.
     */
    get value() {
        return this._input.checked;
    }

    /**
     * Root label element, for manual mounting.
     */
    get element() {
        return this._root;
    }

    /**
     * Current boolean state; same as the value property.
     */
    get_value() {
        return this._input.checked;
    }

    /**
     * Sets the state without firing on_change.
     */
    set_value(val) {
        this._input.checked = !!val;
    }

    /**
     * Replaces the label text.
     */
    set_label(text) {
        this._text.textContent = text === null || text === undefined ? '' : String(text);
    }

    /**
     * Enables or disables the control and its disabled styling.
     */
    set_disabled(val) {
        let is_disabled = !!val;
        this._input.disabled = is_disabled;
        this._root.classList.toggle('ts_disabled', is_disabled);
    }

    /**
     * Applies a preset name or a CSS variable object inline on the root.
     */
    set_theme(theme) {
        if (window.ThemeManager) {
            ThemeManager.apply(this._root, theme);
        }
    }
    // #endregion public_api
}

window.ToggleSwitch = ToggleSwitch;
if (window.WidgetRegistry) {
    WidgetRegistry.register('toggle_switch', {
        label: 'Toggle Switch',
        category: 'inputs',
        container: false,
        options: [
            { name: 'label', type: 'string', default: 'Enabled' },
            { name: 'checked', type: 'bool', default: false },
            { name: 'disabled', type: 'bool', default: false },
            { name: 'title', type: 'string', default: '' }
        ],
        build: (host, options) => new ToggleSwitch(host, options)
    });
}
