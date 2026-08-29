import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM(`<!doctype html><html><body><form>
    <div class="roundeditor"><div class="roundeditor__surface"></div></div>
    <div id="xefu-container-7" data-autoinsert-types='{"image":true,"audio":true,"video":true}'>
        <div class="xefu-dropzone"><p class="xefu-dropzone-message"></p><span class="xefu-btn fileinput-button"><span><i class="xi-icon"></i>선택</span><input type="file"></span></div><div class="xefu-controll"><div>0개 첨부됨</div><div><input type="button" class="xefu-btn xefu-act-link-selected" value="본문 삽입"><input type="button" class="xefu-btn xefu-act-delete-selected" value="선택 삭제"></div></div><div class="xefu-list"><div class="xefu-list-images"><ul></ul></div><div class="xefu-list-files"><ul></ul></div></div>
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
            uploadedImages: '업로드된 미디어',
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
assert.ok(uploader);
assert.notEqual(uploader.parentElement, wrapper);
assert.equal(uploader.querySelector('.roundeditor__attachments-heading strong').textContent, '파일 첨부');
assert.equal(uploader.dataset.autoinsertTypes, '{"image":false,"audio":true,"video":false}');
assert.deepEqual(jqueryData.autoinsertTypes, { image: false, audio: true, video: false });
assert.equal(uploader.classList.contains('roundeditor__attachments--empty'), true);
assert.equal(uploader.querySelector('.roundeditor__drop-overlay strong').textContent, '파일 업로드');
assert.equal(uploader.querySelector('.roundeditor__uploaded-images-heading').textContent, '업로드된 미디어');
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
assert.match(serializeDocument(bridge.view.state.doc, schema), /src="\/progress.png"/);
assert.match(serializeDocument(bridge.view.state.doc, schema), /data-file-srl="88"/);

bridge.view.destroy();
console.log('roundeditor attachment list contract passed');
