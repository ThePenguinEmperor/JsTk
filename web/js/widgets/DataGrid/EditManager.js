// #region edit_manager
class EditManager {
    constructor(model, dom_manager, on_change) {
        this.model = model;
        this.dom = dom_manager;
        this.on_change = on_change;
        this.dom.add_event_listener('dblclick', this.handle_dblclick.bind(this));
    }

    handle_dblclick(event) {
        let cell = event.target.closest('.data_table_cell');
        if (!cell) return;
        let row_idx = parseInt(cell.parentElement.getAttribute('data-row-index'));
        let col_idx = parseInt(cell.getAttribute('data-col-index'));
        if (isNaN(row_idx) || isNaN(col_idx)) return;
        let col = this.model.columns[col_idx];
        let field = col.field;
        let old_value = this.model.get_cell_value(row_idx, field);

        if (col.type === 'boolean' || typeof old_value === 'boolean') {
            this._edit_boolean(cell, row_idx, col_idx, field, old_value, col);
        } else {
            this._edit_text(cell, row_idx, col_idx, field, old_value, col);
        }
    }

    _edit_text(cell, row_idx, col_idx, field, old_value, col) {
        cell.innerHTML = '';
        cell.style.position = 'relative';
        cell.style.padding = '0';
        let input = document.createElement('input');
        input.value = old_value;
        input.style.width = '100%';
        input.style.height = '100%';
        input.style.border = 'none';
        input.style.outline = 'none';
        input.style.padding = '4px 8px';
        input.style.boxSizing = 'border-box';
        input.style.position = 'absolute';
        input.style.left = '0';
        input.style.top = '0';
        input.style.margin = '0';
        cell.appendChild(input);
        input.focus();
        input.select();

        let save = () => {
            let new_value = input.value;
            this.model.set_cell_value(row_idx, field, new_value);
            if (col.width === 'auto') {
                let header_cell = this.dom.header.querySelector(`[data-col-index="${col_idx}"]`);
                if (header_cell) {
                    let new_width = Math.max(header_cell.offsetWidth, (new_value.length * 8) + 20) + 'px';
                    col.width = new_width;
                    this.dom.update_column_widths(this.model.columns);
                }
            }
            if (this.on_change) this.on_change();
        };
        input.addEventListener('blur', save);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') save();
            else if (e.key === 'Escape') {
                cell.innerHTML = old_value;
                if (this.on_change) this.on_change();
            }
        });
    }

    _edit_boolean(cell, row_idx, col_idx, field, old_value, col) {
        cell.innerHTML = '';
        cell.style.padding = '0';
        let select = document.createElement('select');
        let option_true = document.createElement('option');
        option_true.value = 'true';
        option_true.textContent = 'true';
        let option_false = document.createElement('option');
        option_false.value = 'false';
        option_false.textContent = 'false';
        select.appendChild(option_true);
        select.appendChild(option_false);
        select.value = old_value ? 'true' : 'false';
        select.style.width = '100%';
        select.style.height = '100%';
        select.style.border = 'none';
        select.style.outline = 'none';
        select.style.padding = '4px 8px';
        select.style.boxSizing = 'border-box';
        cell.appendChild(select);
        select.focus();

        let save = () => {
            let new_value = select.value === 'true';
            this.model.set_cell_value(row_idx, field, new_value);
            if (this.on_change) this.on_change();
        };
        select.addEventListener('blur', save);
        select.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') save();
            else if (e.key === 'Escape') {
                cell.innerHTML = old_value ? '\u2705' : '\u274C';
                if (this.on_change) this.on_change();
            }
        });
    }
}
// #endregion