import { imageFiles, insertUploadedImages } from './images.js';
import { svgIcon } from './icons.js';
import { normalizeRhymixAssetUrl, normalizeRhymixUrl, normalizeRhymixVideoUrl } from './rhymix/upload.js';
import { addUploadPlaceholder, removeUploadPlaceholder, updateUploadPlaceholder } from './uploadPlaceholders.js';
import { formatVideoDuration, insertUploadedVideo, isVideoFile } from './videos.js';

const FALLBACK_LABELS = {
    attachments: 'Attachments',
    attachmentsHelp: 'Images and videos are inserted at the cursor after upload.',
    attachmentsDropTitle: 'Drag files here or click to upload',
    attachmentsDropOr: 'or',
    attachmentsSelectFile: 'Choose files',
    attachmentsDropOverlay: 'Upload files',
    attachmentsCountCurrent: 'Current',
    attachmentsCountSuffix: ' files',
    attachmentNotUsed: 'This media is not inserted in the body.',
    imageUploading: 'Uploading image…',
    videoUploading: 'Uploading video…',
    imageProcessing: 'Processing image…',
    videoProcessing: 'Processing video…',
    videoDuration: 'Video duration',
    cancel: 'Cancel',
    cancelUpload: 'Cancel upload',
};

function mediaType(file) {
    if (imageFiles([file]).length) return 'image';
    if (isVideoFile(file)) return 'video';
    return null;
}

function displayFileSize(size) {
    const bytes = Number(size);
    if (!Number.isFinite(bytes) || bytes < 1) return '0Byte';
    const units = ['Byte', 'KB', 'MB', 'GB'];
    const unit = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    const value = bytes / (1024 ** unit);
    return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)}${units[unit]}`;
}

function responseResult(data) {
    let result = data?.result ?? data?._response?.result;
    if (!result && typeof data?.response === 'function') result = data.response()?.result;
    if (typeof result === 'string') {
        try { result = JSON.parse(result); }
        catch (error) { return null; }
    }
    if (result && !result.download_url && Array.isArray(result.files)) result = result.files[0];
    return result && Number(result.error || 0) === 0 ? result : null;
}

function normalizedUpload(result) {
    return {
        ...result,
        download_url: normalizeRhymixUrl(result.download_url),
        source_filename: normalizeRhymixUrl(result.source_filename),
        thumbnail_filename: normalizeRhymixAssetUrl(result.thumbnail_filename),
    };
}

function isOembedAttachment(item) {
    const filename = item.querySelector('.xefu-file-name')?.textContent?.trim() || '';
    return /^oembed_/i.test(filename);
}

export class AttachmentList {
    constructor(bridge) {
        this.bridge = bridge;
        this.labels = { ...FALLBACK_LABELS, ...(bridge.config.labels || {}) };
        this.uploads = new WeakMap();
        this.fileEntries = new WeakMap();
        this.activeEntries = new Set();
        this.completedEntries = new Set();
        this.pendingFiles = new Map();
        this.insertionPositions = new WeakMap();
        this.container = bridge.form.querySelector(`#xefu-container-${bridge.sequence}`);
        if (!this.container) return;

        this.disableLegacyMediaInsertion();
        this.decorate();
        this.bindUploader();
    }

    refresh(attempt = 0) {
        if (!this.container || !window.jQuery) return;
        const container = window.jQuery(this.container);
        const instance = container.data('xefu-instance') || container.data('instance') || container.data();
        if (typeof instance?.loadFilelist === 'function') {
            // oEmbed does not return the complete editorStatus payload. Fetch
            // the authoritative file list from the file module instead.
            instance.loadFilelist(container);
        } else if (attempt < 20) {
            window.setTimeout(() => this.refresh(attempt + 1), 100);
        }
    }

    disableLegacyMediaInsertion() {
        let types = {};
        try { types = JSON.parse(this.container.dataset.autoinsertTypes || '{}'); }
        catch (error) { types = {}; }
        this.autoinsertTypes = { ...types };
        this.autoinsertPosition = this.container.dataset.autoinsertPosition === 'inline'
            ? 'inline'
            : 'paragraph';
        types.image = false;
        types.video = false;
        this.container.dataset.autoinsertTypes = JSON.stringify(types);
        window.jQuery?.(this.container).data('autoinsertTypes', types);
    }

    decorate() {
        const colorset = ['auto', 'light', 'dark'].includes(this.bridge.config.colorset)
            ? this.bridge.config.colorset
            : 'light';
        this.container.classList.add('roundeditor__attachments', `roundeditor__attachments--${colorset}`);
        const heading = document.createElement('div');
        heading.className = 'roundeditor__attachments-heading';
        const title = document.createElement('strong');
        title.textContent = this.labels.attachments;
        const help = document.createElement('span');
        help.className = 'roundeditor__attachments-help';
        help.textContent = this.labels.attachmentsHelp;
        const actions = document.createElement('div');
        actions.className = 'roundeditor__attachments-actions';
        actions.hidden = true;
        heading.append(title, help, actions);
        this.headingActions = actions;
        this.container.prepend(heading);
        this.decorateDropzone();
        this.mergeControlsIntoHeading();
        this.addDropOverlay();
        const list = this.container.querySelector('.xefu-list');
        if (list && window.MutationObserver) {
            this.listObserver = new MutationObserver(() => {
                this.syncUploadPreviews();
                this.decorateVideoItems();
                this.decorateCoverButtons();
                this.refreshUsageState();
                this.syncLayout();
            });
            this.listObserver.observe(list, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
        }
        this.bindMediaSelectionFallback();
        this.container.addEventListener('click', event => {
            if (event.target.closest('.xefu-file')) window.setTimeout(() => this.syncSelectionActions(), 0);
        });
        this.container.addEventListener('change', event => {
            if (event.target.matches('.xefu-file input[type="checkbox"]')) this.syncSelectionActions();
        });
        this.decorateVideoItems();
        this.decorateCoverButtons();
        this.refreshUsageState();
        this.syncLayout();
    }

    bindMediaSelectionFallback() {
        this.container.addEventListener('mousedown', event => {
            if (event.button !== 0) return;
            const item = event.target.closest?.('.xefu-file');
            if (!item || !this.container.contains(item) || event.target.closest?.('button, a')) return;
            const checkbox = Boolean(event.target.closest?.('input[type="checkbox"]'));
            if (item.dataset.roundeditorUploadPreview) return;
            event.stopPropagation();
            this.pendingMediaSelection = {
                item,
                selected: item.classList.contains('selected'),
                shiftKey: event.shiftKey,
                additive: true,
                checkbox,
            };
        }, true);
        this.container.addEventListener('click', event => {
            const item = event.target.closest?.('.xefu-file');
            if (!item || !this.container.contains(item) || event.target.closest?.('button, a')) return;
            event.stopPropagation();
            const pointerGesture = this.pendingMediaSelection;
            this.pendingMediaSelection = null;
            const checkbox = Boolean(event.target.closest?.('input[type="checkbox"]'));
            if (item.dataset.roundeditorUploadPreview) return;
            if (checkbox) event.preventDefault();
            this.selectMediaItem(pointerGesture?.item === item ? pointerGesture : {
                item,
                selected: item.classList.contains('selected'),
                shiftKey: event.shiftKey,
                additive: true,
                checkbox,
            });
            if (checkbox) {
                window.setTimeout(() => {
                    this.setMediaItemSelected(item, item.classList.contains('selected'));
                    this.syncLegacySelection();
                    this.syncSelectionActions();
                }, 0);
            }
        }, true);
    }

    selectMediaItem({ item, selected, shiftKey, additive }) {
        const items = Array.from(this.container.querySelectorAll('.xefu-file'));
        const anchor = this.lastSelectedMediaItem && items.includes(this.lastSelectedMediaItem)
            ? this.lastSelectedMediaItem
            : items.find(candidate => candidate.classList.contains('selected'));

        if (shiftKey && anchor) {
            const start = items.indexOf(anchor);
            const end = items.indexOf(item);
            if (start !== -1 && end !== -1) {
                if (!additive) items.forEach(candidate => this.setMediaItemSelected(candidate, false));
                const rangeStart = Math.min(start, end);
                const rangeEnd = Math.max(start, end);
                items.slice(rangeStart, rangeEnd + 1).forEach(candidate => this.setMediaItemSelected(candidate, true));
            }
        } else if (additive) {
            this.setMediaItemSelected(item, !selected);
        } else {
            items.forEach(candidate => this.setMediaItemSelected(candidate, candidate === item && !selected));
        }

        this.lastSelectedMediaItem = item.classList.contains('selected') ? item : null;
        this.syncLegacySelection();
        this.syncSelectionActions();
    }

    setMediaItemSelected(item, selected) {
        item.classList.toggle('selected', selected);
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox) checkbox.checked = selected;
    }

    syncLegacySelection() {
        const jqueryContainer = window.jQuery?.(this.container);
        if (!jqueryContainer?.data) return;
        const selectedItems = typeof jqueryContainer.find === 'function'
            ? jqueryContainer.find('.xefu-file.selected')
            : Array.from(this.container.querySelectorAll('.xefu-file.selected'));
        jqueryContainer.data('selected_files', selectedItems);
    }

    decorateDropzone() {
        const dropzone = this.container.querySelector('.xefu-dropzone');
        if (!dropzone) return;
        const message = dropzone.querySelector('.xefu-dropzone-message');
        const button = dropzone.querySelector('.fileinput-button');
        this.fileButton = button;
        dropzone.setAttribute('role', 'button');
        dropzone.tabIndex = 0;
        dropzone.addEventListener('click', event => {
            const fileInput = this.currentFileInput();
            if (!fileInput || event.target === fileInput) return;
            fileInput.click();
        });
        dropzone.addEventListener('keydown', event => {
            const fileInput = this.currentFileInput();
            if (!fileInput || !['Enter', ' '].includes(event.key)) return;
            event.preventDefault();
            fileInput.click();
        });
        if (message && !dropzone.querySelector('.roundeditor__dropzone-icon')) {
            const icon = svgIcon('upload');
            icon.classList.add('roundeditor__dropzone-icon');
            message.before(icon);
        }
        if (message) {
            message.classList.add('roundeditor__dropzone-title');
            message.textContent = this.labels.attachmentsDropTitle;
        }
        if (button && !dropzone.querySelector('.roundeditor__dropzone-actions')) {
            const actions = document.createElement('div');
            actions.className = 'roundeditor__dropzone-actions';
            const or = document.createElement('span');
            or.className = 'roundeditor__dropzone-or';
            or.textContent = this.labels.attachmentsDropOr;
            button.parentElement?.removeChild(button);
            actions.append(or, button);
            dropzone.insertBefore(actions, dropzone.querySelector('.upload_info') || null);
            this.dropzoneActions = actions;
        } else {
            this.dropzoneActions = dropzone.querySelector('.roundeditor__dropzone-actions');
        }
        const buttonLabel = button?.querySelector(':scope > span');
        if (buttonLabel) {
            buttonLabel.replaceChildren();
            buttonLabel.append(svgIcon('upload'), document.createTextNode(this.labels.attachmentsSelectFile));
        }
        dropzone.querySelector('.upload_info')?.classList.add('roundeditor__dropzone-hint');
        const uploadInfo = dropzone.querySelector('.upload_info');
        if (uploadInfo && this.headingActions && !this.container.querySelector('.roundeditor__attachments-policy')) {
            const policy = uploadInfo.cloneNode(true);
            policy.className = 'roundeditor__attachments-policy';
            this.headingActions.before(policy);
            this.policy = policy;
        }
        if (!dropzone.querySelector('.roundeditor__dropzone-count')) {
            const summary = this.container.querySelector('.xefu-controll > div:first-child');
            if (summary) {
                const count = document.createElement('p');
                count.className = 'roundeditor__dropzone-count';
                count.setAttribute('aria-live', 'polite');
                const fileCount = document.createElement('strong');
                fileCount.className = 'file_count';
                fileCount.textContent = summary.querySelector('.file_count')?.textContent || '0';
                const attachedSize = document.createElement('span');
                attachedSize.className = 'attached_size';
                attachedSize.textContent = summary.querySelector('.attached_size')?.textContent || '0Byte';
                const allowedSize = document.createElement('span');
                allowedSize.className = 'allowed_attach_size';
                allowedSize.textContent = summary.querySelector('.allowed_attach_size')?.textContent || '';
                count.append(
                    document.createTextNode(`${this.labels.attachmentsCountCurrent} `),
                    fileCount,
                    document.createTextNode(`${this.labels.attachmentsCountSuffix} · `),
                    attachedSize,
                    document.createTextNode(' / '),
                    allowedSize
                );
                dropzone.insertBefore(count, dropzone.querySelector('.xefu-progress-status') || null);
            }
        }
    }

    currentFileInput() {
        // Blueimp replaces the file input with a clone after every selection so
        // the same filename can be selected again. Never retain the detached
        // input from the first selection.
        return this.fileButton?.querySelector('input[type="file"]') || null;
    }

    mergeControlsIntoHeading() {
        const controls = this.container.querySelector('.xefu-controll');
        const actionContainer = controls?.querySelector(':scope > div:last-child');
        if (!controls || !actionContainer || !this.headingActions) return;
        const actions = [
            ['.xefu-act-link-selected', 'insert', 'insert'],
            ['.xefu-act-delete-selected', 'trash', 'delete'],
        ];
        this.selectionActions = [];
        for (const [selector, icon, name] of actions) {
            const legacy = actionContainer.querySelector(selector);
            if (!legacy) continue;
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `xefu-btn roundeditor__attachment-action roundeditor__attachment-action--${name}`;
            button.hidden = true;
            button.append(svgIcon(icon), document.createElement('span'));
            button.lastElementChild.textContent = legacy.value || legacy.textContent || '';
            button.addEventListener('click', () => {
                legacy.click();
                window.setTimeout(() => this.syncSelectionActions(), 0);
            });
            this.headingActions.appendChild(button);
            this.selectionActions.push(button);
        }
        controls.hidden = true;
        this.container.classList.add('roundeditor__attachments--merged-controls');
    }

    addDropOverlay() {
        const list = this.container.querySelector('.xefu-list');
        if (!list || list.querySelector('.roundeditor__drop-overlay')) return;
        const overlay = document.createElement('div');
        overlay.className = 'roundeditor__drop-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        const label = document.createElement('strong');
        label.textContent = this.labels.attachmentsDropOverlay;
        overlay.appendChild(label);
        list.appendChild(overlay);
    }

    syncLayout() {
        const hasFiles = this.container.querySelectorAll('.xefu-list-images li, .xefu-list-files li').length > 0;
        const list = this.container.querySelector('.xefu-list');
        // The legacy uploader stylesheet hides the list by default and only its
        // asynchronous refresh normally adds an inline display value. Keep the
        // list visible whenever either a pending preview or a server file exists.
        // This also survives later observer passes after the legacy .show().
        if (list) {
            if (hasFiles) list.style.display = 'block';
            else list.style.removeProperty('display');
        }
        this.container.classList.toggle('roundeditor__attachments--empty', !hasFiles);
        this.container.classList.toggle('roundeditor__attachments--has-files', hasFiles);
        if (this.headingActions) this.headingActions.hidden = !hasFiles;
        if (this.policy) this.policy.hidden = !hasFiles;
        this.syncSelectionActions();
        if (!this.fileButton) return;
        if (hasFiles && this.fileButton.parentElement !== this.headingActions) {
            this.headingActions?.prepend(this.fileButton);
        } else if (!hasFiles && this.fileButton.parentElement !== this.dropzoneActions) {
            this.dropzoneActions?.appendChild(this.fileButton);
        }
    }

    syncSelectionActions() {
        const hasSelection = Boolean(this.container.querySelector('.xefu-file.selected, .xefu-file input:checked'));
        for (const button of this.selectionActions || []) button.hidden = !hasSelection;
    }

    decorateCoverButtons() {
        for (const button of this.container.querySelectorAll('.xefu-act-set-cover')) {
            if (!button.querySelector('.roundeditor__attachment-icon')) button.replaceChildren(svgIcon('cover'));
            button.type = 'button';
            if (!button.classList.contains('roundeditor__thumbnail-checkbox')) button.classList.add('roundeditor__thumbnail-checkbox');
            button.setAttribute('role', 'checkbox');
            button.setAttribute('aria-checked', String(button.closest('.xefu-file')?.classList.contains('xefu-is-cover-image')));
        }
        for (const play of this.container.querySelectorAll('.xefu-file-video-play')) {
            if (play.querySelector('.roundeditor__attachment-icon')) continue;
            play.replaceChildren(svgIcon('play'));
        }
        this.refreshImageCoverViews();
    }

    findFileItem(fileSrl) {
        const target = String(fileSrl || '');
        if (!target || !this.container) return null;
        return Array.from(this.container.querySelectorAll('.xefu-file')).find(item => (
            String(item.dataset.fileSrl || item.querySelector('[data-file-srl]')?.dataset.fileSrl || '') === target
        )) || null;
    }

    isCover(fileSrl) {
        return Boolean(this.findFileItem(fileSrl)?.classList.contains('xefu-is-cover-image'));
    }

    toggleCover(fileSrl) {
        this.findFileItem(fileSrl)?.querySelector('.xefu-act-set-cover')?.click();
    }

    refreshImageCoverViews() {
        for (const imageView of this.bridge.imageViews || []) imageView.refreshCoverState();
    }

    refreshUsageState() {
        if (!this.container || !this.bridge.view) return;
        const usedFileSrls = new Set();
        this.bridge.view.state.doc.descendants(node => {
            if (node.attrs?.fileSrl) usedFileSrls.add(String(node.attrs.fileSrl));
        });
        for (const item of this.container.querySelectorAll('.xefu-list-images .xefu-file')) {
            if (item.dataset.roundeditorUploadPreview) continue;
            const fileSrl = String(
                item.dataset.fileSrl || item.querySelector('[data-file-srl]')?.dataset.fileSrl || ''
            );
            // oEmbed-generated previews are attached to the document but their
            // file SRLs are not present in the serialized editor HTML.
            const unused = Boolean(fileSrl && !usedFileSrls.has(fileSrl) && !isOembedAttachment(item));
            item.classList.toggle('roundeditor__attachment--unused', unused);
            const overlayHost = item.querySelector('.xefu-file-info') || item;
            let overlay = item.querySelector('.roundeditor__attachment-unused-overlay');
            if (!overlay) {
                overlay = document.createElement('span');
                overlay.className = 'roundeditor__attachment-unused-overlay';
                overlay.setAttribute('role', 'img');
                overlay.setAttribute('aria-label', this.labels.attachmentNotUsed);
                overlay.title = this.labels.attachmentNotUsed;
            }
            if (overlay.parentElement !== overlayHost) overlayHost.appendChild(overlay);
            overlay.hidden = !unused;
        }
    }

    decorateVideoItems() {
        const imageList = this.container?.querySelector('.xefu-list-images ul');
        const fileList = this.container?.querySelector('.xefu-list-files ul');
        if (!imageList || !fileList) return;
        const items = [...imageList.querySelectorAll('li'), ...fileList.querySelectorAll('li')];
        for (const item of items) {
            if (item.dataset.roundeditorUploadPreview) continue;
            const nameElement = item.querySelector('.xefu-file-name');
            const filename = nameElement?.textContent?.trim() || '';
            if (!/\.(?:mp4|webm|mov)$/i.test(filename) || item.dataset.roundeditorVideo) continue;
            item.dataset.roundeditorVideo = 'true';
            const info = item.querySelector('.xefu-file-info') || item;
            const file = this.pendingFiles.get(filename);
            const fileSrl = item.dataset.fileSrl
                || item.querySelector('[data-file-srl]')?.dataset.fileSrl
                || '';
            const knownDuration = Number(item.dataset.duration);
            const source = knownDuration > 0
                ? ''
                : file && window.URL?.createObjectURL
                ? window.URL.createObjectURL(file)
                : fileSrl
                    ? normalizeRhymixVideoUrl(`/index.php?module=file&act=procFileDownload&file_srl=${encodeURIComponent(fileSrl)}`)
                    : '';
            let metadataVideo;
            if (item.parentElement === fileList) {
                item.classList.add('xefu-file-image');
                item.classList.add('roundeditor__video-fallback');
                const thumbnail = source ? document.createElement('video') : document.createElement('span');
                thumbnail.className = 'xefu-thumbnail';
                thumbnail.setAttribute('aria-hidden', 'true');
                if (thumbnail instanceof window.HTMLVideoElement) {
                    thumbnail.src = source;
                    thumbnail.muted = true;
                    thumbnail.playsInline = true;
                    thumbnail.preload = 'metadata';
                    metadataVideo = thumbnail;
                }
                info.insertBefore(thumbnail, info.firstChild);
                imageList.appendChild(item);
            } else if (source) {
                metadataVideo = document.createElement('video');
                metadataVideo.className = 'roundeditor__attachment-video-metadata';
                metadataVideo.setAttribute('aria-hidden', 'true');
                metadataVideo.tabIndex = -1;
                metadataVideo.preload = 'metadata';
                metadataVideo.muted = true;
                metadataVideo.src = source;
                // A detached media element is not guaranteed to fetch metadata
                // in every browser. Keep the probe in the item so existing
                // server-generated video thumbnails also receive a duration.
                item.appendChild(metadataVideo);
            }
            if (!item.querySelector('.xefu-file-video')) {
                const overlay = document.createElement('span');
                overlay.className = 'xefu-file-video';
                overlay.setAttribute('aria-hidden', 'true');
                const play = document.createElement('span');
                play.className = 'xefu-file-video-play';
                play.appendChild(svgIcon('play'));
                overlay.appendChild(play);
                item.appendChild(overlay);
            }
            if (knownDuration > 0) this.decorateVideoDuration(item, null, knownDuration);
            else if (metadataVideo) this.decorateVideoDuration(item, metadataVideo);
        }
    }

    decorateVideoDuration(item, video, knownDuration = 0) {
        const badge = document.createElement('span');
        badge.className = 'roundeditor__attachment-video-duration';
        badge.hidden = true;
        item.appendChild(badge);
        const showDuration = value => {
            const duration = formatVideoDuration(value);
            badge.textContent = duration;
            badge.hidden = !duration;
            if (duration) badge.setAttribute('aria-label', `${this.labels.videoDuration}: ${duration}`);
            else badge.removeAttribute('aria-label');
        };
        if (knownDuration > 0) showDuration(knownDuration);
        else if (video) {
            video.addEventListener('loadedmetadata', () => showDuration(video.duration), { once: true });
            if (video.readyState >= 1) showDuration(video.duration);
            else video.load();
        }
    }

    bindUploader(attempt = 0) {
        const $ = window.jQuery;
        if (!$) {
            if (attempt < 20) window.setTimeout(() => this.bindUploader(attempt + 1), 50);
            return;
        }
        const container = $(this.container);
        container.off('.roundeditorAttachments');
        container.on('fileuploadadd.roundeditorAttachments', (event, data) => this.add(data));
        container.on('fileuploadprogress.roundeditorAttachments', (event, data) => this.progress(data));
        container.on('fileuploadprogressall.roundeditorAttachments', (event, data) => this.progressAll(data));
        container.on('fileuploaddone.roundeditorAttachments', (event, data) => this.done(data));
        container.on('fileuploadfail.roundeditorAttachments', (event, data) => this.fail(data));
        container.on('fileuploadprocessfail.roundeditorAttachments', (event, data) => this.fail(data));
        this.bindDropzoneState();
    }

    bindDropzoneState() {
        if (this.dropzoneStateBound) return;
        this.dropzoneStateBound = true;
        const clear = () => this.container.classList.remove('in', 'hover');
        this.container.addEventListener('dragenter', () => this.container.classList.add('in', 'hover'));
        this.container.addEventListener('dragover', () => this.container.classList.add('in', 'hover'));
        this.container.addEventListener('dragleave', event => {
            if (!event.relatedTarget || !this.container.contains(event.relatedTarget)) clear();
        });
        this.container.addEventListener('drop', () => window.setTimeout(clear, 0));
    }

    entriesFor(data) {
        const entries = this.uploads.get(data);
        if (entries?.length) return entries;
        return Array.from(data?.files || []).flatMap(file => this.fileEntries.get(file) || []);
    }

    uploadFiles(files, position = null) {
        const accepted = Array.from(files || []).filter(file => mediaType(file));
        if (!accepted.length || !window.jQuery) return false;
        const container = window.jQuery(this.container);
        if (typeof container.fileupload !== 'function') return false;
        for (const file of accepted) this.insertionPositions.set(file, position);
        try {
            container.fileupload('add', { files: accepted });
            return true;
        } catch (error) {
            for (const file of accepted) this.insertionPositions.delete(file);
            return false;
        }
    }

    createUploadPreview(entry) {
        const list = this.container.querySelector('.xefu-list-images ul');
        if (!list) return;
        const item = document.createElement('li');
        item.className = 'xefu-file xefu-file-image roundeditor__attachment-upload';
        item.dataset.roundeditorUploadPreview = 'true';
        item.setAttribute('aria-busy', 'true');

        const name = document.createElement('strong');
        name.className = 'xefu-file-name';
        name.textContent = entry.file.name;
        const info = document.createElement('span');
        info.className = 'xefu-file-info';
        const size = document.createElement('span');
        size.className = 'xefu-file-size';
        size.textContent = displayFileSize(entry.file.size);
        const mediaHost = document.createElement('span');
        const previewUrl = window.URL?.createObjectURL?.(entry.file) || '';
        entry.previewUrl = previewUrl;
        let thumbnail;
        if (entry.type === 'video' && previewUrl) {
            thumbnail = document.createElement('video');
            thumbnail.muted = true;
            thumbnail.playsInline = true;
            thumbnail.preload = 'metadata';
            thumbnail.src = previewUrl;
            const play = document.createElement('span');
            play.className = 'xefu-file-video';
            play.setAttribute('aria-hidden', 'true');
            const playIcon = document.createElement('span');
            playIcon.className = 'xefu-file-video-play';
            playIcon.appendChild(svgIcon('play'));
            play.appendChild(playIcon);
            mediaHost.appendChild(play);
        } else {
            thumbnail = document.createElement('span');
            if (previewUrl) thumbnail.style.backgroundImage = `url("${previewUrl.replaceAll('"', '\\"')}")`;
        }
        thumbnail.className = 'xefu-thumbnail';
        thumbnail.setAttribute('aria-hidden', 'true');
        mediaHost.appendChild(thumbnail);
        info.append(size, mediaHost);

        const percent = document.createElement('strong');
        percent.className = 'roundeditor__attachment-upload-percent';
        percent.textContent = '0%';
        const progress = document.createElement('span');
        progress.className = 'roundeditor__attachment-upload-progress';
        progress.setAttribute('aria-hidden', 'true');
        const progressBar = document.createElement('span');
        progress.appendChild(progressBar);
        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'roundeditor__attachment-upload-cancel';
        cancel.title = this.labels.cancelUpload;
        cancel.setAttribute('aria-label', `${entry.file.name}: ${this.labels.cancelUpload}`);
        cancel.appendChild(svgIcon('cancel'));
        const cancelLabel = document.createElement('span');
        cancelLabel.textContent = this.labels.cancel;
        cancel.appendChild(cancelLabel);
        cancel.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            this.cancel(entry);
        });
        item.append(name, info, percent, progress, cancel);
        list.appendChild(item);
        entry.previewItem = item;
        this.updateUploadPreview(entry, 0);
        this.syncLayout();
    }

    updateUploadPreview(entry, progress, label = null) {
        const item = entry.previewItem;
        if (!item?.isConnected) return;
        const percentage = Math.round(Math.min(1, Math.max(0, Number(progress) || 0)) * 100);
        item.style.setProperty('--roundeditor-attachment-progress', `${percentage}%`);
        const percent = item.querySelector('.roundeditor__attachment-upload-percent');
        if (percent) percent.textContent = `${percentage}%`;
        item.setAttribute('aria-label', `${entry.file.name} ${percentage}%${label ? ` ${label}` : ''}`);
    }

    removeUploadPreview(entry) {
        entry.previewItem?.remove();
        entry.previewItem = null;
        if (entry.previewUrl) window.URL?.revokeObjectURL?.(entry.previewUrl);
        entry.previewUrl = '';
    }

    syncUploadPreviews() {
        for (const entry of [...this.activeEntries, ...this.completedEntries]) {
            const fileSrl = entry.previewItem?.dataset.fileSrl;
            if (!fileSrl) continue;
            const actual = [...this.container.querySelectorAll('.xefu-file[data-file-srl]')].find(item => (
                !item.dataset.roundeditorUploadPreview && item.dataset.fileSrl === fileSrl
            ));
            if (actual) {
                this.removeUploadPreview(entry);
                this.completedEntries.delete(entry);
            }
        }
    }

    add(data) {
        const entries = Array.from(data?.files || []).map(file => {
            const type = mediaType(file);
            if (!type) return null;
            const autoInsert = Boolean(this.autoinsertTypes?.[type]);
            const label = type === 'image' ? this.labels.imageUploading : this.labels.videoUploading;
            const position = this.insertionPositions.get(file);
            this.insertionPositions.delete(file);
            return {
                file,
                type,
                autoInsert,
                progressSeen: false,
                placeholderId: autoInsert
                    ? addUploadPlaceholder(this.bridge.view, type, label, position ?? this.bridge.view.state.selection.from)
                    : null,
            };
        }).filter(Boolean);
        for (const entry of entries) {
            entry.data = data;
            this.pendingFiles.set(entry.file.name, entry.file);
            this.fileEntries.set(entry.file, [entry]);
            this.activeEntries.add(entry);
            this.createUploadPreview(entry);
        }
        if (entries.length) this.uploads.set(data, entries);
        this.wrapSubmit(data);
        if (entries.length && typeof data?.submit === 'function') {
            window.setTimeout(() => {
                if (!data._roundeditorSubmitted) this.fail(data);
            }, 0);
        }
    }

    wrapSubmit(data) {
        if (typeof data?.submit !== 'function' || data._roundeditorSubmitWrapped) return;
        const submit = data.submit;
        data._roundeditorSubmitWrapped = true;
        data.submit = (...args) => {
            data._roundeditorSubmitted = true;
            const promise = submit.apply(data, args);
            data._roundeditorRequest = promise;
            for (const entry of this.entriesFor(data)) entry.request = promise;
            promise?.done?.(() => this.done(data));
            promise?.fail?.(() => this.fail(data));
            return promise;
        };
    }

    cancel(entry) {
        if (!entry || !this.activeEntries.has(entry)) return;
        const data = entry.data;
        const entries = this.entriesFor(data).filter(candidate => this.activeEntries.has(candidate));
        for (const candidate of entries) {
            const button = candidate.previewItem?.querySelector('.roundeditor__attachment-upload-cancel');
            if (button) button.disabled = true;
        }

        const request = entry.request || data?._roundeditorRequest;
        data._roundeditorCancelled = true;
        if (typeof request?.abort === 'function') request.abort();
        else if (typeof data?.abort === 'function') data.abort();

        // The uploader may dispatch its failure event asynchronously. Clean up now so
        // the editor and attachment list respond to the cancel click immediately.
        this.fail(data);
    }

    progress(data) {
        const progress = data?.total ? data.loaded / data.total : 0;
        for (const entry of this.entriesFor(data)) {
            entry.progressSeen = true;
            updateUploadPlaceholder(
                this.bridge.view,
                entry.placeholderId,
                progress,
                progress >= 0.99 ? this.processingLabel(entry.type) : null
            );
            this.updateUploadPreview(
                entry,
                progress,
                progress >= 0.99 ? this.processingLabel(entry.type) : null
            );
        }
    }

    progressAll(data) {
        const progress = data?.total ? data.loaded / data.total : 0;
        for (const entry of this.activeEntries) {
            if (!entry.progressSeen) {
                updateUploadPlaceholder(
                    this.bridge.view,
                    entry.placeholderId,
                    progress,
                    progress >= 0.99 ? this.processingLabel(entry.type) : null
                );
                this.updateUploadPreview(
                    entry,
                    progress,
                    progress >= 0.99 ? this.processingLabel(entry.type) : null
                );
            }
        }
    }

    processingLabel(type) {
        return type === 'image' ? this.labels.imageProcessing : this.labels.videoProcessing;
    }

    done(data) {
        const entries = this.entriesFor(data);
        const result = responseResult(data);
        if (!result) {
            this.fail(data);
            return;
        }
        const upload = normalizedUpload(result);
        const filename = String(upload.source_filename || '');
        const entry = entries.find(candidate => candidate.file.name === filename) || entries[0];
        if (!entry || !this.activeEntries.has(entry)) return;
        if (entry.placeholderId) {
            updateUploadPlaceholder(this.bridge.view, entry.placeholderId, 1, this.processingLabel(entry.type));
        }
        this.updateUploadPreview(entry, 1, this.processingLabel(entry.type));
        if (entry.autoInsert && entry.type === 'image') {
            insertUploadedImages(this.bridge, [upload], {
                placeholderId: entry.placeholderId,
                insertionMode: this.autoinsertPosition,
            });
        } else if (entry.autoInsert) {
            insertUploadedVideo(this.bridge, upload, {
                placeholderId: entry.placeholderId,
                insertionMode: this.autoinsertPosition,
            });
        }
        this.activeEntries.delete(entry);
        this.fileEntries.delete(entry.file);
        this.pendingFiles.delete(entry.file.name);
        if (entry.previewItem) entry.previewItem.dataset.fileSrl = String(upload.file_srl || '');
        this.completedEntries.add(entry);
        this.uploads.delete(entry.data || data);
    }

    fail(data) {
        for (const entry of this.entriesFor(data)) {
            removeUploadPlaceholder(this.bridge.view, entry.placeholderId);
            this.removeUploadPreview(entry);
            this.activeEntries.delete(entry);
            this.fileEntries.delete(entry.file);
            this.pendingFiles.delete(entry.file.name);
            this.uploads.delete(entry.data || data);
        }
        this.uploads.delete(data);
    }
}
