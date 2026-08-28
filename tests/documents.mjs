import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
Object.defineProperties(globalThis, {
    window: { value: dom.window, configurable: true },
    document: { value: dom.window.document, configurable: true },
    Node: { value: dom.window.Node, configurable: true },
});

const { parseDocument, schema, serializeDocument } = await import('../src/schema/index.js');

function runPhp(script, input = null) {
    const result = spawnSync('php', [new URL(script, import.meta.url).pathname], {
        input,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
    });
    if (result.status !== 0) throw new Error(result.stderr || `${script} exited with ${result.status}`);
    return JSON.parse(result.stdout);
}

function cleanBatch(htmlList) {
    return runPhp('./clean.php', JSON.stringify(htmlList));
}

const documents = runPhp('./documents.php');
assert.ok(documents.length > 0, 'document regression requires at least one local document');
assert.ok(documents.length <= 500, 'document regression returned more than its 500 document limit');

const cleaned = cleanBatch(documents.map(document => document.content));
const serialized = cleaned.map(html => serializeDocument(parseDocument(html), schema));
const cleanedAfterRoundTrip = cleanBatch(serialized);

for (const [index, document] of documents.entries()) {
    assert.equal(
        cleanedAfterRoundTrip[index],
        cleaned[index],
        `document ${document.document_srl}: editor round trip changed clean HTML`
    );
    assert.equal(
        cleanedAfterRoundTrip[index],
        serialized[index],
        `document ${document.document_srl}: editor output is not an HTMLFilter fixed point`
    );
}

console.log(`rxeditor document regression passed (${documents.length}/500 available documents)`);
