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

        // Check if user provided width/height and if they exceed limits
        if (options.width) {
            const user_width_px = parseFloat(options.width);
            if (!isNaN(user_width_px)) {
                const limit_px = percent_to_px(this.default_max_width, true);
                if (user_width_px <= limit_px) {
                    min_width = `${user_width_px}px`;
                }
                // else ignore – limit will apply
            } else {
                // if width is something like 'auto', use as is? not typical – ignore.
            }
        }
        if (options.height) {
            const user_height_px = parseFloat(options.height);
            if (!isNaN(user_height_px)) {
                const limit_px = percent_to_px(this.default_max_height, false);
                if (user_height_px <= limit_px) {
                    min_height = `${user_height_px}px`;
                }
            }
        }

        // Override max if user provided
        if (options.max_width) max_width = options.max_width;
        if (options.max_height) max_height = options.max_height;
        if (options.min_width) min_width = options.min_width;
        if (options.min_height) min_height = options.min_height;

        this.options = {
            min_width,
            min_height,
            max_width,
            max_height
        };

        this._inject_styles();
    }

    _inject_styles() {
        if (document.getElementById('popup_overlay_styles')) return;
        const style = document.createElement('style');
        style.id = 'popup_overlay_styles';
        style.textContent = `
            /* #region popup_overlay */
            .popup_overlay {
                /* Layout */
                position: fixed;
                top: 0;
                left: 0;
                /* Dimensions */
                width: 100%;
                height: 100%;
                /* Colors */
                background-color: rgba(0, 0, 0, 0.5);
                /* Layout */
                display: flex;
                justify-content: center;
                align-items: center;
                /* Z-index */
                z-index: 1;
            }
            .popup_wrapper {
                /* Layout */
                position: relative;
                display: flex;
                flex-direction: column;
                /* Dimensions */
                width: auto;
                height: auto;
                max-width: 90%;
                max-height: 85%;
            }
            .popup_scroll_panel {
                /* Layout */
                flex: 1;
                /* Dimensions */
                min-height: 0;
                /* Effects */
                overflow: auto;
                /* Colors */
                background: #fff;
                /* Borders */
                border-radius: 8px;
                /* Effects */
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }
            .popup_content_container {
                /* Dimensions */
                padding: 16px;
                /* Layout */
                box-sizing: border-box;
            }
            .popup_close_btn {
                /* Layout */
                position: absolute;
                top: -25px;
                right: -25px;
                /* Dimensions */
                width: 24px;
                height: 24px;
                /* Layout */
                display: flex;
                align-items: center;
                justify-content: center;
                /* Colors */
                background: transparent;
                /* Borders */
                border: none;
                border-radius: 50%;
                /* Typography */
                font-size: 20px;
                font-weight: bold;
                /* Effects */
                cursor: pointer;
                transition: opacity 0.2s;
                /* Dimensions */
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
        // Apply size options
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

        if (this.content_builder) {
            this.content_builder(this.content_container);
        }

        this._update_close_button_contrast();
    }

    _update_close_button_contrast() {
        if (!this.close_btn || !this.scroll_panel) return;
        const bg_color = window.getComputedStyle(this.scroll_panel).backgroundColor;
        const rgb = bg_color.match(/\d+/g);
        if (rgb) {
            const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
            this.close_btn.style.color = luminance > 0.5 ? '#000000' : '#ffffff';
        } else {
            this.close_btn.style.color = '#000000';
        }
    }

    open() {
        if (!this.element) this.create_ui();
        this.element.style.display = 'flex';
        this._update_close_button_contrast();
    }

    close() {
        if (this.on_close) this.on_close();
        this.destroy();
    }

    destroy() {
        if (this.close_btn) {
            this.close_btn.removeEventListener('click', this.close);
            this.close_btn = null;
        }
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
        this.wrapper = null;
        this.scroll_panel = null;
        this.content_container = null;
    }
}
// #endregion popup_overlay