# AppStore

File: `web/js/widgets/AppStore/AppStore.js`. No tag. Global: `window.AppStore`.

Page-wide reactive key/value store. Static only.

## Static methods

| Method | Notes |
|---|---|
| `set(key, value)` | Stores and calls every subscriber of `key` synchronously, in subscribe order |
| `get(key)` | Stored reference, or `undefined` |
| `subscribe(key, fn)` | `fn(value)` on every set; called at once if the key exists. Returns an unsubscribe function |
| `set_if_changed(key, value)` | Sets only when the JSON form differs. Unserializable values always set |

A subscriber that throws is logged and does not stop the others.

## Example

```js
let off = AppStore.subscribe('status', s => bar.set_label(s));
AppStore.set('status', 'Running');
off();
```
