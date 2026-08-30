import { normalizeRhymixAssetUrl, normalizeRhymixVideoUrl, uploadFile } from './rhymix/upload.js';
import { addTrailingParagraphsAfterInlineMedia } from './mediaInsertion.js';
import {
    addUploadPlaceholder,
    findUploadPlaceholder,
    removeUploadPlaceholder,
    removeUploadPlaceholderFrom,
    updateUploadPlaceholder,
} from './uploadPlaceholders.js';

export const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const VIDEO_EXTENSION = /\.(?:mp4|webm|mov)$/i;

export function isVideoFile(file) {
    const type = String(file?.type || '').toLowerCase();
    return VIDEO_TYPES.has(type) || VIDEO_EXTENSION.test(String(file?.name || ''));
}

export function videoFiles(list) {
    return Array.from(list || []).filter(isVideoFile);
}

export function formatVideoDuration(duration) {
    if (!Number.isFinite(duration) || duration <= 0) return '';
    const totalSeconds = Math.max(1, Math.round(duration));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const shortTime = `${minutes}:${String(seconds).padStart(2, '0')}`;
    return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}` : shortTime;
}

export function videoAlignmentAttrs(align) {
    if (align === 'center') {
        return { align, display: 'block', marginLeft: 'auto', marginRight: 'auto' };
    }
    if (align === 'right') {
        return { align, display: 'block', marginLeft: 'auto', marginRight: '0' };
    }
    if (align === 'left') {
        return { align, display: 'block', marginLeft: '0', marginRight: 'auto' };
    }
    return { align: null, display: null, marginLeft: null, marginRight: null };
}

export function videoAttrsFromUpload(upload, maxWidth = Infinity, align = null) {
    const gifVideo = String(upload.original_type || '').toLowerCase() === 'image/gif';
    return {
        src: normalizeRhymixVideoUrl(upload.download_url),
        poster: normalizeRhymixAssetUrl(upload.thumbnail_filename) || null,
        caption: '',
        width: null,
        height: null,
        displayWidth: null,
        displayHeight: null,
        fileSrl: upload.file_srl ? String(upload.file_srl) : null,
        preload: 'metadata',
        controls: !gifVideo,
        muted: gifVideo,
        autoplay: gifVideo,
        loop: gifVideo,
        playsinline: gifVideo,
        ...videoAlignmentAttrs(align),
    };
}

export function insertUploadedVideo(bridge, upload, {
    align = null,
    position = null,
    placeholderId = null,
    insertionMode = 'paragraph',
} = {}) {
    const { state } = bridge.view;
    const video = state.schema.nodes.video.create(videoAttrsFromUpload(upload, Infinity, align));
    const insertedNode = insertionMode === 'paragraph'
        ? state.schema.nodes.paragraph.create(null, video)
        : video;
    const placeholderPosition = placeholderId ? findUploadPlaceholder(state, placeholderId) : null;
    let transaction = placeholderPosition !== null || position !== null
        ? state.tr.replaceRangeWith(placeholderPosition ?? position, placeholderPosition ?? position, insertedNode)
        : state.tr.replaceSelectionWith(insertedNode);
    if (placeholderId) transaction = removeUploadPlaceholderFrom(transaction, placeholderId);
    if (insertionMode === 'paragraph') {
        transaction = addTrailingParagraphsAfterInlineMedia(transaction, [video]);
    }
    bridge.view.dispatch(transaction.scrollIntoView());
    bridge.view.focus();
    return true;
}

export async function uploadVideoFile(bridge, item, onProgress = () => {}) {
    const response = await uploadFile(bridge, item.file || item, onProgress);
    return { ...response, dimensions: item.dimensions || null };
}

export function uploadVideosAt(bridge, files, position = null) {
    for (const file of videoFiles(files)) {
        const placeholderId = addUploadPlaceholder(
            bridge.view,
            'video',
            bridge.config.labels?.videoUploading || 'Uploading video…',
            position ?? bridge.view.state.selection.from
        );
        uploadVideoFile(bridge, file, progress => {
            updateUploadPlaceholder(bridge.view, placeholderId, progress);
        })
            .then(upload => insertUploadedVideo(bridge, upload, { position, placeholderId }))
            .catch(error => {
                removeUploadPlaceholder(bridge.view, placeholderId);
                window.alert?.(error.message);
            });
    }
}
