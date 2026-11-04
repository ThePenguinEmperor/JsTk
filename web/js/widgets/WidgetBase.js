/**
 * WidgetBase: shared lifecycle, small event API and safe-HTML helpers for jinker widgets.
 * Subclasses call super() first, register listeners and timers through the helpers below,
 * and get a complete cleanup from destroy().
 */
class WidgetBase {
    static ALLOWED_TAGS = new Set([
        'a', 'b', 'strong', 'i', 'em', 'u', 's', 'br', 'p', 'span', 'div', 'ul', 'ol', 'li', 'code', 'pre', 'small', 'sub', 'sup'
    ]);
    static DROPPED_TAGS = new Set(['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'template', 'svg', 'math']);

    constructor() {
        this._cleanups = [];
        this._handlers = new Map();
        this.is_destroyed = false;
    }

    // #region safe_html
    /**
     * Escapes text so it can be placed inside HTML.
     */
    static escape_html(text) {
        let value = text === null || text === undefined ? '' : String(text);
        return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    /**
     * Returns true when a link target uses a safe scheme.
     */
    static is_safe_href(href) {
        return /^(https?:|mailto:|#|\/)/i.test(String(href).trim());
    }

    /**
     * Removes scripts, event attributes and unknown tags from an HTML string; keeps simple formatting.
     */
    static sanitize_html(html) {
        let template = document.createElement('template');
        template.innerHTML = html === null || html === undefined ? '' : String(html);
        WidgetBase._clean_node(template.content);
        return template.innerHTML;
    }

    /**
     * Cleans the children of a node in place.
     */
    static _clean_node(node) {
        for (let child of [...node.childNodes]) {
            if (child.nodeType === Node.COMMENT_NODE) {
                child.remove();
                continue;
            }
            if (child.nodeType !== Node.ELEMENT_NODE) {
                continue;
            }
            let tag = child.tagName.toLowerCase();
            if (WidgetBase.DROPPED_TAGS.has(tag)) {
                child.remove();
                continue;
            }
            WidgetBase._clean_node(child);
            if (!WidgetBase.ALLOWED_TAGS.has(tag)) {
                child.replaceWith(...child.childNodes);
                continue;
            }
            WidgetBase._clean_attributes(child, tag);
        }
    }

    /**
     * Drops every attribute except a safe href on links.
     */
    static _clean_attributes(el, tag) {
        let href = tag === 'a' ? el.getAttribute('href') : null;
        for (let name of el.getAttributeNames()) {
            el.removeAttribute(name);
        }
        if (href !== null && WidgetBase.is_safe_href(href)) {
            el.setAttribute('href', href);
            el.setAttribute('rel', 'noopener noreferrer');
            el.setAttribute('target', '_blank');
        }
    }

    /**
     * Puts text into an element: as plain text by default, as sanitized HTML when allow_html is true.
     */
    static set_content(el, text, allow_html) {
        if (allow_html === true) {
            el.innerHTML = WidgetBase.sanitize_html(text);
            return;
        }
        el.textContent = text === null || text === undefined ? '' : String(text);
    }
    // #endregion safe_html

    // #region events
    /**
     * Subscribes to a widget event; returns a function that unsubscribes.
     */
    on(name, handler) {
        if (typeof handler !== 'function') {
            return () => {};
        }
        if (!this._handlers.has(name)) {
            this._handlers.set(name, new Set());
        }
        this._handlers.get(name).add(handler);
        return () => this.off(name, handler);
    }

    /**
     * Removes one handler, or every handler of the event when none is given.
     */
    off(name, handler) {
        if (!this._handlers.has(name)) {
            return;
        }
        if (handler) {
            this._handlers.get(name).delete(handler);
            return;
        }
        this._handlers.delete(name);
    }

    /**
     * Calls every handler of the event; a failing handler is logged and does not stop the others.
     */
    emit(name, detail) {
        let set = this._handlers.get(name);
        if (!set) {
            return;
        }
        for (let handler of [...set]) {
            try {
                handler(detail, this);
            } catch (error) {
                console.error('[widget_base] handler_failed: ' + name, error);
            }
        }
    }
    // #endregion events

    // #region lifecycle
    /**
     * Adds a DOM listener that destroy() removes again.
     */
    listen(target, type, handler, options) {
        target.addEventListener(type, handler, options);
        this._cleanups.push(() => target.removeEventListener(type, handler, options));
    }

    /**
     * Starts a timeout that destroy() cancels.
     */
    set_timer(handler, delay_ms) {
        let id = setTimeout(handler, delay_ms);
        this._cleanups.push(() => clearTimeout(id));
        return id;
    }

    /**
     * Starts an interval that destroy() cancels.
     */
    set_repeat(handler, delay_ms) {
        let id = setInterval(handler, delay_ms);
        this._cleanups.push(() => clearInterval(id));
        return id;
    }

    /**
     * Requests an animation frame that destroy() cancels.
     */
    next_frame(handler) {
        let id = requestAnimationFrame(handler);
        this._cleanups.push(() => cancelAnimationFrame(id));
        return id;
    }

    /**
     * Registers any extra cleanup function to run on destroy().
     */
    add_cleanup(fn) {
        this._cleanups.push(fn);
    }

    /**
     * Runs all cleanups, drops event handlers and removes the root element. Safe to call twice.
     */
    destroy() {
        if (this.is_destroyed) {
            return;
        }
        this.is_destroyed = true;
        for (let cleanup of this._cleanups.splice(0)) {
            try {
                cleanup();
            } catch (error) {
                console.error('[widget_base] cleanup_failed', error);
            }
        }
        this._handlers.clear();
        let root = this.element;
        if (root instanceof Element) {
            root.remove();
        }
    }
    // #endregion lifecycle
}

window.WidgetBase = WidgetBase;
