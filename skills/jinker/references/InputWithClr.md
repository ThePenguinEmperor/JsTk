# InputWithClr

File: `web/js/widgets/InputWithClr/InputWithClr.js`. Tag: `input_with_clr`. Global: `window.InputWithClr`.

Single-line input with a clear button that shows on hover while the field has text.

## Constructor

`new InputWithClr(container, opts)`. Replaces the container's children with the widget.

| Option | Default | Notes |
|---|---|---|
| `placeholder` | `''` | |
| `value` | `''` | |
| `type` | `'text'` | Input type |
| `class_name` | `''` | Added to the wrapper; also `<class>_input` and `<class>_clr` on the parts |
| `input_attrs` | none | `{ name: value }`; `true` sets an empty attribute, `false` skips. Without it, `autocomplete="off"` is set |
| `on_input` | null | `on_input(value)` on typing, clear and `set_value` |
| `custom_css` | none | CSS text injected as a new style element |
| `replace_input` | none | An existing `input` to replace in place; its placeholder and value are reused |

Registry defaults: `placeholder: 'Search...'`, `value: 'Hover to clear me'`, `type: 'text'`, `class_name: ''`.

## Members

| Member | Notes |
|---|---|
| `input` | The input element |
| `get_value()` | |
| `set_value(val)` | Fires `on_input` |
| `set_disabled(flag)` | Hides the clear button while disabled |
| `apply_custom_css(css)` | Adds one more style element per call |
| `set_theme(theme)` | Applied to the container |

## Example

```js
let search = new InputWithClr(document.getElementById('search_box'), {
    placeholder: 'Filter...', on_input: text => filter_rows(text)
});
```
