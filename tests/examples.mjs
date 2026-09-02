import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const approvals = [
    {
        id: 'example.insert-server-data', required: true,
        config: { customerName: '홍길동', orderNumber: 'ORDER-1', status: '결제 완료' },
    },
    {
        id: 'example.writing-shortcuts', required: true,
        config: { locale: 'ko-KR', authorName: '김작성', department: '편집팀' },
    },
    {
        id: 'example.quick-template-panel', required: true,
        config: { templates: [{ label: '테스트 서식', lines: ['첫 문장', '둘째 문장'] }] },
    },
];
const config = {
    editorSequence: 71,
    primaryKeyName: 'document_srl',
    contentKeyName: 'content',
    height: 300,
    allowUpload: false,
    allowHtml: false,
    htmlMode: false,
    approvedExtensions: approvals,
    extensionScripts: [],
};
const dom = new JSDOM(`<!doctype html><html><body><form>
    <input name="document_srl" value="1"><textarea name="content">&lt;p&gt;Start&lt;/p&gt;</textarea>
    <div class="roundeditor" data-editor-sequence="71" data-editor-config='${JSON.stringify(config)}'>
        <div class="roundeditor__loading">Loading</div><div class="roundeditor__surface"></div>
    </div>
</form></body></html>`, { url: 'https://example.test/write', runScripts: 'outside-only' });

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
        value: class {
            constructor(callback) { this.callback = callback; }
            observe() { this.callback([{ contentRect: { width: 900 } }]); }
            disconnect() {}
        },
        configurable: true,
    },
});
dom.window.Range.prototype.getClientRects = () => [];
dom.window.Range.prototype.getBoundingClientRect = () => ({ top: 0, right: 0, bottom: 0, left: 0, width: 0, height: 0 });
document.elementFromPoint = () => document.querySelector('.ProseMirror');

window.eval(await readFile(new URL('../js/roundeditor-bootstrap.js', import.meta.url), 'utf8'));
for (const filename of ['insert-server-data.js', 'writing-shortcuts.js', 'quick-template-panel.js']) {
    window.eval(await readFile(new URL(`../docs/examples/${filename}`, import.meta.url), 'utf8'));
}
await import('../dist/roundeditor.min.js');

for (let index = 0; index < 20 && !window.RoundEditor.get(71); index += 1) {
    await new Promise(resolve => setTimeout(resolve, 0));
}
const editor = window.RoundEditor.get(71);
assert.ok(editor);

assert.equal(editor.commands.execute('example.insert-server-data.insertOrderSummary'), true);
assert.match(editor.content.getHTML(), /고객: 홍길동/);
assert.match(editor.content.getHTML(), /주문번호: ORDER-1/);

assert.equal(editor.commands.execute('example.writing-shortcuts.insertSignature'), true);
assert.match(editor.content.getHTML(), /김작성 \/ 편집팀/);

const shortcut = new dom.window.KeyboardEvent('keydown', {
    key: 'T', code: 'KeyT', keyCode: 84, ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true,
});
document.querySelector('.ProseMirror').dispatchEvent(shortcut);
assert.equal(shortcut.defaultPrevented, true);

assert.equal(editor.commands.can('example.quick-template-panel.openTemplates'), true);
assert.equal(editor.commands.execute('example.quick-template-panel.openTemplates'), true);
const templateButton = document.querySelector('.example-quick-templates button');
assert.equal(templateButton.textContent, '테스트 서식');
templateButton.click();
assert.match(editor.content.getHTML(), /첫 문장/);
assert.match(editor.content.getHTML(), /둘째 문장/);
assert.equal(document.querySelector('.roundeditor__panel').hidden, true);

editor._destroy();
console.log('roundeditor Extension API examples passed.');
