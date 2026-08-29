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
const { normalizeRhymixVideoUrl } = await import('../src/rhymix/upload.js');

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

function fillEmptyParagraphs(html) {
    return html.replace(/<p((?:\s[^<>]*)?)><\/p>/g, '<p$1>\u00a0</p>');
}

function clearBlankParagraphSpaces(html) {
    return html.replace(/<p((?:\s[^<>]*)?)>[\s\u00a0]*<\/p>/gu, '<p$1></p>');
}

function clearBlockBoundarySpaces(html) {
    const template = document.createElement('template');
    template.innerHTML = clearBlankParagraphSpaces(html);
    for (const block of template.content.querySelectorAll('p,h1,h2,h3,h4,h5,h6')) {
        const textNodes = [];
        const walker = document.createTreeWalker(block, 4);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) textNodes.push(node);
        if (!textNodes.length) continue;
        textNodes[0].nodeValue = textNodes[0].nodeValue.replace(/^[\s\u00a0]+/u, '');
        const last = textNodes.at(-1);
        last.nodeValue = last.nodeValue.replace(/[\s\u00a0]+$/u, '');
    }
    for (const node of Array.from(template.content.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE && /^[\s\u00a0]*$/u.test(node.nodeValue)) node.remove();
    }
    return template.innerHTML;
}

const documents = runPhp('./documents.php');
assert.ok(documents.length > 0, 'document regression requires at least one local document');
assert.ok(documents.length <= 500, 'document regression returned more than its 500 document limit');

const cleaned = cleanBatch(documents.map(document => document.content));
const serialized = cleaned.map(html => serializeDocument(parseDocument(html), schema));
const cleanedAfterRoundTrip = cleanBatch(serialized);

// The editor canonicalizes legacy file URLs such as `index.php?...` to a
// site-root URL so media keeps working on nested routes (notably Firefox).
// Compare against that canonical form while retaining the fixed-point check
// below for the HTML filter itself.
const canonicalized = cleanBatch(cleaned.map(html => clearBlockBoundarySpaces(html).replace(
    /(<video\b[^>]*\bsrc=")([^"]*)(")/gi,
    (_match, prefix, url, suffix) => `${prefix}${normalizeRhymixVideoUrl(url)}${suffix}`
)));

for (const [index, document] of documents.entries()) {
    assert.equal(
        cleanedAfterRoundTrip[index],
        fillEmptyParagraphs(canonicalized[index]),
        `document ${document.document_srl}: editor round trip changed clean HTML`
    );
    assert.equal(
        cleanedAfterRoundTrip[index],
        serialized[index],
        `document ${document.document_srl}: editor output is not an HTMLFilter fixed point`
    );
}

console.log(`roundeditor document regression passed (${documents.length}/500 available documents)`);
