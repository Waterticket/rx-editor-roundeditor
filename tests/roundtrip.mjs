import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
Object.defineProperties(globalThis, {
    window: { value: dom.window, configurable: true },
    document: { value: dom.window.document, configurable: true },
    Node: { value: dom.window.Node, configurable: true },
});

const { normalizeForParse, parseDocument, schema, serializeDocument } = await import('../src/schema/index.js');
const fixtures = JSON.parse(readFileSync(new URL('./golden/roundtrip.json', import.meta.url), 'utf8'));

function cleanBatch(htmlList) {
    const result = spawnSync('php', [new URL('./clean.php', import.meta.url).pathname], {
        input: JSON.stringify(htmlList),
        encoding: 'utf8',
        maxBuffer: 16 * 1024 * 1024,
    });
    if (result.status !== 0) throw new Error(result.stderr || `HTMLFilter helper exited with ${result.status}`);
    return JSON.parse(result.stdout);
}

const cleaned = cleanBatch(fixtures.map(fixture => fixture.input));
for (const [index, fixture] of fixtures.entries()) {
    assert.equal(cleaned[index], fixture.expected, `${fixture.name}: HTMLFilter golden output changed`);
}

const serialized = cleaned.map(html => serializeDocument(parseDocument(html), schema));
const cleanedAfterRoundTrip = cleanBatch(serialized);
for (const [index, fixture] of fixtures.entries()) {
    assert.equal(cleanedAfterRoundTrip[index], cleaned[index], `${fixture.name}: editor round trip changed clean HTML`);
    assert.equal(cleanedAfterRoundTrip[index], serialized[index], `${fixture.name}: editor output is not an HTMLFilter fixed point`);
    const reparsed = parseDocument(serialized[index]);
    assert.deepEqual(reparsed.toJSON(), parseDocument(cleaned[index]).toJSON(), `${fixture.name}: reparse changed the document model`);
}

const cleanedByName = Object.fromEntries(fixtures.map((fixture, index) => [fixture.name, cleaned[index]]));
assert.match(normalizeForParse(cleanedByName['legacy div raw block']), /data-roundeditor-kind="block"/);
assert.match(normalizeForParse(cleanedByName.oembed), /data-roundeditor-kind="block"/);
assert.match(normalizeForParse(cleanedByName['raw inline abbreviation']), /data-roundeditor-kind="inline"/);

const styledText = schema.text('병합', [
    schema.marks.fontSize.create({ value: '18px' }),
    schema.marks.fontColor.create({ value: '#E25041' }),
]);
const styledDocument = schema.node('doc', null, [schema.node('paragraph', null, [styledText])]);
assert.equal(
    serializeDocument(styledDocument, schema),
    '<p><span style="font-size: 18px; color: rgb(226, 80, 65);">병합</span></p>'
);

console.log(`roundeditor round-trip contract passed (${fixtures.length} golden cases)`);
