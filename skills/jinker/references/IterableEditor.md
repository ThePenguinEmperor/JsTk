# IterableEditor

File: `web/js/widgets/IterableEditor/IterableEditor.js`. Tag: `iterable_editor`. Global: `window.IterableEditor`.

Editor for a list or dict of JSON-compatible values. Popup mode has Apply/Cancel, a code panel, an add form and nested child editors. Inline mode is a compact list. Accepts JSON and Python literal text (`None`, `True`, single quotes).

## Constructor

`new IterableEditor(container, mode, current_val, config)`. Renders nothing until `render()` or `open()`.

- `container`: inline host and `set_theme` target; may be null for popups.
- `mode`: `'list'`; anything else is dict.

| Config | Default | Notes |
|---|---|---|
| `display_mode` | popup | `'inline'` for the inline list |
| `title` | `'Edit list'` / `'Edit dict'` | |
| `on_change` | null | `on_change(data)` on every edit |
| `on_apply` | null | `on_apply(data)` on Apply; inline mode calls it on every committed change |
| `show_item_numbers` | `true` | List mode |
| `item_number_base` | `1` | `0` or `1` |
| `validate_item` | null | `validate_item(value, key)`; return `true` to accept or a message string to reject |
| `row_renderer` | null | `row_renderer(key, value, index, is_inline)` returns a row element, or null for the built-in row |
| `custom_add_form_factory` | null | `factory(push)` returns an element; `push(value)` for lists, `push(key, value)` for dicts |

Registry options: `mode: 'list'`, `display_mode: 'inline'`, `title`, `value` (demo), `show_item_numbers`, `item_number_base`. Popup mode builds an "Open editor" button.

## Members

| Member | Notes |
|---|---|
| `render()` / `open()` | Builds the view; returns the instance |
| `close()` | Closes without applying |
| `add(val)` | List mode |
| `add_entry(key, val)` | Dict mode |
| `edit(idx_or_key, val)`, `remove(idx_or_key)`, `reorder(from, to)` | |
| `get_data()`, `get_list()`, `get_dict()`, `data` | Deep copies |
| `set_theme(theme)` | |

## Example

```js
let ed = new IterableEditor(null, 'dict', { host: 'srv1', port: 22 }, {
    title: 'Connection', on_apply: data => save_config(data)
});
ed.open();
```
