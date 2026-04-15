// #region preview_grid
class PreviewGrid {
    constructor(controller) {
        this.controller = controller;
        this.element = null;
    }

    build(parent, row, col, colSpan, sticky, margin) {
        this.element = document.oc.object_generate('div', {
            parent: parent,
            row: row,
            col: col,
            sticky: sticky,
            id: this.controller.preview_grid_id,
            class_name: 'tester_preview_grid',
            padx: margin.x,
            pady: margin.y
        });
        if (colSpan !== undefined) {
            this.element.style.gridColumn = `span ${colSpan}`;
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
        this.element.style.cssText = css;
    }

    get_css() {
        return this.element.style.cssText;
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