# AutoComplete

File: `web/js/widgets/AutoComplete/AutoComplete.js`. Tag: `auto_complete`. Global: `window.AutoComplete`. Element: `<auto-complete>`.

Text input with a filtered dropdown, prefix auto-fill, a clear button and optional restriction to listed values. Uses shadow DOM.

## Creating

```js
let ac = document.createElement('auto-complete');
ac.configure({ placeholder: 'Fruit', allow_free_text: false });
ac.set_completion_list(['Apple', 'Banana']);
parent.appendChild(ac);
```

The `placeholder` attribute is read once in the constructor.

## configure(options)

| Option | Default | Notes |
|---|---|---|
| `placeholder` | `''` | |
| `allow_free_text` | `true` | False blocks text that matches no option |
| `min_chars` | `0` | |
| `max_results` | `Infinity` | |
| `filter_mode` | `'contains'` | `'contains'` or `'prefix'` |
| `on_select` | null | `on_select(value)` on mouse selection |

Registry options: `placeholder`, `items` (demo fruit list), `allow_free_text`, `min_chars`, `max_results: 50`, `filter_mode`, `value`. The instance is the element.

## Members

| Member | Notes |
|---|---|
| `set_completion_list(list)` | Sorted copy |
| `value` | Get or set the text. Setting an unknown value is ignored when free text is off |
| `autocomplete(delta = 0, force = false)` | Recomputes hits; `force` shows the whole list |
| `set_custom_styles(css)` | CSS inside the shadow root |
| `set_theme(theme)` | |

## Events

Both bubble and cross the shadow boundary. `event.detail.value` holds the value.

| Event | When |
|---|---|
| `autocomplete-select` | An option is chosen by Enter, click, or set through `value` |
| `ac-commit` | Enter is pressed |

Keys: Down opens the list, Up and Down move, Enter selects, Escape closes.

## Example

```js
ac.addEventListener('autocomplete-select', e => load_item(e.detail.value));
```
