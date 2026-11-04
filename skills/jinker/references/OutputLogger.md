# OutputLogger

File: `web/js/widgets/OutputLogger/OutputLogger.js`. Tag: `output_logger`. Global: `window.OutputLogger`. Element: `<output-logger>`.

Console-style log viewer with ANSI colors, auto-scroll, search with match navigation, type filters, streaming lines and optional range paging for large logs.

## Constructor

`new OutputLogger(config)` creates a detached `<output-logger>`. `render()` returns it; you append it. The host needs a height.

| Config | Default | Notes |
|---|---|---|
| `title` | `'Output Logger'` | |
| `auto_scroll` | `true` | |
| `max_entries` | `5000` | Line cap |
| `prune_count` | `1000` | Lines dropped when the cap is hit |
| `enable_ctrl_f_search` | `false` | |
| `enable_ctrl_wheel_zoom` | `false` | Font size 8 to 32 px |
| `on_clear` | null | Async; called by the menu Clear before clearing the view |
| `host_clear` | null | Used when `on_clear` is not set; return `false` to log a failure |
| `extra_context_menu_items` | null | ContextMenu items, or `fn(target)` |
| `virtual_scroll` | `false` | Scrollbar spans the whole dataset in range mode |
| `on_request_range` | null | Range paging source, see below |
| `window_rows` | `2000` | Rows per range request |
| `overscan_rows` | `200` | |
| `on_position_change` | null | `on_position_change(position, total)` |

Registry options: `title`, `auto_scroll`, `enable_ctrl_f_search: true`, `enable_ctrl_wheel_zoom: true`, `max_entries`, `prune_count`, `demo_output: true`. The registry sets host height to 280 px if unset.

## Methods

| Method | Notes |
|---|---|
| `initialize(config)` | Merges config |
| `add_output(text, type = 'stdout', { partial })` | Types: `stdout`, `stderr`, `info`, `warning`, `error` |
| `append_to_last_output(chunk, type)` | Streams into the open line; a trailing newline ends it |
| `clear_output()` | |
| `update_status(text, mode)` | Mode `idle`, `running`, `success`, `error` |
| `set_auto_scroll(flag)`, `scroll_to_bottom()` | |
| `open_search(term)`, `close_search()` | |
| `set_font(family, size)`, `set_font_size(px)` | |
| `set_range_source(fn)`, `refresh_range()`, `scroll_to_position(pos)`, `get_position()` | Range paging |
| `set_theme(theme)` | |

## Range paging

`on_request_range(request)` is async. `request` is `{ direction: 'older' | 'newer' | 'at', cursor, count, position }`. Return `{ lines, prev_cursor, next_cursor, position, total }`. Each line is a string or `{ text, type, position, cursor_before, cursor_after }`. A null cursor means that edge is reached.

## Page globals

For pywebview `evaluate_js`, these act on the first `<output-logger>`: `logger_initialize(config)`, `logger_add_output(text, type)`, `logger_clear_ui_output()`, `logger_update_status(text, mode)`.

## Example

```js
let log = new OutputLogger({ title: 'Build', enable_ctrl_f_search: true });
document.getElementById('log_host').appendChild(log.render());
log.add_output('\x1b[32mok\x1b[0m compiled', 'stdout');
log.add_output('disk almost full', 'warning');
```
