# DynamicFilter

File: `web/js/widgets/DynamicFilter/DynamicFilter.js`. Tag: `dynamic_filter`. Global: `window.DynamicFilter`.

Ordered list of column filters. Each row has an enabled checkbox, a type dropdown and a drag handle.

## Constructor

`new DynamicFilter(container, opts)`. Builds at once.

| Option | Default | Notes |
|---|---|---|
| `items` | `[]` | `[{ name, type, enabled }]`; missing `type` is the first type, missing `enabled` is true |
| `types` | `['include', 'exclude', 'range']` | Dropdown values |
| `on_change` | null | `on_change(items)` after a check, type change or reorder |

Registry defaults: three demo items (`status`, `owner`, `created_at`) and the default types.

## Members

| Member | Notes |
|---|---|
| `get_value()` | Copies of `{ name, type, enabled }` in display order |
| `set_items(items)` | Replaces rows; does not call `on_change` |
| `set_theme(theme)` | |

## Example

```js
let filters = new DynamicFilter(document.getElementById('filters'), {
    items: [{ name: 'status', type: 'include' }, { name: 'owner', type: 'exclude', enabled: false }],
    on_change: items => apply_filters(items)
});
```
