import { normalizeRhymixAssetUrl, normalizeRhymixVideoUrl } from './rhymix/upload.js';
import { resolveStickerItems } from './rhymix/sticker.js';

export const DEFAULT_STICKER_SIZE = 100;

export function stickerAttrs(item, packTitle = '') {
    const mediaType = item.type === 'video' ? 'video' : 'image';
    const poster = normalizeRhymixAssetUrl(item.poster || (mediaType === 'image' ? item.url : ''));
    return {
        stickerSrl: String(item.sticker_srl),
        fileSrl: String(item.sticker_file_srl),
        mediaType,
        src: poster,
        videoSrc: mediaType === 'video' ? normalizeRhymixVideoUrl(item.url) : null,
        title: [packTitle, item.name].filter(Boolean).join(' - '),
        width: DEFAULT_STICKER_SIZE,
        height: DEFAULT_STICKER_SIZE,
        displayWidth: `${DEFAULT_STICKER_SIZE}px`,
        displayHeight: `${DEFAULT_STICKER_SIZE}px`,
    };
}

export function insertSticker(bridge, item, packTitle = '') {
    if (!item?.sticker_srl || !item?.sticker_file_srl) return false;
    const node = bridge.view.state.schema.nodes.sticker.create(stickerAttrs(item, packTitle));
    const transaction = bridge.view.state.tr.replaceSelectionWith(node);
    bridge.view.dispatch(transaction.scrollIntoView());
    bridge.view.focus();
    return true;
}

export async function resolveDocumentStickers(bridge) {
    const positions = new Map();
    bridge.view.state.doc.descendants((node, position) => {
        if (node.type !== bridge.view.state.schema.nodes.sticker) return;
        const key = `${node.attrs.stickerSrl}|${node.attrs.fileSrl}`;
        if (!positions.has(key)) positions.set(key, []);
        positions.get(key).push(position);
    });
    if (!positions.size) return [];
    const identities = Array.from(positions.keys(), key => {
        const [sticker_srl, sticker_file_srl] = key.split('|');
        return { sticker_srl, sticker_file_srl };
    });
    const resolved = await resolveStickerItems(bridge.config, identities);
    const byKey = new Map(resolved.map(item => [`${item.sticker_srl}|${item.sticker_file_srl}`, item]));
    let transaction = bridge.view.state.tr;
    for (const [key, nodePositions] of positions) {
        const item = byKey.get(key);
        if (!item?.valid) continue;
        for (const position of nodePositions) {
            const node = transaction.doc.nodeAt(position);
            if (!node || node.type !== bridge.view.state.schema.nodes.sticker) continue;
            transaction = transaction.setNodeMarkup(position, null, {
                ...node.attrs,
                mediaType: item.type === 'video' ? 'video' : 'image',
                src: normalizeRhymixAssetUrl(item.poster || item.url),
                videoSrc: item.type === 'video' ? normalizeRhymixVideoUrl(item.url) : null,
                title: item.title || node.attrs.title,
            }, node.marks);
        }
    }
    if (transaction.docChanged) bridge.view.dispatch(transaction);
    return resolved;
}
