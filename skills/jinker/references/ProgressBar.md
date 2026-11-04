# ProgressBar

File: `web/js/widgets/ProgressBar/ProgressBar.js`. Tag: `progress_bar`. Global: `window.ProgressBar`.

## Constructor

`new ProgressBar(container, opts)`. Builds nothing until `render()`, which appends to `container` and returns the instance.

| Option | Default | Notes |
|---|---|---|
| `value` | `0` | Fraction 0 to 1, clamped |
| `indeterminate` | `false` | Animated mode |
| `label` | `''` | |
| `show_percent` | `true` | |
| `state` | `'idle'` | `idle`, `running`, `success` or `error` (color) |
| `compact` | `false` | Track only, no label row |
| `on_click` | null | `on_click(event, bar)`; also makes the bar clickable |

Registry defaults: `value: 0.45`, `label: 'Uploading files'`, `state: 'running'`, `indeterminate: false`, `show_percent: true`, `compact: false`.

## Members

Setters return the instance for chaining.

| Member | Notes |
|---|---|
| `render()` | Builds once |
| `set_progress(value)` | Also leaves indeterminate mode |
| `set_indeterminate(flag)` | |
| `set_label(text)` | |
| `set_state(state)` | Unknown values become `idle` |
| `reset()` | Value 0, state `idle`, not indeterminate; keeps the label |
| `set_theme(theme)` | Held until render if called earlier |
| `value`, `state`, `is_indeterminate`, `element` | Getters |

## Example

```js
let bar = new ProgressBar(document.getElementById('status'), { label: 'Upload', state: 'running' }).render();
bar.set_progress(0.6);
bar.set_state('success').set_label('Done');
```
