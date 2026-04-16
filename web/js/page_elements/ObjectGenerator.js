// #region constructor_and_build
class ObjectGenerator {
    constructor(controller) {
        this.controller = controller;
        this.container = null;
        this.tag_select = null;
        this.parent_select = null;
        this.id_input = null;
        this.class_input = null;
        this.text_input = null;
        this.row_input = null;
        this.col_input = null;
        this.row_span_input = null;
        this.col_span_input = null;
        this.sticky_n = null;
        this.sticky_s = null;
        this.sticky_e = null;
        this.sticky_w = null;
        this.margin_x_input = null;
        this.margin_y_input = null;
        this.padding_x_input = null;
        this.padding_y_input = null;
        this.add_btn = null;
        this.save_btn = null;
        this.cancel_btn = null;
        this.widget_css_editor_btn = null;

        this.edit_widget = null;
        this.element_margin = null;
    }

    build(parent, margin) {
        this.container = parent;
        this.element_margin = margin;
        let row_counter = 1;

        // Row 1: HTML Tag (col1-2) and Parent Container (col3-4) – labels only
        let tag_label = document.oc.object_generate('span', {
            parent: this.container,
            row: row_counter,
            col: 1,
            col_span: 2,
            text: '🏷️ HTML Tag',
            class_name: 'tester_label',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            title: 'Type of HTML element or custom widget (button, div, collapsible_section, etc.)'
        });
        let parent_label = document.oc.object_generate('span', {
            parent: this.container,
            row: row_counter,
            col: 3,
            col_span: 2,
            text: '📁 Parent Container',
            class_name: 'tester_label',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            title: 'Where this widget will be placed (must be a container)'
        });
        row_counter++;

        // Row 2: selectors (both span 2)
        this.tag_select = document.oc.object_generate('select', {
            parent: this.container,
            row: row_counter,
            col: 1,
            col_span: 2,
            class_name: 'tester_select',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            title: 'Select the type of widget'
        });
        for (let tag of this.controller.available_tags) {
            let option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            this.tag_select.appendChild(option);
        }

        this.parent_select = document.oc.object_generate('select', {
            parent: this.container,
            row: row_counter,
            col: 3,
            col_span: 2,
            class_name: 'tester_select',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            title: 'Choose the parent container for this widget'
        });
        row_counter++;

        // Row 3: labels for ID (col1), Class Name (col2), Text Content (col4)
        let id_label = document.oc.object_generate('span', {
            parent: this.container,
            row: row_counter,
            col: 1,
            text: '🆔',
            class_name: 'tester_label',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            title: 'Unique identifier for the widget (auto‑generated if empty)'
        });
        let class_label = document.oc.object_generate('span', {
            parent: this.container,
            row: row_counter,
            col: 2,
            text: '📌 Class Name',
            class_name: 'tester_label',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            title: 'CSS class(es) for styling'
        });
        let text_label = document.oc.object_generate('span', {
            parent: this.container,
            row: row_counter,
            col: 4,
            text: '📝 Text Content',
            class_name: 'tester_label',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            title: 'Inner text of the widget (if applicable)'
        });
        row_counter++;

        // Row 4: inputs
        this.id_input = document.oc.object_generate('input', {
            parent: this.container,
            row: row_counter,
            col: 1,
            class_name: 'tester_input',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            title: 'Optional unique ID'
        });
        this.class_input = document.oc.object_generate('input', {
            parent: this.container,
            row: row_counter,
            col: 2,
            class_name: 'tester_input',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            title: 'CSS class name(s), space‑separated'
        });
        this.text_input = document.oc.object_generate('input', {
            parent: this.container,
            row: row_counter,
            col: 4,
            class_name: 'tester_input',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            title: 'Text to display inside the widget'
        });
        row_counter++;

        // Row 5: labels for row/col/rowspan/colspan (no icons, plain text)
        document.oc.object_generate('span', {
            parent: this.container,
            row: row_counter,
            col: 1,
            text: 'Row',
            class_name: 'tester_label',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            title: 'Grid row start (1‑based)'
        });
        document.oc.object_generate('span', {
            parent: this.container,
            row: row_counter,
            col: 2,
            text: 'Column',
            class_name: 'tester_label',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            title: 'Grid column start (1‑based)'
        });
        document.oc.object_generate('span', {
            parent: this.container,
            row: row_counter,
            col: 3,
            text: 'Row Span',
            class_name: 'tester_label',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            title: 'Number of rows to span'
        });
        document.oc.object_generate('span', {
            parent: this.container,
            row: row_counter,
            col: 4,
            text: 'Column Span',
            class_name: 'tester_label',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            title: 'Number of columns to span'
        });
        row_counter++;

        // Row 6: inputs
        this.row_input = document.oc.object_generate('input', {
            parent: this.container,
            row: row_counter,
            col: 1,
            type: 'number',
            value: 1,
            class_name: 'tester_input',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            title: 'Row number (1 = first row)'
        });
        this.col_input = document.oc.object_generate('input', {
            parent: this.container,
            row: row_counter,
            col: 2,
            type: 'number',
            value: 1,
            class_name: 'tester_input',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            title: 'Column number (1 = first column)'
        });
        this.row_span_input = document.oc.object_generate('input', {
            parent: this.container,
            row: row_counter,
            col: 3,
            type: 'number',
            class_name: 'tester_input',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            title: 'How many rows to occupy (default 1)'
        });
        this.col_span_input = document.oc.object_generate('input', {
            parent: this.container,
            row: row_counter,
            col: 4,
            type: 'number',
            class_name: 'tester_input',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            title: 'How many columns to occupy (default 1)'
        });
        row_counter++;

        // Row 7: Sticky
        let sticky_label = document.oc.object_generate('span', {
            parent: this.container,
            row: row_counter,
            col: 1,
            text: '📍 Sticky',
            class_name: 'tester_label',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            title: 'Align widget inside its grid cell (N/S/E/W combinations)'
        });
        let sticky_grid = document.oc.object_generate('div', {
            parent: this.container,
            row: row_counter,
            col: 2,
            col_span: 3,
            sticky: 'ew',
            class_name: 'tester_sticky_grid',
            padx: margin.x,
            pady: margin.y
        });
        sticky_grid.style.display = 'grid';
        sticky_grid.style.gridTemplateColumns = 'repeat(6, 1fr)';
        sticky_grid.style.gap = '4px';
        sticky_grid.style.alignItems = 'center';

        let n_label = document.oc.object_generate('span', {
            parent: sticky_grid,
            row: 1,
            col: 3,
            text: 'N',
            class_name: 'tester_sticky_label'
        });
        this.sticky_n = document.oc.object_generate('input', {
            parent: sticky_grid,
            row: 1,
            col: 4,
            type: 'checkbox',
            class_name: 'tester_checkbox',
            title: 'Stretch to top (North)'
        });

        let w_label = document.oc.object_generate('span', {
            parent: sticky_grid,
            row: 2,
            col: 1,
            text: 'W',
            class_name: 'tester_sticky_label'
        });
        this.sticky_w = document.oc.object_generate('input', {
            parent: sticky_grid,
            row: 2,
            col: 2,
            type: 'checkbox',
            class_name: 'tester_checkbox',
            title: 'Stretch to left (West)'
        });
        let e_label = document.oc.object_generate('span', {
            parent: sticky_grid,
            row: 2,
            col: 5,
            text: 'E',
            class_name: 'tester_sticky_label'
        });
        this.sticky_e = document.oc.object_generate('input', {
            parent: sticky_grid,
            row: 2,
            col: 6,
            type: 'checkbox',
            class_name: 'tester_checkbox',
            title: 'Stretch to right (East)'
        });

        let s_label = document.oc.object_generate('span', {
            parent: sticky_grid,
            row: 3,
            col: 3,
            text: 'S',
            class_name: 'tester_sticky_label'
        });
        this.sticky_s = document.oc.object_generate('input', {
            parent: sticky_grid,
            row: 3,
            col: 4,
            type: 'checkbox',
            class_name: 'tester_checkbox',
            title: 'Stretch to bottom (South)'
        });
        row_counter++;

        // Row 8: margin/padding labels (no icons)
        document.oc.object_generate('span', {
            parent: this.container,
            row: row_counter,
            col: 1,
            text: 'Margin X (px)',
            class_name: 'tester_label',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            title: 'Horizontal margin (space outside the widget)'
        });
        document.oc.object_generate('span', {
            parent: this.container,
            row: row_counter,
            col: 2,
            text: 'Margin Y (px)',
            class_name: 'tester_label',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            title: 'Vertical margin (space outside the widget)'
        });
        document.oc.object_generate('span', {
            parent: this.container,
            row: row_counter,
            col: 3,
            text: 'Padding X (px)',
            class_name: 'tester_label',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            title: 'Horizontal padding (space inside the widget)'
        });
        document.oc.object_generate('span', {
            parent: this.container,
            row: row_counter,
            col: 4,
            text: 'Padding Y (px)',
            class_name: 'tester_label',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            title: 'Vertical padding (space inside the widget)'
        });
        row_counter++;

        // Row 9: inputs
        this.margin_x_input = document.oc.object_generate('input', {
            parent: this.container,
            row: row_counter,
            col: 1,
            type: 'number',
            class_name: 'tester_input',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            title: 'Margin left/right in pixels'
        });
        this.margin_y_input = document.oc.object_generate('input', {
            parent: this.container,
            row: row_counter,
            col: 2,
            type: 'number',
            class_name: 'tester_input',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            title: 'Margin top/bottom in pixels'
        });
        this.padding_x_input = document.oc.object_generate('input', {
            parent: this.container,
            row: row_counter,
            col: 3,
            type: 'number',
            class_name: 'tester_input',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            title: 'Padding left/right in pixels'
        });
        this.padding_y_input = document.oc.object_generate('input', {
            parent: this.container,
            row: row_counter,
            col: 4,
            type: 'number',
            class_name: 'tester_input',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            title: 'Padding top/bottom in pixels'
        });
        row_counter++;

        // Row 10: buttons
        this.cancel_btn = document.oc.object_generate('button', {
            parent: this.container,
            row: row_counter,
            col: 1,
            text: '❌',
            class_name: 'tester_button tester_button_secondary',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            style: 'display: none;',
            title: 'Cancel editing and discard changes',
            events: { click: () => this.cancel_edit() }
        });

        this.widget_css_editor_btn = document.oc.object_generate('button', {
            parent: this.container,
            row: row_counter,
            col: 2,
            text: '🎨',
            class_name: 'tester_button tester_button_secondary',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            style: 'display: none;',
            title: 'Edit CSS for this widget',
            events: { click: () => this.open_widget_css_editor() }
        });

        this.add_btn = document.oc.object_generate('button', {
            parent: this.container,
            row: row_counter,
            col: 4,
            text: '➕ Add',
            class_name: 'tester_button',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            title: 'Create a new widget',
            events: { click: () => this.add_widget() }
        });

        this.save_btn = document.oc.object_generate('button', {
            parent: this.container,
            row: row_counter,
            col: 4,
            text: '💾 Save',
            class_name: 'tester_button',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            style: 'display: none;',
            title: 'Save changes to the widget',
            events: { click: () => this.save_edit() }
        });
        row_counter++;

        // Spacer
        let spacer = document.oc.object_generate('div', {
            parent: this.container,
            row: row_counter,
            col: 1,
            col_span: 4,
            sticky: 'nsew',
            style: 'min-height: 0;'
        });
        document.oc.configure_row(this.container, row_counter, { weight: 1 });

        for (let i = 1; i <= 4; i++) {
            document.oc.configure_column(this.container, i, { weight: 1 });
        }

        this.refresh_parent_options();
    }

    refresh_parent_options() {
        let containers = this.controller.get_parent_containers();
        this.parent_select.innerHTML = '';
        for (let i = 0; i < containers.length; i++) {
            let option = document.createElement('option');
            option.value = containers[i].id;
            option.textContent = containers[i].label;
            this.parent_select.appendChild(option);
        }
        if (containers.length > 0) {
            this.parent_select.value = this.controller.preview_grid_id;
        }
    }
// #endregion

// #region form_handling
    get_values() {
        let sticky = '';
        if (this.sticky_n.checked) sticky += 'n';
        if (this.sticky_s.checked) sticky += 's';
        if (this.sticky_e.checked) sticky += 'e';
        if (this.sticky_w.checked) sticky += 'w';

        let params = {
            tag: this.tag_select.value,
            parent_id: this.parent_select.value,
            row: parseInt(this.row_input.value) || 1,
            col: parseInt(this.col_input.value) || 1,
            sticky: sticky,
            id: this.id_input.value,
            class_name: this.class_input.value,
            text: this.text_input.value,
        };

        let row_span = parseInt(this.row_span_input.value);
        if (!isNaN(row_span) && row_span > 0) params.row_span = row_span;
        let col_span = parseInt(this.col_span_input.value);
        if (!isNaN(col_span) && col_span > 0) params.col_span = col_span;
        let padx = parseInt(this.margin_x_input.value);
        if (!isNaN(padx)) params.padx = padx;
        let pady = parseInt(this.margin_y_input.value);
        if (!isNaN(pady)) params.pady = pady;
        let ipadx = parseInt(this.padding_x_input.value);
        if (!isNaN(ipadx)) params.ipadx = ipadx;
        let ipady = parseInt(this.padding_y_input.value);
        if (!isNaN(ipady)) params.ipady = ipady;

        return params;
    }

    set_values_from_widget(widget) {
        this.tag_select.value = widget.tag;
        this.parent_select.value = widget.parent_id;
        this.row_input.value = widget.row;
        this.col_input.value = widget.col;
        this.row_span_input.value = widget.row_span || '';
        this.col_span_input.value = widget.col_span || '';
        this.id_input.value = widget.id || '';
        this.class_input.value = widget.class_name || '';
        this.text_input.value = widget.text || '';
        this.margin_x_input.value = widget.padx || '';
        this.margin_y_input.value = widget.pady || '';
        this.padding_x_input.value = widget.ipadx || '';
        this.padding_y_input.value = widget.ipady || '';

        let sticky = widget.sticky || '';
        this.sticky_n.checked = sticky.includes('n');
        this.sticky_s.checked = sticky.includes('s');
        this.sticky_e.checked = sticky.includes('e');
        this.sticky_w.checked = sticky.includes('w');
    }

    clear_form() {
        this.tag_select.value = 'button';
        if (this.parent_select.options.length > 0) {
            this.parent_select.value = this.controller.preview_grid_id;
        }
        this.row_input.value = 1;
        this.col_input.value = 1;
        this.row_span_input.value = '';
        this.col_span_input.value = '';
        this.id_input.value = '';
        this.class_input.value = '';
        this.text_input.value = '';
        this.margin_x_input.value = '';
        this.margin_y_input.value = '';
        this.padding_x_input.value = '';
        this.padding_y_input.value = '';
        this.sticky_n.checked = false;
        this.sticky_s.checked = false;
        this.sticky_e.checked = false;
        this.sticky_w.checked = false;
    }
// #endregion

// #region widget_operations
    add_widget() {
        let params = this.get_values();
        if (!params.id) params.id = this.controller.generate_default_id(params.tag);
        if (!params.text) params.text = params.id;
        this.controller.add_widget(params);
        this.clear_form();
        this.refresh_parent_options();
    }

    set_edit_mode(widget) {
        this.edit_widget = widget;
        this.set_values_from_widget(widget);
        this.add_btn.style.display = 'none';
        this.save_btn.style.display = 'inline-flex';
        this.cancel_btn.style.display = 'inline-flex';
        this.widget_css_editor_btn.style.display = 'inline-flex';
    }

    save_edit() {
        if (!this.edit_widget) return;
        let params = this.get_values();
        if (!params.id) params.id = this.edit_widget.id;
        this.controller.update_widget(this.edit_widget.id, params);
        this.cancel_edit();
        this.refresh_parent_options();
    }

    cancel_edit() {
        this.edit_widget = null;
        this.add_btn.style.display = 'inline-flex';
        this.save_btn.style.display = 'none';
        this.cancel_btn.style.display = 'none';
        this.widget_css_editor_btn.style.display = 'none';
        this.clear_form();
    }

    open_widget_css_editor() {
        if (this.edit_widget && this.edit_widget.element) {
            let callback = (css_updates) => {
                this.edit_widget.update_css(css_updates);
                if (this.controller.code_display) {
                    this.controller.code_display.refresh(this.controller.widgets);
                }
            };
            this.controller.open_css_editor_for(this.edit_widget.element, callback);
        }
    }
// #endregion
}