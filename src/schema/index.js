import { DOMParser as ProseMirrorDOMParser, Schema } from 'prosemirror-model';
import { marks } from './marks.js';
import { nodes } from './nodes.js';
import { normalizeForParse } from './normalize.js';
import { serializeDocument } from './serialize.js';
import { promoteDocumentTextStyles, promoteSliceTextStyles } from './textStyles.js';

export const schema = new Schema({ nodes, marks });

export function parseDocument(html) {
    const template = document.createElement('template');
    template.innerHTML = normalizeForParse(html);
    const doc = ProseMirrorDOMParser.fromSchema(schema).parse(template.content, { preserveWhitespace: 'full' });
    return promoteDocumentTextStyles(doc, schema);
}

export function parseSlice(html) {
    const template = document.createElement('template');
    template.innerHTML = normalizeForParse(html);
    const slice = ProseMirrorDOMParser.fromSchema(schema).parseSlice(template.content, { preserveWhitespace: 'full' });
    return promoteSliceTextStyles(slice, schema);
}

export { normalizeForParse, serializeDocument };
