/**
 * Row metadata - stores row-level style, selection, and expansion state.
 */
class RowDef {
    /**
     * @param {number} index - Original row index in raw data.
     * @param {Object} [options]
     * @param {boolean} [options.selected] - Whether the row is selected.
     * @param {boolean} [options.expanded] - Whether the row is expanded (for future grouping).
     * @param {Object} [options.style] - Inline style object for the row.
     */
    constructor(index, options = {}) {
        this.index = index;
        this.selected = options.selected || false;
        this.expanded = options.expanded || false;
        this.style = options.style || {};
    }
}