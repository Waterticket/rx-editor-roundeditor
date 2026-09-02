import * as pmCommands from 'prosemirror-commands';
import * as pmModel from 'prosemirror-model';
import * as pmState from 'prosemirror-state';
import * as pmTransform from 'prosemirror-transform';
import * as pmView from 'prosemirror-view';
import { keymap as createKeymap } from 'prosemirror-keymap';
import { coreSchemaServices, createSchemaServices } from '../schema/index.js';

const READY_TIMEOUT = 10000;
const assetRecords = new Map();
let taskSerial = 0;

export class ExtensionError extends Error {
    constructor(code, message = code, extensionId, details) {
        super(message);
        this.name = 'ExtensionError';
        this.code = code;
        if (extensionId) this.extensionId = extensionId;
        if (details !== undefined) this.details = details;
    }
}

const pm = Object.freeze({
    versions: Object.freeze({ model: '1.25.11', state: '1.4.4', view: '1.42.3', transform: '1.12.0', commands: '1.7.2' }),
    model: pmModel, state: pmState, view: pmView, transform: pmTransform, commands: pmCommands,
});

function compareRecords(a, b) { return b.definition.priority - a.definition.priority || a.id.localeCompare(b.id); }
function versionMatches(version, range) {
    if (!range || range === '*') return true;
    const actual = String(version).match(/^(\d+)\.(\d+)\.(\d+)/);
    const wanted = String(range).match(/^(\^|~)?(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
    if (!actual || !wanted) return false;
    const [major, minor, patch] = actual.slice(1).map(Number);
    const target = wanted.slice(2).map(value => Number(value || 0));
    if (wanted[1] === '^') return major === target[0] && (minor > target[1] || (minor === target[1] && patch >= target[2]));
    if (wanted[1] === '~') return major === target[0] && minor === target[1] && patch >= target[2];
    return major === target[0] && (wanted[3] === undefined || minor === target[1]) && (wanted[4] === undefined || patch === target[2]);
}

function report(error, level = 'error') {
    const host = window.RoundEditor?._extensionHost;
    host?.report?.(error, level);
    return error;
}

function approvedEntries(config) {
    return Array.isArray(config.approvedExtensions) ? config.approvedExtensions : [];
}

export function prepareExtensions(config, capabilities) {
    const registry = window.RoundEditor?._extensionHost;
    if (!registry) return { records: [], schemaServices: coreSchemaServices };
    const approved = new Map(approvedEntries(config).map(item => [String(item.id), item]));
    const records = [];
    for (const [id, approval] of approved) {
        if (registry.failedScripts.has(id)) {
            const error = report(new ExtensionError('E_EXTENSION_DISABLED', 'The approved extension entrypoint is unavailable.', id));
            if (approval.required) throw error;
            continue;
        }
        const definition = registry.definitions.get(id);
        if (!definition) {
            const error = report(new ExtensionError('E_EXTENSION_DISABLED', 'The approved extension was not registered.', id));
            if (approval.required) throw error;
            continue;
        }
        records.push({ id, definition, approval, instance: null, resources: [], tasks: new Set() });
    }
    for (const [id] of registry.definitions) {
        if (!approved.has(id)) report(new ExtensionError('E_EXTENSION_DISABLED', 'The extension is not approved for this editor.', id), 'warn');
    }
    const byId = new Map(records.map(record => [record.id, record]));
    const disabled = new Set();
    for (const record of records) {
        const requirements = record.definition.requires || {};
        const missingCapability = (requirements.capabilities || []).find(name => !capabilities.has(name));
        const missingExtension = Object.entries(requirements.extensions || {}).find(([id, range]) => {
            const dependency = byId.get(id);
            return !dependency || !versionMatches(dependency.definition.version, range);
        });
        if (missingCapability || missingExtension) {
            const details = missingCapability ? { capability: missingCapability } : { extension: missingExtension[0], range: missingExtension[1] };
            const error = report(new ExtensionError('E_EXTENSION_DEPENDENCY', 'A required extension dependency is unavailable.', record.id, details));
            if (record.approval.required) throw error;
            disabled.add(record.id);
        }
    }
    const candidates = records.filter(record => !disabled.has(record.id));
    const remainingDependencies = new Map(candidates.map(record => [record.id, new Set(
        Object.keys(record.definition.requires?.extensions || {}).filter(id => byId.has(id) && !disabled.has(id))
    )]));
    const resolved = new Set();
    let progressed = true;
    while (progressed) {
        progressed = false;
        for (const [id, dependencies] of remainingDependencies) {
            if (resolved.has(id) || [...dependencies].some(dependency => !resolved.has(dependency))) continue;
            resolved.add(id); progressed = true;
        }
    }
    const cyclic = candidates.filter(record => !resolved.has(record.id));
    if (cyclic.length) {
        const path = cyclic.map(record => record.id);
        const errors = cyclic.map(record => report(new ExtensionError('E_EXTENSION_CYCLE', 'Extension dependency cycle detected.', record.id, { path })));
        if (cyclic.some(record => record.approval.required)) throw errors[0];
        cyclic.forEach(record => disabled.add(record.id));
    }
    const active = records.filter(record => !disabled.has(record.id)).sort(compareRecords);
    const accepted = [];
    const contributions = [];
    let schemaServices = coreSchemaServices;
    for (const record of active) {
        if (!record.definition.schema) { accepted.push(record); continue; }
        try {
            const next = [...contributions, { extensionId: record.id, schema: record.definition.schema }];
            schemaServices = createSchemaServices(next);
            contributions.push(next.at(-1)); accepted.push(record);
        } catch (error) {
            const wrapped = report(error instanceof ExtensionError ? error : new ExtensionError(error.code || 'E_EXTENSION_CONFLICT', error.message, record.id, error.details));
            if (record.approval.required) throw wrapped;
        }
    }
    return { records: accepted, schemaServices };
}

function readonlyConfig(value) {
    if (!value || typeof value !== 'object') return Object.freeze({});
    return deepFreeze(typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)));
}
function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze); return Object.freeze(value);
}

function createAsyncPlugin() {
    const key = new pmState.PluginKey('roundeditor-extension-async-content');
    const plugin = new pmState.Plugin({
        key,
        state: {
            init: () => new Map(),
            apply(transaction, previous) {
                const next = new Map();
                for (const [id, range] of previous) {
                    const from = transaction.mapping.mapResult(range.from, 1);
                    const to = transaction.mapping.mapResult(range.to, -1);
                    if (!((from.deleted && to.deleted) || from.pos >= to.pos)) next.set(id, { from: from.pos, to: to.pos });
                }
                const action = transaction.getMeta(key);
                if (action?.add) next.set(action.add.id, { from: action.add.from, to: action.add.to });
                if (action?.remove) next.delete(action.remove);
                return next;
            },
        },
    });
    return { key, plugin };
}

export function createExtensionHost(bridge, records) {
    const coreRecord = { id: 'roundeditor.core', tasks: new Set(), resources: [], approval: { config: {} } };
    const asyncState = createAsyncPlugin();
    const commands = new Map();
    const keyBindings = new Map();
    const hooks = { paste: [], drop: [], beforeInsert: [], afterTransaction: [] };
    const plugins = [asyncState.plugin];
    const pluginKeys = new Set([asyncState.plugin.key]);
    const nodeViews = {};
    const toolbar = [];
    const attachmentRenderers = [];
    const attachmentHooks = [];
    const tasks = new Map();
    const panels = new Set();
    const panelClosers = new Map();
    const insertTransformStack = new Set();
    let destroyed = false;
    let stopped = false;

    const logger = id => Object.freeze(Object.fromEntries(['debug', 'info', 'warn', 'error'].map(level => [level, (message, details) => {
        const fn = console[level] || console.log;
        fn.call(console, `[roundeditor:${bridge.sequence}:${id}] ${message}`, details ?? '');
    }])));

    function insertPlan(plan, source) {
        return bridge.integration.content.insertHTML(plan.html, {
            select: plan.select || 'after', source, metadata: plan.metadata,
        });
    }

    function beginAsync(record, options) {
        if (destroyed) throw new ExtensionError('E_EXTENSION_RUNTIME', 'The extension host was destroyed.', record.id);
        const source = options.source || `extension:${record.id}`;
        const slice = bridge.schemaServices.parseSlice(String(options.placeholderHTML || ''));
        let transaction = bridge.view.state.tr;
        const at = options.at || 'selection';
        if (at !== 'selection') {
            if (!at?.alive) throw new ExtensionError('E_TARGET_GONE', 'The async target is gone.', record.id);
            transaction = transaction.setSelection(pmState.TextSelection.create(transaction.doc, at._from, at._to));
        }
        const id = `${bridge.sequence}:${record.id}:${++taskSerial}`;
        const originalFrom = transaction.selection.from;
        transaction = transaction.replaceSelection(slice);
        const mappedFrom = transaction.mapping.map(originalFrom, -1);
        const mappedTo = Math.max(mappedFrom, transaction.selection.to);
        transaction.setMeta(asyncState.key, { add: { id, from: mappedFrom, to: mappedTo } });
        transaction.setMeta('roundeditorSource', source);
        bridge.view.dispatch(transaction.scrollIntoView());
        const controller = new AbortController();
        const task = {
            id, kind: String(options.kind || 'content'), controller, originalHTML: String(options.originalHTML || ''), record,
            get alive() { return !destroyed && !controller.signal.aborted && Boolean(asyncState.key.getState(bridge.view.state)?.has(id)); },
            get signal() { return controller.signal; },
            replaceHTML(html, replaceOptions = {}) { return finishTask(task, String(html || ''), replaceOptions.appendParagraph); },
            restoreOriginal() { return finishTask(task, task.originalHTML); },
            remove() { return finishTask(task, ''); },
            cancel(reason) { if (!controller.signal.aborted) controller.abort(reason); removeTaskMarker(task); },
        };
        tasks.set(id, task); record.tasks.add(task);
        return Object.freeze(task);
    }

    function taskRange(task) { return asyncState.key.getState(bridge.view.state)?.get(task.id) || null; }
    function removeTaskMarker(task) {
        if (bridge.view && taskRange(task)) bridge.view.dispatch(bridge.view.state.tr.setMeta(asyncState.key, { remove: task.id }).setMeta('addToHistory', false));
        tasks.delete(task.id); task.record.tasks.delete(task);
    }
    function finishTask(task, html, appendParagraph = false) {
        const range = taskRange(task);
        if (!task.alive || !range) return Object.freeze({ applied: false, normalized: false, canonicalHTML: bridge.serializeVisual(), warnings: Object.freeze([]) });
        let content = bridge.schemaServices.parseSlice(html).content;
        if (appendParagraph) content = content.append(pmModel.Fragment.from(bridge.schema.nodes.paragraph.create()));
        const transaction = bridge.view.state.tr.replaceWith(range.from, range.to, content)
            .setMeta(asyncState.key, { remove: task.id }).setMeta('roundeditorSource', `extension:${task.record.id}`);
        bridge.view.dispatch(transaction.scrollIntoView());
        tasks.delete(task.id); task.record.tasks.delete(task);
        return Object.freeze({ applied: true, normalized: false, canonicalHTML: bridge.serializeVisual(), warnings: Object.freeze([]) });
    }

    function allowedAssetUrl(raw) {
        const url = new URL(raw, document.baseURI);
        if (url.protocol !== 'https:' && url.origin !== location.origin) throw new ExtensionError('E_EXTENSION_RUNTIME', 'Only HTTPS extension assets are allowed.');
        const origins = new Set([location.origin, ...(bridge.config.extensionAssetOrigins || [])]);
        if (!origins.has(url.origin)) throw new ExtensionError('E_EXTENSION_RUNTIME', 'The extension asset origin is not approved.');
        return url.href;
    }
    function assetService(record) {
        const acquire = (id, type, url, create) => {
            const key = `${record.id}:${id}`;
            const existing = assetRecords.get(key);
            if (existing && (existing.type !== type || existing.url !== url)) throw new ExtensionError('E_EXTENSION_CONFLICT', 'Asset ID conflict.', record.id, { id });
            const created = existing ? null : create();
            const entry = existing || {
                type, url, count: 0,
                element: created?.element || created,
                loaded: created?.loaded || Promise.resolve(),
            };
            entry.count += 1; assetRecords.set(key, entry);
            let released = false;
            const handle = Object.freeze({ id, loaded: entry.loaded || Promise.resolve(), release() {
                if (released) return; released = true; entry.count -= 1;
                if (entry.count <= 0) { entry.element?.remove(); assetRecords.delete(key); }
            } });
            record.resources.push(handle); return handle;
        };
        return Object.freeze({
            addStyle(options) {
                const id = String(options.id || ''); if (!id) throw new ExtensionError('E_EXTENSION_INVALID', 'Style ID is required.', record.id);
                const href = options.href ? allowedAssetUrl(options.href) : '';
                if (href && options.scope !== 'document') throw new ExtensionError('E_EXTENSION_INVALID', 'External stylesheets must explicitly use document scope.', record.id);
                return acquire(id, 'style', href || String(options.css || ''), () => {
                    const element = document.createElement(href ? 'link' : 'style');
                    let loaded = Promise.resolve();
                    if (href) {
                        element.rel = 'stylesheet'; element.href = href;
                        loaded = new Promise((resolve, reject) => { element.addEventListener('load', resolve, { once: true }); element.addEventListener('error', reject, { once: true }); });
                    } else {
                        const css = String(options.css || '');
                        const selector = bridge.wrapper.id ? `#${bridge.wrapper.id}` : `.roundeditor[data-editor-sequence="${bridge.sequence}"]`;
                        element.textContent = options.scope === 'document' ? css : `@scope (${selector}) {\n${css}\n}`;
                    }
                    element.dataset.roundeditorExtensionAsset = record.id; document.head.appendChild(element); return { element, loaded };
                });
            },
            async addScript(options) {
                const id = String(options.id || ''); const src = allowedAssetUrl(options.src);
                return acquire(id, 'script', src, () => {
                    const element = document.createElement('script'); element.src = src;
                    if (options.crossorigin === 'anonymous') element.crossOrigin = 'anonymous';
                    const loaded = new Promise((resolve, reject) => { element.addEventListener('load', resolve, { once: true }); element.addEventListener('error', reject, { once: true }); });
                    element.dataset.roundeditorExtensionAsset = record.id; document.head.appendChild(element); return { element, loaded };
                });
            },
        });
    }

    function uiService(record) {
        return Object.freeze({
            notify: (message, options) => bridge.integration.ui.notify(message, options),
            openPanel(definition) {
                const content = typeof definition.content === 'function' ? definition.content() : definition.content;
                const panelName = `${record.id}:${definition.id}`;
                let open = true;
                const handle = Object.freeze({
                    id: definition.id,
                    get open() { return open; },
                    close() {
                        if (!open) return false;
                        return bridge.toolbar.closePanel('api', panelName);
                    },
                });
                const finish = reason => {
                    if (!open) return;
                    open = false;
                    panels.delete(handle);
                    panelClosers.delete(handle);
                    try { definition.onClose?.(reason); }
                    catch (error) { report(new ExtensionError('E_EXTENSION_RUNTIME', error.message || 'Panel onClose failed.', record.id, error)); }
                };
                const opened = bridge.toolbar.openPanel(panelName, definition.title, content, finish);
                if (!opened) finish('toggle');
                if (open) {
                    panels.add(handle);
                    panelClosers.set(handle, reason => bridge.toolbar.closePanel(reason, panelName));
                }
                return handle;
            },
        });
    }

    for (const record of records) {
        const metadata = Object.freeze({ id: record.id, version: record.definition.version, apiVersion: record.definition.apiVersion, enabled: true });
        const context = Object.freeze({
            extension: metadata, editor: bridge.integration, pm, schema: bridge.schema, config: readonlyConfig(record.approval.config),
            content: Object.freeze({
                parseHTML: bridge.schemaServices.parseSlice,
                serializeSlice: slice => bridge.schemaServices.serializeDocument({ content: slice.content }),
                insertHTML: (html, options) => bridge.integration.content.insertHTML(html, options),
            }),
            asyncContent: Object.freeze({ begin: options => beginAsync(record, options) }),
            attachments: bridge.integration.attachments,
            assets: assetService(record), ui: uiService(record), log: logger(record.id),
        });
        try { record.instance = record.definition.create(context) || {}; }
        catch (error) {
            const wrapped = report(new ExtensionError('E_EXTENSION_CREATE', error.message || 'Extension create() failed.', record.id, error));
            if (record.approval.required) throw wrapped;
            record.instance = null; continue;
        }
        const instance = record.instance;
        const pluginLength = plugins.length;
        const pluginKeySnapshot = new Set(pluginKeys);
        const nodeViewSnapshot = new Set(Object.keys(nodeViews));
        try {
        for (const [local, command] of Object.entries(instance.commands || {})) {
            if (typeof command !== 'function') throw report(new ExtensionError('E_EXTENSION_INVALID', 'Extension command must be a function.', record.id, { command: local }));
            const name = `${record.id}.${local}`;
            if (commands.has(name)) throw report(new ExtensionError('E_EXTENSION_CONFLICT', 'Extension command conflict.', record.id, { command: name }));
            commands.set(name, { record, command });
        }
        for (const [shortcut, target] of Object.entries(instance.keymap || {})) {
            if (!keyBindings.has(shortcut)) keyBindings.set(shortcut, []);
            keyBindings.get(shortcut).push({ record, target });
        }
        for (const plugin of instance.plugins || []) {
            if (!plugin?.key || !String(plugin.key).includes(record.id)) throw report(new ExtensionError('E_EXTENSION_INVALID', 'Every extension plugin needs a namespaced PluginKey.', record.id));
            if (pluginKeys.has(plugin.key)) throw report(new ExtensionError('E_EXTENSION_CONFLICT', 'Extension PluginKey conflict.', record.id, { key: plugin.key }));
            pluginKeys.add(plugin.key); plugins.push(plugin);
        }
        for (const type of Object.keys(hooks)) for (const hook of instance.hooks?.[type] || []) hooks[type].push({ record, hook });
        for (const [name, factory] of Object.entries(instance.nodeViews || {})) {
            if (!bridge.schema.nodes[name] || nodeViews[name]) throw report(new ExtensionError('E_EXTENSION_CONFLICT', 'Extension NodeView conflict.', record.id, { node: name }));
            nodeViews[name] = factory;
        }
        for (const item of instance.toolbar || []) {
            const normalized = item.icon?.type === 'url' ? { ...item, icon: { ...item.icon, url: allowedAssetUrl(item.icon.url) } } : item;
            toolbar.push({ record, item: normalized });
        }
        for (const renderer of instance.attachments?.renderers || []) attachmentRenderers.push({ record, renderer });
        if (instance.attachments) attachmentHooks.push({ record, value: instance.attachments });
        } catch (error) {
            const wrapped = error instanceof ExtensionError ? error : new ExtensionError(error.code || 'E_EXTENSION_INVALID', error.message, record.id, error);
            if (!window.RoundEditor?._extensionHost?.diagnostics?.some(item => item.extensionId === record.id && item.message === wrapped.message)) report(wrapped);
            for (const [name, entry] of commands) if (entry.record === record) commands.delete(name);
            for (const [shortcut, entries] of keyBindings) {
                keyBindings.set(shortcut, entries.filter(entry => entry.record !== record));
                if (!keyBindings.get(shortcut).length) keyBindings.delete(shortcut);
            }
            plugins.splice(pluginLength);
            pluginKeys.clear(); pluginKeySnapshot.forEach(key => pluginKeys.add(key));
            for (const name of Object.keys(nodeViews)) if (!nodeViewSnapshot.has(name)) delete nodeViews[name];
            for (const list of Object.values(hooks)) list.splice(0, list.length, ...list.filter(entry => entry.record !== record));
            toolbar.splice(0, toolbar.length, ...toolbar.filter(entry => entry.record !== record));
            attachmentRenderers.splice(0, attachmentRenderers.length, ...attachmentRenderers.filter(entry => entry.record !== record));
            attachmentHooks.splice(0, attachmentHooks.length, ...attachmentHooks.filter(entry => entry.record !== record));
            for (const resource of [...record.resources].reverse()) resource.release();
            try { instance.destroy?.(); } catch (_) {}
            record.instance = null;
            if (record.approval.required) throw wrapped;
        }
    }

    for (const list of Object.values(hooks)) list.sort((a, b) => compareRecords(a.record, b.record) || (Number(b.hook.priority) || 0) - (Number(a.hook.priority) || 0));
    for (const list of keyBindings.values()) list.sort((a, b) => compareRecords(a.record, b.record));
    attachmentRenderers.sort((a, b) => (Number(b.renderer.priority) || 0) - (Number(a.renderer.priority) || 0) || compareRecords(a.record, b.record));
    toolbar.sort((a, b) => String(a.item.group || '').localeCompare(String(b.item.group || '')) || (Number(a.item.order) || 0) - (Number(b.item.order) || 0) || compareRecords(a.record, b.record));

    const keymapBindings = {};
    for (const [shortcut, entries] of keyBindings) keymapBindings[shortcut] = (state, dispatch, view) => entries.some(entry => executeTarget(entry.record, entry.target, undefined, state, dispatch, view));
    if (Object.keys(keymapBindings).length) plugins.push(createKeymap(keymapBindings));

    function resolveCommand(record, name) { return String(name).includes('.') ? String(name) : `${record.id}.${name}`; }
    function executeTarget(record, target, params, state, dispatch, view) {
        state ||= bridge.view.state;
        const command = typeof target === 'function' ? target : commands.get(resolveCommand(record, target))?.command;
        if (!command) return false;
        try { return command({ state, dispatch, view, editor: bridge.integration }, params) === true; }
        catch (error) { report(new ExtensionError('E_EXTENSION_RUNTIME', error.message || 'Extension command failed.', record.id, error)); return false; }
    }
    function execute(name, params, dispatch = true) {
        const entry = commands.get(name); if (!entry) return null;
        return executeTarget(entry.record, entry.command, params, bridge.view.state, dispatch ? transaction => bridge.view.dispatch(transaction) : undefined, dispatch ? bridge.view : undefined);
    }
    function runClaim(type, context) {
        for (const { record, hook } of hooks[type]) {
            try { const value = hook.handle(context); if (value?.handled) return { record, value }; }
            catch (error) { report(new ExtensionError('E_EXTENSION_RUNTIME', error.message || `${type} hook failed.`, record.id, error)); }
        }
        return null;
    }
    function handlePaste(event) {
        const data = event.clipboardData;
        const claimed = runClaim('paste', { editor: bridge.integration, event, text: data?.getData('text/plain') || '', html: data?.getData('text/html') || '', files: Object.freeze(Array.from(data?.files || [])), source: 'paste' });
        if (!claimed) return false;
        event.preventDefault();
        if (claimed.value.insert) insertPlan(claimed.value.insert, `extension:${claimed.record.id}`);
        if (claimed.value.async) {
            const plan = claimed.value.async; const task = beginAsync(claimed.record, { ...plan, source: `extension:${claimed.record.id}` });
            Promise.resolve().then(() => plan.run(task)).catch(error => {
                report(new ExtensionError('E_EXTENSION_RUNTIME', error.message || 'Async paste failed.', claimed.record.id, error));
                if (!task.alive) return;
                if (plan.onError === 'keep-placeholder') return;
                if (plan.onError === 'remove') task.remove(); else task.restoreOriginal();
            });
        }
        return true;
    }
    function handleDrop(event, moved) {
        const coordinates = { left: event.clientX, top: event.clientY };
        const position = bridge.view.posAtCoords(coordinates)?.pos ?? bridge.view.state.selection.from;
        const anchor = bridge.integration._createAnchor(position, position);
        const claimed = runClaim('drop', { editor: bridge.integration, event, files: Object.freeze(Array.from(event.dataTransfer?.files || [])), moved, coordinates, anchor });
        if (!claimed) { anchor.release(); return false; }
        event.preventDefault();
        if (claimed.value.run) Promise.resolve().then(() => claimed.value.run()).catch(error => report(new ExtensionError('E_EXTENSION_RUNTIME', error.message || 'Drop hook failed.', claimed.record.id, error)));
        return true;
    }
    function transformInsert(request) {
        let current = request;
        for (const { record, hook } of hooks.beforeInsert) {
            if (insertTransformStack.has(record.id)) continue;
            try {
                insertTransformStack.add(record.id);
                const next = hook.transform(current); if (next?.handled) return next; if (next) current = next;
            }
            catch (error) { report(new ExtensionError('E_EXTENSION_RUNTIME', error.message || 'beforeInsert hook failed.', record.id, error)); }
            finally { insertTransformStack.delete(record.id); }
        }
        return current;
    }
    function afterTransaction(transactions, oldState, newState) {
        for (const { record, hook } of hooks.afterTransaction) {
            try { hook.run({ transactions, oldState, newState, editor: bridge.integration }); }
            catch (error) { report(new ExtensionError('E_EXTENSION_RUNTIME', error.message || 'afterTransaction hook failed.', record.id, error)); }
        }
        for (const [id, task] of tasks) if (!asyncState.key.getState(newState)?.has(id)) { task.controller.abort('placeholder-removed'); tasks.delete(id); task.record.tasks.delete(task); }
    }
    async function ready() {
        for (const record of records) {
            if (!record.instance?.ready) continue;
            try {
                await withTimeout(Promise.resolve(record.instance.ready()), Number(bridge.config.extensionReadyTimeout) || READY_TIMEOUT);
            } catch (error) {
                const wrapped = report(new ExtensionError('E_EXTENSION_READY', error.message || 'Extension ready() failed.', record.id, error));
                if (record.approval.required) throw wrapped;
            }
        }
    }

    function withTimeout(promise, timeout) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('ready() timed out.')), timeout);
            promise.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
        });
    }
    function stop() {
        if (stopped) return; stopped = true;
        for (const task of tasks.values()) task.cancel('editor-destroyed'); tasks.clear();
        for (const panel of [...panels]) panelClosers.get(panel)?.('editor-destroyed');
        panelClosers.clear();
    }
    function destroy() {
        if (destroyed) return;
        stop(); destroyed = true;
        for (const record of [...records].reverse()) {
            try { record.instance?.destroy?.(); } catch (error) { report(new ExtensionError('E_EXTENSION_RUNTIME', error.message || 'Extension destroy() failed.', record.id, error)); }
            for (const resource of [...record.resources].reverse()) resource.release();
        }
    }
    async function renderAttachments(files, at, source = 'attachment') {
        for (const entry of attachmentRenderers) {
            const matching = files.filter(file => { try { return entry.renderer.matches(file); } catch (error) { report(new ExtensionError('E_EXTENSION_RUNTIME', error.message, entry.record.id, error)); return false; } });
            if (!matching.length) continue;
            const controller = new AbortController();
            const selected = entry.renderer.batch ? matching : matching.slice(0, 1);
            const result = await entry.renderer.render(Object.freeze(selected), { editor: bridge.integration, at, source, signal: controller.signal });
            const plan = typeof result === 'string' ? { html: result } : result;
            return { renderer: entry.renderer.id, result: bridge.integration.content.insertHTML(plan.html, { at, source, select: plan.select, metadata: plan.metadata }), files: selected };
        }
        return null;
    }
    async function attachmentEvent(type, event) {
        for (const entry of attachmentHooks) {
            const handler = entry.value[type]; if (!handler) continue;
            try { const value = await handler(event); if (type === 'beforeDelete' && value === false) return false; }
            catch (error) { report(new ExtensionError('E_EXTENSION_RUNTIME', error.message || `Attachment ${type} failed.`, entry.record.id, error)); }
        }
        return true;
    }

    return Object.freeze({ plugins, nodeViews, toolbar, commands,
        hasCommand: name => commands.has(name), executeCommand: execute,
        handlePaste, handleDrop, transformInsert, afterTransaction, ready, stop, destroy,
        renderAttachments, attachmentEvent,
        beginAsyncContent: options => beginAsync(coreRecord, options),
    });
}
