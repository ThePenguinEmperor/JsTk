/**
 * HintPopup: page-wide singleton that replaces native title tooltips with a themed hint panel.
 * Used only through static members; activates itself when the script loads.
 */
class HintPopup {
    static CSS_URL = (document.currentScript && document.currentScript.src)
        ? document.currentScript.src.replace(/\.js(\?.*)?$/, '.css')
        : 'web/js/widgets/HintPopup/HintPopup.css';
    static DELAY_MS = 350;
    static _initialized = false;
    static _panel = null;
    static _anchor = null;
    static _timer = null;

    // #region setup
    /**
     * Attaches the global hover and scroll listeners and the stylesheet; only the first call acts.
     */
    static init() {
        if (HintPopup._initialized) {
            return;
        }
        HintPopup._initialized = true;
        if (!document.getElementById('hp_styles')) {
            let link = document.createElement('link');
            link.id = 'hp_styles';
            link.rel = 'stylesheet';
            link.href = HintPopup.CSS_URL;
            document.head.appendChild(link);
        }
        document.addEventListener('mouseover', e => HintPopup.on_over(e), true);
        document.addEventListener('mouseout', e => HintPopup.on_out(e), true);
        document.addEventListener('scroll', () => HintPopup.cancel(), true);
    }

    /**
     * Returns the singleton panel, creating it on first use.
     */
    static get_panel() {
        if (!HintPopup._panel) {
            HintPopup._panel = document.createElement('div');
            HintPopup._panel.id = 'app_hint_popup';
            HintPopup._panel.className = 'hp_panel';
            document.body.appendChild(HintPopup._panel);
        }
        return HintPopup._panel;
    }
    // #endregion setup

    // #region hover_tracking
    /**
     * Returns the nearest element from el upward (below body) with a non-empty title.
     */
    static find_titled(el) {
        let node = el;
        while (node && node !== document.body && node !== document.documentElement) {
            let title = node.nodeType === 1 ? node.getAttribute('title') : null;
            if (title && title.trim()) {
                return node;
            }
            node = node.parentElement;
        }
        return null;
    }

    /**
     * Starts tracking a newly hovered titled element, or cancels when the pointer left the anchor.
     */
    static on_over(e) {
        let titled = HintPopup.find_titled(e.target);
        if (!titled) {
            if (HintPopup._anchor && !HintPopup._anchor.contains(e.target)) {
                HintPopup.cancel();
            }
            return;
        }
        if (titled === HintPopup._anchor) {
            return;
        }
        HintPopup.cancel();
        let text = titled.getAttribute('title');
        titled.setAttribute('data-hint', text);
        titled.removeAttribute('title');
        HintPopup._anchor = titled;
        HintPopup._timer = setTimeout(() => {
            HintPopup._timer = null;
            HintPopup.place_panel(text, titled, titled.getAttribute('data-hint-type'));
        }, HintPopup.DELAY_MS);
    }

    /**
     * Cancels the hint when the pointer leaves the tracked anchor.
     */
    static on_out(e) {
        let anchor = HintPopup._anchor;
        if (anchor && (!e.relatedTarget || !anchor.contains(e.relatedTarget))) {
            HintPopup.cancel();
        }
    }

    /**
     * Clears the pending timer, hides the panel and restores the anchor title.
     */
    static cancel() {
        if (HintPopup._timer) {
            clearTimeout(HintPopup._timer);
            HintPopup._timer = null;
        }
        if (HintPopup._panel) {
            HintPopup._panel.style.display = 'none';
        }
        let anchor = HintPopup._anchor;
        if (anchor && anchor.hasAttribute('data-hint')) {
            anchor.setAttribute('title', anchor.getAttribute('data-hint'));
            anchor.removeAttribute('data-hint');
        }
        HintPopup._anchor = null;
    }
    // #endregion hover_tracking

    // #region display
    /**
     * Fills the panel with text and places it below the anchor, flipping above or shifting left to fit.
     */
    static place_panel(text, anchor, type) {
        let panel = HintPopup.get_panel();
        panel.textContent = text;
        panel.className = 'hp_panel' + (type && /^[a-z0-9_]+$/i.test(type) ? ' hp_' + type : '');
        panel.style.visibility = 'hidden';
        panel.style.display = 'block';
        panel.style.left = '0px';
        panel.style.top = '0px';
        if (typeof window.get_next_z_index === 'function') {
            panel.style.zIndex = window.get_next_z_index();
        }
        let rect = anchor.getBoundingClientRect();
        let width = panel.offsetWidth;
        let height = panel.offsetHeight;
        let top = rect.bottom + 6;
        if (top + height > window.innerHeight - 4) {
            top = rect.top - 6 - height;
        }
        let left = rect.left;
        if (left + width > window.innerWidth - 8) {
            left = window.innerWidth - 8 - width;
        }
        left = Math.max(4, left);
        panel.style.left = Math.round(left) + 'px';
        panel.style.top = Math.round(top) + 'px';
        panel.style.visibility = 'visible';
    }
    // #endregion display

    // #region public_api
    /**
     * Shows a hint immediately next to anchor, replacing any current hint.
     * @param {object} opts - type: 'info', 'warning', 'error' or 'success'.
     */
    static show(text, anchor, opts = {}) {
        HintPopup.cancel();
        if (!anchor || typeof anchor.getBoundingClientRect !== 'function') {
            return;
        }
        HintPopup.place_panel(text === null || text === undefined ? '' : String(text), anchor, (opts || {}).type);
    }

    /**
     * Sets data-hint-type on el, or removes it when type is falsy.
     */
    static set_type(el, type) {
        if (!el) {
            return;
        }
        if (type) {
            el.setAttribute('data-hint-type', type);
        } else {
            el.removeAttribute('data-hint-type');
        }
    }

    /**
     * Applies a preset name or a CSS variable object to the panel only.
     */
    static set_theme(theme) {
        if (window.ThemeManager && document.body) {
            ThemeManager.apply(HintPopup.get_panel(), theme);
        }
    }
    // #endregion public_api
}

window.HintPopup = HintPopup;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => HintPopup.init());
} else {
    HintPopup.init();
}
