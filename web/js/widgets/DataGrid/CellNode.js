/**
 * Reusable cell wrapper - updates its DOM element without re-creating it.
 */
class CellNode {
    /**
     * @param {HTMLElement} element - The <div> representing the cell.
     * @param {number} col_index - Index of the column.
     * @param {string} field - Field name.
     */
    constructor(element, col_index, field) {
        this.element = element;
        this.col_index = col_index;
        this.field = field;
        element.setAttribute('data-col-index', col_index);
        element.setAttribute('data-col-field', field);
        element.setAttribute('data-value', '');
    }

    /**
     * Update the cell's content and style based on provided parameters.
     * @param {any} value - The cell value.
     * @param {Object} style - Pre-computed inline style object.
     * @param {string} [renderer_output] - Optional pre-rendered text.
     */
    update(value, style, renderer_output) {
        this.element.textContent = renderer_output !== undefined ? renderer_output : (value ?? '');
        this.element.setAttribute('data-value', value);
        // Apply inline styles
        for (let prop in style) {
            this.element.style[prop] = style[prop];
        }
    }
}