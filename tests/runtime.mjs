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
assert.equal(form.getAttribute('editor_sequence'), '7');
assert.equal(form.elements.namedItem('use_editor').value, 'Y');
assert.equal(form.elements.namedItem('use_html').value, 'Y');
assert.equal(window.editorGetContent(7), '<p>Hello</p>');
assert.equal(window.editorGetContentTextarea_xe(7), 'Hello');
assert.equal(window.editorRelKeys[7].content, form.elements.namedItem('content'));
assert.equal(window._getCkeInstance(7).mode, 'wysiwyg');

window._getCkeInstance(7).setData('<p>Updated</p>');
assert.equal(window.editorGetContent(7), '<p>Updated</p>');
assert.equal(form.elements.namedItem('content').value, '<p>Updated</p>');

window.editorReplaceHTML(frame, '<p>Inserted</p>');
assert.match(window.editorGetContent(7), /Inserted/);
assert.equal(window.editorGetContent(999), 'previous:999');
assert.equal(window.editorGetIFrame(999), 'previous-frame:999');
window._getCkeInstance(7).setData('<p><strong>서식</strong>과 <abbr title="약어">원문</abbr></p>');
assert.match(window.editorGetContent(7), /<strong>서식<\/strong>/);
assert.match(window.editorGetContent(7), /<abbr title="약어">원문<\/abbr>/);

window._getCkeInstance(7).insertHtml('<img src="image.png" alt="삽입 이미지">');
assert.match(window.editorGetContent(7), /<img src="image.png" alt="삽입 이미지" \/>/);

console.log('roundeditor runtime contract passed');
