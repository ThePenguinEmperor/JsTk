// #region object_list
class ObjectList {
    constructor(controller) {
        this.controller = controller;
        this.container = null;
    }

    build(parent, row, col, colSpan, sticky, margin) {
        this.container = document.oc.object_generate('div', {
            parent: parent,
            row: row,
            col: col,
            sticky: sticky,
            class_name: 'tester_object_list',
            padx: margin.x,
            pady: margin.y
        });
        if (colSpan !== undefined) {
            this.container.style.gridColumn = `span ${colSpan}`;
        }
    }

    refresh(objects) {
        this.container.innerHTML = '';
        for (let obj of objects) {
            let item = document.oc.object_generate('div', {
                parent: this.container,
                row: 1,
                col: 1,
                class_name: 'tester_object_item'
            });
            let info = document.oc.object_generate('span', {
                parent: item,
                row: 1,
                col: 1,
                text: `${obj.tag} (${obj.id}) - row ${obj.params.row || 1}, col ${obj.params.col || 1}`,
                class_name: 'tester_object_info'
            });
            let actions = document.oc.object_generate('div', {
                parent: item,
                row: 1,
                col: 2,
                class_name: 'tester_object_actions'
            });
            let edit_btn = document.oc.object_generate('button', {
                parent: actions,
                row: 1,
                col: 1,
                text: 'Edit',
                class_name: 'tester_button tester_button_secondary',
                events: { click: () => this.controller.edit_object(obj.id) }
            });
            let del_btn = document.oc.object_generate('button', {
                parent: actions,
                row: 1,
                col: 2,
                text: 'Delete',
                class_name: 'tester_button tester_button_danger',
                events: { click: () => this.controller.delete_object(obj.id) }
            });
        }
    }
}
// #endregion