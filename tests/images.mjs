import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><div id="editor" class="roundeditor__surface"></div><div id="placeholder" class="roundeditor__surface"></div></body></html>', { url: 'https://example.test/write' });
Object.defineProperties(globalThis, {
    window: { value: dom.window, configurable: true },
    document: { value: dom.window.document, configurable: true },
    navigator: { value: dom.window.navigator, configurable: true },
    Node: { value: dom.window.Node, configurable: true },
    MutationObserver: { value: dom.window.MutationObserver, configurable: true },
    getComputedStyle: { value: dom.window.getComputedStyle, configurable: true },
    innerHeight: { value: 800, configurable: true },
    pageYOffset: { value: 0, configurable: true },
    FormData: { value: dom.window.FormData, configurable: true },
    XMLHttpRequest: { value: dom.window.XMLHttpRequest, configurable: true, writable: true },
});

const { EditorState, NodeSelection, TextSelection } = await import('prosemirror-state');
const { EditorView } = await import('prosemirror-view');
const { imageAttrsFromUpload, insertUploadedImages } = await import('../src/images.js');
const { ImageView } = await import('../src/nodeviews/ImageView.js');
const { parseDocument, schema, serializeDocument } = await import('../src/schema/index.js');
const { normalizeRhymixAssetUrl, normalizeRhymixUrl, normalizeRhymixVideoUrl, uploadFile } = await import('../src/rhymix/upload.js');
const {
    addUploadPlaceholder,
    findUploadPlaceholder,
    updateUploadPlaceholder,
    uploadPlaceholderPlugin,
} = await import('../src/uploadPlaceholders.js');

assert.deepEqual(imageAttrsFromUpload({
    download_url: '/image.jpg', file_srl: 77, source_filename: '사진.jpg', dimensions: { width: 1200, height: 600 },
}, 600), {
    src: '/image.jpg', alt: '사진.jpg', width: null, height: null,
    displayWidth: null, displayHeight: null, fileSrl: '77', editorComponent: 'image_link',
});
assert.equal(normalizeRhymixUrl('/download?a=1&amp;b=2'), '/download?a=1&b=2');
assert.equal(normalizeRhymixUrl('index.php?module=file&amp;act=procFileDownload'), '/index.php?module=file&act=procFileDownload');
assert.equal(normalizeRhymixUrl('./index.php?module=file'), '/index.php?module=file');
assert.equal(normalizeRhymixVideoUrl('index.php?module=file&amp;act=procFileDownload&amp;file_srl=30100'), '/index.php?module=file&act=procFileDownload&file_srl=30100&force_inline=Y');
assert.equal(normalizeRhymixVideoUrl('/files/attach/video.mp4'), '/files/attach/video.mp4');
window.default_url = 'https://example.test/subdir/';
assert.equal(normalizeRhymixAssetUrl('./files/poster.jpg'), '/subdir/files/poster.jpg');

const compiledCss = readFileSync(new URL('../dist/roundeditor.css', import.meta.url), 'utf8');
assert.match(compiledCss, /@media \(max-width:720px\)\{\.roundeditor__media--image>img\{height:auto!important\}/);

const initial = parseDocument('<p><img src="/old.jpg" alt="기존" width="320" height="180" style="width:320px;height:180px;" data-file-srl="41" editor_component="image_link" /></p>');
assert.equal(initial.firstChild.firstChild.type.name, 'image');
const bridge = { config: { labels: {} }, view: null };
let imageView;
bridge.view = new EditorView(document.querySelector('#editor'), {
    state: EditorState.create({ doc: initial }),
    nodeViews: { image: (node, view, getPos) => (imageView = new ImageView(node, view, getPos, bridge)) },
});
bridge.view.dispatch(bridge.view.state.tr.setSelection(NodeSelection.create(bridge.view.state.doc, 1)));
assert.equal(imageView.dom.classList.contains('roundeditor__media--selected'), true);
assert.equal(imageView.toolbar.element.hidden, false);
assert.equal(imageView.handles.length, 4);
assert.equal(imageView.toolbar.element.classList.contains('roundeditor__media-toolbar--below'), true);
assert.equal(
    imageView.toolbar.row.querySelector('[data-media-action="size"] .roundeditor__icon path').getAttribute('d'),
    'M6 6l12 12M6 11V6h5M18 13v5h-5'
);
assert.ok(imageView.toolbar.row.querySelector('[data-media-action="left"] .roundeditor__align-icon--left'));
assert.ok(imageView.toolbar.row.querySelector('[data-media-action="center"] .roundeditor__align-icon--center'));
assert.ok(imageView.toolbar.row.querySelector('[data-media-action="right"] .roundeditor__align-icon--right'));

imageView.media.getBoundingClientRect = () => ({ width: 320, height: 180 });
imageView.handles[3].dispatchEvent(new dom.window.MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 320 }));
window.dispatchEvent(new dom.window.MouseEvent('pointermove', { bubbles: true, clientX: 160 }));
assert.equal(imageView.media.style.width, '160px');
window.dispatchEvent(new dom.window.MouseEvent('pointerup', { bubbles: true, clientX: 160 }));
assert.match(serializeDocument(bridge.view.state.doc, schema), /width="160" height="90"/);

imageView.media.getBoundingClientRect = () => ({ width: 160, height: 90 });
imageView.handles[3].dispatchEvent(new dom.window.MouseEvent('pointerdown', {
    bubbles: true, button: 0, clientX: 160, clientY: 90,
}));
window.dispatchEvent(new dom.window.MouseEvent('pointermove', {
    bubbles: true, clientX: 200, clientY: 140, altKey: true,
}));
window.dispatchEvent(new dom.window.MouseEvent('pointerup', {
    bubbles: true, clientX: 200, clientY: 140, altKey: true,
}));
assert.match(serializeDocument(bridge.view.state.doc, schema), /width="200" height="140"/);

imageView.updateSize(240, 135);
assert.equal(bridge.view.state.selection instanceof NodeSelection, true);
assert.match(serializeDocument(bridge.view.state.doc, schema), /width="240" height="135" style="width:240px;height:135px;"/);
imageView.setAlt('새 대체 텍스트');
assert.match(serializeDocument(bridge.view.state.doc, schema), /alt="새 대체 텍스트"/);
imageView.setLink('https://example.test/image');
assert.match(serializeDocument(bridge.view.state.doc, schema), /<a href="https:\/\/example.test\/image" target="_blank" rel="noreferrer noopener"><img/);
imageView.setAlign('center');
assert.match(serializeDocument(bridge.view.state.doc, schema), /^<p style="text-align:center;">/);
imageView.setAlign('right');
assert.match(serializeDocument(bridge.view.state.doc, schema), /^<p style="text-align:right;">/);
imageView.toolbar.openForm('size');
assert.equal(imageView.toolbar.formHost.querySelector('button[type="button"]').textContent, 'Remove explicit size');
imageView.toolbar.formHost.querySelector('button[type="button"]').click();
assert.doesNotMatch(serializeDocument(bridge.view.state.doc, schema), /(?:width|height)="/);
assert.doesNotMatch(serializeDocument(bridge.view.state.doc, schema), /style="[^"]*(?:width|height):/);

window.request_uri = '/index.php';
let sentData;
class FakeXHR {
    constructor() {
        this.listeners = {};
        this.upload = { addEventListener() {} };
        this.status = 200;
        this.response = { error: 0, file_srl: 88, download_url: '/file?a=1&amp;b=2', source_filename: '업로드.png', thumbnail_filename: './files/poster.jpg' };
    }
    open(method, url) { this.method = method; this.url = url; }
    addEventListener(name, listener) { this.listeners[name] = listener; }
    send(data) {
        sentData = data;
        queueMicrotask(() => this.listeners.load());
    }
}
globalThis.XMLHttpRequest = FakeXHR;
const file = new dom.window.File(['png'], '업로드.png', { type: 'image/png' });
const response = await uploadFile({ sequence: 7, config: { mid: 'board', moduleSrl: 10, uploadTargetSrl: 20, csrfToken: 'token' } }, file);
assert.equal(response.download_url, '/file?a=1&b=2');
assert.equal(response.thumbnail_filename, '/subdir/files/poster.jpg');
assert.equal(sentData.get('act'), 'procFileUpload');
assert.equal(sentData.get('editor_sequence'), '7');
assert.equal(sentData.get('mid'), 'board');
assert.equal(sentData.get('module_srl'), '10');
assert.equal(sentData.get('upload_target_srl'), '20');
assert.equal(sentData.get('_rx_csrf_token'), 'token');
assert.equal(sentData.get('Filedata').name, '업로드.png');

bridge.view.destroy();

const placeholderBridge = { view: null };
placeholderBridge.view = new EditorView(document.querySelector('#placeholder'), {
    state: EditorState.create({ doc: parseDocument('<p></p>'), plugins: [uploadPlaceholderPlugin()] }),
});
const placeholderId = addUploadPlaceholder(placeholderBridge.view, 'image', '이미지 첨부중...');
assert.match(document.querySelector('#placeholder').textContent, /이미지 첨부중/);
assert.match(document.querySelector('#placeholder').textContent, /0%/);
updateUploadPlaceholder(placeholderBridge.view, placeholderId, 0.427);
assert.match(document.querySelector('#placeholder').textContent, /43%/);
assert.equal(document.querySelector('#placeholder .roundeditor__upload-placeholder').style.getPropertyValue('--roundeditor-upload-progress'), '43%');
updateUploadPlaceholder(placeholderBridge.view, placeholderId, 0.99, '이미지 처리중...');
assert.match(document.querySelector('#placeholder').textContent, /이미지 처리중/);
assert.equal(findUploadPlaceholder(placeholderBridge.view.state, placeholderId), 1);
assert.equal(serializeDocument(placeholderBridge.view.state.doc, schema), '<p>\u00a0</p>');
insertUploadedImages(placeholderBridge, [{
    download_url: '/placeholder.png', source_filename: 'placeholder.png', dimensions: { width: 100, height: 50 },
}], { placeholderId });
assert.equal(document.querySelector('#placeholder .roundeditor__upload-placeholder'), null);
const placeholderSerialized = serializeDocument(placeholderBridge.view.state.doc, schema);
assert.match(placeholderSerialized, /src="\/placeholder.png"/);
assert.match(placeholderSerialized, /<\/p><p>\u00a0<\/p><p>\u00a0<\/p>$/);
assert.equal(placeholderBridge.view.state.doc.childCount, 3);
assert.equal(placeholderBridge.view.state.selection instanceof TextSelection, true);
assert.equal(placeholderBridge.view.state.selection.$from.parent.type, schema.nodes.paragraph);
assert.equal(placeholderBridge.view.state.selection.$from.parentOffset, 0);
placeholderBridge.view.destroy();

document.querySelector('#editor').replaceChildren();
bridge.view = new EditorView(document.querySelector('#editor'), { state: EditorState.create({ doc: parseDocument('<p></p>') }) });
insertUploadedImages(bridge, [{
    download_url: '/new.png', file_srl: 99, source_filename: 'new.png', dimensions: { width: 640, height: 320 },
}], { align: 'right' });
const inserted = serializeDocument(bridge.view.state.doc, schema);
assert.match(inserted, /^<p style="text-align:right;">/);
assert.match(inserted, /<img src="\/new.png" alt="new.png" data-file-srl="99" editor_component="image_link" \/>/);
assert.doesNotMatch(inserted, /(?:width|height)="|style="[^"]*(?:width|height):/);
bridge.view.destroy();

document.querySelector('#editor').replaceChildren();
bridge.view = new EditorView(document.querySelector('#editor'), { state: EditorState.create({ doc: parseDocument('<p></p>') }) });
insertUploadedImages(bridge, [
    { download_url: '/first.png', file_srl: 101, source_filename: 'first.png' },
    { download_url: '/second.png', file_srl: 102, source_filename: 'second.png' },
]);
const multipleInserted = serializeDocument(bridge.view.state.doc, schema);
assert.match(multipleInserted, /^<p><img [^>]*src="\/first\.png"[^>]* \/><\/p><p><img [^>]*src="\/second\.png"[^>]* \/><\/p>/);
bridge.view.destroy();

document.querySelector('#editor').replaceChildren();
bridge.view = new EditorView(document.querySelector('#editor'), {
    state: EditorState.create({ doc: parseDocument('<p></p>'), plugins: [uploadPlaceholderPlugin()] }),
});
const firstBatchPlaceholder = addUploadPlaceholder(bridge.view, 'image', '첫 번째');
const secondBatchPlaceholder = addUploadPlaceholder(bridge.view, 'image', '두 번째');
insertUploadedImages(bridge, [
    { download_url: '/batch-first.png', file_srl: 103, source_filename: 'batch-first.png' },
], { placeholderId: firstBatchPlaceholder });
insertUploadedImages(bridge, [
    { download_url: '/batch-second.png', file_srl: 104, source_filename: 'batch-second.png' },
], { placeholderId: secondBatchPlaceholder });
const sequentialBatchInserted = serializeDocument(bridge.view.state.doc, schema);
assert.match(sequentialBatchInserted, /<p><img [^>]*src="\/batch-first\.png"[^>]* \/><\/p>/);
assert.match(sequentialBatchInserted, /<p><img [^>]*src="\/batch-second\.png"[^>]* \/><\/p>/);
bridge.view.destroy();

document.querySelector('#editor').replaceChildren();
bridge.view = new EditorView(document.querySelector('#editor'), {
    state: EditorState.create({ doc: parseDocument('<p>AB</p>') }),
});
bridge.view.dispatch(bridge.view.state.tr.setSelection(TextSelection.create(bridge.view.state.doc, 2)));
insertUploadedImages(bridge, [{
    download_url: '/inline.png', source_filename: 'inline.png', dimensions: { width: 100, height: 50 },
}], { insertionMode: 'inline' });
assert.match(serializeDocument(bridge.view.state.doc, schema), /^<p>A<img [^>]*src="\/inline.png"[^>]* \/>B<\/p>$/);
assert.equal(bridge.view.state.doc.childCount, 1);
bridge.view.destroy();

console.log('roundeditor Phase 3 image contract passed');
