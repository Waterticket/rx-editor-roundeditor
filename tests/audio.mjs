import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><div id="editor" class="roundeditor__surface"></div></body></html>', { url: 'https://example.test/write' });
Object.defineProperties(globalThis, {
    window: { value: dom.window, configurable: true },
    document: { value: dom.window.document, configurable: true },
    navigator: { value: dom.window.navigator, configurable: true },
    Node: { value: dom.window.Node, configurable: true },
    MutationObserver: { value: dom.window.MutationObserver, configurable: true },
    getComputedStyle: { value: dom.window.getComputedStyle, configurable: true },
});
dom.window.HTMLMediaElement.prototype.pause = () => {};
dom.window.HTMLMediaElement.prototype.load = () => {};

const { AllSelection, EditorState, NodeSelection } = await import('prosemirror-state');
const { EditorView } = await import('prosemirror-view');
const { AudioView } = await import('../src/nodeviews/AudioView.js');
const { mediaSelectionPlugin } = await import('../src/mediaSelection.js');
const { parseDocument, schema, serializeDocument } = await import('../src/schema/index.js');

const source = '/index.php?module=file&amp;act=procFileDownload&amp;file_srl=30359&amp;sid=test';
const initial = parseDocument(`<audio src="${source}" controls data-file-srl="30359"></audio><p>본문</p>`);
const parsedAudio = initial.firstChild.firstChild;
assert.equal(parsedAudio.type, schema.nodes.audio);
assert.equal(parsedAudio.isInline, true);
assert.equal(parsedAudio.attrs.src, '/index.php?module=file&act=procFileDownload&file_srl=30359&sid=test');
assert.equal(parsedAudio.attrs.controls, true);
assert.equal(parsedAudio.attrs.fileSrl, '30359');
assert.equal(serializeDocument(initial, schema), `<audio src="${source}" controls="" data-file-srl="30359"></audio><p>본문</p>`);
assert.equal(
    serializeDocument(parseDocument(`<p><audio src="${source}" controls data-file-srl="30359"></audio></p>`), schema),
    `<p><audio src="${source}" controls="" data-file-srl="30359"></audio></p>`
);

const nestedSource = parseDocument('<audio controls><source src="/song.mp3" type="audio/mpeg"></audio>');
assert.equal(nestedSource.firstChild.type, schema.nodes.rawBlock);

let audioPosition = null;
initial.descendants((node, position) => {
    if (node.type === schema.nodes.audio) audioPosition = position;
});

const bridge = { config: { labels: {} }, view: null };
let audioView;
bridge.view = new EditorView(document.querySelector('#editor'), {
    state: EditorState.create({ doc: initial, plugins: [mediaSelectionPlugin()] }),
    nodeViews: { audio: (node, view, getPos) => (audioView = new AudioView(node, view, getPos, bridge)) },
});
document.querySelector('#editor').getBoundingClientRect = () => ({ top: 0, left: 0 });
bridge.view.dom.getBoundingClientRect = () => ({ left: 20, width: 500 });
audioView.dom.getBoundingClientRect = () => ({ top: 50 });
audioView.dom.dispatchEvent(new dom.window.MouseEvent('mousemove', { bubbles: true }));
assert.equal(document.querySelector('.roundeditor__global-media-edge').hidden, false);
audioView.dom.dispatchEvent(new dom.window.MouseEvent('dragstart', { bubbles: true }));
assert.equal(document.querySelector('#editor').classList.contains('is-media-dragging'), true);
audioView.dom.dispatchEvent(new dom.window.MouseEvent('dragend', { bubbles: true }));
assert.equal(document.querySelector('#editor').classList.contains('is-media-dragging'), false);
bridge.view.dispatch(bridge.view.state.tr.setSelection(new AllSelection(bridge.view.state.doc)));
assert.ok(audioView.dom.querySelector('.roundeditor__audio-selection-cover'));
const coverMouseDown = new dom.window.MouseEvent('mousedown', { bubbles: true, cancelable: true });
audioView.selectionCover.dispatchEvent(coverMouseDown);
assert.equal(coverMouseDown.defaultPrevented, true);
assert.equal(bridge.view.state.selection instanceof NodeSelection, true);
bridge.view.dispatch(bridge.view.state.tr.setSelection(new AllSelection(bridge.view.state.doc)));
audioView.suppressPlaybackClick = false;
const firstPointerDown = new dom.window.MouseEvent('pointerdown', { bubbles: true, cancelable: true });
audioView.media.dispatchEvent(firstPointerDown);
assert.equal(firstPointerDown.defaultPrevented, true);
assert.equal(bridge.view.state.selection instanceof NodeSelection, true);
assert.equal(bridge.view.state.selection.from, audioPosition);
const firstMouseDown = new dom.window.MouseEvent('mousedown', { bubbles: true, cancelable: true });
audioView.media.dispatchEvent(firstMouseDown);
assert.equal(firstMouseDown.defaultPrevented, true);
const firstClick = new dom.window.MouseEvent('click', { bubbles: true, cancelable: true });
audioView.media.dispatchEvent(firstClick);
assert.equal(firstClick.defaultPrevented, true);
const selectedPointerDown = new dom.window.MouseEvent('pointerdown', { bubbles: true, cancelable: true });
audioView.media.dispatchEvent(selectedPointerDown);
assert.equal(selectedPointerDown.defaultPrevented, false);
bridge.view.dispatch(bridge.view.state.tr.setSelection(NodeSelection.create(bridge.view.state.doc, audioPosition)));
assert.equal(audioView.dom.classList.contains('roundeditor__media--selected'), true);
assert.equal(audioView.toolbar.element.hidden, false);
assert.equal(audioView.media.controls, true);
assert.equal(audioView.media.autoplay, false);
assert.equal(audioView.media.getAttribute('src'), '/index.php?module=file&act=procFileDownload&file_srl=30359&sid=test');
assert.equal(audioView.toolbar.row.querySelector('[data-media-action="controls"]').getAttribute('aria-pressed'), 'true');
assert.equal(audioView.toolbar.row.querySelector('[data-media-action="loop"]').getAttribute('aria-pressed'), 'false');

audioView.updateAttrs({ autoplay: true, loop: true, muted: true });
let serialized = serializeDocument(bridge.view.state.doc, schema);
assert.match(serialized, /autoplay=""/);
assert.match(serialized, /loop=""/);
assert.match(serialized, /muted=""/);
assert.equal(audioView.media.autoplay, false);
assert.equal(audioView.toolbar.row.querySelector('[data-media-action="loop"]').getAttribute('aria-pressed'), 'true');

audioView.updateAttrs({ src: '/new-song.mp3', controls: false });
serialized = serializeDocument(bridge.view.state.doc, schema);
assert.match(serialized, /src="\/new-song\.mp3"/);
assert.doesNotMatch(serialized, /controls=/);
assert.equal(audioView.media.controls, true);

bridge.view.dispatch(bridge.view.state.tr.setSelection(new AllSelection(bridge.view.state.doc)));
assert.equal(audioView.dom.classList.contains('roundeditor__media--range-selected'), true);
assert.equal(audioView.toolbar.element.hidden, true);

const compiledCss = readFileSync(new URL('../dist/roundeditor.css', import.meta.url), 'utf8');
assert.match(compiledCss, /\.roundeditor__media--audio/);
assert.match(compiledCss, /\.roundeditor__media--audio \.roundeditor__media-handle\{display:none/);

bridge.view.destroy();
console.log('roundeditor audio contract passed');
