function requestUrl() {
    return window.request_uri || window.location.pathname || '/';
}

export function normalizeRhymixUrl(value) {
    return String(value || '').replaceAll('&amp;', '&').replaceAll('&#039;', "'");
}

export function normalizeRhymixAssetUrl(value) {
    const url = normalizeRhymixUrl(value);
    if (!url.startsWith('./')) return url;
    try {
        const base = new URL(window.default_url || '/', window.location.href).pathname.replace(/\/?$/, '/');
        return `${base}${url.slice(2)}`;
    } catch (error) {
        return url.slice(1);
    }
}

export function refreshUploader(sequence, response, attempt = 0) {
    if (!window.jQuery) return;
    const container = window.jQuery(`#xefu-container-${sequence}`);
    if (!container.length) return;
    const instance = container.data('xefu-instance') || container.data('instance') || container.data();
    if (typeof instance?.loadFilelist === 'function') {
        container.data('editorStatus', response);
        instance.loadFilelist(container, true);
    } else if (attempt < 20) {
        window.setTimeout(() => refreshUploader(sequence, response, attempt + 1), 100);
    }
}

export function uploadFile(bridge, file, onProgress = () => {}) {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open('POST', requestUrl());
        request.responseType = 'json';
        request.withCredentials = true;
        request.upload?.addEventListener('progress', event => {
            if (event.lengthComputable) onProgress(event.loaded / event.total);
        });
        request.addEventListener('load', () => {
            let response = request.response;
            if (!response && request.responseText) {
                try { response = JSON.parse(request.responseText); }
                catch (error) { reject(new Error('업로드 응답을 읽을 수 없습니다.')); return; }
            }
            const errorCode = Number(response?.error || 0);
            if (request.status < 200 || request.status >= 300 || errorCode !== 0 || !response?.download_url) {
                reject(new Error(response?.message || `파일 업로드에 실패했습니다. (${request.status})`));
                return;
            }
            response.download_url = normalizeRhymixUrl(response.download_url);
            response.source_filename = normalizeRhymixUrl(response.source_filename);
            response.thumbnail_filename = normalizeRhymixAssetUrl(response.thumbnail_filename);
            refreshUploader(bridge.sequence, response);
            resolve(response);
        });
        request.addEventListener('error', () => reject(new Error('파일 업로드 중 네트워크 오류가 발생했습니다.')));
        request.addEventListener('abort', () => reject(new Error('파일 업로드가 취소되었습니다.')));

        const data = new FormData();
        data.append('act', 'procFileUpload');
        data.append('editor_sequence', String(bridge.sequence));
        data.append('Filedata', file, file.name);
        data.append('mid', bridge.config.mid || '');
        data.append('module_srl', String(bridge.config.moduleSrl || 0));
        data.append('upload_target_srl', String(bridge.config.uploadTargetSrl || 0));
        if (bridge.config.csrfToken) data.append('_rx_csrf_token', bridge.config.csrfToken);
        request.send(data);
    });
}

export async function uploadImageFiles(bridge, items, onProgress = () => {}) {
    const results = [];
    for (const [index, item] of items.entries()) {
        const file = item.file || item;
        const response = await uploadFile(bridge, file, progress => onProgress(index, progress));
        results.push({ ...response, dimensions: item.dimensions || null });
    }
    return results;
}
