// #region message_box
class MessageBox {
    constructor() {
        this.element = null;
        this.message_text = null;
        this.timeout_id = null;
        // Do NOT create UI here – create on demand in show()
    }

    create_ui() {
        this.element = document.oc.object_generate('div', {
            parent: document.body,
            row: 1,
            col: 1,
            class_name: 'tester_message_box',
            style: 'display: none;'
        });
        let content = document.oc.object_generate('div', {
            parent: this.element,
            row: 1,
            col: 1,
            class_name: 'tester_message_content'
        });
        this.message_text = document.oc.object_generate('span', {
            parent: content,
            row: 1,
            col: 1,
            text: ''
        });
        let close_btn = document.oc.object_generate('button', {
            parent: content,
            row: 1,
            col: 2,
            text: '×',
            class_name: 'tester_message_close',
            events: { click: () => this.hide() }
        });
    }

    show(text, type = 'info') {
        if (!this.element) {
            this.create_ui();
        }
        this.message_text.textContent = text;
        this.element.className = `tester_message_box tester_message_box_${type}`;
        this.element.style.display = 'flex';
        if (this.timeout_id) clearTimeout(this.timeout_id);
        this.timeout_id = setTimeout(() => {
            this.hide();
        }, 15000);
    }

    hide() {
        if (this.element) {
            this.element.style.display = 'none';
            // Optional: remove from DOM after hiding to clean up
            // this.element.parentNode.removeChild(this.element);
            // this.element = null;
        }
        if (this.timeout_id) clearTimeout(this.timeout_id);
    }
}
// #endregion