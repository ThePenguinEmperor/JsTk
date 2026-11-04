// #region css_editor
/**
 * CssEditor - modal editor for CSS properties with live preview.
 * @param {Object} controller - reference to main controller (for dev_mode, etc.)
 */
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
     * @param {Function} on_save - Callback when CSS is applied (receives css_updates object).
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
        this.live_preview_element.classList.add('css_live_preview');

        if (!this.popup) {
            this.create_popup();
        }

        this.load_current_styles();
        this.popup.open();
    }

    /**
     * Create the popup overlay with CSS editor content.
     * Pass size options (width: 700, height: 1200) as base size.
     * The PopupOverlay will treat these as min sizes if they fit within 90%/85% limits.
     */
    create_popup() {
        const self = this;
        this.popup = new PopupOverlay(
            (container) => self.build_editor_content(container),
            { width: 700, height: 1200 },   // base size in pixels
            () => {
                self.target_element = null;
                self.live_preview_element = null;
                self.save_callback = null;
            }
        );
    }

    // #region editor_content
    /**
     * Build the entire editor UI.
     * @param {HTMLElement} container - The popup content container.
     */
    build_editor_content(container) {
        // Title
        container.classList.add('css_editor');
        const title = document.createElement('h3');
        title.textContent = 'CSS Editor';
        title.className = 'css_editor_title';
        container.appendChild(title);
        const intro = document.createElement('p');
        intro.className = 'css_editor_intro';
        intro.textContent = 'Change how the selected widget looks. Open a group, set a value and watch the preview update. Leave a field empty to keep the default. Nothing is saved until you press Apply.';
        container.appendChild(intro);

        const preview_label = document.createElement('div');
        preview_label.textContent = 'Preview';
        preview_label.className = 'css_editor_label';
        container.appendChild(preview_label);
        const preview_note = document.createElement('p');
        preview_note.className = 'css_editor_note';
        preview_note.textContent = 'A copy of the widget. Changes show here first.';
        container.appendChild(preview_note);
        container.appendChild(this.live_preview_element);

        // Scrollable content area for property sections
        const content_wrapper = document.createElement('div');
        content_wrapper.style.maxHeight = 'calc(100% - 200px)'; // leave room for title and buttons
        content_wrapper.style.overflowY = 'auto';
        content_wrapper.style.marginTop = '10px';

        this.property_groups = this.get_property_groups();
        for (const group_name in this.property_groups) {
            this.build_collapsible_section(content_wrapper, group_name, this.property_groups[group_name]);
        }

        // Custom CSS section
        const custom_section = document.createElement('div');
        custom_section.className = 'css_custom_section';
        const custom_label = document.createElement('div');
        custom_label.textContent = 'Custom CSS (raw)';
        custom_label.className = 'css_editor_label';
        custom_section.appendChild(custom_label);
        const custom_note = document.createElement('p');
        custom_note.className = 'css_editor_note';
        custom_note.textContent = 'Write any other declarations, one per line, for example: box-shadow: 0 2px 6px #0004;';
        custom_section.appendChild(custom_note);

        this.custom_css_textarea = document.createElement('textarea');
        this.custom_css_textarea.className = 'css_custom_textarea';
        this.custom_css_textarea.placeholder = 'property: value;';
        custom_section.appendChild(this.custom_css_textarea);
        content_wrapper.appendChild(custom_section);

        // Buttons row
        const button_row = document.createElement('div');
        button_row.className = 'css_editor_buttons';

        const apply_btn = document.createElement('button');
        apply_btn.textContent = 'Apply';
        apply_btn.className = 'tester_button';
        apply_btn.onclick = () => this.apply_changes();

        const cancel_btn = document.createElement('button');
        cancel_btn.textContent = 'Cancel';
        cancel_btn.className = 'tester_button tester_button_secondary';
        cancel_btn.onclick = () => this.popup.close();

        button_row.appendChild(apply_btn);
        button_row.appendChild(cancel_btn);
        content_wrapper.appendChild(button_row);

        container.appendChild(content_wrapper);
    }

    /**
     * Returns the property groups definition.
     */
    get_group_notes() {
        return {
            'Layout': 'How the widget arranges itself and its children: display mode, flex and grid settings, gaps.',
            'Dimensions': 'Size, margins (space outside) and padding (space inside).',
            'Colors': 'Background and text colour, and transparency.',
            'Borders': 'Border lines, rounded corners and outline.',
            'Typography': 'Font, size, weight, alignment and spacing of text.',
            'Effects': 'Shadows, transitions, animations, filters and the mouse cursor.',
            'Z-index': 'Stacking order: higher numbers sit in front.'
        };
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

    /**
     * Build a collapsible section for a property group.
     * @param {HTMLElement} parent - Parent container.
     * @param {string} title - Section title.
     * @param {Object} properties - Map of property definitions.
     */
    build_collapsible_section(parent, title, properties) {
        const section = document.createElement('div');
        section.className = 'css_group';

        const header = document.createElement('div');
        header.className = 'css_group_header';

        const icon = document.createElement('span');
        icon.textContent = '>';
        icon.className = 'css_group_icon';

        const title_span = document.createElement('span');
        title_span.textContent = title;
        title_span.className = 'css_group_title';

        const note_span = document.createElement('span');
        note_span.textContent = this.get_group_notes()[title] || '';
        note_span.className = 'css_group_note';

        const indicator = document.createElement('span');
        indicator.className = 'css_group_indicator';
        indicator.style.display = 'none';
        indicator.textContent = 'in use';
        indicator.title = 'Active CSS in this section';

        header.appendChild(icon);
        header.appendChild(title_span);
        header.appendChild(note_span);
        header.appendChild(indicator);

        const content = document.createElement('div');
        content.className = 'css_group_content';
        content.style.display = 'none';

        for (const prop_name in properties) {
            const prop_def = properties[prop_name];
            const row = this.build_property_row(prop_name, prop_def);
            content.appendChild(row);
        }

        header.onclick = () => {
            const is_open = content.style.display !== 'none';
            content.style.display = is_open ? 'none' : 'block';
            icon.textContent = is_open ? '>' : 'v';
        };

        section.appendChild(header);
        section.appendChild(content);
        parent.appendChild(section);

        this.section_headers[title] = { indicator, properties: Object.keys(properties) };
    }

    /**
     * Build a single property row (label + input + optional unit select).
     * @param {string} prop_name - CSS property name.
     * @param {Object} def - Property definition.
     * @returns {HTMLElement} The row element.
     */
    build_property_row(prop_name, def) {
        const row = document.createElement('div');
        row.className = 'css_prop_row';

        const label = document.createElement('label');
        label.textContent = prop_name;
        label.className = 'css_prop_label';

        const input_wrapper = document.createElement('div');
        input_wrapper.className = 'css_prop_inputs';

        let input = null;
        let unit_select = null;

        if (def.type === 'select') {
            input = document.createElement('select');
            input.style.flex = '1';
            const blank_option = document.createElement('option');
            blank_option.value = '';
            blank_option.textContent = '(none)';
            input.appendChild(blank_option);
            for (const opt of def.options) {
                const option = document.createElement('option');
                option.value = opt;
                option.textContent = opt;
                input.appendChild(option);
            }
            const clear_btn = document.createElement('button');
            clear_btn.textContent = 'x';
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
                const units = ['px', '%', 'em', 'rem', 'vw', 'vh'];
                for (const u of units) {
                    const opt = document.createElement('option');
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
                const unit_hint = document.createElement('span');
                unit_hint.textContent = def.unit;
                unit_hint.style.fontSize = '12px';
                unit_hint.className = 'css_editor_note';
                input_wrapper.appendChild(unit_hint);
            }
        }

        row.appendChild(label);
        row.appendChild(input_wrapper);

        // Store references
        this.css_inputs.set(prop_name, { input: input, unit_select: unit_select });

        const update_func = () => {
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

    /**
     * Update the live preview element with a property value.
     * @param {string} prop - CSS property name (kebab-case).
     * @param {string} value - CSS value.
     */
    update_live_preview(prop, value) {
        if (this.live_preview_element) {
            if (value === '') {
                this.live_preview_element.style[this.camelize(prop)] = '';
            } else {
                this.live_preview_element.style[this.camelize(prop)] = value;
            }
        }
    }

    /**
     * Update the green indicator dot for each collapsible section.
     */
    update_section_indicator() {
        for (const section_name in this.section_headers) {
            const section = this.section_headers[section_name];
            let has_active = false;
            for (const prop of section.properties) {
                const entry = this.css_inputs.get(prop);
                if (entry && entry.input && entry.input.value !== '') {
                    has_active = true;
                    break;
                }
            }
            section.indicator.style.display = has_active ? 'inline' : 'none';
        }
    }

    /**
     * Convert kebab-case to camelCase.
     * @param {string} str - Kebab-case string.
     * @returns {string} CamelCase string.
     */
    camelize(str) {
        return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    }
    // #endregion

    // #region style_management
    /**
     * Load current styles from target element into the editor.
     */
    load_current_styles() {
        if (!this.target_element) return;
        const computed = window.getComputedStyle(this.target_element);
        for (const [prop, entry] of this.css_inputs.entries()) {
            const input = entry.input;
            const unit_select = entry.unit_select;
            if (!input) continue;
            let value = computed.getPropertyValue(prop);
            if (value) {
                const match = value.match(/^([\d.-]+)(.*)$/);
                if (match && unit_select) {
                    input.value = match[1];
                    const unit = match[2].trim();
                    if (unit_select.querySelector(`option[value="${unit}"]`)) {
                        unit_select.value = unit;
                    }
                } else if (input.type === 'color') {
                    const rgb = value.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                    if (rgb) {
                        const hex = '#' + ((1 << 24) + (parseInt(rgb[1]) << 16) + (parseInt(rgb[2]) << 8) + parseInt(rgb[3])).toString(16).slice(1);
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
            const inline_style = this.target_element.getAttribute('style') || '';
            this.custom_css_textarea.value = inline_style;
        }
        if (this.live_preview_element) {
            this.live_preview_element.style.cssText = this.target_element.style.cssText;
        }
        this.update_section_indicator();
    }

    /**
     * Collect all CSS updates from the editor.
     * @returns {Object} Map of property -> value.
     */
    collect_css_updates() {
        const updates = {};
        for (const [prop, entry] of this.css_inputs.entries()) {
            const input = entry.input;
            const unit_select = entry.unit_select;
            if (!input) continue;
            let value = input.value;
            if (value !== '') {
                if (unit_select) value += unit_select.value;
                updates[prop] = value;
            }
        }
        if (this.custom_css_textarea && this.custom_css_textarea.value.trim()) {
            const lines = this.custom_css_textarea.value.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed && trimmed.indexOf(':') !== -1) {
                    const parts = trimmed.split(':');
                    const prop = parts[0].trim();
                    const val = parts.slice(1).join(':').trim().replace(/;$/, '');
                    if (prop && val) updates[prop] = val;
                }
            }
        }
        return updates;
    }

    /**
     * Apply the collected CSS changes to the target element and call save callback.
     */
    apply_changes() {
        if (!this.target_element) {
            this.popup.close();
            return;
        }
        const updates = this.collect_css_updates();
        for (const prop in updates) {
            this.target_element.style[this.camelize(prop)] = updates[prop];
        }
        if (this.save_callback) {
            this.save_callback(updates);
        }
        this.show_message('CSS applied!', 'success');
        this.popup.close();
    }

    /**
     * Show a message using MessageBox if available, else alert.
     * @param {string} text - Message text.
     * @param {string} type - 'success', 'warning', 'error'.
     */
    show_message(text, type) {
        if (window.MessageBox) {
            const msg = new MessageBox({ text: text, type: type, timeout: 2000 });
            msg.show();
        } else {
            alert(text);
        }
    }
    // #endregion
}
window.CssEditor = CssEditor;
// #endregion css_editor