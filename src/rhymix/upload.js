function requestUrl() {
    return window.request_uri || window.location.pathname || '/';
}

export function normalizeRhymixUrl(value) {
    const url = String(value || '').replaceAll('&amp;', '&').replaceAll('&#039;', "'");
    // Rhymix's legacy file module returns `index.php?...` without a leading
    // slash.  That works only when the page is at the site root; on nested
    // routes such as /notice/30099 the browser resolves it to /notice/index.php
    // and Firefox reports the media as unavailable.  Keep external, data and
    // other relative content URLs untouched, but make the known file endpoint
    // site-root relative so every browser requests the same resource.
    if (/^(?:\.\/)?index\.php(?:[?#]|$)/i.test(url)) {
        return `/${url.replace(/^\.\//, '')}`;
    }
    return url;
}

export function normalizeRhymixVideoUrl(value) {
    const url = normalizeRhymixUrl(value);
    if (!url) return url;
    try {
        const parsed = new URL(url, 'https://roundeditor.invalid/');
        if (parsed.searchParams.get('module') !== 'file'
            || parsed.searchParams.get('act') !== 'procFileDownload') return url;
        if (!parsed.searchParams.has('force_inline')) parsed.searchParams.set('force_inline', 'Y');
        const origin = parsed.origin === 'https://roundeditor.invalid' ? '' : parsed.origin;
        return `${origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch (error) {
        return url;
    }
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
            if (!response) {
                // responseText throws InvalidStateError when responseType is
                // "json" (for example, nginx returns an HTML 413 response).
                // Never let that exception strand the upload promise at 100%.
                let responseText = '';
                try { responseText = request.responseText || ''; }
                catch (error) { /* responseType=json does not expose responseText */ }
                if (responseText) {
                    try { response = JSON.parse(responseText); }
                    catch (error) {
                        reject(new Error(request.status
                            ? `파일 업로드에 실패했습니다. (${request.status})`
                            : '업로드 응답을 읽을 수 없습니다.'));
                        return;
                    }
                }
            }
            const errorCode = Number(response?.error || 0);
            if (request.status < 200 || request.status >= 300 || errorCode !== 0 || !response?.download_url) {
                reject(new Error(response?.message || `파일 업로드에 실패했습니다. (${request.status})`));
                return;
            }
            response.download_url = normalizeRhymixUrl(response.download_url);
            response.source_filename = normalizeRhymixUrl(response.source_filename);
            response.thumbnail_filename = normalizeRhymixAssetUrl(response.thumbnail_filename);
            resolve(response);
            // A legacy uploader refresh must not prevent the completed upload
            // from resolving and replacing its editor placeholder.
            try { refreshUploader(bridge.sequence, response); }
            catch (error) { console.warn('[roundeditor] Attachment list refresh failed.', error); }
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
