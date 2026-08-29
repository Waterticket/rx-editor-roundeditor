import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><div id="editor" class="roundeditor__surface"></div></body></html>', { url: 'https://example.test/write' });
Object.defineProperties(globalThis, {
    window: { value: dom.window, configurable: true },
    document: { value: dom.window.document, configurable: true },
    navigator: { value: dom.window.navigator, configurable: true },
    Node: { value: dom.window.Node, configurable: true },
    MutationObserver: { value: dom.window.MutationObserver, configurable: true },
    getComputedStyle: { value: dom.window.getComputedStyle, configurable: true },
    localStorage: { value: dom.window.localStorage, configurable: true },
});
dom.window.HTMLMediaElement.prototype.play = () => Promise.resolve();
dom.window.HTMLMediaElement.prototype.pause = () => {};
dom.window.IntersectionObserver = class {
    constructor(callback) { this.callback = callback; }
    observe(target) { this.callback([{ target, isIntersecting: true }]); }
    unobserve() {}
    disconnect() {}
};
globalThis.IntersectionObserver = dom.window.IntersectionObserver;

const { AllSelection, EditorState, NodeSelection, TextSelection } = await import('prosemirror-state');
const { EditorView } = await import('prosemirror-view');
const { updateEditorDocument } = await import('../src/documentUpdate.js');
const { StickerView } = await import('../src/nodeviews/StickerView.js');
const { mediaSelectionPlugin } = await import('../src/mediaSelection.js');
const { parseDocument, schema, serializeDocument } = await import('../src/schema/index.js');
const { insertSticker, resolveDocumentStickers } = await import('../src/stickers.js');
const { createStickerPanel } = await import('../src/ui/panels/StickerPanel.js');

const saved = '<p>앞<img src="/poster.webp" alt="팩" width="100" height="100" style="width:100px;height:100px" data-rx-sticker="10|20" data-rx-sticker-type="video" />뒤</p>';
const parsed = parseDocument(saved);
const sticker = parsed.firstChild.child(1);
assert.equal(sticker.type, schema.nodes.sticker);
assert.equal(sticker.isInline, true);
assert.equal(sticker.attrs.mediaType, 'video');
assert.equal(sticker.attrs.videoSrc, null);
assert.equal(schema.nodes.sticker.spec.selectable, true);
assert.match(serializeDocument(parsed, schema), /^<p>앞<img/);
assert.match(serializeDocument(parsed, schema), /data-rx-sticker="10\|20" data-rx-sticker-type="video" \/>뒤<\/p>$/);
assert.doesNotMatch(serializeDocument(parsed, schema), /videoSrc|\.mp4/);

const bridge = { config: { labels: {}, mid: 'board' }, view: null };
let stickerView;
bridge.view = new EditorView(document.querySelector('#editor'), {
    state: EditorState.create({ doc: parsed, plugins: [mediaSelectionPlugin()] }),
    nodeViews: { sticker: (node, view, getPos) => (stickerView = new StickerView(node, view, getPos, bridge)) },
});
assert.equal(stickerView.handles.length, 0);
assert.equal(stickerView.dom.querySelector('.roundeditor__media-toolbar'), null);
assert.equal(stickerView.media.tagName, 'IMG');
let stickerPosition = null;
bridge.view.state.doc.descendants((node, position) => {
    if (node.type === schema.nodes.sticker) stickerPosition = position;
});
bridge.view.dispatch(bridge.view.state.tr.setSelection(NodeSelection.create(bridge.view.state.doc, stickerPosition)));
assert.equal(bridge.view.state.selection instanceof NodeSelection, true);
assert.equal(stickerView.dom.classList.contains('roundeditor__media--selected'), true);
assert.equal(stickerView.handles.length, 0);

bridge.view.dispatch(bridge.view.state.tr.setSelection(new AllSelection(bridge.view.state.doc)));
assert.equal(stickerView.dom.classList.contains('roundeditor__media--range-selected'), true);

window.exec_json = (action, params, success) => {
    assert.equal(action, 'sticker.resolveStickers');
    assert.deepEqual(JSON.parse(params.stickers), [{ sticker_srl: '10', sticker_file_srl: '20' }]);
    success({ stickers: [{
        sticker_srl: '10', sticker_file_srl: '20', valid: true, type: 'video',
        url: '/animated.mp4', poster: '/poster.webp', title: '애니메이션 팩',
    }] });
};
await resolveDocumentStickers(bridge);
assert.equal(stickerView.media.tagName, 'VIDEO');
assert.equal(stickerView.media.autoplay, true);
assert.equal(stickerView.media.muted, true);
assert.equal(stickerView.media.loop, true);
assert.equal(stickerView.media.playsInline, true);
assert.equal(stickerView.media.getAttribute('src'), '/animated.mp4');
assert.equal(serializeDocument(bridge.view.state.doc, schema).includes('/animated.mp4'), false);

const animatedStickerMedia = stickerView.media;
updateEditorDocument(bridge.view, parseDocument(serializeDocument(bridge.view.state.doc, schema)));
assert.equal(stickerView.media, animatedStickerMedia);
assert.equal(stickerView.media.tagName, 'VIDEO');
assert.equal(stickerView.media.getAttribute('src'), '/animated.mp4');
assert.equal(bridge.view.state.doc.firstChild.child(1).attrs.videoSrc, '/animated.mp4');

bridge.view.destroy();
document.querySelector('#editor').replaceChildren();
bridge.view = new EditorView(document.querySelector('#editor'), {
    state: EditorState.create({ doc: parseDocument('<p>텍스트</p>') }),
});
bridge.view.dispatch(bridge.view.state.tr.setSelection(TextSelection.atEnd(bridge.view.state.doc)));
insertSticker(bridge, {
    sticker_srl: 1, sticker_file_srl: 2, type: 'image', url: '/still.png', name: '정지',
}, '팩');
assert.equal(bridge.view.state.doc.childCount, 1);
assert.match(serializeDocument(bridge.view.state.doc, schema), /^<p>텍스트<img/);
assert.equal(bridge.view.state.selection instanceof TextSelection, true);
insertSticker(bridge, {
    sticker_srl: 1, sticker_file_srl: 3, type: 'image', url: '/still-2.png', name: '정지 2',
}, '팩');
assert.equal(bridge.view.state.selection instanceof NodeSelection, false);
assert.equal((serializeDocument(bridge.view.state.doc, schema).match(/data-rx-sticker=/g) || []).length, 2);
bridge.view.destroy();

window.exec_json = (action, params, success) => {
    if (action === 'sticker.getStickerPickerList') {
        success({ sticker: [{ sticker_srl: '10', title: '팩', main_image: '/main.png' }] });
    } else if (action === 'sticker.getStickerElemList') {
        success({ stickerImage: [{ sticker_file_srl: '20', type: 'image', url: '/item.png', poster: '/item.png', name: '항목' }] });
    }
};
document.querySelector('#editor').replaceChildren();
bridge.view = new EditorView(document.querySelector('#editor'), {
    state: EditorState.create({ doc: parseDocument('<p></p>') }),
});
const picker = createStickerPanel(bridge, {
    sticker: 'Sticker', stickerPacks: 'Packs', stickerRecent: 'Recent', stickerLoading: 'Loading',
    stickerEmpty: 'Empty', stickerError: 'Error', stickerPrevious: 'Previous', stickerNext: 'Next',
    stickerOrder: 'Reorder', stickerList: 'Sticker list',
}, () => {});
document.body.appendChild(picker);
await new Promise(resolve => setTimeout(resolve, 0));
picker.querySelectorAll('.roundeditor__sticker-pack')[1].click();
await new Promise(resolve => setTimeout(resolve, 0));
picker.querySelector('.roundeditor__sticker-item').click();
assert.match(serializeDocument(bridge.view.state.doc, schema), /data-rx-sticker="10\|20"/);
assert.equal(picker.isConnected, true);
assert.equal(picker.hidden, false);
assert.equal(picker.querySelector('.roundeditor__sticker-pack-title').textContent, '팩');
assert.equal(picker.querySelectorAll('.roundeditor__sticker-footer a').length, 2);
picker.querySelector('.roundeditor__sticker-item').click();
assert.equal((serializeDocument(bridge.view.state.doc, schema).match(/data-rx-sticker="10\|20"/g) || []).length, 2);
bridge.view.destroy();

console.log('roundeditor Phase 5 sticker contract passed');
