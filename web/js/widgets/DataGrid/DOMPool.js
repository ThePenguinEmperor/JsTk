/**
 * Pre-allocates and manages a pool of RowNode instances.
 */
class DOMPool {
    /**
     * @param {HTMLElement} container - The <div> that will hold the rows.
     * @param {number} pool_size - Number of rows to keep in the pool.
     * @param {number} col_count - Number of columns.
     * @param {Array<ColumnDef>} columns - Column definitions.
     */
    constructor(container, pool_size, col_count, columns) {
        this.container = container;
        this.pool = [];
        for (let i = 0; i < pool_size; i++) {
            let row_div = document.createElement('div');
            row_div.className = 'data_table_row';
            container.appendChild(row_div);
            let row_node = new RowNode(row_div, col_count, columns);
            this.pool.push(row_node);
        }
    }

    /**
     * Get the RowNode at a given pool index.
     * @param {number} index
     * @returns {RowNode}
     */
    get(index) {
        return this.pool[index];
    }

    /**
     * Number of rows in the pool.
     * @returns {number}
     */
    size() {
        return this.pool.length;
    }
}