// #region popup_overlay
class PopupOverlay {
    constructor(content_builder, on_close = null) {
        this.content_builder = content_builder;
        this.on_close = on_close;
        this.element = null;
        this.content_container = null;   // inner container for user content
        this.close_btn = null;
    }

    create_ui() {
        // Overlay container
        this.element = document.createElement('div');
        this.element.id = 'popup_overlay';
        this.element.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 1;
            display: flex;
            justify-content: center;
            align-items: center;
            box-sizing: border-box;
        `;

        // Scroll panel (outer content panel) – this will scroll
        let scroll_panel = document.createElement('div');
        scroll_panel.id = 'popup_scroll_panel';
        scroll_panel.style.cssText = `
            position: relative;
            background-color: #fff;
            border-radius: 8px;
            width: 90%;
            height: 90%;
            overflow-y: auto;          /* scrolls the entire content */
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;

        // Inner content container – user content goes here
        this.content_container = document.createElement('div');
        this.content_container.id = 'popup_content_container';
        this.content_container.style.cssText = `
            padding: 16px;
        `;

        scroll_panel.appendChild(this.content_container);

        // Close button – attached to the overlay (outside scrollable area)
        this.close_btn = document.createElement('button');
        this.close_btn.id = 'popup_close_button';
        this.close_btn.textContent = '×';
        this.close_btn.style.cssText = `
            position: absolute;
            top: 5px;
            right: 5px;
            background-color: rgb(255, 255, 255);
            border: 1px solid rgb(204, 204, 204);
            border-radius: 50%;
            width: 28px;
            height: 28px;
            font-size: 18px;
            cursor: pointer;
            color: rgb(51, 51, 51);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2;
            padding: 0;
            line-height: 1;
            box-sizing: border-box;
        `;
        this.close_btn.addEventListener('click', () => this.close());

        this.element.appendChild(scroll_panel);
        this.element.appendChild(this.close_btn);
        document.body.appendChild(this.element);

        if (this.content_builder) {
            this.content_builder(this.content_container);
        }
    }

    open() {
        if (!this.element) this.create_ui();
        this.element.style.display = 'flex';
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
        this.content_container = null;
    }
}
// #endregion