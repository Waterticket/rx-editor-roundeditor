import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { history, undo } from 'prosemirror-history';
import { EditorState, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    Node: dom.window.Node,
    HTMLElement: dom.window.HTMLElement,
    MutationObserver: dom.window.MutationObserver,
    getComputedStyle: dom.window.getComputedStyle,
});

const { parseDocument, schema, serializeDocument } = await import('../src/schema/index.js');
const { insertTable } = await import('../src/ui/commands.js');
const { addLastColumn, addLastRow, moveAxis, moveTable, setAxisStyle } = await import('../src/table/commands.js');
const { isTableSelected, selectTable, tableContext } = await import('../src/table/context.js');
const { tableEditingUiPlugin } = await import('../src/table/TableEditingPlugin.js');

function editor(html) {
    let state = EditorState.create({ doc: parseDocument(html), plugins: [history()] });
    return {
        get state() { return state; },
        dispatch(tr) { state = state.apply(tr); },
        run(command) { return command(state, tr => this.dispatch(tr)); },
        firstCell() { let pos = 0; state.doc.descendants((node, at) => { if (!pos && node.type.spec.tableRole === 'cell') pos = at; }); this.dispatch(state.tr.setSelection(TextSelection.create(state.doc, pos + 2))); },
        html() { return serializeDocument(state.doc, schema); },
    };
}

const created = editor('<p></p>');
created.run(insertTable(2, 3));
assert.equal((created.html().match(/<td(?:\s|>)/g) || []).length, 6);
created.firstCell();
assert.equal(created.run(addLastRow), true);
assert.equal((created.html().match(/<tr>/g) || []).length, 3);
assert.equal(tableContext(created.state).row, 2);
created.firstCell();
assert.equal(created.run(addLastColumn), true);
assert.equal((created.html().match(/<td(?:\s|>)/g) || []).length, 12);
assert.equal(tableContext(created.state).column, 3);

const styled = editor('<table><tbody><tr><td style="color:red;"><p>A</p></td><td><p>B</p></td></tr><tr><td><p>C</p></td><td><p>D</p></td></tr></tbody></table>');
styled.firstCell();
assert.equal(styled.run(setAxisStyle('row', { 'background-color': '#fef3c7', 'text-align': 'center' })), true);
assert.match(styled.html(), /style="color:red;background-color:#fef3c7;text-align:center;box-sizing:border-box;min-width:40px;padding:8px;border:1px solid rgba\(128,128,128,0.32\);vertical-align:top;"/);
assert.equal(styled.run(moveAxis('row', 0, 1)), true);
assert.match(styled.html(), /<td style="[^"]+"><p style="margin-top:0;margin-bottom:0;">C<\/p><\/td>/);
assert.equal(undo(styled.state, tr => styled.dispatch(tr)), true);
assert.match(styled.html(), /<td style="color:red;background-color:#fef3c7;text-align:center;box-sizing:border-box;min-width:40px;padding:8px;border:1px solid rgba\(128,128,128,0.32\);vertical-align:top;">/);

const resized = editor('<table><tbody><tr><th data-colwidth="352"><p>A</p></th><th><p>B</p></th><th><p>C</p></th></tr><tr><td data-colwidth="352"><p>D</p></td><td style="text-align:right;vertical-align:middle;"><p>E</p></td><td><p>F</p></td></tr></tbody></table>');
const resizedHtml = resized.html();
assert.match(resizedHtml, /^<table style="box-sizing:border-box;width:100%;margin:12px 0;border-collapse:collapse;table-layout:fixed;min-width:552px;">/);
assert.match(resizedHtml, /<th style="width:352px;box-sizing:border-box;min-width:40px;padding:8px;border:1px solid rgba\(128,128,128,0.32\);vertical-align:top;text-align:center;" data-colwidth="352">/);
assert.match(resizedHtml, /<td style="text-align:right;vertical-align:middle;box-sizing:border-box;min-width:40px;padding:8px;border:1px solid rgba\(128,128,128,0.32\);">/);
assert.deepEqual(parseDocument(serializeDocument(parseDocument(resizedHtml), schema)).toJSON(), parseDocument(resizedHtml).toJSON());

const legacyAlignment = editor('<table><tbody><tr><td align="center" valign="bottom"><p>A</p></td></tr></tbody></table>').html();
assert.match(legacyAlignment, /<td align="center" valign="bottom" style="[^"]*vertical-align:bottom;text-align:center;">/);

const selected = editor('<table><tbody><tr><td><p>A</p></td><td><p>B</p></td></tr><tr><td><p>C</p></td><td><p>D</p></td></tr></tbody></table>');
selected.firstCell();
assert.equal(selectTable(tableContext(selected.state), selected.state, tr => selected.dispatch(tr)), true);
assert.equal(isTableSelected(selected.state), true);

const movedTable = editor('<p>Before</p><table><tbody><tr><td><p>Table</p></td></tr></tbody></table><p>After</p>');
movedTable.firstCell();
assert.equal(movedTable.run(moveTable(movedTable.state.doc.content.size)), true);
assert.match(movedTable.html(), /^<p>Before<\/p><p>After<\/p><table(?:\s|>)/);
assert.equal(isTableSelected(movedTable.state), true);
assert.equal(undo(movedTable.state, tr => movedTable.dispatch(tr)), true);
assert.match(movedTable.html(), /^<p>Before<\/p><table(?:\s|>)/);

document.body.innerHTML = '<div class="roundeditor__surface"><div id="table-editor"></div></div>';
const uiState = EditorState.create({
    doc: parseDocument('<table><tbody><tr><td><p>A</p></td><td><p>B</p></td></tr><tr><td><p>C</p></td><td><p>D</p></td></tr></tbody></table>'),
    plugins: [tableEditingUiPlugin({ labels: { rowActions: 'Row actions' } })],
});
const uiView = new EditorView(document.querySelector('#table-editor'), { state: uiState });
let cellPos = 0;
uiView.state.doc.descendants((node, pos) => { if (!cellPos && node.type.spec.tableRole === 'cell') cellPos = pos; });
uiView.dispatch(uiView.state.tr.setSelection(TextSelection.create(uiView.state.doc, cellPos + 2)));
await new Promise(resolve => setTimeout(resolve, 10));
document.querySelector('.roundeditor__table-row').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, button: 0 }));
assert.ok(document.querySelector('.roundeditor__table-menu'));
assert.equal(document.querySelector('.roundeditor__table-row').getAttribute('aria-expanded'), 'true');
assert.equal(document.querySelector('.roundeditor__table-menuitem').textContent, 'Toggle header row');
document.querySelector('.roundeditor__table-select').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, button: 0 }));
assert.equal(isTableSelected(uiView.state), true);
assert.equal(document.querySelector('.roundeditor__table-menuitem').textContent, 'Delete table');
uiView.dom.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }));
assert.equal(uiView.state.doc.firstChild.type, schema.nodes.paragraph);
uiView.destroy();
assert.equal(document.querySelector('.roundeditor__table-overlay'), null);
assert.equal(document.querySelector('.roundeditor__table-menu'), null);

console.log('roundeditor table commands passed');
