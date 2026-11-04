# DataTable Features

## Overview
DataTable is a high-performance virtual scrolling table widget with Excel-like inline editing, undo/redo, sorting, filtering, CSV import/export, selection, and extensive customization.

## Features List

### Virtual Scrolling
- Renders only visible rows, supports thousands of rows without performance loss.
- Configurable row height and buffer.

### Sorting
- Click any column header to sort ascending/descending.
- Visual indicators (^/v).
- Sortable per column via column definition `sortable: false` to disable.

### Filtering
- **Global filter**: text input above table searches all fields.
- **Column filters**: click v button in header to open popup with unique values.
  - Three-state toggle: (o) neutral -> [ok] include -> [x] exclude -> (o).
  - Search within popup.
  - Popup stays open until Apply button (if `live_filter: false`) or click outside.
- Filterable per column via `filterable: false`.

### Inline Editing (Excel-like)
- Double-click a cell to edit.
- Press **Enter** to save, **Escape** to cancel.
- Changes trigger undo/redo and callbacks.
- Enable/disable with `inline_edit` option.
- Right-click context menu includes "Edit" option.

### Undo/Redo
- 10-action memory.
- Keyboard shortcuts: **Ctrl+Z** (undo), **Ctrl+Shift+Z** (redo).
- Context menu options.

### Selection
- Multi-select with **Ctrl** key.
- Configurable selection mode: `'row'`, `'cell'`, `'all'`, `'none'`.
- Highlight mode: `'row'`, `'cell'`, `'all'`.
- Callbacks: `on_selection_change`.

### Keyboard Navigation
- Arrow keys move focus between cells.
- **Ctrl+Shift+Arrow** extends selection (rectangular).
- Focus is indicated by tabindex; start focused on first cell.

### Copy/Paste
- **Ctrl+C** copies selected cells as tab-separated text.
- Right-click context menu.

### CSV Import/Export
- `export_csv()` returns CSV string.
- `import_csv(csv_text, has_header)` replaces data.
- Import from list of dicts or list of lists.

### Conditional Styling
- Per-column `conditional_style` function receives value and row, returns style object.
- Per-row `row_style` function.
- Examples: hex column background from value, letter column coloring based on presence of 'A'/'Z'.

### Custom Renderers
- `renderer` function per column for custom cell display (e.g., pi digit column shows inf).

### Resize Observer
- Automatically adjusts when container resizes.

### Events
- `on_row_click`, `on_cell_click`, `on_column_click`, `on_table_click`
- `on_cell_edit`, `on_data_change`

## Usage Example

```javascript
const columns = [
    { field: 'id', header: 'ID', width: '80px', sortable: true },
    { field: 'name', header: 'Name', sortable: true, filterable: true },
    { field: 'score', header: 'Score', width: '100px',
      conditional_style: (val) => val > 80 ? { color: 'red' } : {} },
    { field: 'date', header: 'Date', renderer: (val) => new Date(val).toLocaleDateString() }
];

const data = [
    { id: 1, name: 'Alice', score: 95, date: '2024-01-01' },
    { id: 2, name: 'Bob', score: 45, date: '2024-01-02' }
];

const table = new DataTable(
    document.getElementById('container'),
    columns,
    data,
    {
        row_height: 35,
        sortable: true,
        filterable: true,
        inline_edit: true,
        multi_select: 'cell',
        highlight: 'cell',
        on_cell_edit: (row, col, new_val, old_val) => console.log('Edited', row, col, new_val)
    }
);

// Later
table.export_csv();
table.undo();
table.set_data(new_data);
Integration with ObjectCreator
javascript
const container = oc.object_generate('div', {
    parent: preview_grid,
    row: 1,
    col: 1,
    sticky: 'nsew',
    id: 'table_container'
});
new DataTable(container, columns, data, options);
Notes
The table is fully customizable; all options are optional.

For very large datasets, virtual scrolling ensures smooth performance.

Right-click context menu can be replaced by subclassing ContextMenuManager.

text

---

Place `tester.js` in the same folder as the other DataTable modules, and ensure the HTML imports it after `DataTable.js`. The table will now have all requested features: conditional styling, infinite pi digit display, editable cells with right-click edit, persistent filter popups, keyboard navigation, and progress messages during pi computation.