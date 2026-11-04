# TabbedContainer

File: `web/js/widgets/TabbedContainer/TabbedContainer.js`. Tag: `tabbed_container` (container). Global: `window.TabbedContainer`.

Tab bar plus content area. Supports pinning, fixed slots, badges, drag reorder, a right-click tab menu and a split view (uses `DockWorkspace`).

## Constructor

`new TabbedContainer(mount, options)`. Call `render()` before any tab call; it returns the instance.

| Option | Default | Notes |
|---|---|---|
| `id` | null | |
| `allow_pin` | `false` | Pin entries in the tab menu |
| `max_pinned` | null | Pin limit; null is unlimited |
| `max_label_chars` | null | Label cap; longer labels get a tooltip |
| `allow_split` | `true` | Split entries in the tab menu |
| `before_close` | null | `before_close(id)`; return `false` (or a promise of false) to veto |
| `extra_context_menu_items` | null | ContextMenu items, or `fn(tab_id)` returning them |

Registry options: `tabs` (`[{ id, label, ...create_tab options }]`), `id`, `allow_pin: true`, `max_pinned`, `max_label_chars` (`0` is none), `allow_split`, `width: 520`, `height: 260` (host px; `0` leaves unset). `content_container` is the first tab's content.

## Tab methods

Most return the instance.

| Method | Notes |
|---|---|
| `create_tab(id, label, opts)` | `opts`: `pinned`, `closable` (default true), `fixed_pos` (1-based slot), `always_last`, `content` (element), `icon` (HTML), `exclude_from_fast_travel`, `max_label_chars`. Only the first tab auto-activates |
| `delete_tab(id)` | Runs `before_close`; pinned tabs cannot be deleted |
| `switch_tab(id)` | |
| `get_content_div(id)` | Content element, or null |
| `clear_tab(id)` | Empties the content |
| `rename_tab(id, label)` | |
| `move_tab(id, index)` | Regular tabs only |
| `set_pinned(id, flag)`, `set_closable(id, flag)` | |
| `set_tab_badge(id, badge)` | Empty or null removes it |
| `set_tab_tooltip(id, text)` | |
| `get_actions_zone()` | Bar area for your own buttons |
| `set_theme(theme)` | Applied to `mount` |

## Split view

| Method | Notes |
|---|---|
| `split_tab(id, orientation = 'horizontal')` | Opens the split and moves the tab into the second pane |
| `move_to_other_pane(id)` | |
| `close_split()` | Moves all tabs back |
| `is_split()` | |
| `get_split_state()` | null, or `{ orientation, primary_ids, secondary_ids, active_ids, split_pct }` |
| `set_split_state(state)` | Restores a snapshot; null closes |

## Events

Bubbling CustomEvents on the root (listen on `mount`):

| Event | `detail` |
|---|---|
| `tabbed_tab_selected` | `{ id, pane }` |
| `tabbed_list_changed` | `{ action, id, pane, tabs: [{ id, label, pinned, closable, pane }] }` |
| `tabbed_split_changed` | `get_split_state()` result |

## Example

```js
let mount = document.getElementById('tabs');
let tabs = new TabbedContainer(mount, { allow_pin: true }).render();
tabs.create_tab('log', 'Log').create_tab('settings', 'Settings', { always_last: true });
document.oc.object_generate('button', { parent: tabs.get_content_div('log'), row: 1, col: 1, text: 'Clear' });
mount.addEventListener('tabbed_tab_selected', e => console.log(e.detail.id));
```
