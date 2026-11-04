/**
 * AppStore: page-wide reactive key/value store with publish/subscribe.
 * Static singleton; state and listeners are private. Exposed as window.AppStore.
 */
class AppStore {
    static #state = new Map();
    static #listeners = new Map();

    // #region public_api
    /**
     * Stores a value and synchronously notifies every subscriber of the key in subscribe order.
     * Subscriber errors are logged and never stop the remaining subscribers.
     */
    static set(key, value) {
        AppStore.#state.set(key, value);
        let list = AppStore.#listeners.get(key) || [];
        for (let fn of list) {
            AppStore.#call(fn, key, value, 'subscriber_failed');
        }
    }

    /**
     * Returns the stored reference for a key, or undefined when it was never set.
     */
    static get(key) {
        return AppStore.#state.get(key);
    }

    /**
     * Registers a listener; calls it at once when the key already exists.
     * @returns {Function} Unsubscribe; removes every registration of fn for this key.
     */
    static subscribe(key, fn) {
        let list = AppStore.#listeners.get(key) || [];
        AppStore.#listeners.set(key, list.concat([fn]));
        if (AppStore.#state.has(key)) {
            AppStore.#call(fn, key, AppStore.#state.get(key), 'initial_call_failed');
        }
        return () => {
            let current = AppStore.#listeners.get(key) || [];
            AppStore.#listeners.set(key, current.filter(item => item !== fn));
        };
    }

    /**
     * Sets the value only when its JSON form differs from the stored one.
     * Unserializable values skip the comparison and always set.
     */
    static set_if_changed(key, value) {
        let same = false;
        try {
            same = JSON.stringify(AppStore.#state.get(key)) === JSON.stringify(value);
        } catch (error) {
            same = false;
        }
        if (!same) {
            AppStore.set(key, value);
        }
    }
    // #endregion public_api

    // #region internals
    /**
     * Calls one listener and logs any error it throws.
     */
    static #call(fn, key, value, reason) {
        try {
            fn(value);
        } catch (error) {
            console.error('[app_store] ' + reason + ': ' + key, error);
        }
    }
    // #endregion internals
}

window.AppStore = AppStore;
