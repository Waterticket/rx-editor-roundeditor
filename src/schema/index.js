import { DOMParser as ProseMirrorDOMParser, Schema } from 'prosemirror-model';
import { marks } from './marks.js';
import { nodes } from './nodes.js';
import { normalizeForParse } from './normalize.js';
import { serializeDocument } from './serialize.js';

export const schema = new Schema({ nodes, marks });

export function parseDocument(html) {
    const template = document.createElement('template');
    template.innerHTML = normalizeForParse(html);
    return ProseMirrorDOMParser.fromSchema(schema).parse(template.content, { preserveWhitespace: 'full' });
}

export function parseSlice(html) {
    const template = document.createElement('template');
    template.innerHTML = normalizeForParse(html);
    return ProseMirrorDOMParser.fromSchema(schema).parseSlice(template.content, { preserveWhitespace: 'full' });
}

export { normalizeForParse, serializeDocument };
