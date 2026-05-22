// #region popup_overlay
class PopupOverlay {
    constructor(content_builder, on_close = null) {
        this.content_builder = content_builder;
        this.on_close = on_close;
        this.element = null;
        this.wrapper = null;
        this.scroll_panel = null;
        this.content_container = null;
        this.close_btn = null;
        this._inject_styles();
    }

    _inject_styles() {
        if (document.getElementById('popup_overlay_styles')) return;
        const style = document.createElement('style');
        style.id = 'popup_overlay_styles';
        style.textContent = `
            /* Overlay – full screen, flex centering */
            .popup_overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                z-index: 10000;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            /* Wrapper – flex column, limited height, sized to content width */
            .popup_wrapper {
                position: relative;
                display: flex;
                flex-direction: column;
                max-width: 90%;
                max-height: 85%;
                width: auto;
                height: auto;
            }
            /* Scroll panel – fills wrapper, scrolls when content overflows */
            .popup_scroll_panel {
                flex: 1;
                min-height: 0;
                overflow: auto;
                background: #fff;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }
            /* Content container – internal padding */
            .popup_content_container {
                padding: 16px;
                box-sizing: border-box;
            }
            /* Close button – positioned outside wrapper */
            .popup_close_btn {
                position: absolute;
                top: -25px;
                right: -25px;
                background: transparent;
                border: none;
                width: 24px;
                height: 24px;
                font-size: 20px;
                font-weight: bold;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0;
                line-height: 1;
                border-radius: 50%;
                transition: opacity 0.2s;
            }
            /* CSS Editor specific styles (fixed size, no internal overflow) */
            .css_editor_content {
                width: 700px;
                height: 1200px;
                display: flex;
                flex-direction: column;
                box-sizing: border-box;
                overflow: visible;
            }
            .css_collapsible_header {
                cursor: pointer;
                padding: 8px;
                background-color: #f1f1f1;
                margin-top: 8px;
                user-select: none;
                font-weight: bold;
                border-radius: 4px;
            }
            .css_collapsible_content {
                overflow: visible;
                display: block;
                padding-left: 8px;
            }
            .css_property_grid {
                display: grid;
                grid-template-columns: auto 1fr;
                gap: 8px;
                padding: 10px;
                width: 100%;
                box-sizing: border-box;
                overflow: visible;
            }
            .css_property_grid label {
                font-size: 12px;
                font-weight: bold;
            }
            .css_property_grid input {
                width: 100%;
                box-sizing: border-box;
                padding: 4px 6px;
                border: 1px solid #ccc;
                border-radius: 4px;
            }
            .css_custom_textarea {
                width: 100%;
                min-height: 150px;
                font-family: monospace;
                font-size: 12px;
                resize: vertical;
                overflow: visible;
                border: 1px solid #ccc;
                border-radius: 4px;
                padding: 6px;
                box-sizing: border-box;
            }
            .css_editor_buttons {
                margin-top: 20px;
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }
        `;
        document.head.appendChild(style);
    }

    create_ui() {
        this.element = document.createElement('div');
        this.element.className = 'popup_overlay';

        this.wrapper = document.createElement('div');
        this.wrapper.className = 'popup_wrapper';

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
// #endregion