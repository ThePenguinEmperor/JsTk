# SplitPane

File: `web/js/widgets/SplitPane/SplitPane.js`. Tag: `split_pane` (container). Global: `window.SplitPane`.

Resizable two-pane layout. The primary pane owns a pixel size; the other pane takes the rest. The divider works with mouse, touch and keyboard. Double click toggles collapse.

## Constructor

`new SplitPane(container, options)`. Call `render()` to build and mount; it returns the instance. With a null container, append `.element` yourself.

| Option | Default | Notes |
|---|---|---|
| `orientation` | `'horizontal'` | `'horizontal'` (side by side) or `'vertical'` (stacked) |
| `primary` | `'first'` | `'first'` or `'last'`: which pane owns the size |
| `size` | `240` | Primary size in px |
| `min_size` | `80` | |
| `max_size` | `800` | |
| `handle_size` | `6` | Divider px |
| `keyboard_step` | `16` | Arrow key step px |
| `collapsed` | `false` | |
| `collapsible` | `true` | |
| `storage_key` | null | Saves size and collapsed state in localStorage |
| `on_resize` | null | `on_resize(size, split)` |
| `on_collapse` | null | `on_collapse(collapsed, split)` |

Registry adds `width: 520` and `height: 260` (host size in px; `0` leaves it unset) and uses `size: 200`. `content_container` is `pane_a`.

## Members

| Member | Notes |
|---|---|
| `pane_a`, `pane_b` | First (left/top) and second pane elements |
| `primary_pane`, `element`, `is_collapsed` | Getters |
| `set_size(px)`, `get_size()` | |
| `collapse()`, `expand()`, `toggle()` | |
| `set_theme(theme)` | |

## Example

```js
let host = document.oc.object_generate('split_pane', {
    parent: 'app', row: 1, col: 1, sticky: 'nsew',
    options: { size: 260, storage_key: 'main_split', width: 0, height: 0 }
});
let split = host.widget_instance;
document.oc.object_generate('div', { parent: split.pane_a, row: 1, col: 1, text: 'Nav' });
document.oc.object_generate('div', { parent: split.pane_b, row: 1, col: 1, text: 'Body' });
```
