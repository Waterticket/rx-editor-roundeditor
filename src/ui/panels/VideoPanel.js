import { insertUploadedVideo, isVideoFile, MAX_VIDEO_SIZE, uploadVideoFile } from '../../videos.js';
import { addUploadPlaceholder, removeUploadPlaceholder } from '../../uploadPlaceholders.js';

function measureVideo(url) {
    if (!url) return Promise.resolve(null);
    return new Promise(resolve => {
        const video = document.createElement('video');
        let settled = false;
        const finish = dimensions => {
            if (settled) return;
            settled = true;
            video.removeAttribute('src');
            video.load();
            resolve(dimensions);
        };
        video.addEventListener('loadedmetadata', () => finish({
            width: video.videoWidth,
            height: video.videoHeight,
        }), { once: true });
        video.addEventListener('error', () => finish(null), { once: true });
        video.preload = 'metadata';
        video.src = url;
    });
}

function button(label, className = '') {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = `roundeditor__button${className ? ` ${className}` : ''}`;
    element.textContent = label;
    return element;
}

export function createVideoPanel({ bridge, labels, onClose }) {
    const panel = document.createElement('div');
    panel.className = 'roundeditor__video-panel';
    let item = null;
    let busy = false;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov';
    input.hidden = true;

    const dropzone = document.createElement('button');
    dropzone.type = 'button';
    dropzone.className = 'roundeditor__video-dropzone';
    dropzone.textContent = labels.videoDropzone;
    dropzone.addEventListener('click', () => input.click());

    const previewHost = document.createElement('div');
    previewHost.className = 'roundeditor__video-preview';
    previewHost.hidden = true;

    const error = document.createElement('p');
    error.className = 'roundeditor__panel-error';
    error.hidden = true;

    const actions = document.createElement('div');
    actions.className = 'roundeditor__video-actions';
    const alignLabel = document.createElement('label');
    alignLabel.className = 'roundeditor__field';
    alignLabel.appendChild(document.createTextNode(labels.imageAlign));
    const align = document.createElement('select');
    for (const [value, text] of [['left', labels.alignLeft], ['center', labels.alignCenter], ['right', labels.alignRight]]) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        align.appendChild(option);
    }
    alignLabel.appendChild(align);
    const cancel = button(labels.cancel, 'roundeditor__button--text');
    const insert = button(labels.insert, 'roundeditor__button--primary');
    insert.disabled = true;
    actions.append(alignLabel, cancel, insert);

    function revoke() {
        if (item?.preview && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(item.preview);
    }

    async function stage(file) {
        error.hidden = true;
        if (!isVideoFile(file)) {
            error.textContent = labels.videoOnly;
            error.hidden = false;
            return;
        }
        if (file.size > MAX_VIDEO_SIZE) {
            error.textContent = labels.videoTooLarge;
            error.hidden = false;
            return;
        }
        revoke();
        const preview = typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : '';
        item = { file, preview, dimensions: null };
        previewHost.replaceChildren();
        const video = document.createElement('video');
        video.src = preview;
        video.controls = false;
        video.autoplay = false;
        video.muted = true;
        video.playsInline = true;
        video.preload = 'metadata';
        video.setAttribute('loading', 'lazy');
        video.addEventListener('play', () => video.pause());
        video.addEventListener('loadedmetadata', () => {
            if (video.duration > 0 && Number.isFinite(video.duration)) {
                try { video.currentTime = Math.min(0.01, video.duration / 2); } catch (seekError) { /* metadata remains visible */ }
            }
        }, { once: true });
        const name = document.createElement('span');
        name.textContent = file.name;
        previewHost.append(video, name);
        previewHost.hidden = false;
        insert.disabled = false;
        item.dimensions = await measureVideo(preview);
        if (item.dimensions?.width && item.dimensions?.height) {
            name.textContent = `${file.name} · ${item.dimensions.width}×${item.dimensions.height}`;
        }
    }

    input.addEventListener('change', () => {
        if (input.files?.[0]) stage(input.files[0]);
        input.value = '';
    });
    for (const eventName of ['dragenter', 'dragover']) {
        dropzone.addEventListener(eventName, event => {
            event.preventDefault();
            dropzone.classList.add('roundeditor__video-dropzone--active');
        });
    }
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('roundeditor__video-dropzone--active'));
    dropzone.addEventListener('drop', event => {
        event.preventDefault();
        dropzone.classList.remove('roundeditor__video-dropzone--active');
        const file = event.dataTransfer?.files?.[0];
        if (file) stage(file);
    });
    cancel.addEventListener('click', onClose);
    insert.addEventListener('click', async () => {
        if (busy || !item) return;
        busy = true;
        error.hidden = true;
        insert.disabled = true;
        const placeholderId = addUploadPlaceholder(bridge.view, 'video', labels.videoUploading);
        try {
            const upload = await uploadVideoFile(bridge, item, progress => {
                previewHost.style.setProperty('--roundeditor-upload-progress', `${Math.round(progress * 100)}%`);
            });
            insertUploadedVideo(bridge, upload, { align: align.value, placeholderId });
            onClose();
        } catch (uploadError) {
            removeUploadPlaceholder(bridge.view, placeholderId);
            error.textContent = uploadError.message;
            error.hidden = false;
            busy = false;
            insert.disabled = false;
        }
    });
    panel.addEventListener('roundeditor:close', revoke, { once: true });

    panel.append(input, dropzone, previewHost, error, actions);
    return panel;
}
