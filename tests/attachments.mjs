import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM(`<!doctype html><html><body><form>
    <div class="roundeditor"><div class="roundeditor__surface"></div></div>
    <div id="xefu-container-7" data-autoinsert-types='{"image":true,"audio":true,"video":true}'>
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

const handlers = {};
const jqueryData = {};
window.jQuery = () => ({
    data(name, value) { jqueryData[name] = value; return this; },
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
new AttachmentList(bridge);
const uploader = document.querySelector('.roundeditor__attachments');
async function clickMedia(target) {
    target.dispatchEvent(new dom.window.MouseEvent('mousedown', { bubbles: true, button: 0 }));
    target.dispatchEvent(new dom.window.MouseEvent('mouseup', { bubbles: true, button: 0 }));
    target.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, button: 0 }));
    await new Promise(resolve => queueMicrotask(resolve));
}
assert.ok(uploader);
assert.notEqual(uploader.parentElement, wrapper);
assert.equal(uploader.querySelector('.roundeditor__attachments-heading strong').textContent, '파일 첨부');
assert.equal(uploader.dataset.autoinsertTypes, '{"image":false,"audio":true,"video":false}');
assert.deepEqual(jqueryData.autoinsertTypes, { image: false, audio: true, video: false });
assert.equal(uploader.classList.contains('roundeditor__attachments--empty'), true);
assert.equal(uploader.querySelector('.roundeditor__drop-overlay strong').textContent, '파일 업로드');
assert.equal(uploader.querySelector('.roundeditor__list-section-heading'), null);
assert.match(uploader.querySelector('.roundeditor__attachments-policy').textContent, /파일 제한 : 10MB/);
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

const imageItem = document.createElement('li');
imageItem.className = 'xefu-file xefu-file-image';
imageItem.dataset.fileSrl = '77';
imageItem.innerHTML = '<strong class="xefu-file-name">cover.png</strong><span class="xefu-file-info"><span class="xefu-file-size">10KB</span><span><span class="xefu-thumbnail"></span></span><span><input type="checkbox" data-file-srl="77"></span><button class="xefu-act-set-cover" data-file-srl="77" title="대표 이미지로 설정"></button></span>';
uploader.querySelector('.xefu-list-images ul')?.appendChild(imageItem);
await new Promise(resolve => queueMicrotask(resolve));
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
videoItem.innerHTML = '<span class="xefu-file-name">clip.mov</span><span class="xefu-file-info"><span>1MB</span><input type="checkbox"></span>';
uploader.querySelector('.xefu-list-files ul')?.appendChild(videoItem);
// Allow the list observer to decorate a video that has no server thumbnail.
await new Promise(resolve => queueMicrotask(resolve));
assert.equal(uploader.querySelector('.xefu-list-images .xefu-file-video-play') !== null, true);
assert.match(uploader.querySelector('.xefu-list-images .xefu-file-video-play use').getAttribute('href'), /attachment-icons\.svg#play$/);
assert.equal(uploader.classList.contains('roundeditor__attachments--has-files'), true);
assert.equal(uploader.querySelector('.roundeditor__attachments-actions .fileinput-button') !== null, true);
await clickMedia(videoItem.querySelector('.xefu-thumbnail'));
assert.equal(videoItem.classList.contains('selected'), true);
await clickMedia(videoItem.querySelector('.xefu-thumbnail'));
assert.equal(videoItem.classList.contains('selected'), false);
const videoCheckbox = videoItem.querySelector('input[type="checkbox"]');
videoCheckbox.checked = true;
videoCheckbox.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
assert.equal(uploader.querySelector('.roundeditor__attachment-action--insert').hidden, false);
assert.equal(uploader.querySelector('.roundeditor__attachment-action--delete').hidden, false);
uploader.querySelector('.roundeditor__attachment-action--insert').click();
assert.equal(insertProxyClicks, 1);
videoCheckbox.checked = false;
videoCheckbox.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
assert.equal(uploader.querySelector('.roundeditor__attachment-action--insert').hidden, true);

const file = new dom.window.File(['png'], 'progress.png', { type: 'image/png' });
const upload = { files: [file], loaded: 0, total: 100 };
handlers.fileuploadadd({}, upload);
assert.match(wrapper.querySelector('.roundeditor__upload-placeholder').textContent, /0%/);
upload.loaded = 61;
handlers.fileuploadprogress({}, upload);
assert.match(wrapper.querySelector('.roundeditor__upload-placeholder').textContent, /61%/);
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
const progressSerialized = serializeDocument(bridge.view.state.doc, schema);
assert.match(progressSerialized, /src="\/progress.png"/);
assert.match(progressSerialized, /<\/p><p>\u00a0<\/p><p>\u00a0<\/p>$/);
assert.match(serializeDocument(bridge.view.state.doc, schema), /data-file-srl="88"/);

const rejectedFile = new dom.window.File(['too large'], 'rejected.mp4', { type: 'video/mp4' });
const rejectedUpload = { files: [rejectedFile], submit() {} };
handlers.fileuploadadd({}, rejectedUpload);
assert.match(wrapper.querySelector('.roundeditor__upload-placeholder').textContent, /0%/);
await new Promise(resolve => setTimeout(resolve, 0));
assert.equal(wrapper.querySelector('.roundeditor__upload-placeholder'), null);

bridge.view.destroy();
console.log('roundeditor attachment list contract passed');
