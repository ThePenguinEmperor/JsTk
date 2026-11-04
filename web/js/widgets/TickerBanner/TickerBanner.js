/**
 * TickerBanner: slim notification bar scrolling messages like a news ticker, with a restore strip
 * after dismiss and a hover hint popup that right-click pins.
 */
class TickerBanner {
    static _style_ready = false;
    static _css_href = TickerBanner.find_css_href();
    static ICONS = {
        error: '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="8" cy="8" r="6.5"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5"/></svg>',
        info: '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="8" cy="8" r="6.5"/><path d="M8 7.5v4M8 4.6v.2"/></svg>',
        warning: '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 1.8L15 14H1z"/><path d="M8 6.5v3.5M8 12v.2"/></svg>',
        close: '<svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>'
    };
    static NOUNS = { error: ['error', 'errors'], info: ['notice', 'notices'], warning: ['warning', 'warnings'] };

    /**
     * Stores configuration; nothing is built until render().
     * @param {Object} config - severity ('info', 'warning', 'error'), on_right_click(messages, event),
     *     actions [{ label, icon (HTML), title, on_click(event, banner) }].
     */
    constructor(container, config = {}) {
        let cfg = config || {};
        let severity = cfg.severity === undefined ? 'warning' : cfg.severity;
        this.container = container;
        this.severity = severity;
        this._color_kind = severity === 'error' || severity === 'warning' ? severity : 'info';
        this._icon_kind = severity === 'error' || severity === 'info' ? severity : 'warning';
        this.on_right_click = typeof cfg.on_right_click === 'function' ? cfg.on_right_click : null;
        this.actions = Array.isArray(cfg.actions) ? cfg.actions : [];
        this._messages = [];
        this._theme = null;
        this._banner = null;
        this._text_area = null;
        this._scroll = null;
        this._restore_strip = null;
        this._restore_label = null;
        this._hint = null;
        this._pinned = false;
        this._outside_handler = null;
    }

    // #region styles
    /**
     * Returns the stylesheet URL next to this script, or the default project path.
     */
    static find_css_href() {
        let src = document.currentScript ? document.currentScript.src : '';
        if (/\/TickerBanner\.js(\?.*)?$/.test(src)) {
            return src.replace(/\.js(\?.*)?$/, '.css');
        }
        return 'web/js/widgets/TickerBanner/TickerBanner.css';
    }

    /**
     * Adds the widget stylesheet (id tb_style) to the head once per page.
     */
    static ensure_style() {
        if (TickerBanner._style_ready || document.getElementById('tb_style')) {
            TickerBanner._style_ready = true;
            return;
        }
        let link = document.createElement('link');
        link.id = 'tb_style';
        link.rel = 'stylesheet';
        link.href = TickerBanner._css_href;
        document.head.appendChild(link);
        TickerBanner._style_ready = true;
    }
    // #endregion styles

    // #region rendering
    /**
     * Builds the banner and restore strip in the container and the hint popup in document.body.
     */
    render() {
        TickerBanner.ensure_style();
        let severity_class = ' tb_sev_' + this._color_kind;
        this._banner = this._make('div', 'tb_banner tb_hidden' + severity_class);
        this._banner.appendChild(this._make('span', 'tb_icon', TickerBanner.ICONS[this._icon_kind]));
        this._text_area = this._make('div', 'tb_text');
        this._scroll = this._make('span', 'tb_scroll');
        this._text_area.appendChild(this._scroll);
        this._banner.appendChild(this._text_area);
        for (let action of this.actions) {
            this._banner.appendChild(this._build_action(action));
        }
        let dismiss = this._make('button', 'tb_dismiss', TickerBanner.ICONS.close);
        dismiss.type = 'button';
        dismiss.title = 'Dismiss';
        dismiss.addEventListener('click', () => this.dismiss());
        this._banner.appendChild(dismiss);
        this._restore_strip = this._make('div', 'tb_restore tb_hidden' + severity_class);
        this._restore_strip.appendChild(this._make('span', 'tb_icon', TickerBanner.ICONS[this._icon_kind]));
        this._restore_label = this._make('span', 'tb_restore_label');
        this._restore_strip.appendChild(this._restore_label);
        this._hint = this._make('div', 'tb_hint' + severity_class);
        this._hint.style.zIndex = String(typeof window.get_next_z_index === 'function' ? window.get_next_z_index() : 10000);
        this._text_area.addEventListener('mouseenter', () => this._show_hint(this._banner, false));
        this._text_area.addEventListener('mouseleave', () => this._hide_hint(false));
        this._text_area.addEventListener('contextmenu', event => this._on_context(event, this._banner));
        this._restore_strip.addEventListener('click', () => this.restore());
        this._restore_strip.addEventListener('contextmenu', event => this._on_context(event, this._restore_strip));
        this.container.appendChild(this._banner);
        this.container.appendChild(this._restore_strip);
        document.body.appendChild(this._hint);
        if (this._theme) {
            ThemeManager.apply(this._hint, this._theme);
        }
        return this;
    }

    /**
     * Creates an element with a class and optional inner HTML.
     */
    _make(tag, class_name, html) {
        let el = document.createElement(tag);
        el.className = class_name;
        if (html) {
            el.innerHTML = html;
        }
        return el;
    }

    /**
     * Creates a host action button; clicks call on_click(event, banner) and do not bubble.
     */
    _build_action(action) {
        let btn = this._make('button', 'tb_action');
        btn.type = 'button';
        if (action.icon) {
            btn.innerHTML = action.icon;
            if (action.label) {
                btn.appendChild(document.createTextNode(' ' + action.label));
            }
        } else {
            btn.textContent = action.label || '';
        }
        if (action.title) {
            btn.title = action.title;
        }
        btn.addEventListener('click', event => {
            event.stopPropagation();
            if (typeof action.on_click === 'function') {
                action.on_click(event, this);
            }
        });
        return btn;
    }

    /**
     * Writes the joined message line and restarts the scroll animation from the right edge.
     */
    _restart_ticker() {
        let text = this._messages.join('    ' + String.fromCharCode(0x2502) + '    ');
        this._scroll.textContent = text;
        this._scroll.style.animation = 'none';
        void this._scroll.offsetWidth;
        this._scroll.style.animation = 'tb_scroll ' + Math.max(20, Math.round(text.length * 0.28)) + 's linear infinite';
        this._scroll.style.animationPlayState = 'running';
    }

    /**
     * Updates the restore strip label, for example "2 warnings - click to show".
     */
    _update_restore_label() {
        let count = this._messages.length;
        let nouns = TickerBanner.NOUNS[this._icon_kind];
        this._restore_label.textContent = count + ' ' + (count === 1 ? nouns[0] : nouns[1]) + ' ' + String.fromCharCode(0x2014) + ' click to show';
    }
    // #endregion rendering

    // #region public_api
    /**
     * True while the banner bar is shown.
     */
    get is_visible() {
        return !!this._banner && !this._banner.classList.contains('tb_hidden');
    }

    /**
     * Shallow copy of the current messages.
     */
    get messages() {
        return this._messages.slice();
    }

    /**
     * Shows one message or a list; empty input behaves like hide(). Always un-dismisses.
     */
    show(messages) {
        if (!this._banner) {
            return this;
        }
        let list = (Array.isArray(messages) ? messages : [messages]).filter(item => typeof item === 'string' && item !== '');
        if (!list.length) {
            return this.hide();
        }
        this._messages = list;
        this._restart_ticker();
        this._banner.classList.remove('tb_hidden');
        this._restore_strip.classList.add('tb_hidden');
        return this;
    }

    /**
     * Clears messages, hides banner and restore strip and force-closes the hint.
     */
    hide() {
        this._messages = [];
        if (this._banner) {
            this._banner.classList.add('tb_hidden');
            this._restore_strip.classList.add('tb_hidden');
            this._hide_hint(true);
        }
        return this;
    }

    /**
     * Hides the banner and, when messages exist, shows the restore strip.
     */
    dismiss() {
        if (!this._banner) {
            return this;
        }
        this._banner.classList.add('tb_hidden');
        if (this._messages.length) {
            this._update_restore_label();
            this._restore_strip.classList.remove('tb_hidden');
        }
        this._hide_hint(true);
        return this;
    }

    /**
     * Brings the banner back from the restore strip when messages exist.
     */
    restore() {
        if (this._banner && this._messages.length) {
            this._banner.classList.remove('tb_hidden');
            this._restore_strip.classList.add('tb_hidden');
        }
        return this;
    }

    /**
     * Applies a preset name or CSS variable object to the container and the body-level hint.
     */
    set_theme(theme) {
        if (!window.ThemeManager || !ThemeManager.resolve(theme)) {
            return;
        }
        this._theme = theme;
        ThemeManager.apply(this.container, theme);
        if (this._hint) {
            ThemeManager.apply(this._hint, theme);
        }
    }
    // #endregion public_api

    // #region hint_popup
    /**
     * Fills and positions the hint below an anchor element; pinned hints become interactive.
     */
    _show_hint(anchor, pinned) {
        if (!this._messages.length || (this._pinned && !pinned)) {
            return;
        }
        this._hint.replaceChildren();
        for (let message of this._messages) {
            let line = this._make('div', 'tb_hint_line');
            line.textContent = message;
            this._hint.appendChild(line);
        }
        if (pinned) {
            let note = this._make('div', 'tb_hint_note');
            note.textContent = 'Click anywhere to close';
            this._hint.appendChild(note);
        }
        this._hint.classList.toggle('tb_hint_pinned', pinned);
        this._hint.classList.add('tb_hint_open');
        let rect = anchor.getBoundingClientRect();
        let width = this._hint.offsetWidth;
        let left = Math.min(rect.left, window.innerWidth - 8 - width);
        this._hint.style.left = Math.max(8, left) + 'px';
        this._hint.style.top = (rect.bottom + 4) + 'px';
    }

    /**
     * Hides the hint; a pinned hint closes only when forced, which also resumes the ticker.
     */
    _hide_hint(force) {
        if (this._pinned && !force) {
            return;
        }
        this._hint.classList.remove('tb_hint_open', 'tb_hint_pinned');
        if (this._pinned) {
            this._pinned = false;
            this._scroll.style.animationPlayState = 'running';
        }
        if (this._outside_handler) {
            document.removeEventListener('mousedown', this._outside_handler, true);
            this._outside_handler = null;
        }
    }

    /**
     * Pins the hint below the anchor, pauses the ticker and calls on_right_click.
     */
    _on_context(event, anchor) {
        event.preventDefault();
        if (!this._messages.length) {
            return;
        }
        this._pinned = false;
        this._show_hint(anchor, true);
        this._pinned = true;
        this._scroll.style.animationPlayState = 'paused';
        if (!this._outside_handler) {
            this._outside_handler = down_event => {
                if (!this._hint.contains(down_event.target)) {
                    this._hide_hint(true);
                }
            };
            document.addEventListener('mousedown', this._outside_handler, true);
        }
        if (this.on_right_click) {
            this.on_right_click(this._messages.slice(), event);
        }
    }
    // #endregion hint_popup
}

window.TickerBanner = TickerBanner;
if (window.WidgetRegistry) {
    WidgetRegistry.register('ticker_banner', {
        label: 'Ticker Banner',
        category: 'display',
        container: false,
        options: [
            { name: 'severity', type: 'select', choices: ['info', 'warning', 'error'], default: 'warning' },
            {
                name: 'messages',
                type: 'json',
                default: ['Build server maintenance tonight at 22:00', 'Disk usage on node 3 is above 85 percent']
            }
        ],
        build: (host, options) => {
            host.style.minWidth = '360px';
            return new TickerBanner(host, { severity: options.severity }).render().show(options.messages);
        }
    });
}
