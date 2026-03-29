# ObjectCreator Tester – Rebuild Specification

## Overview

The **ObjectCreator Tester** is a visual tool for designing and testing the `ObjectCreator` API – a JavaScript library that provides Tkinter‑like grid‑based widget placement.  
The tester itself must be built **using the ObjectCreator API**, serving as both a demonstration and a test harness.

---

## Core Features (Functional Requirements)

### 1. Layout
- **Two‑column responsive layout** (CSS Grid or Flexbox).
  - **Left panel**: Object Generator – inputs to create new widgets.
  - **Right panel**: Layout Test – visual preview, object list, code generation, CSS controls.
- **Fixed height** (e.g. `calc(100vh - 80px)`) to fit screen without overflow.

### 2. Object Generator (Left Panel)

#### 2.1. Basic Widget Properties
- **HTML Tag**: Dropdown with options: `button`, `input`, `label`, `div`, `p`, `textarea`, `select`, `span`, `collapsible`, `tabs`.
- **Parent Container**: Dropdown listing all container elements that can host new widgets (initially only the preview grid; later includes any `div`, collapsible, or tabs created).
- **ID**: Text input for unique identifier (auto‑generated if empty).
- **Class Name**: Text input for CSS classes.

#### 2.2. Grid Positioning (1‑based)
- **Row**, **Column** (numbers, default 1).
- **Row Span**, **Column Span** (numbers, optional).
- **Sticky** (like Tkinter): four checkboxes (N, S, E, W) that combine into a sticky string (e.g., `'nsew'`).

#### 2.3. Padding / Margin (Tkinter‑style)
- **Pad X**, **Pad Y** – external margins (px).
- **Internal Pad X**, **Internal Pad Y** – internal padding (px).

#### 2.4. CSS Editor Integration
- **CSS Editor button** (same line as Sticky group) opens a modal to edit any CSS properties of the **currently selected object** (or a new object before creation).
- The CSS editor must support a comprehensive set of properties (Layout, Spacing, Borders, Box Shadow, Colors, Typography, Effects, Flexbox/Grid) with live preview, unit selectors, and a search bar.

#### 2.5. Action Buttons
- **Add Object** – creates a widget with current form values and places it in the chosen parent grid.
- **Save Changes** / **Cancel Edit** – appear when editing an existing object.

### 3. Layout Test (Right Panel)

#### 3.1. Visual Preview
- A resizable grid container (`resize: both`) that displays all created widgets.
- Each widget shows its basic styling and has a border to indicate grid cells.
- The grid automatically adjusts to the number of rows/columns occupied by widgets.

#### 3.2. Object Selector
- List of all created widgets, showing **tag**, **id**, **row**, **column**.
- Each item has **Edit** and **Delete** buttons.
  - **Edit**: populates the left panel with the widget’s parameters and switches to edit mode.
  - **Delete**: removes the widget and updates the grid.

#### 3.3. Generated Code Display
- A textarea showing the JavaScript code that would recreate the current layout.
- **Copy Code** button – copies the code to clipboard (visual flash on button).
- **Load Code** button – clears the current layout and executes the code from the textarea, rebuilding the layout.
- **Save Code to File** button – downloads the code as a `.js` file.

#### 3.4. Preview Grid CSS Editor
- A separate textarea to edit the CSS of the preview grid itself (background, border, etc.).
- **Copy CSS**, **Apply CSS**, **Load CSS from Code** buttons.

### 4. Additional Features

#### 4.1. Grid Configuration Modal
- Opened by a gear icon (⚙️) in the Object Generator header.
- Displays a table of rows and columns currently used in the preview grid.
- Allows setting **row weights** and **column weights** (0 = auto, >0 = fr).
- **Apply Weights** button updates the grid’s template.

#### 4.2. Separate Window Preview
- A magnifying glass icon (🔍) next to the preview title.
- Opens a new browser window containing a copy of the current preview grid.
- The separate window uses a separate HTML file (`preview-template.html`) and receives the grid content via `localStorage`.

#### 4.3. Message Box
- Floating non‑modal message box (top‑right) for user feedback (success, warning, error).
- Automatically disappears after 15 seconds or by clicking ×.

#### 4.4. Unique IDs
- When no ID is provided, the system generates an ID automatically using a running counter, e.g., `btn_001`, `inp_002`, etc.

#### 4.5. Custom Widgets
- **Collapsible Div**: a div with a header that toggles visibility of its content. The content can be any child widgets.
- **Tabs Div**: a div with tab headers that switch content area.

Both are created using pure DOM APIs, not HTML injection, and behave as first‑class widgets (they can contain other widgets, appear in parent dropdown, etc.).

---

## Technical Constraints

- **All UI elements** must be created using the `ObjectCreator` API (no direct `document.createElement` except for the main container and possibly temporary preview elements).
- **No inline HTML** beyond a single `<div id="app"></div>` in `index.html`.
- **Separation of concerns**: code is split into meaningful files (e.g., `ObjectCreator.js`, `CssEditor.js`, `Tester.js`). No unused files/classes.
- **CSS class names** all prefixed with `tester_` and grouped by attribute categories.
- **Event handlers** use `let` and class methods; no `var` or `const`.
- **JSDoc** comments for all methods.

---

## Step‑by‑Step Reconstruction Plan

The recreation will be divided into **sections**, each building on the previous.

### Section 1: Foundation
- [ ] Create minimal `index.html` with `<div id="app"></div>`.
- [ ] Place `ObjectCreator.js` (unchanged) in the project.
- [ ] Create `Tester.js` class skeleton with constructor, `initUI()` method.
- [ ] In `initUI()`, use `ObjectCreator` to create the main two‑panel layout container.
- [ ] Add the left panel and right panel structures (empty for now).
- [ ] Ensure `document.oc` is available.

### Section 2: Object Generator – Basic Form
- [ ] In left panel, create form elements for:
  - Tag select
  - Parent select
  - ID and Class inputs
  - Row, Column, RowSpan, ColSpan inputs
  - Pad X/Y, Internal Pad X/Y inputs
  - Sticky checkboxes
  - Add Object button
- [ ] Add event handler for Add Object to create a simple button (hardcoded) in the preview grid to test.
- [ ] Implement `refreshParentDropdown()` to populate parent select with available containers.
- [ ] Implement `generateId(tag)` for auto‑ID.

### Section 3: Preview Grid & Object List
- [ ] Create preview grid container in right panel.
- [ ] Create object list container.
- [ ] Store objects in `this.objects` array.
- [ ] `addObjectFromForm()`:
  - Gather form values.
  - Use `oc.button()`, `oc.input()`, etc. based on tag.
  - For collapsible/tabs, call custom creation methods.
  - Push object to array.
  - Update object list.
  - Refresh code display.
- [ ] `refreshObjectList()`: display each object with Edit/Delete buttons.
- [ ] Implement `editObject()` to populate form and switch to edit mode.
- [ ] Implement `saveEdit()` and `cancelEdit()`.

### Section 4: Code Generation & Load/Save
- [ ] Add code display textarea and buttons (Copy, Load, Save).
- [ ] `refreshCodeDisplay()`: generate JS code from `this.objects` using `oc.` calls.
- [ ] Implement copy, load, and save to file functions.
- [ ] `loadCode()`: clear preview, execute code via `new Function`, then sync objects.

### Section 5: CSS Editor Integration
- [ ] Add CSS Editor button in left panel (inline with sticky).
- [ ] Create `CssEditor.js` (already exists) – ensure it uses `tester_` prefixed classes.
- [ ] In `Tester.js`, instantiate CSSEditor and pass `onApply` to handle applying styles to selected object or preview grid.
- [ ] `openCssEditorForObject()`: if editing, open editor on that element; else open for new object (temp preview).
- [ ] `openCssEditorForPreview()`: open editor on preview grid.
- [ ] Ensure CSS editor modal is created via `ObjectCreator` (in `initUI`).

### Section 6: Grid Configuration Modal
- [ ] Add gear icon button in left panel header.
- [ ] Create modal (via ObjectCreator) with dynamic table of row/col weights.
- [ ] `showGridConfigModal()`: read current grid rows/cols, build table.
- [ ] `applyGridWeights()`: call `oc.configure_row()` / `oc.configure_column()`.

### Section 7: Separate Window & Preview CSS
- [ ] Add separate window icon next to preview title.
- [ ] Create `preview-template.html` file (simple layout with `.preview-grid`).
- [ ] In `openSeparateWindow()`, save current grid HTML + styles to localStorage, open window.
- [ ] Add preview CSS textarea and buttons (Copy, Apply, Load) below code display.
- [ ] Implement preview CSS operations.

### Section 8: Special Widgets (Collapsible, Tabs)
- [ ] In `addObjectFromForm()`, handle `collapsible` and `tabs` tags.
- [ ] Create `createCollapsible(params, text)` – builds DOM structure using ObjectCreator (nested).
- [ ] Create `createTabs(params, text)` – similar.
- [ ] Ensure these containers are added to `container_elements` for parent dropdown.

### Section 9: Message Box & Polish
- [ ] Add floating message box (via ObjectCreator) to `document.body`.
- [ ] Implement `showMessage(text, type)` and `hideMessage()`.
- [ ] Replace all `alert()` calls with `showMessage()`.
- [ ] Add `flashButton()` for copy feedback.

### Section 10: CSS Styling
- [ ] Create `Tester.css` with all styles prefixed `tester_`.
- [ ] Style two‑panel layout, forms, buttons, preview grid, object list, modals, message box.
- [ ] Ensure consistent colors and spacing.

---

## Acceptance Criteria

- The tester builds its entire UI using `ObjectCreator`.
- All features described above work correctly.
- No JavaScript errors in console.
- The code is clean, well‑commented, and follows the established naming conventions.
- The separate window preview works across browsers.

---

## Notes

- When rebuilding, we may need to extend `ObjectCreator` if a feature is missing (e.g., `object_generate` should already support everything needed). Any missing feature should be added to `ObjectCreator.js`.
- The `CssEditor.js` file is already complete and should be reused as is.
- The final project will consist of `index.html`, `ObjectCreator.js`, `CssEditor.js`, `Tester.js`, `Tester.css`, and optionally `preview-template.html`.