// #region preview_grid
class PreviewGrid {
    constructor(controller) {
        this.controller = controller;
        this.element = null;
    }

    build(parent, row, col, colSpan, sticky, margin) {
        this.element = document.oc.object_generate('div', {
            parent: parent,
            row: row,
            col: col,
            sticky: sticky,
            class_name: 'tester_preview_grid',
            padx: margin.x,
            pady: margin.y
        });
        if (colSpan !== undefined) {
            this.element.style.gridColumn = `span ${colSpan}`;
        }
    }

    get_element() {
        return this.element;
    }

    clear() {
        while (this.element.firstChild) {
            this.element.removeChild(this.element.firstChild);
        }
    }

    apply_css(css) {
        this.element.style.cssText = css;
    }

    get_css() {
        return this.element.style.cssText;
    }
}
// #endregion