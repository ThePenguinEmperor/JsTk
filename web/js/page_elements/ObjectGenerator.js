// #region object_generator
class ObjectGenerator {
    constructor(controller) {
        this.controller = controller;
        this.container = null;
        this.tag_select = null;
        this.parent_select = null;
        this.id_input = null;
        this.class_input = null;
        this.text_input = null;               // new
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
        this.css_editor_btn = null;

        this.edit_mode = false;
        this.edit_id = null;
        this.element_margin = null;
    }

    build(parent, margin) {
        this.container = parent;
        this.element_margin = margin;
        let row_counter = 1;

        // Row 1: labels for HTML tag (span 2) and Parent container (span 2)
        let tag_label = document.oc.object_generate('span', {
            parent: this.container,
            row: row_counter,
            col: 1,
            colSpan: 2,
            text: 'HTML Tag',
            class_name: 'tester_label',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y
        });

        let parent_label = document.oc.object_generate('span', {
            parent: this.container,
            row: row_counter,
            col: 3,
            colSpan: 2,
            text: 'Parent Container',
            class_name: 'tester_label',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y
        });
        row_counter++;

        // Row 2: selectors (both span 2)
        this.tag_select = document.oc.object_generate('select', {
            parent: this.container,
            row: row_counter,
            col: 1,
            colSpan: 2,
            class_name: 'tester_select',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y
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
            colSpan: 2,
            class_name: 'tester_select',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y
        });
        row_counter++;

        // Row 3: labels for ID (span2) and Class Name (span2)
        let id_label = document.oc.object_generate('span', {
            parent: this.container,
            row: row_counter,
            col: 1,
            text: 'ID',
            class_name: 'tester_label',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y
        });
        let class_label = document.oc.object_generate('span', {
            parent: this.container,
            row: row_counter,
            col: 2,
            text: 'Class Name',
            class_name: 'tester_label',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y
        });
        let text_label = document.oc.object_generate('span', {
            parent: this.container,
            row: row_counter,
            col: 4,
            text: 'Text Content',
            class_name: 'tester_label',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y
        });
        row_counter++;

        // Row 4: inputs for ID (span2) and Class Name (span2)
        this.id_input = document.oc.object_generate('input', {
            parent: this.container,
            row: row_counter,
            col: 1,
            class_name: 'tester_input',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y
        });
        this.class_input = document.oc.object_generate('input', {
            parent: this.container,
            row: row_counter,
            col: 2,
            class_name: 'tester_input',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y
        });
        this.text_input = document.oc.object_generate('input', {
            parent: this.container,
            row: row_counter,
            col: 4,
            class_name: 'tester_input',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y
        });
        row_counter++;

        // Row 5: labels for row/col/rowspan/colspan (4 columns)
        document.oc.object_generate('span', {
            parent: this.container,
            row: row_counter,
            col: 1,
            text: 'Row',
            class_name: 'tester_label',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y
        });
        document.oc.object_generate('span', {
            parent: this.container,
            row: row_counter,
            col: 2,
            text: 'Column',
            class_name: 'tester_label',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y
        });
        document.oc.object_generate('span', {
            parent: this.container,
            row: row_counter,
            col: 3,
            text: 'Row Span',
            class_name: 'tester_label',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y
        });
        document.oc.object_generate('span', {
            parent: this.container,
            row: row_counter,
            col: 4,
            text: 'Column Span',
            class_name: 'tester_label',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y
        });
        row_counter++;

        // Row 6: inputs for row/col/rowspan/colspan
        this.row_input = document.oc.object_generate('input', {
            parent: this.container,
            row: row_counter,
            col: 1,
            type: 'number',
            value: 1,
            class_name: 'tester_input',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y
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
            pady: margin.y
        });
        this.row_span_input = document.oc.object_generate('input', {
            parent: this.container,
            row: row_counter,
            col: 3,
            type: 'number',
            class_name: 'tester_input',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y
        });
        this.col_span_input = document.oc.object_generate('input', {
            parent: this.container,
            row: row_counter,
            col: 4,
            type: 'number',
            class_name: 'tester_input',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y
        });
        row_counter++;

        // Row 7: sticky label and sticky grid (grid spans 3 columns)
        let sticky_label = document.oc.object_generate('span', {
            parent: this.container,
            row: row_counter,
            col: 1,
            text: 'Sticky',
            class_name: 'tester_label',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y
        });

        let sticky_grid = document.oc.object_generate('div', {
            parent: this.container,
            row: row_counter,
            col: 2,
            colSpan: 3,
            sticky: 'ew',
            class_name: 'tester_sticky_grid',
            padx: margin.x,
            pady: margin.y
        });
        sticky_grid.style.display = 'grid';
        sticky_grid.style.gridTemplateColumns = 'repeat(6, 1fr)';
        sticky_grid.style.gap = '4px';
        sticky_grid.style.alignItems = 'center';

        // Sticky grid content
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
            class_name: 'tester_checkbox'
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
            class_name: 'tester_checkbox'
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
            class_name: 'tester_checkbox'
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
            class_name: 'tester_checkbox'
        });
        row_counter++;

        // Row 8: margin and padding labels (4 columns)
        document.oc.object_generate('span', {
            parent: this.container,
            row: row_counter,
            col: 1,
            text: 'Margin X (px)',
            class_name: 'tester_label',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y
        });
        document.oc.object_generate('span', {
            parent: this.container,
            row: row_counter,
            col: 2,
            text: 'Margin Y (px)',
            class_name: 'tester_label',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y
        });
        document.oc.object_generate('span', {
            parent: this.container,
            row: row_counter,
            col: 3,
            text: 'Padding X (px)',
            class_name: 'tester_label',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y
        });
        document.oc.object_generate('span', {
            parent: this.container,
            row: row_counter,
            col: 4,
            text: 'Padding Y (px)',
            class_name: 'tester_label',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y
        });
        row_counter++;

        // Row 9: margin and padding inputs
        this.margin_x_input = document.oc.object_generate('input', {
            parent: this.container,
            row: row_counter,
            col: 1,
            type: 'number',
            class_name: 'tester_input',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y
        });
        this.margin_y_input = document.oc.object_generate('input', {
            parent: this.container,
            row: row_counter,
            col: 2,
            type: 'number',
            class_name: 'tester_input',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y
        });
        this.padding_x_input = document.oc.object_generate('input', {
            parent: this.container,
            row: row_counter,
            col: 3,
            type: 'number',
            class_name: 'tester_input',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y
        });
        this.padding_y_input = document.oc.object_generate('input', {
            parent: this.container,
            row: row_counter,
            col: 4,
            type: 'number',
            class_name: 'tester_input',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y
        });
        row_counter++;

        // Row 10: buttons (CSS Editor at col2, Add Object at col4)
        this.css_editor_btn = document.oc.object_generate('button', {
            parent: this.container,
            row: row_counter,
            col: 2,
            text: 'CSS Editor',
            class_name: 'tester_button',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            events: { click: () => this.controller.open_css_editor() }
        });

        this.add_btn = document.oc.object_generate('button', {
            parent: this.container,
            row: row_counter,
            col: 4,
            text: 'Add Object',
            class_name: 'tester_button',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            events: { click: () => this.add_object() }
        });

        this.save_btn = document.oc.object_generate('button', {
            parent: this.container,
            row: row_counter,
            col: 4,
            text: 'Save Changes',
            class_name: 'tester_button',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            style: 'display: none;',
            events: { click: () => this.save_edit() }
        });
        this.cancel_btn = document.oc.object_generate('button', {
            parent: this.container,
            row: row_counter,
            col: 3,
            text: 'Cancel Edit',
            class_name: 'tester_button tester_button_secondary',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            style: 'display: none;',
            events: { click: () => this.cancel_edit() }
        });
        row_counter++;

        // Spacer to push content to top (spans all 4 columns)
        let spacer = document.oc.object_generate('div', {
            parent: this.container,
            row: row_counter,
            col: 1,
            colSpan: 4,
            sticky: 'nsew',
            style: 'min-height: 0;'
        });
        document.oc.configure_row(this.container, row_counter, { weight: 1 });

        // Configure columns to be equal width
        for (let i = 1; i <= 4; i++) {
            document.oc.configure_column(this.container, i, { weight: 1 });
        }
    }

    get_values() {
        let sticky = '';
        if (this.sticky_n.checked) sticky += 'n';
        if (this.sticky_s.checked) sticky += 's';
        if (this.sticky_e.checked) sticky += 'e';
        if (this.sticky_w.checked) sticky += 'w';

        let parent_index = parseInt(this.parent_select.value);
        let parent = this.controller.get_parent_container(parent_index);

        let params = {
            tag: this.tag_select.value,
            parent: parent,
            row: parseInt(this.row_input.value) || 1,
            col: parseInt(this.col_input.value) || 1,
            sticky: sticky,
            rowSpan: parseInt(this.row_span_input.value) || undefined,
            colSpan: parseInt(this.col_span_input.value) || undefined,
            id: this.id_input.value,
            class_name: this.class_input.value,
            text: this.text_input.value,                    // text content
            padx: parseInt(this.margin_x_input.value) || undefined,
            pady: parseInt(this.margin_y_input.value) || undefined,
            ipadx: parseInt(this.padding_x_input.value) || undefined,
            ipady: parseInt(this.padding_y_input.value) || undefined
        };
        return params;
    }

    set_values(params) {
        this.tag_select.value = params.tag;
        let parent_idx = this.controller.get_parent_index(params.parent);
        if (parent_idx !== -1) this.parent_select.value = parent_idx;
        this.row_input.value = params.row || 1;
        this.col_input.value = params.col || 1;
        this.row_span_input.value = params.rowSpan || '';
        this.col_span_input.value = params.colSpan || '';
        this.id_input.value = params.id || '';
        this.class_input.value = params.class_name || '';
        this.text_input.value = params.text || '';           // text content
        this.margin_x_input.value = params.padx || '';
        this.margin_y_input.value = params.pady || '';
        this.padding_x_input.value = params.ipadx || '';
        this.padding_y_input.value = params.ipady || '';
        let sticky = params.sticky || '';
        this.sticky_n.checked = sticky.includes('n');
        this.sticky_s.checked = sticky.includes('s');
        this.sticky_e.checked = sticky.includes('e');
        this.sticky_w.checked = sticky.includes('w');
    }

    clear_form() {
        this.tag_select.value = 'button';
        this.parent_select.selectedIndex = 0;
        this.row_input.value = 1;
        this.col_input.value = 1;
        this.row_span_input.value = '';
        this.col_span_input.value = '';
        this.id_input.value = '';
        this.class_input.value = '';
        this.text_input.value = '';                          // clear text
        this.margin_x_input.value = '';
        this.margin_y_input.value = '';
        this.padding_x_input.value = '';
        this.padding_y_input.value = '';
        this.sticky_n.checked = false;
        this.sticky_s.checked = false;
        this.sticky_e.checked = false;
        this.sticky_w.checked = false;
    }

    set_edit_mode(edit_id, params) {
        this.edit_mode = true;
        this.edit_id = edit_id;
        this.set_values(params);
        this.add_btn.style.display = 'none';
        this.save_btn.style.display = 'inline-flex';
        this.cancel_btn.style.display = 'inline-flex';
    }

    cancel_edit() {
        this.edit_mode = false;
        this.edit_id = null;
        this.add_btn.style.display = 'inline-flex';
        this.save_btn.style.display = 'none';
        this.cancel_btn.style.display = 'none';
        this.clear_form();
    }

    add_object() {
        let params = this.get_values();
        if (!params.id) {
            params.id = this.controller.generate_id(params.tag);
            // Default text to widget ID if not provided
            if (!params.text) {
                params.text = params.id;
            }
        }
        this.controller.add_object(params);
        this.clear_form();
    }

    save_edit() {
        let params = this.get_values();
        if (!params.id) {
            params.id = this.controller.generate_id(params.tag);
        }
        this.controller.update_object(this.edit_id, params);
        this.cancel_edit();
    }
}
// #endregion