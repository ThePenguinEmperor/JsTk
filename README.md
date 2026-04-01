We'll update `README.md` to mention the compliance rules and add the `Documents` folder. Then we'll update `Target.md` to reflect completed items and new changes.

---

### Updated `README.md` (add compliance and folder details)

```markdown
# JsTk – Tkinter‑like Grid System for Web Apps

A JavaScript library that provides a Tkinter‑like widget system for creating grid‑based user interfaces in the browser. Includes a full‑featured interactive tester, a CSS editor, and reusable UI components.

## Features

- **Grid‑based Layout** – Place elements in a CSS Grid using 1‑based rows/columns, spans, and sticky alignment (similar to Tkinter's grid geometry manager).
- **Simple API** – Create any HTML element with a single method: `document.oc.object_generate(tag, params)`.
- **Rich Parameter Support** – Pass text, value, style, events, margins/padding, arbitrary attributes, and DOM properties directly.
- **Interactive Tester** – Build and test layouts visually with an object generator, object list, code generation, and live preview.
- **Built‑in CSS Editor** – Edit any element’s CSS using a modal with collapsible sections for common properties (layout, dimensions, spacing, colors, borders, typography, effects). Custom CSS overrides form inputs.
- **Reusable Widgets** – Standalone components like `CollapsibleSection`, `PopupOverlay`, and `MessageBox` can be used independently.
- **Code Generation** – Automatically generate JavaScript code for your layout; copy, load, or save it.
- **Separate Preview Window** – Test your layout in a new window with a clean template.

## Code Compliance

All code in this repository follows the rules defined in [Documents/copilot-instructions.md](Documents/copilot-instructions.md).  
The project is released under the MIT License; additional revocation terms are detailed in [Documents/REVOCATION.md](Documents/REVOCATION.md).

## Quick Start

1. Include `ObjectCreator.js` in your HTML:

```html
<script src="web/js/ObjectCreator.js"></script>
```

2. Use `document.oc` to create elements:

```javascript
const container = document.getElementById('my-grid');
const btn = document.oc.object_generate('button', {
    parent: container,
    row: 2,
    col: 1,
    text: 'Click me',
    events: { click: () => alert('Hi!') },
    sticky: 'ew',                // stretch horizontally
    padx: 5,
    pady: 5
});
```

3. For more complex layouts, use the built‑in tester (`index.html`) to visually create and manage your UI.

## Tester Application

Open `index.html` in your browser. The tester provides:

- **Left Panel** – Form to add/edit widgets: tag, parent container, ID, class, text, grid position, sticky, margins/padding.
- **Right Panel** – Live preview grid, object list, generated code, and preview CSS editor.
- **CSS Editor** – Modal with collapsible property groups (Layout, Dimensions, Spacing, Colors, Borders, Typography, Effects) and a custom CSS field that overrides form inputs.
- **Code Management** – Copy generated code, load code from textarea, or save to file.
- **Popup Overlay** – Used by the CSS editor; a reusable modal with a close button and scrollable content.
- **Collapsible Sections** – Used in the CSS editor and other areas; expand/collapse to save space.

## Core API

### `document.oc.object_generate(tag, params)`

Creates an element and places it in a grid.

| Parameter | Type | Description |
|-----------|------|-------------|
| `parent` | `HTMLElement` | Parent container (must become a grid) |
| `row`, `col` | `number` | 1‑based grid position |
| `rowSpan`, `colSpan` | `number` | Number of cells to span |
| `sticky` | `string` | `'n'`, `'s'`, `'e'`, `'w'`, `'nsew'` etc. |
| `id`, `class_name` | `string` | HTML attributes |
| `text` | `string` | Inner text content |
| `value` | `string` | Value for inputs, textareas, selects |
| `style` | `string` or `object` | CSS styles |
| `events` | `object` | Event handlers (e.g., `{ click: fn }`) |
| `padx`, `pady` | `number` | Margin in pixels |
| `ipadx`, `ipady` | `number` | Padding in pixels |
| `attributes` | `object` | Any HTML attributes (e.g., `{ type: 'checkbox' }`) |
| `properties` | `object` | DOM properties (e.g., `{ checked: true }`) |

Any additional keys in `params` are treated as HTML attributes.

### Grid Management

- `document.oc.configure_column(parent, col, { weight, minsize, pad })` – Set column weight (fr) etc.
- `document.oc.configure_row(parent, row, { weight, minsize, pad })` – Set row weight.
- `document.oc.remove_widget(widget)` – Remove an element.
- `document.oc.update_widget(widget, props)` – Update properties.

## Standalone Widgets

All widgets are located in `web/js/widgets/` and can be used independently:

- **`PopupOverlay`** – Modal overlay with scrollable content and close button. Accepts a content builder function.
- **`CollapsibleSection`** – Collapsible container with a header and toggle button. Accepts a content builder.
- **`MessageBox`** – Temporary floating message box.
- **`CssEditor`** – Full CSS editing modal that uses `PopupOverlay` and `CollapsibleSection`.

## File Structure

```
JsTk/
├── Documents/ # Compliance rules, license, revocation terms
│ ├── copilot-instructions.md
│ ├── LICENSE
│ └── REVOCATION.md
├── index.html # Main tester interface
├── web/
│ ├── css/
│ │ ├── root_vars.css # CSS variables (colors, fonts, spacing)
│ │ ├── tester.css # Global styles
│ │ └── page_elements/ # CSS per page element
│ │ ├── object_generator.css
│ │ ├── object_list.css
│ │ ├── code_display.css
│ │ ├── preview_grid.css
│ │ └── preview_css_editor.css
│ └── js/
│ ├── ObjectCreator.js # Core library
│ ├── controller.js # Main tester controller
│ ├── page_elements/ # UI components for the tester
│ │ ├── ObjectGenerator.js
│ │ ├── ObjectList.js
│ │ ├── CodeDisplay.js
│ │ ├── CssEditor.js
│ │ ├── PreviewGrid.js
│ │ └── PreviewCssEditor.js
│ └── widgets/ # Reusable widgets (standalone)
│ ├── CollapsibleSection.js
│ ├── PopupOverlay.js
│ └── MessageBox.js
```

## Browser Support

Works in all modern browsers that support ES6 classes, CSS Grid, and Local Storage.

## License

MIT License – see [Documents/LICENSE](Documents/LICENSE) for details.  
Additional revocation terms are in [Documents/REVOCATION.md](Documents/REVOCATION.md).

## Contributing

Feel free to open issues or submit pull requests. All contributions must adhere to the coding standards in `Documents/copilot-instructions.md`.

## Author

**ThePenguinEmperor** – [GitHub](https://github.com/ThePenguinEmperor)
