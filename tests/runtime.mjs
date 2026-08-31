import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const config = {
    editorSequence: 7,
    primaryKeyName: 'document_srl',
    contentKeyName: 'content',
    height: 300,
    contentFont: 'inherit',
    contentFontSize: '15px',
    contentLineHeight: '1.5',
    contentWordBreak: 'normal',
    contentParagraphSpacing: '0',
    allowUpload: true,
    allowHtml: false,
    htmlMode: true,
    contentCss: ['/editor-content.css', 'https://example.test/editor-content.css'],
};
const dom = new JSDOM(`<!doctype html><html><body>
    <form>
        <input name="document_srl" value="123">
        <textarea name="content">&lt;p&gt;Hello&lt;/p&gt;</textarea>
        <div class="roundeditor roundeditor--light"
            data-editor-sequence="7"
            data-editor-config='${JSON.stringify(config)}'>
            <div class="roundeditor__loading">Loading</div>
            <div class="roundeditor__surface"></div>
        </div>
    </form>
</body></html>`, { url: 'https://example.test/', runScripts: 'outside-only' });

let resizeObserverCallback;

Object.defineProperties(globalThis, {
    window: { value: dom.window, configurable: true },
    document: { value: dom.window.document, configurable: true },
    navigator: { value: dom.window.navigator, configurable: true },
    Node: { value: dom.window.Node, configurable: true },
    MutationObserver: { value: dom.window.MutationObserver, configurable: true },
    getComputedStyle: { value: dom.window.getComputedStyle, configurable: true },
    innerHeight: { value: 800, configurable: true },
    pageYOffset: { value: 0, configurable: true },
    ResizeObserver: {
        value: class ResizeObserver {
            constructor(callback) { this.callback = callback; resizeObserverCallback = callback; }
            observe() { this.callback([{ contentRect: { width: 320 } }]); }
            disconnect() {}
        },
        configurable: true,
    },
});

window.editorGetContent = sequence => `previous:${sequence}`;
window.editorGetIFrame = sequence => `previous-frame:${sequence}`;
window.eval(await readFile(new URL('../js/ckeditor4-bootstrap.js', import.meta.url), 'utf8'));
const editor1Proxy = window.CKEDITOR.instances.editor1;
let editor1Ready = false;
editor1Proxy.on('instanceReady', () => { editor1Ready = true; });

await import('../dist/roundeditor.min.js');
await Promise.resolve();

const wrapper = document.querySelector('.roundeditor');
const form = document.querySelector('form');
const frame = window.editorGetIFrame(7);

assert.equal(wrapper.classList.contains('roundeditor--ready'), true);
assert.equal(wrapper.querySelector('.roundeditor__loading'), null);
assert.equal(frame.classList.contains('ProseMirror'), true);
assert.equal(frame.dataset.editorSequence, '7');
assert.equal(frame.getAttribute('spellcheck'), 'false');
assert.equal(form.getAttribute('editor_sequence'), '7');
assert.equal(form.elements.namedItem('use_editor').value, 'Y');
assert.equal(form.elements.namedItem('use_html').value, 'Y');
assert.equal(window.editorGetContent(7), '<p>Hello</p>');
assert.equal(window.editorGetContentTextarea_xe(7), 'Hello');
assert.equal(window.editorRelKeys[7].content, form.elements.namedItem('content'));
assert.equal(window._getCkeInstance(7).mode, 'wysiwyg');
assert.equal(window.CKEDITOR.instances.editor1, editor1Proxy);
assert.equal(window.CKEDITOR.instances.roundeditor_7, editor1Proxy);
assert.equal(editor1Ready, true);
assert.equal(wrapper.querySelector('.roundeditor__toolbar').getAttribute('role'), 'toolbar');
assert.equal(wrapper.classList.contains('roundeditor--compact'), true);
assert.equal(wrapper.classList.contains('roundeditor--narrow'), true);
assert.equal(
    wrapper.querySelectorAll('.roundeditor__toolbar-primary .roundeditor__tool').length,
    wrapper.querySelectorAll('.roundeditor__toolbar-primary .roundeditor__tool > svg.roundeditor__icon').length
);
assert.equal(wrapper.querySelector('[data-command="link"] svg').dataset.icon, 'link');
assert.equal(wrapper.querySelector('[data-command="image"]'), null);
assert.equal(wrapper.querySelector('[data-command="video"]'), null);
assert.equal(wrapper.querySelector('.roundeditor__counter').textContent, 'Characters : 5');
assert.equal(wrapper.querySelector('[data-command="source"]'), null);
assert.equal(document.querySelectorAll('link[data-roundeditor-content-css]').length, 1);
assert.equal(document.querySelector('link[data-roundeditor-content-css]').href, 'https://example.test/editor-content.css');

wrapper.querySelector('[data-more-group="text"]').click();
assert.equal(wrapper.querySelector('.roundeditor__toolbar-more [data-command="fontSize"] svg').dataset.icon, 'fontSize');
assert.deepEqual(
    [...wrapper.querySelectorAll('.roundeditor__toolbar-more [data-command]')].map(element => element.dataset.command),
    ['italic', 'underline', 'strike', 'fontSize', 'lineHeight', 'textColor', 'backgroundColor', 'fontFamily', 'clearFormatting']
);
wrapper.querySelector('[data-more-group="text"]').click();

wrapper.querySelector('[data-more-group="right"]').click();
assert.deepEqual(
    [...wrapper.querySelectorAll('.roundeditor__toolbar-more [data-command]')].map(element => element.dataset.command),
    ['fullscreen', 'help']
);
wrapper.querySelector('[data-more-group="right"]').click();

resizeObserverCallback([{ contentRect: { width: 1000 } }]);
assert.equal(wrapper.classList.contains('roundeditor--compact'), false);
assert.ok(wrapper.querySelector('.roundeditor__tool-group--text [data-command="italic"]'));
wrapper.querySelector('[data-more-group="text"]').click();
assert.deepEqual(
    [...wrapper.querySelectorAll('.roundeditor__toolbar-more [data-command]')].map(element => element.dataset.command),
    ['fontFamily', 'clearFormatting']
);
wrapper.querySelector('[data-more-group="text"]').click();
wrapper.querySelector('[data-more-group="right"]').click();
assert.deepEqual(
    [...wrapper.querySelectorAll('.roundeditor__toolbar-more [data-command]')].map(element => element.dataset.command),
    ['help']
);
wrapper.querySelector('[data-more-group="right"]').click();

wrapper.querySelector('[data-command="selectAll"]').click();
wrapper.querySelector('[data-command="bold"]').click();
assert.equal(window.editorGetContent(7), '<p><strong>Hello</strong></p>');
wrapper.querySelector('[data-command="undo"]').click();
assert.equal(window.editorGetContent(7), '<p>Hello</p>');
wrapper.querySelector('[data-command="redo"]').click();
assert.equal(window.editorGetContent(7), '<p><strong>Hello</strong></p>');
wrapper.querySelector('[data-more-group="paragraph"]').click();
assert.equal(
    wrapper.querySelectorAll('.roundeditor__toolbar-more .roundeditor__tool').length,
    wrapper.querySelectorAll('.roundeditor__toolbar-more .roundeditor__tool > svg.roundeditor__icon').length
);
assert.ok(wrapper.querySelector('[data-command="alignLeft"] .roundeditor__align-icon--left'));
assert.ok(wrapper.querySelector('[data-command="alignCenter"] .roundeditor__align-icon--center'));
assert.ok(wrapper.querySelector('[data-command="alignRight"] .roundeditor__align-icon--right'));
wrapper.querySelector('[data-command="alignCenter"]').click();
assert.equal(wrapper.querySelector('[data-command="alignCenter"]').getAttribute('aria-pressed'), 'true');
assert.equal(window.editorGetContent(7), '<p style="text-align:center;"><strong>Hello</strong></p>');

window._getCkeInstance(7).setData('<p>Updated</p>');
assert.equal(window.editorGetContent(7), '<p>Updated</p>');
assert.equal(form.elements.namedItem('content').value, '<p>Updated</p>');

const replacedContent = document.createElement('input');
replacedContent.type = 'hidden';
replacedContent.name = 'content';
form.elements.namedItem('content').replaceWith(replacedContent);
window._getCkeInstance(7).setData('<p>Live field</p>');
assert.equal(replacedContent.value, '<p>Live field</p>');
assert.equal(window.editorRelKeys[7].content, replacedContent);

window.editorRelKeys = undefined;
window.editorMode = undefined;
window._getCkeInstance = sequence => `late-instance:${sequence}`;
window.editorGetContent = sequence => `late-content:${sequence}`;
wrapper.querySelector('[data-command="selectAll"]').click();
wrapper.querySelector('[data-command="bold"]').click();
assert.equal(window._getCkeInstance(7).mode, 'wysiwyg');
assert.equal(window.editorGetContent(7), '<p><strong>Live field</strong></p>');
assert.equal(window.editorGetContent(999), 'previous:999');
assert.equal(window.editorRelKeys[7].content, replacedContent);

window.editorReplaceHTML(frame, '<p>Inserted</p>');
assert.match(window.editorGetContent(7), /Inserted/);
assert.equal(window.editorGetContent(999), 'previous:999');
assert.equal(window.editorGetIFrame(999), 'previous-frame:999');
window._getCkeInstance(7).setData('<p><strong>서식</strong>과 <abbr title="약어">원문</abbr></p>');
assert.match(window.editorGetContent(7), /<strong>서식<\/strong>/);
assert.match(window.editorGetContent(7), /<abbr title="약어">원문<\/abbr>/);

window._getCkeInstance(7).insertHtml('<img src="image.png" alt="삽입 이미지">');
assert.match(window.editorGetContent(7), /<img src="image.png" alt="삽입 이미지" \/>/);
assert.doesNotMatch(window.editorGetContent(7), /roundeditor-content-image__caption/);

let pastedValue = '';
const pasteEvent = window.CKEDITOR.instances.editor1.fire('paste', { dataValue: 'https://example.test/' });
window.CKEDITOR.instances.editor1.on('paste', event => {
    pastedValue = event.data.dataValue;
    event.stop();
});
const stoppedPaste = window.CKEDITOR.instances.editor1.fire('paste', { dataValue: 'https://example.test/' });
assert.equal(pasteEvent.stopped, false);
assert.equal(pastedValue, 'https://example.test/');
assert.equal(stoppedPaste.stopped, true);

let insertedValue = '';
window.CKEDITOR.instances.editor1.on('insertHtml', event => { insertedValue = event.data.dataValue; });
window.CKEDITOR.instances.editor1.insertHtml('<p>Compatibility insert</p>');
assert.equal(insertedValue, '<p>Compatibility insert</p>');
const notification = window.CKEDITOR.instances.editor1.showNotification('Loading', 'progress', 0);
notification.update({ progress: 50, message: 'Loading' });
assert.match(wrapper.querySelector('.roundeditor__notification').textContent, /50%/);
notification.hide();

window._getCkeInstance(7).setData('<p></p>');
window._getCkeInstance(7).insertHtml('<p><img src="first.png" alt="첫 번째"></p>');
window._getCkeInstance(7).insertHtml('<img src="second.png" alt="두 번째">');
window._getCkeInstance(7).insertHtml('<img src="third.png" alt="세 번째">');
assert.match(
    window.editorGetContent(7),
    /^<p><img src="first\.png" alt="첫 번째" \/><\/p><p><img src="second\.png" alt="두 번째" \/><\/p><p><img src="third\.png" alt="세 번째" \/><\/p>/
);

window._getCkeInstance(7).setData('<p></p>');
window._getCkeInstance(7).insertHtml('<p><img src="newline-first.png" alt="첫 번째"></p>\n');
window._getCkeInstance(7).insertHtml('<p><img src="newline-second.png" alt="두 번째"></p>\n');
window._getCkeInstance(7).insertHtml('<p><img src="newline-third.png" alt="세 번째"></p>\n');
assert.match(
    window.editorGetContent(7),
    /^<p><img src="newline-first\.png" alt="첫 번째" \/><\/p><p><img src="newline-second\.png" alt="두 번째" \/><\/p><p><img src="newline-third\.png" alt="세 번째" \/><\/p>/
);

window._getCkeInstance(7).setData('<p></p>');
window._getCkeInstance(7).insertHtml(
    '<p><img src="batch-first.png" alt="첫 번째"></p>'
    + '<img src="batch-second.png" alt="두 번째"><img src="batch-third.png" alt="세 번째">'
);
assert.match(
    window.editorGetContent(7),
    /^<p><img src="batch-first\.png" alt="첫 번째" \/><\/p><p><img src="batch-second\.png" alt="두 번째" \/><\/p><p><img src="batch-third\.png" alt="세 번째" \/><\/p>/
);

window._getCkeInstance(7).setData('<img src="legacy-direct.png" alt="기존"><p></p>');
window._getCkeInstance(7).insertHtml('<p><img src="new-paragraph.png" alt="신규"></p>');
assert.match(window.editorGetContent(7), /<p><img src="legacy-direct\.png" alt="기존"/);
assert.match(window.editorGetContent(7), /<p><img src="new-paragraph\.png" alt="신규"/);

window._getCkeInstance(7).setData('<p>Link</p>');
wrapper.querySelector('[data-command="selectAll"]').click();
wrapper.querySelector('[data-command="link"]').click();
const linkPanel = wrapper.querySelector('.roundeditor__panel-form');
linkPanel.elements.namedItem('href').value = 'https://example.test/path';
linkPanel.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
assert.equal(
    window.editorGetContent(7),
    '<p><a href="https://example.test/path" target="_blank" rel="noreferrer noopener">Link</a></p>'
);

window._getCkeInstance(7).setData('<p></p>');
wrapper.querySelector('[data-more-group="rich"]').click();
wrapper.querySelector('[data-command="table"]').click();
const tablePanel = wrapper.querySelector('.roundeditor__panel-form');
tablePanel.elements.namedItem('rows').value = '2';
tablePanel.elements.namedItem('columns').value = '2';
tablePanel.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
const insertedTableHtml = window.editorGetContent(7);
assert.equal((insertedTableHtml.match(/<tr>/g) || []).length, 2);
assert.equal((insertedTableHtml.match(/<td(?:\s|>)/g) || []).length, 4);
assert.match(insertedTableHtml, /^<table style="box-sizing:border-box;width:100%;/);
assert.equal(wrapper.querySelector('.roundeditor__counter').textContent, 'Characters : 0');

window._getCkeInstance(7).setData('<p>위</p><p></p><p></p><p>아래</p>');
assert.equal(window.editorGetContent(7), '<p>위</p><p>\u00a0</p><p>\u00a0</p><p>아래</p>');
assert.equal(wrapper.querySelector('.roundeditor__counter').textContent, 'Characters : 3');

console.log('roundeditor runtime contract passed');
