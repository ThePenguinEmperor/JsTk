// #region preview_css_editor
class PreviewCssEditor {
    constructor(controller) {
        this.controller = controller;
        this.textarea = null;
    }

    build(parent, row, col, colSpan, sticky, margin) {
        this.textarea = document.oc.object_generate('textarea', {
            parent: parent,
            row: row,
            col: col,
            sticky: sticky,
            class_name: 'tester_textarea',
            placeholder: 'Enter CSS for the preview grid...',
            padx: margin.x,
            pady: margin.y
        });
        if (colSpan !== undefined) {
            this.textarea.style.gridColumn = `span ${colSpan}`;
        }
    }

    copy_css() {
        navigator.clipboard.writeText(this.textarea.value);
        this.controller.show_message('Preview CSS copied', 'success');
    }

    apply_css() {
        this.controller.apply_preview_css(this.textarea.value);
    }

    load_css() {
        let current_css = this.controller.get_preview_grid_css();
        this.textarea.value = current_css;
        this.controller.show_message('Preview CSS loaded from grid', 'success');
    }

    set_value(css) {
        this.textarea.value = css;
    }

    get_value() {
        return this.textarea.value;
    }
}
// #endregion