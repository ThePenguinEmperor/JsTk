class VirtualScroller {
    constructor(dom_manager, pool, model, row_height, total_rows) {
        this.dom = dom_manager;
        this.pool = pool;
        this.model = model;
        this.row_height = row_height;
        this.total_rows = total_rows;
        this.visible_start = 0;
        this.visible_end = 0;
        this._initial_render_done = false;
        this._schedule_initial_render();
    }

    _schedule_initial_render() {
        requestAnimationFrame(() => {
            this._init_scrollbar_and_render();
        });
    }

    _init_scrollbar_and_render() {
        let viewport_rows = Math.max(1, Math.ceil(this.dom.get_viewport_height() / this.row_height));
        console.log('[VirtualScroller] viewport_rows:', viewport_rows);
        console.log('[VirtualScroller] total_rows:', this.total_rows);
        this.dom.init_scrollbar(this.total_rows, viewport_rows, this.row_height, (ratio) => this.on_scroll_ratio(ratio));
        this.visible_start = 0;
        this.visible_end = Math.min(this.total_rows, this.visible_start + viewport_rows + 2);
        console.log('[VirtualScroller] visible_start:', this.visible_start);
        console.log('[VirtualScroller] visible_end:', this.visible_end);
        this._initial_render_done = true;
        this.render();
    }

    on_scroll_ratio(ratio) {
        let max_start = Math.max(0, this.total_rows - 1);
        let new_start = Math.floor(ratio * max_start);
        new_start = Math.min(Math.max(0, new_start), this.total_rows - 1);
        let viewport_h = this.dom.get_viewport_height();
        let visible_rows = Math.ceil(viewport_h / this.row_height);
        let new_end = Math.min(this.total_rows, new_start + visible_rows + 2);
        if (new_start === this.visible_start && new_end === this.visible_end) return;
        this.visible_start = new_start;
        this.visible_end = new_end;
        this.render();
    }

    render() {
        if (!this._initial_render_done) return;
        let row_h = this.row_height;
        let total = this.total_rows;
        let pool_size = this.pool.size();
        console.log('[VirtualScroller] render() called. pool_size:', pool_size, 'visible_start:', this.visible_start, 'visible_end:', this.visible_end);
        for (let i = 0; i < pool_size; i++) {
            let row_node = this.pool.get(i);
            let row_index = this.visible_start + i;
            if (row_index >= this.visible_end || row_index >= total) {
                row_node.element.style.display = 'none';
                continue;
            }
            row_node.element.style.display = 'flex';
            row_node.element.style.position = 'absolute';
            row_node.element.style.top = ((row_index - this.visible_start) * row_h) + 'px';
            let row_data = this.model.get_row(row_index);
            row_node.update(row_index, row_data, this.model, this.model.columns);
        }
        let viewport_rows = Math.max(1, Math.ceil(this.dom.get_viewport_height() / row_h));
        this.dom.update_scrollbar(this.total_rows, viewport_rows);
    }

    refresh() {
        this.render();
    }
}