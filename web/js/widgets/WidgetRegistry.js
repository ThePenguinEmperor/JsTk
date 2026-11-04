/**
 * WidgetRegistry: catalog of composite widgets that document.oc.object_generate can build by tag.
 *
 * Entry shape passed to register(tag, entry):
 *   label      Display name for the tester.
 *   category   Optional group name for the tester tag list.
 *   container  True when other widgets can be placed inside it.
 *   options    [{ name, type: 'string'|'number'|'bool'|'select'|'json', default, choices, label }].
 *   build(host, options)  Builds the widget inside host (an already placed grid cell div).
 *              Returns { instance, content_container } or the instance itself.
 */
class WidgetRegistry {
    static _entries = new Map();

    // #region registration
    /**
     * Adds or replaces a widget entry under a snake_case tag.
     */
    static register(tag, entry) {
        if (typeof entry.build !== 'function') {
            console.error('[widget_registry] missing_build: ' + tag);
            return;
        }
        WidgetRegistry._entries.set(tag, Object.assign({ label: tag, category: 'widgets', container: false, options: [] }, entry));
    }

    /**
     * Returns the entry for a tag, or null.
     */
    static get(tag) {
        let entry = WidgetRegistry._entries.get(tag);
        return entry || null;
    }

    /**
     * Lists registered tags sorted by category, then label.
     */
    static list_tags() {
        let entries = [...WidgetRegistry._entries.entries()];
        entries.sort((a, b) => (a[1].category + a[1].label).localeCompare(b[1].category + b[1].label));
        return entries.map(pair => pair[0]);
    }
    // #endregion registration

    // #region building
    /**
     * Fills missing options with their declared defaults.
     */
    static resolve_options(tag, options) {
        let entry = WidgetRegistry.get(tag);
        let resolved = Object.assign({}, options || {});
        let fields = entry ? entry.options : [];
        let known = new Set(fields.map(field => field.name));
        for (let name of Object.keys(resolved)) {
            if (!known.has(name) && fields.length > 0) {
                console.warn('[widget_registry] unknown_option: ' + tag + '.' + name);
            }
        }
        for (let field of fields) {
            if (resolved[field.name] === undefined) {
                if (field.default !== undefined) {
                    resolved[field.name] = field.default;
                }
                continue;
            }
            resolved[field.name] = WidgetRegistry.coerce_option(tag, field, resolved[field.name]);
        }
        return resolved;
    }

    /**
     * Converts one option value to its declared type; a bad value logs one warning and falls back to the default.
     */
    static coerce_option(tag, field, value) {
        let fallback = () => {
            console.warn('[widget_registry] bad_option: ' + tag + '.' + field.name + ' expected ' + field.type);
            return field.default;
        };
        if (field.type === 'number') {
            let number = typeof value === 'string' && value.trim() === '' ? NaN : Number(value);
            return Number.isFinite(number) ? number : fallback();
        }
        if (field.type === 'bool') {
            if (typeof value === 'boolean') {
                return value;
            }
            if (value === 'true' || value === 'false') {
                return value === 'true';
            }
            return fallback();
        }
        if (field.type === 'select') {
            let choices = field.choices || [];
            return choices.length === 0 || choices.includes(value) ? value : fallback();
        }
        if (field.type === 'json' && typeof value === 'string') {
            try {
                return JSON.parse(value);
            } catch (error) {
                return fallback();
            }
        }
        if (field.type === 'string' && value !== null && typeof value !== 'string') {
            return String(value);
        }
        return value;
    }

    /**
     * Destroys the widget instance that was built into a host, if it has a destroy method.
     */
    static destroy_host(host) {
        let instance = host && host.widget_instance;
        if (instance && typeof instance.destroy === 'function') {
            try {
                instance.destroy();
            } catch (error) {
                console.error('[widget_registry] destroy_failed', error);
            }
        }
        if (host) {
            host.widget_instance = null;
            host.content_container = null;
        }
    }

    /**
     * Builds a registered widget inside host and links it on the host element.
     * Sets host.widget_instance and host.content_container.
     */
    static build_into(tag, host, options) {
        let entry = WidgetRegistry.get(tag);
        let result = null;
        WidgetRegistry.destroy_host(host);
        try {
            result = entry.build(host, WidgetRegistry.resolve_options(tag, options));
        } catch (error) {
            console.error('[widget_registry] build_failed: ' + tag, error);
            host.textContent = tag + ' failed to build';
            return host;
        }
        let has_shape = result && typeof result === 'object' && ('instance' in result || 'content_container' in result);
        host.widget_instance = has_shape ? result.instance : result;
        host.content_container = (has_shape && result.content_container) || (entry.container ? host : null);
        return host;
    }
    // #endregion building
}

window.WidgetRegistry = WidgetRegistry;
