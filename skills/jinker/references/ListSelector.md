# ListSelector

File: `web/js/widgets/ListSelector/ListSelector.js`. Tag: `list_selector`. Global: `window.ListSelector`.

Searchable list where each item is selected, off, or (optionally) excluded. Clicking a row cycles its state. Selected rows can be reordered by drag and drop. Right-click opens a menu (needs `ContextMenu`) with copy and bulk actions.

## Constructor

`new ListSelector(container, opts)`. Builds at once.

| Option | Default | Notes |
|---|---|---|
| `items` | `[]` | Strings |
| `selected` | `[]` | Ordered selection |
| `excluded` | `[]` | |
| `allow_exclude` | `false` | Adds the excluded state: off, selected, excluded, off |
| `on_change` | null | `on_change({ selected, excluded })` on every user change |
| `sub_status_map` | `{}` | `{ item: status }`; adds `ls_sub_<status>` class to the row |
| `extra_context_menu_items` | null | ContextMenu items, or `fn(row_el_or_null)` returning them |
| `status_color_dict` | `{}` | Stored only |

Registry defaults: demo `items`, `selected`, `excluded`, `allow_exclude: true`, `sub_status_map: { role: 'group' }`.

## Members

| Member | Notes |
|---|---|
| `get_value()` | `{ selected, excluded }` copies |
| `set_items(items, selected, excluded)` | Replaces all; does not call `on_change` |
| `set_theme(theme)` | |
| `ListSelector.copy_text(text)` | Static clipboard helper |

## Example

```js
let cols = new ListSelector(document.getElementById('cols'), {
    items: ['id', 'name', 'email'], selected: ['name'], allow_exclude: true,
    on_change: v => console.log(v.selected, v.excluded)
});
```
