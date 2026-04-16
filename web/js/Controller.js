// #region imports_and_setup
class Controller {
    constructor() {
        this.widgets = [];
        this.widgets_map = new Map();
        this.next_widget_id = 1;
        this.available_tags = [
            'button', 'div', 'span', 'input', 'label', 'select', 'textarea',
            'collapsible_section', 'popup_overlay', 'message_box'
        ];
        this.preview_grid_id = 'tester_preview_grid';
        this.object_generator = null;
        this.object_list = null;
        this.code_display = null;
        this.preview_grid = null;
        this.css_editor = null;
        this.dev_mode = false;
    }
// #endregion

// #region initialization
    init() {
        if (this.dev_mode) console.log('Initializing JsTk Tester...');

        let main_container = document.body;
        main_container.innerHTML = '';

        let left_panel = document.oc.object_generate('div', {
            parent: main_container,
            row: 1,
            col: 1,
            class_name: 'tester_left_panel',
            sticky: 'nsew'
        });

        let right_panel = document.oc.object_generate('div', {
            parent: main_container,
            row: 1,
            col: 2,
            class_name: 'tester_right_panel',
            sticky: 'nsew'
        });

        document.oc.configure_column(main_container, 1, { weight: 1 });
        document.oc.configure_column(main_container, 2, { weight: 2 });

        // Preview grid wrapper (with built-in CSS button)
        let preview_container = document.oc.object_generate('div', {
            parent: right_panel,
            row: 1,
            col: 1,
            class_name: 'preview_grid_wrapper',
            sticky: 'nsew'
        });
        let margin = { x: 5, y: 5 };
        this.preview_grid = new PreviewGrid(this);
        this.preview_grid.build(preview_container, 1, 1, undefined, 'nsew', margin);

        let preview_element = this.preview_grid.get_element();

        // Configure columns only (rows auto-size)
        for (let i = 1; i <= 12; i++) {
            document.oc.configure_column(preview_element, i, { weight: 0 });
        }

        // Object generator
        let generator_container = document.oc.object_generate('div', {
            parent: left_panel,
            row: 1,
            col: 1,
            class_name: 'generator_container',
            sticky: 'nsew'
        });
        this.object_generator = new ObjectGenerator(this);
        this.object_generator.build(generator_container, margin);

        // Object list
        let list_container = document.oc.object_generate('div', {
            parent: left_panel,
            row: 2,
            col: 1,
            class_name: 'list_container',
            sticky: 'nsew'
        });
        this.object_list = new ObjectList(this);
        this.object_list.build(list_container, 1, 1, undefined, 'nsew', margin);

        document.oc.configure_row(left_panel, 1, { weight: 1 });
        document.oc.configure_row(left_panel, 2, { weight: 1 });

        // Code display
        let code_container = document.oc.object_generate('div', {
            parent: right_panel,
            row: 2,
            col: 1,
            class_name: 'code_container',
            sticky: 'nsew'
        });
        this.code_display = new CodeDisplay(this);
        this.code_display.build(code_container, 1, 1, undefined, 'nsew', margin);

        document.oc.configure_row(right_panel, 1, { weight: 2 });
        document.oc.configure_row(right_panel, 2, { weight: 1 });

        this.css_editor = new CssEditor(this);
        this.update_parent_options();

        if (this.dev_mode) console.log('Initialization complete');
    }
// #endregion

// #region widget_management
    generate_default_id(tag) {
        let new_id = this.next_widget_id;
        this.next_widget_id++;
        return `widget_${tag}_${new_id}`;
    }

    add_widget(params) {
        if (!params.id) params.id = this.generate_default_id(params.tag);
        if (!params.text) params.text = params.id;
        if (!params.parent_id) params.parent_id = this.preview_grid_id;

        let widget = new Widget(params);
        let parent_element = document.getElementById(params.parent_id);
        if (!parent_element) {
            if (this.dev_mode) console.warn('Parent element not found:', params.parent_id);
            return null;
        }
        widget.build(parent_element);
        this.widgets.push(widget);
        this.widgets_map.set(widget.id, widget);
        this.refresh_all();
        return widget.id;
    }

    update_widget(widget_id, new_params) {
        let widget = this.widgets_map.get(widget_id);
        if (!widget) {
            if (this.dev_mode) console.warn('Widget not found for update:', widget_id);
            return;
        }
        if (widget.element && widget.element.parentNode) {
            widget.element.parentNode.removeChild(widget.element);
        }
        if (new_params.tag) widget.tag = new_params.tag;
        if (new_params.id && new_params.id !== widget_id) {
            this.widgets_map.delete(widget_id);
            widget.id = new_params.id;
            this.widgets_map.set(widget.id, widget);
        }
        if (new_params.class_name !== undefined) widget.class_name = new_params.class_name;
        if (new_params.text !== undefined) widget.text = new_params.text;
        if (new_params.row !== undefined) widget.row = new_params.row;
        if (new_params.col !== undefined) widget.col = new_params.col;
        if (new_params.row_span !== undefined) widget.row_span = new_params.row_span;
        if (new_params.col_span !== undefined) widget.col_span = new_params.col_span;
        if (new_params.sticky !== undefined) widget.sticky = new_params.sticky;
        if (new_params.padx !== undefined) widget.padx = new_params.padx;
        if (new_params.pady !== undefined) widget.pady = new_params.pady;
        if (new_params.ipadx !== undefined) widget.ipadx = new_params.ipadx;
        if (new_params.ipady !== undefined) widget.ipady = new_params.ipady;
        if (new_params.parent_id !== undefined) widget.parent_id = new_params.parent_id;
        if (new_params.css !== undefined) widget.css = new_params.css;

        let standard_keys = [
            'tag','id','class_name','text','row','col','row_span','col_span',
            'sticky','padx','pady','ipadx','ipady','parent_id','css'
        ];
        for (let key in new_params) {
            if (!standard_keys.includes(key)) {
                widget.extra_attributes[key] = new_params[key];
            }
        }
        let parent_element = document.getElementById(widget.parent_id);
        if (parent_element) {
            widget.build(parent_element);
        } else if (this.dev_mode) {
            console.warn('Parent element not found during update:', widget.parent_id);
        }
        this.refresh_all();
    }

    delete_widget(widget_id) {
        let widget = this.widgets_map.get(widget_id);
        if (!widget) return;
        if (widget.element && widget.element.parentNode) {
            widget.element.parentNode.removeChild(widget.element);
        }
        let index = this.widgets.findIndex(w => w.id === widget_id);
        if (index !== -1) this.widgets.splice(index, 1);
        this.widgets_map.delete(widget_id);
        this.refresh_all();
    }

    clear_all_widgets() {
        for (let widget of this.widgets) {
            if (widget.element && widget.element.parentNode) {
                widget.element.parentNode.removeChild(widget.element);
            }
        }
        this.widgets = [];
        this.widgets_map.clear();
        this.next_widget_id = 1;
        this.refresh_all();
    }

    get_widget(widget_id) {
        return this.widgets_map.get(widget_id) || null;
    }
// #endregion

// #region parent_containers
    get_parent_containers() {
        let containers = [];
        let preview_grid = document.getElementById(this.preview_grid_id);
        if (preview_grid) {
            containers.push({
                id: this.preview_grid_id,
                label: 'Preview Grid (main)',
                element: preview_grid
            });
        }
        for (let widget of this.widgets) {
            if (widget.is_container && widget.is_container()) {
                let content_container = widget.get_content_container();
                if (content_container && document.body.contains(content_container)) {
                    let label = '';
                    if (widget.tag === 'collapsible_section') {
                        label = `Collapsible: ${widget.text || widget.id}`;
                    } else if (widget.tag === 'popup_overlay') {
                        label = `Popup: ${widget.text || widget.id}`;
                    } else {
                        label = `${widget.tag} (${widget.id})`;
                    }
                    containers.push({
                        id: widget.id,
                        label: label,
                        element: content_container,
                        widget: widget
                    });
                }
            }
        }
        return containers;
    }

    update_parent_options() {
        if (this.object_generator && this.object_generator.refresh_parent_options) {
            this.object_generator.refresh_parent_options();
        }
    }
// #endregion

// #region ui_refresh
    refresh_object_list() {
        if (this.object_list && this.object_list.refresh_tree) {
            this.object_list.refresh_tree();
        } else if (this.object_list && this.object_list.refresh) {
            this.object_list.refresh(this.widgets);
        }
    }

    refresh_all() {
        if (this.preview_grid && this.preview_grid.rebuild) {
            this.preview_grid.rebuild(this.widgets);
        }
        this.refresh_object_list();
        this.update_parent_options();
        if (this.code_display && this.code_display.refresh) {
            this.code_display.refresh(this.widgets);
        }
        if (this.dev_mode) console.log('UI refreshed, widget count:', this.widgets.length);
    }

    refresh_single_widget(widget_id) {
        let widget = this.get_widget(widget_id);
        if (!widget) return;
        if (this.preview_grid && this.preview_grid.update_widget) {
            this.preview_grid.update_widget(widget);
        }
        if (this.object_list && this.object_list.update_widget_node) {
            this.object_list.update_widget_node(widget);
        }
        if (this.code_display && this.code_display.update_widget_line) {
            this.code_display.update_widget_line(widget);
        }
        this.update_parent_options();
    }
// #endregion

// #region legacy_compatibility
    add_object(params) { return this.add_widget(params); }
    edit_object(widget_id) {
        let widget = this.get_widget(widget_id);
        if (widget && this.object_generator) {
            this.object_generator.set_edit_mode(widget);
        }
    }
    delete_object(widget_id) { this.delete_widget(widget_id); }
    get_parent_container(index) {
        let containers = this.get_parent_containers();
        return (index >= 0 && index < containers.length) ? containers[index].element : null;
    }
    get_parent_index(element) {
        let containers = this.get_parent_containers();
        for (let i = 0; i < containers.length; i++) {
            if (containers[i].element === element) return i;
        }
        return -1;
    }
    generate_id(tag) { return this.generate_default_id(tag); }
// #endregion

// #region css_editor
    open_css_editor_for(target, callback) {
        if (this.css_editor) this.css_editor.open(target, callback);
    }
    open_css_editor() {
    let preview_grid = this.preview_grid.get_element();
    if (preview_grid && this.css_editor) {
        this.css_editor.open(preview_grid, (updates) => {
            if (this.preview_grid) {
                this.preview_grid.apply_css(updates);
            }
            if (this.dev_mode) console.log('Preview CSS updated:', updates);
        });
    }
}
// #endregion
}