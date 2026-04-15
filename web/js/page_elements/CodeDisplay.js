// #region constructor_and_build
class CodeDisplay {
    constructor(controller) {
        this.controller = controller;
        this.container = null;
        this.code_textarea = null;
        this.copy_btn = null;
        this.save_btn = null;
        this.load_btn = null;
        this.clear_btn = null;
        this.fullscreen_btn = null;
    }

    build(parent, row, col, colSpan, sticky, margin) {
        this.container = document.oc.object_generate('div', {
            parent: parent,
            row: row,
            col: col,
            sticky: sticky,
            class_name: 'tester_code_display',
            padx: margin.x,
            pady: margin.y
        });
        if (colSpan !== undefined) {
            this.container.style.gridColumn = `span ${colSpan}`;
        }

        let header = document.oc.object_generate('div', {
            parent: this.container,
            row: 1,
            col: 1,
            class_name: 'tester_code_header',
            sticky: 'ew'
        });

        let title = document.oc.object_generate('span', {
            parent: header,
            row: 1,
            col: 1,
            text: 'Generated Code',
            class_name: 'tester_code_title'
        });

        this.code_textarea = document.oc.object_generate('textarea', {
            parent: this.container,
            row: 2,
            col: 1,
            class_name: 'tester_code_area',
            sticky: 'nsew',
            style: 'height: 200px; font-family: monospace;'
        });

        let button_row = document.oc.object_generate('div', {
            parent: this.container,
            row: 3,
            col: 1,
            class_name: 'tester_code_buttons',
            sticky: 'ew'
        });

        this.copy_btn = document.oc.object_generate('button', {
            parent: button_row,
            row: 1,
            col: 1,
            text: 'Copy',
            class_name: 'tester_button',
            events: { click: () => this.copy_code() }
        });

        this.save_btn = document.oc.object_generate('button', {
            parent: button_row,
            row: 1,
            col: 2,
            text: 'Save to File',
            class_name: 'tester_button',
            events: { click: () => this.save_to_file() }
        });

        this.load_btn = document.oc.object_generate('button', {
            parent: button_row,
            row: 1,
            col: 3,
            text: 'Load',
            class_name: 'tester_button',
            events: { click: () => this.load_from_textarea() }
        });

        this.clear_btn = document.oc.object_generate('button', {
            parent: button_row,
            row: 1,
            col: 4,
            text: 'Clear All',
            class_name: 'tester_button tester_button_danger',
            events: { click: () => this.clear_all_widgets() }
        });

        this.fullscreen_btn = document.oc.object_generate('button', {
            parent: button_row,
            row: 1,
            col: 5,
            text: 'Fullscreen',
            class_name: 'tester_button',
            events: { click: () => this.open_fullscreen_editor() }
        });

        document.oc.configure_row(this.container, 2, { weight: 1 });
        for (let i = 1; i <= 5; i++) {
            document.oc.configure_column(button_row, i, { weight: 1 });
        }
    }
// #endregion

// #region code_generation
    refresh(widgets) {
        let code_lines = [];
        code_lines.push('// Auto-generated code from JsTk Tester');
        code_lines.push('');
        code_lines.push('let parent_container = document.getElementById(\'tester_preview_grid\');');
        code_lines.push('if (!parent_container) {');
        code_lines.push('    console.error("Parent container not found");');
        code_lines.push('}');
        code_lines.push('');

        for (let widget of widgets) {
            let line = widget.get_command_string('parent_container');
            code_lines.push(line);
            code_lines.push('');
        }

        this.code_textarea.value = code_lines.join('\n');
    }

    update_widget_line(widget) {
        let lines = this.code_textarea.value.split('\n');
        let target_line = widget.get_command_string('parent_container');
        let found = false;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(`id: '${widget.id}'`) || lines[i].includes(`id: "${widget.id}"`)) {
                lines[i] = target_line;
                found = true;
                break;
            }
        }
        if (!found) {
            this.refresh(this.controller.widgets);
        } else {
            this.code_textarea.value = lines.join('\n');
        }
    }
// #endregion

// #region code_operations
    copy_code() {
        this.code_textarea.select();
        document.execCommand('copy');
        this.show_message('Code copied to clipboard!', 'success');
    }

    save_to_file() {
        let code = this.code_textarea.value;
        let blob = new Blob([code], { type: 'text/javascript' });
        let url = URL.createObjectURL(blob);
        let a = document.createElement('a');
        a.href = url;
        a.download = `jstk_layout_${new Date().toISOString().slice(0, 19)}.js`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.show_message('File saved!', 'success');
    }

    clear_all_widgets() {
        let confirmed = confirm('Are you sure you want to clear all widgets? This cannot be undone.');
        if (confirmed) {
            this.controller.clear_all_widgets();
            this.show_message('All widgets cleared.', 'info');
        }
    }

    open_fullscreen_editor() {
        let self = this;
        let popup = new PopupOverlay(
            function(container) {
                let textarea = document.createElement('textarea');
                textarea.value = self.code_textarea.value;
                textarea.style.width = '100%';
                textarea.style.height = '400px';
                textarea.style.fontFamily = 'monospace';
                textarea.style.fontSize = '12px';

                let save_btn = document.createElement('button');
                save_btn.textContent = 'Save & Apply';
                save_btn.className = 'tester_button';
                save_btn.style.marginTop = '10px';
                save_btn.onclick = function() {
                    self.code_textarea.value = textarea.value;
                    self.load_from_textarea();
                    popup.close();
                };

                let cancel_btn = document.createElement('button');
                cancel_btn.textContent = 'Cancel';
                cancel_btn.className = 'tester_button tester_button_secondary';
                cancel_btn.style.marginLeft = '10px';
                cancel_btn.onclick = function() { popup.close(); };

                let btn_row = document.createElement('div');
                btn_row.appendChild(save_btn);
                btn_row.appendChild(cancel_btn);

                container.appendChild(textarea);
                container.appendChild(btn_row);
            },
            function() {}
        );
        popup.open();
    }

    _extract_commands(code) {
        let lines = code.split('\n');
        let commands = [];
        for (let line of lines) {
            let trimmed = line.trim();
            if (trimmed.startsWith('document.oc.object_generate')) {
                commands.push(trimmed);
            }
        }
        return commands;
    }

    _preprocess_command(cmd) {
        let modified = cmd.replace(/\bparent:\s*parent_container\b/g, "parent_id: 'tester_preview_grid'");
        return modified;
    }

    _validate_hierarchy(params_list) {
        let errors = [];
        let id_set = new Set();
        for (let p of params_list) {
            if (p.id) id_set.add(p.id);
        }
        let orphans = [];
        for (let p of params_list) {
            if (p.parent_id && p.parent_id !== this.controller.preview_grid_id && !id_set.has(p.parent_id)) {
                orphans.push(p);
                errors.push(`Widget "${p.id || '(no id)'}" has parent "${p.parent_id}" which does not exist.`);
            }
        }
        return { valid: errors.length === 0, errors: errors, orphans: orphans };
    }

    load_from_textarea() {
        let code = this.code_textarea.value;
        let commands = this._extract_commands(code);
        if (commands.length === 0) {
            this.show_message('No document.oc.object_generate commands found.', 'error');
            return;
        }

        let processed_commands = commands.map(cmd => this._preprocess_command(cmd));
        let valid_params = [];
        let all_errors = [];
        for (let cmd of processed_commands) {
            let result = document.oc.validate_command_string(cmd);
            if (!result.valid) {
                all_errors.push(...result.errors);
            } else {
                valid_params.push(result.params);
            }
        }
        if (all_errors.length > 0) {
            this.show_message('Validation errors:\n' + all_errors.join('\n'), 'error');
            return;
        }

        let hierarchy = this._validate_hierarchy(valid_params);
        if (!hierarchy.valid) {
            this.show_message('Hierarchy errors:\n' + hierarchy.errors.join('\n'), 'error');
            return;
        }

        // Compute depth for each widget to add parents before children
        let id_to_params = new Map();
        for (let p of valid_params) {
            id_to_params.set(p.id, p);
        }
        let depth_map = new Map();
        let compute_depth = (id) => {
            if (depth_map.has(id)) return depth_map.get(id);
            let p = id_to_params.get(id);
            if (!p || !p.parent_id || p.parent_id === this.controller.preview_grid_id) {
                depth_map.set(id, 0);
                return 0;
            }
            let parent_depth = compute_depth(p.parent_id);
            let depth = parent_depth + 1;
            depth_map.set(id, depth);
            return depth;
        };
        for (let p of valid_params) {
            compute_depth(p.id);
        }
        valid_params.sort((a, b) => (depth_map.get(a.id) || 0) - (depth_map.get(b.id) || 0));

        this.controller.clear_all_widgets();
        for (let params of valid_params) {
            if (!params.parent_id) params.parent_id = this.controller.preview_grid_id;
            if (!params.id) params.id = this.controller.generate_default_id(params.tag);
            if (!params.text) params.text = params.id;
            this.controller.add_widget(params);
        }

        this.refresh(this.controller.widgets);
        this.show_message(`Loaded ${valid_params.length} widget(s).`, 'success');
    }

    show_message(text, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${text}`);
        if (window.MessageBox && this.code_textarea) {
            let msg = new MessageBox({
                text: text,
                type: type,
                timeout: 3000,
                target: this.code_textarea,
                position: 'top'
            });
            msg.show();
        } else {
            alert(text);
        }
    }
// #endregion
}