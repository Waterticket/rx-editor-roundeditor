function createEvent(editor, name, data = {}) {
    let stopped = false;
    return {
        name,
        editor,
        sender: editor,
        data,
        stop() { stopped = true; },
        cancel() { stopped = true; },
        get stopped() { return stopped; },
    };
}

function createEditableFacade(bridge) {
    const listeners = new Map();
    return {
        on(name, listener) {
            if (!listeners.has(name)) listeners.set(name, new Set());
            listeners.get(name).add(listener);
            return this;
        },
        removeListener(name, listener) {
            listeners.get(name)?.delete(listener);
        },
        fire(name, nativeEvent) {
            const event = createEvent(null, name, { $: nativeEvent });
            event.sender = this;
            for (const listener of listeners.get(name) || []) listener(event);
            return event;
        },
        bind() {
            const element = bridge.editable;
            if (!element || element.__roundeditorCkEditableBound) return;
            element.__roundeditorCkEditableBound = true;
            element.addEventListener('input', nativeEvent => this.fire('input', nativeEvent));
        },
    };
}

function createNotification(bridge, message, type, duration) {
    const element = document.createElement('div');
    element.className = 'roundeditor__notification';
    element.setAttribute('role', 'status');
    element.setAttribute('aria-live', 'polite');
    bridge.wrapper.appendChild(element);
    let timeout = null;
    const notification = {
        update(values = {}) {
            const text = values.message ?? message;
            element.textContent = values.progress === undefined ? String(text || '') : `${text || ''} ${values.progress}%`;
            element.dataset.type = values.type ?? type ?? 'info';
            if (timeout) window.clearTimeout(timeout);
            const nextDuration = values.duration ?? duration;
            if (nextDuration > 0) timeout = window.setTimeout(() => notification.hide(), nextDuration);
            return notification;
        },
        hide() {
            if (timeout) window.clearTimeout(timeout);
            element.remove();
        },
    };
    return notification.update({ message, type, duration });
}

export function createCKEditor4Facade(bridge) {
    const listeners = new Map();
    const editable = createEditableFacade(bridge);
    let ready = false;
    const facade = {
        on(name, listener) {
            if (!listeners.has(name)) listeners.set(name, new Set());
            listeners.get(name).add(listener);
            if (name === 'instanceReady' && ready) queueMicrotask(() => listener(createEvent(facade, name)));
            return facade;
        },
        once(name, listener) {
            const onceListener = event => {
                facade.removeListener(name, onceListener);
                listener(event);
            };
            return facade.on(name, onceListener);
        },
        removeListener(name, listener) {
            listeners.get(name)?.delete(listener);
            return facade;
        },
        hasListeners(name) {
            return Boolean(listeners.get(name)?.size);
        },
        fire(name, data = {}) {
            const event = createEvent(facade, name, data);
            for (const listener of listeners.get(name) || []) listener(event);
            return event;
        },
        getData: () => bridge.sync(),
        setData(html) {
            bridge.sourceMode?.setData(String(html || ''));
            return bridge.sync();
        },
        insertHtml(html) {
            const result = bridge.insertHtml(String(html || ''));
            facade.fire('insertHtml', { dataValue: String(html || '') });
            return result;
        },
        getText: () => bridge.getText(),
        getSelection: () => ({
            getSelectedText: () => bridge.getText(true),
            createBookmarks: () => [],
            selectRanges: () => {},
        }),
        focus: () => bridge.sourceMode?.focus(),
        editable: () => editable,
        showNotification: (message, type, duration) => createNotification(bridge, message, type, duration),
        document: {
            find(selector) {
                const nodes = Array.from(bridge.editable?.querySelectorAll(selector) || []);
                return { toArray: () => nodes };
            },
            getBody() {
                return {
                    getHtml: () => bridge.sync(),
                    setHtml: html => facade.setData(html),
                };
            },
            getById: id => bridge.editable?.querySelector(`#${CSS.escape(id)}`) || null,
        },
        createRange: () => ({ setStart() {}, setEnd() {} }),
        _markReady() {
            ready = true;
            facade.fire('instanceReady');
        },
    };
    Object.defineProperty(facade, 'mode', {
        enumerable: true,
        get: () => (bridge.sourceMode?.active ? 'source' : 'wysiwyg'),
        set: () => {},
    });
    editable.bind();
    return facade;
}
