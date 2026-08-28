import { Fragment, Mark, Slice } from 'prosemirror-model';
import { parseStyleDeclarations } from './attributes.js';

const STYLE_MARKS = {
    'font-size': 'fontSize',
    color: 'fontColor',
    'background-color': 'bgColor',
    'font-family': 'fontFamily',
};
const ATTRIBUTE_ORDER_KEY = '__roundeditorAttributeOrder';

function promoteTextNode(node, schema) {
    const rawMark = node.marks.find(mark => mark.type === schema.marks.rawMark && mark.attrs.tag === 'span');
    if (!rawMark?.attrs.extra?.style) return node;

    const declarations = parseStyleDeclarations(rawMark.attrs.extra.style);
    const promoted = [];
    const remaining = [];
    for (const [property, value] of declarations) {
        const markName = STYLE_MARKS[property];
        if (markName) promoted.push(schema.marks[markName].create({ value }));
        else remaining.push([property, value]);
    }
    if (!promoted.length) return node;

    const marks = node.marks.filter(mark => (
        mark !== rawMark && !promoted.some(candidate => candidate.type === mark.type)
    ));
    const extra = { ...rawMark.attrs.extra };
    if (remaining.length) extra.style = `${remaining.map(([property, value]) => `${property}:${value}`).join(';')};`;
    else {
        delete extra.style;
        if (Array.isArray(extra[ATTRIBUTE_ORDER_KEY])) {
            extra[ATTRIBUTE_ORDER_KEY] = extra[ATTRIBUTE_ORDER_KEY].filter(name => name !== 'style');
        }
    }
    const meaningfulExtra = Object.entries(extra).some(([name, value]) => (
        name !== ATTRIBUTE_ORDER_KEY || (Array.isArray(value) && value.length > 0)
    ));
    if (meaningfulExtra) marks.push(schema.marks.rawMark.create({ ...rawMark.attrs, extra }));
    marks.push(...promoted);
    return schema.text(node.text, Mark.setFrom(marks));
}

function promoteNode(node, schema) {
    if (node.isText) return promoteTextNode(node, schema);
    if (node.isLeaf) return node;
    return node.type.create(node.attrs, Fragment.fromArray(node.content.content.map(child => promoteNode(child, schema))), node.marks);
}

export function promoteDocumentTextStyles(doc, schema) {
    return promoteNode(doc, schema);
}

export function promoteSliceTextStyles(slice, schema) {
    const content = Fragment.fromArray(slice.content.content.map(node => promoteNode(node, schema)));
    return new Slice(content, slice.openStart, slice.openEnd);
}
