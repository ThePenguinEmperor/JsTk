/**
 * ObjectCreator: Tkinter-like grid builder exposed as the document.oc singleton.
 */
class ObjectCreator {
    static NATIVE_TAGS = ['table'];

    /**
     * Returns the shared instance, creating it on first use.
     */
    constructor() {
        if (window._object_creator_instance) {
            return window._object_creator_instance;
        }
        this.is_loaded = true;
        this._events = new WeakMap();
        this._placements = new WeakMap();
        this._forgotten = new WeakMap();
        window._object_creator_instance = this;
    }

    // #region core_creation
    /**
     * Creates an element and places it in a grid parent.
     * @param {Object} params - parent (element or id), row, col, row_span, col_span, sticky, id, class_name,
     *     style (string or object, kebab or camel keys), text, value, events, padx/pady/ipadx/ipady
     *     (number or [start, end] px; pad_x style aliases accepted), attributes, properties.
     *     Any other primitive key is set as an HTML attribute.
     *     A tag registered in WidgetRegistry builds that widget inside a placed div; params.options configure it.
     * @returns {HTMLElement} The element; for registered widgets, a host div with widget_instance set.
     */
    object_generate(tag, params = {}) {
        let is_native_tag = ObjectCreator.NATIVE_TAGS.includes(tag);
        if (window.WidgetRegistry && WidgetRegistry.get(tag) && (!is_native_tag || params.options !== undefined)) {
            let { options, class_name, text, ...host_params } = params;
            host_params.class_name = ('oc_widget oc_widget_' + tag + ' ' + (class_name || '')).trim();
            let host = this.object_generate('div', host_params);
            return WidgetRegistry.build_into(tag, host, options);
        }
        let {
            parent,
            row, col, row_span, col_span, sticky,
            id, class_name, style,
            text, value,
            events,
            padx, pady, ipadx, ipady,
            pad_x, pad_y, ipad_x, ipad_y,
            attributes = {},
            properties = {},
            ...rest
        } = params;

        let el = document.createElement(tag);
        if (id) {
            el.id = id;
        }
        if (class_name) {
            el.className = class_name;
        }
        this._apply_style(el, style);
        if (text !== undefined) {
            el.textContent = text;
        }
        if (value !== undefined) {
            this._apply_value(el, value);
        }
        this._apply_margin_padding(
            el,
            padx !== undefined ? padx : pad_x,
            pady !== undefined ? pady : pad_y,
            ipadx !== undefined ? ipadx : ipad_x,
            ipady !== undefined ? ipady : ipad_y
        );
        this._bind_events(el, events);
        this._apply_attributes(el, Object.assign({}, rest, attributes));
        Object.assign(el, properties);

        let parent_el = this._resolve_parent(parent);
        if (!parent_el) {
            console.error('[oc] parent_not_found: ' + parent);
            return el;
        }
        this._handle_grid_placement(parent_el, el, { row, col, row_span, col_span, sticky });
        return el;
    }

    /**
     * Creates a tree of elements from plain specs: [{ tag, children: [...], ...object_generate params }].
     * @returns {Object} Created elements keyed by id; elements without an id are not listed.
     */
    build_layout(parent, specs) {
        let created = {};
        let parent_el = this._resolve_element(parent);
        if (!parent_el) {
            console.error('[oc] parent_not_found: ' + parent);
            return created;
        }
        this._build_layout_items(parent_el, specs, created);
        return created;
    }

    /**
     * Configures a column: weight in fr, minsize and pad in px, all optional.
     */
    configure_column(parent, col, { weight = 0, minsize = 0, pad = 0 } = {}) {
        let parent_el = this._resolve_element(parent);
        if (!parent_el._grid_columns) {
            parent_el._grid_columns = [];
        }
        parent_el._grid_columns[col - 1] = { weight, minsize, pad };
        this._apply_grid_template(parent_el);
    }

    /**
     * Configures a row: weight in fr, minsize and pad in px, all optional.
     */
    configure_row(parent, row, { weight = 0, minsize = 0, pad = 0 } = {}) {
        let parent_el = this._resolve_element(parent);
        if (!parent_el._grid_rows) {
            parent_el._grid_rows = [];
        }
        parent_el._grid_rows[row - 1] = { weight, minsize, pad };
        this._apply_grid_template(parent_el);
    }

    /**
     * Sets the gaps between grid tracks in px; gap sets both axes.
     */
    configure_grid(parent, { gap, gap_x, gap_y } = {}) {
        let parent_el = this._resolve_element(parent);
        parent_el.style.display = 'grid';
        if (gap !== undefined) {
            parent_el.style.gap = gap + 'px';
        }
        if (gap_x !== undefined) {
            parent_el.style.columnGap = gap_x + 'px';
        }
        if (gap_y !== undefined) {
            parent_el.style.rowGap = gap_y + 'px';
        }
    }
    // #endregion core_creation

    // #region widget_management
    /**
     * Updates an existing widget. Style merges into the current inline style.
     */
    update_widget(widget, props = {}) {
        let el = this._resolve_element(widget);
        if (!el) {
            return;
        }
        if (props.text !== undefined) {
            el.textContent = props.text;
        }
        if (props.value !== undefined) {
            this._apply_value(el, props.value);
        }
        if (props.class_name !== undefined) {
            el.className = props.class_name;
        }
        if (props.id !== undefined) {
            el.id = props.id;
        }
        this._apply_style(el, props.style);
        this._apply_margin_padding(el, props.padx, props.pady, props.ipadx, props.ipady);
        this._bind_events(el, props.events);
        this._apply_attributes(el, props.attributes || {});
        Object.assign(el, props.properties || {});

        let place_keys = ['row', 'col', 'row_span', 'col_span', 'sticky'];
        let changed = place_keys.filter(key => props[key] !== undefined);
        if (changed.length === 0) {
            return;
        }
        let placement = Object.assign({}, this._placements.get(el) || {});
        for (let key of changed) {
            placement[key] = props[key];
        }
        this._set_placement(el, placement);
        if (el.parentElement) {
            this._apply_grid_template(el.parentElement);
        }
    }

    /**
     * Removes a widget and its children from the DOM and drops their event handlers.
     */
    remove_widget(widget) {
        let el = this._resolve_element(widget);
        if (!el) {
            return;
        }
        let nodes = [el, ...el.querySelectorAll('*')];
        for (let node of nodes) {
            this.unbind(node);
        }
        let parent = el.parentElement;
        if (parent) {
            parent.removeChild(el);
            this._apply_grid_template(parent);
        }
    }

    /**
     * Detaches a widget but keeps its placement, so grid_restore can put it back.
     * @returns {HTMLElement|null} The detached element; keep it, since it can no longer be found by id.
     */
    grid_forget(widget) {
        let el = this._resolve_element(widget);
        if (!el || !el.parentElement) {
            return null;
        }
        let parent = el.parentElement;
        this._forgotten.set(el, parent);
        parent.removeChild(el);
        this._apply_grid_template(parent);
        return el;
    }

    /**
     * Re-attaches a widget removed by grid_forget at its previous position.
     */
    grid_restore(el) {
        let parent = this._forgotten.get(el);
        if (!parent) {
            return;
        }
        this._forgotten.delete(el);
        this._handle_grid_placement(parent, el, this._placements.get(el) || {});
    }

    /**
     * Returns the placement of a widget, or null when it is unknown.
     * @returns {Object|null} { parent, row, col, row_span, col_span, sticky }.
     */
    grid_info(widget) {
        let el = this._resolve_element(widget);
        if (!el || !this._placements.has(el)) {
            return null;
        }
        let info = Object.assign({}, this._placements.get(el));
        info.parent = el.parentElement || this._forgotten.get(el) || null;
        return info;
    }

    /**
     * Lists the children of a grid that cover a cell; omit row or col to match a whole column or row.
     */
    grid_slaves(parent, { row, col } = {}) {
        let parent_el = this._resolve_element(parent);
        let found = [];
        for (let child of parent_el.children) {
            let start_row = parseInt(child.style.gridRowStart) || 1;
            let start_col = parseInt(child.style.gridColumnStart) || 1;
            let end_row = start_row + (this._get_row_span(child) || 1) - 1;
            let end_col = start_col + (this._get_col_span(child) || 1) - 1;
            let row_ok = row === undefined || (row >= start_row && row <= end_row);
            let col_ok = col === undefined || (col >= start_col && col <= end_col);
            if (row_ok && col_ok) {
                found.push(child);
            }
        }
        return found;
    }
    // #endregion widget_management

    // #region events
    /**
     * Adds an event handler and tracks it so unbind and remove_widget can drop it.
     */
    bind(widget, event_name, handler) {
        let el = this._resolve_element(widget);
        if (!el || typeof handler !== 'function') {
            return;
        }
        el.addEventListener(event_name, handler);
        if (!this._events.has(el)) {
            this._events.set(el, []);
        }
        this._events.get(el).push({ event_name, handler });
    }

    /**
     * Removes tracked handlers: one handler, all handlers of an event, or all handlers when both are omitted.
     */
    unbind(widget, event_name, handler) {
        let el = this._resolve_element(widget);
        if (!el || !this._events.has(el)) {
            return;
        }
        let kept = [];
        for (let entry of this._events.get(el)) {
            let name_match = event_name === undefined || entry.event_name === event_name;
            let handler_match = handler === undefined || entry.handler === handler;
            if (name_match && handler_match) {
                el.removeEventListener(entry.event_name, entry.handler);
            } else {
                kept.push(entry);
            }
        }
        this._events.set(el, kept);
    }
    // #endregion events

    // #region element_helpers
    /**
     * Resolves a parent; a container widget host resolves to its content_container. Undefined means body.
     */
    _resolve_parent(parent) {
        if (parent === undefined || parent === null || parent === '') {
            return document.body;
        }
        let parent_el = this._resolve_element(parent);
        if (parent_el && parent_el.content_container instanceof HTMLElement) {
            return parent_el.content_container;
        }
        return parent_el;
    }

    /**
     * Returns the element for an element or an id string, or null.
     */
    _resolve_element(widget) {
        if (widget instanceof HTMLElement) {
            return widget;
        }
        if (typeof widget === 'string') {
            return document.getElementById(widget);
        }
        return null;
    }

    /**
     * Merges a CSS string or object into the inline style; kebab-case and camelCase keys both work.
     */
    _apply_style(el, style) {
        if (!style) {
            return;
        }
        let entries = [];
        if (typeof style === 'string') {
            for (let part of style.split(';')) {
                let split_at = part.indexOf(':');
                if (split_at > 0) {
                    entries.push([part.slice(0, split_at).trim(), part.slice(split_at + 1).trim()]);
                }
            }
        } else if (typeof style === 'object') {
            entries = Object.entries(style);
        }
        for (let [key, val] of entries) {
            if (key.includes('-')) {
                el.style.setProperty(key, val);
            } else {
                el.style[key] = val;
            }
        }
    }

    /**
     * Sets value as a property on form fields and as an attribute elsewhere.
     */
    _apply_value(el, value) {
        let tag = el.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') {
            el.value = value;
        } else {
            el.setAttribute('value', value);
        }
    }

    /**
     * Sets primitive values as attributes; functions and objects are skipped.
     */
    _apply_attributes(el, attributes) {
        for (let [key, val] of Object.entries(attributes)) {
            if (val !== null && val !== undefined && typeof val !== 'object' && typeof val !== 'function') {
                el.setAttribute(key, val);
            }
        }
    }

    /**
     * Binds every function in an { event_name: handler } map.
     */
    _bind_events(el, events) {
        if (!events || typeof events !== 'object') {
            return;
        }
        for (let [event_name, handler] of Object.entries(events)) {
            this.bind(el, event_name, handler);
        }
    }

    /**
     * Applies Tkinter-style margins (padx/pady) and paddings (ipadx/ipady).
     */
    _apply_margin_padding(el, padx, pady, ipadx, ipady) {
        let sides = [
            [padx, 'marginLeft', 'marginRight'],
            [pady, 'marginTop', 'marginBottom'],
            [ipadx, 'paddingLeft', 'paddingRight'],
            [ipady, 'paddingTop', 'paddingBottom']
        ];
        for (let [value, start_prop, end_prop] of sides) {
            let pair = this._pad_pair(value);
            if (pair) {
                el.style[start_prop] = pair[0] + 'px';
                el.style[end_prop] = pair[1] + 'px';
            }
        }
    }

    /**
     * Turns a number or [start, end] into a [start, end] pair, or null when unset.
     */
    _pad_pair(value) {
        if (value === undefined || value === null || value === '') {
            return null;
        }
        if (Array.isArray(value)) {
            return [value[0], value.length > 1 ? value[1] : value[0]];
        }
        return [value, value];
    }

    /**
     * Recursively creates layout specs under a parent and collects them by id.
     */
    _build_layout_items(parent_el, specs, created) {
        for (let spec of specs || []) {
            let { tag, children, ...params } = spec;
            params.parent = parent_el;
            let el = this.object_generate(tag, params);
            if (el.id) {
                created[el.id] = el;
            }
            if (children && children.length) {
                this._build_layout_items(el.content_container || el, children, created);
            }
        }
    }
    // #endregion element_helpers

    // #region grid_helpers
    /**
     * Returns the highest row occupied in a grid.
     */
    _get_max_row(parent) {
        let max_row = 0;
        for (let child of parent.children) {
            let row = parseInt(child.style.gridRowStart) || 1;
            let end_row = row + (this._get_row_span(child) || 1) - 1;
            max_row = Math.max(max_row, end_row);
        }
        return max_row;
    }

    /**
     * Returns the highest column occupied in a grid.
     */
    _get_max_col(parent) {
        let max_col = 0;
        for (let child of parent.children) {
            let col = parseInt(child.style.gridColumnStart) || 1;
            let end_col = col + (this._get_col_span(child) || 1) - 1;
            max_col = Math.max(max_col, end_col);
        }
        return max_col;
    }

    /**
     * Returns the row span of an element, or null when it has none.
     */
    _get_row_span(el) {
        let row_end = el.style.gridRowEnd;
        if (row_end && row_end.startsWith('span')) {
            return parseInt(row_end.split(' ')[1]);
        }
        return null;
    }

    /**
     * Returns the column span of an element, or null when it has none.
     */
    _get_col_span(el) {
        let col_end = el.style.gridColumnEnd;
        if (col_end && col_end.startsWith('span')) {
            return parseInt(col_end.split(' ')[1]);
        }
        return null;
    }

    /**
     * Rebuilds grid-template-columns and rows from occupied cells and configured tracks.
     */
    _apply_grid_template(parent) {
        let configured_cols = (parent._grid_columns || []).length;
        let configured_rows = (parent._grid_rows || []).length;
        let max_col = Math.max(this._get_max_col(parent), configured_cols);
        let max_row = Math.max(this._get_max_row(parent), configured_rows);
        let cols = [];
        for (let i = 0; i < max_col; i++) {
            cols.push(this._build_track((parent._grid_columns || [])[i]));
        }
        let rows = [];
        for (let i = 0; i < max_row; i++) {
            rows.push(this._build_track((parent._grid_rows || [])[i]));
        }
        parent.style.gridTemplateColumns = cols.join(' ');
        parent.style.gridTemplateRows = rows.join(' ');
    }

    /**
     * Builds one track size; pad is added to minsize because CSS tracks have no padding.
     */
    _build_track(cfg) {
        let weight = cfg ? cfg.weight : 0;
        let min_px = cfg ? (cfg.minsize || 0) + (cfg.pad || 0) * 2 : 0;
        let min_part = min_px > 0 ? min_px + 'px' : 'auto';
        if (weight > 0) {
            return `minmax(${min_part}, ${weight}fr)`;
        }
        if (min_px > 0) {
            return `minmax(${min_part}, auto)`;
        }
        return 'auto';
    }

    /**
     * Places an element into a grid parent with position, spans and sticky.
     */
    _handle_grid_placement(parent, el, placement) {
        if (getComputedStyle(parent).display !== 'grid') {
            parent.style.display = 'grid';
        }
        this._set_placement(el, placement);
        parent.appendChild(el);
        this._apply_grid_template(parent);
    }

    /**
     * Stores a placement and applies its position and sticky to the element.
     */
    _set_placement(el, placement) {
        let { row, col, row_span, col_span, sticky } = placement;
        this._placements.set(el, { row, col, row_span, col_span, sticky });
        if (row !== undefined && row !== null) {
            el.style.gridRowStart = row;
            el.style.gridRowEnd = row_span ? `span ${row_span}` : 'auto';
        }
        if (col !== undefined && col !== null) {
            el.style.gridColumnStart = col;
            el.style.gridColumnEnd = col_span ? `span ${col_span}` : 'auto';
        }
        this._apply_sticky(el, sticky);
    }

    /**
     * Maps a Tkinter sticky string (n/s/e/w combinations) to grid self-alignment.
     */
    _apply_sticky(el, sticky) {
        let value = sticky || '';
        let has_e = value.includes('e');
        let has_w = value.includes('w');
        let has_n = value.includes('n');
        let has_s = value.includes('s');
        el.style.justifySelf = has_e && has_w ? 'stretch' : has_e ? 'end' : has_w ? 'start' : 'center';
        el.style.alignSelf = has_n && has_s ? 'stretch' : has_n ? 'start' : has_s ? 'end' : 'center';
    }
    // #endregion grid_helpers

    // #region command_validation
    /**
     * Parses "document.oc.object_generate('tag', { ... });" into params with a tag key.
     * Evaluates the object literal with new Function, so pass only trusted text.
     * @returns {Object|null} Params, or null when the syntax does not match.
     */
    parse_command_string(command_string) {
        let pattern = /^document\.oc\.object_generate\(\s*['"]([^'"]+)['"]\s*,\s*(\{[\s\S]*\})\s*\)\s*;?\s*$/;
        let match = command_string.trim().match(pattern);
        this.last_parse_error = '';
        if (!match) {
            this.last_parse_error = 'the line does not match document.oc.object_generate(tag, { ... });';
            return null;
        }
        try {
            let params = new Function('return (' + match[2] + ')')();
            params.tag = match[1];
            return params;
        } catch (error) {
            return this._parse_legacy_keys(match[1], match[2], error);
        }
    }

    /**
     * Retries a literal written by older versions, which left kebab-case keys such as background-color unquoted.
     */
    _parse_legacy_keys(tag, literal, first_error) {
        let fixed = literal.replace(/([{,]\s*)([A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)+)\s*:/g, "$1'$2':");
        try {
            let params = new Function('return (' + fixed + ')')();
            params.tag = tag;
            return params;
        } catch (error) {
            this.last_parse_error = first_error.message;
            return null;
        }
    }

    /**
     * Validates a command string.
     * @returns {Object} { valid, errors: string[], params: Object|null }.
     */
    validate_command_string(command_string) {
        let errors = [];
        let params = this.parse_command_string(command_string);
        if (!params) {
            errors.push("Invalid command syntax (" + this.last_parse_error + "). Expected: document.oc.object_generate('tag', { ... });");
            return { valid: false, errors: errors, params: null };
        }
        if (!params.tag) {
            errors.push('Missing or empty tag');
        }
        for (let field of ['row', 'col']) {
            if (params[field] === undefined || params[field] === null) {
                errors.push('Missing ' + field);
            } else if (typeof params[field] !== 'number' || params[field] < 1) {
                errors.push(field + ' must be a positive number');
            }
        }
        for (let field of ['row_span', 'col_span']) {
            if (params[field] !== undefined && (typeof params[field] !== 'number' || params[field] < 1)) {
                errors.push(field + ' must be a positive number');
            }
        }
        for (let field of ['padx', 'pady', 'ipadx', 'ipady', 'pad_x', 'pad_y', 'ipad_x', 'ipad_y']) {
            if (params[field] !== undefined && !this._is_valid_pad(params[field])) {
                errors.push(field + ' must be a non-negative number or a [start, end] pair');
            }
        }
        if (params.sticky !== undefined && (typeof params.sticky !== 'string' || /[^nsew]/.test(params.sticky))) {
            errors.push('sticky must be a string of n, s, e, w');
        }
        if (params.parent !== undefined && typeof params.parent !== 'string') {
            errors.push('parent must be a string (element ID)');
        }
        if (params.style !== undefined && typeof params.style !== 'object' && typeof params.style !== 'string') {
            errors.push('style must be an object or a CSS string');
        }
        return { valid: errors.length === 0, errors: errors, params: params };
    }

    /**
     * Checks a pad value: a non-negative number or a pair of them.
     */
    _is_valid_pad(value) {
        let items = Array.isArray(value) ? value : [value];
        let pair_ok = items.length >= 1 && items.length <= 2;
        return pair_ok && items.every(item => typeof item === 'number' && item >= 0);
    }
    // #endregion command_validation
}

if (!document.oc) {
    document.oc = new ObjectCreator();
}
