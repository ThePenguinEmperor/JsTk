// #region imports_and_setup
class Controller {
    constructor() {
        this.widgets = [];
        this.widgets_map = new Map();
        this.next_widget_id = 1;
        this.available_tags = [
            'button', 'div', 'span', 'input', 'label', 'select', 'textarea',
            'collapsible_section', 'popup_overlay', 'message_box'
        ].concat(window.WidgetRegistry ? WidgetRegistry.list_tags() : []).filter((tag, index, all) => all.indexOf(tag) === index);
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

        document.body.innerHTML = '';
        this.apply_saved_theme();
        this.build_shell(document.body);
        let main_container = this.creator_view;

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
        this.gallery_view = new GalleryView(this);
        this.gallery_view.build(this.gallery_container);
        this.update_parent_options();

        if (this.dev_mode) console.log('Initialization complete');
    }
// #endregion

// #region shell_and_theme
    /**
     * Builds the tab header, the Creator view and the Gallery view inside the body.
     */
    build_shell(body) {
        let header = document.createElement('div');
        header.className = 'tester_header';
        this.tab_buttons = {};
        let brand = document.createElement('span');
        brand.className = 'tester_brand';
        brand.textContent = 'Jinker';
        let brand_note = document.createElement('span');
        brand_note.className = 'tester_brand_note';
        brand_note.textContent = 'Object Creator tester';
        header.append(brand, brand_note);
        let tabs = document.createElement('div');
        tabs.className = 'tester_tabs';
        header.appendChild(tabs);
        for (let [name, label] of [['creator', 'Creator'], ['gallery', 'Showcase']]) {
            let button = document.createElement('button');
            button.className = 'tester_tab_btn';
            button.textContent = label;
            button.addEventListener('click', () => this.show_tab(name));
            tabs.appendChild(button);
            this.tab_buttons[name] = button;
        }
        let spacer = document.createElement('div');
        spacer.className = 'tester_header_spacer';
        this.theme_btn = document.createElement('button');
        this.theme_btn.className = 'tester_button tester_button_secondary';
        this.theme_btn.addEventListener('click', () => this.toggle_theme());
        header.appendChild(spacer);
        header.appendChild(this.theme_btn);
        this.creator_view = document.createElement('div');
        this.creator_view.className = 'tester_creator_view';
        this.gallery_container = document.createElement('div');
        this.gallery_container.className = 'tester_gallery_view';
        body.appendChild(header);
        body.appendChild(this.creator_view);
        body.appendChild(this.gallery_container);
        this.show_tab(this.load_saved_tab());
        this.update_theme_button();
        this.bind_tab_shortcuts();
    }

    /**
     * Returns the tab saved last time, or creator.
     */
    load_saved_tab() {
        let saved = 'creator';
        try {
            saved = localStorage.getItem('jinker_tester_tab') || 'creator';
        } catch (error) {
            console.warn('[controller] tab_load_failed', error);
        }
        return saved === 'gallery' ? 'gallery' : 'creator';
    }

    /**
     * Lets Alt+1 and Alt+2 switch between the Creator and Gallery tabs.
     */
    bind_tab_shortcuts() {
        document.addEventListener('keydown', event => {
            if (!event.altKey || event.ctrlKey || event.metaKey) {
                return;
            }
            if (event.key === '1') {
                event.preventDefault();
                this.show_tab('creator');
            } else if (event.key === '2') {
                event.preventDefault();
                this.show_tab('gallery');
            }
        });
    }

    /**
     * Shows the Creator or Gallery view.
     */
    show_tab(name) {
        this.creator_view.classList.toggle('tester_view_hidden', name !== 'creator');
        this.gallery_container.classList.toggle('tester_view_hidden', name !== 'gallery');
        for (let [tab_name, button] of Object.entries(this.tab_buttons)) {
            button.classList.toggle('tester_tab_btn_active', tab_name === name);
        }
        this.active_tab = name;
        try {
            localStorage.setItem('jinker_tester_tab', name);
        } catch (error) {
            console.warn('[controller] tab_save_failed', error);
        }
    }

    /**
     * Applies the saved theme name, or the system preference when nothing is saved.
     */
    apply_saved_theme() {
        let saved = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        try {
            saved = localStorage.getItem('jinker_tester_theme') || saved;
        } catch (error) {
            console.warn('[controller] theme_load_failed', error);
        }
        this.theme_name = saved === 'dark' ? 'dark' : 'light';
        window.set_app_theme(this.theme_name);
    }

    /**
     * Switches between light and dark and remembers the choice.
     */
    toggle_theme() {
        this.theme_name = this.theme_name === 'dark' ? 'light' : 'dark';
        window.set_app_theme(this.theme_name);
        this.update_theme_button();
        try {
            localStorage.setItem('jinker_tester_theme', this.theme_name);
        } catch (error) {
            console.warn('[controller] theme_save_failed', error);
        }
    }

    /**
     * Labels the theme button with the theme it will switch to.
     */
    update_theme_button() {
        this.theme_btn.textContent = this.theme_name === 'dark' ? 'Light theme' : 'Dark theme';
    }
// #endregion shell_and_theme

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
                    } else if (window.WidgetRegistry && WidgetRegistry.get(widget.tag)) {
                        label = `${WidgetRegistry.get(widget.tag).label} (${widget.id})`;
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
        if (widget && this.preview_grid) {
            this.preview_grid.mark_selected(widget_id);
        }
        this.show_tab('creator');
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