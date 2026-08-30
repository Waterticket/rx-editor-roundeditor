import { NodeSelection, Plugin } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

const RANGE_HIGHLIGHTED_MEDIA = new Set(['audio', 'sticker', 'video']);

export function mediaSelectionDecorations(state) {
    const { doc, selection } = state;
    if (selection.empty || selection instanceof NodeSelection) return DecorationSet.empty;

    const decorations = [];
    doc.nodesBetween(selection.from, selection.to, (node, position) => {
        if (!RANGE_HIGHLIGHTED_MEDIA.has(node.type.name)) return;
        if (position < selection.from || position + node.nodeSize > selection.to) return;
        decorations.push(Decoration.node(position, position + node.nodeSize, {
            class: 'roundeditor__media--range-selected',
        }));
    });
    return decorations.length ? DecorationSet.create(doc, decorations) : DecorationSet.empty;
}

export function mediaSelectionPlugin() {
    return new Plugin({
        props: {
            decorations: mediaSelectionDecorations,
        },
    });
}
