# GuidedTour

File: `web/js/widgets/GuidedTour/GuidedTour.js`. Tag: `guided_tour`. Global: `window.GuidedTour`.

Step-by-step walkthrough. It dims the page, highlights one element at a time and shows a card with Skip, Back and Next. Configured and started through static methods.

## Static methods

| Method | Notes |
|---|---|
| `configure(cfg)` | Merges config; `steps` replaces the list, `intro` merges by key |
| `start()` | Starts from the first step |
| `restart()` | Same as `start()` |

## Config

| Key | Default | Notes |
|---|---|---|
| `steps` | `[]` | Step list |
| `intro` | `{ enabled: true, title: 'Welcome to the Guided Tour', description: '...' }` | First slide with a key legend |
| `on_navigate` | null | `on_navigate(section)`, may be async; runs when a step's section changes |
| `on_finish` | null | Called once when the tour ends |

## Step

| Field | Notes |
|---|---|
| `target` | CSS selectors, comma separated, tried in order. Missing or zero-size targets are skipped |
| `title` | HTML |
| `text` | HTML body |
| `no_target` | Centered card, no highlight |
| `navigate` | Section name for this and later steps |
| `before_step` | Function (may be async) run before the step |
| `before_step_delay` | ms to wait after `before_step` |

Keys: Right or Enter next, Left back, Escape quits. Clicking the dim area quits.

Registry options: `button_label`, `intro_enabled`, `intro_title`, `intro_description`. The tag builds a small demo panel with a start button.

## Example

```js
GuidedTour.configure({
    intro: { title: 'Welcome', description: 'A quick tour.' },
    steps: [
        { target: '#run_btn', title: 'Run', text: 'Starts the job.' },
        { target: '#log', title: 'Log', text: 'Shows <b>output</b>.' }
    ],
    on_finish: () => localStorage.setItem('tour_done', '1')
});
GuidedTour.start();
```
