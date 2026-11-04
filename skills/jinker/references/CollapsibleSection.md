# CollapsibleSection

File: `web/js/widgets/CollapsibleSection.js`. No tag. Global class `CollapsibleSection`.

Bordered section with a clickable header that shows or hides its content. Starts collapsed.

## Constructor

`new CollapsibleSection(title, content_builder, options)`. Call `build(parent)` to create and append it.

- `content_builder(content_div)` fills the content once during `build`.

| Option | Default | Notes |
|---|---|---|
| `id` | null | Section id |
| `class_name` | null | Extra class |
| `margin` | `{ x: 0, y: 0 }` | px |

## Members

| Member | Notes |
|---|---|
| `build(parent)` | |
| `expand()`, `collapse()` | |
| `destroy()` | Removes it |
| `container`, `contentDiv`, `isCollapsed` | Fields |

The content area scrolls past 400 px.

## Example

```js
let sec = new CollapsibleSection('Advanced', div => {
    document.oc.object_generate('input', { parent: div, row: 1, col: 1, placeholder: 'Timeout' });
}, { margin: { x: 0, y: 4 } });
sec.build(document.getElementById('form'));
sec.expand();
```

## Registry tag

`document.oc.object_generate('collapsible_section', { parent, row, col, sticky, options: { title: 'Details', expanded: true } })` builds a section whose host is a container widget: children placed with `parent: host` go inside the section body. Options: `title` (string) and `expanded` (bool, default true in the registry). The class itself starts collapsed unless `options.expanded` is true.

## Size rules

- Header: always 40 px tall; the title stays on one line.
- Default width: the width of the title row. Wide content never widens the section; the body scrolls sideways instead.
- Default height: fits the content.
- `max_height` (px): the body stops growing at this height and scrolls vertically.
- `max_width` (px): the section may grow with its content up to this width, then the body scrolls sideways.
- `full_width` (bool): fills the container width instead of the title width.
