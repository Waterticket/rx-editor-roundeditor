import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { EditorState, NodeSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';

const dom = new JSDOM('<!doctype html><html><body><div id="editor"></div></body></html>', {
    url: 'https://example.test/write',
});
Object.defineProperties(globalThis, {
    window: { value: dom.window, configurable: true },
    document: { value: dom.window.document, configurable: true },
    Node: { value: dom.window.Node, configurable: true },
    navigator: { value: dom.window.navigator, configurable: true },
});

const { handleOembedPaste, oembedPlaceholderPlugin, pickPastedUrl } = await import('../src/oembed.js');
const { mediaSelectionPlugin } = await import('../src/mediaSelection.js');
const { parseDocument, schema, serializeDocument } = await import('../src/schema/index.js');

const compiledCss = readFileSync(new URL('../dist/roundeditor.css', import.meta.url), 'utf8');
assert.match(compiledCss, /\.roundeditor__surface \.roundeditor__oembed\{[^}]*white-space:normal/);

assert.equal(pickPastedUrl({ getData: () => ' https://youtu.be/test\n' }), 'https://youtu.be/test');
assert.equal(pickPastedUrl({ getData: () => 'watch https://youtu.be/test' }), null);

function createBridge(oembedAvailable) {
    const bridge = {
        sequence: 7,
        config: { oembedAvailable, csrfToken: 'token', mid: 'board', uploadTargetSrl: 0 },
        primaryInput: { value: '' },
        rebindControls() {},
    };
    bridge.view = new EditorView(document.querySelector('#editor'), {
        state: EditorState.create({
            doc: parseDocument('<p></p>'),
            plugins: oembedAvailable ? [oembedPlaceholderPlugin()] : [],
        }),
    });
    return bridge;
}

function pasteEvent(text) {
    let prevented = false;
    return {
        clipboardData: { getData: type => (type === 'text/plain' ? text : '') },
        preventDefault() { prevented = true; },
        get prevented() { return prevented; },
    };
}

let fetchCalls = 0;
window.fetch = async () => {
    fetchCalls++;
    return { ok: true, json: async () => ({ kind: 'fail' }) };
};
const disabled = createBridge(false);
const disabledEvent = pasteEvent('https://example.com/disabled');
assert.equal(handleOembedPaste(disabled, disabledEvent), false);
assert.equal(disabledEvent.prevented, false);
assert.equal(fetchCalls, 0);
disabled.view.destroy();

window.fetch = async (url, options) => {
    fetchCalls++;
    assert.match(url, /procOembedFetch/);
    assert.match(options.body, /editor_sequence=7/);
    assert.equal(options.headers['X-CSRF-Token'], 'token');
    return {
        ok: true,
        json: async () => ({
            kind: 'embed',
            upload_target_srl: 123,
            file_srl: 456,
            wrapped_html: '<div editor_component="oembed" data-url="https://youtu.be/test" data-oembed-provider="Youtube"><div class="media_embed_wrapper"><iframe class="youtube-player" src="https://www.youtube.com/embed/test" allowfullscreen></iframe></div></div>',
        }),
    };
};
window.sessionStorage.setItem('oembed:failed_hosts', JSON.stringify({
    'youtu.be': Date.now() - 11_000,
}));
const enabled = createBridge(true);
let attachmentRefreshes = 0;
enabled.attachments = { refresh: () => { attachmentRefreshes++; } };
const enabledEvent = pasteEvent('https://youtu.be/test');
assert.equal(handleOembedPaste(enabled, enabledEvent), true);
assert.equal(enabledEvent.prevented, true);
assert.match(serializeDocument(enabled.view.state.doc, schema), /href="https:\/\/youtu\.be\/test"/);
await new Promise(resolve => setTimeout(resolve, 0));
const saved = serializeDocument(enabled.view.state.doc, schema);
assert.match(saved, /editor_component="oembed"/);
assert.match(saved, /class="media_embed_wrapper"/);
assert.match(saved, /class="youtube-player"/);
assert.match(saved, /<iframe[^>]+allowfullscreen=""/);
assert.equal(enabled.primaryInput.value, '123');
assert.equal(enabled.config.uploadTargetSrl, 123);
assert.equal(attachmentRefreshes, 1);
enabled.view.destroy();

const roundTripped = serializeDocument(parseDocument(saved), schema);
assert.equal(roundTripped, saved);

let activeRequests = 0;
let maximumActiveRequests = 0;
window.sessionStorage.clear();
window.fetch = async (requestUrl, options) => {
    activeRequests++;
    maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests);
    await new Promise(resolve => setTimeout(resolve, 10));
    activeRequests--;
    const pastedUrl = new URLSearchParams(options.body).get('url');
    return {
        ok: true,
        json: async () => ({
            kind: 'card',
            wrapped_html: `<div editor_component="oembed" data-oembed-type="card" data-url="${pastedUrl}" contenteditable="false"><figure><figcaption><h3><a href="${pastedUrl}">${pastedUrl}</a></h3></figcaption></figure></div>`,
        }),
    };
};
const sequential = createBridge(true);
handleOembedPaste(sequential, pasteEvent('https://www.pixiv.net/artworks/1'));
handleOembedPaste(sequential, pasteEvent('https://www.pixiv.net/artworks/2'));
await new Promise(resolve => setTimeout(resolve, 2_100));
const sequentialHtml = serializeDocument(sequential.view.state.doc, schema);
assert.equal(maximumActiveRequests, 1);
assert.match(sequentialHtml, /data-url="https:\/\/www\.pixiv\.net\/artworks\/1"/);
assert.match(sequentialHtml, /data-url="https:\/\/www\.pixiv\.net\/artworks\/2"/);
sequential.view.destroy();

const unsafe = parseDocument('<div editor_component="oembed" data-oembed-type="card" contenteditable="false"><figure class="card"><img src="/safe.jpg" onerror="alert(1)"><script>bad()</script><a href="javascript:bad()">card</a></figure></div>');
const unsafeBridge = { config: { components: {}, labels: {} } };
const { rawNodeViews } = await import('../src/nodeviews/RawView.js');
const unsafeView = rawNodeViews(unsafeBridge).rhymixComponentBlock(unsafe.firstChild);
assert.equal(unsafeView.dom.classList.contains('roundeditor__oembed'), true);
assert.equal(unsafeView.dom.querySelector('script'), null);
assert.equal(unsafeView.dom.querySelector('img').hasAttribute('onerror'), false);
assert.equal(unsafeView.dom.querySelector('a').hasAttribute('href'), false);
assert.ok(unsafeView.dom.querySelector('.roundeditor__raw-drag-handle'));
assert.match(serializeDocument(unsafe, schema), /<script>bad\(\)<\/script>/);
unsafeView.destroy();

const oembedDragHost = document.createElement('div');
oembedDragHost.className = 'roundeditor__surface';
document.body.appendChild(oembedDragHost);
const movableOembed = '<div editor_component="oembed" data-oembed-type="multimedia" data-oembed-provider="Youtube" data-url="https://youtu.be/move" contenteditable="false"><iframe src="https://www.youtube.com/embed/move"></iframe></div>';
const oembedDragView = new EditorView(oembedDragHost, {
    state: EditorState.create({
        doc: parseDocument(`<p>Before</p>${movableOembed}<p>After</p>`),
        plugins: [mediaSelectionPlugin()],
    }),
    nodeViews: rawNodeViews(unsafeBridge),
});
const oembedDragHandle = oembedDragHost.querySelector('.roundeditor__oembed .roundeditor__raw-drag-handle');
const oembedDragTarget = oembedDragHost.querySelector('p');
assert.ok(oembedDragHandle);
oembedDragHost.getBoundingClientRect = () => ({ top: 0, left: 0 });
oembedDragView.dom.getBoundingClientRect = () => ({ left: 20, width: 500 });
oembedDragTarget.getBoundingClientRect = () => ({ top: 0, height: 20 });
oembedDragHandle.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true, button: 0 }));
assert.equal(oembedDragView.state.selection instanceof NodeSelection, true);
oembedDragTarget.dispatchEvent(new window.MouseEvent('mousemove', { bubbles: true, clientY: 1 }));
const oembedDropLine = oembedDragHost.querySelector('.roundeditor__media-drop-line');
assert.equal(oembedDropLine.hidden, false);
assert.equal(oembedDropLine.style.top, '0px');
oembedDragTarget.dispatchEvent(new window.MouseEvent('mouseup', { bubbles: true, clientY: 1 }));
assert.equal(oembedDropLine.hidden, true);
assert.equal(oembedDragView.state.doc.firstChild.type, schema.nodes.rhymixComponentBlock);
assert.equal(oembedDragView.state.selection.from, 0);
assert.match(serializeDocument(oembedDragView.state.doc, schema), /data-url="https:\/\/youtu\.be\/move"/);
const movedOembed = oembedDragHost.querySelector('.roundeditor__oembed');
movedOembed.getBoundingClientRect = () => ({ top: 50 });
movedOembed.dispatchEvent(new window.MouseEvent('mousemove', { bubbles: true }));
const oembedLeadingEdge = oembedDragHost.querySelector('.roundeditor__global-media-edge');
assert.equal(oembedLeadingEdge.hidden, false);
assert.equal(oembedLeadingEdge.style.top, '32px');
oembedLeadingEdge.click();
assert.equal(oembedDragView.state.doc.child(0).type, schema.nodes.paragraph);
assert.equal(oembedDragView.state.doc.child(1).type, schema.nodes.paragraph);
assert.equal(oembedDragView.state.doc.child(2).type, schema.nodes.rhymixComponentBlock);
assert.equal(oembedLeadingEdge.hidden, true);
oembedDragView.destroy();
oembedDragHost.remove();

const previewMedia = parseDocument('<div class="media_embed_wrapper" contenteditable="false"><div class="media_embed" style="padding-bottom:56.25%"><img src="https://i.ytimg.com/vi/test/maxresdefault.jpg"><iframe src="https://www.youtube.com/embed/test" onload="bad()" srcdoc="bad" allowfullscreen></iframe><script>bad()</script></div></div>');
const previewMediaView = rawNodeViews(unsafeBridge).rawBlock(previewMedia.firstChild);
assert.equal(previewMediaView.stopEvent(), false);
assert.equal(previewMediaView.dom.querySelector('iframe').getAttribute('src'), 'https://www.youtube.com/embed/test');
assert.equal(previewMediaView.dom.querySelector('iframe').hasAttribute('onload'), false);
assert.equal(previewMediaView.dom.querySelector('iframe').hasAttribute('srcdoc'), false);
assert.equal(previewMediaView.dom.querySelector('script'), null);
assert.equal(previewMediaView.dom.querySelector('.roundeditor__raw-preview--media') !== null, true);
assert.ok(previewMediaView.dom.querySelector('.roundeditor__raw-drag-handle'));
previewMediaView.destroy();

const dragHost = document.createElement('div');
dragHost.className = 'roundeditor__surface';
document.body.appendChild(dragHost);
const dragView = new EditorView(dragHost, {
    state: EditorState.create({
        doc: parseDocument(`<p>Before</p>${previewMedia.firstChild.attrs.html}<p>After</p>`),
        plugins: [mediaSelectionPlugin()],
    }),
    nodeViews: rawNodeViews(unsafeBridge),
});
const dragHandle = dragHost.querySelector('.roundeditor__raw-drag-handle');
const dragTarget = dragHost.querySelector('p');
dragHost.getBoundingClientRect = () => ({ top: 0, left: 0 });
dragView.dom.getBoundingClientRect = () => ({ left: 20, width: 500 });
dragTarget.getBoundingClientRect = () => ({ top: 0, height: 20 });
dragHandle.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true, button: 0 }));
dragTarget.dispatchEvent(new window.MouseEvent('mousemove', { bubbles: true, clientY: 1 }));
const previewDropLine = dragHost.querySelector('.roundeditor__media-drop-line');
assert.equal(previewDropLine.hidden, false);
assert.equal(previewDropLine.style.top, '0px');
dragTarget.dispatchEvent(new window.MouseEvent('mouseup', { bubbles: true, clientY: 1 }));
assert.equal(previewDropLine.hidden, true);
assert.equal(dragView.state.doc.firstChild.type, schema.nodes.rawBlock);
assert.equal(dragView.state.selection.from, 0);
const movedPreview = dragHost.querySelector('.roundeditor__raw--embed');
movedPreview.getBoundingClientRect = () => ({ top: 50 });
movedPreview.dispatchEvent(new window.MouseEvent('mousemove', { bubbles: true }));
const previewLeadingEdge = dragHost.querySelector('.roundeditor__global-media-edge');
assert.equal(previewLeadingEdge.hidden, false);
previewLeadingEdge.click();
assert.equal(dragView.state.doc.child(0).type, schema.nodes.paragraph);
assert.equal(dragView.state.doc.child(1).type, schema.nodes.paragraph);
assert.equal(dragView.state.doc.child(2).type, schema.nodes.rawBlock);
assert.equal(previewLeadingEdge.hidden, true);
dragView.destroy();
dragHost.remove();

const ordinaryRaw = parseDocument('<section><p>External preview</p><iframe src="https://example.test/embed"></iframe></section>');
const ordinaryRawView = rawNodeViews(unsafeBridge).rawBlock(ordinaryRaw.firstChild);
assert.equal(ordinaryRawView.stopEvent(), false);
assert.equal(ordinaryRawView.dom.querySelector('iframe'), null);
ordinaryRawView.destroy();

const sdkAssets = [
    {
        selector: '.twitter-tweet',
        script: 'https://platform.twitter.com/widgets.js',
        normalize: [],
    },
    {
        selector: '.instagram-media',
        script: 'https://www.instagram.com/embed.js',
        normalize: [
            { detect: 'blockquote[data-instgrm-permalink]:not(.instagram-media)', addClass: 'instagram-media' },
        ],
    },
];
const xNode = parseDocument('<div editor_component="oembed" data-oembed-type="social" data-oembed-provider="X" data-url="https://x.com/user/status/1" contenteditable="false"><blockquote class="twitter-tweet" data-oembed-tweet-id="1"><a href="https://twitter.com/user/status/1">View on X</a></blockquote></div>').firstChild;
const xView = rawNodeViews({ config: { oembedAvailable: true, oembedAssets: sdkAssets, components: {}, labels: {} } }).rhymixComponentBlock(xNode);
await new Promise(resolve => setTimeout(resolve, 0));
const xScript = document.querySelector('script[src="https://platform.twitter.com/widgets.js"]');
assert.ok(xScript);
xScript.dispatchEvent(new window.Event('load'));
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(xScript.dataset.roundeditorLoaded, 'true');

const secondXView = rawNodeViews({ config: { oembedAvailable: true, oembedAssets: sdkAssets, components: {}, labels: {} } }).rhymixComponentBlock(xNode);
await new Promise(resolve => setTimeout(resolve, 0));
const xScripts = document.querySelectorAll('script[src="https://platform.twitter.com/widgets.js"]');
assert.equal(xScripts.length, 2);
xScripts[1].dispatchEvent(new window.Event('load'));
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(document.querySelectorAll('script[src="https://platform.twitter.com/widgets.js"]').length, 1);
secondXView.destroy();
xView.destroy();

const instagramNode = parseDocument('<div editor_component="oembed" data-oembed-type="social" data-oembed-provider="Instagram" contenteditable="false"><blockquote data-instgrm-permalink="https://www.instagram.com/p/example/"></blockquote></div>').firstChild;
const instagramView = rawNodeViews({ config: { oembedAvailable: true, oembedAssets: sdkAssets, components: {}, labels: {} } }).rhymixComponentBlock(instagramNode);
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(instagramView.dom.querySelector('blockquote').classList.contains('instagram-media'), true);
const instagramScript = document.querySelector('script[src="https://www.instagram.com/embed.js"]');
assert.ok(instagramScript);
instagramScript.dispatchEvent(new window.Event('load'));
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(instagramScript.dataset.roundeditorLoaded, 'true');
let instagramProcesses = 0;
window.instgrm = { Embeds: { process: () => { instagramProcesses++; } } };
const secondInstagramView = rawNodeViews({ config: { oembedAvailable: true, oembedAssets: sdkAssets, components: {}, labels: {} } }).rhymixComponentBlock(instagramNode);
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(instagramProcesses, 1);
assert.equal(document.querySelectorAll('script[src="https://www.instagram.com/embed.js"]').length, 1);
secondInstagramView.destroy();
instagramView.destroy();

console.log('roundeditor oEmbed integration contract passed');
