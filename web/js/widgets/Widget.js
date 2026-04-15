class Widget {
    static _next_id_counter = 1;

    /**
     * Create a new Widget instance.
     * @param {Object} params - Parameters for the widget.
     * @param {string} params.tag - HTML tag name or custom widget type.
     * @param {string} [params.id] - Unique ID; if omitted, a default is generated.
     * @param {string} [params.class_name] - CSS class name.
     * @param {string} [params.text] - Inner text content.
     * @param {number} params.row - Grid row (1‑based).
     * @param {number} params.col - Grid column (1‑based).
     * @param {number} [params.row_span] - Row span.
     * @param {number} [params.col_span] - Column span.
     * @param {string} [params.sticky] - Sticky directions ('n', 's', 'e', 'w').
     * @param {number} [params.padx] - Horizontal margin (px).
     * @param {number} [params.pady] - Vertical margin (px).
     * @param {number} [params.ipadx] - Horizontal padding (px).
     * @param {number} [params.ipady] - Vertical padding (px).
     * @param {string} params.parent_id - ID of the parent container element.
     * @param {Object} [params.css] - CSS style overrides (non‑default).
     */
    constructor(params) {
        this.tag = params.tag;
        this.id = params.id || this._generate_default_id(params.tag);
        this.class_name = params.class_name || '';
        this.text = params.text || '';
        this.row = params.row || 1;
        this.col = params.col || 1;
        this.row_span = params.row_span;
        this.col_span = params.col_span;
        this.sticky = params.sticky || '';
        this.padx = params.padx;
        this.pady = params.pady;
        this.ipadx = params.ipadx;
        this.ipady = params.ipady;
        this.parent_id = params.parent_id;
        this.css = params.css || {};

        this.extra_attributes = {};
        let standard_keys = [
            'tag', 'id', 'class_name', 'text', 'row', 'col', 'row_span', 'col_span',
            'sticky', 'padx', 'pady', 'ipadx', 'ipady', 'parent_id', 'css'
        ];
        for (let key in params) {
            let is_standard = false;
            for (let i = 0; i < standard_keys.length; i++) {
                if (standard_keys[i] === key) {
                    is_standard = true;
                    break;
                }
            }
            if (!is_standard) {
                this.extra_attributes[key] = params[key];
            }
        }

        this.element = null;
        this.content_container = null;
    }

    // #region constructor_and_helpers
    /**
     * Generate a default ID for the widget.
     * @param {string} tag - The tag name.
     * @returns {string} A unique ID.
     */
    _generate_default_id(tag) {
        let new_id = Widget._next_id_counter;
        Widget._next_id_counter = Widget._next_id_counter + 1;
        return `widget_${tag}_${new_id}`;
    }

    /**
     * Check if this widget can act as a container for other widgets.
     * @returns {boolean} True if the widget can contain children.
     */
    is_container() {
        let container_tags = ['div', 'collapsible_section', 'popup_overlay'];
        for (let i = 0; i < container_tags.length; i++) {
            if (this.tag === container_tags[i]) {
                return true;
            }
        }
        return false;
    }
    // #endregion constructor_and_helpers

    // #region serialization
    /**
     * Convert the widget to a plain object suitable for JSON serialization.
     * @returns {Object} A plain object with all widget data.
     */
    to_dict() {
        let dict = {
            tag: this.tag,
            id: this.id,
            class_name: this.class_name,
            text: this.text,
            row: this.row,
            col: this.col,
            row_span: this.row_span,
            col_span: this.col_span,
            sticky: this.sticky,
            padx: this.padx,
            pady: this.pady,
            ipadx: this.ipadx,
            ipady: this.ipady,
            parent_id: this.parent_id,
            css: this.css
        };
        for (let key in this.extra_attributes) {
            dict[key] = this.extra_attributes[key];
        }
        return dict;
    }

    /**
     * Create a Widget instance from a plain object (deserialization).
     * @param {Object} data - The plain object (as produced by to_dict).
     * @returns {Widget} A new Widget instance.
     */
    static from_dict(data) {
        return new Widget(data);
    }
    // #endregion serialization

    // #region dom_building
    /**
     * Build the DOM element using document.oc.object_generate.
     * @param {HTMLElement} parent_element - The parent container (already obtained).
     * @returns {HTMLElement} The created element.
     */
    build(parent_element) {
        let params = {
            parent: parent_element,
            row: this.row,
            col: this.col,
            sticky: this.sticky,
            id: this.id,
            text: this.text,
        };
        if (this.class_name) { params.class_name = this.class_name; }
        if (this.row_span) { params.row_span = this.row_span; }
        if (this.col_span) { params.col_span = this.col_span; }
        if (this.padx) { params.padx = this.padx; }
        if (this.pady) { params.pady = this.pady; }
        if (this.ipadx) { params.ipadx = this.ipadx; }
        if (this.ipady) { params.ipady = this.ipady; }

        for (let key in this.extra_attributes) {
            params[key] = this.extra_attributes[key];
        }

        if (Object.keys(this.css).length > 0) {
            params.style = this.css;
        }

        // Handle special container widgets
        if (this.tag === 'collapsible_section') {
            return this._build_collapsible_section(parent_element, params);
        } else if (this.tag === 'popup_overlay') {
            return this._build_popup_overlay(parent_element, params);
        } else if (this.tag === 'message_box') {
            return this._build_message_box(parent_element, params);
        }

        // Default: use object_generate
        let element = document.oc.object_generate(this.tag, params);
        this.element = element;
        this.content_container = element;
        return element;
    }

    /**
     * Build a collapsible section widget.
     * @param {HTMLElement} parent_element - Parent container.
     * @param {Object} params - Parameters for the widget.
     * @returns {HTMLElement} The created element.
     */
    _build_collapsible_section(parent_element, params) {
        let CollapsibleSection = window.CollapsibleSection;
        if (!CollapsibleSection) {
            if (window.dev_mode) {
                console.warn('CollapsibleSection not available, falling back to div');
            }
            let fallback = document.oc.object_generate('div', params);
            this.element = fallback;
            this.content_container = fallback;
            return fallback;
        }

        let self = this;
        let content_container_div = null;

        let section = new CollapsibleSection({
            id: this.id,
            title: this.text || 'Section',
            content_builder: function(container) {
                content_container_div = document.createElement('div');
                content_container_div.id = self.id + '_content';
                content_container_div.className = 'collapsible_section_content';
                container.appendChild(content_container_div);
                return content_container_div;
            },
            default_open: true
        });

        this.element = section.render();
        this.content_container = content_container_div;
        parent_element.appendChild(this.element);

        if (Object.keys(this.css).length > 0) {
            Object.assign(this.element.style, this.css);
        }
        return this.element;
    }

    /**
     * Build a popup overlay widget.
     * @param {HTMLElement} parent_element - Parent container.
     * @param {Object} params - Parameters for the widget.
     * @returns {HTMLElement} The created element.
     */
    _build_popup_overlay(parent_element, params) {
        let PopupOverlay = window.PopupOverlay;
        if (!PopupOverlay) {
            if (window.dev_mode) {
                console.warn('PopupOverlay not available, falling back to div');
            }
            let fallback = document.oc.object_generate('div', params);
            this.element = fallback;
            this.content_container = fallback;
            return fallback;
        }

        let self = this;
        let content_container_div = null;

        let overlay = new PopupOverlay({
            title: this.text || 'Popup',
            content_builder: function(container) {
                content_container_div = document.createElement('div');
                content_container_div.id = self.id + '_content';
                content_container_div.className = 'popup_overlay_content';
                container.appendChild(content_container_div);
                return content_container_div;
            }
        });

        this.element = overlay.render();
        this.content_container = content_container_div;
        parent_element.appendChild(this.element);
        this.element.style.display = 'none';

        if (Object.keys(this.css).length > 0) {
            Object.assign(this.element.style, this.css);
        }
        return this.element;
    }

    /**
     * Build a message box widget.
     * @param {HTMLElement} parent_element - Parent container.
     * @param {Object} params - Parameters for the widget.
     * @returns {HTMLElement} The created element.
     */
    _build_message_box(parent_element, params) {
        let MessageBox = window.MessageBox;
        if (!MessageBox) {
            if (window.dev_mode) {
                console.warn('MessageBox not available, falling back to div');
            }
            let fallback = document.oc.object_generate('div', params);
            this.element = fallback;
            this.content_container = fallback;
            return fallback;
        }

        let message_box = new MessageBox({
            text: this.text || 'Message',
            duration: 3000,
            type: 'info'
        });

        this.element = message_box.render();
        this.content_container = this.element;
        parent_element.appendChild(this.element);

        if (Object.keys(this.css).length > 0) {
            Object.assign(this.element.style, this.css);
        }
        return this.element;
    }
    // #endregion dom_building

    // #region css_management
    /**
     * Update the CSS of the widget (merge with existing).
     * @param {Object} css_updates - Key‑value pairs of CSS properties to add/update.
     */
    update_css(css_updates) {
        for (let key in css_updates) {
            this.css[key] = css_updates[key];
        }
        if (this.element) {
            Object.assign(this.element.style, css_updates);
        }
    }

    /**
     * Get the element where child widgets should be placed.
     * @returns {HTMLElement} The content container (usually the widget's own element,
     *          but for collapsible_section it's the inner content area).
     */
    get_content_container() {
        return this.content_container || this.element;
    }
    // #endregion css_management

    // #region command_generation
    /**
     * Generate the JavaScript command string that recreates this widget.
     * @param {string} parent_var - The variable name for the parent container (default 'parent_container').
     * @returns {string} A valid document.oc.object_generate(...) line.
     */
    get_command_string(parent_var = 'parent_container') {
        let params = {
            parent: parent_var,
            row: this.row,
            col: this.col
        };
        if (this.row_span) { params.row_span = this.row_span; }
        if (this.col_span) { params.col_span = this.col_span; }
        if (this.sticky) { params.sticky = this.sticky; }
        if (this.id) { params.id = this.id; }
        if (this.class_name) { params.class_name = this.class_name; }
        if (this.text) { params.text = this.text; }
        if (this.padx) { params.padx = this.padx; }
        if (this.pady) { params.pady = this.pady; }
        if (this.ipadx) { params.ipadx = this.ipadx; }
        if (this.ipady) { params.ipady = this.ipady; }
        if (Object.keys(this.css).length > 0) {
            params.style = this.css;
        }
        for (let key in this.extra_attributes) {
            params[key] = this.extra_attributes[key];
        }

        let params_string = this._object_to_compact_string(params);
        return `document.oc.object_generate('${this.tag}', ${params_string});`;
    }

    /**
     * Convert an object to a compact single‑line string representation.
     * @param {Object} obj - The object to stringify.
     * @returns {string} Compact string.
     */
    _object_to_compact_string(obj) {
        let parts = [];
        for (let key in obj) {
            let value = obj[key];
            let value_str = this._value_to_string(value);
            parts.push(`${key}: ${value_str}`);
        }
        return `{ ${parts.join(', ')} }`;
    }

    /**
     * Convert a value to its string representation for code generation.
     * @param {any} value - The value to convert.
     * @returns {string} String representation.
     */
    _value_to_string(value) {
        if (value === null || value === undefined) {
            return 'null';
        }
        if (typeof value === 'string') {
            let escaped = value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
            return `'${escaped}'`;
        }
        if (typeof value === 'number') {
            return value.toString();
        }
        if (typeof value === 'boolean') {
            return value.toString();
        }
        if (Array.isArray(value)) {
            let items = [];
            for (let i = 0; i < value.length; i++) {
                items.push(this._value_to_string(value[i]));
            }
            return `[${items.join(', ')}]`;
        }
        if (typeof value === 'object') {
            return this._object_to_compact_string(value);
        }
        return 'null';
    }
    // #endregion command_generation
}

window.Widget = Widget;