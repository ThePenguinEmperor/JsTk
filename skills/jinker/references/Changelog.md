# Changelog

File: `web/js/widgets/Changelog/Changelog.js`. Tag: `changelog`. Globals: `window.Changelog` and a default instance `window.changelog`.

"What's New" modal with release notes paged by version, newest first.

## Constructor

`new Changelog(config)`. Does not open anything.

| Option | Default | Notes |
|---|---|---|
| `title` | `"What's New"` | |
| `versions` | `{}` | `{ version: [entries] }`, `{ version: { section: [entries] } }`, or `[{ version, <section>: [entries] }]` |
| `markdown` | none | CHANGELOG.md style text; used instead of `versions` |
| `current_version` | `''` | |
| `last_seen_version` | `''` | |
| `group_by_minor` | `true` | One page per minor version |
| `empty_text` | `'General improvements and bug fixes.'` | |
| `ack_label` | `'Got it!'` | Close button text |
| `fetch_info` | null | Async, returns `{ version, last_seen_version, changelog, show_changelog }` |
| `load_changelog` | null | Async, returns any accepted changelog shape |
| `on_seen` | null | `on_seen(version)` when the popup closes |
| `dont_show_again` | null | `{ label, checked, on_change(checked) }` header toggle |
| `host_bridge` | null | `'pywebview'` (uses `window.pywebview.api`) or an object with `get_version_info`, `get_changelog`, `mark_version_seen` |

Entries support `**bold**`.

Registry options: `button_text`, `title`, `ack_label`, `current_version`, `group_by_minor`, `versions` (demo). The tag builds an open button.

## Members

| Member | Notes |
|---|---|
| `init()` | Async, once per instance: shows the popup only when the version is unseen |
| `show_latest()` | Async: loads data and always shows |
| `show(data)` | Opens now. `data`: `version`, `changelog`, `last_seen_version`, `dont_show_again_checked` |
| `hide()` | Closes and marks the version seen |
| `set_dont_show_again(cfg)` | Falsy removes the toggle |
| `set_theme(theme)` | |
| `is_visible` | Getter |
| `Changelog.parse_markdown(md)`, `Changelog.normalize(src)`, `Changelog.compare_versions(a, b)` | Static helpers |

Keys: Escape closes, arrows page.

## Example

```js
let cl = new Changelog({
    current_version: '1.2.0', last_seen_version: localStorage.getItem('seen') || '',
    versions: { '1.2.0': { 'New Features': ['Added **dark theme**.'] } },
    on_seen: v => localStorage.setItem('seen', v)
});
cl.init();
```
