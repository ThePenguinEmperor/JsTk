// #region css_editor
/**
 * CSS Editor Modal – allows editing CSS properties of an element.
 * Uses PopupOverlay for modal and CollapsibleSection for property groups.
 */
class CssEditor {
    // #region constructor
    /**
     * @param {Function} on_apply - Callback when Apply is clicked, receives (css_text, target_element)
     * @param {Object} margin - { x, y } margin in pixels (default 3,5)
     */
    constructor(on_apply, margin = { x: 3, y: 5 }) {
        this.on_apply = on_apply || (() => {});
        this.margin = margin;
        this.target_element = null;
        this.popup = null;                // will hold the PopupOverlay instance
        this.css_inputs = {};
        this.custom_css_textarea = null;

        this.section_list = [
            { name: 'Layout', properties: [
                { name: 'display', type: 'select', options: ['block', 'inline', 'flex', 'grid', 'inline-block', 'none'] },
                { name: 'position', type: 'select', options: ['static', 'relative', 'absolute', 'fixed', 'sticky'] },
                { name: 'flex-direction', type: 'select', options: ['row', 'row-reverse', 'column', 'column-reverse'] },
                { name: 'justify-content', type: 'select', options: ['flex-start', 'flex-end', 'center', 'space-between', 'space-around'] },
                { name: 'align-items', type: 'select', options: ['stretch', 'flex-start', 'flex-end', 'center', 'baseline'] }
            ] },
            { name: 'Dimensions', properties: [
                { name: 'width', unit: true, defaultUnit: 'px' },
                { name: 'height', unit: true, defaultUnit: 'px' },
                { name: 'min-width', unit: true },
                { name: 'min-height', unit: true },
                { name: 'max-width', unit: true },
                { name: 'max-height', unit: true }
            ] },
            { name: 'Spacing', properties: [
                { name: 'margin', unit: true },
                { name: 'margin-top', unit: true },
                { name: 'margin-right', unit: true },
                { name: 'margin-bottom', unit: true },
                { name: 'margin-left', unit: true },
                { name: 'padding', unit: true },
                { name: 'padding-top', unit: true },
                { name: 'padding-right', unit: true },
                { name: 'padding-bottom', unit: true },
                { name: 'padding-left', unit: true }
            ] },
            { name: 'Colors', properties: [
                { name: 'background-color', type: 'color' },
                { name: 'color', type: 'color' },
                { name: 'opacity', type: 'number', min: 0, max: 1, step: 0.1 }
            ] },
            { name: 'Borders', properties: [
                { name: 'border', unit: true, hasStyle: true, hasColor: true },
                { name: 'border-radius', unit: true },
                { name: 'border-width', unit: true },
                { name: 'border-style', type: 'select', options: ['none', 'solid', 'dashed', 'dotted', 'double'] },
                { name: 'border-color', type: 'color' }
            ] },
            { name: 'Typography', properties: [
                { name: 'font-family', type: 'text' },
                { name: 'font-size', unit: true, defaultUnit: 'px' },
                { name: 'font-weight', type: 'select', options: ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'] },
                { name: 'text-align', type: 'select', options: ['left', 'center', 'right', 'justify'] },
                { name: 'line-height', unit: true, defaultUnit: 'px' },
                { name: 'letter-spacing', unit: true, defaultUnit: 'px' },
                { name: 'text-decoration', type: 'select', options: ['none', 'underline', 'overline', 'line-through'] }
            ] },
            { name: 'Effects', properties: [
                { name: 'box-shadow', type: 'text', placeholder: 'h-shadow v-shadow blur spread color' },
                { name: 'transition', type: 'text', placeholder: 'property duration timing-function delay' },
                { name: 'transform', type: 'text', placeholder: 'rotate(45deg) scale(1.2)' },
                { name: 'opacity', type: 'number', min: 0, max: 1, step: 0.1 }
            ] }
        ];
    }
    // #endregion

    // #region ui_creation
    /**
     * Builds the CSS editor UI inside the given container (the popup's scroll area).
     * @param {HTMLElement} container - The scrollable container where the editor will be built.
     */
build_ui(container) {
        // Use the container directly – it's the scrollable content panel.
        // Make it a grid with 2 columns.
        container.style.display = 'grid';
        container.style.gridTemplateColumns = '1fr 1fr';
        container.style.gap = '16px';
        document.oc.configure_column(container, 1, { weight: 1 });
        document.oc.configure_column(container, 2, { weight: 1 });

        let row_counter = 1;

        // Place collapsible sections – each spans both columns.
        for (let section of this.section_list) {
            let section_widget = new CollapsibleSection(section.name, (content_div) => {
                this._build_property_rows(content_div, section.properties);
            }, { margin: this.margin });
            section_widget.build(container);
            // The CollapsibleSection's container will be a child of the grid.
            // We need to make it span both columns. We can do that after building.
            section_widget.container.style.gridColumn = 'span 2';
            row_counter++;
        }

        // Custom CSS section – spans both columns
        let custom_section = new CollapsibleSection('Custom CSS (overrides above)', (content_div) => {
            this.custom_css_textarea = document.oc.object_generate('textarea', {
                parent: content_div,
                row: 1,
                col: 1,
                class_name: 'tester_textarea',
                placeholder: '/* Your custom CSS here */\n/* Example: .my-class { color: red; } */',
                sticky: 'ew',
                padx: this.margin.x,
                pady: this.margin.y
            });
        }, { margin: this.margin });
        custom_section.build(container);
        custom_section.container.style.gridColumn = 'span 2';
        row_counter++;

        // Buttons: Apply in column 1, Cancel in column 2 (directly in grid, no extra container)
        let apply_btn = document.oc.object_generate('button', {
            parent: container,
            row: row_counter,
            col: 1,
            text: 'Apply',
            class_name: 'tester_button',
            sticky: 'ew',
            padx: this.margin.x,
            pady: this.margin.y,
            events: { click: () => this.apply() }
        });
        let cancel_btn = document.oc.object_generate('button', {
            parent: container,
            row: row_counter,
            col: 2,
            text: 'Cancel',
            class_name: 'tester_button tester_button_secondary',
            sticky: 'ew',
            padx: this.margin.x,
            pady: this.margin.y,
            events: { click: () => this.hide() }
        });
    }

    // #endregion

    // #region property_helpers
    /**
     * Builds rows for a list of properties inside a grid container.
     * @param {HTMLElement} parent - Grid container (one column)
     * @param {Array} properties - List of property definitions
     */
    _build_property_rows(parent, properties) {
        let row_num = 1;
        for (let prop of properties) {
            let row_div = document.oc.object_generate('div', {
                parent: parent,
                row: row_num,
                col: 1,
                class_name: 'tester_css_editor_property_row',
                sticky: 'ew',
                padx: this.margin.x,
                pady: this.margin.y
            });
            // Two columns: label (auto) and input (1fr)
            document.oc.configure_column(row_div, 1, { weight: 0 });
            document.oc.configure_column(row_div, 2, { weight: 1 });

            let label = document.oc.object_generate('span', {
                parent: row_div,
                row: 1,
                col: 1,
                text: prop.name,
                class_name: 'tester_label'
            });
            label.style.width = '120px';  // only inline style allowed for fixed label width

            let input_wrapper = document.oc.object_generate('div', {
                parent: row_div,
                row: 1,
                col: 2,
                class_name: 'tester_css_editor_input_wrapper'
            });
            document.oc.configure_column(input_wrapper, 1, { weight: 1 });
            if (prop.unit) {
                document.oc.configure_column(input_wrapper, 2, { weight: 0 });
            }

            let input = this._create_input(input_wrapper, prop);
            this.css_inputs[prop.name] = input;
            if (prop.unit) {
                let unit_select = this._create_unit_select(input_wrapper, prop.default_unit || 'px');
                this.css_inputs[prop.name + '_unit'] = unit_select;
            }
            row_num++;
        }
    }

    /**
     * Creates the appropriate input element based on property type.
     * @param {HTMLElement} parent - Grid container (one or two columns)
     * @param {Object} prop - Property definition
     * @returns {HTMLElement}
     */
    _create_input(parent, prop) {
        if (prop.type === 'select') {
            let select = document.oc.object_generate('select', {
                parent: parent,
                row: 1,
                col: 1,
                class_name: 'tester_select'
            });
            for (let opt of prop.options) {
                let option = document.createElement('option');
                option.value = opt;
                option.textContent = opt;
                select.appendChild(option);
            }
            return select;
        } else if (prop.type === 'color') {
            return document.oc.object_generate('input', {
                parent: parent,
                row: 1,
                col: 1,
                type: 'color',
                class_name: 'tester_input'
            });
        } else if (prop.type === 'number') {
            return document.oc.object_generate('input', {
                parent: parent,
                row: 1,
                col: 1,
                type: 'number',
                step: prop.step || 1,
                min: prop.min,
                max: prop.max,
                class_name: 'tester_input'
            });
        } else {
            // default text input
            return document.oc.object_generate('input', {
                parent: parent,
                row: 1,
                col: 1,
                type: 'text',
                class_name: 'tester_input',
                placeholder: prop.placeholder || ''
            });
        }
    }

    /**
     * Creates a unit selector dropdown.
     * @param {HTMLElement} parent - Grid container (second column)
     * @param {string} default_unit - Default unit (e.g., 'px')
     * @returns {HTMLElement}
     */
    _create_unit_select(parent, default_unit) {
        let select = document.oc.object_generate('select', {
            parent: parent,
            row: 1,
            col: 2,
            class_name: 'tester_select'
        });
        let units = ['px', 'em', 'rem', '%', 'vw', 'vh', 'pt'];
        for (let unit of units) {
            let option = document.createElement('option');
            option.value = unit;
            option.textContent = unit;
            if (unit === default_unit) option.selected = true;
            select.appendChild(option);
        }
        return select;
    }
    // #endregion

    // #region public_methods
    /**
     * Opens the CSS editor for a given element.
     * @param {HTMLElement} element - The element whose CSS will be edited.
     */
    open_for(element) {
        this.target_element = element;
        // Create a new popup with the build_ui method as the content builder
        this.popup = new PopupOverlay((container) => {
            this.build_ui(container);
        }, () => {
            // on close, clean up references
            this.popup = null;
            this.target_element = null;
        });
        this.popup.open();
        // Populate fields after popup is built
        setTimeout(() => {
            this._populate_from_element();
        }, 0);
    }

    hide() {
        if (this.popup) {
            this.popup.close(); // this will also call the on_close which nulls the references
        }
    }

    apply() {
        if (!this.target_element) return;
        let css_object = this._collect_css();
        let css_string = '';
        for (let [prop, val] of Object.entries(css_object)) {
            css_string += `${prop}: ${val}; `;
        }
        this.target_element.style.cssText = css_string;
        this.on_apply(css_string, this.target_element);
        this.hide();
    }
    // #endregion

    // #region internal_helpers
    _populate_from_element() {
        let style = window.getComputedStyle(this.target_element);
        for (let [prop, input] of Object.entries(this.css_inputs)) {
            if (prop.endsWith('_unit')) continue;
            let css_value = style.getPropertyValue(prop);
            if (!css_value) continue;
            if (input.tagName === 'SELECT') {
                let exists = Array.from(input.options).some(opt => opt.value === css_value);
                if (exists) input.value = css_value;
            } else if (input.type === 'color') {
                // simple rgb to hex conversion
                if (css_value.startsWith('rgb')) {
                    let rgb = css_value.match(/\d+/g);
                    if (rgb && rgb.length >= 3) {
                        let hex = '#' + rgb.slice(0,3).map(x => parseInt(x).toString(16).padStart(2,'0')).join('');
                        input.value = hex;
                    } else {
                        input.value = css_value;
                    }
                } else {
                    input.value = css_value;
                }
            } else if (input.type === 'number') {
                input.value = parseFloat(css_value);
            } else {
                let unit_input = this.css_inputs[prop + '_unit'];
                if (unit_input) {
                    let match = css_value.match(/^([\d.-]+)([a-z%]+)$/);
                    if (match) {
                        input.value = match[1];
                        unit_input.value = match[2];
                    } else {
                        input.value = css_value;
                    }
                } else {
                    input.value = css_value;
                }
            }
        }
    }

    _collect_css() {
        let css = {};
        for (let [prop, input] of Object.entries(this.css_inputs)) {
            if (prop.endsWith('_unit')) continue;
            let value = null;
            if (input.tagName === 'SELECT') {
                value = input.value;
            } else if (input.type === 'color' || input.type === 'number') {
                value = input.value;
            } else {
                let unit_input = this.css_inputs[prop + '_unit'];
                if (unit_input && input.value) {
                    value = input.value + unit_input.value;
                } else {
                    value = input.value;
                }
            }
            if (value) css[prop] = value;
        }
        // Custom CSS overrides form values
        if (this.custom_css_textarea && this.custom_css_textarea.value) {
            let custom = this.custom_css_textarea.value;
            let regex = /([\w-]+)\s*:\s*([^;]+);/g;
            let match;
            while ((match = regex.exec(custom)) !== null) {
                let prop = match[1].trim();
                let val = match[2].trim();
                css[prop] = val;  // override
            }
        }
        return css;
    }
    // #endregion
}
// #endregion