/**
 * InputWithClr: single-line input with an inline clear button shown on hover when the field has text.
 */
class InputWithClr {
    static CSS_URL = (document.currentScript && document.currentScript.src)
        ? document.currentScript.src.replace(/\.js(\?.*)?$/, '.css')
        : 'web/js/widgets/InputWithClr/InputWithClr.css';
    static custom_css_count = 0;
    static CLEAR_ICON = '<svg viewBox="0 0 10 10" width="0.75em" height="0.75em" aria-hidden="true">'
        + '<path d="M1 1 L9 9 M9 1 L1 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

    /**
     * Builds the widget inside container, or in place of opts.replace_input when that is an input element.
     * @param {object} opts - placeholder, value, on_input(value), type, class_name, input_attrs, custom_css, replace_input.
     */
    constructor(container, opts = {}) {
        let options = Object.assign({}, opts || {});
        let replace = options.replace_input instanceof HTMLInputElement ? options.replace_input : null;
        if (replace) {
            container = document.createElement('div');
            if (options.class_name) {
                container.className = String(options.class_name).trim();
            }
            if (replace.id) {
                container.id = replace.id + '_with_clr';
            }
            if (options.placeholder === undefined) {
                options.placeholder = replace.placeholder;
            }
            if (options.value === undefined) {
                options.value = replace.value;
            }
            if (replace.parentNode) {
                replace.parentNode.replaceChild(container, replace);
            }
        }
        InputWithClr.ensure_css();
        this.container = container || document.createElement('div');
        this.on_input = typeof options.on_input === 'function' ? options.on_input : null;
        this.input = null;
        this.clear_btn = null;
        this.build_widget(options);
        this.bind_events();
        if (options.custom_css) {
            this.apply_custom_css(options.custom_css);
        }
    }

    // #region styles
    /**
     * Adds the stylesheet link to the document head once per page.
     */
    static ensure_css() {
        if (document.getElementById('iwc_styles')) {
            return;
        }
        let link = document.createElement('link');
        link.id = 'iwc_styles';
        link.rel = 'stylesheet';
        link.href = InputWithClr.CSS_URL;
        document.head.appendChild(link);
    }

    /**
     * Injects css_string as a new style element; every call adds one more element.
     */
    apply_custom_css(css_string) {
        if (!css_string) {
            return;
        }
        InputWithClr.custom_css_count += 1;
        let style = document.createElement('style');
        style.id = 'iwc_custom_' + InputWithClr.custom_css_count;
        style.textContent = String(css_string);
        document.head.appendChild(style);
    }
    // #endregion styles

    // #region construction
    /**
     * Clears the container and builds the wrapper, input and clear button.
     */
    build_widget(opts) {
        let user_class = opts.class_name ? String(opts.class_name).trim() : '';
        let wrapper = document.createElement('div');
        wrapper.className = 'iwc_wrap' + (user_class ? ' ' + user_class : '');
        this.input = document.createElement('input');
        this.input.type = opts.type || 'text';
        this.input.className = 'iwc_input' + (user_class ? ' ' + user_class + '_input' : '');
        this.input.placeholder = opts.placeholder || '';
        if (opts.input_attrs && typeof opts.input_attrs === 'object') {
            for (let [name, val] of Object.entries(opts.input_attrs)) {
                if (val === false) {
                    continue;
                }
                this.input.setAttribute(name, val === true ? '' : String(val));
            }
        } else {
            this.input.setAttribute('autocomplete', 'off');
        }
        this.input.value = opts.value === null || opts.value === undefined ? '' : String(opts.value);
        this.clear_btn = document.createElement('span');
        this.clear_btn.className = 'iwc_clr' + (user_class ? ' ' + user_class + '_clr' : '');
        this.clear_btn.title = 'Clear';
        this.clear_btn.innerHTML = InputWithClr.CLEAR_ICON;
        wrapper.append(this.input, this.clear_btn);
        this.container.replaceChildren(wrapper);
        this.update_clear_state();
    }

    /**
     * Wires typing and the clear button.
     */
    bind_events() {
        this.input.addEventListener('input', () => {
            this.update_clear_state();
            if (typeof this.on_input === 'function') {
                this.on_input(this.input.value);
            }
        });
        this.clear_btn.addEventListener('mousedown', e => e.preventDefault());
        this.clear_btn.addEventListener('click', () => {
            if (this.input.disabled) {
                return;
            }
            this.input.value = '';
            this.input.dispatchEvent(new Event('input', { bubbles: true }));
            this.input.focus();
        });
    }

    /**
     * Shows the clear button state when the field is enabled and non-empty.
     */
    update_clear_state() {
        let has_text = !!this.input && this.input.value !== '' && !this.input.disabled;
        this.clear_btn.classList.toggle('iwc_show', has_text);
    }
    // #endregion construction

    // #region public_api
    /**
     * Returns the current value, or '' when there is no input.
     */
    get_value() {
        return this.input ? this.input.value : '';
    }

    /**
     * Sets the value and dispatches an input event, so on_input fires.
     */
    set_value(val) {
        this.input.value = val === null || val === undefined ? '' : String(val);
        this.input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    /**
     * Enables or disables the input; the clear button hides while disabled.
     */
    set_disabled(is_disabled) {
        this.input.disabled = !!is_disabled;
        this.update_clear_state();
    }

    /**
     * Applies a preset name or a CSS variable object inline on the container.
     */
    set_theme(theme) {
        if (window.ThemeManager && this.container) {
            ThemeManager.apply(this.container, theme);
        }
    }
    // #endregion public_api
}

window.InputWithClr = InputWithClr;
if (window.WidgetRegistry) {
    WidgetRegistry.register('input_with_clr', {
        label: 'Input With Clear',
        category: 'inputs',
        container: false,
        options: [
            { name: 'placeholder', type: 'string', default: 'Search...' },
            { name: 'value', type: 'string', default: 'Hover to clear me' },
            { name: 'type', type: 'select', default: 'text', choices: ['text', 'search', 'email', 'password', 'number'] },
            { name: 'class_name', type: 'string', default: '' }
        ],
        build: (host, options) => new InputWithClr(host, options)
    });
}
