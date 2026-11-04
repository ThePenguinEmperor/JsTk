# DockWorkspace

File: `web/js/widgets/DockWorkspace/DockWorkspace.js`. Tag: `dock_workspace` (container). Global: `window.DockWorkspace`.

Two-pane split with an always shown primary pane and an optional secondary pane. Pane bodies are reused, so their content survives show, hide, swap and orientation changes.

## Constructor

`new DockWorkspace(parent, options)`. Call `render()` to build and mount; it returns the instance.

| Option | Default | Notes |
|---|---|---|
| `primary_id` | `'log'` | |
| `secondary_id` | `'python'` | |
| `panes` | `{}` | `{ id: { title, icon } }`; title defaults to the id |
| `default_split` | `50` | Primary pane percent |
| `min_split` | `15` | |
| `max_split` | `85` | |
| `orientation` | `'horizontal'` | Or `'vertical'` |
| `show_headers` | `true` | Pane title bars |
| `on_secondary_toggle` | null | `on_secondary_toggle(visible)` |
| `on_layout_change` | null | `on_layout_change({ split_pct, orientation, secondary_visible })` |

Registry defaults: `primary_id: 'main'`, `secondary_id: 'side'`, matching `panes`, `show_secondary: true`, `default_split: 60`, plus `width: 560` and `height: 260` (host px; `0` leaves unset). `content_container` is the primary pane body.

## Members

| Member | Notes |
|---|---|
| `get_pane_body(id)` | Body element; the secondary body exists only after it was shown once |
| `show_secondary()`, `hide_secondary()`, `is_secondary_visible()` | |
| `get_split()`, `set_split(pct)` | Primary percent |
| `set_orientation(o)`, `toggle_orientation()` | |
| `swap_panes()` | Reverses display order |
| `element` | Getter |
| `set_theme(theme)` | |

## Example

```js
let dock = new DockWorkspace(document.getElementById('work'), {
    primary_id: 'log', secondary_id: 'code',
    panes: { log: { title: 'Log' }, code: { title: 'Code' } }
}).render();
dock.show_secondary();
dock.get_pane_body('code').textContent = 'print(1)';
```
