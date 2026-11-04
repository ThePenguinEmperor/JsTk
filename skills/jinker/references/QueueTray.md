# QueueTray

File: `web/js/widgets/QueueTray/QueueTray.js`. Tag: `queue_tray`. Globals: `QueueTray`, `QueueTrayElement`, `queue_update(tasks)`. Element: `<queue-tray>`.

Horizontal task queue strip with chips, bundles, drag reorder and a minimized tag. `set_items` reconciles the full queue state and reuses chips by id.

## Constructor

`new QueueTray(options)` creates a detached `<queue-tray>`. `render()` returns it; you append it.

| Option (hook) | Notes |
|---|---|
| `on_item_activate` | `on_item_activate(id)` on chip double click |
| `on_item_cancel` | `on_item_cancel(id)` on the cancel button; replaces local removal |
| `on_reorder` | `on_reorder(ids)` after a drop |
| `host_bridge` | Object with `remove_queue_item(id)` returning `{ success, tasks }` and `reorder_queue(ids)`; used when the matching hook is not set |

Without hooks, cancel removes the chip locally.

## Item shape

| Field | Notes |
|---|---|
| `id` | Required, matched as a string |
| `title` | Shown truncated to 15 characters |
| `status` | `idle` (default), `running` or `scheduled` |
| `type: 'bundle'`, `items` | Bundle with child items |
| `description`, `action` | Shown in the tooltip |
| `show_cancel` | Default true |

The first item cannot be cancelled or moved. Scheduled items cannot be dragged.

## Members

| Member | Notes |
|---|---|
| `set_items(items)` | Full queue state |
| `remove_first_item()`, `remove_item(index)` | Local only |
| `minimize()` | |
| `set_theme(theme)` | |
| `element.configure(hooks)` | Change hooks later |

`window.queue_update(tasks)` calls `set_items` on the first `<queue-tray>` in the page; handy from pywebview `evaluate_js`.

Registry options: `items` (demo), `minimized`.

## Example

```js
let tray = new QueueTray({ on_item_cancel: id => pywebview.api.cancel(id) });
document.getElementById('footer').appendChild(tray.render());
tray.set_items([{ id: 1, title: 'Build', status: 'running' }, { id: 2, title: 'Test' }]);
```
