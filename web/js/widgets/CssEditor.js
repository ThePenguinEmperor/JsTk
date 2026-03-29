// #region css_editor
class CssEditor {
    constructor(on_apply) {
        this.on_apply = on_apply || (() => {});
        this.target_element = null;
        this.modal_element = null;
        this.form_area = null;
        this.css_inputs = {};     // store input elements
        this.row_counter = 1;     // for internal layout of the form
        // Do not create UI yet – create on demand in open_for()
    }

    create_ui() {
        this.modal_element = document.oc.object_generate('div', {
            parent: document.body,
            row: 1,
            col: 1,
            class_name: 'tester_css_editor_modal',
            style: 'display: none;'
        });

        let content = document.oc.object_generate('div', {
            parent: this.modal_element,
            row: 1,
            col: 1,
            class_name: 'tester_css_editor_content'
        });

        // Header
        let header = document.oc.object_generate('div', {
            parent: content,
            row: 1,
            col: 1,
            class_name: 'tester_css_editor_header'
        });
        let title = document.oc.object_generate('span', {
            parent: header,
            row: 1,
            col: 1,
            text: 'CSS Editor',
            class_name: 'tester_label'
        });
        let close_btn = document.oc.object_generate('button', {
            parent: header,
            row: 1,
            col: 2,
            text: '×',
            class_name: 'tester_button tester_button_secondary',
            events: { click: () => this.hide() }
        });

        // Form area (scrollable)
        this.form_area = document.oc.object_generate('div', {
            parent: content,
            row: 2,
            col: 1,
            class_name: 'tester_css_editor_form',
            style: 'overflow-y: auto; flex: 1;'
        });

        // Define sections with properties
        const sections = [
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

        // Build sections using CollapsibleDiv
        this.row_counter = 1;
        for (let section of sections) {
            let collapsible = new CollapsibleDiv({
                parent: this.form_area,
                row: this.row_counter,
                col: 1,
                colSpan: 1,
                sticky: 'ew',
                margin: { x: 0, y: 4 },
                title: section.name,
                defaultOpen: true
            });
            let section_content = collapsible.get_content();

            // Now add property rows inside this content container
            let inner_row_counter = 1;
            for (let prop of section.properties) {
                this._add_property_row(section_content, prop, inner_row_counter);
                inner_row_counter++;
            }
            this.row_counter++;
        }

        // Buttons
        let button_bar = document.oc.object_generate('div', {
            parent: content,
            row: 3,
            col: 1,
            class_name: 'tester_css_editor_buttons'
        });
        let apply_btn = document.oc.object_generate('button', {
            parent: button_bar,
            row: 1,
            col: 1,
            text: 'Apply',
            class_name: 'tester_button',
            events: { click: () => this.apply() }
        });
        let cancel_btn = document.oc.object_generate('button', {
            parent: button_bar,
            row: 1,
            col: 2,
            text: 'Cancel',
            class_name: 'tester_button tester_button_secondary',
            events: { click: () => this.hide() }
        });
    }

    _add_property_row(parent, prop, row) {
        // Create a row div
        let row_div = document.oc.object_generate('div', {
            parent: parent,
            row: row,
            col: 1,
            class_name: 'tester_css_editor_property_row',
            style: 'display: flex; gap: 8px; margin-bottom: 8px; align-items: center;'
        });

        let label = document.oc.object_generate('span', {
            parent: row_div,
            row: 1,
            col: 1,
            text: prop.name,
            class_name: 'tester_label',
            style: 'width: 120px;'
        });

        let input = null;
        if (prop.type === 'select') {
            input = document.oc.object_generate('select', {
                parent: row_div,
                row: 1,
                col: 2,
                class_name: 'tester_select',
                style: 'flex: 1;'
            });
            for (let opt of prop.options) {
                let option = document.createElement('option');
                option.value = opt;
                option.textContent = opt;
                input.appendChild(option);
            }
        } else if (prop.type === 'color') {
            input = document.oc.object_generate('input', {
                parent: row_div,
                row: 1,
                col: 2,
                type: 'color',
                class_name: 'tester_input',
                style: 'flex: 1;'
            });
        } else if (prop.type === 'number') {
            input = document.oc.object_generate('input', {
                parent: row_div,
                row: 1,
                col: 2,
                type: 'number',
                step: prop.step || 1,
                min: prop.min,
                max: prop.max,
                class_name: 'tester_input',
                style: 'flex: 1;'
            });
        } else {
            // text input (default)
            let inputContainer = document.oc.object_generate('div', {
                parent: row_div,
                row: 1,
                col: 2,
                style: 'flex: 1; display: flex; gap: 4px;'
            });
            input = document.oc.object_generate('input', {
                parent: inputContainer,
                row: 1,
                col: 1,
                type: 'text',
                class_name: 'tester_input',
                style: 'flex: 1;',
                placeholder: prop.placeholder || ''
            });
            if (prop.unit) {
                let unitSelect = document.oc.object_generate('select', {
                    parent: inputContainer,
                    row: 1,
                    col: 2,
                    class_name: 'tester_select',
                    style: 'width: 60px;'
                });
                ['px', 'em', 'rem', '%', 'vw', 'vh', 'pt'].forEach(unit => {
                    let opt = document.createElement('option');
                    opt.value = unit;
                    opt.textContent = unit;
                    if (unit === (prop.defaultUnit || 'px')) opt.selected = true;
                    unitSelect.appendChild(opt);
                });
                this.css_inputs[prop.name + '_unit'] = unitSelect;
            }
        }

        this.css_inputs[prop.name] = input;
    }

    open_for(element) {
        if (!this.modal_element) {
            this.create_ui();
        }
        this.target_element = element;
        this.populate_from_element();
        this.modal_element.style.display = 'flex';
    }

    populate_from_element() {
        if (!this.target_element) return;
        let style = window.getComputedStyle(this.target_element);
        for (let [prop, input] of Object.entries(this.css_inputs)) {
            if (prop.endsWith('_unit')) continue;
            let cssValue = style.getPropertyValue(prop);
            if (cssValue) {
                if (input.tagName === 'SELECT') {
                    let optionExists = Array.from(input.options).some(opt => opt.value === cssValue);
                    if (optionExists) input.value = cssValue;
                } else if (input.type === 'color') {
                    if (cssValue.startsWith('rgb')) {
                        let rgb = cssValue.match(/\d+/g);
                        if (rgb && rgb.length >= 3) {
                            let hex = '#' + rgb.slice(0,3).map(x => parseInt(x).toString(16).padStart(2,'0')).join('');
                            input.value = hex;
                        } else {
                            input.value = cssValue;
                        }
                    } else {
                        input.value = cssValue;
                    }
                } else if (input.type === 'number') {
                    input.value = parseFloat(cssValue);
                } else {
                    let unitInput = this.css_inputs[prop + '_unit'];
                    if (unitInput) {
                        let match = cssValue.match(/^([\d.-]+)([a-z%]+)$/);
                        if (match) {
                            input.value = match[1];
                            unitInput.value = match[2];
                        } else {
                            input.value = cssValue;
                        }
                    } else {
                        input.value = cssValue;
                    }
                }
            }
        }
    }

    collect_css() {
        let cssObject = {};
        for (let [prop, input] of Object.entries(this.css_inputs)) {
            if (prop.endsWith('_unit')) continue;
            let value = null;
            if (input.tagName === 'SELECT') {
                value = input.value;
            } else if (input.type === 'color') {
                value = input.value;
            } else if (input.type === 'number') {
                value = input.value;
            } else {
                let unitInput = this.css_inputs[prop + '_unit'];
                if (unitInput && input.value) {
                    value = input.value + unitInput.value;
                } else {
                    value = input.value;
                }
            }
            if (value) {
                cssObject[prop] = value;
            }
        }
        return cssObject;
    }

    apply() {
        if (this.target_element) {
            let cssObject = this.collect_css();
            let cssString = '';
            for (let [prop, val] of Object.entries(cssObject)) {
                cssString += `${prop}: ${val}; `;
            }
            this.target_element.style.cssText = cssString;
            this.on_apply(cssString, this.target_element);
        }
        this.hide();
    }

    hide() {
        if (this.modal_element) {
            this.modal_element.style.display = 'none';
        }
        this.target_element = null;
    }
}
// #endregion