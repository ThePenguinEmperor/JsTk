# PopupOverlay

File: `web/js/widgets/PopupOverlay.js`. No tag. Global class `PopupOverlay`.

Modal overlay with a scrollable content panel and a close button. Escape, the close button or a click outside closes it.

## Constructor

`new PopupOverlay(content_builder, options, on_close)`.

- `content_builder(container)` fills the content element when the popup opens.
- `on_close()` runs when it closes.

| Option | Default | Notes |
|---|---|---|
| `width`, `height` | none | Minimum size in px, used only when within the max limits |
| `min_width`, `min_height` | none | CSS values |
| `max_width` | `'90%'` | |
| `max_height` | `'85%'` | |

## Members

| Member | Notes |
|---|---|
| `open()` | Builds on first call and shows |
| `close()` | Calls `on_close` and destroys |
| `destroy()` | Removes without `on_close` |
| `content_container` | Content element while open |

Each close destroys the DOM; the next `open()` rebuilds it with `content_builder`.

## Example

```js
let popup = new PopupOverlay(box => {
    document.oc.object_generate('h3', { parent: box, row: 1, col: 1, text: 'Settings' });
}, { width: 400 }, () => console.log('closed'));
popup.open();
```
