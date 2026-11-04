/**
 * Reusable row wrapper - contains an array of CellNode instances.
 */
class RowNode {
    /**
     * @param {HTMLElement} row_element - The <div> representing the row.
     * @param {number} col_count - Number of columns.
     * @param {Array<ColumnDef>} columns - Column definitions.
     */
    constructor(row_element, col_count, columns) {
        this.element = row_element;
        this.cells = [];
        this.current_row_index = -1;
        for (let i = 0; i < col_count; i++) {
            let cell_div = document.createElement('div');
            cell_div.className = 'data_table_cell';
            cell_div.setAttribute('data-col-index', i);
            cell_div.setAttribute('data-col-field', columns[i].field);
            cell_div.style.width = columns[i].width || '100px';
            cell_div.style.boxSizing = 'border-box';
            row_element.appendChild(cell_div);
            let cell_node = new CellNode(cell_div, i, columns[i].field);
            this.cells.push(cell_node);
        }
    }

    /**
     * Update the row with data from a given row index.
     * @param {number} row_index - Index in the filtered data.
     * @param {Object} row_data - The row object.
     * @param {GridDataModel} model - The data model.
     * @param {Array<ColumnDef>} columns - Column definitions.
     */
    update(row_index, row_data, model, columns) {
        this.current_row_index = row_index;
        this.element.setAttribute('data-row-index', row_index);
        for (let col_idx = 0; col_idx < columns.length; col_idx++) {
            let col = columns[col_idx];
            let value = model.get_cell_value(row_index, col.field);
            let style = model.get_cell_style(row_index, col.field);
            let rendered = col.renderer ? col.renderer(value, row_data) : undefined;
            this.cells[col_idx].update(value, style, rendered);
        }
        let row_meta = model.row_metadata.get(row_index);
        if (row_meta && row_meta.style) {
            for (let prop in row_meta.style) {
                this.element.style[prop] = row_meta.style[prop];
            }
        }
    }
}