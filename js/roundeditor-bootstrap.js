(function (window) {
    'use strict';
    if (window.RoundEditor && window.RoundEditor.integrationApiVersion === '1.0') return;
    var instances = new Map();
    var listeners = new Map();
    function emit(type, sequence, editor) {
        (listeners.get(type) || []).slice().forEach(function (listener) {
            try { listener({ type: type, sequence: sequence, editor: editor }); }
            catch (error) { window.console && console.error('[roundeditor] Integration listener failed.', error); }
        });
    }
    var api = {
        integrationApiVersion: '1.0',
        get: function (sequence) { return instances.get(Number(sequence)) || null; },
        getActive: function () { return api._active || null; },
        list: function () { return Object.freeze(Array.from(instances.values())); },
        on: function (type, listener) {
            if (!listeners.has(type)) listeners.set(type, []);
            listeners.get(type).push(listener);
            return function () { var list = listeners.get(type) || []; var index = list.indexOf(listener); if (index !== -1) list.splice(index, 1); };
        },
        whenReady: function (sequence, options) {
            options = options || {}; var ready = api.get(sequence); if (ready) return Promise.resolve(ready);
            var timeout = Number.isFinite(options.timeout) ? options.timeout : 10000;
            return new Promise(function (resolve, reject) {
                var timer; var off = api.on('instanceReady', function (event) { if (event.sequence !== Number(sequence)) return; cleanup(); resolve(event.editor); });
                function abort() { cleanup(); reject(Object.assign(new Error('Editor readiness was aborted.'), { code: 'E_NOT_READY' })); }
                function cleanup() { off(); if (timer) clearTimeout(timer); if (options.signal) options.signal.removeEventListener('abort', abort); }
                if (options.signal && options.signal.aborted) return abort();
                if (options.signal) options.signal.addEventListener('abort', abort, { once: true });
                if (timeout >= 0) timer = setTimeout(function () { cleanup(); reject(Object.assign(new Error('Editor readiness timed out.'), { code: 'E_TIMEOUT' })); }, timeout);
            });
        },
        _register: function (handle) { instances.set(handle.sequence, handle); emit('instanceReady', handle.sequence, handle); },
        _destroy: function (handle) { if (instances.get(handle.sequence) === handle) instances.delete(handle.sequence); if (api._active === handle) api._active = null; emit('instanceDestroyed', handle.sequence, null); },
        _activate: function (handle) { if (api._active !== handle) { api._active = handle; emit('activeChanged', handle.sequence, handle); } },
    };
    window.RoundEditor = api;
}(window));
