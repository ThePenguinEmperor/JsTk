// #region preview_grid
class PreviewGrid {
    constructor(controller) {
        this.controller = controller;
        this.element = null;
        this.header = null;
        this.css_btn = null;
        this.clear_css_btn = null;
        this.storage_key = 'jstk_preview_css';
    }

    build(parent, row, col, colSpan, sticky, margin) {
        let wrapper = document.createElement('div');
        wrapper.className = 'tester_preview_wrapper';

        this.header = document.createElement('div');
        this.header.className = 'tester_panel_header';

        let title = document.createElement('span');
        title.textContent = 'Preview Area';
        title.className = 'tester_panel_title';

        let button_container = document.createElement('div');
        button_container.className = 'tester_action_buttons';

        this.css_btn = document.createElement('button');
        this.css_btn.textContent = 'CSS';
        this.css_btn.title = 'Edit Preview CSS (background, borders, etc.)';
        this.css_btn.className = 'tester_button tester_button_secondary tester_button_small';
        this.css_btn.onclick = () => this.controller.open_css_editor();

        this.clear_css_btn = document.createElement('button');
        this.clear_css_btn.textContent = 'Reset';
        this.clear_css_btn.title = 'Clear Preview CSS';
        this.clear_css_btn.className = 'tester_button tester_button_secondary tester_button_small';
        this.clear_css_btn.style.display = 'none';
        this.clear_css_btn.onclick = () => this.clear_css();

        button_container.appendChild(this.css_btn);
        button_container.appendChild(this.clear_css_btn);
        this.header.appendChild(title);
        this.header.appendChild(button_container);
        wrapper.appendChild(this.header);

        this.element = document.oc.object_generate('div', {
            parent: wrapper,
            row: 1,
            col: 1,
            sticky: 'nsew',
            id: this.controller.preview_grid_id,
            class_name: 'tester_preview_grid',
            padx: margin.x,
            pady: margin.y
        });

        parent.appendChild(wrapper);
        this.element.style.flex = '1';
        this.element.addEventListener('click', event => this.select_from_event(event));

        // Load saved CSS
        this.load_css_from_storage();
    }

    /**
     * Finds the widget under a click and opens it in the editor.
     */
    select_from_event(event) {
        let node = event.target;
        while (node && node !== this.element) {
            if (node.id && this.controller.get_widget(node.id)) {
                this.controller.edit_object(node.id);
                return;
            }
            node = node.parentElement;
        }
    }

    /**
     * Outlines the widget with this id in the preview and clears the outline of the others.
     */
    mark_selected(widget_id) {
        this.selected_id = widget_id;
        for (let el of this.element.querySelectorAll('.tester_preview_selected')) {
            el.classList.remove('tester_preview_selected');
        }
        let target = widget_id ? document.getElementById(widget_id) : null;
        if (target) {
            target.classList.add('tester_preview_selected');
        }
    }

    get_element() {
        return this.element;
    }

    clear() {
        while (this.element.firstChild) {
            this.element.removeChild(this.element.firstChild);
        }
    }

    apply_css(css) {
        if (css && typeof css === 'object') {
            for (let prop in css) {
                this.element.style[prop] = css[prop];
            }
        } else if (typeof css === 'string') {
            this.element.style.cssText = css;
        }
        this.save_css_to_storage();
        this.update_clear_button_visibility();
    }

    get_css() {
        return this.element.style.cssText;
    }

    clear_css() {
        this.element.style.cssText = '';
        this.save_css_to_storage();
        this.update_clear_button_visibility();
        if (this.controller.dev_mode) console.log('Preview CSS cleared');
    }

    save_css_to_storage() {
        try {
            let css_text = this.element.style.cssText;
            localStorage.setItem(this.storage_key, css_text);
        } catch (e) {
            console.warn('Failed to save preview CSS to localStorage', e);
        }
    }

    load_css_from_storage() {
        try {
            let saved_css = localStorage.getItem(this.storage_key);
            if (saved_css) {
                this.element.style.cssText = saved_css;
                this.update_clear_button_visibility();
                if (this.controller.dev_mode) console.log('Loaded preview CSS from localStorage');
            }
        } catch (e) {
            console.warn('Failed to load preview CSS from localStorage', e);
        }
    }

    update_clear_button_visibility() {
        if (this.clear_css_btn) {
            let has_styles = this.element.style.cssText && this.element.style.cssText.trim() !== '';
            this.clear_css_btn.style.display = has_styles ? 'inline-flex' : 'none';
        }
    }

    rebuild(widgets) {
        this.clear();
        let children_map = new Map();
        for (let w of widgets) {
            let parent_id = w.parent_id;
            if (!children_map.has(parent_id)) children_map.set(parent_id, []);
            children_map.get(parent_id).push(w);
        }

        let depth_map = new Map();
        let compute_depth = (widget_id, depth) => {
            depth_map.set(widget_id, depth);
            let children = children_map.get(widget_id) || [];
            for (let child of children) {
                compute_depth(child.id, depth + 1);
            }
        };
        let root_children = children_map.get(this.controller.preview_grid_id) || [];
        for (let root_widget of root_children) {
            compute_depth(root_widget.id, 0);
        }

        let sorted_widgets = [...widgets];
        sorted_widgets.sort((a, b) => {
            let depth_a = depth_map.get(a.id) || 0;
            let depth_b = depth_map.get(b.id) || 0;
            return depth_a - depth_b;
        });

        for (let widget of sorted_widgets) {
            let parent_element = null;
            if (widget.parent_id === this.controller.preview_grid_id) {
                parent_element = this.element;
            } else {
                let parent_widget = this.controller.get_widget(widget.parent_id);
                if (parent_widget && parent_widget.get_content_container()) {
                    parent_element = parent_widget.get_content_container();
                }
            }
            if (parent_element) {
                widget.build(parent_element);
            }
        }
    }

    update_widget(widget) {
        let old_element = document.getElementById(widget.id);
        setTimeout(() => this.mark_selected(this.selected_id), 0);
        if (!old_element) {
            this.rebuild(this.controller.widgets);
            return;
        }
        let parent_element = old_element.parentElement;
        if (!parent_element) {
            this.rebuild(this.controller.widgets);
            return;
        }
        old_element.remove();
        widget.build(parent_element);
    }
}
// #endregion