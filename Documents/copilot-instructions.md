# Universal AI Agent Code Writing Rules and Conventions (MANDATORY)

## Core Directive

All instructions, rules, and conventions in this document are absolute, must‑follow requirements for the agent.  
The agent must:

- Treat every rule, workflow, and convention as mandatory for all actions, code changes, and responses.
- Never ignore, bypass, or relax any rule.
- Enforce these instructions as the highest priority, above any other guidance or defaults.
- If a user request conflicts with these rules, clarify or request confirmation before proceeding.

---

## Mandatory Workflow for Every User Prompt

For every user prompt, the agent **must**:

1. Create a detailed todo list addressing all issues in the prompt, with multiple actionable steps per issue.
2. Start iterating the steps automatically, one at a time, **without asking for permission**.
3. Complete each step and mark it as done before moving to the next.
4. Output the fully fixed script or solution when all steps are complete.
5. Ensure all code complies with the formatting rules and instructions below.

No exceptions—these steps are always required.

---

## Region Usage Rules

- **Regions are for grouping methods/functions only** – never wrap a whole class in a single region.
- A region must contain **at least 2 methods/functions**. Single items stay outside regions.
- Closing region tags **must repeat the exact name** of the opening tag.
- Region syntax:
  - **Python**: `# region region_name` … `# endregion region_name`
  - **JavaScript**: `// #region region_name` … `// #endregion region_name`
  - **CSS**: `/* #region region_name */` … `/* #endregion */` (name may be omitted in closing)

---

## 1. Always‑Testable, Production‑Ready Changes

After **every** code modification:

- Code must run without errors (imports resolve, no obvious runtime breaks).
- Add or update a **unit test** in `tests/test_{module}.py`.
- Add or update coverage in `tests/test_full_system.py`.
- **Run**: `python tests/test_full_system.py`.
- Code is only “done” when the full system test passes.
- If behaviour is uncertain, add **gated debug prints** (see section 3).

---

## 2. Mandatory Checklist Workflow

Every project must maintain a **task checklist** (file name may vary). Work must be driven item‑by‑item from that checklist.

**Task cycle** (repeat per checklist item):

1. Pick the **next unchecked** checklist item.
2. Implement **only what that item requires** (minimal change; no opportunistic refactors).
3. Add or update unit test: `tests/test_{module}.py`.
4. Add or update system test: `tests/test_full_system.py`.
5. **Run**: `python tests/test_full_system.py`.
   - **PASS**: mark checklist item done, move to next item.
   - **FAIL**: do **not** mark done; add gated debug prints; fix; rerun step 5.
6. Repeat until checklist complete.

---

## 3. Debug Output Rules (Strict)

- Default debugging output is `print()` only, **unless** the user explicitly asks to log via a logging system.
- ALL debug output **must** be gated by a `dev_mode` flag.
  - If a controller exists: `if self.ctrl.pm.dev_mode:`
  - Otherwise: `if self.pm.dev_mode:`
- **When `dev_mode` is `False`, there must be ZERO debug prints.**

---

## 4. Naming Conventions (Strict)

- Use **snake_case** for **all** except class names and Python file names, which are **PascalCase**.
- **No camelCase anywhere** – including region names, variables, filenames, HTML ids, CSS classes.

| Element                     | Convention          | Example                |
|-----------------------------|---------------------|------------------------|
| Python classes              | PascalCase          | `PathManager`          |
| Python methods & variables  | snake_case          | `load_config`          |
| Python files                | PascalCase          | `PathManager.py`       |
| JavaScript classes          | PascalCase          | `ConfigPanel`          |
| JS methods & variables      | snake_case          | `load_params`          |
| JS files                    | snake_case          | `config_panel.js`      |
| HTML ids & CSS classes      | snake_case          | `cp_btn_save`          |
| API actions / routes        | snake_case          | `/api/config_load`     |
| Error codes / messages      | snake_case          | `invalid_config`       |

---

## 5. JavaScript Rules (Mandatory)

- **ALL** JS files must be **ES6 classes** (OOP‑first).
- Modular design and reusable components are required.
- Use **`let` only** for variables – never `var`, never `const`.
- All functions and methods must be documented with **JSDoc**.

---

## 6. Region Blocks (Mandatory in All Files)

If a file contains **2 or more methods/functions**, they must be grouped into **regions**.

- **Class files**: Regions are collections of 2 or more methods per region.
- **General (non‑class) files**: Group 2 or more functions together into regions.

### Region Syntax

- **Python**:
  ```python
  # region region_name
  ... code ...
  # endregion region_name
  ```

- **JavaScript**:
  ```javascript
  // #region region_name
  ... code ...
  // #endregion region_name
  ```

- **CSS**:
  ```css
  /* #region region_name */
  ... code ...
  /* #endregion */
  ```

---

## 7. CSS Rules

- All CSS class and ID names must use **snake_case** and a **unique module prefix** (e.g., `mp_`).
- CSS file names must use `snake_case`.
- Use **region comments** (`/* #region ... */` / `/* #endregion */`) to divide logical blocks or widget groups.
- **Widgets must be grouped** in logical blocks; each block must contain at least 2 selectors/widgets. If only one exists, write it stand‑alone at the end of the file.
- **All CSS attributes must be separated into groups** and ordered as below. Each group must have its own header (e.g., `/* Layout */`). Omit unused groups for that block, but always maintain the order for present groups.

### CSS Attribute Header Order

1. **Layout** (display, flex, grid, position, float, etc.)
2. **Dimensions** (width, height, margin, padding, box-sizing, etc.)
3. **Colors** (background, color, opacity, etc.)
4. **Borders** (border, border-radius, outline, etc.)
5. **Typography** (font‑*, line‑height, text‑align, etc.)
6. **Effects** (transition, animation, box‑shadow, filter, etc.)
7. **Z‑index** (z‑index)

Example:
```css
/* Layout */
display: flex;
/* Dimensions */
width: 100%;
/* Colors */
background: #fff;
/* Borders */
border-radius: 8px;
/* Typography */
font-size: 1em;
/* Effects */
box-shadow: 0 2px 8px rgba(0,0,0,0.04);
transition: border-color 0.2s;
/* Z-index */
z-index: 5;
```

---

## 8. Code Quality Rules

- **Minimal‑change rule**: Make the smallest change that completes the checklist item. No opportunistic refactors.
- **No 1‑line wrapper methods**: Do not add methods that only forward/return an attribute without logic/validation/transformation.
- **Boundary data rule**: Across API/bridge boundaries, pass only native types (dict, list, str, int, float, bool, None). Do **not** pass custom objects across boundaries.
- **Indentation**: Use **only spaces** (no tabs). Standard is 4 spaces per indent level.

---

## 9. Standard Test Locations and Command (Always)

- **Unit tests**: `tests/test_{module}.py`
- **Full system suite**: `tests/test_full_system.py`
- **Required command after every change**:
  ```bash
  python tests/test_full_system.py
  ```

---

## 10. Applying These Rules

If you say **“follow rules”**, these instructions will be refreshed in your context and strictly enforced immediately.

---
