# ToggleSwitch

File: `web/js/widgets/ToggleSwitch/ToggleSwitch.js`. Tag: `toggle_switch`. Global: `window.ToggleSwitch`.

## Constructor

`new ToggleSwitch(parent, options)`. Builds at once and appends to `parent` when given.

| Option | Default | Notes |
|---|---|---|
| `label` | `''` | Text beside the switch |
| `checked` | `false` | Initial state |
| `disabled` | `false` | |
| `id` | none | Set on the inner checkbox |
| `title` | none | Tooltip on the root |
| `on_change` | null | `on_change(is_on)` on user toggles |

Registry defaults: `label: 'Enabled'`, `checked: false`, `disabled: false`, `title: ''`.

## Members

| Member | Notes |
|---|---|
| `value` | Getter: current boolean |
| `element` | Getter: root `label` element |
| `set_value(val)` | Sets state without firing `on_change` |
| `set_label(text)` | |
| `set_disabled(val)` | |
| `set_theme(theme)` | Preset name or variables object |

## Example

```js
let sw = new ToggleSwitch(document.getElementById('opts'), {
    label: 'Dark mode', on_change: on => set_app_theme(on ? 'dark' : 'light')
});
```
