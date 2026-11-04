# ContextMenu

File: `web/js/widgets/ContextMenu/ContextMenu.js`. Tag: `context_menu`. Global: `window.ContextMenu`.

Custom right-click menu bound to an element. Supports icons, async actions, nested submenus, keyboard navigation, search and per-type extra items.

## Constructor

`new ContextMenu(bound_el, opts)`. Throws when `bound_el` is not an element.

| Option | Default | Notes |
|---|---|---|
| `enable_search` | `false` | Search box filtering items by label |
| `theme_class` | `''` | Extra class on the menu |
| `custom_css` | none | CSS text injected as a style element |
| `on_before_show` | null | `on_before_show(item_type, event)` before opening; call `set_items` here for dynamic menus |

Registry options: `area_text`, `enable_search`, `theme_class`, `items` (demo). The tag builds a right-click area.

## Item definition

| Field | Notes |
|---|---|
| `label` | Text |
| `html` | HTML content instead of `label` |
| `icon` | Text, HTML string (starts with `<`) or element |
| `action` | `action()` on activate |
| `async` | `true`: shows a spinner until the returned promise settles |
| `disabled` | |
| `submenu` | Array of items |
| `type: 'separator'` | Divider |
| `type: 'group', items` | Grouped items |

## Members

| Member | Notes |
|---|---|
| `set_items(items)`, `add_item(item)`, `remove_item(label)`, `clear_items()` | Base items |
| `add_type_items(type, items)`, `remove_type_items(type)`, `has_type(type)` | Extra items shown after a separator when the clicked element (or an ancestor) has `data-type="<type>"` or class `<type>` |
| `show(x, y)` | Opens at page coordinates |
| `hide()`, `hide_tree()` | |
| `destroy()` | Removes listeners; the instance is unusable afterwards |
| `set_theme(theme)` | Submenus inherit it |
| `apply_custom_css(css)` | |

Keys: arrows move and open or close submenus, Enter or Space activates, Escape closes.

## Example

```js
let menu = new ContextMenu(document.getElementById('files'), { enable_search: true });
menu.set_items([
    { label: 'Open', icon: 'O', action: () => open_file() },
    { type: 'separator' },
    { label: 'More', submenu: [{ label: 'Rename', action: rename }] },
    { label: 'Upload', async: true, action: () => upload() }
]);
menu.add_type_items('file_row', [{ label: 'Delete', action: delete_file }]);
```
