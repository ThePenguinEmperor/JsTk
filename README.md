# jinker

jinker is a plain JavaScript UI library for browser pages and pywebview frontends. `document.oc` places elements in CSS grids the way Tkinter's `grid()` does (row, col, spans, sticky, padx/pady). The same call builds ready-made widgets by tag: split panes, tabs, data tables, log viewers, menus, prompts and more. Light and dark themes are built in.

No build step and no dependencies, except `Table`, which loads AG Grid Community from a CDN.

## Install / load

Copy the `web/` folder into your project and add one script tag. It must not be `async` or `defer`.

```html
<script src="web/js/Jinker.js"></script>
```

The loader adds the core, the theme manager, the widget registry and every widget. Each widget links its own CSS.

## Quick example

```html
<body>
    <div id="app" style="height: 100vh;"></div>
    <script src="web/js/Jinker.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            let oc = document.oc;
            oc.configure_column('app', 1, { weight: 1 });
            oc.configure_row('app', 2, { weight: 1 });
            let name = oc.object_generate('input', { parent: 'app', row: 1, col: 1, sticky: 'ew', padx: 8, pady: [8, 4], placeholder: 'Name' });
            let host = oc.object_generate('output_logger', { parent: 'app', row: 2, col: 1, sticky: 'nsew', options: { demo_output: false } });
            name.addEventListener('change', () => host.widget_instance.add_output('Hello ' + name.value, 'info'));
            set_app_theme('dark');
        });
    </script>
</body>
```

## Claude Code skill

The [skills/jinker](skills/jinker) folder is a Claude Code skill with the full API: `SKILL.md` plus one reference file per widget and `references/ObjectCreator.md`.

Install it by copying the folder:

```
cp -r skills/jinker ~/.claude/skills/jinker
```

On Windows, copy `skills\jinker` to `%USERPROFILE%\.claude\skills\jinker`.

## Tester

Open `index.html` in a browser. Pick a tag, set its options in the generated form, place widgets in containers with row, col, sticky and padding, and watch the live preview. The code panel copies, saves or loads the generated `document.oc` code.

## Widgets

| Widget | Tag |
|---|---|
| AnimatedGifButton | `animated_gif_button` |
| AppStore | none (static store) |
| AutoComplete | `auto_complete` |
| Changelog | `changelog` |
| CollapsibleSection | none |
| ContextMenu | `context_menu` |
| DockWorkspace | `dock_workspace` |
| DynamicFilter | `dynamic_filter` |
| GuidedTour | `guided_tour` |
| HintPopup | none (automatic) |
| InputWithClr | `input_with_clr` |
| IterableEditor | `iterable_editor` |
| ListSelector | `list_selector` |
| MessageBox | none |
| OutputLogger | `output_logger` |
| PopupOverlay | none |
| ProgressBar | `progress_bar` |
| QueueTray | `queue_tray` |
| SplitPane | `split_pane` |
| TabbedContainer | `tabbed_container` |
| Table | `table` |
| TickerBanner | `ticker_banner` |
| ToggleSwitch | `toggle_switch` |
| UserPrompt | `user_prompt` |

## License

MIT. See [Documents/LICENSE](Documents/LICENSE) and [Documents/REVOCATION.md](Documents/REVOCATION.md).

## For LLMs and CDN users

Pages that load jinker from a CDN can point an LLM at the docs through the same CDN:

- Index: https://cdn.jsdelivr.net/gh/ThePenguinEmperor/JsTk@main/llms.txt
- Everything in one file: https://cdn.jsdelivr.net/gh/ThePenguinEmperor/JsTk@main/llms-full.txt

Both files are built from `skills/jinker` by `python tools/build_llms.py`. Run it after changing the skill. Pin a tag instead of `main` for a fixed version.
