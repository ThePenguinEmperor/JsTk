// #region constructor_and_build
class ObjectList {
    constructor(controller) {
        this.controller = controller;
        this.container = null;
        this.item_map = new Map();          // widget_id -> DOM element (for leaf items)
        this.collapsible_map = new Map();   // widget_id -> CollapsibleSection instance
        this.color_palette = [
            'var(--tester_color_object_list_bg_0)', 'var(--tester_color_object_list_bg_1)',
            'var(--tester_color_object_list_bg_2)', 'var(--tester_color_object_list_bg_3)',
            'var(--tester_color_object_list_bg_4)', 'var(--tester_color_object_list_bg_5)',
            'var(--tester_color_object_list_bg_6)', 'var(--tester_color_object_list_bg_7)',
            'var(--tester_color_object_list_bg_8)', 'var(--tester_color_object_list_bg_9)'
        ];
        this.text_color_palette = [
            'var(--tester_color_object_list_text_0)', 'var(--tester_color_object_list_text_1)',
            'var(--tester_color_object_list_text_2)', 'var(--tester_color_object_list_text_3)',
            'var(--tester_color_object_list_text_4)', 'var(--tester_color_object_list_text_5)',
            'var(--tester_color_object_list_text_6)', 'var(--tester_color_object_list_text_7)',
            'var(--tester_color_object_list_text_8)', 'var(--tester_color_object_list_text_9)'
        ];
    }

    build(parent, row, col, colSpan, sticky, margin) {
        this.container = document.oc.object_generate('div', {
            parent: parent,
            row: row,
            col: col,
            sticky: sticky,
            class_name: 'tester_object_list',
            padx: margin.x,
            pady: margin.y
        });
        if (colSpan !== undefined) {
            this.container.style.gridColumn = `span ${colSpan}`;
        }
    }

    /**
     * Refresh the entire tree from the controller's widgets.
     * @param {Array} widgets - Array of all Widget instances.
     */
    refresh(widgets) {
        this.container.innerHTML = '';
        this.item_map.clear();
        this.collapsible_map.clear();

        let children_map = new Map();
        for (let w of widgets) {
            let parent_id = w.parent_id;
            if (!children_map.has(parent_id)) children_map.set(parent_id, []);
            children_map.get(parent_id).push(w);
        }

        let root_widgets = children_map.get(this.controller.preview_grid_id) || [];
        root_widgets.sort((a, b) => {
            if (a.row !== b.row) return a.row - b.row;
            return a.col - b.col;
        });

        for (let w of root_widgets) {
            this._render_widget(w, children_map, this.container);
        }
    }

    /**
     * Recursively render a widget and its children.
     */
    _render_widget(widget, children_map, parent_element, parent_color = null, sibling_index = 0, total_siblings = 0) {
        let children = children_map.get(widget.id) || [];
        let is_container = widget.is_container && widget.is_container();
        let has_children = children.length > 0;

        // Only container widgets with children become collapsible sections
        let use_collapsible = (is_container && has_children);

        let assigned_color = this._get_widget_color(widget, parent_color, sibling_index, total_siblings);
        let gradient_style = '';
        if (parent_color && total_siblings > 1) {
            gradient_style = `background: linear-gradient(to right, ${parent_color}, ${assigned_color});`;
        } else if (total_siblings === 1 && parent_color) {
            assigned_color = parent_color;
            gradient_style = `background: ${assigned_color};`;
        } else {
            gradient_style = `background: ${assigned_color};`;
        }

        let color_index = this._get_color_index(assigned_color);
        let text_color = this.text_color_palette[color_index % this.text_color_palette.length];

        if (use_collapsible) {
            // Create collapsible section
            let section = new CollapsibleSection(
                `${widget.tag} (${widget.id}) - row ${widget.row}, col ${widget.col}`,
                (content_container) => {
                    let sorted_children = [...children];
                    sorted_children.sort((a, b) => {
                        if (a.row !== b.row) return a.row - b.row;
                        return a.col - b.col;
                    });
                    for (let i = 0; i < sorted_children.length; i++) {
                        let child = sorted_children[i];
                        this._render_widget(child, children_map, content_container, assigned_color, i, sorted_children.length);
                    }
                },
                {
                    id: `list_section_${widget.id}`,
                    class_name: 'object_list_collapsible'
                }
            );
            section.build(parent_element);
            let header = section.container.querySelector('.collapsible_header');
            if (header) {
                header.style.cssText = gradient_style + ` color: ${text_color};`;
                // Add Edit and Delete buttons to the header
                let actions_div = document.createElement('div');
                actions_div.className = 'tester_object_actions';
                actions_div.style.marginLeft = 'auto';
                actions_div.style.display = 'flex';
                actions_div.style.gap = '8px';

                let edit_btn = document.createElement('button');
                edit_btn.textContent = 'Edit';
                edit_btn.className = 'tester_button tester_button_secondary';
                edit_btn.style.padding = '2px 6px';
                edit_btn.style.fontSize = '12px';
                edit_btn.onclick = (e) => {
                    e.stopPropagation();
                    this.controller.object_generator.set_edit_mode(widget);
                };

                let del_btn = document.createElement('button');
                del_btn.textContent = 'Delete';
                del_btn.className = 'tester_button tester_button_danger';
                del_btn.style.padding = '2px 6px';
                del_btn.style.fontSize = '12px';
                del_btn.onclick = (e) => {
                    e.stopPropagation();
                    this._confirm_delete(widget, children_map);
                };

                actions_div.appendChild(edit_btn);
                actions_div.appendChild(del_btn);
                header.appendChild(actions_div);
            }
            this.item_map.set(widget.id, section.container);
            this.collapsible_map.set(widget.id, section);
        } else {
            // Leaf widget (simple div)
            let item = document.createElement('div');
            item.className = 'tester_object_item';
            item.style.cssText = gradient_style + ` color: ${text_color};`;
            item.setAttribute('data_widget_id', widget.id);

            let info = document.createElement('span');
            info.className = 'tester_object_info';
            info.textContent = `${widget.tag} (${widget.id}) - row ${widget.row}, col ${widget.col}`;

            let actions = document.createElement('div');
            actions.className = 'tester_object_actions';

            let edit_btn = document.createElement('button');
            edit_btn.textContent = 'Edit';
            edit_btn.className = 'tester_button tester_button_secondary';
            edit_btn.onclick = () => this.controller.object_generator.set_edit_mode(widget);

            let del_btn = document.createElement('button');
            del_btn.textContent = 'Delete';
            del_btn.className = 'tester_button tester_button_danger';
            del_btn.onclick = () => this._confirm_delete(widget, children_map);

            actions.appendChild(edit_btn);
            actions.appendChild(del_btn);

            item.appendChild(info);
            item.appendChild(actions);
            parent_element.appendChild(item);
            this.item_map.set(widget.id, item);

            // If this widget has children (shouldn't happen for non-container, but just in case), render them as nested
            if (has_children) {
                let child_container = document.createElement('div');
                child_container.className = 'object_list_child_container';
                child_container.style.marginLeft = '20px';
                item.appendChild(child_container);
                let sorted_children = [...children];
                sorted_children.sort((a, b) => {
                    if (a.row !== b.row) return a.row - b.row;
                    return a.col - b.col;
                });
                for (let i = 0; i < sorted_children.length; i++) {
                    let child = sorted_children[i];
                    this._render_widget(child, children_map, child_container, assigned_color, i, sorted_children.length);
                }
            }
        }
    }

    _get_widget_color(widget, parent_color, sibling_index, total_siblings) {
        if (!parent_color) {
            let hash = 0;
            for (let i = 0; i < widget.id.length; i++) {
                hash = ((hash << 5) - hash) + widget.id.charCodeAt(i);
                hash |= 0;
            }
            let index = Math.abs(hash) % this.color_palette.length;
            return this.color_palette[index];
        }
        if (total_siblings === 1) {
            return parent_color;
        }
        let color_index = sibling_index % this.color_palette.length;
        return this.color_palette[color_index];
    }

    _get_color_index(color) {
        let idx = this.color_palette.indexOf(color);
        if (idx === -1) {
            let hash = 0;
            for (let i = 0; i < color.length; i++) {
                hash = ((hash << 5) - hash) + color.charCodeAt(i);
                hash |= 0;
            }
            idx = Math.abs(hash) % this.color_palette.length;
        }
        return idx;
    }

    _confirm_delete(widget, children_map) {
        let children = children_map.get(widget.id) || [];
        let child_count = children.length;
        if (child_count === 0) {
            this.controller.delete_widget(widget.id);
            return;
        }

        let modal = document.createElement('div');
        modal.className = 'object_list_confirm_modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); display: flex; justify-content: center;
            align-items: center; z-index: 10000;
        `;
        let dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white; padding: 20px; border-radius: 8px;
            max-width: 400px; text-align: center;
        `;
        dialog.innerHTML = `
            <p>This widget has ${child_count} child widget(s). What do you want to do?</p>
            <button id="delete_all_btn" class="tester_button tester_button_danger">Delete All</button>
            <button id="move_children_btn" class="tester_button">Move Children to Parent</button>
            <button id="cancel_btn" class="tester_button tester_button_secondary">Cancel</button>
        `;
        modal.appendChild(dialog);
        document.body.appendChild(modal);

        let delete_all_btn = dialog.querySelector('#delete_all_btn');
        let move_children_btn = dialog.querySelector('#move_children_btn');
        let cancel_btn = dialog.querySelector('#cancel_btn');

        delete_all_btn.onclick = () => {
            this._recursive_delete(widget.id, children_map);
            modal.remove();
        };
        move_children_btn.onclick = () => {
            this._move_children_to_parent(widget, children_map);
            modal.remove();
        };
        cancel_btn.onclick = () => modal.remove();
    }

    _recursive_delete(widget_id, children_map) {
        let children = children_map.get(widget_id) || [];
        for (let child of children) {
            this._recursive_delete(child.id, children_map);
            this.controller.delete_widget(child.id);
        }
        this.controller.delete_widget(widget_id);
    }

    _move_children_to_parent(widget, children_map) {
        let children = children_map.get(widget.id) || [];
        let new_parent_id = widget.parent_id;
        let parent_widget = this.controller.get_widget(new_parent_id);
        if (!parent_widget || !parent_widget.is_container || !parent_widget.is_container()) {
            new_parent_id = this.controller.preview_grid_id;
        }
        for (let child of children) {
            child.parent_id = new_parent_id;
            let new_parent_element = document.getElementById(new_parent_id);
            if (new_parent_element) {
                if (child.element && child.element.parentNode) child.element.parentNode.removeChild(child.element);
                child.build(new_parent_element);
            }
        }
        this.controller.delete_widget(widget.id);
    }

    refresh_tree() {
        this.refresh(this.controller.widgets);
    }

    update_widget_node(widget) {
        let existing_node = this.item_map.get(widget.id) || this.collapsible_map.get(widget.id);
        if (!existing_node) {
            this.refresh_tree();
            return;
        }

        // Update label text
        let info_span = existing_node.querySelector('.tester_object_info');
        if (info_span) {
            info_span.textContent = `${widget.tag} (${widget.id}) - row ${widget.row}, col ${widget.col}`;
        } else {
            let section = this.collapsible_map.get(widget.id);
            if (section) {
                let title_span = section.container.querySelector('.collapsible_title');
                if (title_span) {
                    title_span.textContent = `${widget.tag} (${widget.id}) - row ${widget.row}, col ${widget.col}`;
                }
            } else {
                this.refresh_tree();
                return;
            }
        }

        // For simplicity, do a full refresh when color might need to change
        this.refresh_tree();
    }
}
// #endregion