// #region object_creator
/**
 * ObjectCreator: Tkinter-like widget system for grid-based UI creation.
 * Usage: document.oc.input({parent, row, col, sticky, rowSpan, colSpan, id, class_name, style, events, padx, pady, ipadx, ipady})
 * Returns a JS element placed in a CSS Grid with configurable rows/columns.
 * Row and column indices are 1‑based.
 */
class ObjectCreator {
    constructor() {
        if (!window._object_creator_instance) {
            window._object_creator_instance = this;
        }
        this.is_loaded = true;
        return window._object_creator_instance;
    }

    // #region apis
    object_generate(tag, params = {}) {
        let { parent, row, col, sticky, rowSpan, colSpan, id, class_name, style, events, padx, pady, ipadx, ipady } = params;
        let el = document.createElement(tag);
        if (id) el.id = id;
        if (class_name) el.className = class_name;
        if (style) el.style.cssText = style;

        // Apply padding/margin (Tkinter-like)
        if (padx !== undefined || pady !== undefined || ipadx !== undefined || ipady !== undefined) {
            let margin = '';
            let padding = '';
            if (padx !== undefined) margin += ` ${padx}px`;
            if (pady !== undefined) margin += ` ${pady}px`;
            if (margin) el.style.margin = margin.trim();
            if (ipadx !== undefined) padding += ` ${ipadx}px`;
            if (ipady !== undefined) padding += ` ${ipady}px`;
            if (padding) el.style.padding = padding.trim();
        }

        // Bind events
        if (events && typeof events === 'object') {
            for (let [evt, handler] of Object.entries(events)) {
                if (typeof handler === 'function') {
                    el.addEventListener(evt, handler);
                }
            }
        }

        this._handle_grid_placement(parent, el, row, col, sticky, rowSpan, colSpan);
        return el;
    }

    input(params) {
        return this.object_generate('input', params);
    }

    button(params) {
        let btn = this.object_generate('button', params);
        if (params && params.text) btn.textContent = params.text;
        return btn;
    }

    label(params) {
        let lbl = this.object_generate('span', params);
        if (params && params.text) lbl.textContent = params.text;
        return lbl;
    }
    // #endregion apis

    // #region grid_management
    configure_column(parent, col, { weight = 0, minsize = 0, pad = 0 } = {}) {
        if (!parent._gridColumns) parent._gridColumns = [];
        parent._gridColumns[col - 1] = { weight, minsize, pad }; // store 0‑based
        this._apply_grid_template(parent);
    }

    configure_row(parent, row, { weight = 0, minsize = 0, pad = 0 } = {}) {
        if (!parent._gridRows) parent._gridRows = [];
        parent._gridRows[row - 1] = { weight, minsize, pad }; // store 0‑based
        this._apply_grid_template(parent);
    }

    /**
     * Get the maximum row index used by children (1‑based).
     */
    _get_max_row(parent) {
        let maxRow = 0;
        for (let child of parent.children) {
            let row = parseInt(child.style.gridRowStart) || 1;
            let rowSpan = this._get_row_span(child);
            let endRow = row + (rowSpan || 1) - 1;
            if (endRow > maxRow) maxRow = endRow;
        }
        return maxRow;
    }

    /**
     * Get the maximum column index used by children (1‑based).
     */
    _get_max_col(parent) {
        let maxCol = 0;
        for (let child of parent.children) {
            let col = parseInt(child.style.gridColumnStart) || 1;
            let colSpan = this._get_col_span(child);
            let endCol = col + (colSpan || 1) - 1;
            if (endCol > maxCol) maxCol = endCol;
        }
        return maxCol;
    }

    _get_row_span(el) {
        let rowEnd = el.style.gridRowEnd;
        if (rowEnd && rowEnd.startsWith('span')) {
            return parseInt(rowEnd.split(' ')[1]);
        }
        return null;
    }

    _get_col_span(el) {
        let colEnd = el.style.gridColumnEnd;
        if (colEnd && colEnd.startsWith('span')) {
            return parseInt(colEnd.split(' ')[1]);
        }
        return null;
    }

    _apply_grid_template(parent) {
        // Columns: from 1 to maxCol (inclusive)
        let maxCol = this._get_max_col(parent);
        let cols = [];
        for (let i = 1; i <= maxCol; i++) {
            let cfg = (parent._gridColumns && parent._gridColumns[i - 1]) || { weight: 0 };
            if (cfg.weight > 0) {
                cols.push(`minmax(auto, ${cfg.weight}fr)`);
            } else {
                cols.push('auto');
            }
        }
        parent.style.gridTemplateColumns = cols.join(' ');

        // Rows: from 1 to maxRow (inclusive)
        let maxRow = this._get_max_row(parent);
        let rows = [];
        for (let i = 1; i <= maxRow; i++) {
            let cfg = (parent._gridRows && parent._gridRows[i - 1]) || { weight: 0 };
            if (cfg.weight > 0) {
                rows.push(`minmax(auto, ${cfg.weight}fr)`);
            } else {
                rows.push('auto');
            }
        }
        parent.style.gridTemplateRows = rows.join(' ');
    }
    // #endregion grid_management

    // #region widget_operations
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
        let rowSpan = props.rowSpan !== undefined ? props.rowSpan : null;
        let colSpan = props.colSpan !== undefined ? props.colSpan : null;

        if (props.row !== undefined || props.col !== undefined || props.rowSpan !== undefined || props.colSpan !== undefined) {
            this._set_grid_position(el, row, col, rowSpan, colSpan);
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

        if (props.row !== undefined || props.col !== undefined || props.rowSpan !== undefined || props.colSpan !== undefined) {
            if (el.parentElement) {
                this._apply_grid_template(el.parentElement);
            }
        }
    }
    // #endregion widget_operations

    // #region helpers
    _handle_grid_placement(parent, el, row, col, sticky, rowSpan, colSpan) {
        if (!parent) parent = document.body;
        if (!(parent instanceof HTMLElement)) return;

        if (getComputedStyle(parent).display !== 'grid') {
            parent.style.display = 'grid';
        }

        this._set_grid_position(el, row, col, rowSpan, colSpan);
        this._apply_sticky(el, sticky);

        parent.appendChild(el);
        this._apply_grid_template(parent);
    }

    _set_grid_position(el, row, col, rowSpan, colSpan) {
        if (row !== undefined) {
            el.style.gridRowStart = row;
            if (rowSpan !== undefined) {
                el.style.gridRowEnd = `span ${rowSpan}`;
            } else {
                el.style.gridRowEnd = 'auto';
            }
        }
        if (col !== undefined) {
            el.style.gridColumnStart = col;
            if (colSpan !== undefined) {
                el.style.gridColumnEnd = `span ${colSpan}`;
            } else {
                el.style.gridColumnEnd = 'auto';
            }
        }
    }

    _apply_sticky(el, sticky) {
        if (!sticky) {
            el.style.justifySelf = 'start';
            el.style.alignSelf = 'start';
            return;
        }

        // Horizontal
        if (sticky.includes('e') && sticky.includes('w')) {
            el.style.justifySelf = 'stretch';
        } else if (sticky.includes('e')) {
            el.style.justifySelf = 'end';
        } else if (sticky.includes('w')) {
            el.style.justifySelf = 'start';
        } else {
            el.style.justifySelf = 'start';
        }

        // Vertical
        if (sticky.includes('n') && sticky.includes('s')) {
            el.style.alignSelf = 'stretch';
        } else if (sticky.includes('n')) {
            el.style.alignSelf = 'start';
        } else if (sticky.includes('s')) {
            el.style.alignSelf = 'end';
        } else {
            el.style.alignSelf = 'start';
        }
    }
    // #endregion helpers
}

// Attach singleton to document.oc
if (!document.oc) {
    document.oc = new ObjectCreator();
}
// #endregion object_creator