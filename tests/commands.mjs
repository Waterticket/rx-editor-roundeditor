import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { history, undo } from 'prosemirror-history';
import { EditorState, NodeSelection, TextSelection } from 'prosemirror-state';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
Object.defineProperties(globalThis, {
    window: { value: dom.window, configurable: true },
    document: { value: dom.window.document, configurable: true },
    Node: { value: dom.window.Node, configurable: true },
});

const { parseDocument, schema, serializeDocument } = await import('../src/schema/index.js');
const {
    changeIndent,
    clearFormatting,
    exitInlineNode,
    insertHorizontalRule,
    insertTable,
    setLink,
    setParagraphFormat,
    setTextStyle,
    setTextblockAttrs,
    splitAfterInlineNode,
    splitEditorEnter,
    toggleBlockquote,
    toggleList,
    toggleTextMark,
} = await import('../src/ui/commands.js');

function editor(html = '<p>Hello</p>', selectText = false) {
    let state = EditorState.create({ doc: parseDocument(html), plugins: [history()] });
    if (selectText) state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1, state.doc.content.size - 1)));
    return {
        get state() { return state; },
        dispatch(transaction) { state = state.apply(transaction); },
        html() { return serializeDocument(state.doc, schema); },
        run(command) { return command(state, transaction => this.dispatch(transaction)); },
    };
}

const inline = editor('<p>Hello</p>', true);
inline.run(toggleTextMark(schema.marks.strong));
inline.run(toggleTextMark(schema.marks.em));
inline.run(toggleTextMark(schema.marks.underline));
inline.run(toggleTextMark(schema.marks.strike));
inline.run(setTextStyle(schema.marks.fontSize, '18px'));
inline.run(setTextStyle(schema.marks.fontColor, '#e25041'));
inline.run(setTextStyle(schema.marks.bgColor, '#ffff00'));
inline.run(setTextStyle(schema.marks.fontFamily, 'Arial, sans-serif'));
assert.equal(
    inline.html(),
    '<p><strong><em><u><s><span style="font-size:18px;color:#e25041;background-color:#ffff00;font-family:Arial, sans-serif;">Hello</span></s></u></em></strong></p>'
);
inline.run(clearFormatting);
assert.equal(inline.html(), '<p>Hello</p>');

const paragraph = editor();
paragraph.run(setTextblockAttrs({ align: 'center', lineHeight: '1.8' }));
paragraph.run(changeIndent(1));
assert.equal(paragraph.html(), '<p style="text-align:center;line-height:1.8;margin-left:40px;">Hello</p>');
paragraph.run(changeIndent(-1));
assert.equal(paragraph.html(), '<p style="text-align:center;line-height:1.8;">Hello</p>');

const heading = editor();
heading.run(setParagraphFormat('h2'));
assert.equal(heading.html(), '<h2>Hello</h2>');
heading.run(setParagraphFormat('normal'));
assert.equal(heading.html(), '<p>Hello</p>');

const quote = editor();
quote.run(toggleBlockquote(schema));
assert.equal(quote.html(), '<blockquote><p>Hello</p></blockquote>');
quote.run(toggleBlockquote(schema));
assert.equal(quote.html(), '<p>Hello</p>');

const list = editor();
list.run(toggleList(schema.nodes.bulletList, schema.nodes.listItem));
assert.equal(list.html(), '<ul><li><p>Hello</p></li></ul>');
list.run(toggleList(schema.nodes.bulletList, schema.nodes.listItem));
assert.equal(list.html(), '<p>Hello</p>');

const orderedList = editor('<ol><li><p>첫째</p></li></ol>');
orderedList.dispatch(orderedList.state.tr.setSelection(TextSelection.create(orderedList.state.doc, 5)));
assert.equal(orderedList.run(splitEditorEnter), true);
orderedList.dispatch(orderedList.state.tr.insertText('둘째'));
assert.equal(orderedList.html(), '<ol><li><p>첫째</p></li><li><p>둘째</p></li></ol>');

const link = editor('<p>Hello</p>', true);
link.run(setLink('https://example.test/', true));
assert.equal(link.html(), '<p><a href="https://example.test/" target="_blank" rel="noreferrer noopener">Hello</a></p>');

const rule = editor();
rule.run(insertHorizontalRule);
assert.match(rule.html(), /<hr \/>/);

const table = editor('<p></p>');
table.run(insertTable(2, 3));
assert.equal((table.html().match(/<td>/g) || []).length, 6);

const historyEditor = editor('<p>Hello</p>', true);
historyEditor.run(toggleTextMark(schema.marks.strong));
assert.equal(undo(historyEditor.state, transaction => historyEditor.dispatch(transaction)), true);
assert.equal(historyEditor.html(), '<p>Hello</p>');

const imageExit = editor('<p><img src="/right.png" alt="" /></p>');
imageExit.dispatch(imageExit.state.tr.setSelection(NodeSelection.create(imageExit.state.doc, 1)));
assert.equal(imageExit.run(exitInlineNode(1)), true);
assert.equal(imageExit.state.selection instanceof TextSelection, true);
assert.equal(imageExit.state.selection.from, 2);

const imageEnter = editor('<p><img src="/right.png" alt="" /></p>');
imageEnter.dispatch(imageEnter.state.tr.setSelection(NodeSelection.create(imageEnter.state.doc, 1)));
assert.equal(imageEnter.run(splitAfterInlineNode), true);
imageEnter.dispatch(imageEnter.state.tr.insertText('입력됨'));
assert.equal(imageEnter.html(), '<p><img src="/right.png" alt="" /></p><p>입력됨</p>');
assert.doesNotMatch(imageEnter.html(), /contenteditable/);

console.log('roundeditor Phase 2 commands passed');
