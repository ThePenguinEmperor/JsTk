// #region constructor_and_build
class CssEditor {
    constructor(controller) {
        this.controller = controller;
        this.popup = null;
        this.target_element = null;
        this.save_callback = null;
        this.css_inputs = {};
        this.custom_css_textarea = null;
    }

    /**
     * Open the CSS editor for a target element.
     * @param {HTMLElement} target_element - The element to edit CSS for.
     * @param {Function} on_save - Callback called when CSS is applied (receives css_updates object).
     */
    open(target_element, on_save = null) {
        this.target_element = target_element;
        this.save_callback = on_save;

        // Create popup if it doesn't exist
        if (!this.popup) {
            this.create_popup();
        }

        // Load current styles into the form
        this.load_current_styles();

        this.popup.show();
    }

    /**
     * Create the popup overlay with CSS editor content.
     */
    create_popup() {
        let self = this;

        this.popup = new PopupOverlay({
            title: 'CSS Editor',
            content_builder: function(container) {
                self.build_editor_content(container);
            },
            on_close: function() {
                self.target_element = null;
                self.save_callback = null;
            }
        });
    }
// #endregion

// #region editor_content
    /**
     * Build the CSS editor content inside the popup.
     * @param {HTMLElement} container - The container to build content in.
     */
    build_editor_content(container) {
        // Create scrollable content area
        let content = document.createElement('div');
        content.className = 'css_editor_content';

        // Collapsible sections for CSS property groups
        this.build_collapsible_section(content, 'Layout', [
            'display', 'position', 'flex_direction', 'justify_content', 'align_items',
            'grid_template_columns', 'grid_template_rows', 'gap', 'flex_wrap'
        ]);

        this.build_collapsible_section(content, 'Dimensions', [
            'width', 'height', 'min_width', 'min_height', 'max_width', 'max_height',
            'margin', 'margin_top', 'margin_right', 'margin_bottom', 'margin_left',
            'padding', 'padding_top', 'padding_right', 'padding_bottom', 'padding_left',
            'box_sizing'
        ]);

        this.build_collapsible_section(content, 'Colors', [
            'background_color', 'color', 'opacity'
        ]);

        this.build_collapsible_section(content, 'Borders', [
            'border', 'border_width', 'border_style', 'border_color', 'border_radius',
            'border_top', 'border_right', 'border_bottom', 'border_left', 'outline'
        ]);

        this.build_collapsible_section(content, 'Typography', [
            'font_family', 'font_size', 'font_weight', 'font_style', 'line_height',
            'text_align', 'text_decoration', 'text_transform', 'letter_spacing', 'word_spacing'
        ]);

        this.build_collapsible_section(content, 'Effects', [
            'transition', 'animation', 'box_shadow', 'text_shadow', 'filter', 'transform'
        ]);

        this.build_collapsible_section(content, 'Z-index', [
            'z_index'
        ]);

        // Custom CSS section
        let custom_section = new CollapsibleSection({
            title: 'Custom CSS',
            content_builder: function(custom_container) {
                self.build_custom_css_section(custom_container);
            },
            default_open: false
        });
        content.appendChild(custom_section.render());

        // Buttons row
        let button_row = document.createElement('div');
        button_row.className = 'css_editor_buttons';
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
        cancel_btn.onclick = () => this.popup.hide();

        button_row.appendChild(apply_btn);
        button_row.appendChild(cancel_btn);

        content.appendChild(button_row);
        container.appendChild(content);
    }

    /**
     * Build a collapsible section for CSS property group.
     * @param {HTMLElement} parent - Parent element.
     * @param {string} title - Section title.
     * @param {Array} properties - Array of property names.
     */
    build_collapsible_section(parent, title, properties) {
        let self = this;
        let section = new CollapsibleSection({
            title: title,
            content_builder: function(container) {
                self.build_property_grid(container, properties);
            },
            default_open: true
        });
        parent.appendChild(section.render());
    }

    /**
     * Build a grid of property inputs.
     * @param {HTMLElement} container - Container for the grid.
     * @param {Array} properties - Array of property names.
     */
    build_property_grid(container, properties) {
        let grid = document.createElement('div');
        grid.className = 'css_property_grid';
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = '1fr 2fr';
        grid.style.gap = '8px';
        grid.style.padding = '10px';

        for (let i = 0; i < properties.length; i++) {
            let prop_name = properties[i];
            let display_name = prop_name.replace(/_/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase(); });

            let label = document.createElement('label');
            label.textContent = display_name + ':';
            label.style.fontSize = '12px';
            label.style.fontWeight = 'bold';

            let input = document.createElement('input');
            input.type = 'text';
            input.className = 'tester_input_small';
            input.placeholder = prop_name;
            input.setAttribute('data_property', prop_name);

            // Store reference for later
            if (!this.css_inputs[prop_name]) {
                this.css_inputs[prop_name] = [];
            }
            this.css_inputs[prop_name].push(input);

            grid.appendChild(label);
            grid.appendChild(input);
        }

        container.appendChild(grid);
    }

    /**
     * Build the custom CSS textarea section.
     * @param {HTMLElement} container - Container for custom CSS.
     */
    build_custom_css_section(container) {
        let textarea = document.createElement('textarea');
        textarea.className = 'tester_code_area';
        textarea.placeholder = 'Enter custom CSS properties here (e.g.,\nbackground: #f0f0f0;\nbox-shadow: 0 2px 4px rgba(0,0,0,0.1);)';
        textarea.style.width = '100%';
        textarea.style.height = '150px';
        textarea.style.fontFamily = 'monospace';
        textarea.style.fontSize = '12px';

        this.custom_css_textarea = textarea;

        container.appendChild(textarea);
    }
// #endregion

// #region style_management
    /**
     * Load current styles from target element into the form.
     */
    load_current_styles() {
        if (!this.target_element) {
            return;
        }

        let computed_style = window.getComputedStyle(this.target_element);

        // Load values into input fields
        for (let prop_name in this.css_inputs) {
            let inputs = this.css_inputs[prop_name];
            let css_property = prop_name.replace(/_/g, '-');
            let current_value = computed_style.getPropertyValue(css_property);

            for (let i = 0; i < inputs.length; i++) {
                inputs[i].value = current_value || '';
            }
        }

        // Load inline styles into custom textarea
        let inline_style = this.target_element.getAttribute('style') || '';
        if (this.custom_css_textarea) {
            this.custom_css_textarea.value = inline_style;
        }
    }

    /**
     * Collect all CSS changes from the form.
     * @returns {Object} CSS updates object.
     */
    collect_css_updates() {
        let updates = {};

        // Collect from property inputs
        for (let prop_name in this.css_inputs) {
            let inputs = this.css_inputs[prop_name];
            if (inputs.length > 0) {
                let value = inputs[0].value;
                if (value && value.trim() !== '') {
                    let css_property = prop_name.replace(/_/g, '-');
                    updates[css_property] = value.trim();
                }
            }
        }

        // Parse custom CSS textarea
        if (this.custom_css_textarea && this.custom_css_textarea.value.trim() !== '') {
            let custom_css = this.custom_css_textarea.value;
            let lines = custom_css.split('\n');
            for (let i = 0; i < lines.length; i++) {
                let line = lines[i].trim();
                if (line && line.indexOf(':') !== -1) {
                    let parts = line.split(':');
                    let property = parts[0].trim();
                    let value = parts.slice(1).join(':').trim().replace(/;$/, '');
                    if (property && value) {
                        updates[property] = value;
                    }
                }
            }
        }

        return updates;
    }

    /**
     * Apply CSS changes to the target element.
     */
    apply_changes() {
        if (!this.target_element) {
            this.popup.hide();
            return;
        }

        let updates = this.collect_css_updates();

        if (Object.keys(updates).length === 0) {
            this.popup.hide();
            return;
        }

        // Apply to element
        for (let property in updates) {
            this.target_element.style[this.camelize(property)] = updates[property];
        }

        // Call the save callback if provided
        if (this.save_callback) {
            this.save_callback(updates);
        }

        this.show_success_message('CSS applied successfully!');
        this.popup.hide();
    }

    /**
     * Convert CSS property name to camelCase for JavaScript style access.
     * @param {string} css_property - CSS property name (e.g., 'background-color').
     * @returns {string} CamelCase version (e.g., 'backgroundColor').
     */
    camelize(css_property) {
        let parts = css_property.split('-');
        let result = parts[0];
        for (let i = 1; i < parts.length; i++) {
            result += parts[i].charAt(0).toUpperCase() + parts[i].slice(1);
        }
        return result;
    }

    /**
     * Show a temporary success message.
     * @param {string} message - Message to show.
     */
    show_success_message(message) {
        if (window.MessageBox) {
            let msg_box = new window.MessageBox({
                text: message,
                duration: 1500,
                type: 'success'
            });
            msg_box.render();
        }
    }
// #endregion
}

window.CssEditor = CssEditor;
