// #region controller
class Controller {
    constructor() {
        if (window._controller_instance) {
            return window._controller_instance;
        }
        window._controller_instance = this;

        this.objects = [];
        this.container_elements = [];
        this.available_tags = ['button', 'input', 'label', 'div', 'p', 'textarea', 'select', 'span', 'collapsible', 'tabs'];
        this.element_margin = { x: 3, y: 5 };

        // Lazy creation: no instances created yet
        this.message_box = null;
        this.css_editor = null;

        this.object_generator = new ObjectGenerator(this);
        this.object_list = new ObjectList(this);
        this.code_display = new CodeDisplay(this);
        this.preview_grid = new PreviewGrid(this);
        this.preview_css_editor = new PreviewCssEditor(this);

        this.init_ui();
    }

    init_ui() {
        // Left panel directly in body
        let left_panel = document.oc.object_generate('div', {
            parent: document.body,
            row: 1,
            col: 1,
            class_name: 'tester_left_panel',
            sticky: 'nsew'
        });
        this.object_generator.build(left_panel, this.element_margin);

        // Right panel directly in body
        let right_panel = document.oc.object_generate('div', {
            parent: document.body,
            row: 1,
            col: 2,
            class_name: 'tester_right_panel',
            sticky: 'nsew'
        });
        this._build_right_panel(right_panel, this.element_margin);

        this.refresh_parent_dropdown();
    }

    _build_right_panel(right_panel, margin) {
        // Configure columns: 3 equal columns
        for (let i = 1; i <= 3; i++) {
            document.oc.configure_column(right_panel, i, { weight: 1 });
        }

        let row_counter = 1;

        let layout_label = document.oc.object_generate('span', {
            parent: right_panel,
            row: row_counter,
            col: 1,
            text: 'Layout Test',
            class_name: 'tester_section_label',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y
        });
        layout_label.style.gridColumn = 'span 3';
        layout_label.style.textAlign = 'center';
        row_counter++;

        this.preview_grid.build(right_panel, row_counter, 1, 3, 'nsew', margin);
        row_counter++;

        let objects_label = document.oc.object_generate('span', {
            parent: right_panel,
            row: row_counter,
            col: 1,
            text: 'Objects',
            class_name: 'tester_section_label',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y
        });
        objects_label.style.gridColumn = 'span 3';
        objects_label.style.textAlign = 'center';
        row_counter++;

        this.object_list.build(right_panel, row_counter, 1, 3, 'nsew', margin);
        row_counter++;

        let code_label = document.oc.object_generate('span', {
            parent: right_panel,
            row: row_counter,
            col: 1,
            text: 'Generated Code',
            class_name: 'tester_section_label',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y
        });
        code_label.style.gridColumn = 'span 3';
        code_label.style.textAlign = 'center';
        row_counter++;

        this.code_display.build(right_panel, row_counter, 1, 3, 'nsew', margin);
        row_counter++;

        let copy_btn = document.oc.object_generate('button', {
            parent: right_panel,
            row: row_counter,
            col: 1,
            text: 'Copy Code',
            class_name: 'tester_button',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            events: { click: () => this.code_display.copy_code() }
        });
        let load_btn = document.oc.object_generate('button', {
            parent: right_panel,
            row: row_counter,
            col: 3,
            text: 'Load Code',
            class_name: 'tester_button',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            events: { click: () => this.code_display.load_code() }
        });
        row_counter++;

        let css_label = document.oc.object_generate('span', {
            parent: right_panel,
            row: row_counter,
            col: 1,
            text: 'Preview Grid CSS',
            class_name: 'tester_section_label',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y
        });
        css_label.style.gridColumn = 'span 3';
        css_label.style.textAlign = 'center';
        row_counter++;

        this.preview_css_editor.build(right_panel, row_counter, 1, 3, 'nsew', margin);
        row_counter++;

        let copy_css_btn = document.oc.object_generate('button', {
            parent: right_panel,
            row: row_counter,
            col: 1,
            text: 'Copy CSS',
            class_name: 'tester_button',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            events: { click: () => this.preview_css_editor.copy_css() }
        });
        let apply_css_btn = document.oc.object_generate('button', {
            parent: right_panel,
            row: row_counter,
            col: 2,
            text: 'Apply CSS',
            class_name: 'tester_button',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            events: { click: () => this.preview_css_editor.apply_css() }
        });
        let load_css_btn = document.oc.object_generate('button', {
            parent: right_panel,
            row: row_counter,
            col: 3,
            text: 'Load CSS from Code',
            class_name: 'tester_button',
            sticky: 'ew',
            padx: margin.x,
            pady: margin.y,
            events: { click: () => this.preview_css_editor.load_css() }
        });

        // Make preview grid expandable
        document.oc.configure_row(right_panel, 2, { weight: 1 });
    }

    // Object management
    add_object(params) {
        let widget = this.create_widget(params);
        this.objects.push({
            id: params.id,
            tag: params.tag,
            element: widget,
            params: params
        });
        this.refresh_ui();
        this.show_message('Object added successfully', 'success');
    }

    update_object(id, params) {
        let obj = this.objects.find(o => o.id === id);
        if (!obj) return;
        document.oc.update_widget(obj.element, params);
        obj.params = params;
        obj.tag = params.tag;
        this.refresh_ui();
        this.show_message('Object updated successfully', 'success');
    }

    delete_object(id) {
        let obj = this.objects.find(o => o.id === id);
        if (!obj) return;
        document.oc.remove_widget(obj.element);
        this.objects = this.objects.filter(o => o.id !== id);
        this.refresh_ui();
        this.show_message('Object deleted', 'success');
    }

    edit_object(id) {
        let obj = this.objects.find(o => o.id === id);
        if (!obj) return;
        this.object_generator.set_edit_mode(id, obj.params);
    }

    create_widget(params) {
        if (params.tag === 'collapsible') {
            return this.create_collapsible(params);
        } else if (params.tag === 'tabs') {
            return this.create_tabs(params);
        } else {
            return document.oc.object_generate(params.tag, params);
        }
    }

    refresh_ui() {
        this.object_list.refresh(this.objects);
        this.code_display.update_code(this.objects);
        this.refresh_parent_dropdown();
    }

    refresh_parent_dropdown() {
        let containers = [this.preview_grid.get_element()];
        for (let obj of this.objects) {
            if (obj.tag === 'div' || obj.tag === 'collapsible' || obj.tag === 'tabs') {
                containers.push(obj.element);
            }
        }
        this.container_elements = containers;
        this.object_generator.parent_select.innerHTML = '';
        for (let i = 0; i < containers.length; i++) {
            let option = document.createElement('option');
            option.value = i;
            let desc = containers[i].id ? `#${containers[i].id}` : (containers[i].class_name ? `.${containers[i].class_name}` : 'unnamed');
            option.textContent = `${i}: ${desc}`;
            if (i === 0) option.selected = true;  // select the first (preview grid)
            this.object_generator.parent_select.appendChild(option);
        }
    }

    get_parent_container(index) {
        return this.container_elements[index] || this.preview_grid.get_element();
    }

    get_parent_index(parent) {
        return this.container_elements.findIndex(el => el === parent);
    }

    generate_id(tag) {
        let base = tag;
        let counter = 1;
        let id;
        do {
            id = `${base}_${counter.toString().padStart(3, '0')}`;
            counter++;
        } while (this.objects.some(o => o.id === id));
        return id;
    }

    // Code loading
    load_code(code) {
        try {
            for (let obj of this.objects) {
                document.oc.remove_widget(obj.element);
            }
            this.objects = [];
            new Function('document', code)(document);
            this.sync_objects_from_dom();
            this.refresh_ui();
            this.show_message('Code loaded successfully', 'success');
        } catch (e) {
            this.show_message('Error loading code: ' + e.message, 'error');
        }
    }

    sync_objects_from_dom() {
        this.objects = [];
        let children = this.preview_grid.get_element().children;
        for (let child of children) {
            let tag = child.tagName.toLowerCase();
            let id = child.id;
            let row = parseInt(child.style.gridRowStart) || 1;
            let col = parseInt(child.style.gridColumnStart) || 1;
            let rowSpan = child.style.gridRowEnd ? (child.style.gridRowEnd.startsWith('span') ? parseInt(child.style.gridRowEnd.split(' ')[1]) : null) : null;
            let colSpan = child.style.gridColumnEnd ? (child.style.gridColumnEnd.startsWith('span') ? parseInt(child.style.gridColumnEnd.split(' ')[1]) : null) : null;
            let sticky = '';
            let alignSelf = child.style.alignSelf;
            let justifySelf = child.style.justifySelf;
            if (alignSelf === 'start') sticky += 'n';
            if (alignSelf === 'end') sticky += 's';
            if (justifySelf === 'end') sticky += 'e';
            if (justifySelf === 'start') sticky += 'w';
            if (alignSelf === 'stretch') sticky += 'ns';
            if (justifySelf === 'stretch') sticky += 'ew';
            let class_name = child.className;
            let params = {
                tag: tag,
                parent: this.preview_grid.get_element(),
                row: row,
                col: col,
                rowSpan: rowSpan,
                colSpan: colSpan,
                sticky: sticky,
                id: id,
                class_name: class_name
            };
            this.objects.push({
                id: id,
                tag: tag,
                element: child,
                params: params
            });
        }
    }

    // CSS operations
    open_css_editor() {
        let editor = new CssEditor((css, el) => this.on_css_applied(css, el));
        editor.open_for(this.preview_grid.get_element());
    }

    on_css_applied(css, element) {
        if (element === this.preview_grid.get_element()) {
            this.preview_css_editor.set_value(css);
        }
        this.show_message('CSS applied', 'success');
    }

    apply_preview_css(css) {
        this.preview_grid.apply_css(css);
        this.show_message('Preview CSS applied', 'success');
    }

    get_preview_grid_css() {
        return this.preview_grid.get_css();
    }

    // Message box
    show_message(text, type) {
        let msg_box = new MessageBox();
        msg_box.show(text, type);
    }

    // Custom widgets
    create_collapsible(params) {
        let container = document.oc.object_generate('div', params);
        let header = document.oc.object_generate('div', {
            parent: container,
            row: 1,
            col: 1,
            style: 'cursor: pointer; background: #eee; padding: 5px;',
            text: 'Collapsible Header'
        });
        let content = document.oc.object_generate('div', {
            parent: container,
            row: 2,
            col: 1,
            style: 'padding: 5px;'
        });
        header.addEventListener('click', () => {
            content.style.display = content.style.display === 'none' ? 'block' : 'none';
        });
        return container;
    }

    create_tabs(params) {
        let container = document.oc.object_generate('div', params);
        let tabs_bar = document.oc.object_generate('div', {
            parent: container,
            row: 1,
            col: 1,
            style: 'display: flex; gap: 5px;'
        });
        let content_area = document.oc.object_generate('div', {
            parent: container,
            row: 2,
            col: 1,
            style: 'border: 1px solid #ccc; padding: 5px;'
        });
        let tab1 = document.oc.object_generate('button', {
            parent: tabs_bar,
            row: 1,
            col: 1,
            text: 'Tab 1',
            class_name: 'tester_button tester_button_secondary'
        });
        let tab2 = document.oc.object_generate('button', {
            parent: tabs_bar,
            row: 1,
            col: 2,
            text: 'Tab 2',
            class_name: 'tester_button tester_button_secondary'
        });
        let tab1_content = document.oc.object_generate('span', {
            parent: content_area,
            row: 1,
            col: 1,
            text: 'Content of Tab 1'
        });
        let tab2_content = document.oc.object_generate('span', {
            parent: content_area,
            row: 1,
            col: 1,
            text: 'Content of Tab 2',
            style: 'display: none;'
        });
        tab1.addEventListener('click', () => {
            tab1_content.style.display = 'block';
            tab2_content.style.display = 'none';
        });
        tab2.addEventListener('click', () => {
            tab1_content.style.display = 'none';
            tab2_content.style.display = 'block';
        });
        return container;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    let controller = new Controller();
    window.controller = controller;
});
// #endregion