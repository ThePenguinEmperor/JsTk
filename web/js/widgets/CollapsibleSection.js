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

        if (!CollapsibleSection.stylesAdded) {
            CollapsibleSection._addStyles();
            CollapsibleSection.stylesAdded = true;
        }
    }

    static _addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .collapsible_section {
                border: 1px solid #e5e7eb;
                border-radius: 4px;
                margin-bottom: 12px;
                overflow: hidden;
            }
            .collapsible_header {
                background-color: #f3f4f6;
                padding: 8px 12px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: pointer;
                font-weight: 500;
            }
            .collapsible_title {
                font-size: 1rem;
            }
            .collapsible_content {
                padding: 12px;
                border-top: 1px solid #e5e7eb;
            }
            .collapsible_toggle {
                background: none;
                border: none;
                cursor: pointer;
                font-size: 12px;
                padding: 2px 6px;
                border-radius: 4px;
            }
            .collapsible_toggle:hover {
                background-color: #e5e7eb;
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

        const header = document.createElement('div');
        header.className = 'collapsible_header';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'collapsible_title';
        titleSpan.textContent = this.title;

        this.toggleBtn = document.createElement('button');
        this.toggleBtn.className = 'collapsible_toggle';
        this.toggleBtn.textContent = '▼';

        header.appendChild(titleSpan);
        header.appendChild(this.toggleBtn);

        this.contentDiv = document.createElement('div');
        this.contentDiv.className = 'collapsible_content';
        this.contentDiv.style.display = 'none';

        if (this.contentBuilder) {
            this.contentBuilder(this.contentDiv);
        }

        // Force hidden state after builder (in case builder changed it)
        this.contentDiv.style.display = 'none';
        this.isCollapsed = true;
        this.toggleBtn.textContent = '▼';

        const toggle = () => {
            if (this.isCollapsed) {
                this.contentDiv.style.display = 'block';
                this.toggleBtn.textContent = '▲';
                this.isCollapsed = false;
            } else {
                this.contentDiv.style.display = 'none';
                this.toggleBtn.textContent = '▼';
                this.isCollapsed = true;
            }
        };
        header.addEventListener('click', toggle);
        this.toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggle();
        });

        this.container.appendChild(header);
        this.container.appendChild(this.contentDiv);
        parent.appendChild(this.container);
    }

    collapse() {
        if (!this.isCollapsed) {
            this.contentDiv.style.display = 'none';
            if (this.toggleBtn) this.toggleBtn.textContent = '▼';
            this.isCollapsed = true;
        }
    }

    expand() {
        if (this.isCollapsed) {
            this.contentDiv.style.display = 'block';
            if (this.toggleBtn) this.toggleBtn.textContent = '▲';
            this.isCollapsed = false;
        }
    }

    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
// #endregion