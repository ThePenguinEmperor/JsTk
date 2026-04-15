class ObjectCreator {
    constructor() {
        if (!window._object_creator_instance) {
            window._object_creator_instance = this;
        }
        this.is_loaded = true;
        return window._object_creator_instance;
    }

    // #region core_creation
    /**
     * Create a new element and place it in a grid parent.
     * @param {string} tag - HTML tag name.
     * @param {Object} params - Configuration parameters.
     * @returns {HTMLElement} The created element.
     */
    object_generate(tag, params = {}) {
        let {
            parent,
            row, col, row_span, col_span, sticky,
            id, class_name, style,
            text, value,
            events,
            pad_x, pad_y, ipad_x, ipad_y,
            attributes = {},
            properties = {},
            ...rest
        } = params;

        let el = document.createElement(tag);
        if (id) el.id = id;
        if (class_name) el.className = class_name;

        if (style) {
            if (typeof style === 'string') {
                el.style.cssText = style;
            } else if (typeof style === 'object') {
                Object.assign(el.style, style);
            }
        }

        if (text !== undefined) el.textContent = text;
        if (value !== undefined) {
            if (tag === 'input' || tag === 'textarea' || tag === 'select') {
                el.value = value;
            } else {
                el.setAttribute('value', value);
            }
        }

        this._apply_margin_padding(el, pad_x, pad_y, ipad_x, ipad_y);

        if (events && typeof events === 'object') {
            for (let [evt, handler] of Object.entries(events)) {
                if (typeof handler === 'function') {
                    el.addEventListener(evt, handler);
                }
            }
        }

        for (let [key, val] of Object.entries(attributes)) {
            el.setAttribute(key, val);
        }
        for (let [key, val] of Object.entries(properties)) {
            el[key] = val;
        }
        for (let [key, val] of Object.entries(rest)) {
            el.setAttribute(key, val);
        }

        this._handle_grid_placement(parent, el, row, col, sticky, row_span, col_span);
        return el;
    }

    /**
     * Configure a column in a grid container.
     * @param {HTMLElement} parent - Grid container.
     * @param {number} col - Column number (1‑based).
     * @param {Object} options - Configuration options.
     * @param {number} options.weight - Flex weight (fr).
     * @param {number} options.minsize - Minimum size (px).
     * @param {number} options.pad - Padding (px).
     */
    configure_column(parent, col, { weight = 0, minsize = 0, pad = 0 } = {}) {
        if (!parent._grid_columns) parent._grid_columns = [];
        parent._grid_columns[col - 1] = { weight, minsize, pad };
        this._apply_grid_template(parent);
    }

    /**
     * Configure a row in a grid container.
     * @param {HTMLElement} parent - Grid container.
     * @param {number} row - Row number (1‑based).
     * @param {Object} options - Configuration options.
     * @param {number} options.weight - Flex weight (fr).
     * @param {number} options.minsize - Minimum size (px).
     * @param {number} options.pad - Padding (px).
     */
    configure_row(parent, row, { weight = 0, minsize = 0, pad = 0 } = {}) {
        if (!parent._grid_rows) parent._grid_rows = [];
        parent._grid_rows[row - 1] = { weight, minsize, pad };
        this._apply_grid_template(parent);
    }
    // #endregion core_creation

    // #region grid_helpers
    /**
     * Get the maximum row index currently occupied in the grid.
     * @param {HTMLElement} parent - Grid container.
     * @returns {number} Maximum row number.
     */
    _get_max_row(parent) {
        let max_row = 0;
        for (let child of parent.children) {
            let row = parseInt(child.style.gridRowStart) || 1;
            let row_span = this._get_row_span(child);
            let end_row = row + (row_span || 1) - 1;
            if (end_row > max_row) max_row = end_row;
        }
        return max_row;
    }

    /**
     * Get the maximum column index currently occupied in the grid.
     * @param {HTMLElement} parent - Grid container.
     * @returns {number} Maximum column number.
     */
    _get_max_col(parent) {
        let max_col = 0;
        for (let child of parent.children) {
            let col = parseInt(child.style.gridColumnStart) || 1;
            let col_span = this._get_col_span(child);
            let end_col = col + (col_span || 1) - 1;
            if (end_col > max_col) max_col = end_col;
        }
        return max_col;
    }

    /**
     * Get the row span of an element.
     * @param {HTMLElement} el - The element.
     * @returns {number|null} Row span value or null.
     */
    _get_row_span(el) {
        let row_end = el.style.gridRowEnd;
        if (row_end && row_end.startsWith('span')) {
            return parseInt(row_end.split(' ')[1]);
        }
        return null;
    }

    /**
     * Get the column span of an element.
     * @param {HTMLElement} el - The element.
     * @returns {number|null} Column span value or null.
     */
    _get_col_span(el) {
        let col_end = el.style.gridColumnEnd;
        if (col_end && col_end.startsWith('span')) {
            return parseInt(col_end.split(' ')[1]);
        }
        return null;
    }

    /**
     * Apply grid template columns/rows based on configured weights.
     * @param {HTMLElement} parent - Grid container.
     */
    _apply_grid_template(parent) {
        let max_col = this._get_max_col(parent);
        let cols = [];
        for (let i = 1; i <= max_col; i++) {
            let cfg = (parent._grid_columns && parent._grid_columns[i - 1]) || { weight: 0 };
            if (cfg.weight > 0) {
                cols.push(`minmax(auto, ${cfg.weight}fr)`);
            } else {
                cols.push('auto');
            }
        }
        parent.style.gridTemplateColumns = cols.join(' ');

        let max_row = this._get_max_row(parent);
        let rows = [];
        for (let i = 1; i <= max_row; i++) {
            let cfg = (parent._grid_rows && parent._grid_rows[i - 1]) || { weight: 0 };
            if (cfg.weight > 0) {
                rows.push(`minmax(auto, ${cfg.weight}fr)`);
            } else {
                rows.push('auto');
            }
        }
        parent.style.gridTemplateRows = rows.join(' ');
    }

    /**
     * Place an element into a grid parent with positioning and sticky.
     * @param {HTMLElement} parent - Grid container.
     * @param {HTMLElement} el - Element to place.
     * @param {number} row - Row number.
     * @param {number} col - Column number.
     * @param {string} sticky - Sticky direction string.
     * @param {number} row_span - Row span.
     * @param {number} col_span - Column span.
     */
    _handle_grid_placement(parent, el, row, col, sticky, row_span, col_span) {
        if (!parent) parent = document.body;
        if (!(parent instanceof HTMLElement)) return;

        if (getComputedStyle(parent).display !== 'grid') {
            parent.style.display = 'grid';
        }

        this._set_grid_position(el, row, col, row_span, col_span);
        this._apply_sticky(el, sticky);

        parent.appendChild(el);
        this._apply_grid_template(parent);
    }

    /**
     * Set the grid row/column start and span for an element.
     * @param {HTMLElement} el - The element.
     * @param {number} row - Row start.
     * @param {number} col - Column start.
     * @param {number} row_span - Row span.
     * @param {number} col_span - Column span.
     */
    _set_grid_position(el, row, col, row_span, col_span) {
        if (row !== undefined) {
            el.style.gridRowStart = row;
            if (row_span !== undefined) {
                el.style.gridRowEnd = `span ${row_span}`;
            } else {
                el.style.gridRowEnd = 'auto';
            }
        }
        if (col !== undefined) {
            el.style.gridColumnStart = col;
            if (col_span !== undefined) {
                el.style.gridColumnEnd = `span ${col_span}`;
            } else {
                el.style.gridColumnEnd = 'auto';
            }
        }
    }

    /**
     * Apply sticky alignment to an element.
     * @param {HTMLElement} el - The element.
     * @param {string} sticky - Sticky string (n/s/e/w combinations).
     */
    _apply_sticky(el, sticky) {
        if (!sticky) {
            el.style.justifySelf = 'center';
            el.style.alignSelf = 'center';
            return;
        }
        if (sticky.includes('e') && sticky.includes('w')) {
            el.style.justifySelf = 'stretch';
        } else if (sticky.includes('e')) {
            el.style.justifySelf = 'end';
        } else if (sticky.includes('w')) {
            el.style.justifySelf = 'start';
        } else {
            el.style.justifySelf = 'center';
        }
        if (sticky.includes('n') && sticky.includes('s')) {
            el.style.alignSelf = 'stretch';
        } else if (sticky.includes('n')) {
            el.style.alignSelf = 'start';
        } else if (sticky.includes('s')) {
            el.style.alignSelf = 'end';
        } else {
            el.style.alignSelf = 'center';
        }
    }

    /**
     * Apply margin and padding to an element.
     * @param {HTMLElement} el - The element.
     * @param {number} pad_x - Horizontal margin.
     * @param {number} pad_y - Vertical margin.
     * @param {number} ipad_x - Horizontal padding.
     * @param {number} ipad_y - Vertical padding.
     */
    _apply_margin_padding(el, pad_x, pad_y, ipad_x, ipad_y) {
        let margin = '';
        let padding = '';
        if (pad_x !== undefined) margin += ` ${pad_x}px`;
        if (pad_y !== undefined) margin += ` ${pad_y}px`;
        if (margin) el.style.margin = margin.trim();
        if (ipad_x !== undefined) padding += ` ${ipad_x}px`;
        if (ipad_y !== undefined) padding += ` ${ipad_y}px`;
        if (padding) el.style.padding = padding.trim();
    }
    // #endregion grid_helpers

    // #region widget_management
    /**
     * Remove a widget from the DOM.
     * @param {HTMLElement|string} widget - Element or its ID.
     */
    remove_widget(widget) {
        let el = null;
        if (typeof widget === 'string') {
            el = document.getElementById(widget);
        } else if (widget instanceof HTMLElement) {
            el = widget;
        }
        if (el && el.parentElement) {
            let parent = el.parentElement;
            parent.removeChild(el);
            this._apply_grid_template(parent);
        }
    }

    /**
     * Update an existing widget's properties.
     * @param {HTMLElement|string} widget - Element or its ID.
     * @param {Object} props - Properties to update.
     */
    update_widget(widget, props = {}) {
        let el = null;
        if (typeof widget === 'string') {
            el = document.getElementById(widget);
        } else if (widget instanceof HTMLElement) {
            el = widget;
        }
        if (!el) return;

        if (props.text !== undefined) el.textContent = props.text;
        if (props.value !== undefined) el.value = props.value;
        if (props.style !== undefined) el.style.cssText = props.style;
        if (props.class_name !== undefined) el.className = props.class_name;
        if (props.id !== undefined) el.id = props.id;

        let row = props.row !== undefined ? props.row : parseInt(el.style.gridRowStart) || 1;
        let col = props.col !== undefined ? props.col : parseInt(el.style.gridColumnStart) || 1;
        let row_span = props.row_span !== undefined ? props.row_span : null;
        let col_span = props.col_span !== undefined ? props.col_span : null;

        if (props.row !== undefined || props.col !== undefined || props.row_span !== undefined || props.col_span !== undefined) {
            this._set_grid_position(el, row, col, row_span, col_span);
        }

        if (props.sticky !== undefined) {
            this._apply_sticky(el, props.sticky);
        }

        if (props.events && typeof props.events === 'object') {
            for (let [evt, handler] of Object.entries(props.events)) {
                if (typeof handler === 'function') {
                    el.addEventListener(evt, handler);
                }
            }
        }

        if (props.row !== undefined || props.col !== undefined || props.row_span !== undefined || props.col_span !== undefined) {
            if (el.parentElement) {
                this._apply_grid_template(el.parentElement);
            }
        }
    }
    // #endregion widget_management

    // #region command_validation
    /**
     * Parse a command string into a parameters object.
     * @param {string} command_string - e.g., "document.oc.object_generate('div', { ... });"
     * @returns {Object|null} The params object (including tag) or null.
     */
    parse_command_string(command_string) {
        let trimmed = command_string.trim();
        let pattern = /^document\.oc\.object_generate\(\s*['"]([^'"]+)['"]\s*,\s*(\{.*\})\s*\)\s*;?\s*$/;
        let match = trimmed.match(pattern);
        if (!match) {
            return null;
        }
        let tag = match[1];
        let params_str = match[2];
        try {
            let params = new Function('return (' + params_str + ')')();
            params.tag = tag;
            return params;
        } catch (e) {
            return null;
        }
    }

    /**
     * Validate a command string and return errors.
     * @param {string} command_string - The command line.
     * @returns {Object} { valid: boolean, errors: Array<string>, params: Object|null }
     */
    validate_command_string(command_string) {
        let errors = [];
        let params = this.parse_command_string(command_string);
        if (!params) {
            errors.push('Invalid command syntax. Expected: document.oc.object_generate(\'tag\', { ... });');
            return { valid: false, errors: errors, params: null };
        }

        if (!params.tag) {
            errors.push('Missing or empty tag');
        }
        if (params.row === undefined || params.row === null) {
            errors.push('Missing row');
        } else if (typeof params.row !== 'number' || params.row < 1) {
            errors.push('row must be a positive number');
        }
        if (params.col === undefined || params.col === null) {
            errors.push('Missing col');
        } else if (typeof params.col !== 'number' || params.col < 1) {
            errors.push('col must be a positive number');
        }

        let optional_numeric = ['row_span', 'col_span', 'pad_x', 'pad_y', 'ipad_x', 'ipad_y'];
        for (let field of optional_numeric) {
            if (params[field] !== undefined && (typeof params[field] !== 'number' || params[field] < 0)) {
                errors.push(`${field} must be a non‑negative number`);
            }
        }

        if (params.sticky !== undefined && typeof params.sticky !== 'string') {
            errors.push('sticky must be a string');
        }

        if (params.parent !== undefined && typeof params.parent !== 'string') {
            errors.push('parent must be a string (element ID)');
        }

        if (params.style !== undefined && typeof params.style !== 'object') {
            errors.push('style must be an object');
        }

        return {
            valid: errors.length === 0,
            errors: errors,
            params: params
        };
    }
    // #endregion command_validation
}

if (!document.oc) {
    document.oc = new ObjectCreator();
}