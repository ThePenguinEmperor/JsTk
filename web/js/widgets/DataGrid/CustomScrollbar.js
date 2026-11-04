class CustomScrollbar {
    constructor(container, options) {
        this.container = container;
        this.orientation = options.orientation || 'vertical';
        this.total_rows = options.total_rows || 0;
        this.viewport_rows = options.viewport_rows || 0;
        this.row_height = options.row_height || 35;
        this.on_scroll = options.on_scroll || (() => {});
        this.current_ratio = 0;
        this.arrow_timer = null;
        this.arrow_step = 0;
        this._inject_styles();
        this._build_dom();
        this._attach_events();
        this._update_thumb();
    }

    _inject_styles() {
        if (document.getElementById('custom_scrollbar_styles')) return;
        let style = document.createElement('style');
        style.id = 'custom_scrollbar_styles';
        style.textContent = `
            .custom_scrollbar {
                display: flex;
                flex-direction: column;
                align-items: center;
                background: #f0f0f0;
                border-left: 1px solid #ddd;
                width: 8px;
                position: absolute;
                right: 0;
                top: 0;
                bottom: 0;
                z-index: 10;
            }
            .custom_scrollbar_horizontal {
                flex-direction: row;
                bottom: 0;
                left: 0;
                right: 0;
                height: 8px;
                width: auto;
                border-left: none;
                border-top: 1px solid #ddd;
            }
            .custom_scrollbar_track {
                flex: 1;
                position: relative;
                width: 100%;
                background: #f0f0f0;
            }
            .custom_scrollbar_thumb {
                position: absolute;
                background: #aaa;
                border-radius: 4px;
                cursor: pointer;
                transition: background 0.2s;
            }
            .custom_scrollbar_thumb:hover {
                background: #666;
            }
            .custom_scrollbar_vertical .custom_scrollbar_thumb {
                width: 100%;
                left: 0;
            }
            .custom_scrollbar_horizontal .custom_scrollbar_thumb {
                height: 100%;
                top: 0;
            }
            .custom_scrollbar_prev, .custom_scrollbar_next {
                background: #e0e0e0;
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 8px;
                width: 100%;
                height: 12px;
                line-height: 12px;
                color: #555;
            }
            .custom_scrollbar_prev:hover, .custom_scrollbar_next:hover {
                background: #ccc;
            }
            .custom_scrollbar_horizontal .custom_scrollbar_prev,
            .custom_scrollbar_horizontal .custom_scrollbar_next {
                width: 12px;
                height: 100%;
            }
        `;
        document.head.appendChild(style);
    }

    _build_dom() {
        this.wrapper = document.createElement('div');
        this.wrapper.className = `custom_scrollbar custom_scrollbar_${this.orientation}`;

        this.track = document.createElement('div');
        this.track.className = 'custom_scrollbar_track';

        this.thumb = document.createElement('div');
        this.thumb.className = 'custom_scrollbar_thumb';

        this.prev_btn = document.createElement('button');
        this.prev_btn.className = 'custom_scrollbar_prev';
        this.prev_btn.textContent = this.orientation === 'vertical' ? '\u25B2' : '\u25C0';

        this.next_btn = document.createElement('button');
        this.next_btn.className = 'custom_scrollbar_next';
        this.next_btn.textContent = this.orientation === 'vertical' ? '\u25BC' : '\u25B6';

        this.track.appendChild(this.thumb);
        this.wrapper.appendChild(this.prev_btn);
        this.wrapper.appendChild(this.track);
        this.wrapper.appendChild(this.next_btn);
        this.container.appendChild(this.wrapper);
    }

    _attach_events() {
        let drag_start = 0;
        let start_pos = 0;
        let on_move = (e) => {
            let delta = (this.orientation === 'vertical' ? e.clientY : e.clientX) - drag_start;
            let new_pos = start_pos + delta;
            let max_move = this._get_max_move();
            new_pos = Math.min(max_move, Math.max(0, new_pos));
            let ratio = new_pos / max_move;
            this.set_scroll_ratio(ratio);
        };
        let on_up = () => {
            document.removeEventListener('mousemove', on_move);
            document.removeEventListener('mouseup', on_up);
        };
        this.thumb.addEventListener('mousedown', (e) => {
            e.preventDefault();
            drag_start = this.orientation === 'vertical' ? e.clientY : e.clientX;
            start_pos = parseFloat(this.thumb.style[this.orientation === 'vertical' ? 'top' : 'left']) || 0;
            document.addEventListener('mousemove', on_move);
            document.addEventListener('mouseup', on_up);
        });

        this.track.addEventListener('click', (e) => {
            if (e.target === this.thumb) return;
            let rect = this.track.getBoundingClientRect();
            let click_pos = (this.orientation === 'vertical' ? e.clientY - rect.top : e.clientX - rect.left);
            let thumb_size = this.orientation === 'vertical' ? this.thumb.offsetHeight : this.thumb.offsetWidth;
            let new_pos = click_pos - thumb_size / 2;
            let max_move = this._get_max_move();
            new_pos = Math.min(max_move, Math.max(0, new_pos));
            let ratio = new_pos / max_move;
            this.set_scroll_ratio(ratio);
        });

        let startArrowScrolling = (direction) => {
            if (this.arrow_timer) clearInterval(this.arrow_timer);
            this.arrow_step = 10;
            let scrollStep = () => {
                let maxStep = Math.max(10, Math.floor(this.total_rows * 0.1));
                let stepRows = Math.min(maxStep, this.arrow_step);
                let ratioDelta = stepRows / this.total_rows;
                let newRatio = this.current_ratio + (direction === 'up' ? -ratioDelta : ratioDelta);
                this.set_scroll_ratio(newRatio);
                this.arrow_step = Math.min(maxStep, this.arrow_step + 5);
            };
            this.arrow_timer = setInterval(scrollStep, 50);
        };
        let stopArrowScrolling = () => {
            if (this.arrow_timer) {
                clearInterval(this.arrow_timer);
                this.arrow_timer = null;
            }
        };
        this.prev_btn.addEventListener('mousedown', () => startArrowScrolling('up'));
        this.prev_btn.addEventListener('mouseup', stopArrowScrolling);
        this.prev_btn.addEventListener('mouseleave', stopArrowScrolling);
        this.next_btn.addEventListener('mousedown', () => startArrowScrolling('down'));
        this.next_btn.addEventListener('mouseup', stopArrowScrolling);
        this.next_btn.addEventListener('mouseleave', stopArrowScrolling);

        let wheelStepRows = 30;
        this.container.addEventListener('wheel', (e) => {
            let delta = (this.orientation === 'vertical' ? e.deltaY : e.deltaX);
            let stepRows = (delta > 0 ? wheelStepRows : -wheelStepRows);
            let ratioDelta = stepRows / this.total_rows;
            let newRatio = this.current_ratio + ratioDelta;
            this.set_scroll_ratio(newRatio);
            e.preventDefault();
        });
    }

    _get_max_move() {
        let track_size = this.orientation === 'vertical' ? this.track.clientHeight : this.track.clientWidth;
        let thumb_size = this.orientation === 'vertical' ? this.thumb.offsetHeight : this.thumb.offsetWidth;
        return track_size - thumb_size;
    }

    _update_thumb() {
        if (this.total_rows <= this.viewport_rows) {
            this.wrapper.style.display = 'none';
            return;
        }
        this.wrapper.style.display = 'flex';
        let track_size = this.orientation === 'vertical' ? this.track.clientHeight : this.track.clientWidth;
        let thumb_ratio = this.viewport_rows / this.total_rows;
        let thumb_size = Math.max(20, track_size * thumb_ratio);
        if (this.orientation === 'vertical') {
            this.thumb.style.height = thumb_size + 'px';
        } else {
            this.thumb.style.width = thumb_size + 'px';
        }
        let max_move = this._get_max_move();
        let current_pos = this.current_ratio * max_move;
        if (this.orientation === 'vertical') {
            this.thumb.style.top = current_pos + 'px';
        } else {
            this.thumb.style.left = current_pos + 'px';
        }
    }

    set_scroll_ratio(ratio) {
        this.current_ratio = Math.min(1, Math.max(0, ratio));
        let max_move = this._get_max_move();
        let new_pos = this.current_ratio * max_move;
        if (this.orientation === 'vertical') {
            this.thumb.style.top = new_pos + 'px';
        } else {
            this.thumb.style.left = new_pos + 'px';
        }
        this.on_scroll(this.current_ratio);
    }

    set_total_rows(rows) {
        this.total_rows = rows;
        this._update_thumb();
    }

    set_viewport_rows(rows) {
        this.viewport_rows = rows;
        this._update_thumb();
    }
}