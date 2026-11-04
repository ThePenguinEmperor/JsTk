/**
 * ThemeManager: shared CSS-variable themes, page and per-widget theming, and a global z-index counter.
 * Exposes window.THEMES, window.set_app_theme and window.get_next_z_index.
 */
class ThemeManager {
    static _z_counter = 10;

    static THEMES = {
        light: {
            '--surface': '#ffffff',
            '--surface_secondary': '#f5f6ff',
            '--surface_hover': '#e6e8fb',
            '--page_bg': '#eceeff',
            '--input_bg': '#ffffff',
            '--text_primary': '#161a3a',
            '--text_secondary': '#454b78',
            '--text_muted': '#767ca3',
            '--border_light': '#dcdff3',
            '--border_focus': '#a3a9d6',
            '--accent': '#5b4bdb',
            '--accent_strong': '#4638b8',
            '--accent_soft': '#e4e1fd',
            '--accent_muted': 'rgba(91, 75, 219, 0.14)',
            '--accent_2': '#0fb5a4',
            '--on_accent': '#ffffff',
            '--danger': '#e5484d',
            '--warning': '#f08a24',
            '--warning_strong': '#c96d10',
            '--success': '#12a46a',
            '--success_strong': '#0b8452',
            '--highlight': '#f5b82e',
            '--highlight_strong': '#d49a12',
            '--radius_sm': '3px',
            '--radius': '5px',
            '--radius_md': '8px',
            '--control_height': '24px',
            '--font_ui': 'system-ui, -apple-system, "Segoe UI", sans-serif',
            '--font_mono': 'ui-monospace, Consolas, monospace',
            '--shadow_sm': '0 1px 2px rgba(40, 40, 110, 0.10)',
            '--shadow_md': '0 6px 18px rgba(50, 45, 130, 0.16)',
            '--overlay_bg': 'rgba(255, 255, 255, 0.88)'
        },
        dark: {
            '--surface': '#161830',
            '--surface_secondary': '#1e2140',
            '--surface_hover': '#2a2e55',
            '--page_bg': '#0b0c1a',
            '--input_bg': '#10122a',
            '--text_primary': '#eceeff',
            '--text_secondary': '#bcc0e8',
            '--text_muted': '#8a90c4',
            '--border_light': '#2b2f58',
            '--border_focus': '#5a62a8',
            '--accent': '#8b7bff',
            '--accent_strong': '#a99cff',
            '--accent_soft': '#2b2760',
            '--accent_muted': 'rgba(139, 123, 255, 0.22)',
            '--accent_2': '#2dd4bf',
            '--on_accent': '#0b0c1a',
            '--danger': '#ff6b72',
            '--warning': '#ffa94d',
            '--warning_strong': '#ffbe73',
            '--success': '#34d399',
            '--success_strong': '#6ee7b7',
            '--highlight': '#fbd24d',
            '--highlight_strong': '#fde58a',
            '--radius_sm': '3px',
            '--radius': '5px',
            '--radius_md': '8px',
            '--control_height': '24px',
            '--font_ui': 'system-ui, -apple-system, "Segoe UI", sans-serif',
            '--font_mono': 'ui-monospace, Consolas, monospace',
            '--shadow_sm': '0 1px 2px rgba(0, 0, 0, 0.5)',
            '--shadow_md': '0 6px 18px rgba(0, 0, 0, 0.55)',
            '--overlay_bg': 'rgba(22, 24, 48, 0.88)'
        }
    };

    // #region theming
    /**
     * Resolves a preset name or a variables object; returns null for anything else.
     */
    static resolve(theme) {
        let vars = typeof theme === 'string' ? ThemeManager.THEMES[theme] : theme;
        if (!vars || typeof vars !== 'object') {
            return null;
        }
        return vars;
    }

    /**
     * Sets theme variables as inline custom properties on an element; partial objects only override listed keys.
     */
    static apply(el, theme) {
        let vars = ThemeManager.resolve(theme);
        if (!el || !vars) {
            return;
        }
        for (let [name, value] of Object.entries(vars)) {
            el.style.setProperty(name, value);
        }
    }
    // #endregion theming

    // #region stacking
    /**
     * Returns an ever-increasing z-index so the newest floating layer is on top.
     */
    static next_z_index() {
        ThemeManager._z_counter += 1;
        return ThemeManager._z_counter;
    }
    // #endregion stacking
}

window.ThemeManager = ThemeManager;
window.THEMES = ThemeManager.THEMES;
window.set_app_theme = theme => ThemeManager.apply(document.documentElement, theme);
window.get_next_z_index = () => ThemeManager.next_z_index();
