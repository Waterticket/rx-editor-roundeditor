import { Fragment } from 'prosemirror-model';
import { TextSelection } from 'prosemirror-state';
import { closeHistory, redo, undo } from 'prosemirror-history';
import { selectAll, toggleMark } from 'prosemirror-commands';
import { parseDocument, parseSlice, schema, serializeDocument } from './schema/index.js';

const COMPONENT_TYPES = new Set(['rhymixComponentBlock', 'rhymixComponentInline']);
const DEFAULT_ANCHOR_TTL = 30 * 60 * 1000;
const capabilityNames = [
    'content.readHTML', 'content.insertHTML', 'content.replaceDocument', 'selection.readHTML',
    'selection.anchor', 'component.read', 'component.write', 'mode.source', 'ui.notification',
];

export class RoundEditorError extends Error {
    constructor(code, message = code, details) {
        super(message);
        this.name = 'RoundEditorError';
        this.code = code;
        if (details !== undefined) this.details = details;
    }
}

function error(code, message, details) { return new RoundEditorError(code, message, details); }
function snapshotHtml(node, services) { return services.serializeDocument({ content: Fragment.from(node) }); }
function normalizationReport(html, parsed, services) {
    const source = String(html || '');
    const normalizedHTML = services.serializeDocument(parsed);
    if (source === normalizedHTML) return { normalized: false, warnings: Object.freeze([]) };

    const warnings = [];
    if (/<\s*(?:script|style|object|embed)(?:\s|>)/i.test(source)) {
        warnings.push(Object.freeze({ code: 'TAG_REMOVED', detail: 'Unsupported or unsafe HTML tags were removed.' }));
    }
    if (/\s(?:on[a-z]+)\s*=/i.test(source)) {
        warnings.push(Object.freeze({ code: 'ATTRIBUTE_REMOVED', detail: 'Unsafe event handler attributes were removed.' }));
    }
    if (!warnings.length) {
        warnings.push(Object.freeze({ code: 'STRUCTURE_NORMALIZED', detail: 'HTML was normalized to the canonical editor format.' }));
    }
    return { normalized: true, warnings: Object.freeze(warnings) };
}
function componentInfo(node, services) {
    const html = COMPONENT_TYPES.has(node.type.name) ? node.attrs.html : snapshotHtml(node, services);
    const template = document.createElement('template');
    template.innerHTML = html;
    const element = template.content.querySelector('[editor_component]');
    if (!element) return null;
    return {
        name: element.getAttribute('editor_component') || '', html,
        innerHTML: element.innerHTML,
        attributes: Object.freeze(Object.fromEntries(Array.from(element.attributes, attr => [attr.name, attr.value]))),
    };
}

export function installIntegrationGlobal() {
    const existing = window.RoundEditor;
    if (existing?.integrationApiVersion === '1.0' && existing._register) return existing;
    const instances = new Map();
    const listeners = new Map();
    const emit = (type, sequence, editor) => {
        for (const listener of [...(listeners.get(type) || [])]) {
            try { listener({ type, sequence, editor }); } catch (exception) { console.error('[roundeditor] Integration listener failed.', exception); }
        }
    };
    const api = {
        integrationApiVersion: '1.0',
        get: sequence => instances.get(Number(sequence)) || null,
        getActive: () => api._active || null,
        list: () => Object.freeze([...instances.values()]),
        whenReady(sequence, options = {}) {
            const current = api.get(sequence);
            if (current) return Promise.resolve(current);
            const timeout = Number.isFinite(options.timeout) ? options.timeout : 10000;
            return new Promise((resolve, reject) => {
                let timer = null;
                const off = api.on('instanceReady', event => {
                    if (event.sequence !== Number(sequence)) return;
                    cleanup(); resolve(event.editor);
                });
                const abort = () => { cleanup(); reject(error('E_NOT_READY', 'Editor readiness was aborted.')); };
                const cleanup = () => { off(); if (timer) clearTimeout(timer); options.signal?.removeEventListener('abort', abort); };
                if (options.signal?.aborted) return abort();
                options.signal?.addEventListener('abort', abort, { once: true });
                if (timeout >= 0) timer = setTimeout(() => { cleanup(); reject(error('E_TIMEOUT', `Editor ${sequence} did not become ready.`)); }, timeout);
            });
        },
        on(type, listener) {
            if (!listeners.has(type)) listeners.set(type, new Set());
            listeners.get(type).add(listener);
            return () => listeners.get(type)?.delete(listener);
        },
        _register(handle) { instances.set(handle.sequence, handle); emit('instanceReady', handle.sequence, handle); },
        _destroy(handle) { if (instances.get(handle.sequence) === handle) instances.delete(handle.sequence); if (api._active === handle) api._active = null; emit('instanceDestroyed', handle.sequence, null); },
        _activate(handle) { if (api._active !== handle) { api._active = handle; emit('activeChanged', handle.sequence, handle); } },
    };
    window.RoundEditor = api;
    return api;
}

export function createEditorHandle(bridge, options = {}) {
    const global = installIntegrationGlobal();
    const services = bridge.schemaServices || {
        schema, parseDocument, parseSlice,
        serializeDocument: value => serializeDocument(value, schema),
    };
    const events = new Map();
    const tracked = new Set();
    const attachmentListeners = new Set();
    let destroyed = false;
    let serial = 0;
    const emit = (type, payload) => {
        for (const listener of [...(events.get(type) || [])]) {
            try { listener(payload); } catch (exception) { console.error('[roundeditor] Editor listener failed.', exception); }
        }
    };
    const assertLive = () => { if (destroyed) throw error('E_EDITOR_DESTROYED', 'This editor has been destroyed.'); };
    const canonical = () => bridge.sourceMode?.active
        ? services.serializeDocument(services.parseDocument(bridge.sourceMode.getData()))
        : bridge.serializeVisual();
    const result = (report = { normalized: false, warnings: Object.freeze([]) }) => Object.freeze({
        applied: true,
        normalized: report.normalized,
        canonicalHTML: canonical(),
        warnings: report.warnings,
    });
    const mapTracked = transaction => {
        for (const ref of [...tracked]) {
            if (!ref._alive) continue;
            const collapsed = ref._from === ref._to;
            const from = transaction.mapping.mapResult(ref._from, 1);
            const to = transaction.mapping.mapResult(ref._to, collapsed ? 1 : -1);
            ref._from = from.pos; ref._to = to.pos;
            if ((from.deleted && to.deleted) || ref._from > ref._to) ref._alive = false;
        }
    };
    const createRef = (kind, from, to, node = null) => {
        const ref = { id: `${bridge.sequence}:${kind}:${++serial}`, createdAt: Date.now(), _from: from, _to: to, _alive: true, _node: node };
        Object.defineProperties(ref, {
            alive: { enumerable: true, get: () => ref._alive && !destroyed },
            release: { enumerable: true, value: () => {
                ref._alive = false;
                if (ref._timer) clearTimeout(ref._timer);
                ref._timer = null;
                tracked.delete(ref);
            } },
        });
        tracked.add(ref);
        return ref;
    };
    const validateRef = (ref, component = false) => {
        assertLive();
        if (!ref?.alive) throw error('E_TARGET_GONE', 'The target is no longer available.');
        if (component) {
            const node = bridge.view.state.doc.nodeAt(ref._from);
            if (!node || !componentInfo(node, services) || (ref._node && !node.sameMarkup(ref._node))) {
                ref._alive = false; throw error('E_TARGET_GONE', 'The component was removed or replaced.');
            }
            return node;
        }
        return ref;
    };
    const setHistory = (transaction, options = {}) => {
        if (options.source) transaction.setMeta('roundeditorSource', options.source);
        return options.history === 'skip' ? transaction.setMeta('addToHistory', false) : closeHistory(transaction);
    };
    const placeSelection = (transaction, policy, from, to = from) => {
        if (policy === 'preserve') return transaction;
        const position = policy === 'start' ? from : to;
        return transaction.setSelection(TextSelection.near(transaction.doc.resolve(Math.max(0, Math.min(position, transaction.doc.content.size)))));
    };
    const insert = (html, options = {}) => {
        assertLive();
        let request = { html: String(html || ''), source: options.source || 'api', metadata: options.metadata };
        const transformed = bridge.extensionHost?.transformInsert(request);
        if (transformed?.handled) return result();
        request = transformed || request;
        const sourceHTML = String(request.html || '');
        const slice = services.parseSlice(sourceHTML);
        const report = normalizationReport(sourceHTML, { content: slice.content }, services);
        const at = options.at || 'selection';
        if (bridge.sourceMode?.active) {
            if (at !== 'selection') throw error('E_UNSUPPORTED_MODE', 'Anchors are unavailable in source mode.');
            bridge.sourceMode.insertHtml(sourceHTML); bridge.sync(); return result(report);
        }
        let transaction = bridge.view.state.tr;
        if (at !== 'selection') {
            const anchor = validateRef(at);
            transaction = transaction.setSelection(TextSelection.create(transaction.doc, anchor._from, anchor._to));
        }
        transaction = transaction.replaceSelection(slice);
        const end = transaction.selection.to;
        transaction = placeSelection(transaction, options.select || 'after', end, end);
        bridge.view.dispatch(setHistory(transaction, options));
        return result(report);
    };
    const attachmentList = () => Array.from(bridge.attachments?.container?.querySelectorAll('.xefu-file[data-file-srl]') || [])
        .map(item => ({
            fileSrl: Number(item.dataset.fileSrl),
            sourceFilename: item.querySelector('.xefu-file-name')?.textContent?.trim() || '',
            downloadUrl: item.querySelector('a[href]')?.href || '',
            mimeType: item.dataset.mimeType || '',
            size: Number(item.dataset.fileSize || 0),
        })).filter(item => Number.isFinite(item.fileSrl) && item.fileSrl > 0);
    const handle = {
        id: `roundeditor:${bridge.sequence}`,
        sequence: bridge.sequence,
        get destroyed() { return destroyed; },
        get capabilities() { return new Set([...capabilityNames, ...(bridge.attachments ? ['attachment.read', 'attachment.upload', 'attachment.delete'] : [])]); },
        hasCapability: name => handle.capabilities.has(name),
        on(type, listener) { if (!events.has(type)) events.set(type, new Set()); events.get(type).add(listener); return () => events.get(type)?.delete(listener); },
        focus(options = {}) { assertLive(); global._activate(handle); bridge.sourceMode?.focus(); if (options.scroll !== false) bridge.view.dom.scrollIntoView?.({ block: 'nearest' }); return true; },
        document: {
            get primaryKeyName() { return bridge.config.primaryKeyName; }, get contentKeyName() { return bridge.config.contentKeyName; }, get editorSequence() { return bridge.sequence; },
            get primaryValue() { bridge.rebindControls(); return String(bridge.primaryInput?.value || ''); },
            set primaryValue(value) { assertLive(); bridge.rebindControls(); bridge.primaryInput.value = String(value ?? ''); },
            sync: () => { assertLive(); return bridge.sync(); },
        },
        content: {
            getHTML: options => options?.scope === 'selection' ? handle.selection.getHTML() : canonical(),
            getText: options => bridge.getText(options?.scope === 'selection'),
            insertHTML: insert,
            setHTML(html, options = {}) {
                assertLive();
                const sourceHTML = String(html || '');
                const next = services.parseDocument(sourceHTML);
                const report = normalizationReport(sourceHTML, next, services);
                if (bridge.sourceMode?.active) bridge.sourceMode.textarea.value = services.serializeDocument(next);
                const transaction = bridge.view.state.tr.replaceWith(0, bridge.view.state.doc.content.size, next.content);
                const selection = options.selection || 'end';
                bridge.view.dispatch(setHistory(placeSelection(transaction, selection, 0, transaction.doc.content.size), options));
                bridge.sync(); return result(report);
            },
            clear: options => handle.content.setHTML('', options),
        },
        selection: {
            get empty() { return bridge.sourceMode?.active ? bridge.sourceMode.textarea.selectionStart === bridge.sourceMode.textarea.selectionEnd : bridge.view.state.selection.empty; },
            getHTML: () => bridge.sourceMode?.active ? bridge.sourceMode.selectedHtml() : services.serializeDocument({ content: bridge.view.state.selection.content().content }),
            getText: () => bridge.getText(true),
            capture(options = {}) {
                assertLive();
                if (bridge.sourceMode?.active) throw error('E_UNSUPPORTED_MODE', 'Selection anchors are unavailable in source mode.');
                const selection = bridge.view.state.selection;
                const ref = createRef('anchor', selection.from, selection.to); ref._ttl = Number.isFinite(options.ttl) ? options.ttl : DEFAULT_ANCHOR_TTL;
                if (ref._ttl > 0) ref._timer = setTimeout(() => ref.release(), ref._ttl); return ref;
            },
        },
        components: {
            getActive: expected => handle.components.getSelected(expected),
            getSelected(expected) {
                assertLive(); if (bridge.sourceMode?.active) return null;
                const selection = bridge.view.state.selection;
                const candidates = [selection.from, selection.$from.depth > 0 ? selection.$from.before(selection.$from.depth) : null]
                    .filter(position => Number.isInteger(position));
                for (const pos of candidates) {
                    const node = bridge.view.state.doc.nodeAt(pos); const info = node && componentInfo(node, services);
                    if (info && (!expected || info.name === expected)) {
                        const ref = createRef('component', pos, pos + node.nodeSize, node);
                        Object.assign(ref, info); return ref;
                    }
                } return null;
            },
            capture: ref => { validateRef(ref, true); return ref; },
            insert(name, html, options = {}) { return insert(html, options); },
            replace(ref, html, options = {}) {
                const node = validateRef(ref, true);
                const sourceHTML = String(html || '');
                const slice = services.parseSlice(sourceHTML);
                const report = normalizationReport(sourceHTML, { content: slice.content }, services);
                const transaction = bridge.view.state.tr.replaceWith(ref._from, ref._from + node.nodeSize, slice.content);
                bridge.view.dispatch(setHistory(transaction, options));
                return result(report);
            },
            updateAttributes(ref, attributes, options = {}) {
                const node = validateRef(ref, true); const info = componentInfo(node, services); const template = document.createElement('template'); template.innerHTML = info.html; const element = template.content.querySelector('[editor_component]');
                for (const [name, value] of Object.entries(attributes || {})) { if (/^on/i.test(name)) continue; if (value === null) element.removeAttribute(name); else element.setAttribute(name, String(value)); }
                return handle.components.replace(ref, template.innerHTML, options);
            },
            remove(ref, options = {}) { const node = validateRef(ref, true); bridge.view.dispatch(setHistory(bridge.view.state.tr.delete(ref._from, ref._from + node.nodeSize), options)); ref.release(); return result(); },
        },
        commands: {
            list: () => Object.freeze(['history.undo', 'history.redo', 'selection.selectAll', 'format.bold', 'format.italic', 'content.deleteSelection', 'component.open', ...(bridge.extensionHost ? [...bridge.extensionHost.commands.keys()] : [])]),
            can(name) { assertLive(); const commands = { 'history.undo': undo, 'history.redo': redo, 'selection.selectAll': selectAll, 'format.bold': toggleMark(services.schema.marks.strong), 'format.italic': toggleMark(services.schema.marks.em) }; if (commands[name]) return commands[name](bridge.view.state); const extension = bridge.extensionHost?.executeCommand(name, undefined, false); if (extension !== null && extension !== undefined) return extension; return name === 'content.deleteSelection' ? !bridge.view.state.selection.empty : name === 'component.open' ? Boolean(handle.components.getSelected()) : false; },
            execute(name, params) { assertLive(); const commands = { 'history.undo': undo, 'history.redo': redo, 'selection.selectAll': selectAll, 'format.bold': toggleMark(services.schema.marks.strong), 'format.italic': toggleMark(services.schema.marks.em) }; if (commands[name]) return commands[name](bridge.view.state, transaction => bridge.view.dispatch(transaction)); const extension = bridge.extensionHost?.executeCommand(name, params, true); if (extension !== null && extension !== undefined) return extension; if (name === 'content.deleteSelection') { if (bridge.view.state.selection.empty) return false; bridge.view.dispatch(bridge.view.state.tr.deleteSelection()); return true; } if (name === 'component.open') { const ref = handle.components.getSelected(); if (!ref) return false; window.openComponent?.(ref.name, bridge.sequence); return true; } return false; },
        },
        mode: { get current() { return bridge.sourceMode?.active ? 'source' : 'visual'; }, get sourceAvailable() { return Boolean(bridge.config.htmlMode && bridge.config.allowHtml !== false); }, set(mode) { assertLive(); if (mode === 'source' && !handle.mode.sourceAvailable) return false; if (mode === handle.mode.current) return true; bridge.sourceMode?.toggle(); return handle.mode.current === mode; } },
        ui: { notify(message, options = {}) { assertLive(); const element = document.createElement('div'); element.className = `roundeditor__notification roundeditor__notification--${options.type || 'info'}`; element.setAttribute('role', options.type === 'error' ? 'alert' : 'status'); bridge.wrapper.appendChild(element); const update = next => { const value = { ...options, ...next }; element.textContent = `${value.message ?? message}${value.progress == null ? '' : ` ${Math.round(value.progress)}%`}`; }; update({}); let timer = options.duration ? setTimeout(() => element.remove(), options.duration) : null; return Object.freeze({ update(next) { if (timer) clearTimeout(timer); update(next); if (next.duration) timer = setTimeout(() => element.remove(), next.duration); }, close() { if (timer) clearTimeout(timer); element.remove(); } }); } },
        attachments: null,
        _createAnchor: (from, to = from) => createRef('anchor', from, to),
        _mapTransaction: mapTracked,
        _emit: emit,
        _published: false,
        _publish() { if (handle._published) return; handle._published = true; global._register(handle); },
        _destroy() {
            if (destroyed) return;
            bridge.extensionHost?.stop();
            if (bridge.view && !bridge._viewDestroyed) { bridge.view.destroy(); bridge._viewDestroyed = true; }
            bridge.extensionHost?.destroy();
            destroyed = true;
            for (const ref of tracked) ref._alive = false;
            tracked.clear(); emit('destroy', { editorId: handle.id, sequence: handle.sequence });
            if (handle._published) global._destroy(handle);
        },
    };
    if (bridge.config.allowUpload) {
        handle.attachments = {
            get available() { return Boolean(bridge.attachments?.container); },
            list: () => Object.freeze(attachmentList()),
            refresh: async () => {
                assertLive();
                if (!bridge.attachments) throw error('E_UNSUPPORTED', 'Attachment service is unavailable.');
                bridge.attachments.refresh();
                await new Promise(resolve => setTimeout(resolve, 0));
                const attachments = Object.freeze(attachmentList());
                for (const listener of [...attachmentListeners]) { try { listener({ type: 'refreshed', attachments }); } catch (exception) { console.error('[roundeditor] Attachment listener failed.', exception); } }
                return attachments;
            },
            upload: async (files, options = {}) => {
                assertLive();
                const values = Array.from(files || []);
                if (options.signal?.aborted) throw error('E_UPLOAD_FAILED', 'The upload was aborted.');
                if (!bridge.attachments) throw error('E_UNSUPPORTED', 'Attachment upload is unavailable.');
                const position = options.at && options.at !== 'selection' ? validateRef(options.at)._from : null;
                if (!bridge.attachments.uploadFiles(values, position)) throw error('E_UNSUPPORTED', 'Attachment upload is unavailable.');
                // Rhymix's uploader is event based. The returned records deliberately
                // separate a completed server upload from a later auto-insertion.
                return Object.freeze(values.map(file => ({ file, uploaded: false, inserted: false, error: undefined })));
            },
            delete: async fileSrls => {
                assertLive();
                if (!bridge.attachments) throw error('E_UNSUPPORTED', 'Attachment deletion is unavailable.');
                const wanted = new Set((fileSrls || []).map(String));
                const files = Object.freeze(attachmentList().filter(file => wanted.has(String(file.fileSrl))));
                const controller = new AbortController();
                const allowed = await bridge.extensionHost?.attachmentEvent('beforeDelete', {
                    editor: handle, files, signal: controller.signal,
                });
                if (allowed === false) return false;
                const items = Array.from(bridge.attachments.container?.querySelectorAll('.xefu-file[data-file-srl]') || [])
                    .filter(item => wanted.has(item.dataset.fileSrl));
                items.forEach(item => item.querySelector('input[type="checkbox"]')?.click());
                bridge.attachments.container?.querySelector('.xefu-act-delete-selected')?.click();
                await bridge.extensionHost?.attachmentEvent('afterDelete', { editor: handle, files });
                for (const listener of [...attachmentListeners]) { try { listener({ type: 'deleted', fileSrls: Object.freeze([...wanted].map(Number)) }); } catch (exception) { console.error('[roundeditor] Attachment listener failed.', exception); } }
                return true;
            },
            on: (type, listener) => { attachmentListeners.add(listener); return () => attachmentListeners.delete(listener); },
        };
    }
    if (options.register !== false) handle._publish();
    return handle;
}
