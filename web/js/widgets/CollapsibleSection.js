// #region collapsible_section
class CollapsibleSection {
    constructor(title, contentBuilder, options = {}) {
        this.title = title;
        this.contentBuilder = contentBuilder;
        this.id = options.id || null;
        this.className = options.class_name || null;
        this.margin = options.margin || { x: 0, y: 0 };
        this.container = null;
        this.contentDiv = null;
        this.toggleBtn = null;
        this.isCollapsed = true;
        this.start_expanded = options.expanded === true;
        this.full_width = options.full_width === true;
        this.max_width = CollapsibleSection._css_size(options.max_width);
        this.max_height = CollapsibleSection._css_size(options.max_height);

        if (!CollapsibleSection.stylesAdded) {
            CollapsibleSection._addStyles();
            CollapsibleSection.stylesAdded = true;
        }
    }

    /**
     * Turns a number (px) or a CSS size string into a CSS size, or '' when unset.
     */
    static _css_size(value) {
        if (typeof value === 'number' && value > 0) {
            return value + 'px';
        }
        return typeof value === 'string' && value.trim() !== '' && value.trim() !== '0' ? value.trim() : '';
    }

    static _addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .collapsible_section {
                border: 1px solid var(--border_light, #dcdff3);
                border-radius: var(--radius_md, 8px);
                margin-bottom: 12px;
                overflow: hidden;
                flex-shrink: 0;
                width: fit-content;
                min-width: 0;
                max-width: 100%;
                box-sizing: border-box;
            }
            .collapsible_section.collapsible_full {
                width: 100%;
            }
            .collapsible_header {
                background-color: var(--surface_secondary, #f5f6ff);
                color: var(--text_primary, #161a3a);
                font-family: var(--font_ui, system-ui, sans-serif);
                padding: 8px 12px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: pointer;
                font-weight: 500;
                height: 40px;
                box-sizing: border-box;
                flex-shrink: 0;
                gap: 12px;
            }
            .collapsible_header:hover {
                background-color: var(--surface_hover, #e6e8fb);
            }
            .collapsible_title {
                font-size: 0.9375rem;
                font-weight: 600;
                flex: 1;
                min-width: 0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .collapsible_content {
                padding: 12px;
                border-top: 1px solid var(--border_light, #dcdff3);
                overflow: auto;
                contain: inline-size;
                width: 100%;
                box-sizing: border-box;
                background-color: var(--surface, #ffffff);
                color: var(--text_primary, #161a3a);
                min-height: 50px;
            }
            .collapsible_section.collapsible_wide .collapsible_content {
                contain: none;
            }
            .collapsible_toggle {
                background: none;
                color: var(--text_secondary, #454b78);
                border: none;
                cursor: pointer;
                font-size: 16px;
                font-weight: 700;
                line-height: 1;
                padding: 2px 6px;
                border-radius: 4px;
                flex-shrink: 0;
                width: 24px;
                height: 24px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }
            .collapsible_toggle:hover {
                background-color: var(--accent_muted, rgba(91, 75, 219, 0.14));
            }
        `;
        document.head.appendChild(style);
    }

    build(parent) {
        this.container = document.createElement('div');
        this.container.className = 'collapsible_section';
        if (this.id) this.container.id = this.id;
        if (this.className) this.container.classList.add(this.className);
        this.container.style.margin = `${this.margin.y}px ${this.margin.x}px`;
        if (this.full_width) this.container.classList.add('collapsible_full');
        if (this.max_width) {
            this.container.classList.add('collapsible_wide');
            this.container.style.maxWidth = this.max_width;
        }

        const header = document.createElement('div');
        header.className = 'collapsible_header';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'collapsible_title';
        titleSpan.textContent = this.title;
        titleSpan.title = this.title;

        this.toggleBtn = document.createElement('button');
        this.toggleBtn.className = 'collapsible_toggle';
        this.toggleBtn.type = 'button';

        header.appendChild(titleSpan);
        header.appendChild(this.toggleBtn);

        this.contentDiv = document.createElement('div');
        this.contentDiv.className = 'collapsible_content';
        this.contentDiv.style.display = 'none';
        if (this.max_height) this.contentDiv.style.maxHeight = this.max_height;

        if (this.contentBuilder) {
            this.contentBuilder(this.contentDiv);
        }

        // Force hidden state
        this.contentDiv.style.display = 'none';
        this.isCollapsed = true;
        this.update_toggle();

        const toggle = () => {
            if (this.isCollapsed) {
                this.expand();
            } else {
                this.collapse();
            }
        };
        header.title = 'Click to expand or collapse';
        header.addEventListener('click', toggle);
        this.toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggle();
        });

        this.container.appendChild(header);
        this.container.appendChild(this.contentDiv);
        parent.appendChild(this.container);
        if (this.start_expanded) {
            this.expand();
        }
    }

    /**
     * Shows + with an Expand hint while collapsed and - with a Collapse hint while open.
     */
    update_toggle() {
        if (!this.toggleBtn) {
            return;
        }
        let label = this.isCollapsed ? 'Expand' : 'Collapse';
        this.toggleBtn.textContent = this.isCollapsed ? '+' : '-';
        this.toggleBtn.title = label;
        this.toggleBtn.setAttribute('aria-label', label);
        this.toggleBtn.setAttribute('aria-expanded', String(!this.isCollapsed));
    }

    collapse() {
        if (!this.isCollapsed) {
            this.contentDiv.style.display = 'none';
            this.isCollapsed = true;
            this.update_toggle();
        }
    }

    expand() {
        if (this.isCollapsed) {
            this.contentDiv.style.display = 'block';
            this.isCollapsed = false;
            this.update_toggle();
        }
    }

    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
if (window.WidgetRegistry) {
    WidgetRegistry.register('collapsible_section', {
        label: 'Collapsible Section',
        category: 'containers',
        container: true,
        options: [
            { name: 'title', type: 'string', default: 'Section' },
            { name: 'expanded', type: 'bool', default: true },
            { name: 'max_width', type: 'number', default: 0 },
            { name: 'max_height', type: 'number', default: 0 },
            { name: 'full_width', type: 'bool', default: false }
        ],
        build: (host, options) => {
            let content = null;
            let section = new CollapsibleSection(options.title, container => {
                content = document.createElement('div');
                content.className = 'collapsible_section_content';
                container.appendChild(content);
            }, {
                expanded: options.expanded === true,
                max_width: Number(options.max_width) || 0,
                max_height: Number(options.max_height) || 0,
                full_width: options.full_width === true
            });
            section.build(host);
            return { instance: section, content_container: content };
        }
    });
}

// #endregion