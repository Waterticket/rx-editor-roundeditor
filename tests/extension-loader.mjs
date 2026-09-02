import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const bootstrapSource = readFileSync(new URL('../js/roundeditor-bootstrap.js', import.meta.url), 'utf8');
const localLoaderSource = readFileSync(new URL('../js/local-loader.js', import.meta.url), 'utf8');
const descriptor = {
    id: 'vendor.loader', script: '/modules/vendor/roundeditor.js', mode: 'extension',
    format: 'classic', required: true, priority: 40,
};
const config = sequence => ({
    editorSequence: sequence,
    extensionScripts: [descriptor],
    approvedExtensions: [{ id: descriptor.id, required: true, config: { sequence } }],
});
const dom = new JSDOM(`<!doctype html><html><head></head><body>
    <div class="roundeditor" data-editor-sequence="1" data-editor-config='${JSON.stringify(config(1))}'></div>
    <div class="roundeditor" data-editor-sequence="2" data-editor-config='${JSON.stringify(config(2))}'></div>
</body></html>`, { url: 'https://example.test/', runScripts: 'outside-only' });
const { window } = dom;
window.eval(bootstrapSource);

let entrypointLoads = 0;
const append = window.document.head.appendChild.bind(window.document.head);
window.document.head.appendChild = node => {
    const result = append(node);
    if (node.dataset?.roundeditorExtension) {
        entrypointLoads += 1;
        window.RoundEditor.extensions.register({
            id: 'vendor.loader', version: '1.0.0', apiVersion: '^1.0', create: () => ({}),
        });
        window.queueMicrotask(() => node.dispatchEvent(new window.Event('load')));
    }
    return result;
};
await window.RoundEditor._extensionHost.prepareFromDocument();
assert.equal(entrypointLoads, 1);
assert.equal(window.RoundEditor.extensions.has('vendor.loader'), true);
assert.equal(window.RoundEditor._extensionHost.getConfig(1).approvedExtensions[0].config.sequence, 1);
assert.equal(window.RoundEditor._extensionHost.getConfig(2).approvedExtensions[0].config.sequence, 2);

const loaderDom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'https://example.test/modules/editor/skins/roundeditor/', runScripts: 'outside-only',
});
let releaseBarrier;
const barrier = new Promise(resolve => { releaseBarrier = resolve; });
loaderDom.window.RoundEditor = { _extensionHost: { prepareFromDocument: () => barrier } };
const loader = loaderDom.window.document.createElement('script');
loader.src = 'https://example.test/modules/editor/skins/roundeditor/js/local-loader.js';
loaderDom.window.document.body.appendChild(loader);
Object.defineProperty(loaderDom.window.document, 'currentScript', { configurable: true, value: loader });
loaderDom.window.eval(localLoaderSource);
loaderDom.window.document.dispatchEvent(new loaderDom.window.Event('DOMContentLoaded'));
await Promise.resolve();
assert.equal(loaderDom.window.document.getElementById('RoundEditorModule'), null);
releaseBarrier();
await Promise.resolve(); await Promise.resolve();
const module = loaderDom.window.document.getElementById('RoundEditorModule');
assert.equal(module.type, 'module');
assert.equal(module.src, 'https://example.test/modules/editor/skins/roundeditor/dist/roundeditor.min.js');

console.log('RoundEditor extension loader barrier passed.');
