/**
 * Tester.js
 * Interactive object creator for grid-based UI components.
 * Builds its own UI using ObjectCreator and provides complete widget management.
 */
class Tester {
    constructor() {
        this.oc = document.oc;
        this.objects = [];
        this.container_elements = [];
        this.editing_index = null;
        this.counter = 1;
        this.message_timeout = null;
        this.css_editor = null;
        this.pending_css = null;
        this.initUI();
    }

    // #region ui_construction
    initUI() {
        // Main container
        const mainContainer = this.oc.object_generate('div', {
            parent: document.body,
            id: 'mainContainer',
            class_name: 'main_container'
        });

        // Left panel: Object Creator
        const leftPanel = this.oc.object_generate('div', {
            parent: mainContainer,
            class_name: 'tester_object_creator_panel'
        });
        const generatorSection = this.oc.object_generate('div', {
            parent: leftPanel,
            class_name: 'tester_generator_section'
        });

        // Header with grid config button
        const headerDiv = this.oc.object_generate('div', {
            parent: generatorSection,
            class_name: 'tester_header_with_icon'
        });
        this.oc.object_generate('h2', { parent: headerDiv, text: 'Object Generator' });
        this.btnGridConfig = this.oc.object_generate('button', {
            parent: headerDiv,
            id: 'btnGridConfig',
            class_name: 'tester_icon_button',
            text: '⚙️',
            events: { click: () => this.showGridConfigModal() }
        });

        // Tag and Parent row
        const formRow = this.oc.object_generate('div', { parent: generatorSection, class_name: 'tester_form_row' });
        const tagGroup = this.oc.object_generate('div', { parent: formRow, class_name: 'tester_form_group' });
        this.oc.object_generate('label', { parent: tagGroup, class_name: 'tester_label', text: 'HTML Tag:', attributes: { for: 'tagSelect' } });
        this.tagSelect = this.oc.object_generate('select', { parent: tagGroup, id: 'tagSelect', class_name: 'tester_select' });
        const parentGroup = this.oc.object_generate('div', { parent: formRow, class_name: 'tester_form_group' });
        this.oc.object_generate('label', { parent: parentGroup, class_name: 'tester_label', text: 'Parent Container:', attributes: { for: 'parentSelect' } });
        this.parentSelect = this.oc.object_generate('select', { parent: parentGroup, id: 'parentSelect', class_name: 'tester_select' });

        // ID and Class
        const idClassLabels = this.oc.object_generate('div', { parent: generatorSection, class_name: 'tester_form_row' });
        this.oc.object_generate('div', { parent: idClassLabels, text: 'ID:', attributes: { class: 'tester_label' } });
        this.oc.object_generate('div', { parent: idClassLabels, text: 'Class Name:', attributes: { class: 'tester_label' } });
        const idClassInputs = this.oc.object_generate('div', { parent: generatorSection, class_name: 'tester_form_row' });
        this.objId = this.oc.object_generate('input', { parent: idClassInputs, id: 'objId', class_name: 'tester_input', attributes: { type: 'text', placeholder: 'element_id' } });
        this.objClass = this.oc.object_generate('input', { parent: idClassInputs, id: 'objClass', class_name: 'tester_input', attributes: { type: 'text', placeholder: 'css_class' } });

        // Grid Position
        const gridRow = this.oc.object_generate('div', { parent: generatorSection, class_name: 'tester_form_row_4' });
        this.objRow = this._createNumberField(gridRow, 'Row (1‑based):', 'objRow', 1);
        this.objCol = this._createNumberField(gridRow, 'Column (1‑based):', 'objCol', 1);
        this.objRowSpan = this._createNumberField(gridRow, 'Row Span:', 'objRowSpan');
        this.objColSpan = this._createNumberField(gridRow, 'Column Span:', 'objColSpan');

        // Padding/Margin
        const padRow = this.oc.object_generate('div', { parent: generatorSection, class_name: 'tester_form_row_4' });
        this.padx = this._createNumberField(padRow, 'Pad X (margin):', 'padx', 0);
        this.pady = this._createNumberField(padRow, 'Pad Y (margin):', 'pady', 0);
        this.ipadx = this._createNumberField(padRow, 'Internal Pad X (padding):', 'ipadx', 0);
        this.ipady = this._createNumberField(padRow, 'Internal Pad Y (padding):', 'ipady', 0);

        // Sticky and CSS Editor
        const stickyRow = this.oc.object_generate('div', { parent: generatorSection, attributes: { style: 'display: flex; align-items: center; justify-content: space-between; gap: 10px;' } });
        const stickyGroup = this.oc.object_generate('div', { parent: stickyRow, class_name: 'tester_form_group', attributes: { style: 'flex: 1;' } });
        this.oc.object_generate('label', { parent: stickyGroup, class_name: 'tester_label', text: 'Sticky (like Tkinter):' });
        const stickyInner = this.oc.object_generate('div', { parent: stickyGroup, class_name: 'tester_sticky_group' });
        this.stickyN = this._createCheckbox(stickyInner, 'N');
        this.stickyS = this._createCheckbox(stickyInner, 'S');
        this.stickyE = this._createCheckbox(stickyInner, 'E');
        this.stickyW = this._createCheckbox(stickyInner, 'W');
        this.btnOpenCssEditor = this.oc.object_generate('button', {
            parent: stickyRow,
            id: 'btnOpenCssEditor',
            class_name: 'tester_button_secondary',
            text: '🎨 CSS Editor',
            attributes: { style: 'margin-bottom: 0;' },
            events: { click: () => this.openCssEditorForObject() }
        });

        // Action buttons
        const actionRow = this.oc.object_generate('div', { parent: generatorSection, attributes: { style: 'margin-top: 15px;' } });
        this.btnAddObject = this.oc.object_generate('button', {
            parent: actionRow,
            id: 'btnAddObject',
            class_name: 'tester_button_secondary',
            text: '➕ Add Object',
            events: { click: () => this.addObjectFromForm() }
        });
        this.btnSaveEdit = this.oc.object_generate('button', {
            parent: actionRow,
            id: 'btnSaveEdit',
            class_name: 'tester_button_secondary',
            text: '💾 Save Changes',
            attributes: { style: 'display:none;' },
            events: { click: () => this.saveEdit() }
        });
        this.btnCancelEdit = this.oc.object_generate('button', {
            parent: actionRow,
            id: 'btnCancelEdit',
            class_name: 'tester_button_danger',
            text: '❌ Cancel Edit',
            attributes: { style: 'display:none;' },
            events: { click: () => this.cancelEdit() }
        });

        // Right panel: Layout Test
        const rightPanel = this.oc.object_generate('div', { parent: mainContainer, class_name: 'tester_layout_test_panel' });

        // Preview section
        const previewSection = this.oc.object_generate('div', { parent: rightPanel, class_name: 'tester_preview_section' });
        const previewHeader = this.oc.object_generate('div', { parent: previewSection, class_name: 'tester_header_with_icon' });
        this.oc.object_generate('h2', { parent: previewHeader, text: '📐 Visual Preview' });
        const previewButtons = this.oc.object_generate('div', { parent: previewHeader, attributes: { style: 'display: flex; gap: 10px;' } });
        this.btnPreviewCss = this.oc.object_generate('button', {
            parent: previewButtons,
            id: 'btnPreviewCss',
            class_name: 'tester_icon_button',
            text: '🎨',
            attributes: { title: 'Edit Preview CSS' },
            events: { click: () => this.openCssEditorForPreview() }
        });
        this.btnSeparateWindow = this.oc.object_generate('button', {
            parent: previewButtons,
            id: 'btnSeparateWindow',
            class_name: 'tester_icon_button',
            text: '🔍',
            attributes: { title: 'Open preview in separate window' },
            events: { click: () => this.openSeparateWindow() }
        });
        this.previewGrid = this.oc.object_generate('div', { parent: previewSection, id: 'previewGrid', class_name: 'tester_preview_grid' });
        this.container_elements = [this.previewGrid];

        // Object list section
        const objectListSection = this.oc.object_generate('div', { parent: rightPanel, class_name: 'tester_object_list_section' });
        this.oc.object_generate('h2', { parent: objectListSection, text: '📋 Object Selector' });
        this.objectListDiv = this.oc.object_generate('div', { parent: objectListSection, id: 'objectList' });

        // Code section
        const codeSection = this.oc.object_generate('div', { parent: rightPanel, class_name: 'tester_code_section' });
        this.oc.object_generate('h2', { parent: codeSection, text: '💻 Generated Code', attributes: { style: 'color: #f8f8f2; border-bottom-color: #555;' } });
        const codeToolbar = this.oc.object_generate('div', { parent: codeSection, class_name: 'tester_code_toolbar' });
        this.btnCopyCode = this.oc.object_generate('button', {
            parent: codeToolbar,
            id: 'btnCopyCode',
            class_name: 'tester_button',
            text: '📋 Copy Code',
            events: { click: () => this.copyCode() }
        });
        this.btnLoadCode = this.oc.object_generate('button', {
            parent: codeToolbar,
            id: 'btnLoadCode',
            class_name: 'tester_button',
            text: '▶️ Load Code',
            events: { click: () => this.loadCode() }
        });
        this.btnSaveCode = this.oc.object_generate('button', {
            parent: codeToolbar,
            id: 'btnSaveCode',
            class_name: 'tester_button',
            text: '💾 Save Code to File',
            events: { click: () => this.saveCodeToFile() }
        });
        this.codeDisplay = this.oc.object_generate('textarea', {
            parent: codeSection,
            id: 'codeDisplay',
            class_name: 'tester_code_display',
            attributes: { rows: '6', style: 'font-family: monospace; background: #1e1e1e; color: #d4d4d4; width: 100%; resize: vertical;' }
        });

        // Preview Grid CSS Editor
        const cssTab = this.oc.object_generate('div', { parent: codeSection, class_name: 'tester_css_tab' });
        this.oc.object_generate('h3', { parent: cssTab, text: 'Preview Grid CSS', attributes: { style: 'color: #ddd;' } });
        this.previewCssTextarea = this.oc.object_generate('textarea', {
            parent: cssTab,
            id: 'previewCss',
            class_name: 'tester_css_tab_textarea',
            attributes: { rows: '4', placeholder: 'Custom CSS for the preview grid container...' }
        });
        const cssToolbar = this.oc.object_generate('div', { parent: cssTab, class_name: 'tester_code_toolbar', attributes: { style: 'margin-top: 5px;' } });
        this.btnCopyPreviewCss = this.oc.object_generate('button', {
            parent: cssToolbar,
            id: 'btnCopyPreviewCss',
            class_name: 'tester_button',
            text: '📋 Copy CSS',
            events: { click: () => this.copyPreviewCss() }
        });
        this.btnApplyPreviewCss = this.oc.object_generate('button', {
            parent: cssToolbar,
            id: 'btnApplyPreviewCss',
            class_name: 'tester_button',
            text: '✅ Apply CSS',
            events: { click: () => this.applyPreviewCss() }
        });
        this.btnLoadPreviewCss = this.oc.object_generate('button', {
            parent: cssToolbar,
            id: 'btnLoadPreviewCss',
            class_name: 'tester_button',
            text: '📂 Load CSS from Code',
            events: { click: () => this.loadPreviewCss() }
        });

        // Grid Config Modal
        this._createGridConfigModal();
        // CSS Editor Modal
        this._createCssEditorModal();
        // Message Box
        this._createMessageBox();

        // Populate tag select options
        const tags = ['button', 'input', 'label', 'div', 'p', 'textarea', 'select', 'span', 'collapsible', 'tabs'];
        for (let tag of tags) {
            let opt = document.createElement('option');
            opt.value = tag;
            opt.textContent = tag === 'collapsible' ? 'Collapsible Div' : (tag === 'tabs' ? 'Tabs Div' : tag);
            this.tagSelect.appendChild(opt);
        }

        // Initial parent dropdown
        this.refreshParentDropdown();

        // Initialize CSS Editor
        this.initCssEditor();
    }

    _createNumberField(parent, labelText, id, defaultValue = '') {
        let container = this.oc.object_generate('div', { parent: parent });
        this.oc.object_generate('label', { parent: container, class_name: 'tester_label', text: labelText, attributes: { for: id } });
        let input = this.oc.object_generate('input', { parent: container, id: id, class_name: 'tester_input', attributes: { type: 'number', value: defaultValue, step: '1' } });
        return input;
    }

    _createCheckbox(parent, labelText) {
        let label = this.oc.object_generate('label', { parent: parent, class_name: 'tester_sticky_group_label' });
        let input = this.oc.object_generate('input', { parent: label, class_name: 'tester_sticky_group_input', attributes: { type: 'checkbox' } });
        label.appendChild(document.createTextNode(' ' + labelText));
        return input;
    }

    _createGridConfigModal() {
        this.gridConfigModal = this.oc.object_generate('div', { parent: document.body, id: 'gridConfigModal', class_name: 'tester_modal', attributes: { style: 'display: none;' } });
        let modalContent = this.oc.object_generate('div', { parent: this.gridConfigModal, class_name: 'tester_modal_content' });
        let modalHeader = this.oc.object_generate('div', { parent: modalContent, class_name: 'tester_modal_header' });
        this.oc.object_generate('h2', { parent: modalHeader, text: 'Grid Configuration' });
        this.closeGridModal = this.oc.object_generate('span', { parent: modalHeader, class_name: 'tester_modal_close', text: '×' });
        this.gridConfigContent = this.oc.object_generate('div', { parent: modalContent, id: 'gridConfigContent' });
        this.btnApplyGridConfig = this.oc.object_generate('button', {
            parent: modalContent,
            id: 'btnApplyGridConfig',
            class_name: 'tester_button',
            text: 'Apply Weights',
            events: { click: () => this.applyGridWeights() }
        });
        this.closeGridModal.onclick = () => this.gridConfigModal.style.display = 'none';
        window.onclick = (event) => {
            if (event.target === this.gridConfigModal) this.gridConfigModal.style.display = 'none';
        };
    }

    _createCssEditorModal() {
        this.cssEditorModal = this.oc.object_generate('div', { parent: document.body, id: 'cssEditorModal', class_name: 'tester_css_editor_modal', attributes: { style: 'display: none;' } });
        let cssEditorContent = this.oc.object_generate('div', { parent: this.cssEditorModal, class_name: 'tester_css_editor_content' });
        let cssEditorHeader = this.oc.object_generate('div', { parent: cssEditorContent, class_name: 'tester_css_editor_header' });
        this.oc.object_generate('h2', { parent: cssEditorHeader, text: 'CSS Editor' });
        this.cssEditorSearch = this.oc.object_generate('input', { parent: cssEditorHeader, id: 'cssEditorSearch', class_name: 'tester_css_editor_search', attributes: { type: 'text', placeholder: 'Search...' } });
        this.closeCssEditor = this.oc.object_generate('span', { parent: cssEditorHeader, class_name: 'tester_modal_close', text: '×' });
        let cssEditorBody = this.oc.object_generate('div', { parent: cssEditorContent, class_name: 'tester_css_editor_body' });
        this.cssEditorSections = this.oc.object_generate('div', { parent: cssEditorBody, id: 'cssEditorSections', class_name: 'tester_css_editor_sections' });
        let cssEditorPreview = this.oc.object_generate('div', { parent: cssEditorBody, class_name: 'tester_css_editor_preview' });
        this.cssEditorPreview = this.oc.object_generate('div', { parent: cssEditorPreview, id: 'cssEditorPreview', class_name: 'tester_css_editor_preview_element', text: 'Sample Text' });
        this.oc.object_generate('div', { parent: cssEditorPreview, text: 'Live preview', attributes: { style: 'margin-top: 10px; font-size: 12px; color: #666;' } });
        let cssEditorFooter = this.oc.object_generate('div', { parent: cssEditorContent, class_name: 'tester_css_editor_footer' });
        this.cssEditorApply = this.oc.object_generate('button', { parent: cssEditorFooter, id: 'cssEditorApply', class_name: 'tester_button', text: 'Apply to Selected Object', events: { click: () => this.cssEditorApply() } });
        this.cssEditorCancel = this.oc.object_generate('button', { parent: cssEditorFooter, id: 'cssEditorCancel', class_name: 'tester_button_danger', text: 'Cancel', events: { click: () => this.closeCssEditorModal() } });
        this.closeCssEditor.onclick = () => this.closeCssEditorModal();
    }

    _createMessageBox() {
        this.messageBox = this.oc.object_generate('div', { parent: document.body, id: 'messageBox', class_name: 'tester_message_box tester_message_box_hidden' });
        this.messageText = this.oc.object_generate('span', { parent: this.messageBox, id: 'messageText' });
        this.closeMessageBtn = this.oc.object_generate('button', { parent: this.messageBox, id: 'closeMessage', class_name: 'tester_message_close', text: '×', events: { click: () => this.hideMessage() } });
    }
    // #endregion

    // #region message_methods
    showMessage(text, type = 'info') {
        if (!this.messageBox || !this.messageText) return;
        this.messageText.textContent = text;
        this.messageBox.className = `tester_message_box ${type === 'error' ? 'tester_message_box_error' : (type === 'warning' ? 'tester_message_box_warning' : '')}`;
        this.messageBox.classList.remove('tester_message_box_hidden');
        if (this.message_timeout) clearTimeout(this.message_timeout);
        this.message_timeout = setTimeout(() => this.hideMessage(), 15000);
    }

    hideMessage() {
        if (this.messageBox) this.messageBox.classList.add('tester_message_box_hidden');
    }
    // #endregion

    // #region css_editor
    initCssEditor() {
        if (typeof CSSEditor === 'undefined') {
            this.showMessage('CSS Editor not loaded', 'error');
            return;
        }
        this.cssEditor = new CSSEditor({
            onApply: (cssText, target) => {
                if (target === this.previewGrid) {
                    this.previewGrid.style.cssText = cssText;
                    this.previewCssTextarea.value = cssText;
                } else if (target && this.editing_index !== null) {
                    const obj = this.objects[this.editing_index];
                    if (obj && obj.element === target) {
                        obj.params.style = cssText;
                        obj.element.style.cssText = cssText;
                        this.refreshCodeDisplay();
                        this.refreshObjectList();
                    }
                } else if (target && target !== this.previewGrid) {
                    target.style.cssText = cssText;
                }
                this.showMessage('CSS applied successfully', 'info');
            }
        });
    }

    openCssEditorForObject() {
        if (this.editing_index !== null) {
            const obj = this.objects[this.editing_index];
            this.cssEditor.open(obj.element, (cssText) => {
                obj.params.style = cssText;
                obj.element.style.cssText = cssText;
                this.refreshCodeDisplay();
                this.refreshObjectList();
                this.showMessage('CSS applied to selected object', 'info');
            });
        } else {
            this.openCssEditorForNewObject();
        }
    }

    openCssEditorForNewObject() {
        let sampleText = this.objText ? (this.objText.value || 'Sample Text') : 'Sample Text';
        let tempPreview = document.createElement('div');
        tempPreview.textContent = sampleText;
        tempPreview.style.padding = '10px';
        tempPreview.style.border = '1px solid #ccc';
        this.cssEditor.open(tempPreview, (cssText) => {
            this.pendingCss = cssText;
            this.showMessage('CSS will be applied when you add the object', 'info');
        });
    }

    openCssEditorForPreview() {
        if (this.cssEditor) {
            this.cssEditor.open(this.previewGrid, (cssText) => {
                this.previewGrid.style.cssText = cssText;
                this.previewCssTextarea.value = cssText;
            });
        }
    }

    cssEditorApply() {
        // Handled by onApply in CSSEditor
    }

    closeCssEditorModal() {
        if (this.cssEditorModal) this.cssEditorModal.style.display = 'none';
    }
    // #endregion

    // #region grid_config
    showGridConfigModal() {
        if (!this.gridConfigModal) return;
        let maxRow = this.oc._get_max_row(this.previewGrid);
        let maxCol = this.oc._get_max_col(this.previewGrid);
        let rows = maxRow || 1;
        let cols = maxCol || 1;
        let html = '<table class="tester_weight_table"><thead> <th>Row</th><th>Weight</th><th>Column</th><th>Weight</th> </thead><tbody>';
        for (let i = 0; i < rows; i++) {
            let rowWeight = (this.previewGrid._gridRows && this.previewGrid._gridRows[i]) ? this.previewGrid._gridRows[i].weight : 0;
            html += `<tr><td>${i + 1}</td><td><input type="number" id="rowWeight_${i}" value="${rowWeight}" step="0.1" min="0" class="tester_weight_table_input"></td>`;
            if (i < cols) {
                let colWeight = (this.previewGrid._gridColumns && this.previewGrid._gridColumns[i]) ? this.previewGrid._gridColumns[i].weight : 0;
                html += `<td>${i + 1}</td><td><input type="number" id="colWeight_${i}" value="${colWeight}" step="0.1" min="0" class="tester_weight_table_input"></td>`;
            } else {
                html += `<td></td><td></td>`;
            }
            html += `</tr>`;
        }
        for (let i = rows; i < cols; i++) {
            let colWeight = (this.previewGrid._gridColumns && this.previewGrid._gridColumns[i]) ? this.previewGrid._gridColumns[i].weight : 0;
            html += `<tr><td>${i + 1}</td><td><input type="number" id="rowWeight_${i}" value="0" step="0.1" min="0" class="tester_weight_table_input"></td>
                      <td>${i + 1}</td><td><input type="number" id="colWeight_${i}" value="${colWeight}" step="0.1" min="0" class="tester_weight_table_input"></td></tr>`;
        }
        html += '</tbody></table>';
        this.gridConfigContent.innerHTML = html;
        this.gridConfigModal.style.display = 'block';
    }

    applyGridWeights() {
        if (!this.gridConfigContent) return;
        let maxRow = this.oc._get_max_row(this.previewGrid);
        let maxCol = this.oc._get_max_col(this.previewGrid);
        let rows = maxRow || 1;
        let cols = maxCol || 1;
        for (let i = 0; i < rows; i++) {
            let weightInput = document.getElementById(`rowWeight_${i}`);
            if (weightInput) {
                let rowWeight = parseFloat(weightInput.value) || 0;
                if (rowWeight > 0) this.oc.configure_row(this.previewGrid, i + 1, { weight: rowWeight });
            }
        }
        for (let i = 0; i < cols; i++) {
            let weightInput = document.getElementById(`colWeight_${i}`);
            if (weightInput) {
                let colWeight = parseFloat(weightInput.value) || 0;
                if (colWeight > 0) this.oc.configure_column(this.previewGrid, i + 1, { weight: colWeight });
            }
        }
        this.gridConfigModal.style.display = 'none';
        this.showMessage('Grid weights applied', 'info');
    }
    // #endregion

    // #region object_operations
    addObjectFromForm() {
        // Validate required elements
        if (!this.parentSelect || !this.tagSelect) {
            this.showMessage('Form elements not found', 'error');
            return;
        }
        const requiredElements = {
            objId: this.objId, objClass: this.objClass, objText: this.objText,
            objRow: this.objRow, objCol: this.objCol, objRowSpan: this.objRowSpan, objColSpan: this.objColSpan,
            padx: this.padx, pady: this.pady, ipadx: this.ipadx, ipady: this.ipady,
            stickyN: this.stickyN, stickyS: this.stickyS, stickyE: this.stickyE, stickyW: this.stickyW
        };
        for (let [name, el] of Object.entries(requiredElements)) {
            if (!el) { this.showMessage(`Form element missing: ${name}`, 'error'); return; }
        }

        let parentValue = this.parentSelect.value;
        let parentEl = parentValue === 'preview' ? this.previewGrid : document.getElementById(parentValue);
        if (!parentEl) { this.showMessage('Selected parent not found', 'error'); return; }

        let tag = this.tagSelect.value;
        let id = this.objId.value || this.generateId(tag);
        let className = this.objClass.value || undefined;
        let text = this.objText.value || undefined;
        let row = parseInt(this.objRow.value) || 1;
        let col = parseInt(this.objCol.value) || 1;
        let rowSpan = this.objRowSpan.value ? parseInt(this.objRowSpan.value) : undefined;
        let colSpan = this.objColSpan.value ? parseInt(this.objColSpan.value) : undefined;
        let sticky = this.getStickyString();
        let padx = this.padx.value ? parseInt(this.padx.value) : undefined;
        let pady = this.pady.value ? parseInt(this.pady.value) : undefined;
        let ipadx = this.ipadx.value ? parseInt(this.ipadx.value) : undefined;
        let ipady = this.ipady.value ? parseInt(this.ipady.value) : undefined;

        let params = {
            parent: parentEl,
            row, col, sticky, rowSpan, colSpan,
            id, class_name: className,
            style: this.pendingCss || '',
            padx, pady, ipadx, ipady
        };
        if (text !== undefined) {
            if (tag === 'input') params.value = text;
            else params.text = text;
        }

        let element, methodName;
        switch (tag) {
            case 'button':
                element = this.oc.button(params);
                methodName = 'button';
                break;
            case 'input':
                element = this.oc.input(params);
                methodName = 'input';
                break;
            case 'label':
                element = this.oc.label(params);
                methodName = 'label';
                break;
            case 'collapsible':
                element = this.createCollapsible(params, text);
                methodName = 'object_generate';
                break;
            case 'tabs':
                element = this.createTabs(params, text);
                methodName = 'object_generate';
                break;
            default:
                element = this.oc.object_generate(tag, params);
                methodName = 'object_generate';
        }

        if (tag === 'div' || tag === 'collapsible' || tag === 'tabs') {
            this.container_elements.push(element);
            this.refreshParentDropdown();
        }

        this.objects.push({ element, params, method_name: methodName, tag });
        this.pendingCss = null;
        this.refreshObjectList();
        this.refreshCodeDisplay();
        this.showMessage(`Object "${id}" added successfully`, 'info');
    }

    generateId(tag) {
        let prefix = tag === 'input' ? 'inp' : (tag === 'button' ? 'btn' : (tag === 'div' ? 'div' : 'obj'));
        return `${prefix}_${String(this.counter++).padStart(3, '0')}`;
    }

    createCollapsible(params, text) {
        let container = this.oc.object_generate('div', { parent: params.parent, id: params.id, class_name: params.class_name, style: params.style });
        if (params.padx) container.style.marginLeft = params.padx + 'px';
        if (params.pady) container.style.marginTop = params.pady + 'px';
        if (params.ipadx) container.style.paddingLeft = params.ipadx + 'px';
        if (params.ipady) container.style.paddingTop = params.ipady + 'px';

        let header = this.oc.object_generate('div', { parent: container, text: text || 'Collapsible' });
        header.style.cursor = 'pointer';
        header.style.backgroundColor = '#f1f1f1';
        header.style.padding = '10px';
        header.style.border = '1px solid #ccc';
        let content = this.oc.object_generate('div', { parent: container });
        content.style.padding = '10px';
        content.style.display = 'none';
        content.style.border = '1px solid #ccc';
        content.style.borderTop = 'none';
        header.onclick = () => { content.style.display = content.style.display === 'none' ? 'block' : 'none'; };
        this.oc._handle_grid_placement(params.parent, container, params.row, params.col, params.sticky, params.rowSpan, params.colSpan);
        return container;
    }

    createTabs(params, text) {
        let container = this.oc.object_generate('div', { parent: params.parent, id: params.id, class_name: params.class_name, style: params.style });
        if (params.padx) container.style.marginLeft = params.padx + 'px';
        if (params.pady) container.style.marginTop = params.pady + 'px';
        if (params.ipadx) container.style.paddingLeft = params.ipadx + 'px';
        if (params.ipady) container.style.paddingTop = params.ipady + 'px';

        let tabHeaders = this.oc.object_generate('div', { parent: container });
        tabHeaders.style.display = 'flex';
        tabHeaders.style.borderBottom = '1px solid #ccc';
        let tabContent = this.oc.object_generate('div', { parent: container });
        tabContent.style.padding = '10px';
        tabContent.style.border = '1px solid #ccc';
        tabContent.style.borderTop = 'none';

        let tabs = text && text.includes(',') ? text.split(',').map(t => t.trim()) : ['Tab 1', 'Tab 2'];
        for (let i = 0; i < tabs.length; i++) {
            let tab = this.oc.object_generate('div', { parent: tabHeaders, text: tabs[i] });
            tab.style.padding = '10px';
            tab.style.cursor = 'pointer';
            tab.style.backgroundColor = i === 0 ? '#fff' : '#f1f1f1';
            tab.style.border = '1px solid #ccc';
            tab.style.borderBottom = 'none';
            tab.style.marginRight = '2px';
            tab.onclick = (function(idx) {
                return function() {
                    for (let t of tabHeaders.children) t.style.backgroundColor = '#f1f1f1';
                    this.style.backgroundColor = '#fff';
                    tabContent.textContent = `Content for ${tabs[idx]}`;
                };
            })(i);
        }
        tabContent.textContent = 'Content for Tab 1';
        this.oc._handle_grid_placement(params.parent, container, params.row, params.col, params.sticky, params.rowSpan, params.colSpan);
        return container;
    }

    saveEdit() {
        if (this.editing_index === null) return;
        let oldObj = this.objects[this.editing_index];
        this.oc.remove_widget(oldObj.element);
        if (oldObj.tag === 'div' || oldObj.tag === 'collapsible' || oldObj.tag === 'tabs') {
            let idx = this.container_elements.indexOf(oldObj.element);
            if (idx !== -1) this.container_elements.splice(idx, 1);
        }
        this.objects.splice(this.editing_index, 1);
        this.addObjectFromForm();
        this.editing_index = null;
        this.btnAddObject.style.display = 'inline-block';
        this.btnSaveEdit.style.display = 'none';
        this.btnCancelEdit.style.display = 'none';
        this.clearForm();
        this.showMessage('Object updated', 'info');
    }

    cancelEdit() {
        this.editing_index = null;
        this.btnAddObject.style.display = 'inline-block';
        this.btnSaveEdit.style.display = 'none';
        this.btnCancelEdit.style.display = 'none';
        this.clearForm();
        this.pendingCss = null;
        this.showMessage('Edit cancelled', 'info');
    }

    editObject(index) {
        let obj = this.objects[index];
        this.editing_index = index;
        this.tagSelect.value = obj.tag;
        this.parentSelect.value = this.getParentValue(obj.params.parent);
        this.objId.value = obj.params.id || '';
        this.objClass.value = obj.params.class_name || '';
        this.objText.value = (obj.params.text !== undefined ? obj.params.text : (obj.params.value !== undefined ? obj.params.value : ''));
        this.objRow.value = obj.params.row || 1;
        this.objCol.value = obj.params.col || 1;
        this.objRowSpan.value = obj.params.rowSpan || '';
        this.objColSpan.value = obj.params.colSpan || '';
        this.padx.value = obj.params.padx !== undefined ? obj.params.padx : '';
        this.pady.value = obj.params.pady !== undefined ? obj.params.pady : '';
        this.ipadx.value = obj.params.ipadx !== undefined ? obj.params.ipadx : '';
        this.ipady.value = obj.params.ipady !== undefined ? obj.params.ipady : '';
        let sticky = obj.params.sticky || '';
        this.stickyN.checked = sticky.includes('n');
        this.stickyS.checked = sticky.includes('s');
        this.stickyE.checked = sticky.includes('e');
        this.stickyW.checked = sticky.includes('w');

        this.btnAddObject.style.display = 'none';
        this.btnSaveEdit.style.display = 'inline-block';
        this.btnCancelEdit.style.display = 'inline-block';
    }

    removeLastWidget() {
        let last = this.previewGrid.lastElementChild;
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
            this.refreshParentDropdown();
            this.refreshObjectList();
            this.refreshCodeDisplay();
            this.showMessage('Last widget removed', 'info');
        }
    }

    clearPreview() {
        while (this.previewGrid.firstChild) {
            this.previewGrid.removeChild(this.previewGrid.firstChild);
        }
        this.objects = [];
        this.container_elements = [this.previewGrid];
        this.refreshParentDropdown();
        this.refreshObjectList();
        this.refreshCodeDisplay();
        this.previewGrid.style.gridTemplateColumns = '';
        this.previewGrid.style.gridTemplateRows = '';
        this.pendingCss = null;
        this.showMessage('Preview cleared', 'info');
    }
    // #endregion

    // #region code_operations
    refreshCodeDisplay() {
        let lines = [];
        for (let obj of this.objects) {
            let parentRef = this.getParentReference(obj.params.parent);
            let params = { ...obj.params };
            delete params.parent;
            let paramStrings = [];
            paramStrings.push(`parent: ${parentRef}`);
            if (params.row !== undefined) paramStrings.push(`row: ${params.row}`);
            if (params.col !== undefined) paramStrings.push(`col: ${params.col}`);
            if (params.sticky) paramStrings.push(`sticky: '${params.sticky}'`);
            if (params.rowSpan) paramStrings.push(`rowSpan: ${params.rowSpan}`);
            if (params.colSpan) paramStrings.push(`colSpan: ${params.colSpan}`);
            if (params.id) paramStrings.push(`id: '${params.id}'`);
            if (params.class_name) paramStrings.push(`class_name: '${params.class_name}'`);
            if (params.style) paramStrings.push(`style: '${params.style}'`);
            if (params.text !== undefined) paramStrings.push(`text: '${params.text}'`);
            if (params.value !== undefined) paramStrings.push(`value: '${params.value}'`);
            if (params.padx !== undefined) paramStrings.push(`padx: ${params.padx}`);
            if (params.pady !== undefined) paramStrings.push(`pady: ${params.pady}`);
            if (params.ipadx !== undefined) paramStrings.push(`ipadx: ${params.ipadx}`);
            if (params.ipady !== undefined) paramStrings.push(`ipady: ${params.ipady}`);

            let method = obj.method_name;
            if (obj.tag === 'div' && method === 'object_generate') {
                lines.push(`oc.object_generate('div', { ${paramStrings.join(', ')} });`);
            } else if (obj.tag === 'collapsible' || obj.tag === 'tabs') {
                lines.push(`// Custom widget: ${obj.tag} - see implementation in Tester.js`);
            } else {
                lines.push(`oc.${method}({ ${paramStrings.join(', ')} });`);
            }
        }
        this.codeDisplay.value = lines.join('\n');
    }

    copyCode() {
        let text = this.codeDisplay.value;
        navigator.clipboard.writeText(text).then(() => {
            this.flashButton(this.btnCopyCode);
            this.showMessage('Code copied to clipboard', 'info');
        });
    }

    loadCode() {
        let code = this.codeDisplay.value;
        if (!code.trim()) {
            this.showMessage('No code to load', 'warning');
            return;
        }
        this.clearPreview();
        try {
            let fn = new Function('oc', 'document', code);
            fn(this.oc, document);
            this.syncObjectsFromDom();
            this.showMessage('Code loaded successfully', 'info');
        } catch (e) {
            this.showMessage('Error executing code: ' + e.message, 'error');
        }
    }

    saveCodeToFile() {
        let text = this.codeDisplay.value;
        let blob = new Blob([text], { type: 'text/javascript' });
        let url = URL.createObjectURL(blob);
        let a = document.createElement('a');
        a.href = url;
        a.download = 'object_creator_code.js';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showMessage('Code saved to file', 'info');
    }
    // #endregion

    // #region preview_css_operations
    copyPreviewCss() {
        let text = this.previewCssTextarea.value;
        navigator.clipboard.writeText(text).then(() => {
            this.flashButton(this.btnCopyPreviewCss);
            this.showMessage('Preview CSS copied', 'info');
        });
    }

    applyPreviewCss() {
        let css = this.previewCssTextarea.value;
        this.previewGrid.style.cssText = css;
        this.showMessage('Preview CSS applied', 'info');
    }

    loadPreviewCss() {
        let css = this.previewGrid.style.cssText;
        this.previewCssTextarea.value = css;
        this.flashButton(this.btnLoadPreviewCss);
        this.showMessage('Preview CSS loaded from preview', 'info');
    }
    // #endregion

    // #region separate_window
    openSeparateWindow() {
        let win = window.open('preview-template.html', '_blank', 'width=800,height=600,resizable=yes');
        if (!win) {
            this.showMessage('Popup blocked. Please allow popups for this site.', 'warning');
            return;
        }
        localStorage.setItem('previewContent', JSON.stringify({
            html: this.previewGrid.innerHTML,
            style: this.previewGrid.style.cssText,
            childrenStyles: Array.from(this.previewGrid.children).map(child => child.style.cssText)
        }));
        this.showMessage('Separate window opened', 'info');
    }
    // #endregion

    // #region utilities
    refreshParentDropdown() {
        let currentVal = this.parentSelect.value;
        this.parentSelect.innerHTML = '';
        let opt = document.createElement('option');
        opt.value = 'preview';
        opt.textContent = 'Preview Area';
        this.parentSelect.appendChild(opt);

        for (let el of this.container_elements) {
            if (el === this.previewGrid) continue;
            if (el.id) {
                let opt = document.createElement('option');
                opt.value = el.id;
                opt.textContent = `Div: ${el.id}`;
                this.parentSelect.appendChild(opt);
            } else {
                if (!el._tempId) {
                    el._tempId = 'container_' + Math.random().toString(36).substr(2, 9);
                }
                let opt = document.createElement('option');
                opt.value = el._tempId;
                opt.textContent = 'Div (no id)';
                this.parentSelect.appendChild(opt);
            }
        }
        if (currentVal && Array.from(this.parentSelect.options).some(opt => opt.value === currentVal)) {
            this.parentSelect.value = currentVal;
        }
    }

    refreshObjectList() {
        this.objectListDiv.innerHTML = '';
        if (this.objects.length === 0) {
            this.objectListDiv.innerHTML = '<div style="color: #999; text-align: center; padding: 20px;">No objects created yet</div>';
            return;
        }
        for (let i = 0; i < this.objects.length; i++) {
            let obj = this.objects[i];
            let div = document.createElement('div');
            div.className = 'tester_object_item';
            let info = `${obj.tag} (${obj.params.id || 'no id'}) - row:${obj.params.row}, col:${obj.params.col}`;
            div.appendChild(document.createTextNode(info));

            let btnEdit = document.createElement('button');
            btnEdit.textContent = 'Edit';
            btnEdit.className = 'tester_object_item_button';
            btnEdit.addEventListener('click', () => this.editObject(i));
            div.appendChild(btnEdit);

            let btnDelete = document.createElement('button');
            btnDelete.textContent = 'Delete';
            btnDelete.className = 'tester_object_item_button tester_button_danger';
            btnDelete.addEventListener('click', () => {
                this.oc.remove_widget(obj.element);
                if (obj.tag === 'div' || obj.tag === 'collapsible' || obj.tag === 'tabs') {
                    let idx = this.container_elements.indexOf(obj.element);
                    if (idx !== -1) this.container_elements.splice(idx, 1);
                }
                this.objects.splice(i, 1);
                this.refreshParentDropdown();
                this.refreshObjectList();
                this.refreshCodeDisplay();
                this.showMessage(`Object "${obj.params.id}" deleted`, 'info');
            });
            div.appendChild(btnDelete);
            this.objectListDiv.appendChild(div);
        }
    }

    syncObjectsFromDom() {
        this.objects = [];
        this.container_elements = [this.previewGrid];
        for (let child of this.previewGrid.children) {
            let tag = child.tagName.toLowerCase();
            let methodName = tag === 'button' ? 'button' : (tag === 'input' ? 'input' : (tag === 'span' ? 'label' : 'object_generate'));
            let params = {
                parent: this.previewGrid,
                row: parseInt(child.style.gridRowStart) || 1,
                col: parseInt(child.style.gridColumnStart) || 1,
                sticky: this.getStickyFromStyle(child),
                rowSpan: this.getSpan(child, 'row'),
                colSpan: this.getSpan(child, 'col'),
                id: child.id || undefined,
                class_name: child.className || undefined,
                style: child.style.cssText || undefined,
                text: child.textContent || undefined,
                value: child.value || undefined
            };
            if (tag === 'div' || tag === 'collapsible' || tag === 'tabs') this.container_elements.push(child);
            this.objects.push({ element: child, params, method_name: methodName, tag });
        }
        this.refreshParentDropdown();
        this.refreshObjectList();
        this.refreshCodeDisplay();
    }

    getStickyFromStyle(el) {
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

    getSpan(el, axis) {
        let spanProp = axis === 'row' ? 'gridRowEnd' : 'gridColumnEnd';
        let span = el.style[spanProp];
        if (span && span.startsWith('span')) return parseInt(span.split(' ')[1]);
        return undefined;
    }

    clearForm() {
        this.objId.value = '';
        this.objClass.value = '';
        this.objText.value = '';
        this.objRow.value = 1;
        this.objCol.value = 1;
        this.objRowSpan.value = '';
        this.objColSpan.value = '';
        this.padx.value = '';
        this.pady.value = '';
        this.ipadx.value = '';
        this.ipady.value = '';
        this.stickyN.checked = false;
        this.stickyS.checked = false;
        this.stickyE.checked = false;
        this.stickyW.checked = false;
        this.tagSelect.value = 'button';
        this.parentSelect.value = 'preview';
    }

    getParentValue(parentEl) {
        if (parentEl === this.previewGrid) return 'preview';
        if (parentEl.id) return parentEl.id;
        if (parentEl._tempId) return parentEl._tempId;
        return 'preview';
    }

    getStickyString() {
        let parts = [];
        if (this.stickyN.checked) parts.push('n');
        if (this.stickyS.checked) parts.push('s');
        if (this.stickyE.checked) parts.push('e');
        if (this.stickyW.checked) parts.push('w');
        return parts.join('');
    }

    getParentReference(parentEl) {
        if (parentEl === this.previewGrid) {
            return 'document.getElementById(\'previewGrid\')';
        } else if (parentEl.id) {
            return `document.getElementById('${parentEl.id}')`;
        } else if (parentEl._tempId) {
            return '/* parent element without id */ null';
        }
        return '/* unknown parent */ null';
    }

    flashButton(btn) {
        if (!btn) return;
        btn.classList.add('tester_flash');
        setTimeout(() => btn.classList.remove('tester_flash'), 200);
    }
    // #endregion
}

document.addEventListener('DOMContentLoaded', () => {
    window.tester = new Tester();
});