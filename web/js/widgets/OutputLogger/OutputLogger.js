/**
 * OutputLogger: console-style log viewer exposed as the output-logger custom element and a wrapper class.
 * Supports ANSI colors, auto-scroll, search with match navigation, type filters, streaming and range paging.
 */

// #region output_logger_element
/**
 * Custom element behind the output-logger tag; holds all logger state and UI.
 */
class OutputLoggerElement extends HTMLElement {
    static SCRIPT_URL = document.currentScript ? document.currentScript.src : '';
    static KNOWN_TYPES = ['stdout', 'stderr', 'info', 'warning', 'error'];
    static FILTER_TYPES = ['stdout', 'stderr', 'info'];
    static VIRTUAL_TRACK = 1000000;
    static ANSI_COLORS = {
        30: '#767ca3', 31: '#e5484d', 32: '#12a46a', 33: '#e0954a', 34: '#5aa3c4', 35: '#9a6cc4', 36: '#4fb8c0', 37: '#c9cdd4',
        90: '#a3a9d6', 91: '#e0625b', 92: '#5fb37a', 93: '#d4b64e', 94: '#9cc7da', 95: '#b48ad6', 96: '#8fd3d8', 97: '#eef0f3'
    };
    static VGA_COLORS = [
        '#000000', '#aa0000', '#00aa00', '#aa5500', '#0000aa', '#aa00aa', '#00aaaa', '#aaaaaa',
        '#555555', '#ff5555', '#55ff55', '#ffff55', '#5555ff', '#ff55ff', '#55ffff', '#ffffff'
    ];
    static ICONS = {
        search: '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5l3.5 3.5"/></svg>',
        up: '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3.5 10l4.5-4.5 4.5 4.5"/></svg>',
        down: '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3.5 6l4.5 4.5 4.5-4.5"/></svg>',
        select_all: '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="12" height="12" rx="1" stroke-dasharray="2 1.5"/><rect x="5" y="5" width="6" height="6"/></svg>',
        copy: '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="5" width="8.5" height="9" rx="1"/><path d="M3 11V2.5h7.5"/></svg>',
        trash: '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2.5 4h11M6 4V2.5h4V4M4 4l.8 9.5h6.4L12 4"/></svg>'
    };

    /**
     * Sets default configuration and empty state; the UI is built on attach.
     */
    constructor() {
        super();
        this.config = {
            title: 'Output Logger',
            auto_scroll: true,
            max_spans: 100,
            on_clear: null,
            host_clear: null,
            extra_context_menu_items: null,
            max_entries: 5000,
            prune_count: 1000,
            enable_ctrl_wheel_zoom: false,
            enable_ctrl_f_search: false,
            virtual_scroll: false,
            on_request_range: null,
            window_rows: 2000,
            overscan_rows: 200,
            on_position_change: null
        };
        this.auto_scroll = true;
        this.ui = null;
        this.entries = [];
        this.menu = null;
        this.menu_warned = false;
        this.status_text = 'Awaiting action';
        this.status_mode = 'idle';
        this.status_timer = null;
        this.reset_view_state();
    }

    // #region lifecycle
    /**
     * Resets search, scroll and paging state.
     */
    reset_view_state() {
        this.pending = null;
        this.search_term = '';
        this.hidden_types = new Set();
        this.matches = [];
        this.current_match = -1;
        this.scroll_frame = 0;
        this.scroll_timer = null;
        this.programmatic = false;
        this.programmatic_token = 0;
        this.user_intent_until = 0;
        this.last_scroll_top = 0;
        this.range = OutputLoggerElement.new_range_state();
    }

    /**
     * Returns empty range-paging state; the bottom edge starts exhausted because the first page is the newest.
     */
    static new_range_state() {
        return {
            top_cursor: null,
            bottom_cursor: null,
            top_done: false,
            bottom_done: true,
            position: 0,
            total: 0,
            in_flight: false,
            pending_eval: false
        };
    }

    /**
     * Builds the UI on attach; a re-attach rebuilds it and drops displayed lines.
     */
    connectedCallback() {
        let early_entries = this.ui ? [] : this.entries;
        this.reset_view_state();
        this.entries = [];
        this.build_ui();
        if (early_entries.length) {
            this.push_entries(early_entries);
        }
        if (typeof this.config.on_request_range === 'function') {
            requestAnimationFrame(() => this.evaluate_range());
        }
    }

    /**
     * Cancels timers and frames when the element leaves the document.
     */
    disconnectedCallback() {
        if (this.scroll_frame) {
            cancelAnimationFrame(this.scroll_frame);
            this.scroll_frame = 0;
        }
        clearTimeout(this.scroll_timer);
        clearTimeout(this.status_timer);
    }

    /**
     * Links the widget stylesheet once per page, resolved next to this script.
     */
    static ensure_css() {
        if (document.getElementById('ol_css')) {
            return;
        }
        let link = document.createElement('link');
        link.id = 'ol_css';
        link.rel = 'stylesheet';
        link.href = OutputLoggerElement.SCRIPT_URL ? new URL('OutputLogger.css', OutputLoggerElement.SCRIPT_URL).href : 'web/js/widgets/OutputLogger/OutputLogger.css';
        document.head.appendChild(link);
    }

    /**
     * Creates the card, header, search row and output area, then binds events.
     */
    build_ui() {
        OutputLoggerElement.ensure_css();
        this.classList.add('ol_host');
        this.innerHTML = '';
        let ui = {};
        let make = (tag, class_name, parent, text) => {
            let el = document.createElement(tag);
            el.className = class_name;
            if (text !== undefined) {
                el.textContent = text;
            }
            parent.appendChild(el);
            return el;
        };
        ui.card = make('div', 'ol_card', this);
        ui.header = make('div', 'ol_header', ui.card);
        ui.title_row = make('div', 'ol_title_row', ui.header);
        ui.title = make('span', 'ol_title', ui.title_row, this.config.title);
        ui.status = make('span', 'ol_status ol_status_' + this.status_mode, ui.title_row, this.status_text);
        ui.controls = make('div', 'ol_controls', ui.title_row);
        this.ui = ui;
        this.build_toggle(ui.controls);
        ui.search_btn = make('button', 'ol_icon_btn', ui.controls);
        ui.search_btn.type = 'button';
        ui.search_btn.title = 'Search / filter log output';
        ui.search_btn.innerHTML = OutputLoggerElement.ICONS.search;
        ui.clear_btn = make('button', 'ol_clear_btn', ui.controls, 'Clear');
        ui.clear_btn.type = 'button';
        ui.search_row = make('div', 'ol_search_row', ui.header);
        ui.pills = {};
        for (let type of OutputLoggerElement.FILTER_TYPES) {
            ui.pills[type] = make('button', 'ol_pill ol_pill_' + type, ui.search_row, type);
            ui.pills[type].type = 'button';
            ui.pills[type].title = 'Toggle ' + type + ' messages';
        }
        ui.input = make('input', 'ol_search_input', ui.search_row);
        ui.input.type = 'text';
        ui.input.placeholder = 'Search output...';
        ui.input.setAttribute('autocomplete', 'off');
        ui.clear_filter = make('button', 'ol_nav_btn', ui.search_row, 'x');
        ui.clear_filter.type = 'button';
        ui.clear_filter.title = 'Clear filter';
        ui.prev_btn = make('button', 'ol_nav_btn', ui.search_row);
        ui.prev_btn.title = 'Previous match (Shift+Enter)';
        ui.prev_btn.innerHTML = OutputLoggerElement.ICONS.up;
        ui.next_btn = make('button', 'ol_nav_btn', ui.search_row);
        ui.next_btn.title = 'Next match (Enter)';
        ui.next_btn.innerHTML = OutputLoggerElement.ICONS.down;
        ui.count = make('span', 'ol_match_count', ui.search_row);
        ui.output = make('div', 'ol_output', ui.card);
        ui.output.tabIndex = 0;
        ui.top_spacer = make('div', 'ol_spacer', ui.output);
        ui.lines = make('div', 'ol_lines', ui.output);
        ui.bottom_spacer = make('div', 'ol_spacer', ui.output);
        this.bind_ui_events();
        this.update_count();
    }

    /**
     * Adds the auto-scroll ToggleSwitch, or a plain checkbox when ToggleSwitch is not loaded.
     */
    build_toggle(parent) {
        if (window.ToggleSwitch) {
            this.ui.toggle = new ToggleSwitch(parent, {
                label: 'Auto-scroll',
                checked: this.auto_scroll,
                on_change: is_on => this.set_auto_scroll(is_on)
            });
            return;
        }
        let label = document.createElement('label');
        label.className = 'ol_toggle_fallback';
        this.ui.toggle_box = document.createElement('input');
        this.ui.toggle_box.type = 'checkbox';
        this.ui.toggle_box.checked = this.auto_scroll;
        this.ui.toggle_box.addEventListener('change', () => this.set_auto_scroll(this.ui.toggle_box.checked));
        label.appendChild(this.ui.toggle_box);
        label.appendChild(document.createTextNode('Auto-scroll'));
        parent.appendChild(label);
    }

    /**
     * Wires header buttons, search input, pills, output scrolling, zoom, Ctrl+F and the context menu.
     */
    bind_ui_events() {
        let ui = this.ui;
        let mark_user = () => {
            this.user_intent_until = performance.now() + 400;
        };
        ui.search_btn.addEventListener('click', () => (ui.search_row.classList.contains('ol_open') ? this.close_search() : this.open_search()));
        ui.clear_btn.addEventListener('click', () => this.handle_clear());
        ui.input.addEventListener('input', () => this.set_search_term(ui.input.value));
        ui.input.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.navigate_match(e.shiftKey ? -1 : 1);
            }
        });
        ui.clear_filter.addEventListener('click', () => {
            ui.input.value = '';
            this.set_search_term('');
            ui.input.focus();
        });
        ui.prev_btn.addEventListener('click', () => this.navigate_match(-1));
        ui.next_btn.addEventListener('click', () => this.navigate_match(1));
        for (let type of Object.keys(ui.pills)) {
            ui.pills[type].addEventListener('click', () => this.toggle_type(type));
        }
        ui.output.addEventListener('scroll', () => this.handle_scroll());
        ui.output.addEventListener('wheel', e => {
            mark_user();
            this.handle_wheel_zoom(e);
        }, { passive: false });
        for (let name of ['touchmove', 'keydown', 'pointerdown']) {
            ui.output.addEventListener(name, mark_user, { passive: true });
        }
        ui.output.addEventListener('contextmenu', e => this.handle_context_menu(e));
        this.addEventListener('keydown', e => {
            if (this.config.enable_ctrl_f_search && (e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === 'f') {
                e.preventDefault();
                this.open_search(ui.input.value);
            }
        });
    }
    // #endregion lifecycle

    // #region public_api
    /**
     * Shallow-merges config; updates the title and applies auto_scroll when given.
     */
    initialize(config) {
        let cfg = config || {};
        Object.assign(this.config, cfg);
        if (this.ui) {
            this.ui.title.textContent = this.config.title;
        }
        if ('auto_scroll' in cfg) {
            this.set_auto_scroll(cfg.auto_scroll);
        }
        if (this.ui && typeof cfg.on_request_range === 'function') {
            this.evaluate_range();
        }
    }

    /**
     * Appends one line of the given type; options.partial streams into the in-progress line.
     */
    add_output(text, log_type = 'stdout', options = {}) {
        if (options && options.partial) {
            this.append_to_last_output(text, log_type);
            return;
        }
        let clean = OutputLoggerElement.strip_newlines(text);
        if (!clean) {
            return;
        }
        this.push_entries([this.make_entry(clean, log_type)]);
    }

    /**
     * Streams a chunk into the in-progress line of the same type; a trailing newline finalizes it.
     */
    append_to_last_output(chunk, log_type = 'stdout') {
        if (chunk === null || chunk === undefined || chunk === '') {
            return;
        }
        let text = String(chunk);
        let piece = OutputLoggerElement.strip_newlines(text);
        let type = OutputLoggerElement.normalize_type(log_type);
        let pending = this.pending;
        if (pending && pending.type === type && this.entries.includes(pending)) {
            pending.text += piece;
            pending.plain = OutputLoggerElement.strip_ansi(pending.text);
            pending.mode = null;
            this.paint_entry(pending);
            this.refresh_matches();
            this.schedule_scroll_bottom();
        } else if (piece) {
            let entry = this.make_entry(piece, type);
            this.push_entries([entry]);
            this.pending = entry;
        }
        if (/[\r\n]$/.test(text)) {
            this.pending = null;
        }
    }

    /**
     * Removes every line and resets matches and paging state; the search term is kept.
     */
    clear_output() {
        let term = this.search_term;
        let hidden = this.hidden_types;
        if (this.scroll_frame) {
            cancelAnimationFrame(this.scroll_frame);
        }
        clearTimeout(this.scroll_timer);
        this.reset_view_state();
        this.search_term = term;
        this.hidden_types = hidden;
        this.entries = [];
        if (this.ui) {
            this.ui.lines.innerHTML = '';
            this.update_spacers();
            this.update_count();
        }
    }

    /**
     * Sets the hidden status label text and mode (idle, running, success, error).
     */
    update_status(text, mode = 'idle') {
        this.status_text = text === null || text === undefined ? '' : String(text);
        this.status_mode = mode || 'idle';
        if (this.ui) {
            this.ui.status.textContent = this.status_text;
            this.ui.status.className = 'ol_status ol_status_' + this.status_mode;
        }
    }

    /**
     * Turns auto-scroll on or off, syncs the toggle, and scrolls to the bottom when enabling.
     */
    set_auto_scroll(enabled) {
        this.auto_scroll = !!enabled;
        if (this.ui && this.ui.toggle && typeof this.ui.toggle.set_value === 'function') {
            this.ui.toggle.set_value(this.auto_scroll);
        }
        if (this.ui && this.ui.toggle_box) {
            this.ui.toggle_box.checked = this.auto_scroll;
        }
        if (this.auto_scroll) {
            this.scroll_to_bottom();
        }
    }

    /**
     * Shows the search row with the given term and focuses the input.
     */
    open_search(initial_term = '') {
        if (!this.ui) {
            return;
        }
        this.ui.search_row.classList.add('ol_open');
        this.ui.search_btn.classList.add('ol_active');
        this.ui.input.value = initial_term || '';
        this.ui.input.focus();
        if (initial_term) {
            this.set_search_term(initial_term);
        }
    }

    /**
     * Hides the search row and clears the term; type filters stay in effect.
     */
    close_search() {
        if (!this.ui) {
            return;
        }
        this.ui.search_row.classList.remove('ol_open');
        this.ui.search_btn.classList.remove('ol_active');
        this.ui.input.value = '';
        this.set_search_term('');
    }

    /**
     * Sets output font family and/or size; null arguments leave that property unchanged.
     */
    set_font(family, size) {
        if (family !== null && family !== undefined) {
            this.style.setProperty('--log_font_family', family);
        }
        if (size !== null && size !== undefined) {
            this.set_font_size(size);
        }
    }

    /**
     * Sets the output font size; numbers are pixels, strings are used verbatim.
     */
    set_font_size(px) {
        let value = typeof px === 'number' ? px + 'px' : String(px);
        this.style.setProperty('--log_font_size', value);
    }

    /**
     * Scrolls to the newest rendered line without counting as a user scroll.
     */
    scroll_to_bottom() {
        if (!this.ui) {
            return;
        }
        let out = this.ui.output;
        let target = out.scrollHeight;
        if (this.config.virtual_scroll) {
            target = this.ui.top_spacer.offsetHeight + this.ui.lines.offsetHeight - out.clientHeight;
        }
        this.set_scroll_top(Math.max(0, target));
    }

    /**
     * Replaces the range paging callback and evaluates whether a page is needed.
     */
    set_range_source(on_request_range) {
        this.config.on_request_range = on_request_range;
        if (this.ui) {
            this.evaluate_range();
        }
    }

    /**
     * Re-fetches the current window with a jump request at the current position.
     */
    refresh_range() {
        this.request_range('at', this.range.position);
    }

    /**
     * Requests a jump to a host position.
     */
    scroll_to_position(position) {
        this.request_range('at', position);
    }

    /**
     * Returns {position, total, rows_rendered}.
     */
    get_position() {
        return { position: this.range.position, total: this.range.total, rows_rendered: this.entries.length };
    }
    // #endregion public_api

    // #region lines
    /**
     * Creates an entry record for a line of text.
     */
    make_entry(text, log_type, extra) {
        return Object.assign({
            text: text,
            plain: OutputLoggerElement.strip_ansi(text),
            type: OutputLoggerElement.normalize_type(log_type),
            el: null,
            mode: null
        }, extra || {});
    }

    /**
     * Strips the script_ prefix from a type; missing types become stdout.
     */
    static normalize_type(log_type) {
        let type = log_type ? String(log_type) : 'stdout';
        return type.startsWith('script_') ? type.slice(7) : type;
    }

    /**
     * Removes trailing newline and carriage-return characters.
     */
    static strip_newlines(text) {
        if (text === null || text === undefined) {
            return '';
        }
        return String(text).replace(/[\r\n]+$/, '');
    }

    /**
     * Creates the DOM element for an entry and paints it.
     */
    create_line_el(entry) {
        let known = OutputLoggerElement.KNOWN_TYPES.includes(entry.type);
        entry.el = document.createElement('div');
        entry.el.className = 'ol_line ol_type_' + (known ? entry.type : 'stdout');
        entry.mode = null;
        this.paint_entry(entry);
        return entry.el;
    }

    /**
     * Appends entries at the bottom, enforces the line cap and keeps auto-scroll and matches current.
     */
    push_entries(list) {
        if (!this.ui) {
            this.entries.push(...list);
            return;
        }
        this.insert_entries(list, false);
        this.enforce_cap();
        this.update_spacers();
        this.refresh_matches();
        this.schedule_scroll_bottom();
    }

    /**
     * Inserts entries at the top or bottom of the rendered lines.
     */
    insert_entries(list, at_top) {
        let frag = document.createDocumentFragment();
        for (let entry of list) {
            frag.appendChild(this.create_line_el(entry));
        }
        if (at_top) {
            this.ui.lines.insertBefore(frag, this.ui.lines.firstChild);
            this.entries = list.concat(this.entries);
        } else {
            this.ui.lines.appendChild(frag);
            this.entries = this.entries.concat(list);
        }
    }

    /**
     * Trims old lines past the cap: max_entries in normal mode, window plus overscan in virtual mode.
     */
    enforce_cap() {
        let c = this.config;
        if (c.virtual_scroll) {
            let cap = c.window_rows + 2 * c.overscan_rows;
            if (this.entries.length > cap) {
                this.trim_top(this.entries.length - cap);
            }
        } else if (this.entries.length > c.max_entries) {
            this.trim_top(Math.min(Math.max(1, c.prune_count, this.entries.length - c.max_entries), this.entries.length));
        }
    }

    /**
     * Removes n rows from the top; the new top row's cursor and position become the top edge.
     */
    trim_top(n) {
        let removed = this.entries.splice(0, n);
        this.drop_entries(removed);
        let top = this.entries[0];
        if (top && top.cursor_before !== undefined && top.cursor_before !== null) {
            this.range.top_cursor = top.cursor_before;
            this.range.top_done = false;
        }
        if (top && typeof top.position === 'number') {
            this.range.position = top.position;
        }
    }

    /**
     * Removes n rows from the bottom; the new bottom row's cursor becomes the bottom edge.
     */
    trim_bottom(n) {
        let removed = this.entries.splice(this.entries.length - n, n);
        this.drop_entries(removed);
        let bottom = this.entries[this.entries.length - 1];
        if (bottom && bottom.cursor_after !== undefined && bottom.cursor_after !== null) {
            this.range.bottom_cursor = bottom.cursor_after;
            this.range.bottom_done = false;
        }
    }

    /**
     * Detaches removed entries from the DOM and ends streaming if the in-progress line went away.
     */
    drop_entries(removed) {
        for (let entry of removed) {
            if (entry.el) {
                entry.el.remove();
            }
            if (entry === this.pending) {
                this.pending = null;
            }
        }
    }
    // #endregion lines

    // #region rendering
    /**
     * Escapes text for safe HTML insertion.
     */
    static escape_html(text) {
        return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    /**
     * Removes ANSI escape sequences and stray escape characters.
     */
    static strip_ansi(text) {
        return String(text).replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '').replace(/\x1b/g, '');
    }

    /**
     * Returns a CSS color for a 256-color palette index.
     */
    static color_256(index) {
        let n = Math.max(0, Math.min(255, index | 0));
        if (n < 16) {
            return OutputLoggerElement.VGA_COLORS[n];
        }
        if (n < 232) {
            let levels = [0, 95, 135, 175, 215, 255];
            let k = n - 16;
            return 'rgb(' + levels[Math.floor(k / 36)] + ',' + levels[Math.floor(k / 6) % 6] + ',' + levels[k % 6] + ')';
        }
        let gray = Math.round((n - 232) * 10.8);
        return 'rgb(' + gray + ',' + gray + ',' + gray + ')';
    }

    /**
     * Converts SGR codes from one escape sequence into style strings; null entries mean reset.
     */
    static sgr_styles(codes) {
        let styles = [];
        for (let i = 0; i < codes.length; i++) {
            let code = codes[i];
            if (code === 0) {
                styles.push(null);
            } else if (code === 1) {
                styles.push('font-weight:bold');
            } else if (code === 3) {
                styles.push('font-style:italic');
            } else if (code === 4) {
                styles.push('text-decoration:underline');
            } else if (code === 9) {
                styles.push('text-decoration:line-through');
            } else if (OutputLoggerElement.ANSI_COLORS[code]) {
                styles.push('color:' + OutputLoggerElement.ANSI_COLORS[code]);
            } else if ((code === 38 || code === 48) && codes[i + 1] === 5) {
                if (code === 38) {
                    styles.push('color:' + OutputLoggerElement.color_256(codes[i + 2]));
                }
                i += 2;
            } else if ((code === 38 || code === 48) && codes[i + 1] === 2) {
                if (code === 38) {
                    styles.push('color:rgb(' + (codes[i + 2] | 0) + ',' + (codes[i + 3] | 0) + ',' + (codes[i + 4] | 0) + ')');
                }
                i += 4;
            }
        }
        return styles;
    }

    /**
     * Renders ANSI-colored text as escaped HTML with nested style spans.
     */
    static ansi_to_html(text) {
        let pattern = /\x1b\[([0-9;?]*)([A-Za-z])/g;
        let html = '';
        let open = 0;
        let last = 0;
        let match = null;
        while ((match = pattern.exec(text)) !== null) {
            html += OutputLoggerElement.escape_html(text.slice(last, match.index).replace(/\x1b/g, ''));
            last = pattern.lastIndex;
            if (match[2] !== 'm') {
                continue;
            }
            let codes = match[1] === '' ? [0] : match[1].split(';').map(part => (part === '' ? 0 : parseInt(part, 10)));
            for (let style of OutputLoggerElement.sgr_styles(codes)) {
                if (style === null) {
                    html += '</span>'.repeat(open);
                    open = 0;
                } else {
                    html += '<span style="' + style + '">';
                    open += 1;
                }
            }
        }
        html += OutputLoggerElement.escape_html(text.slice(last).replace(/\x1b/g, ''));
        return html + '</span>'.repeat(open);
    }

    /**
     * Renders plain text with every case-insensitive occurrence of term wrapped in a mark.
     */
    static highlight_html(plain, term) {
        let lower = plain.toLowerCase();
        let html = '';
        let last = 0;
        let idx = lower.indexOf(term);
        while (idx !== -1) {
            html += OutputLoggerElement.escape_html(plain.slice(last, idx));
            html += '<mark class="ol_mark">' + OutputLoggerElement.escape_html(plain.slice(idx, idx + term.length)) + '</mark>';
            last = idx + term.length;
            idx = lower.indexOf(term, last);
        }
        return html + OutputLoggerElement.escape_html(plain.slice(last));
    }

    /**
     * True when the entry passes the type filters and the search term.
     */
    entry_visible(entry) {
        if (this.hidden_types.has(entry.type)) {
            return false;
        }
        return !this.search_term || entry.plain.toLowerCase().includes(this.search_term.toLowerCase());
    }

    /**
     * Updates an entry's visibility and renders it highlighted or ANSI-colored as needed.
     */
    paint_entry(entry) {
        if (!entry.el) {
            return;
        }
        let visible = this.entry_visible(entry);
        let term = this.search_term.toLowerCase();
        let mode = visible && term ? 'mark:' + term : 'ansi';
        entry.el.classList.toggle('ol_hidden', !visible);
        if (entry.mode === mode) {
            return;
        }
        entry.mode = mode;
        entry.el.innerHTML = mode === 'ansi' ? OutputLoggerElement.ansi_to_html(entry.text) : OutputLoggerElement.highlight_html(entry.plain, term);
    }
    // #endregion rendering

    // #region search
    /**
     * Sets the search term and re-applies filtering.
     */
    set_search_term(term) {
        this.search_term = String(term || '');
        this.apply_filter();
    }

    /**
     * Shows or hides a filterable type and re-applies filtering.
     */
    toggle_type(type) {
        if (this.hidden_types.has(type)) {
            this.hidden_types.delete(type);
        } else {
            this.hidden_types.add(type);
        }
        this.ui.pills[type].classList.toggle('ol_pill_off', this.hidden_types.has(type));
        this.apply_filter();
    }

    /**
     * Repaints all lines, resets the current match and brings the first match into view.
     */
    apply_filter() {
        if (!this.ui) {
            return;
        }
        for (let entry of this.entries) {
            this.paint_entry(entry);
        }
        this.matches = this.search_term ? [...this.ui.lines.querySelectorAll('mark.ol_mark')] : [];
        this.current_match = -1;
        if (this.matches.length) {
            this.scroll_to_mark(this.matches[0]);
        }
        this.update_count();
    }

    /**
     * Recollects match marks after lines change, keeping the current match when it still exists.
     */
    refresh_matches() {
        if (!this.ui || (!this.search_term && !this.hidden_types.size)) {
            return;
        }
        let current = this.matches[this.current_match] || null;
        this.matches = this.search_term ? [...this.ui.lines.querySelectorAll('mark.ol_mark')] : [];
        this.current_match = current ? this.matches.indexOf(current) : -1;
        this.update_count();
    }

    /**
     * Moves to the next (1) or previous (-1) match with wrap-around.
     */
    navigate_match(step) {
        let total = this.matches.length;
        if (!total) {
            return;
        }
        let old = this.matches[this.current_match];
        if (old) {
            old.classList.remove('ol_mark_current');
        }
        if (this.current_match < 0) {
            this.current_match = step > 0 ? 0 : total - 1;
        } else {
            this.current_match = (this.current_match + step + total) % total;
        }
        let mark = this.matches[this.current_match];
        mark.classList.add('ol_mark_current');
        this.scroll_to_mark(mark);
        this.update_count();
    }

    /**
     * Scrolls a match to the vertical center of the output instantly.
     */
    scroll_to_mark(mark) {
        let out = this.ui.output;
        let out_rect = out.getBoundingClientRect();
        let rect = mark.getBoundingClientRect();
        this.set_scroll_top(out.scrollTop + rect.top - out_rect.top - out.clientHeight / 2 + rect.height / 2);
        if (rect.left < out_rect.left || rect.right > out_rect.left + out.clientWidth) {
            out.scrollLeft += rect.left - out_rect.left - out.clientWidth / 2;
        }
    }

    /**
     * Updates the match counter label and the enabled state of the navigation buttons.
     */
    update_count() {
        let total = this.matches.length;
        let label = '';
        if (this.search_term) {
            if (!total) {
                label = 'no matches';
            } else if (this.current_match >= 0) {
                label = (this.current_match + 1) + ' / ' + total;
            } else {
                label = total + (total === 1 ? ' match' : ' matches');
            }
        } else if (this.hidden_types.size) {
            let visible = this.entries.filter(entry => this.entry_visible(entry)).length;
            label = visible < this.entries.length ? visible + ' / ' + this.entries.length : '';
        }
        this.ui.count.textContent = label;
        this.ui.prev_btn.disabled = !total;
        this.ui.next_btn.disabled = !total;
    }
    // #endregion search

    // #region scrolling
    /**
     * Sets scrollTop and flags the resulting scroll event as programmatic.
     */
    set_scroll_top(value) {
        let token = ++this.programmatic_token;
        this.programmatic = true;
        this.ui.output.scrollTop = value;
        requestAnimationFrame(() => requestAnimationFrame(() => {
            if (token === this.programmatic_token) {
                this.programmatic = false;
            }
        }));
    }

    /**
     * Scrolls to the bottom on the next frame, at most once per frame, while auto-scroll is on.
     */
    schedule_scroll_bottom() {
        if (!this.auto_scroll || this.scroll_frame || !this.ui) {
            return;
        }
        this.scroll_frame = requestAnimationFrame(() => {
            this.scroll_frame = 0;
            if (this.auto_scroll) {
                this.scroll_to_bottom();
            }
        });
    }

    /**
     * Applies the auto-scroll rules for user scrolls and debounces range paging.
     */
    handle_scroll() {
        let out = this.ui.output;
        let top = out.scrollTop;
        let bottom = this.config.virtual_scroll ? this.ui.top_spacer.offsetHeight + this.ui.lines.offsetHeight : out.scrollHeight;
        let distance = bottom - out.clientHeight - top;
        if (!this.programmatic) {
            let by_user = performance.now() < this.user_intent_until;
            if (by_user && this.auto_scroll && top < this.last_scroll_top && distance > 10) {
                this.set_auto_scroll(false);
            } else if (!this.auto_scroll && distance <= 10) {
                this.set_auto_scroll(true);
            }
        }
        this.last_scroll_top = top;
        if (typeof this.config.on_request_range === 'function') {
            clearTimeout(this.scroll_timer);
            this.scroll_timer = setTimeout(() => this.evaluate_range(), 150);
        }
    }

    /**
     * Changes the font size by one pixel per Ctrl+wheel step, clamped to 8-32px.
     */
    handle_wheel_zoom(e) {
        if (!e.ctrlKey || !this.config.enable_ctrl_wheel_zoom) {
            return;
        }
        e.preventDefault();
        let current = parseFloat(this.style.getPropertyValue('--log_font_size')) || 12;
        let next = Math.max(8, Math.min(32, current + (e.deltaY < 0 ? 1 : -1)));
        this.set_font_size(next);
    }
    // #endregion scrolling

    // #region range_paging
    /**
     * Decides from the scroll offset whether to page older, newer, or jump.
     */
    evaluate_range() {
        let r = this.range;
        if (typeof this.config.on_request_range !== 'function' || !this.ui) {
            return;
        }
        if (r.in_flight) {
            r.pending_eval = true;
            return;
        }
        let out = this.ui.output;
        let top = out.scrollTop;
        if (!this.config.virtual_scroll) {
            if (top <= 40 && !r.top_done) {
                this.request_range('older');
            }
            return;
        }
        let top_h = this.ui.top_spacer.offsetHeight;
        let rows_bottom = top_h + this.ui.lines.offsetHeight;
        let view_h = out.clientHeight;
        if (r.total > 0 && top + view_h <= top_h) {
            this.jump_to(top / Math.max(1, out.scrollHeight - view_h) * r.total);
        } else if (r.total > 0 && top >= rows_bottom && this.ui.bottom_spacer.offsetHeight > 0) {
            this.jump_to(this.window_end() + (top - rows_bottom) / OutputLoggerElement.VIRTUAL_TRACK * r.total);
        } else if (top - top_h <= 40 && !r.top_done) {
            this.request_range('older');
        } else if (rows_bottom - (top + view_h) <= 40 && !r.bottom_done) {
            this.request_range('newer');
        }
    }

    /**
     * Issues a jump request clamped to the dataset.
     */
    jump_to(position) {
        let clamped = Math.max(0, Math.min(this.range.total - 1, Math.floor(position)));
        this.request_range('at', clamped);
    }

    /**
     * Sends one range request at a time and applies its result.
     * @param {string} direction - 'older', 'newer' or 'at'.
     */
    async request_range(direction, position) {
        let callback = this.config.on_request_range;
        let r = this.range;
        if (typeof callback !== 'function' || r.in_flight) {
            return;
        }
        if ((direction === 'older' && r.top_done) || (direction === 'newer' && r.bottom_done)) {
            return;
        }
        let request = { cursor: null, direction: direction, count: this.config.window_rows };
        if (direction === 'older') {
            request.cursor = r.top_cursor;
        } else if (direction === 'newer') {
            request.cursor = r.bottom_cursor;
        } else {
            request.position = position;
        }
        r.in_flight = true;
        try {
            let result = await callback(request);
            if (result && this.ui && r === this.range) {
                this.apply_range(direction, result);
            }
        } catch (error) {
            console.warn('[output_logger] range_request_failed', error);
        } finally {
            r.in_flight = false;
            if (r.pending_eval && r === this.range) {
                r.pending_eval = false;
                this.evaluate_range();
            }
        }
    }

    /**
     * Builds an entry from a range result line; returns null for lines without text.
     */
    entry_from_range_line(line) {
        let source = typeof line === 'string' ? { text: line } : (line || {});
        let text = OutputLoggerElement.strip_newlines(source.text);
        if (!text) {
            return null;
        }
        let extra = { cursor_before: source.cursor_before, cursor_after: source.cursor_after };
        if (typeof source.position === 'number') {
            extra.position = source.position;
        }
        return this.make_entry(text, source.type || 'stdout', extra);
    }

    /**
     * Merges a range result into the view, trims to the virtual cap and keeps the viewport steady.
     * Older pages update only the top edge and newer pages only the bottom edge.
     */
    apply_range(direction, result) {
        let r = this.range;
        let c = this.config;
        let list = (Array.isArray(result.lines) ? result.lines : []).map(line => this.entry_from_range_line(line)).filter(Boolean);
        let anchor = direction === 'at' ? null : this.capture_anchor();
        let had_rows = this.entries.length > 0;
        if (direction === 'at') {
            this.drop_entries(this.entries);
            this.entries = [];
            r.top_cursor = result.prev_cursor === undefined ? null : result.prev_cursor;
            r.bottom_cursor = result.next_cursor === undefined ? null : result.next_cursor;
            r.top_done = r.top_cursor === null;
            r.bottom_done = r.bottom_cursor === null;
        } else if (direction === 'older' && 'prev_cursor' in result) {
            r.top_cursor = result.prev_cursor;
            r.top_done = result.prev_cursor === null || result.prev_cursor === undefined;
        } else if (direction === 'newer' && 'next_cursor' in result) {
            r.bottom_cursor = result.next_cursor;
            r.bottom_done = result.next_cursor === null || result.next_cursor === undefined;
        }
        this.insert_entries(list, direction === 'older');
        if (typeof result.position === 'number' && (direction !== 'newer' || !had_rows)) {
            r.position = result.position;
        }
        if (typeof result.total === 'number') {
            r.total = result.total;
        }
        if (this.entries[0] && typeof this.entries[0].position === 'number') {
            r.position = this.entries[0].position;
        }
        let excess = this.entries.length - (c.window_rows + 2 * c.overscan_rows);
        if (c.virtual_scroll && excess > 0) {
            if (direction === 'newer') {
                this.trim_top(excess);
            } else {
                this.trim_bottom(excess);
            }
        }
        this.update_spacers();
        if (direction === 'at' && c.virtual_scroll) {
            this.set_scroll_top(this.ui.top_spacer.offsetHeight);
        } else {
            this.restore_anchor(anchor);
        }
        this.refresh_matches();
        if (typeof c.on_position_change === 'function') {
            c.on_position_change(r.position, r.total);
        }
    }

    /**
     * Records the first visible row and its offset from the viewport top.
     */
    capture_anchor() {
        let top = this.ui.output.scrollTop;
        for (let entry of this.entries) {
            if (entry.el.offsetHeight && entry.el.offsetTop + entry.el.offsetHeight > top) {
                return { el: entry.el, offset: entry.el.offsetTop - top };
            }
        }
        return null;
    }

    /**
     * Scrolls so the anchor row sits at its recorded offset again.
     */
    restore_anchor(anchor) {
        if (anchor && anchor.el.isConnected) {
            this.set_scroll_top(anchor.el.offsetTop - anchor.offset);
        }
    }

    /**
     * Returns the host position just past the last held row.
     */
    window_end() {
        let last = this.entries[this.entries.length - 1];
        if (last && typeof last.position === 'number') {
            return last.position + last.text.length + 1;
        }
        return this.entries.reduce((sum, entry) => sum + entry.text.length + 1, this.range.position);
    }

    /**
     * Sizes the virtual spacers so the scrollbar represents the whole dataset.
     */
    update_spacers() {
        let r = this.range;
        let top_h = 0;
        let bottom_h = 0;
        if (this.config.virtual_scroll && r.total > 0) {
            let start = r.top_done ? 0 : r.position;
            let end = r.bottom_done ? r.total : this.window_end();
            top_h = start / r.total * OutputLoggerElement.VIRTUAL_TRACK;
            bottom_h = Math.max(0, (r.total - end) / r.total * OutputLoggerElement.VIRTUAL_TRACK);
        }
        this.ui.top_spacer.style.height = top_h + 'px';
        this.ui.bottom_spacer.style.height = bottom_h + 'px';
    }
    // #endregion range_paging

    // #region menu_and_clear
    /**
     * Opens the context menu with select, copy, clear and extra entries.
     */
    handle_context_menu(e) {
        if (!window.ContextMenu) {
            if (!this.menu_warned) {
                console.warn('[output_logger] ContextMenu widget not loaded; no right-click menu');
                this.menu_warned = true;
            }
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        let selection = window.getSelection();
        let selected_text = selection ? selection.toString() : '';
        let line_el = e.target && e.target.closest ? e.target.closest('.ol_line') : null;
        if (!this.menu) {
            this.menu = new ContextMenu(document.createElement('div'));
        }
        this.menu.set_items(this.build_menu_items(e.target, selected_text, line_el));
        this.menu.show(e.pageX, e.pageY);
    }

    /**
     * Builds the menu item list for a right-click.
     */
    build_menu_items(target, selected_text, line_el) {
        let icons = OutputLoggerElement.ICONS;
        let items = [
            { label: 'Select all', icon: icons.select_all, action: () => this.select_all() },
            { label: 'Copy', icon: icons.copy, action: () => this.copy_text(selected_text || (line_el ? line_el.textContent : '')) },
            { type: 'separator' },
            { label: 'Clear all', icon: icons.trash, action: () => this.handle_clear() }
        ];
        let extra = this.config.extra_context_menu_items;
        let list = extra;
        if (typeof extra === 'function') {
            try {
                list = extra(target);
            } catch (error) {
                console.warn('[output_logger] extra_context_menu_items failed', error);
                list = null;
            }
        }
        if (Array.isArray(list) && list.length) {
            items.push({ type: 'separator' }, ...list);
        }
        return items;
    }

    /**
     * Selects all text in the output area.
     */
    select_all() {
        let range = document.createRange();
        let selection = window.getSelection();
        range.selectNodeContents(this.ui.lines);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    /**
     * Copies text to the clipboard and briefly reports it in the status label.
     */
    async copy_text(text) {
        let copied = false;
        if (!text) {
            return;
        }
        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(text);
                copied = true;
            } catch (error) {
                copied = false;
            }
        }
        if (!copied) {
            let area = document.createElement('textarea');
            area.value = text;
            area.style.position = 'fixed';
            area.style.left = '-9999px';
            document.body.appendChild(area);
            area.select();
            try {
                copied = document.execCommand('copy');
            } catch (error) {
                copied = false;
            }
            area.remove();
        }
        if (copied) {
            this.update_status('Text copied to clipboard', 'success');
            clearTimeout(this.status_timer);
            this.status_timer = setTimeout(() => this.update_status('Awaiting action', 'idle'), 2000);
        }
    }

    /**
     * Clears via on_clear, else the optional host_clear hook, then clears the view.
     */
    async handle_clear() {
        let c = this.config;
        try {
            if (typeof c.on_clear === 'function') {
                await c.on_clear();
            } else if (typeof c.host_clear === 'function') {
                if ((await c.host_clear()) === false) {
                    console.warn('[output_logger] host_clear reported failure');
                }
            } else {
                console.warn('[output_logger] no clear API available; clearing view only');
            }
        } catch (error) {
            console.warn('[output_logger] clear_failed', error);
        }
        this.clear_output();
    }
    // #endregion menu_and_clear
}
// #endregion output_logger_element

// #region output_logger_wrapper
/**
 * Wrapper that creates an output-logger element and proxies its public methods.
 */
class OutputLogger {
    static PROXY_METHODS = [
        'initialize', 'add_output', 'append_to_last_output', 'clear_output', 'update_status', 'set_auto_scroll',
        'open_search', 'close_search', 'set_font', 'set_font_size', 'scroll_to_bottom', 'set_range_source',
        'refresh_range', 'scroll_to_position', 'get_position'
    ];

    /**
     * Creates a detached output-logger element and applies config when given.
     */
    constructor(config) {
        this.element = document.createElement('output-logger');
        if (config) {
            this.element.initialize(config);
        }
    }

    /**
     * Returns the element for the host to append.
     */
    render() {
        return this.element;
    }

    /**
     * Applies a theme preset or variables object to the element.
     */
    set_theme(theme) {
        if (window.ThemeManager) {
            ThemeManager.apply(this.element, theme);
        }
    }

    /**
     * Adds proxy methods that forward to the element with the same signature.
     */
    static install_proxies() {
        for (let name of OutputLogger.PROXY_METHODS) {
            OutputLogger.prototype[name] = function (...args) {
                return this.element[name](...args);
            };
        }
    }

    /**
     * Calls a method on the first output-logger in the document; does nothing when none exists.
     */
    static call_first(name, args) {
        let el = document.querySelector('output-logger');
        if (!el || typeof el[name] !== 'function') {
            return undefined;
        }
        return el[name](...args);
    }
}
// #endregion output_logger_wrapper

if (!customElements.get('output-logger')) {
    customElements.define('output-logger', OutputLoggerElement);
}
OutputLogger.install_proxies();
window.OutputLogger = OutputLogger;
window.logger_initialize = config => OutputLogger.call_first('initialize', [config]);
window.logger_add_output = (text, log_type) => OutputLogger.call_first('add_output', [text, log_type]);
window.logger_clear_ui_output = () => OutputLogger.call_first('clear_output', []);
window.logger_update_status = (text, mode) => OutputLogger.call_first('update_status', [text, mode]);

if (window.WidgetRegistry) {
    WidgetRegistry.register('output_logger', {
        label: 'Output Logger',
        category: 'display',
        container: false,
        options: [
            { name: 'title', type: 'string', default: 'Output Logger' },
            { name: 'auto_scroll', type: 'bool', default: true },
            { name: 'enable_ctrl_f_search', type: 'bool', default: true },
            { name: 'enable_ctrl_wheel_zoom', type: 'bool', default: true },
            { name: 'max_entries', type: 'number', default: 5000 },
            { name: 'prune_count', type: 'number', default: 1000 },
            { name: 'demo_output', type: 'bool', default: true }
        ],
        build: (host, options) => {
            let logger = new OutputLogger({
                title: options.title,
                auto_scroll: options.auto_scroll,
                enable_ctrl_f_search: options.enable_ctrl_f_search,
                enable_ctrl_wheel_zoom: options.enable_ctrl_wheel_zoom,
                max_entries: Number(options.max_entries) || 5000,
                prune_count: Number(options.prune_count) || 1000
            });
            if (!host.style.height) {
                host.style.height = '280px';
            }
            host.style.display = 'flex';
            host.style.flexDirection = 'column';
            host.appendChild(logger.render());
            if (options.demo_output) {
                logger.add_output('Starting build...', 'info');
                logger.add_output('\x1b[32mok\x1b[0m compiled 12 modules in 1.4s', 'stdout');
                logger.add_output('\x1b[1;33mwarn\x1b[0m unused variable in Parser.js', 'warning');
                logger.add_output('stderr: retrying connection (1/3)', 'stderr');
                logger.add_output('Fatal: config file missing', 'error');
                logger.append_to_last_output('Streaming chunk one, ', 'stdout');
                logger.append_to_last_output('chunk two.\n', 'stdout');
            }
            return logger;
        }
    });
}
