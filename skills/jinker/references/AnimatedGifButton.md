# AnimatedGifButton

File: `web/js/widgets/AnimatedGifButton/AnimatedGifButton.js`. Tag: `animated_gif_button`. Global: `window.AnimatedGifButton`.

Static utility, never instantiated. The button shows a still image at rest and plays an animated GIF or SVG while hovered.

## Static methods

`AnimatedGifButton.create(opts)` creates a button through `document.oc` and returns it, or null without `parent`.

| Option | Default | Notes |
|---|---|---|
| `parent` | required | Grid parent element or id |
| `gif_src` | none | Animated image URL (data and blob URLs work) |
| `static_src` | `gif_src` | Image shown at rest |
| `fallback_html` | none | Button content when `gif_src` is missing |
| `class_name` | `'animated_gif_btn btn'` | `animated_gif_btn` is always added |
| `hint` | `''` | Button `title` |
| `id`, `row`, `col`, `sticky`, `events` | | Passed to `object_generate` |

`AnimatedGifButton.attach(btn, gif_src, static_src, fallback_html)` adds the hover behavior to an existing button. Calling it twice on one button does nothing.

`AnimatedGifButton.demo_image(animated)` returns a demo SVG data URI.

Registry options: `gif_src`, `static_src` (demo SVGs), `hint: 'Hover to animate'`, `class_name`, `fallback_html: ''`. The instance is the button element.

## Example

```js
AnimatedGifButton.create({
    parent: 'toolbar', row: 1, col: 1, hint: 'Refresh',
    gif_src: 'img/refresh.gif', static_src: 'img/refresh.png',
    events: { click: reload }
});
```
