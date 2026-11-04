/**
 * UserPrompt: modal question dialog with up to four answer buttons and an optional auto-answer countdown.
 * UserPromptInput adds a text field and UserPromptPassword a masked field with a show/hide toggle.
 */
class UserPrompt extends HTMLElement {
    static CSS_URL = (document.currentScript && document.currentScript.src)
        ? document.currentScript.src.replace(/\.js(\?.*)?$/, '.css')
        : 'web/js/widgets/UserPrompt/UserPrompt.css';
    static default_timeout = 60;
    static input_type = null;
    static open_prompts = new Set();
    static EYE_ICON = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4">'
        + '<path d="M1 8 C3 4 5.5 3 8 3 C10.5 3 13 4 15 8 C13 12 10.5 13 8 13 C5.5 13 3 12 1 8 Z"/><circle cx="8" cy="8" r="2.2"/></svg>';
    static EYE_OFF_ICON = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4">'
        + '<path d="M1 8 C3 4 5.5 3 8 3 C10.5 3 13 4 15 8 C13 12 10.5 13 8 13 C5.5 13 3 12 1 8 Z"/><circle cx="8" cy="8" r="2.2"/>'
        + '<path d="M2 14 L14 2"/></svg>';

    /**
     * Reads the config; the dialog is built when the element is added to the document.
     * @param {object} config - title, text (plain; HTML only with allow_html), allow_html (default false), options {label: value}, timeout (s), default_value,
     *   closable (default true: a small x at the top right that answers like No or Cancel),
     *   on_answer(value, label); input variants also take input_placeholder and input_default.
     */
    constructor(config = {}) {
        super();
        let cfg = config || {};
        let options = cfg.options;
        if (!options) {
            options = { 'Yes': true, 'No': false };
        } else if (Array.isArray(options) || typeof options !== 'object') {
            throw new Error('UserPrompt: options must be a map of label to value pairs');
        }
        this.title = cfg.title;
        this.text = cfg.text === null || cfg.text === undefined ? '' : String(cfg.text);
        this.allow_html = cfg.allow_html === true;
        this.closable = cfg.closable !== false;
        this.option_labels = Object.keys(options).slice(0, 4);
        this.options = {};
        for (let label of this.option_labels) {
            this.options[label] = options[label];
        }
        this.timeout = typeof cfg.timeout === 'number' && !Number.isNaN(cfg.timeout) ? cfg.timeout : this.constructor.default_timeout;
        this.default_value = 'default_value' in cfg ? cfg.default_value : null;
        this.on_answer = typeof cfg.on_answer === 'function' ? cfg.on_answer : null;
        this.input_placeholder = cfg.input_placeholder ? String(cfg.input_placeholder) : '';
        this.input_default = cfg.input_default ? String(cfg.input_default) : '';
        this._answered = false;
        this._overlay = null;
        this._input = null;
        this._buttons = [];
        this._timer = null;
        this._key_handler = e => this.on_key(e);
    }

    // #region public_api
    /**
     * Dialog title text; shadows HTMLElement.title so no title attribute or tooltip is set on the element.
     */
    get title() {
        return this._title;
    }

    /**
     * Sets the dialog title text.
     */
    set title(value) {
        this._title = value === null || value === undefined ? '' : String(value);
    }

    /**
     * Opens a prompt of the calling class and resolves with the answer value; never rejects once shown.
     */
    static ask(config = {}) {
        return new Promise(resolve => {
            let cfg = Object.assign({}, config || {});
            let user_callback = cfg.on_answer;
            cfg.on_answer = (value, label) => {
                if (typeof user_callback === 'function') {
                    try {
                        user_callback(value, label);
                    } catch (error) {
                        console.error('[user_prompt] on_answer failed', error);
                    }
                }
                resolve(value);
            };
            document.body.appendChild(new this(cfg));
        });
    }

    /**
     * Applies a preset name or a CSS variable object inline on the prompt element.
     */
    set_theme(theme) {
        if (window.ThemeManager) {
            ThemeManager.apply(this, theme);
        }
    }
    // #endregion public_api

    // #region lifecycle
    /**
     * Builds the dialog, closes any other open prompt, and starts keyboard handling and the countdown.
     */
    connectedCallback() {
        if (this._answered || this._overlay) {
            return;
        }
        UserPrompt.ensure_css();
        for (let other of [...UserPrompt.open_prompts]) {
            if (other !== this) {
                other.answer(null);
            }
        }
        UserPrompt.open_prompts.add(this);
        this.build();
        document.addEventListener('keydown', this._key_handler, true);
        requestAnimationFrame(() => this.focus_initial());
        if (this.timeout > 0) {
            this._remaining = Math.ceil(this.timeout);
            this._timer = setInterval(() => this.tick(), 1000);
        }
    }

    /**
     * Stops the countdown and keyboard handling when the element leaves the document.
     */
    disconnectedCallback() {
        if (this._timer) {
            clearInterval(this._timer);
            this._timer = null;
        }
        document.removeEventListener('keydown', this._key_handler, true);
        UserPrompt.open_prompts.delete(this);
    }

    /**
     * Adds the stylesheet link to the document head once per page.
     */
    static ensure_css() {
        if (document.getElementById('up_styles')) {
            return;
        }
        let link = document.createElement('link');
        link.id = 'up_styles';
        link.rel = 'stylesheet';
        link.href = UserPrompt.CSS_URL;
        document.head.appendChild(link);
    }
    // #endregion lifecycle

    // #region building
    /**
     * Builds the overlay, box, title, body, optional input row and the button row.
     */
    build() {
        this._overlay = document.createElement('div');
        this._overlay.className = 'up_overlay';
        this._overlay.style.zIndex = typeof window.get_next_z_index === 'function' ? window.get_next_z_index() : 10000;
        let box = document.createElement('div');
        box.className = 'up_box';
        box.setAttribute('role', 'dialog');
        box.setAttribute('aria-modal', 'true');
        let title = document.createElement('div');
        title.className = 'up_title';
        title.textContent = this.title;
        let body = document.createElement('div');
        body.className = 'up_text';
        WidgetBase.set_content(body, this.text, this.allow_html);
        box.append(title, body);
        if (this.closable) {
            box.appendChild(this.build_close_button());
        }
        if (this.constructor.input_type) {
            box.appendChild(this.build_input_row());
        }
        let actions = document.createElement('div');
        actions.className = 'up_actions';
        if (this.timeout > 0) {
            this._countdown_el = document.createElement('span');
            this._countdown_el.className = 'up_countdown';
            this.update_countdown(Math.ceil(this.timeout));
            actions.appendChild(this._countdown_el);
        }
        this._buttons = this.option_labels.map(label => {
            let btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'up_btn' + this.button_class(label);
            btn.textContent = label;
            btn.addEventListener('click', () => this.answer(label));
            actions.appendChild(btn);
            return btn;
        });
        box.appendChild(actions);
        this._overlay.appendChild(box);
        this.appendChild(this._overlay);
    }

    /**
     * Builds the small x button at the top right that dismisses the prompt.
     */
    build_close_button() {
        let close = document.createElement('button');
        close.type = 'button';
        close.className = 'up_close';
        close.textContent = 'x';
        close.setAttribute('aria-label', 'Close');
        close.addEventListener('click', () => this.answer(this.cancel_label(), true));
        return close;
    }

    /**
     * Returns the label that counts as No or Cancel, or null when the prompt has none.
     */
    cancel_label() {
        let found = this.option_labels.find(label => /^(no|cancel)$/i.test(label.trim()));
        return found === undefined ? null : found;
    }

    /**
     * Builds the text or password field row; Enter in the field picks the first button.
     */
    build_input_row() {
        let row = document.createElement('div');
        row.className = 'up_input_row';
        this._input = document.createElement('input');
        this._input.type = this.constructor.input_type;
        this._input.className = 'up_input';
        this._input.setAttribute('autocomplete', 'off');
        this._input.spellcheck = false;
        this._input.placeholder = this.input_placeholder;
        this._input.value = this.input_default;
        this._input.addEventListener('keydown', e => {
            if (e.key === 'Enter' && this.option_labels.length) {
                e.preventDefault();
                this.answer(this.option_labels[0]);
            }
        });
        row.appendChild(this._input);
        if (this.constructor.input_type === 'password') {
            let toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'up_eye';
            toggle.title = 'Show / hide password';
            toggle.innerHTML = UserPrompt.EYE_ICON;
            toggle.addEventListener('click', () => {
                let reveal = this._input.type === 'password';
                this._input.type = reveal ? 'text' : 'password';
                toggle.innerHTML = reveal ? UserPrompt.EYE_OFF_ICON : UserPrompt.EYE_ICON;
                this._input.focus();
            });
            row.appendChild(toggle);
        }
        return row;
    }

    /**
     * Returns the style class for a button label, matched case-insensitively by substring.
     */
    button_class(label) {
        let text = String(label).toLowerCase();
        let primary = this._input ? ['yes', 'ok', 'submit'] : ['yes'];
        let secondary = this._input ? ['no', 'cancel'] : ['no'];
        if (primary.some(word => text.includes(word))) {
            return ' up_btn_primary';
        }
        return secondary.some(word => text.includes(word)) ? ' up_btn_secondary' : '';
    }

    /**
     * Writes the countdown text.
     */
    update_countdown(seconds) {
        if (this._countdown_el) {
            this._countdown_el.textContent = 'Auto-selecting in ' + seconds + ' seconds...';
        }
    }

    /**
     * Focuses the input when present, otherwise the first button.
     */
    focus_initial() {
        let target = this._input || this._buttons[0];
        if (target && this.isConnected) {
            target.focus();
        }
    }
    // #endregion building

    // #region answering
    /**
     * Counts down one second and answers with the timeout value at zero.
     */
    tick() {
        this._remaining -= 1;
        this.update_countdown(Math.max(0, this._remaining));
        if (this._remaining <= 0) {
            this.answer(null);
        }
    }

    /**
     * Closes the dialog once and reports the answer; label null means timeout or superseded.
     */
    answer(label, dismissed = false) {
        if (this._answered) {
            return;
        }
        this._answered = true;
        let value = null;
        if (dismissed && this._input) {
            value = null;
        } else if (this._input) {
            value = this._input.value;
        } else {
            value = label === null ? this.default_value : this.options[label];
        }
        this.remove();
        if (this.on_answer) {
            this.on_answer(value, label);
        }
    }

    /**
     * Global keys while open: arrows cycle buttons, Enter activates the focused one, Escape picks the last.
     * Left and Right are left to the text field while it has focus.
     */
    on_key(e) {
        let count = this._buttons.length;
        if (!count) {
            return;
        }
        let index = this._buttons.indexOf(document.activeElement);
        let in_input = this._input && document.activeElement === this._input;
        let forward = e.key === 'ArrowDown' || (e.key === 'ArrowRight' && !in_input);
        let backward = e.key === 'ArrowUp' || (e.key === 'ArrowLeft' && !in_input);
        if (forward) {
            e.preventDefault();
            this._buttons[index < 0 ? 0 : (index + 1) % count].focus();
        } else if (backward) {
            e.preventDefault();
            this._buttons[index < 0 ? count - 1 : (index - 1 + count) % count].focus();
        } else if (e.key === 'Enter' && index >= 0) {
            e.preventDefault();
            this.answer(this.option_labels[index]);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            this.answer(this.option_labels[count - 1]);
        }
    }
    // #endregion answering
}

/**
 * UserPromptInput: UserPrompt with a free-text field; reports the typed text and the button label.
 */
class UserPromptInput extends UserPrompt {
    static default_timeout = 0;
    static input_type = 'text';
}

/**
 * UserPromptPassword: UserPromptInput with a masked field and a show/hide toggle.
 */
class UserPromptPassword extends UserPromptInput {
    static input_type = 'password';
}

if (!customElements.get('user-prompt')) {
    customElements.define('user-prompt', UserPrompt);
}
if (!customElements.get('user-prompt-input')) {
    customElements.define('user-prompt-input', UserPromptInput);
}
if (!customElements.get('user-prompt-password')) {
    customElements.define('user-prompt-password', UserPromptPassword);
}
window.UserPrompt = UserPrompt;
window.UserPromptInput = UserPromptInput;
window.UserPromptPassword = UserPromptPassword;
if (window.WidgetRegistry) {
    WidgetRegistry.register('user_prompt', {
        label: 'User Prompt',
        category: 'dialogs',
        container: false,
        options: [
            { name: 'variant', type: 'select', default: 'question', choices: ['question', 'input', 'password'] },
            { name: 'button_label', type: 'string', default: 'Open prompt' },
            { name: 'title', type: 'string', default: 'Confirm' },
            { name: 'text', type: 'string', default: 'Do you want to continue?' },
            { name: 'allow_html', type: 'bool', default: false },
            { name: 'closable', type: 'bool', default: true },
            { name: 'options', type: 'json', default: { 'Yes': true, 'No': false } },
            { name: 'timeout', type: 'number', default: 60 },
            { name: 'input_placeholder', type: 'string', default: 'Type here' }
        ],
        build: (host, options) => {
            let classes = { question: UserPrompt, input: UserPromptInput, password: UserPromptPassword };
            let prompt_class = classes[options.variant] || UserPrompt;
            UserPrompt.ensure_css();
            let launcher = document.createElement('button');
            launcher.type = 'button';
            launcher.className = 'up_launch';
            launcher.textContent = options.button_label || 'Open prompt';
            launcher.addEventListener('click', () => {
                let config = Object.assign({}, options);
                if (typeof config.options === 'string') {
                    try {
                        config.options = JSON.parse(config.options);
                    } catch (error) {
                        console.error('[user_prompt] invalid options json', error);
                        config.options = null;
                    }
                }
                config.timeout = Number(config.timeout);
                config.on_answer = (value, label) => console.log('[user_prompt] answered: ' + label);
                prompt_class.ask(config);
            });
            host.appendChild(launcher);
            return launcher;
        }
    });
}
