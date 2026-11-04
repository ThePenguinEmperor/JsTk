---
name: jinker
description: Use when building web UIs or pywebview frontends with the jinker JS library, document.oc (the Tkinter-like ObjectCreator grid builder), WidgetRegistry tags, ThemeManager, or any jinker widget (SplitPane, TabbedContainer, Table, OutputLogger, ContextMenu, UserPrompt and others).
---

# jinker

jinker is a plain-JS UI library. `document.oc` places elements in CSS grids the way Tkinter's `grid()` does. Registered widgets are built by tag through the same call.

## Quick start

Load the library with one parser-blocking script tag. Do not add `async` or `defer`: the loader uses `document.currentScript` and `document.write` to add every module in order.

```html
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>App</title></head>
<body>
    <div id="app" style="height: 100vh;"></div>
    <script src="web/js/Jinker.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            let oc = document.oc;
            oc.configure_column('app', 1, { weight: 1 });
            oc.configure_row('app', 2, { weight: 1 });
            oc.object_generate('h3', { parent: 'app', row: 1, col: 1, text: 'Hello', padx: 8 });
            oc.object_generate('output_logger', { parent: 'app', row: 2, col: 1, sticky: 'nsew', options: { demo_output: false } });
        });
    </script>
</body>
</html>
```

The path in `src` can be anything; modules resolve relative to `Jinker.js`. Each widget links its own CSS next to its JS file. No stylesheet tag is needed.

## OC essentials

`document.oc.object_generate(tag, params)` creates an element, applies params and places it in `params.parent` (an element or an id; default `document.body`). The parent becomes `display: grid`. It returns the element.

| Param | Meaning |
|---|---|
| `row`, `col` | 1-based cell |
| `row_span`, `col_span` | Cells to span |
| `sticky` | Any of `n s e w`. `ew` stretches horizontally, `nsew` fills the cell, empty centers |
| `padx`, `pady` | Margin in px: a number or `[start, end]` |
| `ipadx`, `ipady` | Padding in px: a number or `[start, end]` |
| `id`, `class_name`, `text`, `value` | Basic element fields |
| `style` | CSS string or object (kebab or camel keys) |
| `events` | `{ click: fn, input: fn }` |
| `attributes`, `properties` | Extra attributes and DOM properties |
| `options` | Widget options, for registered tags only |

Any other primitive key is set as an HTML attribute.

```js
let oc = document.oc;
oc.configure_grid('form', { gap: 6 });
oc.configure_column('form', 2, { weight: 1, minsize: 120 });
oc.object_generate('label', { parent: 'form', row: 1, col: 1, text: 'Name', sticky: 'w' });
let name = oc.object_generate('input', { parent: 'form', row: 1, col: 2, sticky: 'ew', id: 'name_in' });
oc.object_generate('button', {
    parent: 'form', row: 2, col: 1, col_span: 2, sticky: 'e', text: 'Save', padx: [0, 4],
    events: { click: () => console.log(name.value) }
});
```

Other calls:

```js
oc.update_widget('name_in', { value: 'abc', row: 3 });   // also moves it
oc.bind(el, 'click', fn); oc.unbind(el, 'click');
let el = oc.grid_forget('name_in'); oc.grid_restore(el);
oc.grid_info(el);                       // { parent, row, col, row_span, col_span, sticky }
oc.grid_slaves('form', { row: 1 });     // children covering row 1
oc.remove_widget(el);                   // removes element, children and tracked handlers
let made = oc.build_layout('app', [     // tree from specs, returns { id: element }
    { tag: 'div', id: 'side', row: 1, col: 1, children: [
        { tag: 'button', id: 'b1', row: 1, col: 1, text: 'One' }
    ] }
]);
```

Full API: `references/ObjectCreator.md`.

## Placing a registered widget and nesting children

A registered tag builds the widget inside a placed host div:

```js
let host = document.oc.object_generate('split_pane', {
    parent: 'app', row: 1, col: 1, sticky: 'nsew',
    options: { orientation: 'horizontal', size: 240, width: 0, height: 0 }
});
let split = host.widget_instance;          // the SplitPane instance
document.oc.object_generate('button', { parent: host.content_container, row: 1, col: 1, text: 'Left' });
document.oc.object_generate('button', { parent: split.pane_b, row: 1, col: 1, text: 'Right' });
```

- `host.widget_instance` is the instance (or element) the widget built.
- `host.content_container` is where children go. It is set only for container widgets (`split_pane`, `dock_workspace`, `tabbed_container`); otherwise it is null.
- `build_layout` nests `children` into `content_container` automatically.
- The host gets the classes `oc_widget oc_widget_<tag>` plus your `class_name`. `text` is ignored for widget tags.
- Missing options fall back to the registry defaults, which are demo values. Pass every option you care about.
- You can also skip the registry and call a constructor directly, for example `new ToggleSwitch(parent_el, { label: 'On' })`.

## Theming

`ThemeManager` holds CSS-variable themes. Widget CSS reads these variables and has light fallbacks.

```js
set_app_theme('dark');                          // THEMES.dark on <html>
set_app_theme({ '--accent': '#e11d48' });  // partial override
host.widget_instance.set_theme('light');        // one widget only
let z = get_next_z_index();                     // stacking for your own floating layers
```

- `THEMES` (`window.THEMES`) has `light` and `dark`. Keys include `--surface`, `--surface_secondary`, `--text_primary`, `--text_muted`, `--border_light`, `--accent`, `--danger`, `--success`, `--radius`, `--font_ui`, `--font_mono`.
- `set_theme(theme)` takes a preset name or a variables object. Most widgets have it; `HintPopup.set_theme` is static.
- `ThemeManager.apply(el, theme)` themes any element subtree.

## Widget catalog

| Widget | Tag | What it is | Reference |
|---|---|---|---|
| AnimatedGifButton | `animated_gif_button` | Icon button that animates on hover | references/AnimatedGifButton.md |
| AppStore | none | Page-wide key/value store with subscribe | references/AppStore.md |
| AutoComplete | `auto_complete` | Input with filtered suggestion dropdown | references/AutoComplete.md |
| Changelog | `changelog` | "What's New" release notes modal | references/Changelog.md |
| CollapsibleSection | none | Header that shows or hides a content block | references/CollapsibleSection.md |
| ContextMenu | `context_menu` | Right-click menu with submenus and search | references/ContextMenu.md |
| DockWorkspace | `dock_workspace` | Primary pane plus optional secondary pane | references/DockWorkspace.md |
| DynamicFilter | `dynamic_filter` | Reorderable list of column filters | references/DynamicFilter.md |
| GuidedTour | `guided_tour` | Step-by-step highlight walkthrough | references/GuidedTour.md |
| HintPopup | none | Themed replacement for `title` tooltips | references/HintPopup.md |
| InputWithClr | `input_with_clr` | Text input with a clear button | references/InputWithClr.md |
| IterableEditor | `iterable_editor` | Editor for a list or dict value | references/IterableEditor.md |
| ListSelector | `list_selector` | Searchable select/exclude list | references/ListSelector.md |
| MessageBox | none | Toast-style message near an element | references/MessageBox.md |
| OutputLogger | `output_logger` | Console log viewer with ANSI colors | references/OutputLogger.md |
| PopupOverlay | none | Modal overlay with scrollable content | references/PopupOverlay.md |
| ProgressBar | `progress_bar` | Determinate or indeterminate progress | references/ProgressBar.md |
| QueueTray | `queue_tray` | Horizontal task queue strip | references/QueueTray.md |
| SplitPane | `split_pane` | Resizable two-pane layout | references/SplitPane.md |
| TabbedContainer | `tabbed_container` | Tabs with pinning, badges and split view | references/TabbedContainer.md |
| Table | `table` | Data grid on AG Grid with filters | references/Table.md |
| TickerBanner | `ticker_banner` | Scrolling notification bar | references/TickerBanner.md |
| ToggleSwitch | `toggle_switch` | On/off switch | references/ToggleSwitch.md |
| UserPrompt | `user_prompt` | Modal question, input or password prompt | references/UserPrompt.md |

Widgets without a tag are used through their class directly.

## Adding a widget to the registry

1. Create `web/js/widgets/<Name>/<Name>.js` (and `<Name>.css` if needed).
2. Add `'widgets/<Name>/<Name>.js'` to `JinkerLoader.FILES` in `web/js/Jinker.js`, after any widget it depends on.
3. Register at the end of the file:

```js
window.MyWidget = MyWidget;
if (window.WidgetRegistry) {
    WidgetRegistry.register('my_widget', {
        label: 'My Widget',          // tester display name
        category: 'inputs',          // tester group
        container: false,            // true if children can be placed inside
        options: [
            { name: 'label', type: 'string', default: 'Hi' },
            { name: 'size', type: 'select', default: 'md', choices: ['sm', 'md', 'lg'] },
            { name: 'items', type: 'json', default: [] }
        ],
        build: (host, options) => new MyWidget(host, options)
    });
}
```

Entry contract:
- `tag` is snake_case. Registering the same tag again replaces the entry.
- `build(host, options)` is required. `host` is the already placed div. `options` has defaults filled in.
- `build` returns the instance, or `{ instance, content_container }` for containers.
- If `container` is true and no `content_container` is returned, the host itself is used.
- Option `type` is `string`, `number`, `bool`, `select` (with `choices`) or `json`. The tester builds its form from this list.
- A `build` that throws is logged, and the host shows `<tag> failed to build`.
- Recommended instance API: `set_theme(theme)` that calls `ThemeManager.apply(root, theme)`.

## Tester

Open `index.html` in a browser. Pick a tag, set its options in the generated form, choose a parent container, set grid fields, and add it. The preview shows the result, the object list tracks it, and the code panel can copy, save, load or clear the generated `document.oc` code.

## Common pitfalls

- `Jinker.js` with `async`, `defer` or injected by script fails: the loader needs `document.write` during parsing.
- Code that uses jinker must run after the loader tag. Wrap DOM work in `DOMContentLoaded`, since modules load through `document.write`.
- Hosts need a height. `split_pane`, `dock_workspace`, `tabbed_container`, `table` and `output_logger` fill their host; give the host or its grid row a size (`configure_row(..., { weight: 1 })` plus `sticky: 'nsew'` and a sized parent).
- `split_pane`, `dock_workspace` and `tabbed_container` registry options `width` and `height` default to 520 and 260 px. Pass `0` to let the grid size the host.
- Tracks without a `weight` are `auto`. Use `weight` to control how free space is shared, and `minsize` to keep a track from shrinking.
- `grid_forget` returns the element. Keep it: it is detached and `getElementById` will not find it.
- `content_container` is null for non-container widgets. Do not place children there.
- `Table` loads AG Grid from cdn.jsdelivr.net. Offline apps must set `ag_grid_cdn` to a local copy.
- Registry option defaults are demo data. Pass real `items`, `data` or `messages`.
- `UserPrompt` options are a `{ label: value }` map, not an array.
