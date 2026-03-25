/**
 * Tester.js
 * Interactive object creator for grid-based UI components.
 * Provides form-based interface for creating, editing, and managing widgets.
 */

class Tester {
    constructor() {
        // #region dom_selectors
        this.oc = document.oc;
        this.preview_grid = document.getElementById('previewGrid');
        this.parent_select = document.getElementById('parentSelect');
        this.tag_select = document.getElementById('tagSelect');
        this.obj_id = document.getElementById('objId');
        this.obj_class = document.getElementById('objClass');
        this.obj_text = document.getElementById('objText');
        this.obj_row = document.getElementById('objRow');
        this.obj_col = document.getElementById('objCol');
        this.obj_row_span = document.getElementById('objRowSpan');
        this.obj_col_span = document.getElementById('objColSpan');
        this.padx = document.getElementById('padx');
        this.pady = document.getElementById('pady');
        this.ipadx = document.getElementById('ipadx');
        this.ipady = document.getElementById('ipady');
        this.sticky_n = document.getElementById('stickyN');
        this.sticky_s = document.getElementById('stickyS');
        this.sticky_e = document.getElementById('stickyE');
        this.sticky_w = document.getElementById('stickyW');
        this.btn_add_object = document.getElementById('btnAddObject');
        this.btn_save_edit = document.getElementById('btnSaveEdit');
        this.btn_cancel_edit = document.getElementById('btnCancelEdit');
        this.btn_copy_code = document.getElementById('btnCopyCode');
        this.btn_load_code = document.getElementById('btnLoadCode');
        this.btn_save_code = document.getElementById('btnSaveCode');
        this.btn_copy_preview_css = document.getElementById('btnCopyPreviewCss');
        this.btn_apply_preview_css = document.getElementById('btnApplyPreviewCss');
        this.btn_load_preview_css = document.getElementById('btnLoadPreviewCss');
        this.preview_css_textarea = document.getElementById('previewCss');
        this.code_display = document.getElementById('codeDisplay');
        this.object_list_div = document.getElementById('objectList');
        this.btn_open_css_editor = document.getElementById('btnOpenCssEditor');
        this.btn_preview_css = document.getElementById('btnPreviewCss');
        this.btn_separate_window = document.getElementById('btnSeparateWindow');
        this.btn_grid_config = document.getElementById('btnGridConfig');
        this.message_box = document.getElementById('messageBox');
        this.message_text = document.getElementById('messageText');
        this.close_message_btn = document.getElementById('closeMessage');
        // #endregion

        // #region state
        this.objects = [];
        this.container_elements = [this.preview_grid];
        this.editing_index = null;
        this.counter = 1;
        this.message_timeout = null;
        this.css_editor = null;
        this.grid_config_modal = null;
        this.grid_config_content = null;
        this.btn_apply_grid_config = null;
        this.close_grid_modal = null;
        this.pending_css = null;
        // #endregion

        // #region initialization
        this.refresh_parent_dropdown();
        this.init_css_editor();
        this.init_grid_config_modal();
        this.bind_event_listeners();
        // #endregion
    }

    // #region event_binding
    bind_event_listeners() {
        this.btn_add_object.addEventListener('click', () => this.add_object_from_form());
        this.btn_save_edit.addEventListener('click', () => this.save_edit());
        this.btn_cancel_edit.addEventListener('click', () => this.cancel_edit());
        this.btn_copy_code.addEventListener('click', () => this.copy_code());
        this.btn_load_code.addEventListener('click', () => this.load_code());
        this.btn_save_code.addEventListener('click', () => this.save_code_to_file());
        this.btn_copy_preview_css.addEventListener('click', () => this.copy_preview_css());
        this.btn_apply_preview_css.addEventListener('click', () => this.apply_preview_css());
        this.btn_load_preview_css.addEventListener('click', () => this.load_preview_css());
        this.btn_open_css_editor.addEventListener('click', () => this.open_css_editor_for_object());
        this.btn_preview_css.addEventListener('click', () => this.open_css_editor_for_preview());
        this.btn_separate_window.addEventListener('click', () => this.open_separate_window());
        this.btn_grid_config.addEventListener('click', () => this.show_grid_config_modal());
        this.close_message_btn.addEventListener('click', () => this.hide_message());
    }
    // #endregion

    // #region message_methods
    show_message(text, type = 'info') {
        if (!this.message_box || !this.message_text) return;
        this.message_text.textContent = text;
        this.message_box.className = `tester_message_box ${type === 'error' ? 'tester_message_box_error' : (type === 'warning' ? 'tester_message_box_warning' : '')}`;
        this.message_box.classList.remove('tester_message_box_hidden');
        if (this.message_timeout) clearTimeout(this.message_timeout);
        this.message_timeout = setTimeout(() => this.hide_message(), 15000);
    }

    hide_message() {
        if (this.message_box) this.message_box.classList.add('tester_message_box_hidden');
    }
    // #endregion

    // #region css_editor_methods
    init_css_editor() {
        if (typeof CSSEditor === 'undefined') {
            this.show_message('CSS Editor not loaded', 'error');
            return;
        }
        
        this.css_editor = new CSSEditor({
            onApply: (css_text, target) => {
                if (target === this.preview_grid) {
                    this.preview_grid.style.cssText = css_text;
                    this.preview_css_textarea.value = css_text;
                } else if (target && this.editing_index !== null) {
                    const obj = this.objects[this.editing_index];
                    if (obj && obj.element === target) {
                        obj.params.style = css_text;
                        obj.element.style.cssText = css_text;
                        this.refresh_code_display();
                        this.refresh_object_list();
                    }
                } else if (target && target !== this.preview_grid) {
                    target.style.cssText = css_text;
                }
                this.show_message('CSS applied successfully', 'info');
            }
        });
    }

    open_css_editor_for_object() {
        if (this.editing_index !== null) {
            const obj = this.objects[this.editing_index];
            this.css_editor.open(obj.element, (css_text) => {
                obj.params.style = css_text;
                obj.element.style.cssText = css_text;
                this.refresh_code_display();
                this.refresh_object_list();
                this.show_message('CSS applied to selected object', 'info');
            });
        } else {
            this.open_css_editor_for_new_object();
        }
    }

    open_css_editor_for_new_object() {
        // Check if obj_text exists before accessing value
        let sample_text = this.obj_text ? (this.obj_text.value || 'Sample Text') : 'Sample Text';
        let temp_preview = document.createElement('div');
        temp_preview.textContent = sample_text;
        temp_preview.style.padding = '10px';
        temp_preview.style.border = '1px solid #ccc';
        
        this.css_editor.open(temp_preview, (css_text) => {
            this.pending_css = css_text;
            this.show_message('CSS will be applied when you add the object', 'info');
        });
    }

    open_css_editor_for_preview() {
        if (this.css_editor) {
            this.css_editor.open(this.preview_grid, (css_text) => {
                this.preview_grid.style.cssText = css_text;
                this.preview_css_textarea.value = css_text;
            });
        }
    }
    // #endregion

    // #region grid_config_methods
    init_grid_config_modal() {
        this.grid_config_modal = document.getElementById('gridConfigModal');
        if (!this.grid_config_modal) return;
        
        this.grid_config_content = document.getElementById('gridConfigContent');
        this.btn_apply_grid_config = document.getElementById('btnApplyGridConfig');
        this.close_grid_modal = this.grid_config_modal.querySelector('.tester_modal_close');
        
        if (this.btn_apply_grid_config) {
            this.btn_apply_grid_config.onclick = () => this.apply_grid_weights();
        }
        if (this.close_grid_modal) {
            this.close_grid_modal.onclick = () => this.grid_config_modal.style.display = 'none';
        }
        
        window.onclick = (event) => {
            if (event.target === this.grid_config_modal) this.grid_config_modal.style.display = 'none';
        };
    }

    show_grid_config_modal() {
        if (!this.grid_config_modal) return;
        
        let max_row = this.oc._get_max_row(this.preview_grid);
        let max_col = this.oc._get_max_col(this.preview_grid);
        let rows = max_row || 1;
        let cols = max_col || 1;
        let html = '<table class="tester_weight_table"><thead>佛<th>Row</th><th>Weight</th><th>Column</th><th>Weight</th> </thead><tbody>';
        
        for (let i = 0; i < rows; i++) {
            let row_weight = (this.preview_grid._gridRows && this.preview_grid._gridRows[i]) ? this.preview_grid._gridRows[i].weight : 0;
            html += `<tr><td>${i + 1}</td><td><input type="number" id="rowWeight_${i}" value="${row_weight}" step="0.1" min="0" class="tester_weight_table_input"></td>`;
            if (i < cols) {
                let col_weight = (this.preview_grid._gridColumns && this.preview_grid._gridColumns[i]) ? this.preview_grid._gridColumns[i].weight : 0;
                html += `<td>${i + 1}</td><td><input type="number" id="colWeight_${i}" value="${col_weight}" step="0.1" min="0" class="tester_weight_table_input"></td>`;
            } else {
                html += `<td></td><td></td>`;
            }
            html += `</tr>`;
        }
        
        for (let i = rows; i < cols; i++) {
            let col_weight = (this.preview_grid._gridColumns && this.preview_grid._gridColumns[i]) ? this.preview_grid._gridColumns[i].weight : 0;
            html += `<tr><td>${i + 1}</td><td><input type="number" id="rowWeight_${i}" value="0" step="0.1" min="0" class="tester_weight_table_input"></td>
                       <td>${i + 1}</td><td><input type="number" id="colWeight_${i}" value="${col_weight}" step="0.1" min="0" class="tester_weight_table_input"></td></tr>`;
        }
        
        html += '</tbody></table>';
        this.grid_config_content.innerHTML = html;
        this.grid_config_modal.style.display = 'block';
    }

    apply_grid_weights() {
        if (!this.grid_config_content) return;
        
        let max_row = this.oc._get_max_row(this.preview_grid);
        let max_col = this.oc._get_max_col(this.preview_grid);
        let rows = max_row || 1;
        let cols = max_col || 1;
        
        for (let i = 0; i < rows; i++) {
            let weight_input = document.getElementById(`rowWeight_${i}`);
            if (weight_input) {
                let row_weight = parseFloat(weight_input.value) || 0;
                if (row_weight > 0) this.oc.configure_row(this.preview_grid, i + 1, { weight: row_weight });
            }
        }
        
        for (let i = 0; i < cols; i++) {
            let weight_input = document.getElementById(`colWeight_${i}`);
            if (weight_input) {
                let col_weight = parseFloat(weight_input.value) || 0;
                if (col_weight > 0) this.oc.configure_column(this.preview_grid, i + 1, { weight: col_weight });
            }
        }
        
        this.grid_config_modal.style.display = 'none';
        this.show_message('Grid weights applied', 'info');
    }
    // #endregion

    // #region object_operations_methods
    add_object_from_form() {
        if (!this.parent_select || !this.tag_select) {
            this.show_message('Form elements not found', 'error');
            return;
        }
        
        // Check each form element and report which one is missing
        const required_elements = {
            obj_id: this.obj_id,
            obj_class: this.obj_class,
            obj_text: this.obj_text,
            obj_row: this.obj_row,
            obj_col: this.obj_col,
            obj_row_span: this.obj_row_span,
            obj_col_span: this.obj_col_span,
            padx: this.padx,
            pady: this.pady,
            ipadx: this.ipadx,
            ipady: this.ipady,
            sticky_n: this.sticky_n,
            sticky_s: this.sticky_s,
            sticky_e: this.sticky_e,
            sticky_w: this.sticky_w
        };
        
        for (let [name, element] of Object.entries(required_elements)) {
            if (!element) {
                this.show_message(`Form element missing: ${name}`, 'error');
                return;
            }
        }
        
        let parent_value = this.parent_select.value;
        let parent_el = parent_value === 'preview' ? this.preview_grid : document.getElementById(parent_value);
        
        if (!parent_el) {
            this.show_message('Selected parent not found', 'error');
            return;
        }

        let tag = this.tag_select.value;
        let id = this.obj_id.value || this.generate_id(tag);
        let class_name = this.obj_class.value || undefined;
        let text = this.obj_text.value || undefined;
        let row = parseInt(this.obj_row.value) || 1;
        let col = parseInt(this.obj_col.value) || 1;
        let row_span = this.obj_row_span.value ? parseInt(this.obj_row_span.value) : undefined;
        let col_span = this.obj_col_span.value ? parseInt(this.obj_col_span.value) : undefined;
        let sticky = this.get_sticky_string();
        let padx = this.padx.value ? parseInt(this.padx.value) : undefined;
        let pady = this.pady.value ? parseInt(this.pady.value) : undefined;
        let ipadx = this.ipadx.value ? parseInt(this.ipadx.value) : undefined;
        let ipady = this.ipady.value ? parseInt(this.ipady.value) : undefined;

        let params = {
            parent: parent_el,
            row: row,
            col: col,
            sticky: sticky,
            rowSpan: row_span,
            colSpan: col_span,
            id: id,
            class_name: class_name,
            style: this.pending_css || '',
            padx: padx,
            pady: pady,
            ipadx: ipadx,
            ipady: ipady
        };
        
        if (text !== undefined) {
            if (tag === 'input') {
                params.value = text;
            } else {
                params.text = text;
            }
        }

        let element;
        let method_name;
        
        if (tag === 'button') {
            element = this.oc.button(params);
            method_name = 'button';
        } else if (tag === 'input') {
            element = this.oc.input(params);
            method_name = 'input';
        } else if (tag === 'label') {
            element = this.oc.label(params);
            method_name = 'label';
        } else if (tag === 'collapsible') {
            element = this.create_collapsible(params, text);
            method_name = 'object_generate';
        } else if (tag === 'tabs') {
            element = this.create_tabs(params, text);
            method_name = 'object_generate';
        } else {
            element = this.oc.object_generate(tag, params);
            method_name = 'object_generate';
        }

        if (tag === 'div' || tag === 'collapsible' || tag === 'tabs') {
            this.container_elements.push(element);
            this.refresh_parent_dropdown();
        }

        this.objects.push({ element, params, method_name, tag });
        this.pending_css = null;
        this.refresh_object_list();
        this.refresh_code_display();
        this.show_message(`Object "${id}" added successfully`, 'info');
    }

    generate_id(tag) {
        let prefix = tag === 'input' ? 'inp' : (tag === 'button' ? 'btn' : (tag === 'div' ? 'div' : 'obj'));
        return `${prefix}_${String(this.counter++).padStart(3, '0')}`;
    }

    create_collapsible(params, text) {
        let container = document.createElement('div');
        container.id = params.id;
        container.className = params.class_name || '';
        if (params.style) container.style.cssText = params.style;
        if (params.padx) container.style.marginLeft = params.padx + 'px';
        if (params.pady) container.style.marginTop = params.pady + 'px';
        if (params.ipadx) container.style.paddingLeft = params.ipadx + 'px';
        if (params.ipady) container.style.paddingTop = params.ipady + 'px';

        let header = document.createElement('div');
        header.textContent = text || 'Collapsible';
        header.style.cursor = 'pointer';
        header.style.backgroundColor = '#f1f1f1';
        header.style.padding = '10px';
        header.style.border = '1px solid #ccc';
        
        let content = document.createElement('div');
        content.style.padding = '10px';
        content.style.display = 'none';
        content.style.border = '1px solid #ccc';
        content.style.borderTop = 'none';
        
        header.onclick = () => {
            let is_visible = content.style.display !== 'none';
            content.style.display = is_visible ? 'none' : 'block';
        };
        
        container.appendChild(header);
        container.appendChild(content);
        this.oc._handle_grid_placement(params.parent, container, params.row, params.col, params.sticky, params.rowSpan, params.colSpan);
        return container;
    }

    create_tabs(params, text) {
        let container = document.createElement('div');
        container.id = params.id;
        container.className = params.class_name || '';
        if (params.style) container.style.cssText = params.style;
        if (params.padx) container.style.marginLeft = params.padx + 'px';
        if (params.pady) container.style.marginTop = params.pady + 'px';
        if (params.ipadx) container.style.paddingLeft = params.ipadx + 'px';
        if (params.ipady) container.style.paddingTop = params.ipady + 'px';

        let tab_headers = document.createElement('div');
        tab_headers.style.display = 'flex';
        tab_headers.style.borderBottom = '1px solid #ccc';
        
        let tab_content = document.createElement('div');
        tab_content.style.padding = '10px';
        tab_content.style.border = '1px solid #ccc';
        tab_content.style.borderTop = 'none';

        let tabs = text && text.includes(',') ? text.split(',').map(t => t.trim()) : ['Tab 1', 'Tab 2'];
        let active = 0;
        
        for (let i = 0; i < tabs.length; i++) {
            let tab = document.createElement('div');
            tab.textContent = tabs[i];
            tab.style.padding = '10px';
            tab.style.cursor = 'pointer';
            tab.style.backgroundColor = i === active ? '#fff' : '#f1f1f1';
            tab.style.border = '1px solid #ccc';
            tab.style.borderBottom = 'none';
            tab.style.marginRight = '2px';
            tab.onclick = () => {
                for (let t of tab_headers.children) t.style.backgroundColor = '#f1f1f1';
                tab.style.backgroundColor = '#fff';
                tab_content.textContent = `Content for ${tabs[i]}`;
            };
            tab_headers.appendChild(tab);
        }
        
        container.appendChild(tab_headers);
        container.appendChild(tab_content);
        tab_content.textContent = 'Content for Tab 1';
        this.oc._handle_grid_placement(params.parent, container, params.row, params.col, params.sticky, params.rowSpan, params.colSpan);
        return container;
    }

    save_edit() {
        if (this.editing_index === null) return;
        
        let old_obj = this.objects[this.editing_index];
        this.oc.remove_widget(old_obj.element);
        
        if (old_obj.tag === 'div' || old_obj.tag === 'collapsible' || old_obj.tag === 'tabs') {
            let idx = this.container_elements.indexOf(old_obj.element);
            if (idx !== -1) this.container_elements.splice(idx, 1);
        }
        
        this.objects.splice(this.editing_index, 1);
        this.add_object_from_form();
        this.editing_index = null;
        this.btn_add_object.style.display = 'inline-block';
        this.btn_save_edit.style.display = 'none';
        this.btn_cancel_edit.style.display = 'none';
        this.clear_form();
        this.show_message('Object updated', 'info');
    }

    cancel_edit() {
        this.editing_index = null;
        this.btn_add_object.style.display = 'inline-block';
        this.btn_save_edit.style.display = 'none';
        this.btn_cancel_edit.style.display = 'none';
        this.clear_form();
        this.pending_css = null;
        this.show_message('Edit cancelled', 'info');
    }

    edit_object(index) {
        let obj = this.objects[index];
        this.editing_index = index;
        this.tag_select.value = obj.tag;
        this.parent_select.value = this.get_parent_value(obj.params.parent);
        this.obj_id.value = obj.params.id || '';
        this.obj_class.value = obj.params.class_name || '';
        this.obj_text.value = (obj.params.text !== undefined ? obj.params.text : (obj.params.value !== undefined ? obj.params.value : ''));
        this.obj_row.value = obj.params.row || 1;
        this.obj_col.value = obj.params.col || 1;
        this.obj_row_span.value = obj.params.rowSpan || '';
        this.obj_col_span.value = obj.params.colSpan || '';
        this.padx.value = obj.params.padx !== undefined ? obj.params.padx : '';
        this.pady.value = obj.params.pady !== undefined ? obj.params.pady : '';
        this.ipadx.value = obj.params.ipadx !== undefined ? obj.params.ipadx : '';
        this.ipady.value = obj.params.ipady !== undefined ? obj.params.ipady : '';
        
        let sticky = obj.params.sticky || '';
        this.sticky_n.checked = sticky.includes('n');
        this.sticky_s.checked = sticky.includes('s');
        this.sticky_e.checked = sticky.includes('e');
        this.sticky_w.checked = sticky.includes('w');

        this.btn_add_object.style.display = 'none';
        this.btn_save_edit.style.display = 'inline-block';
        this.btn_cancel_edit.style.display = 'inline-block';
    }

    remove_last_widget() {
        if (!this.preview_grid.lastElementChild) return;
        
        let last = this.preview_grid.lastElementChild;
        if (last) {
            this.oc.remove_widget(last);
            let index = this.objects.findIndex(obj => obj.element === last);
            if (index !== -1) {
                if (this.objects[index].tag === 'div' || this.objects[index].tag === 'collapsible' || this.objects[index].tag === 'tabs') {
                    let idx = this.container_elements.indexOf(last);
                    if (idx !== -1) this.container_elements.splice(idx, 1);
                }
                this.objects.splice(index, 1);
            }
            this.refresh_parent_dropdown();
            this.refresh_object_list();
            this.refresh_code_display();
            this.show_message('Last widget removed', 'info');
        }
    }

    clear_preview() {
        while (this.preview_grid.firstChild) {
            this.preview_grid.removeChild(this.preview_grid.firstChild);
        }
        this.objects = [];
        this.container_elements = [this.preview_grid];
        this.refresh_parent_dropdown();
        this.refresh_object_list();
        this.refresh_code_display();
        this.preview_grid.style.gridTemplateColumns = '';
        this.preview_grid.style.gridTemplateRows = '';
        this.pending_css = null;
        this.show_message('Preview cleared', 'info');
    }
    // #endregion

    // #region code_operations_methods
    refresh_code_display() {
        let lines = [];
        
        for (let obj of this.objects) {
            let parent_ref = this.get_parent_reference(obj.params.parent);
            let params = { ...obj.params };
            delete params.parent;
            
            let param_strings = [];
            param_strings.push(`parent: ${parent_ref}`);
            if (params.row !== undefined) param_strings.push(`row: ${params.row}`);
            if (params.col !== undefined) param_strings.push(`col: ${params.col}`);
            if (params.sticky) param_strings.push(`sticky: '${params.sticky}'`);
            if (params.rowSpan) param_strings.push(`rowSpan: ${params.rowSpan}`);
            if (params.colSpan) param_strings.push(`colSpan: ${params.colSpan}`);
            if (params.id) param_strings.push(`id: '${params.id}'`);
            if (params.class_name) param_strings.push(`class_name: '${params.class_name}'`);
            if (params.style) param_strings.push(`style: '${params.style}'`);
            if (params.text !== undefined) param_strings.push(`text: '${params.text}'`);
            if (params.value !== undefined) param_strings.push(`value: '${params.value}'`);
            if (params.padx !== undefined) param_strings.push(`padx: ${params.padx}`);
            if (params.pady !== undefined) param_strings.push(`pady: ${params.pady}`);
            if (params.ipadx !== undefined) param_strings.push(`ipadx: ${params.ipadx}`);
            if (params.ipady !== undefined) param_strings.push(`ipady: ${params.ipady}`);

            let method = obj.method_name;
            
            if (obj.tag === 'div' && method === 'object_generate') {
                lines.push(`oc.object_generate('div', { ${param_strings.join(', ')} });`);
            } else if (obj.tag === 'collapsible' || obj.tag === 'tabs') {
                lines.push(`// Custom widget: ${obj.tag} - see implementation in Tester.js`);
            } else {
                lines.push(`oc.${method}({ ${param_strings.join(', ')} });`);
            }
        }
        
        this.code_display.value = lines.join('\n');
    }

    copy_code() {
        let text = this.code_display.value;
        navigator.clipboard.writeText(text).then(() => {
            this.flash_button(this.btn_copy_code);
            this.show_message('Code copied to clipboard', 'info');
        });
    }

    load_code() {
        let code = this.code_display.value;
        if (!code.trim()) {
            this.show_message('No code to load', 'warning');
            return;
        }
        
        this.clear_preview();
        try {
            let fn = new Function('oc', 'document', code);
            fn(this.oc, document);
            this.sync_objects_from_dom();
            this.show_message('Code loaded successfully', 'info');
        } catch (e) {
            this.show_message('Error executing code: ' + e.message, 'error');
        }
    }

    save_code_to_file() {
        let text = this.code_display.value;
        let blob = new Blob([text], { type: 'text/javascript' });
        let url = URL.createObjectURL(blob);
        let a = document.createElement('a');
        a.href = url;
        a.download = 'object_creator_code.js';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.show_message('Code saved to file', 'info');
    }
    // #endregion

    // #region preview_css_operations_methods
    copy_preview_css() {
        let text = this.preview_css_textarea.value;
        navigator.clipboard.writeText(text).then(() => {
            this.flash_button(this.btn_copy_preview_css);
            this.show_message('Preview CSS copied', 'info');
        });
    }

    apply_preview_css() {
        let css = this.preview_css_textarea.value;
        this.preview_grid.style.cssText = css;
        this.show_message('Preview CSS applied', 'info');
    }

    load_preview_css() {
        let css = this.preview_grid.style.cssText;
        this.preview_css_textarea.value = css;
        this.flash_button(this.btn_load_preview_css);
        this.show_message('Preview CSS loaded from preview', 'info');
    }
    // #endregion

    // #region separate_window_method
    open_separate_window() {
        let win = window.open('', '_blank', 'width=800,height=600,resizable=yes');
        if (!win) {
            this.show_message('Popup blocked. Please allow popups for this site.', 'warning');
            return;
        }
        
        let style = this.preview_grid.style.cssText;
        let inner_html = this.preview_grid.innerHTML;
        
        win.document.write(`
            <html>
            <head><title>Preview - Separate Window</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { padding: 20px; background: #f0f0f0; height: 100vh; }
                .preview-grid {
                    background: #f0f0f0;
                    border: 2px solid #ddd;
                    border-radius: 4px;
                    padding: 10px;
                    min-height: 100%;
                    resize: both;
                    overflow: auto;
                }
                .preview-grid > * {
                    border: 1px solid #999;
                    background: rgba(255,255,255,0.9);
                    padding: 8px;
                    border-radius: 3px;
                }
            </style>
            </head>
            <body>
                <div id="previewGridClone" class="preview-grid" style="${style}">${inner_html}</div>
                <script>
                    const original = parent.document.getElementById('previewGrid');
                    const clone = document.getElementById('previewGridClone');
                    const children = clone.children;
                    for (let i = 0; i < children.length; i++) {
                        if (original.children[i]) {
                            children[i].style.cssText = original.children[i].style.cssText;
                        }
                    }
                <\/script>
            </body>
            </html>
        `);
        win.document.close();
        this.show_message('Separate window opened', 'info');
    }
    // #endregion

    // #region utility_methods
    refresh_parent_dropdown() {
        let current_val = this.parent_select.value;
        this.parent_select.innerHTML = '';
        
        let opt = document.createElement('option');
        opt.value = 'preview';
        opt.textContent = 'Preview Area';
        this.parent_select.appendChild(opt);

        for (let el of this.container_elements) {
            if (el === this.preview_grid) continue;
            
            if (el.id) {
                let opt = document.createElement('option');
                opt.value = el.id;
                opt.textContent = `Div: ${el.id}`;
                this.parent_select.appendChild(opt);
            } else {
                if (!el._tempId) {
                    el._tempId = 'container_' + Math.random().toString(36).substr(2, 9);
                }
                let opt = document.createElement('option');
                opt.value = el._tempId;
                opt.textContent = 'Div (no id)';
                this.parent_select.appendChild(opt);
            }
        }
        
        if (current_val && Array.from(this.parent_select.options).some(opt => opt.value === current_val)) {
            this.parent_select.value = current_val;
        }
    }

    refresh_object_list() {
        this.object_list_div.innerHTML = '';
        
        if (this.objects.length === 0) {
            this.object_list_div.innerHTML = '<div style="color: #999; text-align: center; padding: 20px;">No objects created yet</div>';
            return;
        }
        
        for (let i = 0; i < this.objects.length; i++) {
            let obj = this.objects[i];
            let div = document.createElement('div');
            div.className = 'tester_object_item';
            let info = `${obj.tag} (${obj.params.id || 'no id'}) - row:${obj.params.row}, col:${obj.params.col}`;
            div.appendChild(document.createTextNode(info));

            let btn_edit = document.createElement('button');
            btn_edit.textContent = 'Edit';
            btn_edit.className = 'tester_object_item_button';
            btn_edit.addEventListener('click', () => this.edit_object(i));
            div.appendChild(btn_edit);

            let btn_delete = document.createElement('button');
            btn_delete.textContent = 'Delete';
            btn_delete.className = 'tester_object_item_button tester_button_danger';
            btn_delete.addEventListener('click', () => {
                this.oc.remove_widget(obj.element);
                if (obj.tag === 'div' || obj.tag === 'collapsible' || obj.tag === 'tabs') {
                    let idx = this.container_elements.indexOf(obj.element);
                    if (idx !== -1) this.container_elements.splice(idx, 1);
                }
                this.objects.splice(i, 1);
                this.refresh_parent_dropdown();
                this.refresh_object_list();
                this.refresh_code_display();
                this.show_message(`Object "${obj.params.id}" deleted`, 'info');
            });
            div.appendChild(btn_delete);
            this.object_list_div.appendChild(div);
        }
    }

    sync_objects_from_dom() {
        this.objects = [];
        this.container_elements = [this.preview_grid];
        
        for (let child of this.preview_grid.children) {
            let tag = child.tagName.toLowerCase();
            let method_name = tag === 'button' ? 'button' : (tag === 'input' ? 'input' : (tag === 'span' ? 'label' : 'object_generate'));
            let params = {
                parent: this.preview_grid,
                row: parseInt(child.style.gridRowStart) || 1,
                col: parseInt(child.style.gridColumnStart) || 1,
                sticky: this.get_sticky_from_style(child),
                rowSpan: this.get_span(child, 'row'),
                colSpan: this.get_span(child, 'col'),
                id: child.id || undefined,
                class_name: child.className || undefined,
                style: child.style.cssText || undefined,
                text: child.textContent || undefined,
                value: child.value || undefined
            };
            
            if (tag === 'div' || tag === 'collapsible' || tag === 'tabs') {
                this.container_elements.push(child);
            }
            
            this.objects.push({ element: child, params, method_name, tag });
        }
        
        this.refresh_parent_dropdown();
        this.refresh_object_list();
        this.refresh_code_display();
    }

    get_sticky_from_style(el) {
        let justify = el.style.justifySelf;
        let align = el.style.alignSelf;
        let sticky = '';
        
        if (justify === 'stretch') sticky += 'ew';
        else if (justify === 'end') sticky += 'e';
        else if (justify === 'start') sticky += 'w';
        
        if (align === 'stretch') sticky += 'ns';
        else if (align === 'start') sticky += 'n';
        else if (align === 'end') sticky += 's';
        
        return sticky;
    }

    get_span(el, axis) {
        let span_prop = axis === 'row' ? 'gridRowEnd' : 'gridColumnEnd';
        let span = el.style[span_prop];
        if (span && span.startsWith('span')) {
            return parseInt(span.split(' ')[1]);
        }
        return undefined;
    }

    clear_form() {
        this.obj_id.value = '';
        this.obj_class.value = '';
        this.obj_text.value = '';
        this.obj_row.value = 1;
        this.obj_col.value = 1;
        this.obj_row_span.value = '';
        this.obj_col_span.value = '';
        this.padx.value = '';
        this.pady.value = '';
        this.ipadx.value = '';
        this.ipady.value = '';
        this.sticky_n.checked = false;
        this.sticky_s.checked = false;
        this.sticky_e.checked = false;
        this.sticky_w.checked = false;
        this.tag_select.value = 'button';
        this.parent_select.value = 'preview';
    }

    get_parent_value(parent_el) {
        if (parent_el === this.preview_grid) return 'preview';
        if (parent_el.id) return parent_el.id;
        if (parent_el._tempId) return parent_el._tempId;
        return 'preview';
    }

    get_sticky_string() {
        let parts = [];
        if (this.sticky_n.checked) parts.push('n');
        if (this.sticky_s.checked) parts.push('s');
        if (this.sticky_e.checked) parts.push('e');
        if (this.sticky_w.checked) parts.push('w');
        return parts.join('');
    }

    get_parent_reference(parent_el) {
        if (parent_el === this.preview_grid) {
            return 'document.getElementById(\'previewGrid\')';
        } else if (parent_el.id) {
            return `document.getElementById('${parent_el.id}')`;
        } else if (parent_el._tempId) {
            return '/* parent element without id */ null';
        }
        return '/* unknown parent */ null';
    }

    flash_button(btn) {
        if (!btn) return;
        btn.classList.add('tester_flash');
        setTimeout(() => { btn.classList.remove('tester_flash'); }, 200);
    }
    // #endregion
}

document.addEventListener('DOMContentLoaded', () => {
    window.tester = new Tester();
});