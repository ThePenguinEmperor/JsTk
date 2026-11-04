# Jinker Widget Review - Plan Report

Status: Phase 1 started. Done so far: WidgetBase (lifecycle, events, safe HTML), options validation,
registry destroy hook, allow_html default false in UserPrompt and GuidedTour, ToggleSwitch as the
first widget on the common API. Owner answers: keep both tables but focus on the DataGrid
(ag-grid style); simple common API is fine; lazy loading by default; allow_html off by default.
Corrections after reading code: Changelog already escapes text; TickerBanner messages are plain text;
UserPrompt, GuidedTour and TickerBanner already remove document listeners on close.

Method: static survey of all 21 registered widgets, the 3 core widgets and the unregistered
DataTable/DataGrid code. Counts come from grep over source and CSS. Items marked (verify) are
inferred from names or structure and need a read or a browser check before work starts.

Priority: P1 = fix first, P2 = next, P3 = polish. Effort: S = under 1 hour, M = a few hours, L = a day or more.

---

## 1. Cross-cutting findings (affect many widgets)

### 1.1 No lifecycle cleanup - P1, M
- Only ContextMenu and Table define destroy/dispose. The other 19 registered widgets and AppStore have none.
- Widgets that attach document or window listeners (AutoComplete, Changelog, GuidedTour,
  TickerBanner, UserPrompt, HintPopup) can leak them if the host element is removed.
- Timers and animation frames (UserPrompt interval, QueueTray, DockWorkspace, SplitPane,
  OutputLogger) can keep running after removal.
- Fix: add a small shared base class `WidgetBase` with `destroy()`, a listener registry
  (`add_listener` that records and removes on destroy) and a timer registry. Every widget extends it.
- Registry hook: `WidgetRegistry.build_into` should call `destroy()` on the old instance when a host is rebuilt.
  The tester Creator rebuilds widgets often, so this also removes leaks there.

### 1.2 HTML injection through innerHTML - P1, S
- UserPrompt: `body.innerHTML = this.text`.
- GuidedTour: step title and text go through innerHTML.
- TickerBanner: banner html and action icons go through innerHTML.
- Changelog: `format_entry` output goes through innerHTML (verify it escapes).
- Fix: default to `textContent`. Add an explicit `allow_html: false` option. When true, run a small
  allow-list sanitizer. Icons stay as trusted internal SVG constants.

### 1.3 Accessibility gaps - P1, M
- No aria attributes at all in: AnimatedGifButton, AutoComplete, DockWorkspace, GuidedTour,
  OutputLogger, QueueTray, TickerBanner, HintPopup.
- No keyboard handling in: DockWorkspace, DynamicFilter, InputWithClr, ListSelector,
  ProgressBar (display only, fine), TabbedContainer, TickerBanner, ToggleSwitch.
- TabbedContainer sets role=tab but has no arrow-key navigation (verify roving tabindex).
- Fix per widget is listed in section 3. Shared rules:
  - every interactive element reachable by Tab, with a visible focus ring from `--accent`;
  - roles: tablist/tab/tabpanel, listbox/option, combobox, switch, dialog, status, log;
  - Escape closes any popup; arrow keys move inside composite widgets.

### 1.4 Motion and reduced-motion - P2, S
- Only ProgressBar honours `prefers-reduced-motion`. TickerBanner scroll, QueueTray and
  the spinners do not.
- Fix: one shared CSS block in a common file, plus a `ThemeManager` flag.

### 1.5 Hard-coded colours break dark mode - P2, S
- Raw hex outside `var()` remains in: Changelog (1), GuidedTour (1), IterableEditor (1),
  OutputLogger (1), QueueTray (3), TabbedContainer (2), Table (1), UserPrompt (2), DataTable (2).
- Fix: map each to a theme variable. Add missing tokens (for example `--overlay_scrim`,
  `--code_bg`) to ThemeManager for both light and dark.
- Add a gallery "dark screenshot" check: open each widget in dark mode and look for low contrast.

### 1.6 Style flash from lazy CSS - P2, S
- Each widget appends a `<link>` to its CSS at first use. The widget can render once before the
  stylesheet arrives (flash of unstyled content, layout jump).
- Fix: `WidgetRegistry.build_into` waits for the link `load` event (cached promise per widget)
  before showing the host, or `Jinker.js` preloads all widget CSS with `<link rel="preload">`.

### 1.7 Loader cost - P2, M
- `Jinker.js` writes 27 script tags with `document.write`. All widgets load on every page even when unused.
- Fix: keep a small core (ThemeManager, WidgetRegistry, ObjectCreator) and lazy-load a widget
  file the first time `object_generate(tag)` needs it. Registry gets a `source` path per tag.
  Make `build_into` async-aware, or offer `await Jinker.load(['table', 'tabbed_container'])`.
- Keep the current eager path as a mode (`Jinker.js?eager`) for simple pages.

### 1.8 Very large single files - P3, L
- Table 1358 lines, OutputLogger 1371, IterableEditor 1312, TabbedContainer 1123, QueueTray 662,
  ContextMenu 779, Changelog 611.
- Split each into model, view and options modules under its folder (same pattern the DataGrid already uses).
- Benefit: easier tests, easier clean-room documentation, smaller diffs.

### 1.9 Duplicate and unregistered table code - P1 decision, S
- `widgets/DataTable.js` (936 lines) sits beside `widgets/DataTable/` (8 files, 686 plus 1030 combined).
- `DataGrid/` has 15 files plus `DataGridCombined.js` (1528).
- Plus the registered `Table` widget (1358). That is up to four table implementations.
- None of the DataTable/DataGrid code is loaded by `Jinker.js` or registered.
- Decision needed from the owner: keep one table (Table), archive the rest in `Documents/archive/`,
  or finish and register the DataGrid as the virtualised big-data option.
- Ownership note: the user stated these were written outside work. Keep that statement in the repo README.

### 1.10 Common widget API is missing - P2, M
- Each widget invents its own method names for show, hide, enable, set value, events.
- Fix: define a contract in `WidgetBase`:
  `set_value/get_value`, `enable/disable`, `on(event, fn)/off`, `emit`, `set_theme`, `destroy`.
  Registry entries then list their events so the tester can show them in a live event log panel.

### 1.11 Options validation - P2, S
- `WidgetRegistry.resolve_options` fills defaults but does not check types or choices.
- Fix: validate type and choices, log one warning per bad option (name, value, expected), fall back to default.

### 1.12 Tests - P2, M
- No widget tests exist or have been run. Per the rules, tests are written but not run by the agent.
- Plan: one `web/tests/<widget>.test.html` smoke page per widget (build, interact, destroy, rebuild x20 for leak check).

---

## 2. Core widgets

### MessageBox (139 lines)
- UX: stack multiple messages instead of overlapping; pause timeout on hover; add `role="status"` (or `alert` for errors).
- Code: reuse `get_next_z_index`; guard missing target element; destroy removes its timer.
- Speed: none needed.

### PopupOverlay (211 lines)
- UX: focus trap, restore focus to opener on close, Escape and backdrop-click options, `role="dialog"`, `aria-modal`.
- Code: single shared overlay root instead of one div per popup; remove scroll lock on close in all paths.
- Speed: no layout reads in the open path.

### CollapsibleSection (157 lines)
- UX: animate height with `grid-template-rows` transition (no JS measuring); `aria-expanded` and `aria-controls`; Enter and Space toggle.
- Code: expose `content_container` consistently (already used by OC); remember open state optionally.

---

## 3. Registered widgets

### input_with_clr (InputWithClr, 190)
- UX: clear button visible only when there is text; focus returns to the input after clear; Escape clears; label association.
- Code: dispatch a real `input` event on clear so listeners fire; add `aria-label` on clear button.
- Speed: avoid re-creating the icon via innerHTML on each build (use a cached template).

### toggle_switch (ToggleSwitch, 128)
- UX: add `role="switch"` and `aria-checked`; larger hit area (min 32 px height); label click toggles; disabled style.
- Code: already a native checkbox, good. Add `destroy` and `on('change')`.
- Speed: none.

### progress_bar (ProgressBar, 245)
- UX: indeterminate mode label; show percent text option; clamp values; colour by state (success, warning, danger).
- Code: already has aria and reduced-motion. Use CSS custom property for width and `transform: scaleX` instead of width for smoother animation.
- Speed: transform animation avoids layout.

### context_menu (ContextMenu, 779)
- UX: keyboard type-ahead; submenu opens on ArrowRight and closes on ArrowLeft; reposition near screen edges (verify); long menus scroll.
- Code: has destroy and aria. Split item model from view. Remove the single timer without clear (verify submenu hover delay is cleared).
- Speed: build items lazily for submenus; reuse one menu root.

### user_prompt (UserPrompt, 392)
- UX: focus trap; Enter submits, Escape cancels; show countdown clearly with `aria-live="polite"`; password reveal toggle needs a label.
- Code: P1 innerHTML fix (1.2); two hex colours; `setInterval` cleared in all close paths (verify); return a Promise from `ask()` (verify it exists).
- Speed: none.

### split_pane (SplitPane, 432)
- UX: keyboard resize with arrow keys on the divider (`role="separator"`, `aria-valuenow`); double-click divider resets size; remember sizes optionally; min sizes shown by cursor.
- Code: uses requestAnimationFrame correctly with a stored frame id. Add `destroy` to cancel it and remove pointer listeners.
- Speed: use pointer capture instead of document listeners; set a CSS variable and let grid do layout.

### dock_workspace (DockWorkspace, 406)
- UX: no aria, no keyboard at all. Add roles, focusable panel headers, keyboard move/dock commands, drop-zone highlight, save and restore layout to JSON.
- Code: add `destroy`; guard frame cancel; separate drag logic from layout model.
- Speed: throttle drag hit-testing to one per frame; cache panel rects at drag start.

### tabbed_container (TabbedContainer, 1123)
- UX: arrow-key navigation with roving tabindex, Home and End; overflow scroll or "more" menu for many tabs; middle-click close; drag to reorder (verify existing); tab close confirm hook.
- Code: split into TabModel, TabStrip, TabPanel. Two raw colours to fix. Remove innerHTML use for tab titles (use text nodes plus icon slot).
- Speed: render only the active panel's heavy content (lazy), keep others detached.

### queue_tray (QueueTray, 662)
- UX: `role="status"` and `aria-live` for progress changes; pause, retry and cancel per item; collapse to a badge; keyboard actions.
- Code: three raw colours; one timer without clear (verify); add `destroy`.
- Speed: update only changed rows (keyed diff) rather than re-render all; batch progress updates per frame.

### ticker_banner (TickerBanner, 352)
- UX: pause on hover and focus; reduced-motion shows static, wrapped text; dismiss and restore already exist, add keyboard access and aria roles (`role="marquee"` or `status`).
- Code: P1 innerHTML fix; the document listener has a remove pair, keep it, add `destroy`.
- Speed: CSS `transform` animation only (verify), `will-change: transform` set only while animating.

### animated_gif_button (AnimatedGifButton, 168)
- UX: needs aria-label and tooltip; play on hover only if allowed (reduced-motion shows the still frame); focus ring.
- Code: sets innerHTML twice, switch to element creation; handle image load errors with a fallback label.
- Speed: preload the GIF once, decode the still frame lazily; avoid many animated GIFs running at once.

### auto_complete (AutoComplete, 457)
- UX: implement the combobox pattern: `role="combobox"`, `aria-expanded`, `aria-activedescendant`, listbox with options; highlight matches; "no results" row; Escape closes; clear button already tabIndex -1.
- Code: timers have matching clears, good. Add `destroy`. Accept async source returning a Promise and drop stale responses (request counter).
- Speed: debounce input (verify delay is an option), cap rendered rows (for example 50) and virtualise beyond that; use a Map index for large local lists.

### list_selector (ListSelector, 390)
- UX: has aria but no key handling: add arrow keys, Space to toggle, Ctrl+A, Shift range select; search box; select-all checkbox with indeterminate state.
- Code: sub_status_map option is a loose JSON shape, validate it (1.11). Add events `change`.
- Speed: virtualise lists above about 500 rows.

### iterable_editor (IterableEditor, 1312)
- UX: add undo and redo, inline validation messages, drag to reorder, collapse nested nodes, keyboard add and delete, JSON text view toggle.
- Code: split into model (path ops), view, and editors per type. 46 colour usages in CSS, one raw hex; 16 px font sizes, switch to a type scale variable.
- Speed: render collapsed children lazily; avoid full tree rebuild on one value change (update the node only).

### dynamic_filter (DynamicFilter, 238)
- UX: add keyboard (Enter adds a condition, Backspace removes the last chip); show operator by field type; clear all; result count callback.
- Code: one innerHTML use, replace; emit `change` with a normalised filter object that matches the penguin-core `SqlFilter` grammar (shared contract between the two projects).
- Speed: debounce `change` emission.

### changelog (Changelog, 611)
- UX: has aria and keyboard, good. Add search, group by version with sticky headers, deep link to a version, "show all" instead of only Older and Newer.
- Code: `format_entry` into innerHTML: escape first, then apply the small markup rules. One raw hex. No focus styles in CSS: add.
- Speed: render only the visible page of entries.

### table (Table, 1358)
- UX: column resize and reorder, sticky header, sort indicators with aria-sort, row selection with checkboxes and keyboard, empty-state text, loading state, copy selection as TSV.
- Code: has destroy (good). Seven innerHTML uses: escape cell text unless a renderer is given. Split into TableModel, TableView, ColumnDef, Selection, Sort, Filter modules (reuse the structure already in DataGrid/).
- Speed: row virtualisation above about 1000 rows; event delegation (one listener on the body, not one per cell); keyed row reuse; avoid layout reads inside loops.

### output_logger (OutputLogger, 1371)
- UX: no aria: add `role="log"` and `aria-live="off"` (screen readers should not read every line); pause-on-scroll with a "jump to latest" button; level filter chips; copy and export; timestamps toggle.
- Code: has max_entries 5000 with splice (O(n) per trim, switch to a ring buffer or trim in batches); six innerHTML uses already pass through `escape_html`, keep that rule and add a test for it; ANSI parser is good, add a cache for repeated colour spans.
- Speed: already has virtual mode and frame batching. Add: append in batches per animation frame, use `DocumentFragment`, measure row height once, cap highlight work to visible rows.

### guided_tour (GuidedTour, 458)
- UX: focus the card on each step, trap focus, announce step with `aria-live`, highlight cutout follows resize and scroll, Escape ends, "do not show again" option.
- Code: P1 innerHTML fix; four innerHTML uses; two document listeners have remove pairs, keep; one raw colour; add `destroy`.
- Speed: recompute target rect on scroll and resize with one rAF throttle.

### hint_popup (HintPopup, unregistered, 197)
- UX: show on keyboard focus as well as hover; `role="tooltip"` and `aria-describedby`; delay options; flip when near edges.
- Code: three capture-phase document listeners with no removal (fine for a singleton, but add `HintPopup.destroy()` for tests). `DOMContentLoaded` init: also init when the script loads late.
- Speed: capture-phase `mouseover` on the whole document runs for every element; early exit when no `[data-hint]` ancestor, cache the lookup with `closest`.

### app_store (AppStore, unregistered)
- Code: add `subscribe` returning an unsubscribe function, `get` with default, and optional persistence key. Add a small test page.

---

## 4. Unregistered DataTable and DataGrid

- Decide per section 1.9 before spending time here.
- If kept: DataGrid is the performance candidate (virtual scroller, DOM pool, custom scrollbar). Register it as `data_grid`, document it, and have Table remain the simple one.
- If archived: move to `Documents/archive/` and remove from README.

---

## 5. Suggested execution order

Phase 1 - safety and correctness (about 1 day)
1. WidgetBase with destroy, listener and timer registry (1.1).
2. innerHTML fixes with `allow_html` option (1.2).
3. Decision on duplicate tables (1.9).
4. Options validation (1.11).

Phase 2 - accessibility and theme (about 1-2 days)
5. Keyboard and aria pass, widget by widget, in this order: TabbedContainer, AutoComplete,
   ListSelector, ToggleSwitch, SplitPane, DockWorkspace, then the rest (1.3).
6. Raw hex to theme tokens; dark-mode check in the Gallery (1.5).
7. Reduced-motion block (1.4).

Phase 3 - speed (about 1-2 days)
8. CSS preload, no flash (1.6).
9. Lazy widget loading (1.7).
10. Table: virtualisation and event delegation. OutputLogger: ring buffer and batching. QueueTray: keyed diff.

Phase 4 - structure and tests (about 2 days)
11. Common widget API and the tester event log panel (1.10).
12. Split the four largest files (1.8).
13. Smoke test pages with the destroy and rebuild leak check (1.12).

---

## 6. Open questions for the owner
1. Which table is the keeper: Table, DataGrid, or both?
2. Is a breaking change to widget method names acceptable for the common API (1.10)? It also adds legal distance from older code.
3. Lazy loading (1.7): make it the default, or keep eager loading as the default?
4. Should `allow_html` default to false everywhere, even where current samples rely on markup?
