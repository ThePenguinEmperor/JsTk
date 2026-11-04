/**
 * AnimatedGifButton: static utility for icon buttons that show a still image at rest
 * and play an animated GIF (or animated SVG) while hovered. Never instantiated.
 */
class AnimatedGifButton {
    static _style_ready = false;
    static _css_href = AnimatedGifButton.find_css_href();

    // #region styles
    /**
     * Returns the stylesheet URL next to this script, or the default project path.
     */
    static find_css_href() {
        let src = document.currentScript ? document.currentScript.src : '';
        if (/\/AnimatedGifButton\.js(\?.*)?$/.test(src)) {
            return src.replace(/\.js(\?.*)?$/, '.css');
        }
        return 'web/js/widgets/AnimatedGifButton/AnimatedGifButton.css';
    }

    /**
     * Adds the stylesheet (id animated_gif_css) once per page, guarded by a static flag.
     */
    static ensure_style() {
        if (AnimatedGifButton._style_ready) {
            return;
        }
        let link = document.createElement('link');
        link.id = 'animated_gif_css';
        link.rel = 'stylesheet';
        link.href = AnimatedGifButton._css_href;
        document.head.appendChild(link);
        AnimatedGifButton._style_ready = true;
    }
    // #endregion styles

    // #region public_api
    /**
     * Creates a button in a grid parent through document.oc; returns null without a parent.
     * @param {Object} opts - parent (required), gif_src, static_src, class_name, hint, row, col, sticky,
     *     id, events, fallback_html (used when gif_src is missing).
     */
    static create(opts) {
        let options = opts || {};
        if (!options.parent) {
            return null;
        }
        AnimatedGifButton.ensure_style();
        let class_name = (options.class_name === undefined ? 'animated_gif_btn btn' : options.class_name) + ' animated_gif_btn';
        let btn = document.oc.object_generate('button', {
            parent: options.parent,
            id: options.id,
            class_name: class_name.trim(),
            row: options.row,
            col: options.col,
            sticky: options.sticky,
            attributes: { type: 'button', title: options.hint || '' },
            events: options.events || {}
        });
        if (!btn) {
            return null;
        }
        if (options.gif_src) {
            AnimatedGifButton._wire(btn, options.gif_src, options.static_src);
        } else if (options.fallback_html) {
            btn.innerHTML = options.fallback_html;
        }
        return btn;
    }

    /**
     * Adds the hover behavior to an existing button; idempotent through data-anim_gif="1".
     */
    static attach(btn, gif_src, static_src, fallback_html) {
        if (!btn) {
            return;
        }
        AnimatedGifButton.ensure_style();
        btn.classList.add('animated_gif_btn');
        if (!gif_src) {
            if (fallback_html) {
                btn.innerHTML = fallback_html;
            }
            return;
        }
        if (btn.getAttribute('data-anim_gif') === '1') {
            return;
        }
        btn.setAttribute('data-anim_gif', '1');
        AnimatedGifButton._wire(btn, gif_src, static_src);
    }
    // #endregion public_api

    // #region internals
    /**
     * Returns the URL without its query string; data and blob URLs are kept whole.
     */
    static strip_query(src) {
        let text = String(src);
        if (/^(data|blob):/i.test(text)) {
            return text;
        }
        return text.split('?')[0];
    }

    /**
     * Replaces the button content with one image that animates on hover from the first frame.
     * Data and blob URLs get no cache-buster (it would corrupt them); the source is reassigned instead.
     */
    static _wire(btn, gif_src, static_src) {
        let gif_url = AnimatedGifButton.strip_query(gif_src);
        let rest_url = static_src || gif_url;
        let inline = /^(data|blob):/i.test(gif_url);
        let img = document.createElement('img');
        img.className = 'animated_gif_img';
        img.alt = '';
        img.draggable = false;
        img.src = rest_url;
        btn.replaceChildren(img);
        btn.addEventListener('mouseenter', () => {
            img.src = inline ? gif_url : gif_url + '?t=' + Date.now();
        });
        btn.addEventListener('mouseleave', () => {
            img.src = rest_url;
        });
    }

    /**
     * Returns the inline demo SVG as a data URI; animated adds a spinning arc.
     */
    static demo_image(animated) {
        let spin = animated
            ? '<animateTransform attributeName="transform" type="rotate" from="0 16 16" to="360 16 16" dur="1s" repeatCount="indefinite"/>'
            : '';
        let svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">'
            + '<circle cx="16" cy="16" r="12" fill="none" stroke="#c9cdd4" stroke-width="4"/>'
            + '<path d="M16 4a12 12 0 0 1 12 12" fill="none" stroke="#5b4bdb" stroke-width="4" stroke-linecap="round">'
            + spin + '</path></svg>';
        return 'data:image/svg+xml,' + encodeURIComponent(svg);
    }
    // #endregion internals
}

window.AnimatedGifButton = AnimatedGifButton;
if (window.WidgetRegistry) {
    WidgetRegistry.register('animated_gif_button', {
        label: 'Animated GIF Button',
        category: 'inputs',
        container: false,
        options: [
            { name: 'gif_src', type: 'string', default: AnimatedGifButton.demo_image(true) },
            { name: 'static_src', type: 'string', default: AnimatedGifButton.demo_image(false) },
            { name: 'hint', type: 'string', default: 'Hover to animate' },
            { name: 'class_name', type: 'string', default: 'animated_gif_btn btn' },
            { name: 'fallback_html', type: 'string', default: '' }
        ],
        build: (host, options) => AnimatedGifButton.create({
            parent: host,
            gif_src: options.gif_src,
            static_src: options.static_src,
            hint: options.hint,
            class_name: options.class_name,
            fallback_html: options.fallback_html,
            row: 1,
            col: 1
        })
    });
}
