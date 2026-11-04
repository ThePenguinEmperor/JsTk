# HintPopup

File: `web/js/widgets/HintPopup/HintPopup.js`. No tag. Global: `window.HintPopup`.

Page-wide singleton that replaces native `title` tooltips with a themed panel. It activates itself on load. Static only.

## Behavior

- Hovering any element with a `title` shows the hint after `HintPopup.DELAY_MS` (350 ms).
- The panel goes below the element, or above when there is no room.
- Scrolling or leaving the element hides it.
- `data-hint-type` on the element picks a style: `info`, `warning`, `error` or `success`.

## Static members

| Member | Notes |
|---|---|
| `DELAY_MS` | Hover delay in ms |
| `show(text, anchor, { type })` | Shows a hint now next to `anchor` |
| `cancel()` | Hides the hint |
| `set_type(el, type)` | Sets or removes `data-hint-type` |
| `set_theme(theme)` | Themes the panel only |
| `init()` | Runs once automatically |

## Example

```js
let btn = document.oc.object_generate('button', { parent: 'app', row: 1, col: 1, text: 'Delete', title: 'Removes the file' });
HintPopup.set_type(btn, 'warning');
HintPopup.show('Saved', btn, { type: 'success' });
```

## Flavors

Set `data-hint-type` (or call `HintPopup.set_type(el, type)`) to `info`, `success`, `warning` or `error` to colour the hint. `HintPopup.show(text, anchor, { type })` shows one at once.
