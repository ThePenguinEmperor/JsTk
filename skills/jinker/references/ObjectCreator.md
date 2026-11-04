# ObjectCreator (document.oc)

File: `web/js/ObjectCreator.js`. Singleton: `document.oc`. `new ObjectCreator()` returns the same instance.

Wherever a call takes `parent` or `widget`, pass an element or an element id string.

## object_generate(tag, params = {})

Creates `tag`, applies params, places it in a grid parent and returns it.

| Param | Type | Notes |
|---|---|---|
| `parent` | element or id | Default `document.body`. Becomes `display: grid`. Logs `[oc] parent_not_found` and returns the unplaced element when missing |
| `row`, `col` | number | 1-based start cell |
| `row_span`, `col_span` | number | Cells to span |
| `sticky` | string | Letters `n s e w`. `ew` stretches horizontally, `ns` vertically, `nsew` both; one letter aligns to that side; empty centers |
| `id`, `class_name` | string | |
| `text` | string | Sets `textContent` |
| `value` | any | Property on input, textarea and select; attribute elsewhere |
| `style` | string or object | `'color: red; width: 10px'` or `{ color: 'red', 'font-size': '12px' }` |
| `events` | object | `{ event_name: handler }`, tracked for `unbind` |
| `padx`, `pady` | number or `[start, end]` | Margins in px (left/right, top/bottom) |
| `ipadx`, `ipady` | number or `[start, end]` | Paddings in px |
| `pad_x`, `pad_y`, `ipad_x`, `ipad_y` | | Aliases of the above |
| `attributes` | object | Primitive values become attributes |
| `properties` | object | Assigned to the element |
| `options` | object | Widget options for registered tags |

Any other primitive key is set as an attribute (`placeholder: 'Name'`, `type: 'checkbox'`).

Registered tags (see `WidgetRegistry`) create a placed `div` host with classes `oc_widget oc_widget_<tag>`, build the widget inside it and return the host. `host.widget_instance` is the instance; `host.content_container` is the child area or null. `text` is ignored for these tags.

```js
let btn = document.oc.object_generate('button', {
    parent: 'toolbar', row: 1, col: 3, sticky: 'e', text: 'Run',
    padx: [4, 0], ipadx: 10, style: { fontWeight: 'bold' },
    events: { click: run_job }, title: 'Start the job'
});
```

## build_layout(parent, specs)

Builds a tree from `[{ tag, children: [...], ...params }]`. Children go into the created element, or its `content_container` for widget hosts. Returns `{ id: element }` for every spec with an id.

```js
let els = document.oc.build_layout('app', [
    { tag: 'tabbed_container', id: 'tabs', row: 1, col: 1, sticky: 'nsew',
      options: { tabs: [{ id: 'main', label: 'Main' }], width: 0, height: 0 },
      children: [{ tag: 'button', id: 'go', row: 1, col: 1, text: 'Go' }] }
]);
```

## Grid configuration

| Call | Notes |
|---|---|
| `configure_column(parent, col, { weight = 0, minsize = 0, pad = 0 })` | `weight` in fr; `minsize` and `pad` in px. Pad is added on both sides to the minimum size |
| `configure_row(parent, row, { weight = 0, minsize = 0, pad = 0 })` | Same for rows |
| `configure_grid(parent, { gap, gap_x, gap_y })` | Gaps in px; `gap` sets both axes |

A track with `weight > 0` becomes `minmax(min, <weight>fr)`; with only a minimum it becomes `minmax(min, auto)`; otherwise `auto`. Templates are rebuilt on every place, move or remove.

## Widget management

| Call | Returns | Notes |
|---|---|---|
| `update_widget(widget, props)` | | Accepts `text`, `value`, `class_name`, `id`, `style` (merged), pads, `events` (added), `attributes`, `properties`, and `row`, `col`, `row_span`, `col_span`, `sticky` (moves it) |
| `remove_widget(widget)` | | Removes the element and drops tracked handlers on it and its descendants |
| `grid_forget(widget)` | element or null | Detaches but keeps the placement. Keep the returned element |
| `grid_restore(el)` | | Re-attaches a forgotten element at its old cell |
| `grid_info(widget)` | object or null | `{ parent, row, col, row_span, col_span, sticky }` |
| `grid_slaves(parent, { row, col })` | element[] | Children covering the cell; omit `row` or `col` for a whole column or row |

## Events

| Call | Notes |
|---|---|
| `bind(widget, event_name, handler)` | `addEventListener` plus tracking |
| `unbind(widget, event_name?, handler?)` | One handler, all of one event, or all tracked handlers |

Only handlers added through `bind` or `events` are tracked.

## Command strings

| Call | Returns |
|---|---|
| `parse_command_string(text)` | Params with a `tag` key, or null |
| `validate_command_string(text)` | `{ valid, errors, params }` |

Both take text of the form `document.oc.object_generate('tag', { ... });`. The object literal is evaluated with `new Function`, so pass trusted text only. Validation requires `row` and `col`, checks spans, pads and `sticky`, and requires `parent` to be an id string.
