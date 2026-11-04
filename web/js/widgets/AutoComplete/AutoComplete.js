/**
 * AutoComplete: custom element <auto-complete> with a text input, a filtered suggestion
 * dropdown, prefix auto-fill, a clear button and optional restriction to listed values.
 * Fires 'autocomplete-select' and 'ac-commit' CustomEvents. Exposed as window.AutoComplete.
 */
class AutoComplete extends HTMLElement {
    static CSS_URL = (document.currentScript && document.currentScript.src)
        ? document.currentScript.src.replace(/\.js(\?.*)?$/, '.css')
        : 'web/js/widgets/AutoComplete/AutoComplete.css';

    /**
     * Builds the shadow DOM; the placeholder attribute is read once here.
     */
    constructor() {
        super();
        this.options = {
            placeholder: this.getAttribute('placeholder') || '',
            allow_free_text: true,
            min_chars: 0,
            max_results: Infinity,
            filter_mode: 'contains',
            on_select: null
        };
        this.completion_list = [];
        this.hits = [];
        this.hit_index = 0;
        this.anchor = 0;
        this.suppress_fill = false;
        this.last_good = '';
        this.blur_timer = null;
        this.on_resize = () => this._update_width_var();
        this._build();
    }

    // #region lifecycle
    /**
     * Starts tracking window resizes while attached.
     */
    connectedCallback() {
        window.addEventListener('resize', this.on_resize);
        setTimeout(this.on_resize, 0);
    }

    /**
     * Stops tracking window resizes and pending blur timers when detached.
     */
    disconnectedCallback() {
        window.removeEventListener('resize', this.on_resize);
        clearTimeout(this.blur_timer);
    }
    // #endregion lifecycle

    // #region public_api
    /**
     * Replaces the options with a sorted copy and resets hits, highlight and anchor.
     */
    set_completion_list(list) {
        this.completion_list = (list || []).slice().sort((a, b) => String(a).localeCompare(String(b)));
        this.hits = [];
        this.hit_index = 0;
        this.anchor = 0;
        this._render();
    }

    /**
     * Replaces the custom stylesheet applied after the base styles.
     */
    set_custom_styles(css) {
        this.custom_style.textContent = css || '';
    }

    /**
     * Shallow-merges options; a placeholder change applies at once.
     */
    configure(options) {
        Object.assign(this.options, options || {});
        if (options && options.placeholder !== undefined) {
            this.input.placeholder = options.placeholder;
        }
    }

    /**
     * Recomputes hits and auto-fills the input.
     * @param {number} delta - Non-zero moves the highlight (wrapping) and fills that hit.
     * @param {boolean} force - True shows the whole list regardless of the text.
     */
    autocomplete(delta = 0, force = false) {
        let text = this.input.value;
        this.hits = this._compute_hits(text, force);
        let count = this.hits.length;
        if (count && delta) {
            this.hit_index = (((this.hit_index + delta) % count) + count) % count;
            if (!this.suppress_fill) {
                this._fill(this.hits[this.hit_index]);
            }
        } else {
            let lower = text.toLowerCase();
            let exact = this.hits.findIndex(hit => String(hit).toLowerCase() === lower);
            let prefix = lower ? this.hits.findIndex(hit => String(hit).toLowerCase().startsWith(lower)) : -1;
            this.hit_index = 0;
            if (exact >= 0) {
                this.hit_index = exact;
            } else if (prefix >= 0) {
                this.hit_index = prefix;
                if (!this.suppress_fill) {
                    this._fill(this.hits[prefix]);
                }
            }
        }
        this._render();
    }

    /**
     * Returns the input text.
     */
    get value() {
        return this.input.value;
    }

    /**
     * Sets the input text; unknown values are ignored when free text is off.
     * Fires 'autocomplete-select' when the value is exactly one of the options.
     */
    set value(val) {
        let text = val === null || val === undefined ? '' : String(val);
        if (!this.options.allow_free_text && text !== '' && !this.completion_list.includes(text)) {
            return;
        }
        this.input.value = text;
        this.anchor = text.length;
        this.last_good = text;
        this._update_has_value();
        this.suppress_fill = true;
        this.autocomplete(0);
        this._hide();
        if (this.completion_list.includes(text)) {
            this._emit('autocomplete-select', text);
        }
    }

    /**
     * Applies a preset name or a CSS variable object to the host element.
     */
    set_theme(theme) {
        if (window.ThemeManager) {
            ThemeManager.apply(this, theme);
        }
    }
    // #endregion public_api

    // #region building
    /**
     * Creates the shadow root, stylesheets, input, clear button and dropdown.
     */
    _build() {
        let shadow = this.attachShadow({ mode: 'open' });
        let base_style = document.createElement('link');
        base_style.rel = 'stylesheet';
        base_style.href = AutoComplete.CSS_URL;
        this.custom_style = document.createElement('style');
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'ac_wrapper';
        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.className = 'ac_input';
        this.input.autocomplete = 'off';
        this.input.placeholder = this.options.placeholder;
        this.clear_btn = document.createElement('button');
        this.clear_btn.type = 'button';
        this.clear_btn.className = 'ac_clear';
        this.clear_btn.textContent = 'x';
        this.clear_btn.tabIndex = -1;
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'ac_dropdown';
        this.wrapper.append(this.input, this.clear_btn, this.dropdown);
        shadow.append(base_style, this.custom_style, this.wrapper);
        this._bind_events();
    }

    /**
     * Wires input, keyboard, mouse, focus and hover handlers.
     */
    _bind_events() {
        this.input.addEventListener('input', event => this._on_input(event));
        this.input.addEventListener('keydown', event => this._on_keydown(event));
        this.input.addEventListener('mousedown', () => {
            this.suppress_fill = true;
            let exact = this.completion_list.includes(this.input.value);
            this.hits = this._compute_hits(this.input.value, exact);
            this.hit_index = 0;
            this._render();
        });
        this.input.addEventListener('blur', () => {
            clearTimeout(this.blur_timer);
            this.blur_timer = setTimeout(() => this._hide(), 100);
        });
        this.clear_btn.addEventListener('mousedown', event => event.preventDefault());
        this.clear_btn.addEventListener('click', () => {
            this.input.value = '';
            this.last_good = '';
            this.anchor = 0;
            this.hits = [];
            this.hit_index = 0;
            this._update_has_value();
            this._hide();
        });
        this.wrapper.addEventListener('mouseenter', () => this.wrapper.classList.add('ac_hover'));
        this.wrapper.addEventListener('mouseleave', () => this.wrapper.classList.remove('ac_hover'));
    }
    // #endregion building

    // #region input_handling
    /**
     * Handles typed and deleted text, enforcing the restrict-to-list rule.
     */
    _on_input(event) {
        let type = event.inputType || 'insertText';
        let text = this.input.value;
        if (type.startsWith('delete')) {
            this.suppress_fill = true;
            this.last_good = text;
            this.anchor = this.input.selectionStart || 0;
            this.hits = this._compute_hits(text, false);
            this.hit_index = 0;
            this._update_has_value();
            this._render();
            return;
        }
        let lower = text.toLowerCase();
        if (!this.options.allow_free_text && text && !this.completion_list.some(item => String(item).toLowerCase().includes(lower))) {
            let caret = Math.max(0, (this.input.selectionStart || 0) - (text.length - this.last_good.length));
            this.input.value = this.last_good;
            this.input.setSelectionRange(caret, caret);
            return;
        }
        this.last_good = text;
        this.suppress_fill = false;
        this.anchor = this.input.selectionStart || text.length;
        this._update_has_value();
        this.autocomplete(0);
    }

    /**
     * Handles navigation, Enter commits and Escape.
     */
    _on_keydown(event) {
        let key = event.key;
        if (key === 'Backspace' || key === 'Delete') {
            this.suppress_fill = true;
        } else if (key === 'ArrowLeft') {
            this.anchor = Math.max(0, this.anchor - 1);
        } else if (key === 'ArrowRight') {
            this.anchor = this.input.value.length;
        } else if (key === 'ArrowDown') {
            event.preventDefault();
            this.suppress_fill = true;
            if (!this._is_open()) {
                this.hits = this._compute_hits('', true);
                this.hit_index = 0;
                this._render();
                return;
            }
            this._step(1);
        } else if (key === 'ArrowUp') {
            if (this.hits.length) {
                event.preventDefault();
                this._step(-1);
            }
        } else if (key === 'Enter') {
            event.preventDefault();
            if (this.hits.length) {
                let hit = this.hits[this.hit_index];
                this._set_text(hit);
                this._hide();
                this._emit('autocomplete-select', hit);
            } else {
                this._hide();
            }
            this._emit('ac-commit', this.input.value);
        } else if (key === 'Escape') {
            event.preventDefault();
            this._hide();
        }
    }

    /**
     * Moves the highlight by delta (wrapping) and fills the input with that hit.
     */
    _step(delta) {
        let count = this.hits.length;
        if (!count) {
            return;
        }
        this.hit_index = (((this.hit_index + delta) % count) + count) % count;
        this._fill(this.hits[this.hit_index]);
        this._render();
    }

    /**
     * Selects an option clicked with the mouse.
     */
    _select_option(hit) {
        this._set_text(hit);
        this._hide();
        this._emit('autocomplete-select', hit);
        if (typeof this.options.on_select === 'function') {
            this.options.on_select(hit);
        }
    }
    // #endregion input_handling

    // #region helpers
    /**
     * Returns the filtered, truncated hit list for text.
     */
    _compute_hits(text, force) {
        let lower = text.toLowerCase();
        let hits = [];
        if (force) {
            hits = this.completion_list.slice();
        } else if (text.length >= this.options.min_chars) {
            let use_prefix = this.options.filter_mode === 'prefix';
            hits = this.completion_list.filter(item => {
                let low = String(item).toLowerCase();
                return use_prefix ? low.startsWith(lower) : low.includes(lower);
            });
        }
        let limit = Number(this.options.max_results);
        return limit >= 0 && limit !== Infinity ? hits.slice(0, limit) : hits;
    }

    /**
     * Puts a hit in the input and selects the auto-filled tail from the anchor.
     */
    _fill(hit) {
        this.input.value = hit;
        this.last_good = hit;
        this._update_has_value();
        let start = Math.min(this.anchor, hit.length);
        this.input.setSelectionRange(start, hit.length);
    }

    /**
     * Sets the full text with the caret at the end.
     */
    _set_text(text) {
        this.input.value = text;
        this.last_good = text;
        this.anchor = text.length;
        this._update_has_value();
    }

    /**
     * Toggles the has-value state that controls the clear button.
     */
    _update_has_value() {
        this.wrapper.classList.toggle('ac_has_value', this.input.value !== '');
    }

    /**
     * Writes the input pixel width to --ac_dropdown_width on the host.
     */
    _update_width_var() {
        this.style.setProperty('--ac_dropdown_width', this.input.offsetWidth + 'px');
    }

    /**
     * Dispatches a bubbling, composed CustomEvent with { value }.
     */
    _emit(name, value) {
        this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail: { value: value } }));
    }
    // #endregion helpers

    // #region dropdown
    /**
     * Rebuilds the option rows; shows the dropdown when there are hits.
     */
    _render() {
        this.dropdown.textContent = '';
        if (!this.hits.length) {
            this._hide();
            return;
        }
        this.hits.forEach((hit, index) => {
            let row = document.createElement('div');
            row.className = 'ac_option' + (index === this.hit_index ? ' ac_selected' : '');
            row.textContent = hit;
            row.addEventListener('mousedown', event => {
                event.preventDefault();
                this._select_option(hit);
            });
            this.dropdown.appendChild(row);
        });
        let rect = this.wrapper.getBoundingClientRect();
        this.dropdown.style.top = (rect.bottom + 2) + 'px';
        this.dropdown.style.left = rect.left + 'px';
        this.dropdown.style.width = rect.width + 'px';
        this.dropdown.classList.add('ac_open');
        let selected = this.dropdown.querySelector('.ac_selected');
        if (selected) {
            selected.scrollIntoView({ block: 'nearest' });
        }
    }

    /**
     * Hides the dropdown.
     */
    _hide() {
        this.dropdown.classList.remove('ac_open');
    }

    /**
     * Returns true while the dropdown is shown.
     */
    _is_open() {
        return this.dropdown.classList.contains('ac_open');
    }
    // #endregion dropdown
}

if (!customElements.get('auto-complete')) {
    customElements.define('auto-complete', AutoComplete);
}
window.AutoComplete = AutoComplete;
if (window.WidgetRegistry) {
    WidgetRegistry.register('auto_complete', {
        label: 'Auto Complete',
        category: 'inputs',
        container: false,
        options: [
            { name: 'placeholder', type: 'string', default: 'Type a fruit...' },
            { name: 'items', type: 'json', default: ['Apple', 'Apricot', 'Banana', 'Blueberry', 'Cherry', 'Grape', 'Mango', 'Orange', 'Peach', 'Pear'] },
            { name: 'allow_free_text', type: 'bool', default: true },
            { name: 'min_chars', type: 'number', default: 0 },
            { name: 'max_results', type: 'number', default: 50 },
            { name: 'filter_mode', type: 'select', default: 'contains', choices: ['contains', 'prefix'] },
            { name: 'value', type: 'string', default: '' }
        ],
        build: (host, options) => {
            let element = document.createElement('auto-complete');
            element.configure({
                placeholder: options.placeholder || '',
                allow_free_text: options.allow_free_text !== false,
                min_chars: Number(options.min_chars) || 0,
                max_results: Number(options.max_results) > 0 ? Number(options.max_results) : Infinity,
                filter_mode: options.filter_mode || 'contains'
            });
            element.set_completion_list(Array.isArray(options.items) ? options.items : []);
            host.appendChild(element);
            if (options.value) {
                element.value = options.value;
            }
            return element;
        }
    });
}
