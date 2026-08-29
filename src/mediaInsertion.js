import { Fragment } from 'prosemirror-model';
import { TextSelection } from 'prosemirror-state';
import { canSplit } from 'prosemirror-transform';

const TRAILING_BLANK_PARAGRAPH_COUNT = 2;

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
