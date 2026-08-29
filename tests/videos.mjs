import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><div id="editor" class="roundeditor__surface"></div><div id="gap" class="roundeditor__surface"></div></body></html>', { url: 'https://example.test/write' });
Object.defineProperties(globalThis, {
    window: { value: dom.window, configurable: true },
    document: { value: dom.window.document, configurable: true },
    navigator: { value: dom.window.navigator, configurable: true },
    Node: { value: dom.window.Node, configurable: true },
    MutationObserver: { value: dom.window.MutationObserver, configurable: true },
    getComputedStyle: { value: dom.window.getComputedStyle, configurable: true },
    innerHeight: { value: 800, configurable: true },
    pageYOffset: { value: 0, configurable: true },
});
dom.window.HTMLMediaElement.prototype.pause = () => {};
dom.window.HTMLMediaElement.prototype.load = () => {};

const { gapCursor, GapCursor } = await import('prosemirror-gapcursor');
const { AllSelection, EditorState, NodeSelection, TextSelection } = await import('prosemirror-state');
const { EditorView } = await import('prosemirror-view');
const { updateEditorDocument } = await import('../src/documentUpdate.js');
const { VideoView } = await import('../src/nodeviews/VideoView.js');
const { mediaSelectionPlugin } = await import('../src/mediaSelection.js');
const { parseDocument, schema, serializeDocument } = await import('../src/schema/index.js');
const { addUploadPlaceholder, uploadPlaceholderPlugin } = await import('../src/uploadPlaceholders.js');
const {
    insertUploadedVideo,
    isVideoFile,
    MAX_VIDEO_SIZE,
    videoAttrsFromUpload,
    videoFiles,
} = await import('../src/videos.js');

const initial = parseDocument('<p>위</p><video src="/movie.mp4" poster="/poster.jpg" width="640" height="360" style="width:640px;height:360px;display:block;margin-left:auto;margin-right:auto" controls preload="none" data-file-srl="71"></video><p>아래</p>');
let videoPosition = null;
initial.descendants((node, position) => {
    if (node.type === schema.nodes.video) videoPosition = position;
});
const parsedVideo = initial.nodeAt(videoPosition);
assert.equal(parsedVideo.type.name, 'video');

const legacyUrlVideo = parseDocument('<video src="index.php?module=file&amp;act=procFileDownload&amp;file_srl=30100"></video>');
assert.equal(legacyUrlVideo.firstChild.attrs.src, '/index.php?module=file&act=procFileDownload&file_srl=30100&force_inline=Y');
assert.equal(parsedVideo.isBlock, true);
assert.equal(parsedVideo.attrs.displayWidth, '640px');
assert.equal(parsedVideo.attrs.displayHeight, '360px');
assert.equal(parsedVideo.attrs.align, 'center');
assert.equal(parsedVideo.attrs.controls, true);
assert.equal(parsedVideo.attrs.preload, 'none');

const bridge = { config: { labels: {} }, view: null };
let videoView;
bridge.view = new EditorView(document.querySelector('#editor'), {
    state: EditorState.create({ doc: initial, plugins: [gapCursor(), mediaSelectionPlugin()] }),
    nodeViews: { video: (node, view, getPos) => (videoView = new VideoView(node, view, getPos, bridge)) },
});
bridge.view.dispatch(bridge.view.state.tr.setSelection(NodeSelection.create(bridge.view.state.doc, videoPosition)));
assert.equal(videoView.dom.classList.contains('roundeditor__media--selected'), true);
assert.equal(videoView.toolbar.element.hidden, false);
assert.equal(
    videoView.toolbar.row.querySelector('[data-media-action="size"] .roundeditor__icon path').getAttribute('d'),
    'M6 6l12 12M6 11V6h5M18 13v5h-5'
);
assert.equal(videoView.handles.length, 4);
assert.equal(videoView.media.controls, false);
assert.equal(videoView.media.autoplay, false);
assert.equal(videoView.media.getAttribute('src'), '/movie.mp4');
assert.equal(videoView.media.preload, 'metadata');
assert.equal(videoView.media.getAttribute('loading'), 'lazy');
assert.ok(videoView.dom.querySelector('.roundeditor__video-play-indicator'));
assert.match(videoView.dom.querySelector('.roundeditor__video-play-indicator use').getAttribute('href'), /attachment-icons\.svg#play$/);
assert.equal(videoView.toolbar.row.querySelector('[data-media-action="controls"]').getAttribute('aria-pressed'), 'true');

bridge.view.dispatch(bridge.view.state.tr.setSelection(new AllSelection(bridge.view.state.doc)));
assert.equal(videoView.dom.classList.contains('roundeditor__media--range-selected'), true);
assert.equal(videoView.toolbar.element.hidden, true);

videoView.resizeFromForm(500, 240);
assert.match(serializeDocument(bridge.view.state.doc, schema), /width="500" height="240"/);

videoView.updateSize(320, 180);
let serialized = serializeDocument(bridge.view.state.doc, schema);
assert.match(serialized, /<\/p><video/);
assert.doesNotMatch(serialized, /<p><video/);
assert.match(serialized, /width="320" height="180"/);
assert.match(serialized, /style="width:320px;height:180px;display:block;margin-left:auto;margin-right:auto;"/);

videoView.toggleAutoplay();
serialized = serializeDocument(bridge.view.state.doc, schema);
assert.match(serialized, /autoplay=""/);
assert.match(serialized, /muted=""/);
assert.match(serialized, /playsinline=""/);
assert.equal(videoView.media.autoplay, false);
assert.equal(videoView.media.getAttribute('src'), '/movie.mp4');
videoView.updateAttrs({ controls: false });
assert.doesNotMatch(serializeDocument(bridge.view.state.doc, schema), /controls=/);
videoView.setAlign('right');
serialized = serializeDocument(bridge.view.state.doc, schema);
assert.match(serialized, /margin-left:auto;margin-right:0;/);
assert.equal(videoView.toolbar.row.querySelector('[data-media-action="right"]').getAttribute('aria-pressed'), 'true');
videoView.toolbar.openSizeForm();
assert.equal(videoView.toolbar.formHost.querySelector('button[type="button"]').textContent, 'Remove explicit size');
videoView.toolbar.formHost.querySelector('button[type="button"]').click();
serialized = serializeDocument(bridge.view.state.doc, schema);
assert.doesNotMatch(serialized, /(?:width|height)="/);
assert.doesNotMatch(serialized, /style="[^"]*(?:width|height):/);

assert.equal(MAX_VIDEO_SIZE, 52428800);
assert.equal(isVideoFile(new dom.window.File(['mp4'], 'movie.mp4', { type: 'video/mp4' })), true);
assert.equal(isVideoFile(new dom.window.File(['mov'], 'movie.mov', { type: 'video/quicktime' })), true);
assert.equal(isVideoFile(new dom.window.File(['txt'], 'movie.txt', { type: 'text/plain' })), false);
assert.equal(videoFiles([
    new dom.window.File(['webm'], 'movie.webm', { type: 'video/webm' }),
    new dom.window.File(['txt'], 'readme.txt', { type: 'text/plain' }),
]).length, 1);

const activeVideoMedia = videoView.media;
const withoutLeadingParagraph = parseDocument(serializeDocument(bridge.view.state.doc, schema).replace(/^<p>위<\/p>/, ''));
updateEditorDocument(bridge.view, withoutLeadingParagraph);
assert.equal(videoView.media, activeVideoMedia);
assert.equal(videoView.media.getAttribute('src'), '/movie.mp4');

assert.deepEqual(videoAttrsFromUpload({
    download_url: '/files/download/7', thumbnail_filename: '/poster.jpg', file_srl: 77,
    dimensions: { width: 1280, height: 720 }, original_type: 'video/quicktime',
}, 640, 'center'), {
    src: '/files/download/7', poster: '/poster.jpg', width: 640, height: 360,
    displayWidth: '640px', displayHeight: '360px', fileSrl: '77', preload: 'metadata',
    controls: true, muted: false, autoplay: false, loop: false, playsinline: false,
    align: 'center', display: 'block', marginLeft: 'auto', marginRight: 'auto',
});
const gifVideo = videoAttrsFromUpload({ download_url: '/gif.mp4', original_type: 'image/gif' });
assert.equal(gifVideo.controls, false);
assert.equal(gifVideo.autoplay && gifVideo.muted && gifVideo.loop && gifVideo.playsinline, true);

bridge.view.destroy();
document.querySelector('#editor').replaceChildren();
bridge.view = new EditorView(document.querySelector('#editor'), {
    state: EditorState.create({ doc: parseDocument('<p>본문</p>'), plugins: [gapCursor(), uploadPlaceholderPlugin()] }),
});
const videoPlaceholderId = addUploadPlaceholder(bridge.view, 'video', '동영상 첨부중...', 0);
assert.match(document.querySelector('#editor').textContent, /동영상 첨부중/);
insertUploadedVideo(bridge, {
    download_url: '/new.mp4', thumbnail_filename: '/new.jpg', file_srl: 99,
    dimensions: { width: 640, height: 360 }, original_type: 'video/mp4',
}, { align: 'center', placeholderId: videoPlaceholderId });
serialized = serializeDocument(bridge.view.state.doc, schema);
assert.equal(document.querySelector('#editor .roundeditor__upload-placeholder'), null);
assert.match(serialized, /^<video/);
assert.doesNotMatch(serialized, /<p><video/);
assert.match(serialized, /<\/video><p>\u00a0<\/p><p>\u00a0<\/p><p>본문<\/p>$/);
assert.equal(bridge.view.state.selection instanceof TextSelection, true);
assert.equal(bridge.view.state.selection.$from.parent.type, schema.nodes.paragraph);
assert.equal(bridge.view.state.selection.$from.parentOffset, 0);
bridge.view.destroy();

const unwrapped = serializeDocument(parseDocument('<p><video src="/core.mp4" controls data-file-srl="10"></video></p><p>\u00a0</p>'), schema);
assert.equal(unwrapped, '<video src="/core.mp4" controls="" data-file-srl="10"></video><p>\u00a0</p>');

const videoOnly = parseDocument('<video src="/gap.mp4" controls></video>');
assert.equal(GapCursor.valid(videoOnly.resolve(0)), true);
assert.equal(GapCursor.valid(videoOnly.resolve(videoOnly.content.size)), true);
const gapView = new EditorView(document.querySelector('#gap'), {
    state: EditorState.create({ doc: videoOnly, plugins: [gapCursor()] }),
});
gapView.dispatch(gapView.state.tr.setSelection(new GapCursor(gapView.state.doc.resolve(0))));
gapView.focus();
assert.ok(gapView.dom.querySelector('.ProseMirror-gapcursor'));
gapView.dom.dispatchEvent(new dom.window.InputEvent('beforeinput', {
    bubbles: true,
    cancelable: true,
    inputType: 'insertCompositionText',
    data: 'ㅎ',
}));
assert.equal(gapView.state.doc.firstChild.type, schema.nodes.paragraph);
assert.equal(gapView.state.doc.lastChild.type, schema.nodes.video);
gapView.destroy();

console.log('roundeditor Phase 4 video contract passed');
