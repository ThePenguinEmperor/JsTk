# UserPrompt

File: `web/js/widgets/UserPrompt/UserPrompt.js`. Tag: `user_prompt`. Globals: `UserPrompt`, `UserPromptInput`, `UserPromptPassword`.

Modal question with up to four buttons and an optional auto-answer countdown. Custom elements `user-prompt`, `user-prompt-input` and `user-prompt-password`.

| Class | Field | Default timeout |
|---|---|---|
| `UserPrompt` | none | 60 s |
| `UserPromptInput` | text input | 0 (none) |
| `UserPromptPassword` | password input with show/hide | 0 (none) |

## Usage

`await UserPrompt.ask(config)` opens a prompt of the calling class and resolves with the answer. It never rejects. You can also append `new UserPrompt(config)` to the document.

| Config | Default | Notes |
|---|---|---|
| `title` | `''` | |
| `text` | `''` | HTML body |
| `options` | `{ Yes: true, No: false }` | `{ label: value }` map, first four used. An array throws |
| `timeout` | class default | Seconds; `0` disables |
| `default_value` | `null` | Value on timeout |
| `on_answer` | null | `on_answer(value, label)`; `label` is null on timeout or when replaced |
| `input_placeholder` | `''` | Input variants |
| `input_default` | `''` | Input variants |

Answer value: the option value for plain prompts; the typed text for input variants, whichever button is pressed. Use `on_answer(value, label)` to tell the buttons apart.

Keys: arrows move between buttons, Enter activates, Escape picks the last button. Enter in the input picks the first button. Opening a prompt answers any other open prompt with null.

`set_theme(theme)` themes one prompt element.

Registry options: `variant` (`question`, `input`, `password`), `button_label`, `title`, `text`, `options`, `timeout`, `input_placeholder`. The tag builds a launcher button; the instance is that button.

## Example

```js
let ok = await UserPrompt.ask({ title: 'Delete', text: 'Delete <b>3</b> files?', allow_html: true, options: { Delete: true, Cancel: false } });
let name = await UserPromptInput.ask({ title: 'Rename', options: { OK: 'ok', Cancel: 'cancel' }, input_default: 'report' });
```

`text` is plain text by default. Set `allow_html: true` to allow simple formatting; scripts and event attributes are always removed.

## Close button

Every prompt shows a small x at the top right. It answers like No or Cancel: the value of an option labelled No or Cancel, or null when there is none. Input and password prompts return null. Escape still picks the last button. Set `closable: false` to hide the x.
