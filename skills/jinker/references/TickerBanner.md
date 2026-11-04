# TickerBanner

File: `web/js/widgets/TickerBanner/TickerBanner.js`. Tag: `ticker_banner`. Global: `window.TickerBanner`.

Slim notification bar that scrolls messages like a news ticker. Dismissing it leaves a restore strip. Hover shows all messages in a hint; right-click pins the hint.

## Constructor

`new TickerBanner(container, config)`. Call `render()` to build; it returns the instance.

| Option | Default | Notes |
|---|---|---|
| `severity` | `'warning'` | `'info'`, `'warning'` or `'error'` |
| `on_right_click` | null | `on_right_click(messages, event)` |
| `actions` | `[]` | `[{ label, icon (HTML), title, on_click(event, banner) }]` buttons |

Registry options: `severity: 'warning'`, `messages` (demo list).

## Members

Methods return the instance.

| Member | Notes |
|---|---|
| `render()` | |
| `show(messages)` | A string or a list; empty acts like `hide()` |
| `hide()` | Clears messages |
| `dismiss()` | Hides the bar and shows the restore strip |
| `restore()` | Brings the bar back |
| `is_visible`, `messages` | Getters |
| `set_theme(theme)` | |

## Example

```js
let banner = new TickerBanner(document.getElementById('top'), {
    severity: 'error', actions: [{ label: 'Retry', on_click: () => reconnect() }]
}).render();
banner.show(['Connection lost', 'Retrying in 5 s']);
```
