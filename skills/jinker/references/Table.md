# Table

File: `web/js/widgets/Table/Table.js`. Tag: `table`. Global: `window.Table`.

Data grid on AG Grid Community with search, column value filters, a cell context menu, Ctrl+C copy, column actions and export through a callback. AG Grid is loaded once per page from `ag_grid_cdn`.

## Constructor

`new Table(container, options)`. `container` is an element or a CSS selector; throws when not found. The container needs a height.

| Option | Default | Notes |
|---|---|---|
| `fetch_data` | null | Async, returns `{ data: rows, column_order?, error? }`. Called at start when there is no `initial_data` |
| `initial_data` | null | Rows to show at once |
| `initial_column_order` | null | Field names first, in order |
| `on_save` | null | Async `on_save(displayed_rows)` returning `{ blob, filename }`; the blob is downloaded |
| `on_error` | null | `on_error(message)`; default is MessageBox or `alert` |
| `on_grid_ready` | null | `on_grid_ready(params)` |
| `on_grid_size_changed` | null | |
| `enable_search` | `false` | Header search box |
| `enable_refresh` | `true` | Header refresh button |
| `enable_save` | `true` | Header save button |
| `enable_filter` | `true` | Funnel icons with a value list per column |
| `enable_context_menu` | `true` | |
| `select_row_on_context_menu` | `false` | |
| `context_menu_items` | null | Items, or `fn(meta)`; `meta` is `{ target, field, header_name, row_idx, row_data, value }` |
| `column_actions` | null | `{ field: { on_click(params), on_double_click(params), show_value_on_double_click } }` |
| `action_column` | null | `{ field, header_name, buttons: [{ icon, title, on_click(row, params) }] }` |
| `column_defs_override` | null | `{ field: ag_col_def }` |
| `column_tooltips` | null | `{ field: text or fn(params) }` |
| `default_col_def` | `{ resizable: true, sortable: true, filter: false }` | |
| `autosize_columns` | `true` | Fit to content; false stretches to width |
| `loading_text` | `'Loading data...'` | |
| `empty_state_message` | `'No data to display'` | |
| `grid_options` | `{}` | Extra AG Grid options |
| `filter_popup` | `{ apply_text: 'Apply' }` | |
| `inject_default_css` | `true` | |
| `custom_css` | null | |
| `theme` | null | AG Grid theme object, or `'legacy'` to load the engine CSS |
| `ag_grid_cdn` | jsDelivr ag-grid-community 31.3.4 | Set to a local file for offline use |

Registry options: `data` (demo rows), `column_order`, the `enable_*` flags, `autosize_columns`, `empty_state_message`, `loading_text`. Registry sets host height to 300 px if unset.

## Methods

| Method | Notes |
|---|---|
| `update()` / `refresh()` | Re-fetch through `fetch_data`, keep filters |
| `set_data(rows, column_order)` | Replace rows without fetching |
| `apply_search(term)`, `clear_search_box()`, `get_search_box_value()` | |
| `apply_filters()`, `clear_filters()` | |
| `save()` | Export through `on_save` |
| `get_grid_api()` | AG Grid API, or null before ready |
| `set_theme(theme)` | |
| `destroy()` | |

Rows with an `id` field use it as the row id.

## Example

```js
let table = new Table('#grid', {
    enable_search: true,
    fetch_data: async () => ({ data: await pywebview.api.get_rows() }),
    on_save: async rows => ({ blob: new Blob([JSON.stringify(rows)]), filename: 'rows.json' })
});
```

## Selection and edit mode

Both are off by default, so existing tables behave as before.

- `enable_selection` (bool): adds a pinned checkbox column with a select-all header box.
- `enable_edit` (bool): adds an Edit button; click it to turn cell editing on or off.
- `edit_on_start` (bool): starts with editing on.
- `on_selection_change(rows)`: called with the selected row objects.
- `on_cell_edit({ row, field, old_value, new_value })`: called after a cell edit.
- Methods: `get_selected_rows()`, `select_all()`, `clear_selection()`, `set_edit_mode(on)`, `is_edit_mode()`.

## Per-column editors

With `enable_edit` on, `column_editors` maps a field to an editor spec. Fields without a spec use the plain text editor.

```js
column_editors: {
    id:     { type: 'readonly' },
    name:   { type: 'text', required: true, max_length: 24 },
    score:  { type: 'int', min: 0, max: 100 },
    price:  { type: 'number', min: 0 },
    status: { type: 'select', choices: ['active', 'paused', 'failed'] },
    owner:  { type: 'autocomplete', choices: ['Jane', 'Sam'], allow_free_text: false },
    active: { type: 'bool' },
    code:   { type: 'text', validate: (value, row) => value.startsWith('X') || 'Must start with X' }
}
```

- Types: `text`, `int`, `number`, `bool` (checkbox that changes only in edit mode), `select` (drop-down), `autocomplete` (AutoComplete widget), `readonly`.
- Rules: `required`, `min`, `max`, `max_length`, and `validate(value, row)` which returns true or an error text.
- A rejected value leaves the cell unchanged and calls `on_edit_rejected({ row, field, value, reason })`.
- Accepted values are stored in the row as the right type (numbers, booleans).
