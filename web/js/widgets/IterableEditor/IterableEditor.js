/**
 * IterableEditor: editor for a list or dict of JSON-compatible values, as a modal popup
 * (Apply/Cancel, code panel, add form, nested child editors) or a compact inline list.
 * Accepts JSON and Python literal text. Exposed as window.IterableEditor.
 */
class IterableEditor {
    static CSS_URL = (document.currentScript && document.currentScript.src)
        ? document.currentScript.src.replace(/\.js(\?.*)?$/, '.css')
        : 'web/js/widgets/IterableEditor/IterableEditor.css';
    static GRIP_SVG = '<svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true">'
        + '<circle cx="3" cy="2" r="1.1" fill="currentColor"/><circle cx="7" cy="2" r="1.1" fill="currentColor"/>'
        + '<circle cx="3" cy="6" r="1.1" fill="currentColor"/><circle cx="7" cy="6" r="1.1" fill="currentColor"/>'
        + '<circle cx="3" cy="10" r="1.1" fill="currentColor"/><circle cx="7" cy="10" r="1.1" fill="currentColor"/></svg>';
    static CHEVRON_SVG = '<svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true"><path d="M2.5 1L5.5 4 2.5 7" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';

    /**
     * Stores the mode, a deep copy of the value and the config; renders nothing yet.
     * @param {HTMLElement|null} container - Inline host; also the set_theme target.
     * @param {string} mode - 'list'; anything else means dict.
     * @param {Object} config - display_mode, title, on_change, on_apply, show_item_numbers,
     *     item_number_base, custom_add_form_factory, row_renderer, validate_item.
     */
    constructor(container, mode, current_val, config) {
        this.container = container || null;
        this.mode = mode === 'list' ? 'list' : 'dict';
        this.config = config || {};
        this.is_inline = this.config.display_mode === 'inline';
        this.title = this.config.title || (this.mode === 'list' ? 'Edit list' : 'Edit dict');
        this.store = [];
        this._import(current_val);
        this.last_valid = this._export();
        this.els = null;
        this.menu = null;
        this.child = null;
        this.bulk = null;
        this.parent = null;
        this.crumb_label = '';
        this.on_closed = null;
        this.drag_from = null;
        this.theme_vars = null;
    }

    // #region public_api
    /**
     * Builds the popup or inline view; each call builds a new copy.
     */
    render() {
        IterableEditor.ensure_styles();
        if (this.is_inline) {
            this._build_inline();
        } else {
            this._build_popup();
        }
        return this;
    }

    /**
     * Same as render().
     */
    open() {
        return this.render();
    }

    /**
     * Closes open children, removes the popup without applying and drops element references.
     */
    close() {
        if (this.child) {
            this.child.close();
        }
        if (this.els && this.els.backdrop) {
            this.els.backdrop.remove();
        }
        this.els = null;
        this.menu = null;
        if (typeof this.on_closed === 'function') {
            let callback = this.on_closed;
            this.on_closed = null;
            callback();
        }
        return this;
    }

    /**
     * Deep copy of the current working data.
     */
    get data() {
        return this._export();
    }

    /**
     * List mode: validates and appends a value.
     */
    add(val) {
        if (this.mode === 'list' && this._validate(val, this.store.length)) {
            this.store.push(IterableEditor.clone(val));
            this._commit();
        }
        return this;
    }

    /**
     * Dict mode: validates and sets a key, keeping its position when it exists.
     */
    add_entry(key, val) {
        if (this.mode === 'dict' && this._validate(val, String(key))) {
            this._set_key(String(key), IterableEditor.clone(val));
            this._commit();
        }
        return this;
    }

    /**
     * Removes a list index or dict key; callbacks fire even when nothing was removed.
     */
    remove(idx_or_key) {
        let index = this._resolve_index(idx_or_key);
        if (index >= 0) {
            this.store.splice(index, 1);
        }
        this._commit();
        return this;
    }

    /**
     * Validates and replaces an existing item; unknown indices or keys are ignored.
     */
    edit(idx_or_key, new_val) {
        let index = this._resolve_index(idx_or_key);
        if (index >= 0 && this._validate(new_val, idx_or_key)) {
            this._set_at(index, IterableEditor.clone(new_val));
            this._commit();
        }
        return this;
    }

    /**
     * Moves an item so it ends at to_idx; out-of-range indices are ignored.
     */
    reorder(from_idx, to_idx) {
        let count = this.store.length;
        if (!(from_idx >= 0 && from_idx < count && to_idx >= 0 && to_idx < count)) {
            return this;
        }
        let moved = this.store.splice(from_idx, 1)[0];
        this.store.splice(to_idx, 0, moved);
        this._reset_add_form();
        this._commit();
        return this;
    }

    /**
     * Deep copy of the list; empty in dict mode.
     */
    get_list() {
        return this.mode === 'list' ? this._export() : [];
    }

    /**
     * Deep copy of the dict; empty in list mode.
     */
    get_dict() {
        return this.mode === 'dict' ? this._export() : {};
    }

    /**
     * Deep copy of the data for the current mode.
     */
    get_data() {
        return this._export();
    }

    /**
     * Applies theme variables to the container and the open popup; children inherit them.
     */
    set_theme(theme) {
        let vars = window.ThemeManager ? ThemeManager.resolve(theme) : null;
        if (!vars) {
            return;
        }
        this.theme_vars = Object.assign({}, this.theme_vars || {}, vars);
        ThemeManager.apply(this.container, this.theme_vars);
        ThemeManager.apply(this.els && this.els.backdrop, this.theme_vars);
    }

    /**
     * Adds the stylesheet link to the document head once per page.
     */
    static ensure_styles() {
        if (document.getElementById('ie_styles')) {
            return;
        }
        let link = document.createElement('link');
        link.id = 'ie_styles';
        link.rel = 'stylesheet';
        link.href = IterableEditor.CSS_URL;
        document.head.appendChild(link);
    }
    // #endregion public_api

    // #region value_text
    /**
     * JSON deep copy; undefined becomes null.
     */
    static clone(value) {
        return value === undefined ? null : JSON.parse(JSON.stringify(value));
    }

    /**
     * Converts Python literal words and single quotes to JSON syntax.
     */
    static python_to_json(text) {
        return text.replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false').replace(/\bNone\b/g, 'null').replace(/'/g, '"');
    }

    /**
     * Parses JSON, then Python literal syntax.
     * @returns {Object} { ok, value }.
     */
    static parse_strict(text) {
        let trimmed = String(text).trim();
        for (let candidate of [trimmed, IterableEditor.python_to_json(trimmed)]) {
            try {
                return { ok: true, value: JSON.parse(candidate) };
            } catch (error) {
                continue;
            }
        }
        return { ok: false, value: null };
    }

    /**
     * Parses typed text into a typed value, or keeps the trimmed text as a string.
     */
    static parse_loose(text) {
        let trimmed = String(text).trim();
        if (!trimmed) {
            return '';
        }
        let parsed = IterableEditor.parse_strict(trimmed);
        return parsed.ok ? parsed.value : trimmed;
    }

    /**
     * Text shown in editable inputs: None for null, raw strings, compact JSON for containers.
     */
    static to_input_text(value) {
        if (value === null || value === undefined) {
            return 'None';
        }
        if (typeof value === 'object') {
            return JSON.stringify(value).replace(/\bnull\b/g, 'None');
        }
        return String(value);
    }

    /**
     * Python literal form used by the code panel.
     */
    static to_python(value) {
        if (value === null || value === undefined) {
            return 'None';
        }
        if (typeof value === 'boolean') {
            return value ? 'True' : 'False';
        }
        if (typeof value === 'string') {
            return "'" + value.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
        }
        if (Array.isArray(value)) {
            return '[' + value.map(item => IterableEditor.to_python(item)).join(', ') + ']';
        }
        if (typeof value === 'object') {
            let parts = Object.entries(value).map(pair => IterableEditor.to_python(pair[0]) + ': ' + IterableEditor.to_python(pair[1]));
            return '{' + parts.join(', ') + '}';
        }
        return String(value);
    }

    /**
     * True for a non-null, non-array object.
     */
    static is_dict(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }
    // #endregion value_text

    // #region data_store
    /**
     * Loads a value into the store: values for list mode, [key, value] pairs for dict mode.
     */
    _import(value) {
        let copy = IterableEditor.clone(value);
        if (this.mode === 'list') {
            this.store = Array.isArray(copy) ? copy : [];
        } else {
            this.store = IterableEditor.is_dict(copy) ? Object.entries(copy) : [];
        }
    }

    /**
     * Returns a deep copy of the store as a list or a dict.
     */
    _export() {
        if (this.mode === 'list') {
            return IterableEditor.clone(this.store);
        }
        let result = {};
        for (let [key, value] of this.store) {
            result[key] = IterableEditor.clone(value);
        }
        return result;
    }

    /**
     * Returns the value at a visual position.
     */
    _value_at(index) {
        return this.mode === 'list' ? this.store[index] : this.store[index][1];
    }

    /**
     * Stores a value at a visual position.
     */
    _set_at(index, value) {
        if (this.mode === 'list') {
            this.store[index] = value;
        } else {
            this.store[index][1] = value;
        }
    }

    /**
     * Sets a dict key in place, or appends it.
     */
    _set_key(key, value) {
        let index = this.store.findIndex(pair => pair[0] === key);
        if (index >= 0) {
            this.store[index][1] = value;
        } else {
            this.store.push([key, value]);
        }
    }

    /**
     * Maps a list index or dict key to a store position, or -1.
     */
    _resolve_index(idx_or_key) {
        if (this.mode === 'list') {
            let valid = typeof idx_or_key === 'number' && idx_or_key >= 0 && idx_or_key < this.store.length;
            return valid ? idx_or_key : -1;
        }
        return this.store.findIndex(pair => pair[0] === String(idx_or_key));
    }

    /**
     * True when a value has the shape of this editor's mode.
     */
    _shape_ok(value) {
        return this.mode === 'list' ? Array.isArray(value) : IterableEditor.is_dict(value);
    }

    /**
     * Runs validate_item; a string result is the rejection message, any other non-accepting result is generic.
     */
    _validate(value, key) {
        let validator = this.config.validate_item;
        if (typeof validator !== 'function') {
            return true;
        }
        let result = true;
        try {
            result = validator(IterableEditor.clone(value), key);
        } catch (error) {
            console.warn('[iterable_editor] validator_failed', error);
            return true;
        }
        if (result === true || result === undefined || result === null) {
            return true;
        }
        let message = typeof result === 'string' ? result : 'Invalid value';
        if (this.els && this.els.error) {
            this._set_error(message);
        } else {
            console.warn('[iterable_editor] invalid_value: ' + message);
        }
        return false;
    }

    /**
     * Full mutation path: re-render rows, refresh code, call on_change and, inline, on_apply.
     */
    _commit() {
        this._render_rows();
        this._refresh_code();
        if (typeof this.config.on_change === 'function') {
            this.config.on_change(this._export());
        }
        if (this.is_inline && typeof this.config.on_apply === 'function') {
            this.config.on_apply(this._export());
        }
    }

    /**
     * Light change path for live typing: refresh code and call on_change only.
     */
    _soft_change() {
        this._refresh_code();
        if (typeof this.config.on_change === 'function') {
            this.config.on_change(this._export());
        }
    }
    // #endregion data_store

    // #region popup_view
    /**
     * Builds the modal backdrop, header, body and footer.
     */
    _build_popup() {
        let backdrop = document.createElement('div');
        backdrop.className = 'ie_backdrop';
        if (typeof window.get_next_z_index === 'function') {
            backdrop.style.zIndex = String(window.get_next_z_index());
        }
        backdrop.addEventListener('click', event => {
            if (event.target === backdrop) {
                this.close();
            }
        });
        let box = document.createElement('div');
        box.className = 'ie_box';
        let header = document.createElement('div');
        header.className = 'ie_header';
        let title = document.createElement('span');
        title.className = 'ie_title';
        title.textContent = this.title;
        let close_btn = IterableEditor._button('ie_close', 'x', 'Close', () => this.close());
        header.append(title, close_btn);
        this.els = { backdrop: backdrop };
        let body = document.createElement('div');
        body.className = 'ie_body';
        body.append(this._build_code_area(), this._build_list(), this._build_add_form());
        box.append(header, body, this._build_footer());
        backdrop.appendChild(box);
        if (this.theme_vars && window.ThemeManager) {
            ThemeManager.apply(backdrop, this.theme_vars);
        }
        document.body.appendChild(backdrop);
        this.last_valid = this._export();
        this._render_rows();
        this._refresh_code();
    }

    /**
     * Builds the footer with breadcrumbs, Cancel and Apply.
     */
    _build_footer() {
        let footer = document.createElement('div');
        footer.className = 'ie_footer';
        let crumbs = document.createElement('div');
        crumbs.className = 'ie_crumbs';
        let chain = [];
        for (let editor = this; editor.parent; editor = editor.parent) {
            chain.unshift({ editor: editor.parent, label: editor.crumb_label });
        }
        chain.forEach((entry, index) => {
            if (index) {
                let sep = document.createElement('span');
                sep.className = 'ie_crumb_sep';
                sep.textContent = '>>';
                crumbs.appendChild(sep);
            }
            crumbs.appendChild(IterableEditor._button('ie_crumb', entry.label, 'Go back to ' + entry.label, () => {
                if (entry.editor.child) {
                    entry.editor.child.close();
                }
            }));
        });
        let cancel = IterableEditor._button('ie_btn', 'Cancel', '', () => this.close());
        let apply = IterableEditor._button('ie_btn ie_btn_primary', 'Apply', '', () => {
            if (typeof this.config.on_apply === 'function') {
                this.config.on_apply(this._export());
            }
            this.close();
        });
        footer.append(crumbs, cancel, apply);
        return footer;
    }

    /**
     * Builds the "Show code" toggle, the code text area with Clear and Reset, and the error line.
     */
    _build_code_area() {
        let area = document.createElement('div');
        area.className = 'ie_code_area';
        let panel = document.createElement('div');
        panel.className = 'ie_code_panel';
        panel.hidden = true;
        let toggle = IterableEditor._button('ie_btn_small', 'Show code', '', () => {
            panel.hidden = !panel.hidden;
            toggle.textContent = panel.hidden ? 'Show code' : 'Hide code';
            this._refresh_code();
        });
        let code = document.createElement('textarea');
        code.className = 'ie_code';
        code.spellcheck = false;
        code.placeholder = this.mode === 'list' ? 'Paste a Python list or JSON array' : 'Paste a Python dict or JSON object';
        code.addEventListener('input', () => this._on_code_input());
        let controls = document.createElement('div');
        controls.className = 'ie_code_controls';
        let clear = IterableEditor._button('ie_btn_small', 'x', 'Clear', () => {
            code.value = '';
            IterableEditor.auto_grow(code, 38, 140);
            this._set_error('');
        });
        let reset = IterableEditor._button('ie_btn_small ie_reset', 'Reset', 'Revert to last valid value', () => {
            this._import(this.last_valid);
            code.value = IterableEditor.to_python(this.last_valid);
            IterableEditor.auto_grow(code, 38, 140);
            this._set_error('');
            this._reset_add_form();
            this._commit();
        });
        reset.hidden = true;
        controls.append(clear, reset);
        panel.append(code, controls);
        let error = document.createElement('div');
        error.className = 'ie_error';
        error.hidden = true;
        area.append(toggle, panel, error);
        Object.assign(this.els, { code: code, code_panel: panel, reset: reset, error: error });
        return area;
    }

    /**
     * Parses the code text on every keystroke and applies it when it has the right shape.
     */
    _on_code_input() {
        let code = this.els.code;
        IterableEditor.auto_grow(code, 38, 140);
        if (!code.value.trim()) {
            this._set_error('');
            return;
        }
        let parsed = IterableEditor.parse_strict(code.value);
        if (!parsed.ok) {
            this._set_error('Invalid syntax - not a valid Python/JSON list or dict', true);
            return;
        }
        if (!this._shape_ok(parsed.value)) {
            this._set_error(this.mode === 'list' ? 'Expected a list [ ... ]' : 'Expected a dict { ... }', true);
            return;
        }
        this._import(parsed.value);
        this.last_valid = this._export();
        this._set_error('');
        this._reset_add_form();
        this._commit();
    }

    /**
     * Shows or hides the error line; with_reset also shows the Reset button.
     */
    _set_error(message, with_reset) {
        if (!this.els || !this.els.error) {
            return;
        }
        this.els.error.textContent = message;
        this.els.error.hidden = !message;
        this.els.reset.hidden = !with_reset;
    }

    /**
     * Rewrites the code text from the data unless it has focus.
     */
    _refresh_code() {
        let code = this.els && this.els.code;
        if (!code || document.activeElement === code) {
            return;
        }
        code.value = IterableEditor.to_python(this._export());
        if (!this.els.code_panel.hidden) {
            IterableEditor.auto_grow(code, 38, 140);
        }
    }
    // #endregion popup_view

    // #region add_form
    /**
     * Builds the custom or built-in add form.
     */
    _build_add_form() {
        let wrap = document.createElement('div');
        wrap.className = 'ie_add';
        let factory = this.config.custom_add_form_factory;
        if (typeof factory === 'function') {
            let element = factory(this._make_push());
            if (element instanceof HTMLElement) {
                wrap.appendChild(element);
            }
            return wrap;
        }
        let refs = {};
        if (this.mode === 'list') {
            refs.type_row = this._build_type_row(refs);
            wrap.appendChild(refs.type_row);
        }
        let row = document.createElement('div');
        row.className = 'ie_add_row';
        if (this.mode === 'dict') {
            refs.key = document.createElement('input');
            refs.key.className = 'ie_add_key';
            refs.key.placeholder = 'Key';
            refs.key.addEventListener('keydown', event => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    refs.value.focus();
                }
            });
            row.appendChild(refs.key);
        }
        refs.value = document.createElement('textarea');
        refs.value.className = 'ie_add_value';
        refs.value.rows = 1;
        refs.value.placeholder = 'Value (JSON or plain text)';
        refs.value.addEventListener('input', () => this._update_add_value());
        refs.value.addEventListener('keydown', event => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                this._submit_add();
            }
        });
        refs.open_btn = IterableEditor._button('ie_btn_small', 'Open editor', '', () => this._open_add_child());
        let add_btn = IterableEditor._button('ie_btn_small ie_add_btn', '+ Add', '', () => this._submit_add());
        row.append(refs.value, refs.open_btn, add_btn);
        wrap.appendChild(row);
        this.els.add = refs;
        this._reset_add_form();
        return wrap;
    }

    /**
     * Builds the list-mode "Item type:" selector shown while the list is empty.
     */
    _build_type_row(refs) {
        let type_row = document.createElement('div');
        type_row.className = 'ie_type_row';
        let label = document.createElement('span');
        label.textContent = 'Item type:';
        let select = document.createElement('select');
        select.className = 'ie_type_select';
        for (let [value, text] of [['auto', 'auto'], ['list', 'list [ ]'], ['dict', 'dict { }']]) {
            let option = document.createElement('option');
            option.value = value;
            option.textContent = text;
            select.appendChild(option);
        }
        select.addEventListener('change', () => {
            refs.value.value = { list: '[', dict: '{' }[select.value] || '';
            this._update_add_value();
            refs.value.focus();
        });
        type_row.append(label, select);
        return type_row;
    }

    /**
     * Returns the push callback given to a custom add form factory.
     */
    _make_push() {
        if (this.mode === 'list') {
            return value => {
                this.store.push(IterableEditor.clone(value));
                this._commit();
            };
        }
        return (key, value) => {
            if (key === null || key === undefined || key === '') {
                return;
            }
            this._set_key(String(key), IterableEditor.clone(value));
            this._commit();
        };
    }

    /**
     * Adds the typed entry from the built-in form, showing dict errors via MessageBox.
     */
    _submit_add() {
        let refs = this.els && this.els.add;
        let text = refs.value.value.trim();
        if (this.mode === 'list') {
            if (!text) {
                refs.value.focus();
                return;
            }
            this.store.push(IterableEditor.parse_loose(text));
            this._commit();
            this._reset_add_form();
            return;
        }
        let key = refs.key.value.trim();
        if (!key) {
            IterableEditor._show_message('Key cannot be empty.', refs.key);
            return;
        }
        if (/^[[{]/.test(text)) {
            let parsed = IterableEditor.parse_strict(text);
            if (!parsed.ok || parsed.value === null || typeof parsed.value !== 'object') {
                IterableEditor._show_message('Could not parse the value as a dict or list. Use JSON or Python-style syntax.', refs.value);
                return;
            }
        }
        this._set_key(key, text ? IterableEditor.parse_loose(text) : '');
        this._commit();
        this._reset_add_form();
    }

    /**
     * Opens a child editor on the typed add-form value; applying writes it back as JSON.
     */
    _open_add_child() {
        let input = this.els.add.value;
        let text = input.value.trim();
        let kind = text.startsWith('[') ? 'list' : 'dict';
        let parsed = IterableEditor.parse_strict(text);
        let fits = parsed.ok && (kind === 'list' ? Array.isArray(parsed.value) : IterableEditor.is_dict(parsed.value));
        let start = fits ? parsed.value : (kind === 'list' ? [] : {});
        this._open_child(start, kind, this.mode, result => {
            input.value = JSON.stringify(result);
            this._update_add_value();
        });
    }

    /**
     * Resizes the add value input and toggles the "Open editor" button.
     */
    _update_add_value() {
        let refs = this.els && this.els.add;
        if (!refs) {
            return;
        }
        IterableEditor.auto_grow(refs.value, 23, 140);
        refs.open_btn.hidden = !/^[[{]/.test(refs.value.value.trim());
    }

    /**
     * Clears the add form and prefills [ or { from the first item's type.
     */
    _reset_add_form() {
        let refs = this.els && this.els.add;
        if (!refs) {
            return;
        }
        if (refs.key) {
            refs.key.value = '';
        }
        refs.value.value = '';
        if (this.store.length) {
            let first = this._value_at(0);
            refs.value.value = Array.isArray(first) ? '[' : (IterableEditor.is_dict(first) ? '{' : '');
        }
        this._update_add_value();
    }
    // #endregion add_form

    // #region inline_view
    /**
     * Builds the inline list and the "Edit all" button inside the container.
     */
    _build_inline() {
        let root = document.createElement('div');
        root.className = 'ie_inline';
        this.els = { root: root };
        let list = this._build_list();
        list.classList.add('ie_list_inline');
        let edit_all = IterableEditor._button('ie_btn_small', 'Edit all', '', () => this._open_bulk());
        root.append(list, edit_all);
        this.container.appendChild(root);
        if (this.theme_vars && window.ThemeManager) {
            ThemeManager.apply(this.container, this.theme_vars);
        }
        this._render_rows();
    }

    /**
     * Opens the bulk popup on a copy of the data; applying replaces the inline data.
     */
    _open_bulk() {
        if (this.bulk) {
            return;
        }
        let cfg = this.config;
        this.bulk = new IterableEditor(null, this.mode, this._export(), {
            title: cfg.title,
            custom_add_form_factory: cfg.custom_add_form_factory,
            show_item_numbers: cfg.show_item_numbers,
            item_number_base: cfg.item_number_base,
            on_apply: result => {
                this._import(result);
                this._render_rows();
                if (typeof cfg.on_change === 'function') {
                    cfg.on_change(this._export());
                }
                if (typeof cfg.on_apply === 'function') {
                    cfg.on_apply(this._export());
                }
            }
        });
        this.bulk.theme_vars = this.theme_vars;
        this.bulk.on_closed = () => {
            this.bulk = null;
        };
        this.bulk.render();
    }
    // #endregion inline_view

    // #region rows
    /**
     * Creates the item list element and its shared context menu.
     */
    _build_list() {
        let list = document.createElement('div');
        list.className = 'ie_list';
        this.els.list = list;
        if (typeof window.ContextMenu === 'function') {
            this.menu = new ContextMenu(list, {
                on_before_show: (type, event) => {
                    let row = event && event.target && event.target.closest ? event.target.closest('.ie_row') : null;
                    let index = row ? Number(row.getAttribute('data-idx')) : -1;
                    this.menu.set_items(this.is_inline ? this._inline_menu(index) : this._popup_menu(index));
                }
            });
        }
        return list;
    }

    /**
     * Rebuilds all rows, or the empty message.
     */
    _render_rows() {
        let list = this.els && this.els.list;
        if (!list) {
            return;
        }
        list.textContent = '';
        if (this.els.add && this.els.add.type_row) {
            this.els.add.type_row.hidden = this.store.length > 0;
        }
        if (!this.store.length) {
            let empty = document.createElement('div');
            empty.className = 'ie_empty';
            empty.textContent = this.mode === 'list' ? 'No items yet.' : 'No keys yet.';
            if (this.is_inline) {
                empty.classList.add('ie_empty_clickable');
                empty.title = 'Click to edit';
                empty.addEventListener('click', () => this._open_bulk());
            }
            list.appendChild(empty);
            return;
        }
        for (let index = 0; index < this.store.length; index++) {
            let row = this._custom_row(index) || this._build_row(index);
            row.setAttribute('data-idx', String(index));
            this._bind_row_drag(row, index);
            list.appendChild(row);
        }
    }

    /**
     * Returns the row_renderer element, or null to use the built-in row.
     */
    _custom_row(index) {
        let renderer = this.config.row_renderer;
        if (typeof renderer !== 'function') {
            return null;
        }
        try {
            let key = this.mode === 'list' ? index : this.store[index][0];
            let element = renderer(key, IterableEditor.clone(this._value_at(index)), index, this.is_inline);
            if (element instanceof HTMLElement) {
                element.draggable = true;
                return element;
            }
        } catch (error) {
            console.warn('[iterable_editor] row_renderer_failed', error);
        }
        return null;
    }

    /**
     * Builds a built-in row: grip, number or key, value editor and remove button.
     */
    _build_row(index) {
        let row = document.createElement('div');
        row.className = 'ie_row';
        let handle = document.createElement('span');
        handle.className = 'ie_handle';
        handle.title = 'Drag to reorder';
        handle.innerHTML = IterableEditor.GRIP_SVG;
        handle.addEventListener('mousedown', () => {
            row.draggable = true;
        });
        handle.addEventListener('mouseup', () => {
            row.draggable = false;
        });
        row.appendChild(handle);
        if (this.mode === 'list' && this.config.show_item_numbers !== false) {
            let number = document.createElement('span');
            number.className = 'ie_num';
            number.textContent = (index + (this.config.item_number_base === 0 ? 0 : 1)) + '.';
            row.appendChild(number);
        }
        if (this.mode === 'dict') {
            let key_input = document.createElement('input');
            key_input.className = 'ie_key';
            key_input.value = this.store[index][0];
            key_input.addEventListener('blur', () => this._rename_key(index, key_input));
            let colon = document.createElement('span');
            colon.className = 'ie_colon';
            colon.textContent = ':';
            row.append(key_input, colon);
        }
        row.appendChild(this._build_value_editor(index));
        row.appendChild(IterableEditor._button('ie_remove', 'x', 'Remove', () => {
            this.store.splice(index, 1);
            this._reset_add_form();
            this._commit();
        }));
        return row;
    }

    /**
     * Returns a scalar input or a nested-value pill.
     */
    _build_value_editor(index) {
        let value = this._value_at(index);
        if (value !== null && typeof value === 'object') {
            return this._build_pill(index, value);
        }
        let input = this._make_value_input(index, IterableEditor.to_input_text(value));
        input.addEventListener('blur', () => {
            let text = input.value.trim();
            if (!/^(\[[\s\S]*\]|\{[\s\S]*\})$/.test(text)) {
                return;
            }
            let parsed = IterableEditor.parse_strict(text);
            if (parsed.ok && parsed.value !== null && typeof parsed.value === 'object') {
                this._set_at(index, parsed.value);
                this._open_item_child(index);
            }
        });
        return input;
    }

    /**
     * Creates a value input that stores parsed text live and calls on_change.
     */
    _make_value_input(index, text) {
        let input = document.createElement('input');
        input.className = 'ie_value';
        input.spellcheck = false;
        input.value = text;
        input.addEventListener('input', () => {
            this._set_at(index, IterableEditor.parse_loose(input.value));
            this._soft_change();
        });
        return input;
    }

    /**
     * Builds the nested pill: click edits as text, double click opens the child editor.
     */
    _build_pill(index, value) {
        let pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'ie_pill';
        pill.title = 'Click to edit as text, double-click to open the nested editor';
        let preview = IterableEditor.to_input_text(value);
        if (preview.length > 42) {
            preview = preview.slice(0, 40) + '...';
        }
        let text = document.createElement('span');
        text.textContent = preview;
        pill.innerHTML = IterableEditor.CHEVRON_SVG;
        pill.appendChild(text);
        let timer = null;
        pill.addEventListener('click', () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                let input = this._make_value_input(index, JSON.stringify(this._value_at(index)));
                input.addEventListener('blur', () => this._commit());
                pill.replaceWith(input);
                input.focus();
                input.select();
            }, 220);
        });
        pill.addEventListener('dblclick', () => {
            clearTimeout(timer);
            this._open_item_child(index);
        });
        return pill;
    }

    /**
     * Renames a dict key on blur; an empty key reverts, a colliding key replaces the other entry.
     */
    _rename_key(index, input) {
        let pair = this.store[index];
        let new_key = input.value.trim();
        if (!pair || !new_key) {
            input.value = pair ? pair[0] : '';
            return;
        }
        if (new_key === pair[0]) {
            return;
        }
        let other = this.store.findIndex(item => item[0] === new_key);
        pair[0] = new_key;
        if (other >= 0) {
            this.store.splice(other, 1);
            this._render_rows();
        }
        this._soft_change();
    }

    /**
     * Wires native drag events of a row for reordering within this editor.
     */
    _bind_row_drag(row, index) {
        row.addEventListener('dragstart', event => {
            this.drag_from = index;
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', String(index));
            row.classList.add('ie_dragging');
        });
        row.addEventListener('dragover', event => {
            if (this.drag_from === null || this.drag_from === index) {
                return;
            }
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            this._clear_drag_marks('ie_drag_target');
            row.classList.add('ie_drag_target');
        });
        row.addEventListener('dragleave', event => {
            if (!row.contains(event.relatedTarget)) {
                row.classList.remove('ie_drag_target');
            }
        });
        row.addEventListener('drop', event => {
            event.preventDefault();
            let from = this.drag_from;
            this.drag_from = null;
            if (from !== null && from !== index) {
                this.reorder(from, index);
            }
        });
        row.addEventListener('dragend', () => {
            this.drag_from = null;
            if (row.classList.contains('ie_row')) {
                row.draggable = false;
            }
            this._clear_drag_marks('ie_dragging');
            this._clear_drag_marks('ie_drag_target');
        });
    }

    /**
     * Removes a drag marker class from all rows of the list.
     */
    _clear_drag_marks(class_name) {
        let list = this.els && this.els.list;
        if (!list) {
            return;
        }
        for (let el of list.querySelectorAll('.' + class_name)) {
            el.classList.remove(class_name);
        }
    }
    // #endregion rows

    // #region nested_editors
    /**
     * Opens one child popup at a time; apply_fn receives the applied value.
     * @param {string} label - Breadcrumb text describing how the child was reached.
     */
    _open_child(value, kind, label, apply_fn) {
        if (this.child) {
            return;
        }
        let child = new IterableEditor(null, kind, value, {
            title: kind === 'list' ? 'Edit nested list' : 'Edit nested dict',
            on_apply: result => apply_fn(result)
        });
        child.parent = this;
        child.crumb_label = label;
        child.theme_vars = this.theme_vars;
        child.on_closed = () => {
            this.child = null;
        };
        this.child = child;
        child.render();
    }

    /**
     * Opens a child editor for a nested item value.
     */
    _open_item_child(index) {
        let value = this._value_at(index);
        let kind = Array.isArray(value) ? 'list' : 'dict';
        let label = this.mode === 'list' ? 'list[' + index + ']' : "'" + this.store[index][0] + "'";
        this._open_child(value, kind, label, result => {
            this._set_at(index, result);
            this._commit();
        });
    }

    /**
     * Converts an item to a list or dict, commits and opens its child editor.
     */
    _make_nested(index, kind) {
        let value = this._value_at(index);
        if (kind === 'list') {
            let empty = value === '' || value === null || value === undefined;
            value = Array.isArray(value) ? value : (empty ? [] : [value]);
        } else {
            value = IterableEditor.is_dict(value) ? value : {};
        }
        this._set_at(index, value);
        this._commit();
        this._open_item_child(index);
    }
    // #endregion nested_editors

    // #region context_menus
    /**
     * Menu entries for a popup row (index -1 for empty space).
     */
    _popup_menu(index) {
        let items = [];
        if (index >= 0) {
            let value = this._value_at(index);
            if (value !== null && typeof value === 'object') {
                let label = Array.isArray(value) ? 'Edit nested list' : 'Edit nested dict';
                items.push({ label: label, action: () => this._open_item_child(index) }, { type: 'separator' });
            }
            items.push({ label: 'Make nested list', action: () => this._make_nested(index, 'list') });
            items.push({ label: 'Make nested dict', action: () => this._make_nested(index, 'dict') });
            items.push({ type: 'separator' });
            items = items.concat(this._copy_items(index));
            items.push({ type: 'separator' });
            items.push({ label: 'Paste value', action: () => this._paste_value(index) });
            items.push({ type: 'separator' });
        }
        items.push({ label: 'Copy full JSON', action: () => IterableEditor.copy_text(JSON.stringify(this._export()).replace(/\bnull\b/g, 'None')) });
        items.push({ label: 'Paste full JSON', action: () => this._paste_full() });
        return items;
    }

    /**
     * Menu entries for an inline row (index -1 for empty space).
     */
    _inline_menu(index) {
        let items = [{ label: 'Edit all', action: () => this._open_bulk() }];
        if (index < 0) {
            return items;
        }
        let value = this._value_at(index);
        if (value !== null && typeof value === 'object') {
            items.push({ label: 'Edit this item', action: () => this._open_item_child(index) });
        }
        items.push({ type: 'separator' });
        return items.concat(this._copy_items(index));
    }

    /**
     * "Copy key" (dict mode) and "Copy value" entries for a row.
     */
    _copy_items(index) {
        let items = [];
        if (this.mode === 'dict') {
            items.push({ label: 'Copy key', action: () => IterableEditor.copy_text(this.store[index][0]) });
        }
        items.push({ label: 'Copy value', action: () => IterableEditor.copy_text(IterableEditor.to_input_text(this._value_at(index))) });
        return items;
    }

    /**
     * Stores parsed clipboard text in one item.
     */
    async _paste_value(index) {
        let text = await IterableEditor.read_clipboard();
        if (!text || index >= this.store.length) {
            return;
        }
        this._set_at(index, IterableEditor.parse_loose(text));
        this._commit();
    }

    /**
     * Replaces all data with clipboard JSON of the matching shape.
     */
    async _paste_full() {
        let text = await IterableEditor.read_clipboard();
        try {
            let value = JSON.parse(text);
            if (this._shape_ok(value)) {
                this._import(value);
                this._commit();
            }
        } catch (error) {
            console.warn('[iterable_editor] paste_full_failed', error);
        }
    }
    // #endregion context_menus

    // #region dom_helpers
    /**
     * Creates a button with a class, text, optional tooltip and click handler.
     */
    static _button(class_name, text, title, on_click) {
        let button = document.createElement('button');
        button.type = 'button';
        button.className = class_name;
        button.textContent = text;
        if (title) {
            button.title = title;
        }
        button.addEventListener('click', on_click);
        return button;
    }

    /**
     * Grows a text area to fit its content within min and max pixels.
     */
    static auto_grow(area, min_px, max_px) {
        area.style.height = 'auto';
        let height = Math.min(max_px, Math.max(min_px, area.scrollHeight));
        area.style.height = height + 'px';
    }

    /**
     * Shows an error near an element via MessageBox, or logs it.
     */
    static _show_message(message, anchor) {
        if (window.MessageBox && typeof MessageBox.error === 'function') {
            MessageBox.error(message, anchor);
        } else {
            console.warn('[iterable_editor] ' + message);
        }
    }

    /**
     * Writes text to the clipboard; errors are ignored.
     */
    static copy_text(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(String(text)).catch(error => console.warn('[iterable_editor] copy_failed', error));
        }
    }

    /**
     * Reads clipboard text, or '' on error.
     */
    static async read_clipboard() {
        try {
            return await navigator.clipboard.readText();
        } catch (error) {
            console.warn('[iterable_editor] clipboard_read_failed', error);
            return '';
        }
    }
    // #endregion dom_helpers
}

window.IterableEditor = IterableEditor;
if (window.WidgetRegistry) {
    WidgetRegistry.register('iterable_editor', {
        label: 'Iterable Editor',
        category: 'inputs',
        container: false,
        options: [
            { name: 'mode', type: 'select', default: 'list', choices: ['list', 'dict'] },
            { name: 'display_mode', type: 'select', default: 'inline', choices: ['inline', 'popup'] },
            { name: 'title', type: 'string', default: '' },
            { name: 'value', type: 'json', default: ['alpha', 42, true, null, [1, 2], { key: 'value' }] },
            { name: 'show_item_numbers', type: 'bool', default: true },
            { name: 'item_number_base', type: 'select', default: '1', choices: ['0', '1'] }
        ],
        build: (host, options) => {
            let config = {
                display_mode: options.display_mode === 'popup' ? 'popup' : 'inline',
                title: options.title || undefined,
                show_item_numbers: options.show_item_numbers !== false,
                item_number_base: Number(options.item_number_base) === 0 ? 0 : 1
            };
            let editor = new IterableEditor(host, options.mode, options.value, config);
            if (config.display_mode === 'inline') {
                return editor.render();
            }
            let button = document.createElement('button');
            button.type = 'button';
            button.className = 'ie_btn';
            button.textContent = 'Open editor';
            button.addEventListener('click', () => editor.open());
            IterableEditor.ensure_styles();
            host.appendChild(button);
            return editor;
        }
    });
}
