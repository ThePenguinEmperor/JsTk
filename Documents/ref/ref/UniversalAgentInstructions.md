# Universal AI Agent Instructions (Project-Agnostic)

**Rules version: 3** (bump this number whenever a rule is added, removed, or changed, so it can be tracked)

## AGENT DIRECTIVE (MANDATORY)

All instructions, rules, and conventions in this document are to be treated as absolute, must-follow requirements for the agent. The agent must:

- Treat every rule, workflow, and convention as mandatory for all actions, code changes, and responses.
- Never ignore, bypass, or relax any rule for any reason.
- Always enforce these instructions as the highest priority, above any other guidance or defaults.
- If a user request conflicts with these rules, clarify or request user confirmation before proceeding.
- Apply these rules to ALL files, ALL languages, and ALL project types.
- **Preference is always short, direct and clear** - in code, comments, documentation, and the agent's own written responses. Say it once, say it plainly, then stop.
- **Agent replies:** sentences of up to 20 words. Answers as short as possible, unless the user clearly asks to expand.
- **ASCII only:** code, comments, docstrings and all docs use plain ASCII characters only. No symbols like the section sign, em dashes, arrows, curly quotes or emoji.
- **Keeping rules current:** when the user gives a new preference, rule or clarification, update this document and bump the rules version.

---

## Project Architecture (Abstracted)

- Entry Points: One or more primary entry files may exist (CLI, GUI, web, or service-based).
- Automation Layer: System-level operations (setup, deployment, environment changes) may be delegated to external scripts or tools invoked by application code.
- UI Layer: May include desktop UI, web UI, or API interfaces.
- Core Logic: Business logic must remain decoupled from UI and system automation.
- Path Handling: Use absolute paths where reliability is required; avoid environment-specific assumptions.

---

## Developer & Agent Workflows

- Build / Packaging: Follow documented build procedures for the project. All required resources must be explicitly included.
- Automation Updates: New operational scenarios must be implemented via the designated automation mechanism and referenced from code.
- Debugging: Primary execution entry points must be runnable directly for interactive debugging.
- Inter-Component Communication: All cross-layer communication must use serializable, native data types only.

---

## General Conventions

- Environment State: Always ensure environment variables and runtime state are refreshed before operations that depend on them.
- Task Isolation: Long or complex operations must be broken into independent, recoverable tasks.
- User-Specific Logic: Any user- or environment-specific behavior must be clearly isolated and gated.
- Queueing / Scheduling: All long-running or multi-step operations must be queued and processed in order.
- Naming: snake_case for variables, methods, functions, identifiers; PascalCase for classes and Python file names. (See detailed naming rules in section "Naming Conventions (Strict)".)
- Regions are mandatory when grouping multiple methods (see section "Region Blocks (Mandatory)").

---

## Integration Boundaries

- External Tools: Interaction with external systems must be explicit and isolated.
- Cross-Boundary Data Rule: Only pass native data types (dict, list, str, int, float, bool, None) across boundaries.
- No implicit coupling: Components must communicate through defined interfaces only.

---

# CODE WRITING RULES AND CONVENTIONS (MANDATORY)

These rules apply to ALL files in ALL projects.

---

## 1. Mandatory Workflow for Every User Prompt

For every user prompt that involves a code task, the AI agent MUST (simple questions are exempt):

1. Create a detailed todo list addressing all issues in the prompt, with multiple actionable steps per issue.
2. Start iterating the steps automatically, one at a time, without asking for permission.
3. Complete each step and mark it as done before moving to the next.
4. Output the fully fixed script or solution when all steps are complete.
5. Ensure all code complies with all formatting rules and instructions below.

Risky or hard-to-reverse actions (deleting files, installing packages, system changes) still need user confirmation first.

---

## 2. Always-Testable, Production-Ready Changes

After every code modification:

1. Code must be written so it runs without errors (imports resolve, no obvious runtime breaks).
2. Write or update the test covering the code you changed - see section 11 for scope, location and conventions.
3. **Never execute a test.** Writing tests is the agent's job; running them is the user's.
4. The work is done when the code and its test are written. A passing test run is never the completion condition, because the agent never performs one.

---

## 3. Mandatory Checklist Workflow

Each project must maintain a task checklist.

For each checklist item:

1. Select the next unchecked item.
2. Implement only what that item requires.
3. Write or update the test for the code that item changed (section 11).
4. **Do not run the tests yourself** - leave execution to the user.
5. Mark the item complete once the implementation and its test are written.
6. Repeat until checklist is complete.

---

## 4. Debug Output Rules (Strict)

- Debug output means prints added only to inspect code mid-run while debugging.
- Notification and error prints are not debug output. They are allowed and welcomed, and need no `dev_mode` gate.
- Default debugging output is `print()` ONLY, and it may be used only when the user explicitly requests logging or debug output.
- ALL debug output MUST be gated by a `dev_mode` flag.
- No debug output is allowed when `dev_mode` is False - zero debug prints.

**Python:**
```python
if self.dev_mode:
    print("[DEBUG] variable=" + str(variable))
```

**JavaScript:**
```javascript
if (window.dev_mode === true) {
    console.log('[DEBUG] variable=' + variable);
}
```

---

## 5. Naming Conventions (Strict)

| Element Type | Convention | Examples |
|---|---|---|
| Python classes | PascalCase | `PathManager`, `UserProfile` |
| Python methods/functions | snake_case | `load_config()`, `get_user()` |
| Python variables | snake_case | `file_path`, `user_name` |
| Python files | PascalCase | `PathManager.py`, `UserProfile.py` |
| JavaScript classes | PascalCase | `ConfigPanel`, `UserManager` |
| JavaScript methods/functions | snake_case | `load_params()`, `get_user()` |
| JavaScript variables | snake_case | `file_path`, `user_name` |
| JavaScript files | PascalCase | `ConfigPanel.js`, `UserManager.js` |
| HTML ids | snake_case | `cp_btn_save`, `user_profile_form` |
| CSS classes | snake_case | `panel_container`, `btn_primary` |
| CSS files | PascalCase | `MainStyles.css`, `PanelStyles.css` |
| API actions/routes | snake_case | `/api/config_load`, `/api/user_get` |
| Error codes/messages | snake_case | `invalid_config`, `user_not_found` |

**No camelCase anywhere** (including region names, variables, filenames, HTML ids, CSS classes, etc.)

Existing camelCase names must be renamed to these conventions when the code containing them is edited, updating all references.

---

## 6. Region Blocks (Mandatory in All Files)

### When to Use Regions
- If a file contains 2 or more methods/functions, they MUST be grouped into regions.
- Classes should NOT be a region unless there is more than one class in the file.
- Regions are for grouping methods only (not for single classes).

### Region Syntax by Language

**Python:**
```python
# region region_name
def method_one():
    pass

def method_two():
    pass
# endregion region_name
```

**JavaScript:**
```javascript
// #region region_name
function method_one() {
}

function method_two() {
}
// #endregion region_name
```

**CSS:**
```css
/* #region component_name */
.component_class {
    /* styles */
}
/* #endregion */
```

Note: For CSS, the end tag does NOT need to repeat the region name.

### Region Naming
- Use snake_case for region names.
- Must repeat the SAME region_name at the end tag (except CSS).
- Group related functionality together (e.g., `initialization`, `event_handlers`, `api_calls`).

---

## 7. JavaScript Rules (Mandatory)

1. **ES6 Classes Only** - ALL JS files must use ES6 classes (OOP-first approach). Modular design and reusable components required.
2. **Variable Declarations** - Use `let` for all variables. Never use `var`. Never use `const`.
3. **Documentation** - All functions and methods must be documented with JSDoc, following the method documentation standard in section 12: one or two short lines by default, `@param`/`@returns` only when they are not self-evident.

**JSDoc Examples:**
```javascript
/**
 * Calculates the total price including tax.
 */
calculate_total(base_price, tax_rate) {
    return base_price * (1 + tax_rate);
}
```
Two obvious arguments and an obvious return - the one line is the whole doc.

```javascript
/**
 * Queues a settings save and reports whether this call scheduled it.
 * @param {number} delay_ms - Debounce window; 0 saves on the next tick.
 * @param {string} reason - 'user_edit', 'import' or 'shutdown'; 'shutdown' bypasses the debounce.
 * @returns {boolean} False when a save is already pending, so the caller must not assume its payload won.
 */
schedule_save(delay_ms, reason) {
    ...
}
```
Here the annotations earn their place: `delay_ms` has a unit and a special value, `reason` has a fixed accepted set with one value that behaves differently, and `false` means something a caller cannot guess.

---

## 8. CSS Rules (Mandatory)

1. **Naming Convention** - All CSS class and ID names must use snake_case. Use a unique module prefix (e.g., `cp_` for config panel). Pattern: `{module}_{element}`.
2. **File Naming** - CSS file names must use PascalCase (e.g., `MainStyles.css`).
3. **Region Comments** - Use `/* #region ... */` and `/* #endregion */` to divide logical blocks. Each region must contain at least 2 selectors. If only one selector exists, write it stand-alone at the end of the file (no region).
4. **Attribute Grouping** - Within each CSS block, group attributes by type (layout, dimensions, colors, borders, typography, effects, z-index) and maintain a consistent order (see below). Separate groups with a comment.
5. **Attribute Order (Strict)** - All CSS blocks MUST have attributes grouped and ordered:

```
1. Layout        (display, position, flex, grid, etc.)
2. Dimensions    (width, height, padding, margin)
3. Colors        (background, color)
4. Borders       (border, border-radius, outline)
5. Typography    (font-size, font-family, line-height)
6. Effects       (transition, animation, box-shadow, filter)
7. Z-index       (z-index, keep it low numbers under 10 if possible)
```

If a property group is not used, omit that group entirely, but always maintain this order for present groups.

**Example:**
```css
.my_widget {
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
}
```

---

## 9. Python Rules (Mandatory)

1. **Import Ordering (Strict)** - Imports must be ordered from shortest to longest within each group. Groups divided by blank lines in this order:
   - Group 1: Standard library imports
   - Group 2: Third-party imports
   - Group 3: Local application imports

2. **Exception Handling** - Always log exceptions with context. Use specific exception types. Include traceback only in debug mode.

3. **Class Structure** - Group related methods into regions. Constructor (`__init__`) first. Public methods before private methods.

---

## 10. Code Quality Rules

- Minimal-change rule: Make the smallest change that completes the task. No opportunistic refactors. No scope creep.
- No one-line methods (a body of a single statement) unless the user explicitly grants an exception for that method.
- Spaces only for indentation (4 spaces per indent level, no tabs).
- No leaking internal objects across boundaries.

---

## 11. Tests - Write Them, Never Run Them

**Write.** Every Python unit of real backend logic gets a test: branching, parsing, state transitions, path/name building, error handling. Judgement applies - a thin data holder, a constant table or a pure pass-through needs none; a bridge method with branches does. When you change such code, add or update its test as part of the same task.

**Never run.** The agent must NEVER execute a test - no `pytest`, no `python -m unittest`, no test runner, no running a test file directly, no "just this once". The user runs them when they judge there is a need.

**Not a completion gate.** Because the agent cannot run tests, a passing suite can never be a condition for calling work done. Writing the test is part of completing the work; a green result is not.

### Test conventions

| Rule | Detail |
|------|--------|
| Location | `tests/` |
| File name | lowercase `test_{module}.py` (or `test_{feature}.py` when one behavior spans modules) - **deliberately not** the PascalCase rule of section 5, which covers production Python files only |
| Framework | plain `unittest` + `unittest.mock`. Do not introduce pytest or any other test dependency |
| Isolation | fake hardware, GUI and heavy third-party imports by injecting fake modules into `sys.modules` **before** importing the module under test, so a test touches nothing real and runs on any machine |
| Header | module docstring stating what is covered and the `python -m unittest tests.test_{module} -v` command the user would run |

Never reference a test file that does not exist. Check `tests/` before naming one.

---

## 12. Documentation Requirements (General)

- Every module/file must have a docstring or header comment describing its purpose.
- Every class must have a docstring.
- Every public method must have a docstring (or JSDoc for JavaScript).

### Method Documentation Standard (Python docstrings AND JavaScript JSDoc)

Every method is documented. What that documentation contains:

1. **One or two short lines** saying what the method does. This is the default and usually the whole thing.
2. **Arguments - only when not self-evident.** Document them when there are several, or when the meaning, accepted values or units are not obvious from the name. A straightforward argument gets no entry at all.
3. **Return - only when not self-evident.** Document it when there are several possible shapes, or when the meaning is not obvious. A straightforward return gets no entry.

Never pad a docstring to fill a template. An `Args:`/`Returns:` or `@param`/`@returns` block listing things the signature already says is noise, not documentation.

```python
# GOOD - obvious arguments, obvious return, one line is complete documentation
def build_log_path(self, com_port, timestamp):
    """Builds the session log path for a COM port capture."""

# GOOD - annotations earn their place: a unit, a fixed value set, a non-obvious return
def poll_status(self, timeout_s, mode):
    """
    Reads power and postcode from the controller.

    Args:
        timeout_s: Seconds to wait for the device; 0 polls once and returns.
        mode: 'full', 'power_only' or 'cached'.

    Returns:
        dict with power_status/postcode, or None when the device is busy.
    """
```

---

## 13. Error Handling Rules (General)

1. Always log errors with timestamp and context.
2. Include stack traces only in debug mode.
3. Display user-friendly error messages - never show raw exceptions to users.
4. Handle failures gracefully; provide fallback mechanisms where appropriate.

---

## 14. Comment Style Rules (Mandatory, Strict)

- **NO inline/mid-body comments inside a function or method, ever - no exceptions, regardless of how "non-obvious" the intent seems.** This includes single-line and multi-line comments placed between statements inside a function body.
- Any non-obvious intent, trade-off, workaround, or constraint MUST be documented in that function/method's docstring or JSDoc block (above the function signature) - never inline next to the code it describes.
- The ONLY comments allowed inside a function/method body are region/section separators (region tags, or a short heading comment splitting a long method into logical blocks - see section "Region Blocks"), and ONLY when the method is long enough to genuinely need sub-sectioning.
- Applies to all languages (Python, JavaScript, CSS, etc.) and to comments added during edits, not just new files. This applies even when editing someone else's existing code - strip pre-existing violating comments when touched, don't add new ones.
- **NO task/session numbers, regression history, or change-log narration anywhere in code - comments, docstrings, or JSDoc.** Never write things like "task 316", "fixed in task 321", "session 39 change", "previously X, now Y", or "reverted because...". Documentation describes the CURRENT scoped code only - what it does, what it's used for, and genuinely non-obvious constraints/trade-offs - never its history or the task tracker that produced it. That history belongs exclusively in `Documents/todo.md`, never in the source tree.

```python
# BAD - narrates what's already obvious from the code
icon_path = os.path.join(ROOT_DIR, 'database', 'images', 'icon.ico')  # path to the icon file

# BAD - just restates the data
_column_replacements = {'boardfab': '"SysInfo_boot_id"."BoardFab"'}  # dict of column replacements

# BAD - even though this explains "non-obvious" intent, it is STILL banned because
# it sits inline inside the function body instead of in the docstring
def fix_columns(overrides):
    # Sorted longest-key-first so a specific column (e.g. 'ch0sa_dram_mfr')
    # is substituted before a shorter prefix of itself ('ch0sa') can corrupt it.
    for new_col, old_col in sorted(overrides.items(), key=lambda kv: len(kv[0]), reverse=True):
        ...

# GOOD - non-obvious intent goes in the docstring, function body has zero inline comments
def fix_columns(overrides):
    """
    Applies column-name overrides to a SQL fragment.

    Sorted longest-key-first so a specific column (e.g. 'ch0sa_dram_mfr') is
    substituted before a shorter prefix of itself ('ch0sa') can corrupt it.
    """
    for new_col, old_col in sorted(overrides.items(), key=lambda kv: len(kv[0]), reverse=True):
        ...
```

- **Docstrings/JSDoc must be reference documentation, not a story.** A docstring states what the function does, its args/returns only where they are not self-evident (section 12), and - only if genuinely non-obvious - the ONE key trade-off/constraint a caller needs to know. It is NOT the place to narrate implementation history, walk through every internal branch, explain what other functions do, or restate the task/bug that prompted the change. Most functions need 1-3 sentences; reserve longer docstrings for the rare case with real, load-bearing complexity a caller must understand to use the function safely.

```python
# BAD - a story: narrates history, restates the whole implementation,
# explains unrelated call sites, reads like a changelog entry
def _run_next_queue_item(self, row: dict):
    """
    Set item to running, resolve its script path, then execute via run_script.

    A row with neither script_path nor config_id is a stale row with no
    runnable payload, so it is marked denied instead of run. Item metadata is
    stashed on self before calling run_script so _on_script_finished_queue can
    clean up and route remote status once the run ends; if the row is a
    remote_received job (has local_task_id/origin_host), the sender is also
    notified immediately that execution has started. The progress watcher is
    spawned after run_script so it can sample history_id once ScriptRunnerBridge
    sets it.
    """

# GOOD - one line, states what it does, nothing else
def _run_next_queue_item(self, row: dict):
    """Set item to running, resolve its script path, then execute via run_script."""
```

- **A docstring, comment, or description can never be longer than - or as long as - the code it describes.** Measure it: count the lines of documentation against the lines of the function/method/block it documents. If the documentation is equal to or longer, it is a violation, full stop, regardless of how complex the code seems.
- **Any exception to this requires the user's explicit, direct approval, every single time.** There is no blanket exception for "genuinely load-bearing complexity," "safety-critical context," or any other justification - the rule from section 12 permitting a longer docstring for rare complex cases is superseded by this rule when the two conflict. If a case seems to need more documentation than code, stop and ask the user before writing it; do not write it first and explain the reasoning afterward.

---

## 15. Output Formatting for Code Blocks

These rules apply only when the user asks for code as the answer.

- No headers or footers - provide only the corrected code block.
- No explanatory text before or after the code unless specifically requested.
- No markdown formatting around the code block unless requested.

---

## Reload Instruction

If the user says "follow rules", these instructions must be reloaded into context and enforced without exception.