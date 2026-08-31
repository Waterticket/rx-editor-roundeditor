import { Fragment } from 'prosemirror-model';
import { TextSelection } from 'prosemirror-state';
import { canSplit } from 'prosemirror-transform';

const TRAILING_BLANK_PARAGRAPH_COUNT = 2;
const LEADING_BLANK_PARAGRAPH_COUNT = 2;

export function isNonTextItem(node) {
    return Boolean(node && (
        node.type.name === 'table'
        || (!node.isText && node.isAtom && node.type.name !== 'hardBreak')
    ));
}

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

export function insertBlankParagraphBefore(view, position) {
    const target = view.state.doc.nodeAt(position);
    const resolved = view.state.doc.resolve(position);
    let paragraphStart = null;
    let paragraphDepth = null;
    for (let depth = resolved.depth; depth > 0; depth--) {
        if (resolved.node(depth).type === view.state.schema.nodes.paragraph) {
            paragraphStart = resolved.before(depth);
            paragraphDepth = depth;
            break;
        }
    }
    // Tables and other block node views live directly in the document rather
    // than inside a paragraph. In that case the node position itself is the
    // insertion point.
    if (paragraphStart === null && resolved.parent === view.state.doc) paragraphStart = position;
    if (paragraphStart === null) return false;
    let transaction = view.state.tr;
    if (paragraphDepth !== null && resolved.index(paragraphDepth) > 0) {
        if (!canSplit(transaction.doc, position)) return false;
        transaction = transaction.split(position);
        const movedMediaPosition = target ? findNodePosition(transaction.doc, target) : null;
        paragraphStart = movedMediaPosition === null ? null : paragraphPosition(transaction.doc, movedMediaPosition);
    }
    transaction = transaction.insert(
        paragraphStart,
        Fragment.fromArray(blankParagraphs(view.state.schema, LEADING_BLANK_PARAGRAPH_COUNT))
    );
    view.dispatch(transaction.setSelection(TextSelection.create(transaction.doc, paragraphStart + 1)).scrollIntoView());
    view.focus();
    return true;
}

export const insertBlankParagraphBeforeMedia = insertBlankParagraphBefore;

function endsWithNonTextItem(node) {
    let current = node;
    while (current) {
        if (isNonTextItem(current)) return true;
        if (!current.childCount) return false;
        current = current.lastChild;
    }
    return false;
}

export function nonTextItemNeedsLeadingParagraph(doc, itemPosition) {
    const item = doc.nodeAt(itemPosition);
    if (!isNonTextItem(item)) return false;
    const resolved = doc.resolve(itemPosition);
    let paragraphDepth = null;
    for (let depth = resolved.depth; depth > 0; depth--) {
        if (resolved.node(depth).type.name === 'paragraph') {
            paragraphDepth = depth;
            break;
        }
    }

    if (paragraphDepth !== null) {
        const itemIndex = resolved.index(paragraphDepth);
        if (itemIndex > 0) return isNonTextItem(resolved.node(paragraphDepth).child(itemIndex - 1));
        const paragraphPosition = resolved.before(paragraphDepth);
        if (paragraphPosition === 0) return true;
        return endsWithNonTextItem(doc.resolve(paragraphPosition).nodeBefore);
    }

    if (resolved.parent !== doc) return false;
    if (itemPosition === 0) return true;
    return endsWithNonTextItem(doc.resolve(itemPosition).nodeBefore);
}

export function mediaNeedsLeadingParagraph(doc, mediaPosition) {
    return nonTextItemNeedsLeadingParagraph(doc, mediaPosition);
}

export function tableNeedsLeadingParagraph(doc, tablePosition) {
    return nonTextItemNeedsLeadingParagraph(doc, tablePosition);
}
