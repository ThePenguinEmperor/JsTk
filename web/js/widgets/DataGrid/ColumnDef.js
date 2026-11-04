/**
 * Column definition - configuration for a single column.
 * @typedef {Object} ColumnDef
 * @property {string} field - Data field name.
 * @property {string} header - Column header text.
 * @property {number} [width] - Fixed width in pixels (optional).
 * @property {boolean} [sortable] - Whether the column can be sorted.
 * @property {boolean} [filterable] - Whether the column can be filtered.
 * @property {Function} [renderer] - Custom cell renderer (value, rowData) => string.
 * @property {Function} [conditional_style] - (value, rowData) => style object.
 * @property {Object} [cell_style] - Static style object for all cells in this column.
 */