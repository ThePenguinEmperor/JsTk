# MessageBox

File: `web/js/widgets/MessageBox.js`. No tag. Global: `window.MessageBox`.

Toast-style message, fixed on the page, positioned next to a target element or centered. Closes on its close button or after a timeout.

## Constructor

`new MessageBox(options)`, then `show()`.

| Option | Default | Notes |
|---|---|---|
| `text` | `''` | Plain text, newlines kept |
| `type` | `'info'` | `info`, `success`, `error` or `warning` |
| `timeout` | `30000` | ms; `0` keeps it open |
| `target` | null | Element to position against; null centers |
| `position` | `'top'` | `top`, `bottom`, `left`, `right` or `over` |
| `css` | `{}` | `{ container, text, close_button }` style objects |

## Members

| Member | Notes |
|---|---|
| `show()` | Builds, places and starts the timeout |
| `destroy()` | Removes it |
| `MessageBox.info(text, target, opts)` | Static; also `success`, `error`, `warning`. Returns the shown instance |

## Example

```js
MessageBox.success('Saved', document.getElementById('save_btn'), { timeout: 3000, position: 'bottom' });
```
