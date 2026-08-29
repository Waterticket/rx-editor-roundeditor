import { imageFiles, insertUploadedImages } from './images.js';
import { svgIcon } from './icons.js';
import { normalizeRhymixAssetUrl, normalizeRhymixUrl } from './rhymix/upload.js';
import { addUploadPlaceholder, removeUploadPlaceholder, updateUploadPlaceholder } from './uploadPlaceholders.js';
import { insertUploadedVideo, isVideoFile } from './videos.js';

const FALLBACK_LABELS = {
    attachments: 'Attachments',
    attachmentsHelp: 'Images and videos are inserted at the cursor after upload.',
    attachmentsDropTitle: 'Drag files here or click to upload',
    attachmentsDropOr: 'or',
    attachmentsSelectFile: 'Choose files',
    attachmentsDropOverlay: 'Upload files',
    attachmentsCountCurrent: 'Current',
    attachmentsCountSuffix: ' files',
    imageUploading: 'Uploading image…',
    videoUploading: 'Uploading video…',
    imageProcessing: 'Processing image…',
    videoProcessing: 'Processing video…',
};

function mediaType(file) {
    if (imageFiles([file]).length) return 'image';
    if (isVideoFile(file)) return 'video';
    return null;
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

export class AttachmentList {
    constructor(bridge) {
        this.bridge = bridge;
        this.labels = { ...FALLBACK_LABELS, ...(bridge.config.labels || {}) };
        this.uploads = new WeakMap();
        this.fileEntries = new WeakMap();
        this.activeEntries = new Set();
        this.pendingFiles = new Map();
        this.container = bridge.form.querySelector(`#xefu-container-${bridge.sequence}`);
        if (!this.container) return;

        this.disableLegacyMediaInsertion();
        this.decorate();
        this.bindUploader();
    }

    disableLegacyMediaInsertion() {
        let types = {};
        try { types = JSON.parse(this.container.dataset.autoinsertTypes || '{}'); }
        catch (error) { types = {}; }
        types.image = false;
        types.video = false;
        this.container.dataset.autoinsertTypes = JSON.stringify(types);
        window.jQuery?.(this.container).data('autoinsertTypes', types);
    }

    decorate() {
        this.container.classList.add('roundeditor__attachments');
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
                this.decorateVideoItems();
                this.decorateCoverButtons();
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
        this.syncLayout();
    }

    bindMediaSelectionFallback() {
        this.container.addEventListener('mousedown', event => {
            if (event.button !== 0) return;
            const item = event.target.closest?.('.xefu-file');
            if (!item || !this.container.contains(item) || event.target.closest?.('button, a')) return;
            event.stopPropagation();
            this.pendingMediaSelection = {
                item,
                selected: item.classList.contains('selected'),
                shiftKey: event.shiftKey,
                additive: event.ctrlKey || event.metaKey,
            };
        }, true);
        this.container.addEventListener('click', event => {
            const item = event.target.closest?.('.xefu-file');
            if (!item || !this.container.contains(item) || event.target.closest?.('button, a')) return;
            event.stopPropagation();
            const pointerGesture = this.pendingMediaSelection;
            this.pendingMediaSelection = null;
            this.selectMediaItem(pointerGesture?.item === item ? pointerGesture : {
                item,
                selected: item.classList.contains('selected'),
                shiftKey: event.shiftKey,
                additive: event.ctrlKey || event.metaKey,
            });
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
        this.fileInput = button?.querySelector('input[type="file"]') || null;
        dropzone.setAttribute('role', 'button');
        dropzone.tabIndex = 0;
        dropzone.addEventListener('click', event => {
            if (!this.fileInput || event.target === this.fileInput) return;
            this.fileInput.click();
        });
        dropzone.addEventListener('keydown', event => {
            if (!this.fileInput || !['Enter', ' '].includes(event.key)) return;
            event.preventDefault();
            this.fileInput.click();
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
    }

    decorateVideoItems() {
        const imageList = this.container?.querySelector('.xefu-list-images ul');
        const fileList = this.container?.querySelector('.xefu-list-files ul');
        if (!imageList || !fileList) return;
        for (const item of Array.from(fileList.querySelectorAll('li'))) {
            const nameElement = item.querySelector('.xefu-file-name');
            const filename = nameElement?.textContent?.trim() || '';
            if (!/\.(?:mp4|webm|mov)$/i.test(filename) || item.dataset.roundeditorVideo) continue;
            item.dataset.roundeditorVideo = 'true';
            item.classList.add('xefu-file-image');
            item.classList.add('roundeditor__video-fallback');
            const info = item.querySelector('.xefu-file-info') || item;
            const file = this.pendingFiles.get(filename);
            const thumbnail = file && window.URL?.createObjectURL
                ? document.createElement('video')
                : document.createElement('span');
            thumbnail.className = 'xefu-thumbnail';
            thumbnail.setAttribute('aria-hidden', 'true');
            if (file && window.URL?.createObjectURL) {
                thumbnail.src = window.URL.createObjectURL(file);
                thumbnail.muted = true;
                thumbnail.playsInline = true;
                thumbnail.preload = 'metadata';
            }
            info.insertBefore(thumbnail, info.firstChild);
            const overlay = document.createElement('span');
            overlay.className = 'xefu-file-video';
            overlay.setAttribute('aria-hidden', 'true');
            const play = document.createElement('span');
            play.className = 'xefu-file-video-play';
            play.appendChild(svgIcon('play'));
            overlay.appendChild(play);
            item.appendChild(overlay);
            imageList.appendChild(item);
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

    add(data) {
        const entries = Array.from(data?.files || []).map(file => {
            const type = mediaType(file);
            if (!type) return null;
            const label = type === 'image' ? this.labels.imageUploading : this.labels.videoUploading;
            return {
                file,
                type,
                progressSeen: false,
                placeholderId: addUploadPlaceholder(this.bridge.view, type, label),
            };
        }).filter(Boolean);
        for (const entry of entries) {
            entry.data = data;
            this.pendingFiles.set(entry.file.name, entry.file);
            this.fileEntries.set(entry.file, [entry]);
            this.activeEntries.add(entry);
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
            promise?.done?.(() => this.done(data));
            promise?.fail?.(() => this.fail(data));
            return promise;
        };
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
        updateUploadPlaceholder(this.bridge.view, entry.placeholderId, 1, this.processingLabel(entry.type));
        if (entry.type === 'image') {
            insertUploadedImages(this.bridge, [upload], { placeholderId: entry.placeholderId });
        } else {
            insertUploadedVideo(this.bridge, upload, { placeholderId: entry.placeholderId });
        }
        this.activeEntries.delete(entry);
        this.fileEntries.delete(entry.file);
        this.pendingFiles.delete(entry.file.name);
        this.uploads.delete(entry.data || data);
    }

    fail(data) {
        for (const entry of this.entriesFor(data)) {
            removeUploadPlaceholder(this.bridge.view, entry.placeholderId);
            this.activeEntries.delete(entry);
            this.fileEntries.delete(entry.file);
            this.pendingFiles.delete(entry.file.name);
            this.uploads.delete(entry.data || data);
        }
        this.uploads.delete(data);
    }
}
