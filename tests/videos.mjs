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
    innerHeight: { value: 800, configurable: true },
    pageYOffset: { value: 0, configurable: true },
});
dom.window.HTMLMediaElement.prototype.pause = () => {};
dom.window.HTMLMediaElement.prototype.load = () => {};

const { gapCursor } = await import('prosemirror-gapcursor');
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
    formatVideoDuration,
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
assert.equal(legacyUrlVideo.firstChild.firstChild.attrs.src, '/index.php?module=file&act=procFileDownload&file_srl=30100&force_inline=Y');
assert.equal(parsedVideo.isInline, true);
assert.equal(parsedVideo.attrs.displayWidth, '640px');
assert.equal(parsedVideo.attrs.displayHeight, '360px');
assert.equal(parsedVideo.attrs.align, 'center');
assert.equal(parsedVideo.attrs.controls, true);
assert.equal(parsedVideo.attrs.preload, 'none');

const compiledCss = readFileSync(new URL('../dist/roundeditor.css', import.meta.url), 'utf8');
assert.match(compiledCss, /\.roundeditor__media--video>\.roundeditor__video-frame>video\{[^}]*height:auto!important/);

let coverToggles = 0;
const bridge = {
    config: { labels: {} },
    imageViews: new Set(),
    view: null,
    attachments: {
        findFileItem: fileSrl => fileSrl === '71' ? document.createElement('li') : null,
        isCover: () => false,
        toggleCover: () => { coverToggles++; },
    },
};
let videoView;
bridge.view = new EditorView(document.querySelector('#editor'), {
    state: EditorState.create({ doc: initial, plugins: [gapCursor(), mediaSelectionPlugin()] }),
    nodeViews: { video: (node, view, getPos) => (videoView = new VideoView(node, view, getPos, bridge)) },
});
const mediaDropLine = document.querySelector('.roundeditor__media-drop-line');
assert.ok(mediaDropLine);
assert.equal(mediaDropLine.hidden, true);
videoView.dom.dispatchEvent(new dom.window.MouseEvent('dragstart', { bubbles: true }));
assert.equal(document.querySelector('#editor').classList.contains('is-media-dragging'), true);
const dropParagraph = bridge.view.dom.querySelector('p:last-of-type');
document.querySelector('#editor').getBoundingClientRect = () => ({ top: 0, left: 0 });
bridge.view.dom.getBoundingClientRect = () => ({ left: 20, width: 500 });
dropParagraph.getBoundingClientRect = () => ({ top: 100, bottom: 140, height: 40 });
dropParagraph.dispatchEvent(new dom.window.MouseEvent('dragover', { bubbles: true, clientY: 135 }));
assert.equal(mediaDropLine.hidden, false);
assert.equal(mediaDropLine.style.top, '140px');
assert.equal(mediaDropLine.style.left, '20px');
videoView.dom.dispatchEvent(new dom.window.MouseEvent('dragend', { bubbles: true }));
assert.equal(mediaDropLine.hidden, true);
assert.equal(document.querySelector('#editor').classList.contains('is-media-dragging'), false);
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
assert.equal(videoView.media.style.aspectRatio, '640 / 360');
assert.ok(videoView.videoFrame);
assert.ok(videoView.captionInput);
assert.ok(videoView.cover);
assert.equal(videoView.edge.hidden, true);
Object.defineProperty(videoView.media, 'duration', { value: 83.6, configurable: true });
videoView.media.dispatchEvent(new dom.window.Event('loadedmetadata'));
assert.equal(videoView.dom.querySelector('.roundeditor__video-duration').textContent, '1:24');
assert.equal(videoView.dom.querySelector('.roundeditor__video-duration').getAttribute('aria-label'), 'Video duration: 1:24');
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
assert.equal(formatVideoDuration(4.2), '0:04');
assert.equal(formatVideoDuration(3661), '1:01:01');
assert.equal(formatVideoDuration(Infinity), '');
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
videoView.captionInput.value = '동영상 설명';
videoView.captionInput.focus();
videoView.captionInput.setSelectionRange(3, 3);
videoView.captionInput.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
assert.equal(videoView.captionInput.selectionStart, 3);
assert.equal(videoView.captionInput.selectionEnd, 3);
serialized = serializeDocument(bridge.view.state.doc, schema);
assert.match(serialized, /data-roundeditor-image/);
assert.match(serialized, /roundeditor-content-image__caption[^>]*>동영상 설명<\/span>/);
videoView.captionInput.click();
assert.equal(document.activeElement, videoView.captionInput);
videoView.captionInput.dispatchEvent(new dom.window.MouseEvent('dblclick', { bubbles: true, cancelable: true }));
assert.equal(videoView.captionInput.selectionStart, 0);
assert.equal(videoView.captionInput.selectionEnd, '동영상 설명'.length);
videoView.cover.click();
assert.equal(coverToggles, 1);

assert.deepEqual(videoAttrsFromUpload({
    download_url: '/files/download/7', thumbnail_filename: '/poster.jpg', file_srl: 77,
    dimensions: { width: 1280, height: 720 }, original_type: 'video/quicktime',
}, 640, 'center'), {
    src: '/files/download/7', poster: '/poster.jpg', caption: '', width: null, height: null,
    displayWidth: null, displayHeight: null, fileSrl: '77', preload: 'metadata',
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
assert.match(serialized, /^<p><video/);
assert.doesNotMatch(serialized, /(?:width|height)="|style="[^"]*(?:width|height):/);
assert.match(serialized, /<\/video><\/p><p>\u00a0<\/p><p>\u00a0<\/p><p>본문<\/p>$/);
assert.equal(bridge.view.state.selection instanceof TextSelection, true);
assert.equal(bridge.view.state.selection.$from.parent.type, schema.nodes.paragraph);
assert.equal(bridge.view.state.selection.$from.parentOffset, 0);
bridge.view.destroy();

document.querySelector('#editor').replaceChildren();
bridge.view = new EditorView(document.querySelector('#editor'), {
    state: EditorState.create({ doc: parseDocument('<p>본문</p>'), plugins: [gapCursor()] }),
});
insertUploadedVideo(bridge, {
    download_url: '/inline.mp4', file_srl: 100, dimensions: { width: 640, height: 360 }, original_type: 'video/mp4',
}, { insertionMode: 'inline' });
serialized = serializeDocument(bridge.view.state.doc, schema);
assert.match(serialized, /src="\/inline.mp4"/);
assert.doesNotMatch(serialized, /<p>\u00a0<\/p><p>\u00a0<\/p>/);
bridge.view.destroy();

const unwrapped = serializeDocument(parseDocument('<p><video src="/core.mp4" controls data-file-srl="10"></video></p><p>\u00a0</p>'), schema);
assert.equal(unwrapped, '<p><video src="/core.mp4" controls="" data-file-srl="10"></video></p><p>\u00a0</p>');

const videoOnly = parseDocument('<video src="/gap.mp4" controls></video>');
assert.equal(videoOnly.firstChild.type, schema.nodes.paragraph);
assert.equal(videoOnly.firstChild.firstChild.type, schema.nodes.video);

document.querySelector('#editor').replaceChildren();
const adjacentVideoViews = [];
bridge.view = new EditorView(document.querySelector('#editor'), {
    state: EditorState.create({ doc: parseDocument('<video src="/one.mp4"></video><video src="/two.mp4"></video>') }),
    nodeViews: { video: (node, view, getPos) => {
        const instance = new VideoView(node, view, getPos, bridge);
        adjacentVideoViews.push(instance);
        return instance;
    } },
});
assert.equal(adjacentVideoViews[0].edge.hidden, false);
assert.equal(adjacentVideoViews[1].edge.hidden, false);
adjacentVideoViews[1].edge.click();
assert.match(
    serializeDocument(bridge.view.state.doc, schema),
    /^<video[^>]*one\.mp4[^>]*><\/video><p>\u00a0<\/p><p>\u00a0<\/p><video[^>]*two\.mp4/
);
bridge.view.destroy();

console.log('roundeditor Phase 4 video contract passed');
