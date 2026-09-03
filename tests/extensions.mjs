import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const config = {
    editorSequence: 41,
    primaryKeyName: 'document_srl',
    contentKeyName: 'content',
    height: 300,
    allowUpload: false,
    allowHtml: false,
    htmlMode: false,
    approvedExtensions: [{ id: 'vendor.contract', required: true, config: { enabled: true } }],
    extensionScripts: [],
};
const config2 = { ...config, editorSequence: 42, approvedExtensions: [{ id: 'vendor.contract', required: true, config: { enabled: false } }] };
const dom = new JSDOM(`<!doctype html><html><body><form>
    <input name="document_srl" value="1"><textarea name="content">&lt;p&gt;Start&lt;/p&gt;</textarea>
    <div class="roundeditor" data-editor-sequence="41" data-editor-config='${JSON.stringify(config)}'>
        <div class="roundeditor__loading">Loading</div><div class="roundeditor__surface"></div>
    </div>
</form><form>
    <input name="document_srl" value="2"><textarea name="content">&lt;p&gt;Second&lt;/p&gt;</textarea>
    <div class="roundeditor" data-editor-sequence="42" data-editor-config='${JSON.stringify(config2)}'>
        <div class="roundeditor__loading">Loading</div><div class="roundeditor__surface"></div>
    </div>
</form></body></html>`, { url: 'https://example.test/write', runScripts: 'outside-only' });

Object.defineProperties(globalThis, {
    window: { value: dom.window, configurable: true }, document: { value: dom.window.document, configurable: true },
    navigator: { value: dom.window.navigator, configurable: true }, Node: { value: dom.window.Node, configurable: true },
    MutationObserver: { value: dom.window.MutationObserver, configurable: true },
    getComputedStyle: { value: dom.window.getComputedStyle, configurable: true }, innerHeight: { value: 800, configurable: true },
    pageYOffset: { value: 0, configurable: true },
    ResizeObserver: { value: class { constructor(callback) { this.callback = callback; } observe() { this.callback([{ contentRect: { width: 900 } }]); } disconnect() {} }, configurable: true },
});
dom.window.Range.prototype.getClientRects = () => [];
dom.window.Range.prototype.getBoundingClientRect = () => ({ top: 0, right: 0, bottom: 0, left: 0, width: 0, height: 0 });
document.elementFromPoint = () => document.querySelector('.ProseMirror');

window.eval(await readFile(new URL('../js/roundeditor-bootstrap.js', import.meta.url), 'utf8'));
assert.equal(window.RoundEditor.extensions.apiVersion, '1.0');
assert.equal(window.RoundEditor.extensions.register({ id: 'Bad ID' }).accepted, false);

let readyCount = 0;
let destroyCount = 0;
let nodeViewDestroyCount = 0;
const pendingTasks = [];
const receivedConfigs = [];
const panelCloseReasons = [];
const panelEventReasons = [];
let panelHandle = null;
const vendorSchema = {
    nodes: {
        vendor_card: {
            fallback: 'raw-block',
            spec: {
                group: 'block', atom: true, selectable: true,
                attrs: { title: { default: '' } },
                parseDOM: [{ tag: 'figure[data-vendor-card]', getAttrs: element => ({ title: element.getAttribute('data-title') || '' }) }],
                toDOM: node => ['figure', { 'data-vendor-card': '', 'data-title': node.attrs.title }],
            },
        },
        vendor_sticker: {
            fallback: 'raw-inline',
            spec: {
                inline: true, group: 'inline', atom: true, selectable: true,
                attrs: { id: { default: '' } },
                parseDOM: [{ tag: 'img[data-vendor-sticker]', priority: 100, getAttrs: element => ({ id: element.getAttribute('data-vendor-sticker') || '' }) }],
                toDOM: node => ['img', { 'data-vendor-sticker': node.attrs.id, alt: '' }],
            },
        },
        vendor_drop: {
            fallback: 'drop',
            spec: {
                group: 'block', atom: true,
                parseDOM: [{ tag: 'div[data-vendor-drop]' }],
                toDOM: () => ['div', { 'data-vendor-drop': '' }],
            },
        },
    },
    marks: {
        vendor_highlight: {
            fallback: 'preserve-content',
            spec: {
                parseDOM: [{ tag: 'mark[data-vendor-highlight]', priority: 100 }],
                toDOM: () => ['mark', { 'data-vendor-highlight': '' }, 0],
            },
        },
        vendor_annotation: {
            fallback: 'drop-mark',
            spec: {
                parseDOM: [{ tag: 'span[data-vendor-annotation]', priority: 100 }],
                toDOM: () => ['span', { 'data-vendor-annotation': '' }, 0],
            },
        },
    },
};
const registration = window.RoundEditor.extensions.register({
    id: 'vendor.contract', version: '1.0.0', apiVersion: '^1.0', priority: 30,
    schema: vendorSchema,
    create(context) {
        receivedConfigs.push(context.config.enabled);
        const { Plugin, PluginKey } = context.pm.state;
        const pluginKey = new PluginKey('vendor.contract.counter');
        return {
            plugins: [new Plugin({ key: pluginKey, state: { init: () => 0, apply: (transaction, value) => transaction.docChanged ? value + 1 : value } })],
            commands: {
                insertCard({ state, dispatch }, params) {
                    const type = state.schema.nodes.vendor_card;
                    if (!type || !params?.title) return false;
                    if (dispatch) dispatch(state.tr.replaceSelectionWith(type.create({ title: params.title })));
                    return true;
                },
                openPanel() {
                    const content = document.createElement('div');
                    content.className = 'vendor-panel';
                    content.addEventListener('roundeditor:close', event => panelEventReasons.push(event.detail.reason));
                    panelHandle = context.ui.openPanel({
                        id: 'picker', title: 'Vendor picker', content,
                        onClose: reason => panelCloseReasons.push(reason),
                    });
                    return true;
                },
            },
            keymap: { 'Mod-Shift-K': 'insertCard' },
            toolbar: [
                { id: 'card', label: 'Card', command: 'insertCard', params: { title: 'Toolbar' }, group: 'insert', icon: { type: 'svg', svg: '<path d="M4 12h16"/>' } },
                { id: 'panel', label: 'Panel', command: 'openPanel', group: 'vendor-after-text', placement: { after: 'text' } },
            ],
            hooks: {
                beforeInsert: [{ transform: request => request.source === 'module:decorate' ? { ...request, html: request.html.replace('Decorated', 'Transformed') } : request }],
                paste: [{
                    priority: 10,
                    handle({ text }) {
                        if (!text.startsWith('https://cards.test/')) return false;
                        return { handled: true, async: {
                            kind: 'card', placeholderHTML: `<p>${text}</p>`, originalHTML: `<p>${text}</p>`, onError: 'restore-original',
                            run(task) { pendingTasks.push(task); },
                        } };
                    },
                }],
                drop: [{
                    handle({ event, anchor, moved }) {
                        if (moved || event.dataTransfer?.getData('text/x-contract') !== 'yes') return false;
                        return { handled: true, run() {
                            context.editor.content.insertHTML('<p>Dropped Extension</p>', { at: anchor, source: 'module:drop-contract' });
                            anchor.release();
                        } };
                    },
                }],
            },
            nodeViews: {
                vendor_card(node) {
                    const element = document.createElement('figure'); element.textContent = node.attrs.title;
                    return { dom: element, update(next) { element.textContent = next.attrs.title; return next.type === node.type; }, destroy() { nodeViewDestroyCount += 1; } };
                },
            },
            ready() { readyCount += 1; },
            destroy() { destroyCount += 1; },
        };
    },
});
assert.equal(registration.accepted, true);
assert.equal(registration.appliesToExistingEditors, false);
assert.equal(window.RoundEditor.extensions.register({ id: 'vendor.contract', version: '1.0.1', apiVersion: '^1.0', create() {} }).error.code, 'E_EXTENSION_CONFLICT');

await import('../dist/roundeditor.min.js');
for (let index = 0; index < 20 && (!window.RoundEditor.get(41) || !window.RoundEditor.get(42)); index += 1) await new Promise(resolve => setTimeout(resolve, 0));
const editor = window.RoundEditor.get(41);
const secondEditor = window.RoundEditor.get(42);
assert.ok(editor);
assert.ok(secondEditor);
assert.deepEqual(receivedConfigs.sort(), [false, true]);
assert.equal(readyCount, 2);
const late = window.RoundEditor.extensions.register({ id: 'vendor.late', version: '1.0.0', apiVersion: '^1.0', create: () => ({}) });
assert.equal(late.accepted, true);
assert.equal(late.appliesToExistingEditors, false);
assert.equal(editor.commands.list().includes('vendor.late.anything'), false);
assert.equal(editor.commands.can('vendor.contract.insertCard'), false);
assert.equal(editor.commands.execute('vendor.contract.insertCard', { title: 'API Card' }), true);
assert.match(editor.content.getHTML(), /data-vendor-card="" data-title="API Card"/);
const coreSchema = await import('../src/schema/index.js');
const activeHTML = editor.content.getHTML();
assert.match(activeHTML, /data-roundeditor-extension="vendor.contract"/);
assert.match(activeHTML, /data-roundeditor-fallback="raw-block"/);
const offlineDocument = coreSchema.parseDocument(activeHTML);
assert.equal(offlineDocument.firstChild.type, coreSchema.schema.nodes.rawBlock);
const fallbackHTML = coreSchema.serializeDocument(offlineDocument, coreSchema.schema);
assert.match(fallbackHTML, /data-vendor-card="" data-title="API Card"/);
assert.match(fallbackHTML, /data-roundeditor-fallback="raw-block"/);
const { createSchemaServices } = await import('../src/schema/services.js');
const activeServices = createSchemaServices([{ extensionId: 'vendor.contract', schema: vendorSchema }]);
assert.equal(activeServices.parseDocument(fallbackHTML).firstChild.type.name, 'vendor_card');

const inlineHTML = activeServices.serializeDocument(activeServices.parseDocument('<p>A<img data-vendor-sticker="7">B</p>'));
assert.match(inlineHTML, /data-roundeditor-fallback="raw-inline"/);
const offlineInline = coreSchema.parseDocument(inlineHTML);
assert.equal(offlineInline.firstChild.child(1).type, coreSchema.schema.nodes.rawInline);
const preservedInlineHTML = coreSchema.serializeDocument(offlineInline, coreSchema.schema);
assert.match(preservedInlineHTML, /data-vendor-sticker="7"/);
assert.equal(activeServices.parseDocument(preservedInlineHTML).firstChild.child(1).type.name, 'vendor_sticker');
const droppedOffline = coreSchema.parseDocument(activeServices.serializeDocument(activeServices.parseDocument('<div data-vendor-drop></div><p>Keep</p>')));
assert.equal(droppedOffline.textContent, 'Keep');
assert.doesNotMatch(coreSchema.serializeDocument(droppedOffline, coreSchema.schema), /data-vendor-drop/);
const markedHTML = activeServices.serializeDocument(activeServices.parseDocument('<p><mark data-vendor-highlight>Keep</mark> <span data-vendor-annotation>Both</span></p>'));
assert.match(markedHTML, /data-roundeditor-fallback="preserve-content"/);
assert.match(markedHTML, /data-roundeditor-fallback="drop-mark"/);
const unmarkedOffline = coreSchema.serializeDocument(coreSchema.parseDocument(markedHTML), coreSchema.schema);
assert.equal(unmarkedOffline, '<p>Keep Both</p>');
assert.equal(document.querySelector('[data-extension-toolbar-id="vendor.contract:card"]').getAttribute('aria-label'), 'Card');
assert.match(document.querySelector('[data-extension-toolbar-id="vendor.contract:card"] svg').innerHTML, /path/);
const defaultGroup = document.querySelector('[data-group="insert"]');
const componentsGroup = document.querySelector('[data-group="components"]');
const spacer = document.querySelector('.roundeditor__toolbar-spacer');
assert.equal(defaultGroup.nextElementSibling, componentsGroup || spacer);
const textGroup = document.querySelector('[data-group="text"]');
assert.equal(textGroup.nextElementSibling.dataset.group, 'vendor-after-text');
document.querySelector('[data-extension-toolbar-id="vendor.contract:card"]').click();
assert.match(editor.content.getHTML(), /data-title="Toolbar"/);

assert.equal(editor.commands.execute('vendor.contract.openPanel'), true);
assert.equal(panelHandle.open, true);
document.querySelector('.roundeditor__panel-heading [data-command="close"]').click();
assert.equal(panelHandle.open, false);
assert.deepEqual(panelCloseReasons, ['button']);
assert.deepEqual(panelEventReasons, ['button']);
assert.equal(panelHandle.close(), false);

editor.content.setHTML('<p>Decorated</p>', { source: 'module:decorate' });
assert.equal(editor.content.getHTML(), '<p>Decorated</p>');
editor.content.clear({ history: 'skip' });
editor.content.insertHTML('<p>Decorated</p>', { source: 'module:decorate' });
assert.equal(editor.content.getHTML(), '<p>Transformed</p>');

const paste = new dom.window.Event('paste', { bubbles: true, cancelable: true });
Object.defineProperty(paste, 'clipboardData', { value: { getData: type => type === 'text/plain' ? 'https://cards.test/one' : '', files: [] } });
document.querySelector('.ProseMirror').dispatchEvent(paste);
await Promise.resolve();
assert.equal(paste.defaultPrevented, true);
assert.equal(pendingTasks.length, 1);
assert.equal(pendingTasks[0].alive, true);
pendingTasks[0].replaceHTML('<p>Resolved Card</p>');
assert.match(editor.content.getHTML(), /Resolved Card/);

const drop = new dom.window.Event('drop', { bubbles: true, cancelable: true });
Object.defineProperties(drop, {
    clientX: { value: 0 }, clientY: { value: 0 },
    dataTransfer: { value: { files: [], getData: type => type === 'text/x-contract' ? 'yes' : '' } },
});
document.querySelectorAll('.ProseMirror')[0].dispatchEvent(drop);
await Promise.resolve();
assert.equal(drop.defaultPrevented, true);
assert.match(editor.content.getHTML(), /Dropped Extension/);

const secondPaste = new dom.window.Event('paste', { bubbles: true, cancelable: true });
Object.defineProperty(secondPaste, 'clipboardData', { value: { getData: type => type === 'text/plain' ? 'https://cards.test/two' : '', files: [] } });
document.querySelector('.ProseMirror').dispatchEvent(secondPaste);
await Promise.resolve();
assert.equal(pendingTasks[1].alive, true);
editor.content.setHTML('<p>Removed placeholder</p>');
assert.equal(pendingTasks[1].alive, false);
assert.equal(pendingTasks[1].signal.aborted, true);

editor.commands.execute('vendor.contract.insertCard', { title: 'Destroy view' });
editor.commands.execute('vendor.contract.openPanel');
assert.equal(panelHandle.open, true);
editor._destroy();
assert.equal(panelHandle.open, false);
assert.deepEqual(panelCloseReasons, ['button', 'editor-destroyed']);
assert.deepEqual(panelEventReasons, ['button', 'editor-destroyed']);
assert.equal(destroyCount, 1);
assert.equal(window.RoundEditor.get(41), null);
assert.equal(window.RoundEditor.get(42), secondEditor);
assert.equal(secondEditor.content.getHTML(), '<p>Second</p>');
assert.ok(nodeViewDestroyCount >= 1);
secondEditor._destroy();
assert.equal(destroyCount, 2);

console.log('RoundEditor Extension API contract passed.');
