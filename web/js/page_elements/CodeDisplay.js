// #region code_display
class CodeDisplay {
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
            readOnly: true,
            padx: margin.x,
            pady: margin.y
        });
        if (colSpan !== undefined) {
            this.textarea.style.gridColumn = `span ${colSpan}`;
        }
    }

    update_code(objects) {
        let lines = [];
        lines.push('// Generated code using ObjectCreator');
        for (let obj of objects) {
            let params = obj.params;
            let method = `object_generate('${params.tag}')`;
            let param_str = `{ parent: document.getElementById('preview_grid'), row: ${params.row}, col: ${params.col}`;
            if (params.sticky) param_str += `, sticky: '${params.sticky}'`;
            if (params.rowSpan) param_str += `, rowSpan: ${params.rowSpan}`;
            if (params.colSpan) param_str += `, colSpan: ${params.colSpan}`;
            if (params.id) param_str += `, id: '${params.id}'`;
            if (params.class_name) param_str += `, class_name: '${params.class_name}'`;
            if (params.padx) param_str += `, padx: ${params.padx}`;
            if (params.pady) param_str += `, pady: ${params.pady}`;
            if (params.ipadx) param_str += `, ipadx: ${params.ipadx}`;
            if (params.ipady) param_str += `, ipady: ${params.ipady}`;
            param_str += ' }';
            lines.push(`document.oc.${method}(${param_str});`);
        }
        this.textarea.value = lines.join('\n');
    }

    copy_code() {
        navigator.clipboard.writeText(this.textarea.value);
        this.controller.show_message('Code copied to clipboard', 'success');
    }

    load_code() {
        let code = this.textarea.value;
        this.controller.load_code(code);
    }
}
// #endregion