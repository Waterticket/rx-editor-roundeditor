import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const dom = new JSDOM(`<!doctype html><html><body><form>
    <div class="roundeditor"><div class="roundeditor__surface"></div></div>
    <div id="xefu-container-7" data-autoinsert-types='{"image":true,"audio":true,"video":true}' data-autoinsert-position="paragraph">
        <div class="xefu-dropzone"><p class="xefu-dropzone-message"></p><span class="xefu-btn fileinput-button"><span><i class="xi-icon"></i>선택</span><input type="file"></span><p class="upload_info"><span class="allowed_filesize_container">파일 제한 : <span class="allowed_filesize">10MB</span></span></p></div><div class="xefu-controll"><div>0개 첨부됨 (<span class="attached_size">0Byte</span> / <span class="allowed_attach_size">20MB</span>)</div><div><input type="button" class="xefu-btn xefu-act-link-selected" value="본문 삽입"><input type="button" class="xefu-btn xefu-act-delete-selected" value="선택 삭제"></div></div><div class="xefu-list"><div class="xefu-list-images"><ul></ul></div><div class="xefu-list-files"><ul></ul></div></div>
    </div>
</form></body></html>`, { url: 'https://example.test/write' });

Object.defineProperties(globalThis, {
    window: { value: dom.window, configurable: true },
    document: { value: dom.window.document, configurable: true },
    navigator: { value: dom.window.navigator, configurable: true },
    Node: { value: dom.window.Node, configurable: true },
    MutationObserver: { value: dom.window.MutationObserver, configurable: true },
    getComputedStyle: { value: dom.window.getComputedStyle, configurable: true },
});
dom.window.HTMLMediaElement.prototype.load = () => {};

const handlers = {};
const jqueryData = {};
window.jQuery = () => ({
    data(name, value) {
        if (arguments.length === 0) return jqueryData;
        if (arguments.length === 1) return jqueryData[name];
        jqueryData[name] = value;
        return this;
    },
    off() { return this; },
    on(name, handler) { handlers[name.split('.')[0]] = handler; return this; },
});

const { EditorState } = await import('prosemirror-state');
const { EditorView } = await import('prosemirror-view');
const { AttachmentList } = await import('../src/AttachmentList.js');
const { parseDocument, serializeDocument, schema } = await import('../src/schema/index.js');
const { uploadPlaceholderPlugin } = await import('../src/uploadPlaceholders.js');

const wrapper = document.querySelector('.roundeditor');
const bridge = {
    sequence: 7,
    form: document.querySelector('form'),
    wrapper,
    config: {
        colorset: 'auto',
        labels: {
            attachments: '파일 첨부',
            attachmentsHelp: '업로드 후 삽입',
            attachmentsDropOverlay: '파일 업로드',
            imageUploading: '이미지 첨부중...',
        },
    },
    view: new EditorView(wrapper.querySelector('.roundeditor__surface'), {
        state: EditorState.create({ doc: parseDocument('<p></p>'), plugins: [uploadPlaceholderPlugin()] }),
    }),
};

let insertProxyClicks = 0;
document.querySelector('.xefu-act-link-selected').addEventListener('click', () => { insertProxyClicks += 1; });
const attachmentList = new AttachmentList(bridge);
const uploader = document.querySelector('.roundeditor__attachments');
async function clickMedia(target) {
    target.dispatchEvent(new dom.window.MouseEvent('mousedown', { bubbles: true, button: 0 }));
    target.dispatchEvent(new dom.window.MouseEvent('mouseup', { bubbles: true, button: 0 }));
    target.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, button: 0 }));
    await new Promise(resolve => window.setTimeout(resolve, 0));
}
assert.ok(uploader);
assert.notEqual(uploader.parentElement, wrapper);
assert.equal(uploader.querySelector('.roundeditor__attachments-heading strong').textContent, '파일 첨부');
assert.equal(uploader.dataset.autoinsertTypes, '{"image":false,"audio":true,"video":false}');
assert.deepEqual(jqueryData.autoinsertTypes, { image: false, audio: true, video: false });
assert.equal(attachmentList.autoinsertPosition, 'paragraph');
assert.equal(uploader.classList.contains('roundeditor__attachments--auto'), true);
assert.equal(uploader.classList.contains('roundeditor__attachments--empty'), true);
assert.equal(uploader.querySelector('.roundeditor__drop-overlay strong').textContent, '파일 업로드');
assert.equal(uploader.querySelector('.roundeditor__list-section-heading'), null);
assert.match(uploader.querySelector('.roundeditor__attachments-policy').textContent, /파일 제한 : 10MB/);
assert.equal(uploader.querySelector('.roundeditor__attachments-policy').hidden, true);
assert.equal(uploader.querySelector('.xefu-dropzone .fileinput-button') !== null, true);
assert.equal(uploader.querySelector('.fileinput-button i'), null);
assert.match(uploader.querySelector('.fileinput-button use').getAttribute('href'), /attachment-icons\.svg#upload$/);
assert.match(uploader.querySelector('.roundeditor__dropzone-icon use').getAttribute('href'), /attachment-icons\.svg#upload$/);
assert.match(uploader.querySelector('.roundeditor__dropzone-count').textContent, /Current 0 files/);
assert.equal(uploader.querySelector('.xefu-controll').hidden, true);
assert.equal(uploader.querySelector('.roundeditor__attachment-action--insert').textContent, '본문 삽입');
assert.equal(uploader.querySelector('.roundeditor__attachment-action--delete').textContent, '선택 삭제');
assert.equal(uploader.querySelector('.roundeditor__attachment-action--insert').hidden, true);
assert.equal(uploader.querySelector('.roundeditor__attachment-action--delete').hidden, true);

const originalFileInput = uploader.querySelector('.fileinput-button input[type="file"]');
const replacementFileInput = originalFileInput.cloneNode(true);
let originalInputClicks = 0;
let replacementInputClicks = 0;
originalFileInput.addEventListener('click', () => { originalInputClicks += 1; });
replacementFileInput.addEventListener('click', () => { replacementInputClicks += 1; });
originalFileInput.after(replacementFileInput);
originalFileInput.remove();
uploader.querySelector('.fileinput-button').click();
assert.equal(originalInputClicks, 0);
assert.equal(replacementInputClicks, 1);

const imageItem = document.createElement('li');
imageItem.className = 'xefu-file xefu-file-image';
imageItem.dataset.fileSrl = '77';
imageItem.innerHTML = '<strong class="xefu-file-name">cover.png</strong><span class="xefu-file-info"><span class="xefu-file-size">10KB</span><span><span class="xefu-thumbnail"></span></span><span><input type="checkbox" data-file-srl="77"></span><button class="xefu-act-set-cover" data-file-srl="77" title="대표 이미지로 설정"></button></span>';
uploader.querySelector('.xefu-list').style.display = 'none';
uploader.querySelector('.xefu-list-images ul')?.appendChild(imageItem);
await new Promise(resolve => queueMicrotask(resolve));
assert.equal(uploader.querySelector('.xefu-list').style.display, 'block');
assert.equal(imageItem.classList.contains('roundeditor__attachment--unused'), true);
assert.equal(imageItem.querySelector('.roundeditor__attachment-unused-overlay').hidden, false);
assert.equal(
    imageItem.querySelector('.roundeditor__attachment-unused-overlay').parentElement,
    imageItem.querySelector('.xefu-file-info')
);
assert.equal(
    imageItem.querySelector('.roundeditor__attachment-unused-overlay').getAttribute('aria-label'),
    'This media is not inserted in the body.'
);
bridge.view.updateState(EditorState.create({
    doc: parseDocument('<p><img src="/cover.png" data-file-srl="77" /></p>'),
    plugins: [uploadPlaceholderPlugin()],
}));
attachmentList.refreshUsageState();
assert.equal(imageItem.classList.contains('roundeditor__attachment--unused'), false);
assert.equal(imageItem.querySelector('.roundeditor__attachment-unused-overlay').hidden, true);
bridge.view.updateState(EditorState.create({
    doc: parseDocument('<p></p>'),
    plugins: [uploadPlaceholderPlugin()],
}));
attachmentList.refreshUsageState();
assert.equal(imageItem.classList.contains('roundeditor__attachment--unused'), true);
const oembedItem = document.createElement('li');
oembedItem.className = 'xefu-file xefu-file-image';
oembedItem.dataset.fileSrl = '78';
oembedItem.innerHTML = '<strong class="xefu-file-name">oembed_preview.png</strong><span class="xefu-file-info"><span class="xefu-file-size">10KB</span></span>';
uploader.querySelector('.xefu-list-images ul')?.appendChild(oembedItem);
await new Promise(resolve => queueMicrotask(resolve));
assert.equal(oembedItem.classList.contains('roundeditor__attachment--unused'), false);
assert.equal(oembedItem.querySelector('.roundeditor__attachment-unused-overlay').hidden, true);
const imageCheckbox = imageItem.querySelector('input[type="checkbox"]');
const thumbnailCheckbox = imageItem.querySelector('.xefu-act-set-cover');
assert.equal(thumbnailCheckbox.classList.contains('roundeditor__thumbnail-checkbox'), true);
assert.equal(thumbnailCheckbox.getAttribute('role'), 'checkbox');
assert.equal(thumbnailCheckbox.getAttribute('aria-checked'), 'false');
assert.match(thumbnailCheckbox.querySelector('use').getAttribute('href'), /attachment-icons\.svg#cover$/);

await clickMedia(imageItem.querySelector('.xefu-thumbnail'));
assert.equal(imageItem.classList.contains('selected'), true);
assert.equal(imageCheckbox.checked, true);
await clickMedia(imageCheckbox);
assert.equal(imageItem.classList.contains('selected'), false);
assert.equal(imageCheckbox.checked, false);

thumbnailCheckbox.dispatchEvent(new dom.window.MouseEvent('mousedown', { bubbles: true, button: 0 }));
await new Promise(resolve => queueMicrotask(resolve));
assert.equal(imageItem.classList.contains('selected'), false);
imageItem.classList.add('xefu-is-cover-image');
await new Promise(resolve => queueMicrotask(resolve));
assert.equal(thumbnailCheckbox.getAttribute('aria-checked'), 'true');
imageItem.classList.remove('xefu-is-cover-image');
await new Promise(resolve => queueMicrotask(resolve));
assert.equal(thumbnailCheckbox.getAttribute('aria-checked'), 'false');

const videoItem = document.createElement('li');
videoItem.className = 'xefu-file';
videoItem.dataset.fileSrl = '91';
videoItem.innerHTML = '<span class="xefu-file-name">clip.mov</span><span class="xefu-file-info"><span>1MB</span><input type="checkbox" data-file-srl="91"></span>';
uploader.querySelector('.xefu-list-files ul')?.appendChild(videoItem);
// Allow the list observer to decorate a video that has no server thumbnail.
await new Promise(resolve => queueMicrotask(resolve));
assert.equal(uploader.querySelector('.xefu-list-images .xefu-file-video-play') !== null, true);
assert.match(uploader.querySelector('.xefu-list-images .xefu-file-video-play use').getAttribute('href'), /attachment-icons\.svg#play$/);
const durationVideo = videoItem.querySelector('video.xefu-thumbnail');
Object.defineProperty(durationVideo, 'duration', { value: 125.2, configurable: true });
durationVideo.dispatchEvent(new dom.window.Event('loadedmetadata'));
assert.equal(videoItem.querySelector('.roundeditor__attachment-video-duration').textContent, '2:05');
assert.equal(videoItem.querySelector('.roundeditor__attachment-video-duration').getAttribute('aria-label'), 'Video duration: 2:05');

const thumbnailVideoItem = document.createElement('li');
thumbnailVideoItem.className = 'xefu-file xefu-file-image';
thumbnailVideoItem.dataset.fileSrl = '92';
thumbnailVideoItem.dataset.duration = '3661';
thumbnailVideoItem.innerHTML = '<span class="xefu-file-name">server-thumbnail.mp4</span><span class="xefu-file-info"><span class="xefu-file-size">2MB</span><span><span class="xefu-thumbnail" style="background-image:url(/poster.jpg)"></span></span><span><input type="checkbox" data-file-srl="92"></span></span>';
uploader.querySelector('.xefu-list-images ul')?.appendChild(thumbnailVideoItem);
await new Promise(resolve => queueMicrotask(resolve));
assert.equal(thumbnailVideoItem.querySelector('video.roundeditor__attachment-video-metadata'), null);
assert.equal(thumbnailVideoItem.querySelector('.roundeditor__attachment-video-duration').textContent, '1:01:01');
assert.equal(thumbnailVideoItem.querySelector('.roundeditor__attachment-video-duration').hidden, false);
assert.equal(thumbnailVideoItem.classList.contains('roundeditor__attachment--unused'), true);
assert.equal(uploader.classList.contains('roundeditor__attachments--has-files'), true);
assert.equal(uploader.querySelector('.roundeditor__attachments-policy').hidden, false);
assert.equal(uploader.querySelector('.roundeditor__attachments-actions .fileinput-button') !== null, true);
let fileListRefreshes = 0;
jqueryData.instance = { loadFilelist: () => { fileListRefreshes++; } };
attachmentList.refresh();
assert.equal(fileListRefreshes, 1);
await clickMedia(videoItem.querySelector('.xefu-thumbnail'));
assert.equal(videoItem.classList.contains('selected'), true);
await clickMedia(videoItem.querySelector('.xefu-thumbnail'));
assert.equal(videoItem.classList.contains('selected'), false);
await clickMedia(imageItem.querySelector('.xefu-thumbnail'));
await clickMedia(videoItem.querySelector('.xefu-thumbnail'));
assert.equal(imageItem.classList.contains('selected'), true);
assert.equal(videoItem.classList.contains('selected'), true);
await clickMedia(imageItem.querySelector('.xefu-thumbnail'));
await clickMedia(videoItem.querySelector('.xefu-thumbnail'));
const videoCheckbox = videoItem.querySelector('input[type="checkbox"]');
await clickMedia(imageCheckbox);
await clickMedia(videoCheckbox);
assert.equal(imageCheckbox.checked, true);
assert.equal(videoCheckbox.checked, true);
assert.equal(imageItem.classList.contains('selected'), true);
assert.equal(videoItem.classList.contains('selected'), true);
await clickMedia(imageCheckbox);
await clickMedia(videoCheckbox);
assert.equal(imageCheckbox.checked, false);
assert.equal(videoCheckbox.checked, false);
videoCheckbox.checked = true;
videoCheckbox.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
assert.equal(uploader.querySelector('.roundeditor__attachment-action--insert').hidden, false);
assert.equal(uploader.querySelector('.roundeditor__attachment-action--delete').hidden, false);
uploader.querySelector('.roundeditor__attachment-action--insert').click();
assert.equal(insertProxyClicks, 1);
videoCheckbox.checked = false;
videoCheckbox.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
assert.equal(uploader.querySelector('.roundeditor__attachment-action--insert').hidden, true);

const cancelledFile = new dom.window.File(['cancel'], 'cancelled.mp4', { type: 'video/mp4' });
let abortCount = 0;
let cancelMarkerSeen = false;
let failureHandler = null;
const cancellableRequest = {
    done() { return this; },
    fail(handler) { failureHandler = handler; return this; },
    abort() {
        abortCount += 1;
        cancelMarkerSeen = cancellableUpload._roundeditorCancelled === true;
        failureHandler?.();
    },
};
const cancellableUpload = {
    files: [cancelledFile],
    submit() { return cancellableRequest; },
};
handlers.fileuploadadd({}, cancellableUpload);
cancellableUpload.submit();
const cancelledPreview = [...uploader.querySelectorAll('.roundeditor__attachment-upload')]
    .find(item => item.querySelector('.xefu-file-name')?.textContent === 'cancelled.mp4');
assert.ok(cancelledPreview);
const cancelUploadButton = cancelledPreview.querySelector('.roundeditor__attachment-upload-cancel');
assert.equal(cancelUploadButton.title, 'Cancel upload');
assert.equal(cancelUploadButton.getAttribute('aria-label'), 'cancelled.mp4: Cancel upload');
assert.equal(cancelUploadButton.querySelector('span').textContent, 'Cancel');
assert.match(cancelUploadButton.querySelector('use').getAttribute('href'), /attachment-icons\.svg#cancel$/);
cancelUploadButton.click();
assert.equal(abortCount, 1);
assert.equal(cancelMarkerSeen, true);
assert.equal(cancelledPreview.isConnected, false);
assert.equal(wrapper.querySelector('.roundeditor__upload-placeholder'), null);

const file = new dom.window.File(['png'], 'progress.png', { type: 'image/png' });
const upload = { files: [file], loaded: 0, total: 100 };
uploader.querySelector('.xefu-list').style.display = 'none';
handlers.fileuploadadd({}, upload);
assert.match(wrapper.querySelector('.roundeditor__upload-placeholder').textContent, /0%/);
assert.equal(uploader.querySelectorAll('.roundeditor__attachment-upload').length, 1);
assert.equal(uploader.querySelector('.roundeditor__attachment-upload-percent').textContent, '0%');
assert.equal(uploader.querySelector('.xefu-list').style.display, 'block');
assert.equal(uploader.classList.contains('roundeditor__attachments--has-files'), true);
upload.loaded = 61;
handlers.fileuploadprogress({}, upload);
assert.match(wrapper.querySelector('.roundeditor__upload-placeholder').textContent, /61%/);
assert.equal(uploader.querySelector('.roundeditor__attachment-upload-percent').textContent, '61%');
const doneUpload = { files: [file], result: {
    error: 0,
    file_srl: 88,
    download_url: '/progress.png',
    source_filename: 'progress.png',
    width: 320,
    height: 180,
} };
handlers.fileuploaddone({}, doneUpload);
assert.equal(wrapper.querySelector('.roundeditor__upload-placeholder'), null);
assert.equal(uploader.querySelector('.roundeditor__attachment-upload-percent').textContent, '100%');
const progressSerialized = serializeDocument(bridge.view.state.doc, schema);
assert.match(progressSerialized, /src="\/progress.png"/);
assert.match(progressSerialized, /<\/p><p>\u00a0<\/p><p>\u00a0<\/p>$/);
assert.match(serializeDocument(bridge.view.state.doc, schema), /data-file-srl="88"/);
const completedImage = document.createElement('li');
completedImage.className = 'xefu-file xefu-file-image';
completedImage.dataset.fileSrl = '88';
completedImage.innerHTML = '<strong class="xefu-file-name">progress.png</strong>';
uploader.querySelector('.xefu-list-images ul').appendChild(completedImage);
await new Promise(resolve => queueMicrotask(resolve));
assert.equal(uploader.querySelectorAll('.roundeditor__attachment-upload').length, 0);

attachmentList.autoinsertTypes.image = false;
const disabledImage = new dom.window.File(['disabled'], 'disabled.png', { type: 'image/png' });
const disabledUpload = { files: [disabledImage] };
const contentBeforeDisabledUpload = serializeDocument(bridge.view.state.doc, schema);
handlers.fileuploadadd({}, disabledUpload);
assert.equal(wrapper.querySelector('.roundeditor__upload-placeholder'), null);
handlers.fileuploaddone({}, { files: [disabledImage], result: {
    error: 0, file_srl: 103, download_url: '/disabled.png', source_filename: 'disabled.png', width: 320, height: 180,
} });
assert.equal(serializeDocument(bridge.view.state.doc, schema), contentBeforeDisabledUpload);
const completedDisabledImage = document.createElement('li');
completedDisabledImage.className = 'xefu-file xefu-file-image';
completedDisabledImage.dataset.fileSrl = '103';
uploader.querySelector('.xefu-list-images ul').appendChild(completedDisabledImage);
await new Promise(resolve => queueMicrotask(resolve));
assert.equal(uploader.querySelectorAll('.roundeditor__attachment-upload').length, 0);
attachmentList.autoinsertTypes.image = true;

const firstVideoFile = new dom.window.File(['first'], 'first.mp4', { type: 'video/mp4' });
const secondVideoFile = new dom.window.File(['second'], 'second.mp4', { type: 'video/mp4' });
const videoBatch = { files: [firstVideoFile, secondVideoFile], loaded: 0, total: 200 };
handlers.fileuploadadd({}, videoBatch);
assert.equal(wrapper.querySelectorAll('.roundeditor__upload-placeholder--video').length, 2);
assert.equal(uploader.querySelectorAll('.roundeditor__attachment-upload').length, 2);
videoBatch.loaded = 100;
handlers.fileuploadprogress({}, videoBatch);
assert.deepEqual(
    [...uploader.querySelectorAll('.roundeditor__attachment-upload-percent')].map(element => element.textContent),
    ['50%', '50%']
);
videoBatch.result = {
    error: 0, file_srl: 101, download_url: '/first.mp4', source_filename: 'first.mp4', width: 640, height: 360,
};
handlers.fileuploaddone({}, videoBatch);
assert.equal(wrapper.querySelectorAll('.roundeditor__upload-placeholder--video').length, 1);
assert.equal(uploader.querySelectorAll('.roundeditor__attachment-upload').length, 2);
assert.equal(uploader.querySelector('.roundeditor__attachment-upload-percent').textContent, '100%');
assert.match(serializeDocument(bridge.view.state.doc, schema), /src="\/first.mp4"/);
videoBatch.result = {
    error: 0, file_srl: 102, download_url: '/second.mp4', source_filename: 'second.mp4', width: 640, height: 360,
};
handlers.fileuploaddone({}, videoBatch);
assert.equal(wrapper.querySelectorAll('.roundeditor__upload-placeholder--video').length, 0);
assert.equal(uploader.querySelectorAll('.roundeditor__attachment-upload').length, 2);
assert.match(serializeDocument(bridge.view.state.doc, schema), /src="\/second.mp4"/);
for (const fileSrl of ['101', '102']) {
    const completedVideo = document.createElement('li');
    completedVideo.className = 'xefu-file xefu-file-image';
    completedVideo.dataset.fileSrl = fileSrl;
    completedVideo.innerHTML = `<strong class="xefu-file-name">${fileSrl}.mp4</strong>`;
    uploader.querySelector('.xefu-list-images ul').appendChild(completedVideo);
}
await new Promise(resolve => queueMicrotask(resolve));
assert.equal(uploader.querySelectorAll('.roundeditor__attachment-upload').length, 0);

const rejectedFile = new dom.window.File(['too large'], 'rejected.mp4', { type: 'video/mp4' });
const rejectedUpload = { files: [rejectedFile], submit() {} };
handlers.fileuploadadd({}, rejectedUpload);
assert.match(wrapper.querySelector('.roundeditor__upload-placeholder').textContent, /0%/);
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(wrapper.querySelector('.roundeditor__upload-placeholder'), null);

const compiledCss = readFileSync(new URL('../dist/roundeditor.css', import.meta.url), 'utf8');
assert.match(compiledCss, /\.roundeditor \.roundeditor__swatch\{/);
assert.match(compiledCss, /\.roundeditor \.roundeditor__swatch--reset\{/);
assert.match(compiledCss, /\.roundeditor__attachments \.xefu-btn\{[^}]*height:auto!important/);
assert.match(compiledCss, /\.roundeditor__attachments \.xefu-btn\{[^}]*white-space:nowrap/);
assert.match(compiledCss, /\.roundeditor__attachments \.xefu-list-images \.xefu-file-name\{[^}]*display:none/);
assert.match(compiledCss, /\.roundeditor__attachments \.roundeditor__attachment-unused-overlay\{[^}]*#4b556380/);

bridge.view.destroy();
console.log('roundeditor attachment list contract passed');
