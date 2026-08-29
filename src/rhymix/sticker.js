export function stickerRequest(action, params = {}) {
    return new Promise((resolve, reject) => {
        if (typeof window.exec_json !== 'function') {
            reject(new Error('The Rhymix sticker API is unavailable.'));
            return;
        }
        window.exec_json(`sticker.${action}`, params, resolve, response => {
            reject(new Error(response?.message || 'The sticker request failed.'));
            return false;
        });
    });
}

export function pickerPacks(config = {}) {
    return stickerRequest('getStickerPickerList', { mid: 'sticker' })
        .then(response => Array.isArray(response?.sticker) ? response.sticker : []);
}

export function stickerElements(config, stickerSrl) {
    return stickerRequest('getStickerElemList', {
        mid: 'sticker',
        sticker_srl: stickerSrl,
    }).then(response => Array.isArray(response?.stickerImage) ? response.stickerImage : []);
}

export function resolveStickerItems(config, identities) {
    if (!identities.length) return Promise.resolve([]);
    return stickerRequest('resolveStickers', {
        mid: 'sticker',
        stickers: JSON.stringify(identities),
    }).then(response => Array.isArray(response?.stickers) ? response.stickers : []);
}
