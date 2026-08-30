import { Fragment, Slice } from 'prosemirror-model';
import { normalizeRhymixUrl, uploadImageFiles } from './rhymix/upload.js';
import {
    addUploadPlaceholder,
    findUploadPlaceholder,
    removeUploadPlaceholder,
    removeUploadPlaceholderFrom,
} from './uploadPlaceholders.js';
import { addTrailingParagraphsAfterInlineMedia } from './mediaInsertion.js';

export function imageFiles(list) {
    return Array.from(list || []).filter(file => String(file.type || '').startsWith('image/'));
}

export function imageAttrsFromUpload(upload) {
    return {
        src: normalizeRhymixUrl(upload.download_url),
        alt: upload.source_filename || '',
        width: null,
        height: null,
        displayWidth: null,
        displayHeight: null,
        fileSrl: upload.file_srl ? String(upload.file_srl) : null,
        editorComponent: 'image_link',
    };
}

function textblockPosition(doc, position) {
    const $position = doc.resolve(Math.min(position, doc.content.size));
    for (let depth = $position.depth; depth > 0; depth--) {
        if ($position.node(depth).isTextblock) return $position.before(depth);
    }
    return null;
}

export function insertUploadedImages(bridge, uploads, {
    position = null,
    align = null,
    placeholderId = null,
    insertionMode = 'paragraph',
} = {}) {
    if (!uploads.length) return false;
    const { state } = bridge.view;
    const nodes = uploads.map(upload => state.schema.nodes.image.create(imageAttrsFromUpload(upload)));
    const insertedNodes = insertionMode === 'paragraph'
        ? nodes.map(node => state.schema.nodes.paragraph.create(null, node))
        : nodes;
    const slice = new Slice(Fragment.fromArray(insertedNodes), 0, 0);
    let transaction = state.tr;
    const placeholderPosition = placeholderId ? findUploadPlaceholder(state, placeholderId) : null;
    const insertionPosition = placeholderPosition ?? (position === null ? state.selection.from : position);
    const paragraphPosition = textblockPosition(state.doc, insertionPosition);
    if (placeholderPosition !== null || position !== null) {
        transaction = transaction.replaceRange(insertionPosition, insertionPosition, slice);
    } else {
        transaction = transaction.replaceSelection(slice);
    }
    if (align && paragraphPosition !== null) {
        const paragraph = transaction.doc.nodeAt(paragraphPosition);
        if (paragraph?.isTextblock) {
            transaction = transaction.setNodeMarkup(paragraphPosition, null, { ...paragraph.attrs, align });
        }
    }
    if (placeholderId) transaction = removeUploadPlaceholderFrom(transaction, placeholderId);
    if (insertionMode === 'paragraph') {
        transaction = addTrailingParagraphsAfterInlineMedia(transaction, nodes);
    }
    bridge.view.dispatch(transaction.scrollIntoView());
    bridge.view.focus();
    return true;
}

export function uploadImagesAt(bridge, files, position = null) {
    const placeholderId = addUploadPlaceholder(
        bridge.view,
        'image',
        bridge.config.labels?.imageUploading || 'Uploading image…',
        position ?? bridge.view.state.selection.from
    );
    uploadImageFiles(bridge, files.map(file => ({ file })))
        .then(uploads => insertUploadedImages(bridge, uploads, { position, placeholderId }))
        .catch(error => {
            removeUploadPlaceholder(bridge.view, placeholderId);
            window.alert?.(error.message);
        });
}

export function handleImagePaste(bridge, event) {
    if (!bridge.config.allowUpload) return false;
    const files = imageFiles(event.clipboardData?.files);
    if (!files.length) return false;
    event.preventDefault();
    uploadImagesAt(bridge, files);
    return true;
}

export function handleImageDrop(bridge, event, moved) {
    if (!bridge.config.allowUpload || moved) return false;
    const files = imageFiles(event.dataTransfer?.files);
    if (!files.length) return false;
    event.preventDefault();
    const position = bridge.view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos
        ?? bridge.view.state.selection.from;
    uploadImagesAt(bridge, files, position);
    return true;
}
