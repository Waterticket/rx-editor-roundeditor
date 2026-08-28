import { normalizeRhymixAssetUrl, uploadFile } from './rhymix/upload.js';
import { findUploadPlaceholder, removeUploadPlaceholderFrom } from './uploadPlaceholders.js';

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
    const naturalWidth = Number(upload.dimensions?.width || upload.width || 0);
    const naturalHeight = Number(upload.dimensions?.height || upload.height || 0);
    const scale = naturalWidth > 0 ? Math.min(1, maxWidth / naturalWidth) : 1;
    const width = naturalWidth > 0 ? Math.max(24, Math.round(naturalWidth * scale)) : null;
    const height = naturalHeight > 0 ? Math.max(24, Math.round(naturalHeight * scale)) : null;
    const gifVideo = String(upload.original_type || '').toLowerCase() === 'image/gif';
    return {
        src: upload.download_url,
        poster: normalizeRhymixAssetUrl(upload.thumbnail_filename) || null,
        width,
        height,
        displayWidth: width ? `${width}px` : null,
        displayHeight: height ? `${height}px` : null,
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

export function insertUploadedVideo(bridge, upload, { align = null, position = null, placeholderId = null } = {}) {
    const { state } = bridge.view;
    const measuredWidth = bridge.view.dom.clientWidth;
    const maxWidth = measuredWidth > 40 ? measuredWidth - 40 : 640;
    const video = state.schema.nodes.video.create(videoAttrsFromUpload(upload, maxWidth, align));
    const placeholderPosition = placeholderId ? findUploadPlaceholder(state, placeholderId) : null;
    let transaction = placeholderPosition !== null || position !== null
        ? state.tr.replaceRangeWith(placeholderPosition ?? position, placeholderPosition ?? position, video)
        : state.tr.replaceSelectionWith(video);
    if (placeholderId) transaction = removeUploadPlaceholderFrom(transaction, placeholderId);
    bridge.view.dispatch(transaction.scrollIntoView());
    bridge.view.focus();
    return true;
}

export async function uploadVideoFile(bridge, item, onProgress = () => {}) {
    const response = await uploadFile(bridge, item.file || item, onProgress);
    return { ...response, dimensions: item.dimensions || null };
}
