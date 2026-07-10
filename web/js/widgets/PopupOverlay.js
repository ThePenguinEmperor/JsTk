// #region popup_overlay
/**
 * PopupOverlay – a self‑contained modal overlay with scrollable content.
 * @param {Function} content_builder – function(container) to populate the popup.
 * @param {Object} [options] – { width, height, min_width, min_height, max_width, max_height }
 * @param {Function} [on_close] – called when popup is closed.
 */
class PopupOverlay {
    constructor(content_builder, options = {}, on_close = null) {
        this.content_builder = content_builder;
        this.on_close = on_close;
        this.element = null;
        this.wrapper = null;
        this.scroll_panel = null;
        this.content_container = null;
        this.close_btn = null;

        // Default limits (percentages)
        this.default_max_width = '90%';
        this.default_max_height = '85%';

        // Process user options: treat width/height as min sizes if valid
        let min_width = null;
        let min_height = null;
        let max_width = this.default_max_width;
        let max_height = this.default_max_height;

        // Helper to convert percentage to pixels relative to viewport
        const percent_to_px = (percent_str, is_width) => {
            const percent = parseFloat(percent_str);
            if (isNaN(percent)) return null;
            const viewport_size = is_width ? window.innerWidth : window.innerHeight;
            return (percent / 100) * viewport_size;
        };

        if (options.width) {
            const user_width_px = parseFloat(options.width);
            if (!isNaN(user_width_px)) {
                const limit_px = percent_to_px(this.default_max_width, true);
                if (user_width_px <= limit_px) min_width = `${user_width_px}px`;
            }
        }
        if (options.height) {
            const user_height_px = parseFloat(options.height);
            if (!isNaN(user_height_px)) {
                const limit_px = percent_to_px(this.default_max_height, false);
                if (user_height_px <= limit_px) min_height = `${user_height_px}px`;
            }
        }

        if (options.max_width) max_width = options.max_width;
        if (options.max_height) max_height = options.max_height;
        if (options.min_width) min_width = options.min_width;
        if (options.min_height) min_height = options.min_height;

        this.options = { min_width, min_height, max_width, max_height };

        // Bound handler for Escape key (so we can remove it later)
        this._on_keydown = this._on_keydown.bind(this);

        this._inject_styles();
    }

    _inject_styles() {
        if (document.getElementById('popup_overlay_styles')) return;
        const style = document.createElement('style');
        style.id = 'popup_overlay_styles';
        style.textContent = `
            /* #region popup_overlay */
            .popup_overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 3;
            }
            .popup_wrapper {
                position: relative;
                display: flex;
                flex-direction: column;
                width: auto;
                height: auto;
                max-width: 90%;
                max-height: 85%;
            }
            .popup_scroll_panel {
                flex: 1;
                min-height: 0;
                overflow: auto;
                background: #fff;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }
            .popup_content_container {
                padding: 16px;
                box-sizing: border-box;
            }
            .popup_close_btn {
                position: absolute;
                top: -25px;
                right: -25px;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: transparent;
                color: #ffffff;
                border: none;
                border-radius: 50%;
                font-size: 20px;
                font-weight: bold;
                cursor: pointer;
                transition: opacity 0.2s;
                padding: 0;
                line-height: 1;
            }
            /* #endregion popup_overlay */
        `;
        document.head.appendChild(style);
    }

    create_ui() {
        this.element = document.createElement('div');
        this.element.className = 'popup_overlay';

        this.wrapper = document.createElement('div');
        this.wrapper.className = 'popup_wrapper';
        if (this.options.min_width) this.wrapper.style.minWidth = this.options.min_width;
        if (this.options.min_height) this.wrapper.style.minHeight = this.options.min_height;
        if (this.options.max_width) this.wrapper.style.maxWidth = this.options.max_width;
        if (this.options.max_height) this.wrapper.style.maxHeight = this.options.max_height;

        this.scroll_panel = document.createElement('div');
        this.scroll_panel.className = 'popup_scroll_panel';

        this.content_container = document.createElement('div');
        this.content_container.className = 'popup_content_container';

        this.scroll_panel.appendChild(this.content_container);
        this.wrapper.appendChild(this.scroll_panel);

        this.close_btn = document.createElement('button');
        this.close_btn.className = 'popup_close_btn';
        this.close_btn.textContent = '×';
        this.close_btn.addEventListener('click', () => this.close());
        this.wrapper.appendChild(this.close_btn);

        this.element.appendChild(this.wrapper);
        document.body.appendChild(this.element);

        // Close when clicking on the overlay (outside the wrapper)
        this.element.addEventListener('click', (e) => {
            // If the click target is the overlay itself (not a child), close
            if (e.target === this.element) {
                this.close();
            }
        });
        // Prevent clicks inside the wrapper from bubbling to the overlay
        this.wrapper.addEventListener('click', (e) => e.stopPropagation());

        if (this.content_builder) {
            this.content_builder(this.content_container);
        }
    }

    _on_keydown(e) {
        if (e.key === 'Escape') {
            this.close();
        }
    }

    open() {
        if (!this.element) this.create_ui();
        this.element.style.display = 'flex';
        document.addEventListener('keydown', this._on_keydown);
    }

    close() {
        document.removeEventListener('keydown', this._on_keydown);
        if (this.on_close) this.on_close();
        this.destroy();
    }

    destroy() {
        if (this.close_btn) {
            this.close_btn.removeEventListener('click', this.close);
            this.close_btn = null;
        }
        if (this.wrapper) {
            // Remove the stopPropagation listener if needed (optional)
            this.wrapper.removeEventListener('click', (e) => e.stopPropagation());
        }
        if (this.element) {
            this.element.removeEventListener('click', this.close);
            if (this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
        }
        document.removeEventListener('keydown', this._on_keydown);
        this.element = null;
        this.wrapper = null;
        this.scroll_panel = null;
        this.content_container = null;
    }
}
// #endregion popup_overlay