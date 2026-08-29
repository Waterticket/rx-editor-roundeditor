import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
Object.defineProperties(globalThis, {
    window: { value: dom.window, configurable: true },
    document: { value: dom.window.document, configurable: true },
    Node: { value: dom.window.Node, configurable: true },
});

const { beautifyHtml, minifyHtml } = await import('../src/htmlFormatting.js');
const compact = '<div><p>One <strong>bold</strong></p><blockquote><p>Nested</p></blockquote></div><table><tbody><tr><td><p>Cell</p></td></tr></tbody></table>';
const pretty = beautifyHtml(compact);
assert.match(pretty, /^<div>\n  <p>One <strong>bold<\/strong><\/p>/);
assert.match(pretty, /\n    <p>Nested<\/p>\n  <\/blockquote>\n<\/div>\n<table>/);
assert.equal(minifyHtml(pretty), compact);
assert.equal(
    minifyHtml(beautifyHtml('<p>A <strong>B</strong> C</p><pre>line 1\n  line 2</pre>')),
    '<p>A <strong>B</strong> C</p><pre>line 1\n  line 2</pre>'
);
assert.equal(beautifyHtml(''), '');

console.log('roundeditor HTML formatting contract passed');
