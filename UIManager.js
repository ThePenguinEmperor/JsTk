/**
 * UIManager – builds the entire UI using ObjectCreator.
 */
class UIManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.oc = document.oc;
        this.uiElements = {}; // store references
        this.buildUI();
    }

    buildUI() {
        // Main container
        let mainContainer = this.oc.object_generate('div', {
            parent: this.container,
            id: 'mainContainer',
            class_name: 'main_container'
        });

        // Left panel: Object Generator
        let leftPanel = this.oc.object_generate('div', {
            parent: mainContainer,
            class_name: 'tester_object_creator_panel'
        });

        // Generator section
        let generatorSection = this.oc.object_generate('div', {
            parent: leftPanel,
            class_name: 'tester_generator_section'
        });

        // Header with icon
        let headerDiv = this.oc.object_generate('div', {
            parent: generatorSection,
            class_name: 'tester_header_with_icon'
        });
        this.oc.object_generate('h2', { parent: headerDiv, text: 'Object Generator' });
        this.uiElements.btnGridConfig = this.oc.object_generate('button', {
            parent: headerDiv,
            id: 'btnGridConfig',
            class_name: 'tester_icon_button',
            text: '⚙️',
            events: { click: () => {} } // placeholder, will be overridden
        });

        // Form rows: Tag and Parent
        let formRow = this.oc.object_generate('div', { parent: generatorSection, class_name: 'tester_form_row' });
        let tagGroup = this.oc.object_generate('div', { parent: formRow, class_name: 'tester_form_group' });
        this.oc.object_generate('label', { parent: tagGroup, class_name: 'tester_label', text: 'HTML Tag:', attributes: { for: 'tagSelect' } });
        this.uiElements.tagSelect = this.oc.object_generate('select', {
            parent: tagGroup,
            id: 'tagSelect',
            class_name: 'tester_select',
            events: { change: () => {} }
        });
        let parentGroup = this.oc.object_generate('div', { parent: formRow, class_name: 'tester_form_group' });
        this.oc.object_generate('label', { parent: parentGroup, class_name: 'tester_label', text: 'Parent Container:', attributes: { for: 'parentSelect' } });
        this.uiElements.parentSelect = this.oc.object_generate('select', {
            parent: parentGroup,
            id: 'parentSelect',
            class_name: 'tester_select',
            events: { change: () => {} }
        });

        // ID and Class (labels row)
        let idClassLabels = this.oc.object_generate('div', { parent: generatorSection, class_name: 'tester_form_row' });
        this.oc.object_generate('div', { parent: idClassLabels, text: 'ID:', attributes: { class: 'tester_label' } });
        this.oc.object_generate('div', { parent: idClassLabels, text: 'Class Name:', attributes: { class: 'tester_label' } });
        // ID and Class inputs
        let idClassInputs = this.oc.object_generate('div', { parent: generatorSection, class_name: 'tester_form_row' });
        this.uiElements.objId = this.oc.object_generate('input', { parent: idClassInputs, id: 'objId', class_name: 'tester_input', attributes: { type: 'text', placeholder: 'element_id' } });
        this.uiElements.objClass = this.oc.object_generate('input', { parent: idClassInputs, id: 'objClass', class_name: 'tester_input', attributes: { type: 'text', placeholder: 'css_class' } });

        // Grid position (4 fields)
        let gridRow = this.oc.object_generate('div', { parent: generatorSection, class_name: 'tester_form_row_4' });
        this.uiElements.objRow = this._createNumberField(gridRow, 'Row (1‑based):', 'objRow', 1);
        this.uiElements.objCol = this._createNumberField(gridRow, 'Column (1‑based):', 'objCol', 1);
        this.uiElements.objRowSpan = this._createNumberField(gridRow, 'Row Span:', 'objRowSpan');
        this.uiElements.objColSpan = this._createNumberField(gridRow, 'Column Span:', 'objColSpan');

        // Padding/Margin (4 fields)
        let padRow = this.oc.object_generate('div', { parent: generatorSection, class_name: 'tester_form_row_4' });
        this.uiElements.padx = this._createNumberField(padRow, 'Pad X (margin):', 'padx', 0);
        this.uiElements.pady = this._createNumberField(padRow, 'Pad Y (margin):', 'pady', 0);
        this.uiElements.ipadx = this._createNumberField(padRow, 'Internal Pad X (padding):', 'ipadx', 0);
        this.uiElements.ipady = this._createNumberField(padRow, 'Internal Pad Y (padding):', 'ipady', 0);

        // Sticky and CSS Editor button inline
        let stickyRow = this.oc.object_generate('div', { parent: generatorSection, attributes: { style: 'display: flex; align-items: center; justify-content: space-between; gap: 10px;' } });
        let stickyGroup = this.oc.object_generate('div', { parent: stickyRow, class_name: 'tester_form_group', attributes: { style: 'flex: 1;' } });
        this.oc.object_generate('label', { parent: stickyGroup, class_name: 'tester_label', text: 'Sticky (like Tkinter):' });
        let stickyInner = this.oc.object_generate('div', { parent: stickyGroup, class_name: 'tester_sticky_group' });
        this.uiElements.stickyN = this._createCheckbox(stickyInner, 'N');
        this.uiElements.stickyS = this._createCheckbox(stickyInner, 'S');
        this.uiElements.stickyE = this._createCheckbox(stickyInner, 'E');
        this.uiElements.stickyW = this._createCheckbox(stickyInner, 'W');
        this.uiElements.btnOpenCssEditor = this.oc.object_generate('button', {
            parent: stickyRow,
            id: 'btnOpenCssEditor',
            class_name: 'tester_button_secondary',
            text: '🎨 CSS Editor',
            attributes: { style: 'margin-bottom: 0;' },
            events: { click: () => {} }
        });

        // Action buttons
        let actionRow = this.oc.object_generate('div', { parent: generatorSection, attributes: { style: 'margin-top: 15px;' } });
        this.uiElements.btnAddObject = this.oc.object_generate('button', { parent: actionRow, id: 'btnAddObject', class_name: 'tester_button_secondary', text: '➕ Add Object', events: { click: () => {} } });
        this.uiElements.btnSaveEdit = this.oc.object_generate('button', { parent: actionRow, id: 'btnSaveEdit', class_name: 'tester_button_secondary', text: '💾 Save Changes', attributes: { style: 'display:none;' }, events: { click: () => {} } });
        this.uiElements.btnCancelEdit = this.oc.object_generate('button', { parent: actionRow, id: 'btnCancelEdit', class_name: 'tester_button_danger', text: '❌ Cancel Edit', attributes: { style: 'display:none;' }, events: { click: () => {} } });

        // Right panel: Layout Test
        let rightPanel = this.oc.object_generate('div', { parent: mainContainer, class_name: 'tester_layout_test_panel' });

        // Preview section
        let previewSection = this.oc.object_generate('div', { parent: rightPanel, class_name: 'tester_preview_section' });
        let previewHeader = this.oc.object_generate('div', { parent: previewSection, class_name: 'tester_header_with_icon' });
        this.oc.object_generate('h2', { parent: previewHeader, text: '📐 Visual Preview' });
        let previewButtons = this.oc.object_generate('div', { parent: previewHeader, attributes: { style: 'display: flex; gap: 10px;' } });
        this.uiElements.btnPreviewCss = this.oc.object_generate('button', { parent: previewButtons, id: 'btnPreviewCss', class_name: 'tester_icon_button', text: '🎨', attributes: { title: 'Edit Preview CSS' }, events: { click: () => {} } });
        this.uiElements.btnSeparateWindow = this.oc.object_generate('button', { parent: previewButtons, id: 'btnSeparateWindow', class_name: 'tester_icon_button', text: '🔍', attributes: { title: 'Open preview in separate window' }, events: { click: () => {} } });
        this.uiElements.previewGrid = this.oc.object_generate('div', { parent: previewSection, id: 'previewGrid', class_name: 'tester_preview_grid' });

        // Object list section
        let objectListSection = this.oc.object_generate('div', { parent: rightPanel, class_name: 'tester_object_list_section' });
        this.oc.object_generate('h2', { parent: objectListSection, text: '📋 Object Selector' });
        this.uiElements.objectListDiv = this.oc.object_generate('div', { parent: objectListSection, id: 'objectList' });

        // Code section
        let codeSection = this.oc.object_generate('div', { parent: rightPanel, class_name: 'tester_code_section' });
        this.oc.object_generate('h2', { parent: codeSection, text: '💻 Generated Code', attributes: { style: 'color: #f8f8f2; border-bottom-color: #555;' } });
        let codeToolbar = this.oc.object_generate('div', { parent: codeSection, class_name: 'tester_code_toolbar' });
        this.uiElements.btnCopyCode = this.oc.object_generate('button', { parent: codeToolbar, id: 'btnCopyCode', class_name: 'tester_button', text: '📋 Copy Code', events: { click: () => {} } });
        this.uiElements.btnLoadCode = this.oc.object_generate('button', { parent: codeToolbar, id: 'btnLoadCode', class_name: 'tester_button', text: '▶️ Load Code', events: { click: () => {} } });
        this.uiElements.btnSaveCode = this.oc.object_generate('button', { parent: codeToolbar, id: 'btnSaveCode', class_name: 'tester_button', text: '💾 Save Code to File', events: { click: () => {} } });
        this.uiElements.codeDisplay = this.oc.object_generate('textarea', { parent: codeSection, id: 'codeDisplay', class_name: 'tester_code_display', attributes: { rows: '6', style: 'font-family: monospace; background: #1e1e1e; color: #d4d4d4; width: 100%; resize: vertical;' } });

        // Preview Grid CSS Editor
        let cssTab = this.oc.object_generate('div', { parent: codeSection, class_name: 'tester_css_tab' });
        this.oc.object_generate('h3', { parent: cssTab, text: 'Preview Grid CSS', attributes: { style: 'color: #ddd;' } });
        this.uiElements.previewCssTextarea = this.oc.object_generate('textarea', { parent: cssTab, id: 'previewCss', class_name: 'tester_css_tab_textarea', attributes: { rows: '4', placeholder: 'Custom CSS for the preview grid container...' } });
        let cssToolbar = this.oc.object_generate('div', { parent: cssTab, class_name: 'tester_code_toolbar', attributes: { style: 'margin-top: 5px;' } });
        this.uiElements.btnCopyPreviewCss = this.oc.object_generate('button', { parent: cssToolbar, id: 'btnCopyPreviewCss', class_name: 'tester_button', text: '📋 Copy CSS', events: { click: () => {} } });
        this.uiElements.btnApplyPreviewCss = this.oc.object_generate('button', { parent: cssToolbar, id: 'btnApplyPreviewCss', class_name: 'tester_button', text: '✅ Apply CSS', events: { click: () => {} } });
        this.uiElements.btnLoadPreviewCss = this.oc.object_generate('button', { parent: cssToolbar, id: 'btnLoadPreviewCss', class_name: 'tester_button', text: '📂 Load CSS from Code', events: { click: () => {} } });

        // Modal for Grid Configuration (empty, will be filled later)
        this.uiElements.gridConfigModal = this.oc.object_generate('div', { parent: document.body, id: 'gridConfigModal', class_name: 'tester_modal', attributes: { style: 'display: none;' } });
        let modalContent = this.oc.object_generate('div', { parent: this.uiElements.gridConfigModal, class_name: 'tester_modal_content' });
        let modalHeader = this.oc.object_generate('div', { parent: modalContent, class_name: 'tester_modal_header' });
        this.oc.object_generate('h2', { parent: modalHeader, text: 'Grid Configuration' });
        this.uiElements.closeGridModal = this.oc.object_generate('span', { parent: modalHeader, class_name: 'tester_modal_close', text: '×' });
        this.uiElements.gridConfigContent = this.oc.object_generate('div', { parent: modalContent, id: 'gridConfigContent' });
        this.uiElements.btnApplyGridConfig = this.oc.object_generate('button', { parent: modalContent, id: 'btnApplyGridConfig', class_name: 'tester_button', text: 'Apply Weights', events: { click: () => {} } });

        // CSS Editor Modal (already exists in DOM, but we ensure it's there; we'll just use the existing one)
        // But we already have #cssEditorModal in the HTML? Actually we removed it from index.html; we need to create it via ObjectCreator.
        // Let's create it:
        this.uiElements.cssEditorModal = this.oc.object_generate('div', { parent: document.body, id: 'cssEditorModal', class_name: 'tester_css_editor_modal', attributes: { style: 'display: none;' } });
        let cssEditorContent = this.oc.object_generate('div', { parent: this.uiElements.cssEditorModal, class_name: 'tester_css_editor_content' });
        let cssEditorHeader = this.oc.object_generate('div', { parent: cssEditorContent, class_name: 'tester_css_editor_header' });
        this.oc.object_generate('h2', { parent: cssEditorHeader, text: 'CSS Editor' });
        this.uiElements.cssEditorSearch = this.oc.object_generate('input', { parent: cssEditorHeader, id: 'cssEditorSearch', class_name: 'tester_css_editor_search', attributes: { type: 'text', placeholder: 'Search...' } });
        this.uiElements.closeCssEditor = this.oc.object_generate('span', { parent: cssEditorHeader, class_name: 'tester_modal_close', text: '×' });
        let cssEditorBody = this.oc.object_generate('div', { parent: cssEditorContent, class_name: 'tester_css_editor_body' });
        this.uiElements.cssEditorSections = this.oc.object_generate('div', { parent: cssEditorBody, id: 'cssEditorSections', class_name: 'tester_css_editor_sections' });
        let cssEditorPreview = this.oc.object_generate('div', { parent: cssEditorBody, class_name: 'tester_css_editor_preview' });
        this.uiElements.cssEditorPreview = this.oc.object_generate('div', { parent: cssEditorPreview, id: 'cssEditorPreview', class_name: 'tester_css_editor_preview_element', text: 'Sample Text' });
        this.oc.object_generate('div', { parent: cssEditorPreview, text: 'Live preview', attributes: { style: 'margin-top: 10px; font-size: 12px; color: #666;' } });
        let cssEditorFooter = this.oc.object_generate('div', { parent: cssEditorContent, class_name: 'tester_css_editor_footer' });
        this.uiElements.cssEditorApply = this.oc.object_generate('button', { parent: cssEditorFooter, id: 'cssEditorApply', class_name: 'tester_button', text: 'Apply to Selected Object', events: { click: () => {} } });
        this.uiElements.cssEditorCancel = this.oc.object_generate('button', { parent: cssEditorFooter, id: 'cssEditorCancel', class_name: 'tester_button_danger', text: 'Cancel', events: { click: () => {} } });

        // Message box (also created via ObjectCreator)
        this.uiElements.messageBox = this.oc.object_generate('div', { parent: document.body, id: 'messageBox', class_name: 'tester_message_box tester_message_box_hidden' });
        this.uiElements.messageText = this.oc.object_generate('span', { parent: this.uiElements.messageBox, id: 'messageText' });
        this.uiElements.closeMessageBtn = this.oc.object_generate('button', { parent: this.uiElements.messageBox, id: 'closeMessage', class_name: 'tester_message_close', text: '×', events: { click: () => {} } });
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
}