// #region constructor_and_helpers
class CssEditor {
    constructor(controller) {
        this.controller = controller;
        this.popup = null;
        this.target_element = null;
        this.live_preview_element = null;
        this.save_callback = null;
        this.css_inputs = new Map();   // prop_name -> { input, unit_select, row_element }
        this.custom_css_textarea = null;
        this.section_headers = {};
        this.property_groups = null;
    }

    /**
     * Open the CSS editor for a target element.
     * @param {HTMLElement} target_element - The element to edit CSS for.
     * @param {Function} on_save - Callback called when CSS is applied (receives css_updates object).
     */
    open(target_element, on_save = null) {
        this.target_element = target_element;
        this.save_callback = on_save;

        // Create a live preview clone
        this.live_preview_element = target_element.cloneNode(true);
        this.live_preview_element.id = 'css_live_preview';
        this.live_preview_element.style.position = 'relative';
        this.live_preview_element.style.margin = '10px 0';
        this.live_preview_element.style.padding = '10px';
        this.live_preview_element.style.border = '2px solid #ccc';
        this.live_preview_element.style.backgroundColor = '#f9f9f9';

        if (!this.popup) {
            this.create_popup();
        }

        this.load_current_styles();
        this.popup.open();
    }

    /**
     * Create the popup overlay with CSS editor content.
     */
    create_popup() {
        let self = this;
        this.popup = new PopupOverlay(
            function(container) {
                self.build_editor_content(container);
            },
            function() {
                self.target_element = null;
                self.live_preview_element = null;
                self.save_callback = null;
            }
        );
    }
// #endregion

// #region editor_content
    build_editor_content(container) {
        let title = document.createElement('h3');
        title.textContent = 'CSS Editor';
        title.style.marginBottom = '10px';
        container.appendChild(title);

        let preview_label = document.createElement('div');
        preview_label.textContent = 'Live Preview (clone of target):';
        preview_label.style.fontWeight = 'bold';
        preview_label.style.marginTop = '10px';
        container.appendChild(preview_label);
        container.appendChild(this.live_preview_element);

        let content = document.createElement('div');
        content.style.maxHeight = '500px';
        content.style.overflowY = 'auto';
        content.style.marginTop = '10px';

        this.property_groups = this.get_property_groups();
        for (let group_name in this.property_groups) {
            this.build_collapsible_section(content, group_name, this.property_groups[group_name]);
        }

        let custom_section = document.createElement('div');
        custom_section.style.marginTop = '20px';
        custom_section.style.borderTop = '1px solid #ccc';
        custom_section.style.paddingTop = '10px';
        let custom_label = document.createElement('div');
        custom_label.textContent = 'Custom CSS (raw)';
        custom_label.style.fontWeight = 'bold';
        custom_section.appendChild(custom_label);

        this.custom_css_textarea = document.createElement('textarea');
        this.custom_css_textarea.style.width = '100%';
        this.custom_css_textarea.style.height = '100px';
        this.custom_css_textarea.style.fontFamily = 'monospace';
        this.custom_css_textarea.style.fontSize = '12px';
        custom_section.appendChild(this.custom_css_textarea);
        content.appendChild(custom_section);

        let button_row = document.createElement('div');
        button_row.style.marginTop = '20px';
        button_row.style.display = 'flex';
        button_row.style.gap = '10px';
        button_row.style.justifyContent = 'flex-end';

        let apply_btn = document.createElement('button');
        apply_btn.textContent = 'Apply';
        apply_btn.className = 'tester_button';
        apply_btn.onclick = () => this.apply_changes();

        let cancel_btn = document.createElement('button');
        cancel_btn.textContent = 'Cancel';
        cancel_btn.className = 'tester_button tester_button_secondary';
        cancel_btn.onclick = () => this.popup.close();

        button_row.appendChild(apply_btn);
        button_row.appendChild(cancel_btn);

        content.appendChild(button_row);
        container.appendChild(content);
    }

    get_property_groups() {
        return {
            'Layout': {
                'display': { type: 'select', options: ['', 'block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid', 'inline-grid', 'none'] },
                'position': { type: 'select', options: ['', 'static', 'relative', 'absolute', 'fixed', 'sticky'] },
                'flex-direction': { type: 'select', options: ['', 'row', 'row-reverse', 'column', 'column-reverse'] },
                'justify-content': { type: 'select', options: ['', 'flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'] },
                'align-items': { type: 'select', options: ['', 'stretch', 'flex-start', 'flex-end', 'center', 'baseline'] },
                'flex-wrap': { type: 'select', options: ['', 'nowrap', 'wrap', 'wrap-reverse'] },
                'grid-template-columns': { type: 'text' },
                'grid-template-rows': { type: 'text' },
                'gap': { type: 'number', unit: 'px' }
            },
            'Dimensions': {
                'width': { type: 'number', unit: 'px' },
                'height': { type: 'number', unit: 'px' },
                'min-width': { type: 'number', unit: 'px' },
                'min-height': { type: 'number', unit: 'px' },
                'max-width': { type: 'number', unit: 'px' },
                'max-height': { type: 'number', unit: 'px' },
                'margin': { type: 'number', unit: 'px' },
                'margin-top': { type: 'number', unit: 'px' },
                'margin-right': { type: 'number', unit: 'px' },
                'margin-bottom': { type: 'number', unit: 'px' },
                'margin-left': { type: 'number', unit: 'px' },
                'padding': { type: 'number', unit: 'px' },
                'padding-top': { type: 'number', unit: 'px' },
                'padding-right': { type: 'number', unit: 'px' },
                'padding-bottom': { type: 'number', unit: 'px' },
                'padding-left': { type: 'number', unit: 'px' },
                'box-sizing': { type: 'select', options: ['', 'content-box', 'border-box'] }
            },
            'Colors': {
                'background-color': { type: 'color' },
                'color': { type: 'color' },
                'opacity': { type: 'number', unit: '', min: 0, max: 1, step: 0.1 }
            },
            'Borders': {
                'border': { type: 'text' },
                'border-width': { type: 'number', unit: 'px' },
                'border-style': { type: 'select', options: ['', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset', 'none'] },
                'border-color': { type: 'color' },
                'border-radius': { type: 'number', unit: 'px' },
                'outline': { type: 'text' }
            },
            'Typography': {
                'font-family': { type: 'select', options: ['', 'Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Verdana', 'Georgia', 'sans-serif', 'serif', 'monospace'] },
                'font-size': { type: 'number', unit: 'px' },
                'font-weight': { type: 'select', options: ['', 'normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'] },
                'font-style': { type: 'select', options: ['', 'normal', 'italic', 'oblique'] },
                'line-height': { type: 'number', unit: '' },
                'text-align': { type: 'select', options: ['', 'left', 'right', 'center', 'justify'] },
                'text-decoration': { type: 'select', options: ['', 'none', 'underline', 'overline', 'line-through'] },
                'letter-spacing': { type: 'number', unit: 'px' }
            },
            'Effects': {
                'transition': { type: 'text' },
                'animation': { type: 'text' },
                'box-shadow': { type: 'text' },
                'text-shadow': { type: 'text' },
                'filter': { type: 'text' },
                'transform': { type: 'text' },
                'cursor': { type: 'select', options: ['', 'auto', 'pointer', 'default', 'move', 'wait', 'help', 'crosshair', 'text'] }
            },
            'Z-index': {
                'z-index': { type: 'number', unit: '' }
            }
        };
    }

    build_collapsible_section(parent, title, properties) {
        let section = document.createElement('div');
        section.style.marginBottom = '10px';
        section.style.border = '1px solid #ddd';
        section.style.borderRadius = '4px';

        let header = document.createElement('div');
        header.style.backgroundColor = '#f0f0f0';
        header.style.padding = '8px';
        header.style.cursor = 'pointer';
        header.style.display = 'flex';
        header.style.alignItems = 'center';
        header.style.gap = '8px';

        let icon = document.createElement('span');
        icon.textContent = '▶';
        icon.style.fontSize = '12px';
        icon.style.transition = 'transform 0.2s';

        let title_span = document.createElement('span');
        title_span.textContent = title;
        title_span.style.fontWeight = 'bold';

        let indicator = document.createElement('span');
        indicator.style.marginLeft = 'auto';
        indicator.style.fontSize = '12px';
        indicator.style.color = 'green';
        indicator.style.display = 'none';
        indicator.innerHTML = '●';
        indicator.title = 'Active CSS in this section';

        header.appendChild(icon);
        header.appendChild(title_span);
        header.appendChild(indicator);

        let content = document.createElement('div');
        content.style.padding = '10px';
        content.style.display = 'none';
        content.style.borderTop = '1px solid #ddd';

        for (let prop_name in properties) {
            let prop_def = properties[prop_name];
            let row = this.build_property_row(prop_name, prop_def);
            content.appendChild(row);
        }

        header.onclick = () => {
            let is_open = content.style.display !== 'none';
            content.style.display = is_open ? 'none' : 'block';
            icon.textContent = is_open ? '▶' : '▼';
        };

        section.appendChild(header);
        section.appendChild(content);
        parent.appendChild(section);

        this.section_headers[title] = { indicator, properties: Object.keys(properties) };
    }

    build_property_row(prop_name, def) {
        let row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '8px';
        row.style.marginBottom = '8px';

        let label = document.createElement('label');
        label.textContent = prop_name + ':';
        label.style.width = '120px';
        label.style.fontSize = '12px';

        let input_wrapper = document.createElement('div');
        input_wrapper.style.display = 'flex';
        input_wrapper.style.gap = '4px';
        input_wrapper.style.flex = '1';

        let input = null;
        let unit_select = null;

        if (def.type === 'select') {
            input = document.createElement('select');
            input.style.flex = '1';
            let blank_option = document.createElement('option');
            blank_option.value = '';
            blank_option.textContent = '(none)';
            input.appendChild(blank_option);
            for (let opt of def.options) {
                let option = document.createElement('option');
                option.value = opt;
                option.textContent = opt;
                input.appendChild(option);
            }
            let clear_btn = document.createElement('button');
            clear_btn.textContent = '✕';
            clear_btn.style.padding = '2px 6px';
            clear_btn.style.fontSize = '12px';
            clear_btn.style.cursor = 'pointer';
            clear_btn.onclick = () => { input.value = ''; this.update_live_preview(prop_name, ''); };
            input_wrapper.appendChild(input);
            input_wrapper.appendChild(clear_btn);
        } else if (def.type === 'color') {
            input = document.createElement('input');
            input.type = 'color';
            input.style.width = '60px';
            input_wrapper.appendChild(input);
        } else if (def.type === 'number') {
            input = document.createElement('input');
            input.type = 'number';
            input.style.width = '80px';
            if (def.min !== undefined) input.min = def.min;
            if (def.max !== undefined) input.max = def.max;
            if (def.step !== undefined) input.step = def.step;
            input_wrapper.appendChild(input);
            if (def.unit !== undefined && def.unit !== '') {
                unit_select = document.createElement('select');
                let units = ['px', '%', 'em', 'rem', 'vw', 'vh'];
                for (let u of units) {
                    let opt = document.createElement('option');
                    opt.value = u;
                    opt.textContent = u;
                    if (u === def.unit) opt.selected = true;
                    unit_select.appendChild(opt);
                }
                input_wrapper.appendChild(unit_select);
            }
        } else {
            input = document.createElement('input');
            input.type = 'text';
            input.style.flex = '1';
            input_wrapper.appendChild(input);
            if (def.unit) {
                let unit_hint = document.createElement('span');
                unit_hint.textContent = def.unit;
                unit_hint.style.fontSize = '12px';
                unit_hint.style.color = '#666';
                input_wrapper.appendChild(unit_hint);
            }
        }

        row.appendChild(label);
        row.appendChild(input_wrapper);

        // Store reference
        this.css_inputs.set(prop_name, { input: input, unit_select: unit_select });

        let update_func = () => {
            let value = input.value;
            if (unit_select && value !== '') value += unit_select.value;
            this.update_live_preview(prop_name, value);
            this.update_section_indicator();
        };
        input.addEventListener('change', update_func);
        input.addEventListener('input', update_func);
        if (unit_select) unit_select.addEventListener('change', update_func);

        return row;
    }

    update_live_preview(prop, value) {
        if (this.live_preview_element) {
            if (value === '') {
                this.live_preview_element.style[this.camelize(prop)] = '';
            } else {
                this.live_preview_element.style[this.camelize(prop)] = value;
            }
        }
    }

    update_section_indicator() {
        for (let section_name in this.section_headers) {
            let section = this.section_headers[section_name];
            let has_active = false;
            for (let prop of section.properties) {
                let entry = this.css_inputs.get(prop);
                if (entry && entry.input && entry.input.value !== '') {
                    has_active = true;
                    break;
                }
            }
            section.indicator.style.display = has_active ? 'inline' : 'none';
        }
    }

    camelize(str) {
        return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    }
// #endregion

// #region style_management
    load_current_styles() {
        if (!this.target_element) return;
        let computed = window.getComputedStyle(this.target_element);
        for (let [prop, entry] of this.css_inputs.entries()) {
            let input = entry.input;
            let unit_select = entry.unit_select;
            if (!input) continue;
            let value = computed.getPropertyValue(prop);
            if (value) {
                let match = value.match(/^([\d.-]+)(.*)$/);
                if (match && unit_select) {
                    input.value = match[1];
                    let unit = match[2].trim();
                    if (unit_select.querySelector(`option[value="${unit}"]`)) {
                        unit_select.value = unit;
                    }
                } else if (input.type === 'color') {
                    let rgb = value.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                    if (rgb) {
                        let hex = '#' + ((1 << 24) + (parseInt(rgb[1]) << 16) + (parseInt(rgb[2]) << 8) + parseInt(rgb[3])).toString(16).slice(1);
                        input.value = hex;
                    } else {
                        input.value = value;
                    }
                } else {
                    input.value = value;
                }
            }
        }
        if (this.custom_css_textarea) {
            let inline_style = this.target_element.getAttribute('style') || '';
            this.custom_css_textarea.value = inline_style;
        }
        if (this.live_preview_element) {
            this.live_preview_element.style.cssText = this.target_element.style.cssText;
        }
        this.update_section_indicator();
    }

    collect_css_updates() {
        let updates = {};
        for (let [prop, entry] of this.css_inputs.entries()) {
            let input = entry.input;
            let unit_select = entry.unit_select;
            if (!input) continue;
            let value = input.value;
            if (value !== '') {
                if (unit_select) value += unit_select.value;
                updates[prop] = value;
            }
        }
        if (this.custom_css_textarea && this.custom_css_textarea.value.trim()) {
            let lines = this.custom_css_textarea.value.split('\n');
            for (let line of lines) {
                line = line.trim();
                if (line && line.indexOf(':') !== -1) {
                    let parts = line.split(':');
                    let prop = parts[0].trim();
                    let val = parts.slice(1).join(':').trim().replace(/;$/, '');
                    if (prop && val) updates[prop] = val;
                }
            }
        }
        return updates;
    }

    apply_changes() {
        if (!this.target_element) {
            this.popup.close();
            return;
        }
        let updates = this.collect_css_updates();
        for (let prop in updates) {
            this.target_element.style[this.camelize(prop)] = updates[prop];
        }
        if (this.save_callback) {
            this.save_callback(updates);
        }
        this.show_message('CSS applied!', 'success');
        this.popup.close();
    }

    show_message(text, type) {
        if (window.MessageBox) {
            let msg = new MessageBox({ text: text, type: type, timeout: 2000 });
            msg.show();
        } else {
            alert(text);
        }
    }
// #endregion
}