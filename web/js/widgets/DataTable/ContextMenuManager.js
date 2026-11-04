// #region context_menu_manager
class ContextMenuManager {
    constructor(table) {
        this.table = table;
    }

    show(event) {
        let cell = event.target.closest('.data_table_cell');
        if (!cell) return;
        event.preventDefault();
        let row_idx = parseInt(cell.parentElement.getAttribute('data-row-index'));
        let col_idx = parseInt(cell.getAttribute('data-col-index'));
        let x = event.clientX;
        let y = event.clientY;
        let menu = document.createElement('div');
        menu.className = 'data_table_context_menu';
        menu.style.cssText = 'position:absolute; background:white; border:1px solid #ccc; border-radius:4px; padding:4px 0; box-shadow:0 2px 8px rgba(0,0,0,0.15); z-index:1002;';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        let items = [
            { label: 'Edit', action: () => this.table.start_inline_edit(row_idx, col_idx, cell) },
            { label: 'Copy', action: () => this.table.copy_selection() },
            { label: 'Undo', action: () => this.table.undo_manager.undo() },
            { label: 'Redo', action: () => this.table.undo_manager.redo() }
        ];
        if (this.table.options.filterable) {
            items.push({ label: 'Clear All Filters', action: () => this.table.clear_all_filters() });
        }
        for (let item of items) {
            let div = document.createElement('div');
            div.textContent = item.label;
            div.style.cssText = 'padding:4px 12px; cursor:pointer;';
            div.onmouseover = () => div.style.backgroundColor = '#f0f0f0';
            div.onmouseout = () => div.style.backgroundColor = 'white';
            div.onclick = () => {
                item.action();
                menu.remove();
            };
            menu.appendChild(div);
        }
        document.body.appendChild(menu);
        let close = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', close);
            }
        };
        setTimeout(() => document.addEventListener('click', close), 0);
    }
}
// #endregion