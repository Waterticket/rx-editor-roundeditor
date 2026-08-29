import { EditorState } from 'prosemirror-state';

function stickerKey(node) {
    return `${node.attrs.stickerSrl || ''}|${node.attrs.fileSrl || ''}`;
}

function videoKey(node) {
    return `${node.attrs.fileSrl || ''}|${node.attrs.src || ''}`;
}

function normalizedValue(value) {
    if (value === null || value === undefined || value === '') return '';
    const string = String(value).trim();
    return /^-?0(?:\.0+)?(?:px|em|rem|%)?$/i.test(string) ? '0' : string;
}

function sameMarks(left, right) {
    return left.length === right.length && left.every((mark, index) => mark.eq(right[index]));
}

function samePresentation(left, right, attributes) {
    return sameMarks(left.marks, right.marks) && attributes.every(name => (
        normalizedValue(left.attrs[name]) === normalizedValue(right.attrs[name])
    ));
}

const STICKER_PRESENTATION_ATTRS = [
    'stickerSrl', 'fileSrl', 'mediaType', 'src', 'title', 'width', 'height', 'displayWidth', 'displayHeight',
];

const VIDEO_PRESENTATION_ATTRS = [
    'src', 'poster', 'width', 'height', 'displayWidth', 'displayHeight', 'fileSrl', 'preload',
    'controls', 'muted', 'autoplay', 'loop', 'playsinline', 'align', 'display', 'marginLeft', 'marginRight',
];

export function preserveTransientMedia(currentDoc, nextDoc) {
    const currentStickers = new Map();
    const currentVideos = new Map();
    currentDoc.descendants(node => {
        if (node.type.name === 'sticker') {
            const key = stickerKey(node);
            if (!currentStickers.has(key)) currentStickers.set(key, []);
            currentStickers.get(key).push(node);
        } else if (node.type.name === 'video') {
            const key = videoKey(node);
            if (!currentVideos.has(key)) currentVideos.set(key, []);
            currentVideos.get(key).push(node);
        }
    });
    if (!currentStickers.size && !currentVideos.size) return nextDoc;

    let transaction = EditorState.create({ doc: nextDoc }).tr;
    nextDoc.descendants((node, position) => {
        let matchingNode = null;
        if (node.type.name === 'sticker') {
            matchingNode = currentStickers.get(stickerKey(node))?.find(current => (
                samePresentation(current, node, STICKER_PRESENTATION_ATTRS)
            ));
        } else if (node.type.name === 'video') {
            matchingNode = currentVideos.get(videoKey(node))?.find(current => (
                samePresentation(current, node, VIDEO_PRESENTATION_ATTRS)
            ));
        }
        if (!matchingNode || node.eq(matchingNode)) return;
        transaction = transaction.setNodeMarkup(position, null, matchingNode.attrs, matchingNode.marks);
    });
    return transaction.doc;
}

export function updateEditorDocument(view, parsedDoc) {
    const nextDoc = preserveTransientMedia(view.state.doc, parsedDoc);
    if (view.state.doc.eq(nextDoc)) return false;

    const currentContent = view.state.doc.content;
    const nextContent = nextDoc.content;
    let start = currentContent.findDiffStart(nextContent);
    let { a: endCurrent, b: endNext } = currentContent.findDiffEnd(nextContent);
    if (endCurrent < start && currentContent.size < nextContent.size) {
        endNext = start + (endNext - endCurrent);
        endCurrent = start;
    } else if (endNext < start) {
        endCurrent = start + (endCurrent - endNext);
        endNext = start;
    }

    let transaction;
    try {
        transaction = view.state.tr.replace(start, endCurrent, nextDoc.slice(start, endNext));
    } catch (error) {
        transaction = view.state.tr.replaceWith(0, currentContent.size, nextContent);
    }
    if (!transaction.doc.eq(nextDoc)) {
        transaction = view.state.tr.replaceWith(0, currentContent.size, nextContent);
    }
    transaction.setMeta('addToHistory', false);
    view.dispatch(transaction);
    return true;
}
