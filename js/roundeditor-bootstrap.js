(function (window) {
    'use strict';

    var api = window.RoundEditor;
    if (!api || api.integrationApiVersion !== '1.0') {
        var instances = new Map();
        var listeners = new Map();
        function emit(type, sequence, editor) {
            (listeners.get(type) || []).slice().forEach(function (listener) {
                try { listener({ type: type, sequence: sequence, editor: editor }); }
                catch (error) { window.console && console.error('[roundeditor] Integration listener failed.', error); }
            });
        }
        api = {
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
    }

    if (api.extensions && api.extensions.apiVersion === '1.0') return;

    var definitions = new Map();
    var diagnostics = [];
    var approvals = new Map();
    var failedScripts = new Set();
    var loadedScripts = new Map();
    var preparePromise = null;
    var editorGenerationStarted = false;

    function extensionError(code, message, extensionId, details) {
        var result = Object.assign(new Error(message || code), { name: 'ExtensionError', code: code });
        if (extensionId) result.extensionId = extensionId;
        if (details !== undefined) result.details = details;
        return result;
    }

    function diagnostic(error, level) {
        var item = Object.freeze({
            code: error.code || 'E_EXTENSION_RUNTIME', extensionId: error.extensionId,
            message: error.message || String(error), details: error.details, level: level || 'error',
        });
        diagnostics.push(item);
        if (window.console) (item.level === 'warn' ? console.warn : console.error)('[roundeditor:extension]', item);
        return item;
    }

    function validDefinition(definition) {
        if (!definition || typeof definition !== 'object') return { code: 'E_EXTENSION_INVALID', message: 'Definition must be an object.' };
        if (!/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/.test(String(definition.id || ''))) return { code: 'E_EXTENSION_INVALID', message: 'Invalid extension ID.' };
        if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(String(definition.version || ''))) return { code: 'E_EXTENSION_INVALID', message: 'Invalid semantic version.' };
        if (!/^\^?1(?:\.\d+)?(?:\.\d+)?(?:[-+][0-9A-Za-z.-]+)?$/.test(String(definition.apiVersion || ''))) return { code: 'E_EXTENSION_VERSION', message: 'Extension API 1.x is required.' };
        if (definition.priority !== undefined && (!Number.isFinite(definition.priority) || definition.priority < -100 || definition.priority > 100)) return { code: 'E_EXTENSION_INVALID', message: 'Priority must be between -100 and 100.' };
        if (typeof definition.create !== 'function') return { code: 'E_EXTENSION_INVALID', message: 'create() must be a function.' };
        return null;
    }

    function register(definition) {
        var id = String(definition && definition.id || '');
        var invalid = validDefinition(definition);
        var error = invalid ? extensionError(invalid.code, invalid.message, id || undefined) : null;
        if (!error && definitions.has(id)) error = extensionError('E_EXTENSION_CONFLICT', 'An extension with this ID is already registered.', id);
        var stored = null;
        if (error) diagnostic(error);
        else { stored = Object.freeze(Object.assign({}, definition, { priority: definition.priority || 0 })); definitions.set(id, stored); }
        var active = !error;
        return Object.freeze({
            id: id, accepted: active, appliesToExistingEditors: false, error: error || undefined,
            unregister: function () {
                if (!active || definitions.get(id) !== stored) return false;
                active = false; return definitions.delete(id);
            },
        });
    }

    api.extensions = Object.freeze({
        apiVersion: '1.0', register: register,
        has: function (id) { return definitions.has(String(id)); },
        list: function () { return Object.freeze(Array.from(definitions.values()).map(function (definition) {
            return Object.freeze({ id: definition.id, version: definition.version, apiVersion: definition.apiVersion, enabled: true });
        })); },
    });

    function readConfigs() {
        var configs = [];
        document.querySelectorAll('.roundeditor[data-editor-config]').forEach(function (wrapper) {
            try {
                var config = JSON.parse(wrapper.dataset.editorConfig || '{}');
                var sequence = Number(config.editorSequence || wrapper.dataset.editorSequence);
                if (sequence) { approvals.set(sequence, config); configs.push(config); }
            } catch (error) {
                diagnostic(extensionError('E_EXTENSION_INVALID', 'Invalid editor extension configuration.', undefined, error.message));
            }
        });
        return configs;
    }

    function normalizedManifest(configs) {
        var byId = new Map();
        configs.forEach(function (config) {
            (Array.isArray(config.extensionScripts) ? config.extensionScripts : []).forEach(function (raw) {
                var item = { id: String(raw.id || ''), script: String(raw.script || ''),
                    mode: ['extension', 'integration', 'both'].includes(raw.mode) ? raw.mode : 'extension',
                    format: raw.format === 'module' ? 'module' : 'classic', required: Boolean(raw.required),
                    priority: Number.isFinite(Number(raw.priority)) ? Number(raw.priority) : 0 };
                if (!item.id || !item.script) return;
                try { item.script = new URL(item.script, document.baseURI).href; }
                catch (error) { diagnostic(extensionError('E_EXTENSION_INVALID', 'Invalid extension script URL.', item.id)); return; }
                var previous = byId.get(item.id);
                if (previous && (previous.script !== item.script || previous.format !== item.format)) {
                    failedScripts.add(item.id); diagnostic(extensionError('E_EXTENSION_CONFLICT', 'The same extension ID uses different script descriptors.', item.id)); return;
                }
                if (!previous) byId.set(item.id, item); else previous.required = previous.required || item.required;
            });
        });
        return Array.from(byId.values()).sort(function (a, b) { return b.priority - a.priority || a.id.localeCompare(b.id); });
    }

    function loadEntrypoint(item) {
        if (failedScripts.has(item.id)) return Promise.resolve();
        var key = item.id + '|' + item.script + '|' + item.format;
        if (loadedScripts.has(key)) return loadedScripts.get(key);
        var promise = new Promise(function (resolve, reject) {
            var script = document.createElement('script'); script.src = item.script;
            if (item.format === 'module') script.type = 'module';
            script.dataset.roundeditorExtension = item.id;
            script.addEventListener('load', resolve, { once: true });
            script.addEventListener('error', function () { reject(extensionError('E_EXTENSION_RUNTIME', 'Extension entrypoint failed to load.', item.id, { script: item.script })); }, { once: true });
            document.head.appendChild(script);
        }).then(function () {
            if ((item.mode === 'extension' || item.mode === 'both') && !definitions.has(item.id)) throw extensionError('E_EXTENSION_INVALID', 'Extension entrypoint did not register synchronously.', item.id);
        }).catch(function (error) {
            failedScripts.add(item.id); diagnostic(error); if (item.required) throw error;
        });
        loadedScripts.set(key, promise); return promise;
    }

    function prepareFromDocument() {
        if (preparePromise) return preparePromise;
        preparePromise = Promise.resolve().then(function () {
            var configs = readConfigs();
            var hostFailure = configs.find(function (config) { return config.extensionHostFailure; });
            if (hostFailure) throw extensionError('E_EXTENSION_DEPENDENCY', hostFailure.extensionHostFailure);
            return normalizedManifest(configs).reduce(function (chain, item) { return chain.then(function () { return loadEntrypoint(item); }); }, Promise.resolve());
        });
        api.extensionRegistrationBarrier = preparePromise; return preparePromise;
    }

    api.extensionRegistrationBarrier = Promise.resolve();
    Object.defineProperty(api, '_extensionHost', { configurable: true, value: Object.freeze({
        definitions: definitions, diagnostics: diagnostics, failedScripts: failedScripts,
        prepareFromDocument: prepareFromDocument,
        getConfig: function (sequence) { return approvals.get(Number(sequence)) || null; },
        markEditorGenerationStarted: function () { editorGenerationStarted = true; },
        get editorGenerationStarted() { return editorGenerationStarted; },
        report: diagnostic, error: extensionError,
    }) });
}(window));
