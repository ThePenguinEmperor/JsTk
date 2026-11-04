/**
 * GuidedTour: step-by-step walkthrough that dims the page, highlights one element at a time
 * and shows a card with navigation. Configured and started through static methods.
 */
class GuidedTour {
    static SCRIPT_URL = document.currentScript ? document.currentScript.src : '';
    static DEFAULT_INTRO = {
        enabled: true,
        title: 'Welcome to the Guided Tour',
        description: 'This tour walks you through every control in the tool.'
    };
    static config = { steps: [], on_navigate: null, on_finish: null, intro: Object.assign({}, GuidedTour.DEFAULT_INTRO) };
    static fallback_z = 1000;
    static demo_count = 0;

    /**
     * Creates one tour session with its own overlay, highlight ring and card.
     */
    constructor() {
        GuidedTour.ensure_css();
        this.index = 0;
        this.direction = 1;
        this.active_section = null;
        this.target = null;
        this.ended = false;
        this.nav_token = 0;
        this.overlay = GuidedTour.make_layer('gt_overlay');
        this.ring = GuidedTour.make_layer('gt_ring');
        this.card = GuidedTour.make_layer('gt_card');
        this.overlay.addEventListener('click', () => this.end());
        this.on_key = e => this.handle_key(e);
        this.on_viewport_change = () => this.reposition();
        document.addEventListener('keydown', this.on_key, true);
        window.addEventListener('resize', this.on_viewport_change);
        window.addEventListener('scroll', this.on_viewport_change, true);
    }

    // #region static_api
    /**
     * Merges configuration; steps replace the list, intro merges key by key.
     */
    static configure(cfg = {}) {
        let next = Object.assign({}, GuidedTour.config, cfg || {});
        next.intro = Object.assign({}, GuidedTour.DEFAULT_INTRO, GuidedTour.config.intro, (cfg && cfg.intro) || {});
        if (!Array.isArray(next.steps)) {
            next.steps = [];
        }
        GuidedTour.config = next;
    }

    /**
     * Starts a new tour from the first step.
     */
    static start() {
        let session = new GuidedTour();
        session.go_to(0);
    }

    /**
     * Alias for start().
     */
    static restart() {
        GuidedTour.start();
    }

    /**
     * Returns the effective step list, with the intro slide first when enabled.
     */
    static effective_steps() {
        let cfg = GuidedTour.config;
        let steps = cfg.steps.slice();
        if (cfg.intro && cfg.intro.enabled) {
            steps.unshift({ no_target: true, title: cfg.intro.title, text: GuidedTour.intro_html(cfg.intro.description, cfg.intro.allow_html === true), is_intro: true, allow_html: true });
        }
        return steps;
    }

    /**
     * Builds the intro body: description paragraph and the fixed keyboard legend.
     */
    static intro_html(description, allow_html) {
        let safe_description = allow_html ? WidgetBase.sanitize_html(description || '') : WidgetBase.escape_html(description || '');
        let key = name => '<span class="gt_key">' + name + '</span>';
        return '<p class="gt_intro_text">' + safe_description + '</p>' +
            '<div class="gt_legend">' +
            '<div>' + key('Right arrow') + ' or ' + key('Enter') + ': Next step</div>' +
            '<div>' + key('Left arrow') + ': Previous step</div>' +
            '<div>' + key('Esc') + ': Quit tour</div>' +
            '</div>';
    }

    /**
     * Returns the section of a step: its own navigate value or the nearest earlier one, else null.
     */
    static section_of(steps, index) {
        for (let i = index; i >= 0; i--) {
            if (steps[i] && Object.prototype.hasOwnProperty.call(steps[i], 'navigate')) {
                return steps[i].navigate === undefined ? null : steps[i].navigate;
            }
        }
        return null;
    }

    /**
     * Returns the first element matched by the comma-separated selectors, tried in order.
     */
    static find_target(selector_list) {
        for (let selector of String(selector_list || '').split(',')) {
            let trimmed = selector.trim();
            let el = null;
            if (!trimmed) {
                continue;
            }
            try {
                el = document.querySelector(trimmed);
            } catch (error) {
                console.warn('[guided_tour] invalid_selector: ' + trimmed);
            }
            if (el) {
                return el;
            }
        }
        return null;
    }

    /**
     * Links the widget stylesheet once per page, resolved next to this script.
     */
    static ensure_css() {
        if (document.getElementById('gt_css')) {
            return;
        }
        let link = document.createElement('link');
        link.id = 'gt_css';
        link.rel = 'stylesheet';
        link.href = GuidedTour.SCRIPT_URL ? new URL('GuidedTour.css', GuidedTour.SCRIPT_URL).href : 'web/js/widgets/GuidedTour/GuidedTour.css';
        document.head.appendChild(link);
    }

    /**
     * Appends a fixed layer to the body with the next global stacking order.
     */
    static make_layer(class_name) {
        let el = document.createElement('div');
        el.className = class_name;
        if (typeof window.get_next_z_index === 'function') {
            el.style.zIndex = String(window.get_next_z_index());
        } else {
            GuidedTour.fallback_z += 1;
            el.style.zIndex = String(GuidedTour.fallback_z);
        }
        document.body.appendChild(el);
        return el;
    }
    // #endregion static_api

    // #region navigation
    /**
     * Enters a step: before_step, section navigation, target lookup with skipping, then card render.
     * A newer navigation supersedes one still awaiting.
     */
    async go_to(index) {
        let token = ++this.nav_token;
        let steps = GuidedTour.effective_steps();
        let stale = () => this.ended || token !== this.nav_token;
        if (index < 0 || index >= steps.length) {
            this.end();
            return;
        }
        let step = steps[index];
        this.index = index;
        if (typeof step.before_step === 'function') {
            await this.run_safely(step.before_step);
            if (step.before_step_delay > 0) {
                await new Promise(resolve => setTimeout(resolve, step.before_step_delay));
            }
        }
        if (stale()) {
            return;
        }
        let section = GuidedTour.section_of(steps, index);
        if (section !== this.active_section) {
            this.active_section = section;
            if (typeof GuidedTour.config.on_navigate === 'function') {
                this.render_card({ title: 'Loading...', text: '' }, index, steps.length);
                this.position_card(null);
                await this.run_safely(() => GuidedTour.config.on_navigate(section));
            }
        }
        if (stale()) {
            return;
        }
        this.clear_target();
        if (!step.no_target && !(await this.highlight(step))) {
            if (!stale()) {
                this.go_to(index + this.direction);
            }
            return;
        }
        if (stale()) {
            return;
        }
        if (step.no_target) {
            this.ring.style.display = 'none';
            this.overlay.style.clipPath = '';
        }
        this.render_card(step, index, steps.length);
        this.position_card(this.target);
    }

    /**
     * Awaits a callback and logs any error so the tour can continue.
     */
    async run_safely(callback) {
        try {
            await callback();
        } catch (error) {
            console.error('[guided_tour] callback_failed', error);
        }
    }

    /**
     * Finds, marks and scrolls to the step target; false when it is missing or has no size.
     */
    async highlight(step) {
        let el = GuidedTour.find_target(step.target);
        if (!el) {
            return false;
        }
        el.classList.add('gt_highlight_target');
        el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        await new Promise(resolve => requestAnimationFrame(resolve));
        let rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
            el.classList.remove('gt_highlight_target');
            return false;
        }
        this.target = el;
        this.place_ring(rect);
        return true;
    }

    /**
     * Removes the highlight marker from the current target.
     */
    clear_target() {
        if (this.target) {
            this.target.classList.remove('gt_highlight_target');
        }
        this.target = null;
    }

    /**
     * Moves forward; finishes on the last step.
     */
    next() {
        let total = GuidedTour.effective_steps().length;
        this.direction = 1;
        if (this.index >= total - 1) {
            this.end();
        } else {
            this.go_to(this.index + 1);
        }
    }

    /**
     * Moves back one step; does nothing on the first step.
     */
    back() {
        if (this.index <= 0) {
            return;
        }
        this.direction = -1;
        this.go_to(this.index - 1);
    }

    /**
     * Handles Right/Enter, Left and Escape while the tour runs.
     */
    handle_key(e) {
        if (e.key === 'ArrowRight' || e.key === 'Enter') {
            e.preventDefault();
            this.next();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            this.back();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            this.end();
        }
    }

    /**
     * Ends the tour: removes listeners, highlight and layers, then calls on_finish once.
     */
    end() {
        if (this.ended) {
            return;
        }
        this.ended = true;
        document.removeEventListener('keydown', this.on_key, true);
        window.removeEventListener('resize', this.on_viewport_change);
        window.removeEventListener('scroll', this.on_viewport_change, true);
        this.clear_target();
        this.overlay.remove();
        this.ring.remove();
        this.card.remove();
        if (typeof GuidedTour.config.on_finish === 'function') {
            this.run_safely(GuidedTour.config.on_finish);
        }
    }
    // #endregion navigation

    // #region layout
    /**
     * Places the highlight ring around a rect with 6px padding and cuts a matching overlay hole.
     */
    place_ring(rect) {
        let left = rect.left - 6;
        let top = rect.top - 6;
        let right = rect.right + 6;
        let bottom = rect.bottom + 6;
        this.ring.style.display = 'block';
        this.ring.style.left = left + 'px';
        this.ring.style.top = top + 'px';
        this.ring.style.width = (right - left) + 'px';
        this.ring.style.height = (bottom - top) + 'px';
        this.overlay.style.clipPath = 'polygon(0% 0%, 0% 100%, ' + left + 'px 100%, ' + left + 'px ' + top + 'px, ' +
            right + 'px ' + top + 'px, ' + right + 'px ' + bottom + 'px, ' + left + 'px ' + bottom + 'px, ' +
            left + 'px 100%, 100% 100%, 100% 0%)';
    }

    /**
     * Renders the card: counter and title, body, and Skip / Back / Next buttons.
     */
    render_card(step, index, total) {
        let is_last = index >= total - 1;
        this.card.innerHTML = '';
        let head = document.createElement('div');
        head.className = 'gt_card_title';
        let counter = document.createElement('span');
        counter.className = 'gt_counter';
        counter.textContent = (index + 1) + ' / ' + total;
        let title_el = document.createElement('span');
        WidgetBase.set_content(title_el, step.title || '', step.allow_html === true);
        head.append(counter, ' ', title_el);
        let body = document.createElement('div');
        body.className = 'gt_card_body';
        WidgetBase.set_content(body, step.text || '', step.allow_html === true);
        let buttons = document.createElement('div');
        buttons.className = 'gt_card_buttons';
        let make_btn = (label, class_name, handler) => {
            let btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'gt_btn ' + class_name;
            btn.textContent = label;
            btn.addEventListener('click', handler);
            return btn;
        };
        buttons.appendChild(make_btn('Skip tour', 'gt_btn_skip', () => this.end()));
        let right = document.createElement('div');
        right.className = 'gt_card_nav';
        if (index > 0) {
            right.appendChild(make_btn('Back', 'gt_btn_back', () => this.back()));
        }
        right.appendChild(make_btn(is_last ? 'Finish' : 'Next', 'gt_btn_next', () => this.next()));
        buttons.appendChild(right);
        this.card.append(head, body, buttons);
    }

    /**
     * Positions the card beside the target in the roomiest direction, or centered without a target.
     */
    position_card(target) {
        let card = this.card;
        let gap = 12;
        let vw = window.innerWidth;
        let vh = window.innerHeight;
        card.style.maxWidth = Math.min(target ? 300 : 340, vw - 24) + 'px';
        if (!target) {
            card.style.left = Math.max(gap, (vw - card.offsetWidth) / 2) + 'px';
            card.style.top = Math.max(gap, (vh - card.offsetHeight) / 2) + 'px';
            return;
        }
        let rect = target.getBoundingClientRect();
        let width = card.offsetWidth || 280;
        let height = card.offsetHeight || 120;
        let room = { below: vh - rect.bottom - gap, above: rect.top - gap, right: vw - rect.right - gap, left: rect.left - gap };
        let most = Math.max(room.below, room.above, room.right, room.left);
        let clamp_x = x => Math.max(gap, Math.min(x, vw - width - gap));
        let clamp_y = y => Math.max(gap, Math.min(y, vh - height - gap));
        let pos = null;
        if (room.below === most || room.below >= height) {
            pos = { left: clamp_x(rect.left), top: rect.bottom + gap };
        } else if (room.above === most || room.above >= height) {
            pos = { left: clamp_x(rect.left), top: rect.top - gap - height };
        } else if (room.right === most) {
            pos = { left: rect.right + gap, top: clamp_y(rect.top) };
        } else {
            pos = { left: rect.left - gap - width, top: clamp_y(rect.top) };
        }
        card.style.left = pos.left + 'px';
        card.style.top = pos.top + 'px';
    }

    /**
     * Re-places the ring and card after a viewport resize or scroll.
     */
    reposition() {
        if (this.ended) {
            return;
        }
        if (this.target) {
            this.place_ring(this.target.getBoundingClientRect());
        }
        this.position_card(this.target);
    }
    // #endregion layout
}

window.GuidedTour = GuidedTour;
if (window.WidgetRegistry) {
    WidgetRegistry.register('guided_tour', {
        label: 'Guided Tour',
        category: 'overlays',
        container: false,
        options: [
            { name: 'button_label', type: 'string', default: 'Start tour' },
            { name: 'intro_enabled', type: 'bool', default: true },
            { name: 'intro_title', type: 'string', default: 'Welcome to the Guided Tour' },
            { name: 'intro_description', type: 'string', default: 'This demo tours the controls inside this panel.' }
        ],
        build: (host, options) => {
            GuidedTour.ensure_css();
            GuidedTour.demo_count += 1;
            let prefix = 'gt_demo_' + GuidedTour.demo_count;
            host.classList.add('gt_demo');
            host.innerHTML =
                '<div class="gt_demo_row">' +
                '<button type="button" class="gt_btn gt_btn_next" id="' + prefix + '_start"></button>' +
                '<input type="text" class="gt_demo_input" id="' + prefix + '_name" placeholder="Project name">' +
                '</div>' +
                '<div class="gt_demo_row">' +
                '<button type="button" class="gt_btn gt_btn_back" id="' + prefix + '_save">Save</button>' +
                '<span class="gt_demo_note" id="' + prefix + '_status">Status: ready</span>' +
                '</div>';
            let start_btn = host.querySelector('#' + prefix + '_start');
            start_btn.textContent = options.button_label || 'Start tour';
            start_btn.addEventListener('click', () => {
                GuidedTour.configure({
                    intro: { enabled: !!options.intro_enabled, title: options.intro_title, description: options.intro_description },
                    steps: [
                        { target: '#' + prefix + '_name', title: 'Name field', text: 'Type a <b>project name</b> here.', allow_html: true },
                        { target: '#' + prefix + '_save', title: 'Save button', text: 'Saves the current project.' },
                        { target: '#' + prefix + '_status', title: 'Status', text: 'Shows the result of the last action.' },
                        { target: '#' + prefix + '_start', title: 'Start button', text: 'Starts this tour. Press Esc to quit at any time.' }
                    ]
                });
                GuidedTour.start();
            });
            return GuidedTour;
        }
    });
}
