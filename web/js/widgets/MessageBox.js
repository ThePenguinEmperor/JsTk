// #region message_box_widget
class MessageBox {
    constructor(options = {}) {
        this.text = options.text || '';
        this.type = options.type || 'info';
        this.timeout = (options.timeout !== undefined) ? options.timeout : 30000;
        this.target = options.target || null;
        this.position = options.position || 'top';
        this.user_css = options.css || {};
        this.element = null;
        this.timeout_id = null;

        // Type-specific container overrides
        let tone = { info: 'var(--accent, #5b4bdb)', success: 'var(--success, #12a46a)', error: 'var(--danger, #e5484d)', warning: 'var(--warning, #f08a24)' }[this.type] || 'var(--accent, #5b4bdb)';
        let type_style = {
            backgroundColor: 'color-mix(in srgb, ' + tone + ' 16%, var(--surface, #ffffff))',
            color: 'var(--text_primary, #161a3a)',
            border: '1px solid color-mix(in srgb, ' + tone + ' 40%, transparent)',
            borderLeft: '4px solid ' + tone
        };

        // ONE DICTIONARY with all styling
        this.styles = {
            container: {
                position: 'fixed',
                zIndex: '5',
                maxWidth: '300px',
                minWidth: '150px',
                padding: '12px 16px',
                borderRadius: '8px',
                fontFamily: 'var(--font_ui, system-ui, sans-serif)',
                fontSize: '14px',
                lineHeight: '1.4',
                boxShadow: 'var(--shadow_md, 0 2px 8px rgba(0,0,0,0.15))',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '12px',
                pointerEvents: 'auto',
                transition: 'opacity 0.15s ease',
                opacity: '1',
                ...type_style,
                ...(this.user_css.container || {})
            },
            text: {
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                flex: '1',
                margin: '0',
                ...(this.user_css.text || {})
            },
            close_button: {
                background: 'none',
                color: 'inherit',
                border: 'none',
                fontSize: '16px',
                cursor: 'pointer',
                padding: '0',
                marginLeft: '8px',
                fontWeight: 'bold',
                opacity: '0.6',
                ...(this.user_css.close_button || {})
            }
        };
    }

    apply_style(el, style_dict) {
        for (let p in style_dict) el.style[p] = style_dict[p];
    }

    calculate_position() {
        if (!this.target || !this.target.getBoundingClientRect) {
            return { top: (window.innerHeight/2)-50, left: (window.innerWidth/2)-150 };
        }
        let r = this.target.getBoundingClientRect();
        let w = this.element ? this.element.offsetWidth : 250;
        let h = this.element ? this.element.offsetHeight : 80;
        let s = 10;
        switch (this.position) {
            case 'top': return { top: r.top - h - s, left: r.left + r.width/2 - w/2 };
            case 'bottom': return { top: r.bottom + s, left: r.left + r.width/2 - w/2 };
            case 'left': return { top: r.top + r.height/2 - h/2, left: r.left - w - s };
            case 'right': return { top: r.top + r.height/2 - h/2, left: r.right + s };
            case 'over': return { top: r.top + r.height/2 - h/2, left: r.left + r.width/2 - w/2 };
            default: return { top: r.bottom + s, left: r.left };
        }
    }

    clamp_to_viewport(pos) {
        let w = this.element ? this.element.offsetWidth : 250;
        let h = this.element ? this.element.offsetHeight : 80;
        return {
            top: Math.min(window.innerHeight - h - 10, Math.max(10, pos.top)),
            left: Math.min(window.innerWidth - w - 10, Math.max(10, pos.left))
        };
    }

    build() {
        let el = document.createElement('div');
        this.apply_style(el, this.styles.container);
        let text_span = document.createElement('span');
        this.apply_style(text_span, this.styles.text);
        text_span.textContent = this.text;
        el.appendChild(text_span);
        let btn = document.createElement('button');
        this.apply_style(btn, this.styles.close_button);
        btn.textContent = 'x';
        btn.onmouseover = () => btn.style.opacity = '1';
        btn.onmouseout = () => btn.style.opacity = '0.6';
        btn.onclick = () => this.destroy();
        el.appendChild(btn);
        return el;
    }

    show() {
        if (this.element) this.destroy();
        this.element = this.build();
        document.body.appendChild(this.element);
        let pos = this.clamp_to_viewport(this.calculate_position());
        this.element.style.top = pos.top + 'px';
        this.element.style.left = pos.left + 'px';
        if (this.timeout > 0) {
            this.timeout_id = setTimeout(() => this.destroy(), this.timeout);
        }
    }

    destroy() {
        if (this.timeout_id) clearTimeout(this.timeout_id);
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
            this.element = null;
        }
    }

    // Static helpers
    static info(text, target, opts = {}) { let m = new MessageBox({...opts, text, type:'info', target}); m.show(); return m; }
    static success(text, target, opts = {}) { let m = new MessageBox({...opts, text, type:'success', target}); m.show(); return m; }
    static error(text, target, opts = {}) { let m = new MessageBox({...opts, text, type:'error', target}); m.show(); return m; }
    static warning(text, target, opts = {}) { let m = new MessageBox({...opts, text, type:'warning', target}); m.show(); return m; }
}
window.MessageBox = MessageBox;
// #endregion