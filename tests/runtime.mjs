import assert from 'node:assert/strict';
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
</body></html>`, { url: 'https://example.test/' });

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

window.editorGetContent = sequence => `previous:${sequence}`;
window.editorGetIFrame = sequence => `previous-frame:${sequence}`;

await import('../dist/roundeditor.js');

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
assert.equal(wrapper.querySelector('.roundeditor__toolbar').getAttribute('role'), 'toolbar');
assert.equal(
    wrapper.querySelectorAll('.roundeditor__toolbar-primary .roundeditor__tool').length,
    wrapper.querySelectorAll('.roundeditor__toolbar-primary .roundeditor__tool > svg.roundeditor__icon').length
);
assert.equal(wrapper.querySelector('[data-command="fontSize"] svg').dataset.icon, 'fontSize');
assert.equal(wrapper.querySelector('[data-command="link"] svg').dataset.icon, 'link');
assert.equal(wrapper.querySelector('[data-command="image"]'), null);
assert.equal(wrapper.querySelector('[data-command="video"]'), null);
assert.equal(wrapper.querySelector('.roundeditor__counter').textContent, 'Characters : 5');

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
assert.match(window.editorGetContent(7), /<table><tbody><tr><td><p>\u00a0<\/p><\/td><td><p>\u00a0<\/p><\/td><\/tr>/);
assert.equal(wrapper.querySelector('.roundeditor__counter').textContent, 'Characters : 0');

window._getCkeInstance(7).setData('<p>위</p><p></p><p></p><p>아래</p>');
assert.equal(window.editorGetContent(7), '<p>위</p><p>\u00a0</p><p>\u00a0</p><p>아래</p>');
assert.equal(wrapper.querySelector('.roundeditor__counter').textContent, 'Characters : 3');

console.log('roundeditor runtime contract passed');
