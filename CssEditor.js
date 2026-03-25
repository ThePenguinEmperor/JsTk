// #region css_editor_class
/**
 * CSSEditor – a modal for editing CSS properties with live preview.
 */
class CSSEditor {
    constructor(options = {}) {
        // #region dom_selectors
        this.modal = document.getElementById('cssEditorModal');
        this.searchInput = document.getElementById('cssEditorSearch');
        this.sectionsContainer = document.getElementById('cssEditorSections');
        this.previewElement = document.getElementById('cssEditorPreview');
        this.applyButton = document.getElementById('cssEditorApply');
        this.cancelButton = document.getElementById('cssEditorCancel');
        this.closeButton = document.querySelector('.close-css-editor');
        // #endregion

        // #region state
        this.targetElement = options.targetElement || null;
        this.onApply = options.onApply || null;
        this.currentCss = {};
        this.sectionElements = [];
        // #endregion

        // #region property_definitions (with unit support)
        this.propertySections = [
            {
                name: 'Layout',
                properties: [
                    { label: 'Width', prop: 'width', type: 'text', placeholder: 'auto', units: true },
                    { label: 'Height', prop: 'height', type: 'text', placeholder: 'auto', units: true },
                    { label: 'Min Width', prop: 'minWidth', type: 'text', placeholder: 'auto', units: true },
                    { label: 'Min Height', prop: 'minHeight', type: 'text', placeholder: 'auto', units: true },
                    { label: 'Max Width', prop: 'maxWidth', type: 'text', placeholder: 'none', units: true },
                    { label: 'Max Height', prop: 'maxHeight', type: 'text', placeholder: 'none', units: true },
                    { label: 'Display', prop: 'display', type: 'select', options: ['block', 'inline', 'inline-block', 'flex', 'grid', 'none'] },
                    { label: 'Position', prop: 'position', type: 'select', options: ['static', 'relative', 'absolute', 'fixed', 'sticky'] },
                    { label: 'Top', prop: 'top', type: 'text', placeholder: 'auto', units: true },
                    { label: 'Right', prop: 'right', type: 'text', placeholder: 'auto', units: true },
                    { label: 'Bottom', prop: 'bottom', type: 'text', placeholder: 'auto', units: true },
                    { label: 'Left', prop: 'left', type: 'text', placeholder: 'auto', units: true },
                ]
            },
            {
                name: 'Spacing',
                properties: [
                    { label: 'Margin', prop: 'margin', type: 'text', placeholder: '0', units: true },
                    { label: 'Padding', prop: 'padding', type: 'text', placeholder: '0', units: true },
                    { label: 'Margin Top', prop: 'marginTop', type: 'text', placeholder: '0', units: true },
                    { label: 'Margin Right', prop: 'marginRight', type: 'text', placeholder: '0', units: true },
                    { label: 'Margin Bottom', prop: 'marginBottom', type: 'text', placeholder: '0', units: true },
                    { label: 'Margin Left', prop: 'marginLeft', type: 'text', placeholder: '0', units: true },
                    { label: 'Padding Top', prop: 'paddingTop', type: 'text', placeholder: '0', units: true },
                    { label: 'Padding Right', prop: 'paddingRight', type: 'text', placeholder: '0', units: true },
                    { label: 'Padding Bottom', prop: 'paddingBottom', type: 'text', placeholder: '0', units: true },
                    { label: 'Padding Left', prop: 'paddingLeft', type: 'text', placeholder: '0', units: true },
                ]
            },
            {
                name: 'Borders',
                properties: [
                    { label: 'Border Width', prop: 'borderWidth', type: 'text', placeholder: '1px', units: true },
                    { label: 'Border Style', prop: 'borderStyle', type: 'select', options: ['solid', 'dashed', 'dotted', 'double', 'none'] },
                    { label: 'Border Color', prop: 'borderColor', type: 'color', default: '#000000' },
                    { label: 'Border Radius', prop: 'borderRadius', type: 'text', placeholder: '0px', units: true },
                ]
            },
            {
                name: 'Box Shadow',
                properties: [
                    { label: 'X Offset', prop: 'boxShadowX', type: 'text', placeholder: '0', units: true },
                    { label: 'Y Offset', prop: 'boxShadowY', type: 'text', placeholder: '0', units: true },
                    { label: 'Blur Radius', prop: 'boxShadowBlur', type: 'text', placeholder: '0', units: true },
                    { label: 'Spread Radius', prop: 'boxShadowSpread', type: 'text', placeholder: '0', units: true },
                    { label: 'Shadow Color', prop: 'boxShadowColor', type: 'color', default: '#000000' },
                    { label: 'Inset', prop: 'boxShadowInset', type: 'checkbox' }
                ]
            },
            {
                name: 'Colors',
                properties: [
                    { label: 'Background Color', prop: 'backgroundColor', type: 'color', default: '#ffffff' },
                    { label: 'Text Color', prop: 'color', type: 'color', default: '#000000' },
                    { label: 'Opacity', prop: 'opacity', type: 'range', min: 0, max: 1, step: 0.01, placeholder: '1' }
                ]
            },
            {
                name: 'Typography',
                properties: [
                    { label: 'Font Family', prop: 'fontFamily', type: 'select', options: this._getFontList() },
                    { label: 'Font Size', prop: 'fontSize', type: 'text', placeholder: '14px', units: true },
                    { label: 'Font Weight', prop: 'fontWeight', type: 'select', options: ['normal', 'bold', 'bolder', 'lighter', '100', '200', '300', '400', '500', '600', '700', '800', '900'] },
                    { label: 'Font Style', prop: 'fontStyle', type: 'select', options: ['normal', 'italic', 'oblique'] },
                    { label: 'Text Align', prop: 'textAlign', type: 'select', options: ['left', 'center', 'right', 'justify'] },
                    { label: 'Text Decoration', prop: 'textDecoration', type: 'select', options: ['none', 'underline', 'overline', 'line-through', 'underline overline'] },
                    { label: 'Line Height', prop: 'lineHeight', type: 'text', placeholder: 'normal', units: true }
                ]
            },
            {
                name: 'Effects',
                properties: [
                    { label: 'Transition', prop: 'transition', type: 'text', placeholder: 'all 0.3s ease' },
                    { label: 'Transform', prop: 'transform', type: 'text', placeholder: 'none' },
                    { label: 'Cursor', prop: 'cursor', type: 'select', options: ['auto', 'pointer', 'default', 'move', 'wait', 'help', 'text'] }
                ]
            },
            {
                name: 'Flexbox / Grid',
                properties: [
                    { label: 'Flex Direction', prop: 'flexDirection', type: 'select', options: ['row', 'row-reverse', 'column', 'column-reverse'] },
                    { label: 'Justify Content', prop: 'justifyContent', type: 'select', options: ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'] },
                    { label: 'Align Items', prop: 'alignItems', type: 'select', options: ['stretch', 'flex-start', 'flex-end', 'center', 'baseline'] },
                    { label: 'Gap', prop: 'gap', type: 'text', placeholder: '0', units: true }
                ]
            }
        ];
        // #endregion

        // #region event_handlers
        this.applyButton.addEventListener('click', () => this.apply());
        this.cancelButton.addEventListener('click', () => this.close());
        if (this.closeButton) this.closeButton.addEventListener('click', () => this.close());
        this.searchInput.addEventListener('input', (e) => this.filterSections(e.target.value));
        // #endregion

        this.buildSections();
    }

    // #region helpers
    _getFontList() {
        return [
            'Arial', 'Verdana', 'Times New Roman', 'Georgia', 'Courier New',
            'Monaco', 'Impact', 'Comic Sans MS', 'Tahoma', 'Trebuchet MS'
        ];
    }

    buildSections() {
        this.sectionsContainer.innerHTML = '';
        for (let section of this.propertySections) {
            let sectionDiv = document.createElement('div');
            sectionDiv.className = 'css-section';
            sectionDiv.dataset.sectionName = section.name.toLowerCase();

            // Header
            let header = document.createElement('div');
            header.className = 'css-section-header collapsed';
            header.textContent = section.name;
            header.addEventListener('click', () => this.toggleSection(header));
            sectionDiv.appendChild(header);

            // Content
            let content = document.createElement('div');
            content.className = 'css-section-content collapsed';
            for (let prop of section.properties) {
                let row = this.createPropertyRow(prop);
                content.appendChild(row);
            }
            sectionDiv.appendChild(content);
            this.sectionsContainer.appendChild(sectionDiv);
            this.sectionElements.push(sectionDiv);
        }
    }

    createPropertyRow(propDef) {
        let row = document.createElement('div');
        row.className = 'css-property-row';
        let label = document.createElement('label');
        label.textContent = propDef.label;
        row.appendChild(label);

        let valueContainer = document.createElement('div');
        valueContainer.className = 'value-with-unit';

        let input;
        if (propDef.type === 'select') {
            input = document.createElement('select');
            for (let opt of propDef.options) {
                let option = document.createElement('option');
                option.value = opt;
                option.textContent = opt;
                input.appendChild(option);
            }
        } else if (propDef.type === 'color') {
            input = document.createElement('input');
            input.type = 'color';
            input.value = propDef.default || '#000000';
            input.style.width = '50px';
            input.style.height = '30px';
            // Set background to match value
            input.addEventListener('input', (e) => {
                input.style.backgroundColor = e.target.value;
                input.style.color = this._getContrastColor(e.target.value);
            });
        } else if (propDef.type === 'range') {
            input = document.createElement('input');
            input.type = 'range';
            if (propDef.min !== undefined) input.min = propDef.min;
            if (propDef.max !== undefined) input.max = propDef.max;
            if (propDef.step !== undefined) input.step = propDef.step;
            input.value = propDef.placeholder || '1';
            let valueDisplay = document.createElement('span');
            valueDisplay.textContent = input.value;
            input.addEventListener('input', (e) => {
                valueDisplay.textContent = e.target.value;
                this.updatePreview(propDef.prop, e.target.value);
            });
            valueContainer.appendChild(input);
            valueContainer.appendChild(valueDisplay);
            row.appendChild(valueContainer);
            return row; // early return because we already added everything
        } else if (propDef.type === 'checkbox') {
            input = document.createElement('input');
            input.type = 'checkbox';
        } else {
            input = document.createElement('input');
            input.type = 'text';
            input.placeholder = propDef.placeholder || '';
        }

        if (propDef.units) {
            valueContainer.appendChild(input);
            let unitSelect = document.createElement('select');
            unitSelect.className = 'unit-select';
            let units = ['px', 'em', 'rem', '%', 'vh', 'vw', 'auto'];
            for (let u of units) {
                let opt = document.createElement('option');
                opt.value = u;
                opt.textContent = u;
                unitSelect.appendChild(opt);
            }
            valueContainer.appendChild(unitSelect);
            // Combine value and unit on change
            const update = () => {
                let val = input.value;
                let unit = unitSelect.value;
                let fullVal = val ? val + unit : '';
                this.updatePreview(propDef.prop, fullVal);
            };
            input.addEventListener('input', update);
            unitSelect.addEventListener('change', update);
        } else {
            valueContainer.appendChild(input);
            input.addEventListener('input', (e) => {
                this.updatePreview(propDef.prop, e.target.value);
            });
        }

        if (propDef.type !== 'range' && propDef.type !== 'checkbox') {
            row.appendChild(valueContainer);
        }

        if (propDef.type === 'checkbox') {
            row.appendChild(input);
            input.addEventListener('change', (e) => {
                this.updatePreview(propDef.prop, e.target.checked ? 'inset' : '');
            });
        }

        return row;
    }

    _getContrastColor(hex) {
        // Convert hex to RGB and compute luminance
        let r = parseInt(hex.slice(1,3), 16);
        let g = parseInt(hex.slice(3,5), 16);
        let b = parseInt(hex.slice(5,7), 16);
        let luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }

    toggleSection(header) {
        header.classList.toggle('collapsed');
        let content = header.nextElementSibling;
        if (content) content.classList.toggle('collapsed');
    }

    filterSections(searchText) {
        const lowerSearch = searchText.toLowerCase();
        for (let section of this.sectionElements) {
            const sectionName = section.dataset.sectionName;
            let match = sectionName.includes(lowerSearch);
            if (!match) {
                const rows = section.querySelectorAll('.css-property-row');
                for (let row of rows) {
                    const label = row.querySelector('label')?.textContent.toLowerCase() || '';
                    if (label.includes(lowerSearch)) {
                        match = true;
                        break;
                    }
                }
            }
            section.style.display = match ? '' : 'none';
        }
    }

    loadCurrentCss() {
        if (!this.targetElement) return;
        const computed = getComputedStyle(this.targetElement);
        for (let section of this.propertySections) {
            for (let prop of section.properties) {
                let cssProp = prop.prop;
                let value = computed[cssProp];
                if (value && value !== '') {
                    // Convert rgb/rgba to hex for color inputs
                    if (prop.type === 'color' && value.startsWith('rgb')) {
                        value = this._rgbToHex(value);
                    }
                    // Handle box shadow breakdown
                    if (cssProp === 'boxShadow' && value !== 'none') {
                        let parts = this._parseBoxShadow(value);
                        if (parts) {
                            this.updatePreview('boxShadowX', parts.x);
                            this.updatePreview('boxShadowY', parts.y);
                            this.updatePreview('boxShadowBlur', parts.blur);
                            this.updatePreview('boxShadowSpread', parts.spread);
                            this.updatePreview('boxShadowColor', parts.color);
                            this.updatePreview('boxShadowInset', parts.inset);
                        }
                    } else {
                        this.updatePreview(cssProp, value);
                    }
                }
            }
        }
    }

    _rgbToHex(rgb) {
        const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
            return '#' + ((1 << 24) + (parseInt(match[1]) << 16) + (parseInt(match[2]) << 8) + parseInt(match[3])).toString(16).slice(1);
        }
        return '#000000';
    }

    _parseBoxShadow(value) {
        // Very simplified: assume format "x y blur spread color" with optional inset
        const parts = value.split(' ');
        let inset = parts.includes('inset');
        if (inset) parts.splice(parts.indexOf('inset'), 1);
        if (parts.length >= 4) {
            return {
                x: parts[0],
                y: parts[1],
                blur: parts[2],
                spread: parts[3],
                color: parts[4] || '#000000',
                inset: inset
            };
        }
        return null;
    }

    updatePreview(prop, value) {
        if (prop === 'boxShadowX' || prop === 'boxShadowY' || prop === 'boxShadowBlur' || prop === 'boxShadowSpread' || prop === 'boxShadowColor' || prop === 'boxShadowInset') {
            // Build boxShadow string from components
            let x = this.currentCss.boxShadowX || '0';
            let y = this.currentCss.boxShadowY || '0';
            let blur = this.currentCss.boxShadowBlur || '0';
            let spread = this.currentCss.boxShadowSpread || '0';
            let color = this.currentCss.boxShadowColor || '#000000';
            let inset = this.currentCss.boxShadowInset ? 'inset ' : '';
            let boxShadow = `${inset}${x} ${y} ${blur} ${spread} ${color}`;
            this.previewElement.style.boxShadow = boxShadow;
            this.currentCss.boxShadow = boxShadow;
        } else {
            this.previewElement.style[prop] = value;
            this.currentCss[prop] = value;
        }
    }

    apply() {
        if (this.onApply) {
            // Build CSS string from currentCss (excluding internal box shadow components)
            let cssText = '';
            for (let [prop, value] of Object.entries(this.currentCss)) {
                if (value && value !== '' && !prop.startsWith('boxShadow')) {
                    cssText += `${prop}: ${value}; `;
                }
            }
            if (this.currentCss.boxShadow) {
                cssText += `box-shadow: ${this.currentCss.boxShadow}; `;
            }
            this.onApply(cssText.trim(), this.targetElement);
        }
        this.close();
    }

    close() {
        this.modal.style.display = 'none';
    }

    open(targetElement, onApply) {
        this.targetElement = targetElement || null;
        this.onApply = onApply || this.onApply;
        this.currentCss = {};
        this.loadCurrentCss();
        this.modal.style.display = 'block';
    }
    // #endregion
}
// #endregion css_editor_class