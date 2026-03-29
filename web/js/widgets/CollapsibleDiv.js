// #region collapsible_div
/**
 * CollapsibleDiv – a container with a title header that toggles visibility of its content.
 * Usage: new CollapsibleDiv({ title, parent, row, col, colSpan, sticky, margin, defaultOpen })
 * It builds itself using ObjectCreator and returns the container element.
 */
class CollapsibleDiv {
    constructor(options) {
        this.title = options.title || 'Collapsible';
        this.parent = options.parent;
        this.row = options.row;
        this.col = options.col;
        this.colSpan = options.colSpan;
        this.sticky = options.sticky;
        this.margin = options.margin || { x: 0, y: 0 };
        this.defaultOpen = options.defaultOpen !== undefined ? options.defaultOpen : true;
        this.container = null;
        this.content_container = null;
        this.is_open = this.defaultOpen;
        this.build();
    }

    build() {
        // Outer container
        this.container = document.oc.object_generate('div', {
            parent: this.parent,
            row: this.row,
            col: this.col,
            colSpan: this.colSpan,
            sticky: this.sticky,
            padx: this.margin.x,
            pady: this.margin.y,
            class_name: 'tester_collapsible'
        });

        // Header (clickable)
        let header = document.oc.object_generate('div', {
            parent: this.container,
            row: 1,
            col: 1,
            class_name: 'tester_collapsible_header',
            sticky: 'ew'
        });
        let icon = document.oc.object_generate('span', {
            parent: header,
            row: 1,
            col: 1,
            text: this.defaultOpen ? '▼' : '▶',
            class_name: 'tester_collapsible_icon'
        });
        let title_span = document.oc.object_generate('span', {
            parent: header,
            row: 1,
            col: 2,
            text: this.title,
            class_name: 'tester_collapsible_title'
        });

        // Content container
        this.content_container = document.oc.object_generate('div', {
            parent: this.container,
            row: 2,
            col: 1,
            class_name: 'tester_collapsible_content',
            style: this.defaultOpen ? 'display: block;' : 'display: none;'
        });

        // Toggle event
        header.addEventListener('click', () => this.toggle());
    }

    toggle() {
        this.is_open = !this.is_open;
        this.content_container.style.display = this.is_open ? 'block' : 'none';
        let icon = this.container.querySelector('.tester_collapsible_icon');
        if (icon) icon.textContent = this.is_open ? '▼' : '▶';
    }

    get_content() {
        return this.content_container;
    }

    get_element() {
        return this.container;
    }
}
// #endregion