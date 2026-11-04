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
        this.storage_key = 'jstk_last_code';   // localStorage key
        this.import_btn = null;
        this.save_timer = null;
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

        this.import_btn = document.oc.object_generate('button', {
            parent: button_row,
            row: 1,
            col: 6,
            text: 'Open File',
            class_name: 'tester_button',
            events: { click: () => this.open_from_file() }
        });

        this.code_textarea.spellcheck = false;
        this.code_textarea.addEventListener('input', () => this.schedule_save());

        document.oc.configure_row(this.container, 2, { weight: 1 });
        for (let i = 1; i <= 6; i++) {
            document.oc.configure_column(button_row, i, { weight: 1 });
        }

        // Load saved code from localStorage on initialization
        this.load_from_storage();
    }
// #endregion

// #region code_generation
    refresh(widgets) {
        let code_lines = [];
        for (let widget of widgets) {
            let line = widget.get_command_string(this.controller.preview_grid_id);
            code_lines.push(line);
            code_lines.push('');
        }
        if (code_lines.length > 0 && code_lines[code_lines.length - 1] === '') {
            code_lines.pop();
        }
        this.code_textarea.value = code_lines.join('\n');
        this.save_to_storage();
    }

    update_widget_line(widget) {
        let lines = this.code_textarea.value.split('\n');
        let target_line = widget.get_command_string(this.controller.preview_grid_id);
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
            this.save_to_storage();
        }
    }
// #endregion

// #region code_operations
    /**
     * Copies the code with the async clipboard API and falls back to execCommand.
     */
    copy_code() {
        let code = this.code_textarea.value;
        let on_done = () => this.show_message('Code copied to clipboard!', 'success');
        let fallback = () => {
            this.code_textarea.select();
            document.execCommand('copy');
            on_done();
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code).then(on_done, fallback);
            return;
        }
        fallback();
    }

    /**
     * Reads a chosen .js or .txt file into the textarea and loads it.
     */
    open_from_file() {
        let input = document.createElement('input');
        input.type = 'file';
        input.accept = '.js,.txt';
        input.addEventListener('change', () => {
            let file = input.files && input.files[0];
            if (!file) {
                return;
            }
            file.text().then(text => {
                this.code_textarea.value = text;
                this.load_from_textarea();
            }, error => this.show_message('Could not read file: ' + error.message, 'error'));
        });
        input.click();
    }

    /**
     * Saves the typed code after a short pause so typing stays fast.
     */
    schedule_save() {
        clearTimeout(this.save_timer);
        this.save_timer = setTimeout(() => this.save_to_storage(), 400);
    }

    save_to_file() {
        let code = this.code_textarea.value;
        let blob = new Blob([code], { type: 'text/javascript' });
        let url = URL.createObjectURL(blob);
        let a = document.createElement('a');
        a.href = url;
        a.download = `jstk_layout_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.js`;
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
            // After clearing, the code textarea will be empty via refresh, so save empty
            this.save_to_storage();
        }
    }

    open_fullscreen_editor() {
        let self = this;
        let popup = new PopupOverlay(
            function(container) {
                let textarea = document.createElement('textarea');
                textarea.value = self.code_textarea.value;
                textarea.className = 'tester_code_area';
                textarea.spellcheck = false;
                textarea.style.width = '100%';
                textarea.style.height = '65vh';
                textarea.style.boxSizing = 'border-box';

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
            { width: Math.floor(window.innerWidth * 0.88), height: Math.floor(window.innerHeight * 0.8) },
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

    /**
     * Quotes a bare parent_container variable and makes sure the command ends with a semicolon.
     */
    _preprocess_command(cmd) {
        let modified = cmd.replace(/\bparent:\s*parent_container\b/g, "parent: 'parent_container'");
        if (!modified.endsWith(';')) {
            modified += ';';
        }
        return modified;
    }

    /**
     * Turns a generated parent value into the tester parent_id.
     */
    _map_parent(params) {
        let root_id = this.controller.preview_grid_id;
        let is_root = !params.parent || params.parent === 'parent_container' || params.parent === root_id;
        params.parent_id = params.parent_id || (is_root ? root_id : params.parent);
        delete params.parent;
    }

    _validate_hierarchy(params_list) {
        let errors = [];
        let id_set = new Set();
        for (let p of params_list) {
            if (p.id && id_set.has(p.id)) {
                errors.push(`Duplicate id "${p.id}" found; every widget id must be unique.`);
            }
            if (p.id) id_set.add(p.id);
        }
        for (let p of params_list) {
            if (p.parent_id && p.parent_id !== this.controller.preview_grid_id && !id_set.has(p.parent_id)) {
                errors.push(`Widget "${p.id || '(no id)'}" has parent "${p.parent_id}" which does not exist.`);
            }
        }
        return { valid: errors.length === 0, errors: errors };
    }

    load_from_textarea(lenient = false) {
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
                let snippet = cmd.length > 70 ? cmd.slice(0, 70) + '...' : cmd;
                all_errors.push(...result.errors.map(error => error + ' [' + snippet + ']'));
            } else {
                this._map_parent(result.params);
                valid_params.push(result.params);
            }
        }
        if (all_errors.length > 0 && lenient && valid_params.length > 0) {
            this.show_message('Skipped ' + all_errors.length + ' invalid command(s):' + String.fromCharCode(10) + all_errors.join(String.fromCharCode(10)), 'warning', 10000);
        } else if (all_errors.length > 0) {
            let error_msg = 'Validation errors:\n' + all_errors.join('\n');
            this.show_message(error_msg, 'error', 10000);
            return;
        }

        let hierarchy = this._validate_hierarchy(valid_params);
        if (!hierarchy.valid) {
            let error_msg = 'Hierarchy errors:\n' + hierarchy.errors.join('\n');
            this.show_message(error_msg, 'error', 10000);
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

        // Keep the original commands in the textarea (but formatted)
        let formatted_lines = [];
        for (let cmd of commands) {
            formatted_lines.push(cmd);
            formatted_lines.push('');
        }
        if (formatted_lines.length > 0 && formatted_lines[formatted_lines.length - 1] === '') {
            formatted_lines.pop();
        }
        this.code_textarea.value = formatted_lines.join('\n');
        this.save_to_storage();
        this.show_message(`Loaded ${valid_params.length} widget(s).`, 'success');
    }

    show_message(text, type = 'info', timeout = 3000) {
        console.log(`[${type.toUpperCase()}] ${text}`);
        if (window.MessageBox && this.code_textarea) {
            let msg = new MessageBox({
                text: text,
                type: type,
                timeout: timeout,
                target: this.code_textarea,
                position: 'top'
            });
            msg.show();
        } else {
            alert(text);
        }
    }

    // #region storage
    save_to_storage() {
        try {
            let code = this.code_textarea.value;
            localStorage.setItem(this.storage_key, code);
            if (this.controller.dev_mode) {
                console.log('Code saved to localStorage');
            }
        } catch (e) {
            console.warn('Failed to save code to localStorage:', e);
        }
    }

    load_from_storage() {
        try {
            let saved_code = localStorage.getItem(this.storage_key);
            if (saved_code === null && typeof DefaultLayout !== 'undefined') {
                saved_code = DefaultLayout.CODE;
            }
            if (saved_code) {
                this.code_textarea.value = saved_code;
                if (this.controller.dev_mode) {
                    console.log('Loaded saved code from localStorage');
                }
                this.load_from_textarea(true);
            }
        } catch (e) {
            console.warn('Failed to load code from localStorage:', e);
        }
    }
    // #endregion
// #endregion
}