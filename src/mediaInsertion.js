import { Fragment } from 'prosemirror-model';
import { TextSelection } from 'prosemirror-state';
import { canSplit } from 'prosemirror-transform';

const TRAILING_BLANK_PARAGRAPH_COUNT = 2;
const LEADING_BLANK_PARAGRAPH_COUNT = 2;
const INLINE_MEDIA_NAMES = new Set(['image', 'audio', 'video']);

function findNodePosition(doc, target) {
    let position = null;
    doc.descendants((node, nodePosition) => {
        if (node === target) {
            position = nodePosition;
            return false;
        }
        return true;
    });
    return position;
}

function paragraphPosition(doc, position) {
    const resolved = doc.resolve(position);
    for (let depth = resolved.depth; depth > 0; depth--) {
        if (resolved.node(depth).isTextblock) return resolved.before(depth);
    }
    return null;
}

function blankParagraphs(schema, count) {
    return Array.from(
        { length: count },
        () => schema.nodes.paragraph.create()
    );
}

function insertTrailingBlankParagraphs(transaction, position) {
    const paragraphType = transaction.doc.type.schema.nodes.paragraph;
    let existingCount = 0;
    let endPosition = position;
    let paragraph = transaction.doc.nodeAt(endPosition);
    while (paragraph?.type === paragraphType && paragraph.content.size === 0) {
        existingCount++;
        endPosition += paragraph.nodeSize;
        paragraph = transaction.doc.nodeAt(endPosition);
    }
    const missingCount = Math.max(0, TRAILING_BLANK_PARAGRAPH_COUNT - existingCount);
    if (missingCount) {
        transaction = transaction.insert(
            endPosition,
            Fragment.fromArray(blankParagraphs(transaction.doc.type.schema, missingCount))
        );
    }
    return transaction.setSelection(TextSelection.create(transaction.doc, position + 1));
}

export function addTrailingParagraphsAfterInlineMedia(transaction, mediaNodes) {
    const lastMedia = mediaNodes[mediaNodes.length - 1];
    const mediaPosition = lastMedia ? findNodePosition(transaction.doc, lastMedia) : null;
    if (mediaPosition === null) return transaction;

    const splitPosition = mediaPosition + lastMedia.nodeSize;
    const resolved = transaction.doc.resolve(splitPosition);
    if (!resolved.parent.isTextblock || !canSplit(transaction.doc, splitPosition)) return transaction;

    transaction = transaction.split(splitPosition);
    const mediaPositionAfterSplit = findNodePosition(transaction.doc, lastMedia);
    if (mediaPositionAfterSplit === null) return transaction;
    const mediaParagraphPosition = paragraphPosition(transaction.doc, mediaPositionAfterSplit);
    if (mediaParagraphPosition === null) return transaction;
    const mediaParagraph = transaction.doc.nodeAt(mediaParagraphPosition);
    if (!mediaParagraph?.isTextblock) return transaction;

    return insertTrailingBlankParagraphs(
        transaction,
        mediaParagraphPosition + mediaParagraph.nodeSize
    );
}

export function addTrailingParagraphsAfterBlockMedia(transaction, mediaNode) {
    const mediaPosition = findNodePosition(transaction.doc, mediaNode);
    if (mediaPosition === null) return transaction;
    return insertTrailingBlankParagraphs(transaction, mediaPosition + mediaNode.nodeSize);
}

export function insertBlankParagraphBeforeMedia(view, mediaPosition) {
    const target = view.state.doc.nodeAt(mediaPosition);
    const resolved = view.state.doc.resolve(mediaPosition);
    let paragraphStart = null;
    let paragraphDepth = null;
    for (let depth = resolved.depth; depth > 0; depth--) {
        if (resolved.node(depth).type === view.state.schema.nodes.paragraph) {
            paragraphStart = resolved.before(depth);
            paragraphDepth = depth;
            break;
        }
    }
    if (paragraphStart === null) return false;
    let transaction = view.state.tr;
    if (paragraphDepth !== null && resolved.index(paragraphDepth) > 0) {
        if (!canSplit(transaction.doc, mediaPosition)) return false;
        transaction = transaction.split(mediaPosition);
        const movedMediaPosition = target ? findNodePosition(transaction.doc, target) : null;
        paragraphStart = movedMediaPosition === null ? null : paragraphPosition(transaction.doc, movedMediaPosition);
        if (paragraphStart === null) return false;
    }
    transaction = transaction.insert(
        paragraphStart,
        Fragment.fromArray(blankParagraphs(view.state.schema, LEADING_BLANK_PARAGRAPH_COUNT))
    );
    view.dispatch(transaction.setSelection(TextSelection.create(transaction.doc, paragraphStart + 1)).scrollIntoView());
    view.focus();
    return true;
}

function endsWithInlineMedia(node) {
    let current = node;
    while (current?.childCount) current = current.lastChild;
    return Boolean(current && INLINE_MEDIA_NAMES.has(current.type.name));
}

export function mediaNeedsLeadingParagraph(doc, mediaPosition) {
    const resolved = doc.resolve(mediaPosition);
    let paragraphDepth = null;
    for (let depth = resolved.depth; depth > 0; depth--) {
        if (resolved.node(depth).type.name === 'paragraph') {
            paragraphDepth = depth;
            break;
        }
    }
    if (paragraphDepth === null) return false;

    const paragraph = resolved.node(paragraphDepth);
    const mediaIndex = resolved.index(paragraphDepth);
    if (mediaIndex > 0) return INLINE_MEDIA_NAMES.has(paragraph.child(mediaIndex - 1).type.name);

    const paragraphPosition = resolved.before(paragraphDepth);
    if (paragraphPosition === 0) return true;
    return endsWithInlineMedia(doc.resolve(paragraphPosition).nodeBefore);
}
