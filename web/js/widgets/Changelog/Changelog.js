/**
 * Changelog: "What's New" modal with release notes paged by version, newest first.
 * Data comes from a static source (versions object, block list or markdown), a loader
 * callback, or an optional host bridge adapter (off by default). Exposed as window.Changelog;
 * a shared default instance is window.changelog.
 */
class Changelog {
    static CSS_URL = (document.currentScript && document.currentScript.src)
        ? document.currentScript.src.replace(/\.js(\?.*)?$/, '.css')
        : 'web/js/widgets/Changelog/Changelog.css';
    static STAR_SVG = '<svg class="cl_star" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">'
        + '<path fill="currentColor" d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>';
    static OLDER_SVG = '<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M6.5 1.5L3 5l3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
    static NEWER_SVG = '<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M3.5 1.5L7 5 3.5 8.5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';

    /**
     * Stores options and injects the stylesheet; does not open the popup.
     * @param {Object} config - title, versions, markdown, current_version, last_seen_version,
     *     group_by_minor, empty_text, ack_label, fetch_info, load_changelog, on_seen,
     *     dont_show_again, host_bridge (null, 'pywebview' or a bridge object).
     */
    constructor(config) {
        let cfg = config || {};
        this.title = cfg.title || "What's New";
        this.markdown = typeof cfg.markdown === 'string' ? cfg.markdown : null;
        this.data = this.markdown !== null ? Changelog.parse_markdown(this.markdown) : Changelog.normalize(cfg.versions);
        this.current_version = cfg.current_version || '';
        this.last_seen_version = cfg.last_seen_version || '';
        this.group_by_minor = cfg.group_by_minor !== false;
        this.empty_text = cfg.empty_text || 'General improvements and bug fixes.';
        this.ack_label = cfg.ack_label || 'Got it!';
        this.fetch_info = typeof cfg.fetch_info === 'function' ? cfg.fetch_info : null;
        this.load_changelog = typeof cfg.load_changelog === 'function' ? cfg.load_changelog : null;
        this.on_seen = typeof cfg.on_seen === 'function' ? cfg.on_seen : null;
        this.host_bridge = cfg.host_bridge || null;
        this.dont_show_again = null;
        this.theme_vars = null;
        this.overlay = null;
        this.toggle_slot = null;
        this.pages = [];
        this.page_index = 0;
        this.was_shown = false;
        this.init_done = false;
        this.on_keydown = event => this._handle_key(event);
        this.set_dont_show_again(cfg.dont_show_again);
        Changelog.ensure_styles();
    }

    // #region public_api
    /**
     * One-shot per instance: loads version info and shows the popup when the version is unseen.
     */
    async init() {
        if (this.init_done) {
            return;
        }
        this.init_done = true;
        let info = await this._load_info();
        if (!info) {
            return;
        }
        let unseen = info.show_changelog !== null && info.show_changelog !== undefined
            ? !!info.show_changelog
            : !!info.version && info.version !== (info.last_seen_version || this.last_seen_version);
        if (!unseen) {
            return;
        }
        info.changelog = await this._load_changelog(info);
        this.show(info);
    }

    /**
     * Loads info and changelog, then always shows the popup.
     */
    async show_latest() {
        let info = await this._load_info();
        if (!info) {
            return;
        }
        info.changelog = await this._load_changelog(info);
        this.show(info);
    }

    /**
     * Opens the popup on the newest page.
     * @param {Object} data - version, changelog (any accepted shape), last_seen_version, dont_show_again_checked.
     */
    show(data) {
        let info = data || {};
        this.hide();
        this.was_shown = true;
        if (info.version) {
            this.current_version = info.version;
        }
        if (info.changelog !== null && info.changelog !== undefined) {
            this.data = Changelog.normalize(info.changelog);
        } else if (this.markdown !== null) {
            this.data = Changelog.parse_markdown(this.markdown);
        }
        if (info.last_seen_version !== null && info.last_seen_version !== undefined) {
            this.last_seen_version = info.last_seen_version;
        }
        if (this.dont_show_again && typeof info.dont_show_again_checked === 'boolean') {
            this.dont_show_again.checked = info.dont_show_again_checked;
        }
        this.pages = this._build_pages();
        this.page_index = 0;
        this._build_dom();
        this._render_page();
    }

    /**
     * Closes the popup; after a show, marks the current version seen.
     */
    hide() {
        if (this.was_shown) {
            this.was_shown = false;
            this._mark_seen();
        }
        document.removeEventListener('keydown', this.on_keydown);
        if (this.overlay) {
            this.overlay.remove();
        }
        this.overlay = null;
        this.toggle_slot = null;
    }

    /**
     * Remembers theme variables and applies them to the overlay now and on every open.
     */
    set_theme(theme) {
        let vars = window.ThemeManager ? ThemeManager.resolve(theme) : null;
        if (!vars) {
            return;
        }
        this.theme_vars = Object.assign({}, this.theme_vars || {}, vars);
        if (this.overlay) {
            ThemeManager.apply(this.overlay, this.theme_vars);
        }
    }

    /**
     * Configures the header toggle; falsy removes it. Rebuilds it in place when open.
     * @param {Object} cfg - { label, checked, on_change(checked) }.
     */
    set_dont_show_again(cfg) {
        this.dont_show_again = cfg ? {
            label: cfg.label || "Don't show again",
            checked: !!cfg.checked,
            on_change: typeof cfg.on_change === 'function' ? cfg.on_change : null
        } : null;
        if (this.overlay) {
            this._build_toggle();
        }
    }

    /**
     * True while the popup is open.
     */
    get is_visible() {
        return !!this.overlay;
    }
    // #endregion public_api

    // #region data_parsing
    /**
     * Converts any accepted shape (object, markdown string, block list, null) to { version: entries }.
     */
    static normalize(source) {
        if (source === null || source === undefined) {
            return {};
        }
        if (typeof source === 'string') {
            return Changelog.parse_markdown(source);
        }
        if (!Array.isArray(source)) {
            return typeof source === 'object' ? source : {};
        }
        let result = {};
        for (let block of source) {
            if (!block || !block.version) {
                continue;
            }
            let sections = {};
            for (let [key, value] of Object.entries(block)) {
                if (key !== 'version' && key !== 'date' && Array.isArray(value) && value.length) {
                    sections[key] = value;
                }
            }
            result[block.version] = sections;
        }
        return result;
    }

    /**
     * Parses CHANGELOG.md-style text into { version: string[] | { section: string[] } }.
     */
    static parse_markdown(md) {
        let result = {};
        if (!md) {
            return result;
        }
        let block_re = /^(?:###\s*new in this version\s*\(\s*v\.?\s*([\d.]+)\s*\)\s*:?|####\s*v\.?\s*([\d.]+))\s*$/i;
        let block = null;
        let section = null;
        let last_entry = null;
        let finish = () => {
            if (block) {
                result[block.version] = Object.keys(block.sections).length ? block.sections : block.bare;
            }
        };
        for (let raw of String(md).split(/\r?\n/)) {
            let line = raw.trim();
            let head = line.match(block_re);
            if (head) {
                finish();
                block = { version: head[1] || head[2], sections: {}, bare: [] };
                section = null;
                last_entry = null;
                continue;
            }
            if (!block || !line) {
                continue;
            }
            let title = line.match(/^####\s+(.+):$/);
            if (title) {
                section = title[1].trim();
                block.sections[section] = block.sections[section] || [];
                last_entry = null;
                continue;
            }
            let entry = line.match(/^[-*]\s+(.*)$/);
            if (entry) {
                let target = section ? block.sections[section] : block.bare;
                target.push(entry[1].trim());
                last_entry = { list: target, index: target.length - 1 };
            } else if (last_entry && /^\s/.test(raw)) {
                last_entry.list[last_entry.index] += ' ' + line;
            }
        }
        finish();
        return result;
    }

    /**
     * Compares dot-separated versions numerically; missing parts count as 0.
     */
    static compare_versions(a, b) {
        let pa = String(a).split('.').map(part => parseInt(part, 10) || 0);
        let pb = String(b).split('.').map(part => parseInt(part, 10) || 0);
        for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
            let diff = (pa[i] || 0) - (pb[i] || 0);
            if (diff) {
                return diff;
            }
        }
        return 0;
    }

    /**
     * Escapes &, < and > and turns **text** into bold.
     */
    static format_entry(text) {
        let safe = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return safe.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    }
    // #endregion data_parsing

    // #region data_sources
    /**
     * Resolves version info from fetch_info, the host bridge, or the configured version.
     */
    async _load_info() {
        if (this.fetch_info) {
            return this._try_call(() => this.fetch_info(), 'fetch_info_failed');
        }
        let bridge = this._bridge();
        if (bridge && typeof bridge.get_version_info === 'function') {
            return this._try_call(() => bridge.get_version_info(), 'get_version_info_failed');
        }
        if (this.current_version) {
            return { version: this.current_version, changelog: this.data, last_seen_version: this.last_seen_version };
        }
        return null;
    }

    /**
     * Resolves the changelog payload just before opening.
     */
    async _load_changelog(info) {
        if (info.changelog !== null && info.changelog !== undefined) {
            return info.changelog;
        }
        if (this.load_changelog) {
            let loaded = await this._try_call(() => this.load_changelog(), 'load_changelog_failed');
            if (loaded !== null && loaded !== undefined) {
                return Changelog.normalize(loaded);
            }
        }
        let bridge = this._bridge();
        if (bridge && typeof bridge.get_changelog === 'function') {
            let loaded = await this._try_call(() => bridge.get_changelog(), 'get_changelog_failed');
            if (loaded !== null && loaded !== undefined) {
                return Changelog.normalize(loaded);
            }
        }
        if (this.markdown !== null) {
            return Changelog.parse_markdown(this.markdown);
        }
        return this.data || {};
    }

    /**
     * Returns the host bridge: 'pywebview' or true maps to window.pywebview.api; null when disabled.
     */
    _bridge() {
        if (this.host_bridge === 'pywebview' || this.host_bridge === true) {
            return (window.pywebview && window.pywebview.api) || null;
        }
        return typeof this.host_bridge === 'object' ? this.host_bridge : null;
    }

    /**
     * Awaits a call and logs a warning on failure, returning null.
     */
    async _try_call(fn, reason) {
        try {
            return await fn();
        } catch (error) {
            console.warn('[changelog] ' + reason, error);
            return null;
        }
    }

    /**
     * Records the current version as seen and persists it via on_seen or the host bridge.
     */
    _mark_seen() {
        if (!this.current_version) {
            return;
        }
        this.last_seen_version = this.current_version;
        let bridge = this._bridge();
        try {
            if (this.on_seen) {
                this.on_seen(this.current_version);
            } else if (bridge && typeof bridge.mark_version_seen === 'function') {
                Promise.resolve(bridge.mark_version_seen(this.current_version)).catch(error => console.warn('[changelog] mark_seen_failed', error));
            }
        } catch (error) {
            console.warn('[changelog] mark_seen_failed', error);
        }
    }
    // #endregion data_sources

    // #region paging
    /**
     * Groups versions into pages, both sorted newest first.
     * @returns {Array} [{ key, versions: [version, ...] }].
     */
    _build_pages() {
        let groups = {};
        for (let version of Object.keys(this.data || {})) {
            let key = this.group_by_minor ? version.split('.').slice(0, 2).join('.') : version;
            groups[key] = groups[key] || [];
            groups[key].push(version);
        }
        let keys = Object.keys(groups);
        if (!keys.length && this.current_version) {
            return [{ key: this._page_key(this.current_version), versions: [this.current_version] }];
        }
        keys.sort((a, b) => Changelog.compare_versions(b, a));
        return keys.map(key => ({ key: key, versions: groups[key].sort((a, b) => Changelog.compare_versions(b, a)) }));
    }

    /**
     * Returns the page key of a version.
     */
    _page_key(version) {
        let text = String(version);
        return this.group_by_minor ? text.split('.').slice(0, 2).join('.') : text;
    }

    /**
     * Moves by delta pages (positive is older) when within range.
     */
    _go(delta) {
        let next = this.page_index + delta;
        if (next < 0 || next >= this.pages.length) {
            return;
        }
        this.page_index = next;
        this._render_page();
    }

    /**
     * Handles Escape and arrow paging while open.
     */
    _handle_key(event) {
        if (event.key === 'Escape') {
            this.hide();
        } else if (event.key === 'ArrowLeft') {
            this._go(1);
        } else if (event.key === 'ArrowRight') {
            this._go(-1);
        }
    }
    // #endregion paging

    // #region rendering
    /**
     * Static helper: adds the stylesheet link to the document head once per page.
     */
    static ensure_styles() {
        if (document.getElementById('cl_styles')) {
            return;
        }
        let link = document.createElement('link');
        link.id = 'cl_styles';
        link.rel = 'stylesheet';
        link.href = Changelog.CSS_URL;
        document.head.appendChild(link);
    }

    /**
     * Creates the overlay, dialog, header, badge, list and pagination.
     */
    _build_dom() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'cl_overlay';
        this.overlay.setAttribute('role', 'dialog');
        this.overlay.setAttribute('aria-modal', 'true');
        if (typeof window.get_next_z_index === 'function') {
            this.overlay.style.zIndex = String(window.get_next_z_index());
        }
        if (this.theme_vars) {
            ThemeManager.apply(this.overlay, this.theme_vars);
        }
        this.overlay.addEventListener('click', event => {
            if (event.target === this.overlay) {
                this.hide();
            }
        });
        let dialog = document.createElement('div');
        dialog.className = 'cl_dialog';
        let header = document.createElement('div');
        header.className = 'cl_header';
        let title = document.createElement('div');
        title.className = 'cl_title';
        let title_text = document.createElement('span');
        title_text.textContent = this.title;
        title.innerHTML = Changelog.STAR_SVG;
        title.appendChild(title_text);
        this.toggle_slot = document.createElement('div');
        this.toggle_slot.className = 'cl_toggle_slot';
        let ack = document.createElement('button');
        ack.type = 'button';
        ack.className = 'cl_ack';
        ack.textContent = this.ack_label;
        ack.addEventListener('click', () => this.hide());
        header.append(title, this.toggle_slot, ack);
        this.badge = document.createElement('div');
        this.badge.className = 'cl_badge';
        this.list_el = document.createElement('div');
        this.list_el.className = 'cl_list';
        dialog.append(header, this.badge, this.list_el);
        if (this.pages.length > 1) {
            dialog.appendChild(this._build_pager());
        }
        this.overlay.appendChild(dialog);
        document.body.appendChild(this.overlay);
        this._build_toggle();
        document.addEventListener('keydown', this.on_keydown);
    }

    /**
     * Fills the toggle slot with a ToggleSwitch when configured and available.
     */
    _build_toggle() {
        if (!this.toggle_slot) {
            return;
        }
        this.toggle_slot.textContent = '';
        let cfg = this.dont_show_again;
        let enabled = !!cfg && typeof window.ToggleSwitch === 'function';
        this.toggle_slot.parentNode.classList.toggle('cl_header_toggle', enabled);
        if (!enabled) {
            return;
        }
        new ToggleSwitch(this.toggle_slot, {
            label: cfg.label,
            checked: cfg.checked,
            on_change: is_on => {
                cfg.checked = is_on;
                if (cfg.on_change) {
                    cfg.on_change(is_on);
                }
            }
        });
    }

    /**
     * Builds the Older / Newer pagination row.
     */
    _build_pager() {
        let pager = document.createElement('div');
        pager.className = 'cl_pager';
        this.older_btn = document.createElement('button');
        this.older_btn.type = 'button';
        this.older_btn.className = 'cl_page_btn';
        this.older_btn.innerHTML = Changelog.OLDER_SVG + '<span>Older</span>';
        this.older_btn.addEventListener('click', () => this._go(1));
        this.page_label = document.createElement('span');
        this.page_label.className = 'cl_page_label';
        this.newer_btn = document.createElement('button');
        this.newer_btn.type = 'button';
        this.newer_btn.className = 'cl_page_btn';
        this.newer_btn.innerHTML = '<span>Newer</span>' + Changelog.NEWER_SVG;
        this.newer_btn.addEventListener('click', () => this._go(-1));
        pager.append(this.older_btn, this.page_label, this.newer_btn);
        return pager;
    }

    /**
     * Renders the current page into the badge, list and pager.
     */
    _render_page() {
        let page = this.pages[this.page_index] || { key: this.current_version, versions: [] };
        this.badge.textContent = page.key ? 'v' + page.key : '';
        this.list_el.textContent = '';
        for (let version of page.versions) {
            let entries = this.data[version];
            if (Array.isArray(entries) || !entries) {
                this._add_heading(version);
                let list = entries && entries.length ? entries : [this.empty_text];
                list.forEach(text => this._add_entry(text));
                continue;
            }
            for (let [section, items] of Object.entries(entries)) {
                if (!Array.isArray(items) || !items.length) {
                    continue;
                }
                this._add_heading(section);
                items.forEach(text => this._add_entry(text));
            }
        }
        this.list_el.scrollTop = 0;
        if (this.page_label) {
            this.page_label.textContent = (this.page_index + 1) + ' / ' + this.pages.length;
            this.older_btn.disabled = this.page_index >= this.pages.length - 1;
            this.newer_btn.disabled = this.page_index <= 0;
        }
    }

    /**
     * Appends a version or section heading.
     */
    _add_heading(text) {
        let heading = document.createElement('div');
        heading.className = 'cl_heading';
        heading.textContent = text;
        this.list_el.appendChild(heading);
    }

    /**
     * Appends one bullet entry with escaped text and bold markup.
     */
    _add_entry(text) {
        let row = document.createElement('div');
        row.className = 'cl_entry';
        row.innerHTML = Changelog.format_entry(text);
        this.list_el.appendChild(row);
    }
    // #endregion rendering
}

window.Changelog = Changelog;
window.changelog = new Changelog();
if (window.WidgetRegistry) {
    WidgetRegistry.register('changelog', {
        label: 'Changelog',
        category: 'dialogs',
        container: false,
        options: [
            { name: 'button_text', type: 'string', default: "What's new" },
            { name: 'title', type: 'string', default: "What's New" },
            { name: 'ack_label', type: 'string', default: 'Got it!' },
            { name: 'current_version', type: 'string', default: '1.2.1' },
            { name: 'group_by_minor', type: 'bool', default: true },
            {
                name: 'versions',
                type: 'json',
                default: [
                    { version: '1.2.1', 'Bug Fixes': ['Fixed **export** of empty tables.'] },
                    { version: '1.2.0', 'New Features': ['Added **dark theme**.', 'Faster search.'], 'Bug Fixes': ['Menu no longer flickers.'] },
                    { version: '1.1.0', 'New Features': ['First public release.'] }
                ]
            }
        ],
        build: (host, options) => {
            let instance = new Changelog(options);
            let button = document.createElement('button');
            button.type = 'button';
            button.className = 'cl_open_btn';
            button.textContent = options.button_text || "What's new";
            button.addEventListener('click', () => instance.show({}));
            host.appendChild(button);
            return instance;
        }
    });
}
