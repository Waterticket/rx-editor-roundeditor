import { NodeSelection } from 'prosemirror-state';
import { svgIcon } from '../icons.js';
import { MediaNodeView } from './MediaNodeView.js';
import { VideoFloatingToolbar } from '../ui/FloatingToolbar.js';
import { formatVideoDuration, videoAlignmentAttrs } from '../videos.js';
import { insertBlankParagraphBeforeMedia, mediaNeedsLeadingParagraph } from '../mediaInsertion.js';

const FALLBACK_LABELS = {
    videoDelete: 'Delete video', videoSize: 'Video size', videoAutoplay: 'Autoplay',
    videoControls: 'Show controls', videoWidth: 'Width', videoHeight: 'Height', apply: 'Apply',
    alignLeft: 'Align left', alignCenter: 'Align center', alignRight: 'Align right',
    sizeReset: 'Remove explicit size',
    videoDuration: 'Video duration',
    videoCaption: 'Video caption', videoCaptionPlaceholder: 'Add a caption',
    videoCoverSet: 'Set as representative media', videoCoverUnset: 'Unset representative media',
    videoInsertParagraphBefore: 'Insert empty paragraphs above video',
};

export class VideoView extends MediaNodeView {
    constructor(node, view, getPos, bridge) {
        const video = document.createElement('video');
        video.draggable = false;
        video.tabIndex = -1;
        super(node, view, getPos, video);
        this.bridge = bridge;
        this.previewLoaded = false;
        this.labels = { ...FALLBACK_LABELS, ...(bridge.config.labels || {}) };
        this.pausePlayback = () => this.media.pause();
        this.showMetadata = () => {
            const duration = formatVideoDuration(this.media.duration);
            this.durationBadge.textContent = duration;
            this.durationBadge.hidden = !duration;
            this.durationBadge.setAttribute('aria-label', `${this.labels.videoDuration}: ${duration}`);
            if (this.node.attrs.displayWidth || this.node.attrs.displayHeight || this.node.attrs.width || this.node.attrs.height) return;
            const naturalWidth = this.media.videoWidth;
            const naturalHeight = this.media.videoHeight;
            if (!naturalWidth || !naturalHeight) return;
            const width = Math.min(naturalWidth, this.maxWidth());
            this.previewSize(width, width * (naturalHeight / naturalWidth));
        };
        this.media.addEventListener('play', this.pausePlayback);
        this.media.addEventListener('loadedmetadata', this.showMetadata);
        this.dom.classList.add('roundeditor__media--video');
        this.videoFrame = document.createElement('span');
        this.videoFrame.className = 'roundeditor__video-frame';
        this.videoFrame.append(this.media, ...this.handles);
        this.dom.appendChild(this.videoFrame);
        this.edge = document.createElement('button');
        this.edge.type = 'button';
        this.edge.className = 'roundeditor__image-edge roundeditor__video-edge';
        this.edge.setAttribute('aria-label', this.labels.videoInsertParagraphBefore);
        this.edge.addEventListener('click', () => {
            const position = this.position();
            if (position !== null && insertBlankParagraphBeforeMedia(this.view, position)) this.refreshEdgeState();
        });
        this.dom.prepend(this.edge);
        this.refreshEdgeOnPointerEnter = () => this.refreshEdgeState();
        this.dom.addEventListener('pointerenter', this.refreshEdgeOnPointerEnter);
        this.playIndicator = document.createElement('span');
        this.playIndicator.className = 'roundeditor__video-play-indicator';
        this.playIndicator.contentEditable = 'false';
        this.playIndicator.setAttribute('aria-hidden', 'true');
        this.playIndicator.appendChild(svgIcon('play'));
        this.durationBadge = document.createElement('span');
        this.durationBadge.className = 'roundeditor__video-duration';
        this.durationBadge.contentEditable = 'false';
        this.durationBadge.hidden = true;
        this.videoFrame.append(this.playIndicator, this.durationBadge);
        this.cover = document.createElement('button');
        this.cover.type = 'button';
        this.cover.className = 'roundeditor__image-cover roundeditor__video-cover';
        this.cover.setAttribute('role', 'checkbox');
        this.cover.append(svgIcon('cover'), document.createElement('span'));
        this.cover.lastElementChild.textContent = '대표';
        this.cover.addEventListener('click', () => this.bridge.attachments?.toggleCover(this.node.attrs.fileSrl));
        this.videoFrame.appendChild(this.cover);
        this.caption = document.createElement('label');
        this.caption.className = 'roundeditor__image-caption roundeditor__video-caption';
        this.captionInput = document.createElement('input');
        this.captionInput.type = 'text';
        this.captionInput.draggable = false;
        this.captionInput.autocomplete = 'off';
        this.captionInput.placeholder = this.labels.videoCaptionPlaceholder;
        this.captionInput.setAttribute('aria-label', this.labels.videoCaption);
        this.caption.appendChild(this.captionInput);
        this.dom.appendChild(this.caption);
        this.captionEditing = false;
        this.composingCaption = false;
        this.captionInput.addEventListener('focus', () => { this.captionEditing = true; this.renderCaption(); });
        this.captionInput.addEventListener('compositionstart', () => { this.composingCaption = true; });
        this.captionInput.addEventListener('compositionend', () => { this.composingCaption = false; this.setCaption(this.captionInput.value, { select: false }); });
        this.captionInput.addEventListener('input', () => {
            if (!this.composingCaption) this.setCaption(this.captionInput.value, { select: false });
        });
        this.captionInput.addEventListener('blur', () => {
            this.captionEditing = false;
            this.setCaption(this.captionInput.value.trim(), { select: false });
            this.renderCaption();
        });
        for (const type of ['pointerdown', 'mousedown', 'click']) {
            this.captionInput.addEventListener(type, event => event.stopPropagation());
        }
        this.captionInput.addEventListener('click', () => {
            if (document.activeElement !== this.captionInput) this.captionInput.focus();
        });
        this.captionInput.addEventListener('dblclick', event => {
            event.preventDefault();
            event.stopPropagation();
            this.captionInput.focus();
            this.captionInput.select();
        });
        this.captionInput.addEventListener('dragstart', event => event.preventDefault());
        this.captionInput.addEventListener('keydown', event => {
            if (!['Enter', 'Escape'].includes(event.key)) return;
            event.preventDefault();
            this.setCaption(this.captionInput.value.trim(), { select: false });
            this.captionInput.blur();
            this.view.focus();
        });
        bridge.imageViews?.add(this);
        this.toolbar = new VideoFloatingToolbar({
            labels: this.labels,
            values: () => this.values(),
            onDelete: () => this.remove(),
            onSize: (width, height) => this.resizeFromForm(width, height),
            onResetSize: () => this.resetSize(),
            onToggleAutoplay: () => this.toggleAutoplay(),
            onToggleControls: () => this.updateAttrs({ controls: !this.node.attrs.controls }),
            onAlign: align => this.setAlign(align),
        });
        this.dom.appendChild(this.toolbar.element);
        this.surface = null;
        this.placeToolbarOnScroll = () => {
            if (this.dom.classList.contains('roundeditor__media--selected')) this.placeToolbar();
        };
        this.render();
        this.observer = typeof IntersectionObserver === 'function'
            ? new IntersectionObserver(entries => {
                if (entries.some(entry => entry.isIntersecting)) {
                    this.loadPreview();
                    this.observer.disconnect();
                }
            }, { rootMargin: '240px' })
            : null;
        // A video inserted by the legacy "본문 삽입" action may have no
        // width/height attributes yet.  With an empty src the wrapper then
        // collapses to 0x0, so IntersectionObserver never gets an intersecting
        // box and Firefox cannot start playback.  Load metadata immediately
        // for that case; the metadata handler supplies the intrinsic size.
        const hasExplicitSize = Boolean(
            this.node.attrs.displayWidth || this.node.attrs.displayHeight
            || this.node.attrs.width || this.node.attrs.height
        );
        if (this.observer && hasExplicitSize) this.observer.observe(this.dom);
        else this.loadPreview();
    }

    render() {
        if (this.node.attrs.poster) this.media.poster = this.node.attrs.poster;
        else this.media.removeAttribute('poster');
        this.media.controls = false;
        this.media.autoplay = false;
        this.media.preload = 'metadata';
        this.media.setAttribute('loading', 'lazy');
        this.media.setAttribute('aria-label', this.bridge.config.labels?.video || 'Video');
        if (this.previewLoaded) this.loadPreview();
        this.media.dataset.fileSrl = this.node.attrs.fileSrl || '';
        this.renderSize();
        this.dom.style.marginLeft = this.node.attrs.marginLeft || '';
        this.dom.style.marginRight = this.node.attrs.marginRight || '';
        this.renderCaption();
        this.refreshCoverState();
        this.refreshEdgeState();
        this.toolbar.refresh();
    }

    captionVisible() {
        return Boolean(this.node.attrs.caption) || this.captionEditing || this.dom.classList.contains('roundeditor__media--selected');
    }

    renderCaption() {
        const value = this.node.attrs.caption || '';
        if (!this.composingCaption && document.activeElement !== this.captionInput && this.captionInput.value !== value) {
            this.captionInput.value = value;
        }
        this.caption.hidden = !this.captionVisible();
    }

    refreshCoverState() {
        const fileSrl = this.node.attrs.fileSrl;
        const available = Boolean(fileSrl && this.bridge.attachments?.findFileItem(fileSrl));
        const selected = available && this.bridge.attachments.isCover(fileSrl);
        this.cover.hidden = !available;
        this.cover.disabled = !available;
        this.cover.setAttribute('aria-checked', String(selected));
        this.cover.setAttribute('aria-label', selected ? this.labels.videoCoverUnset : this.labels.videoCoverSet);
        this.cover.classList.toggle('roundeditor__image-cover--checked', selected);
    }

    refreshEdgeState() {
        const position = this.position();
        if (position === null) return;
        this.edge.hidden = !mediaNeedsLeadingParagraph(this.view.state.doc, position);
    }

    loadPreview() {
        this.previewLoaded = true;
        const source = this.node.attrs.src || '';
        if (this.media.getAttribute('src') === source) return;
        this.durationBadge.hidden = true;
        this.durationBadge.textContent = '';
        this.durationBadge.removeAttribute('aria-label');
        this.media.pause();
        if (source) this.media.setAttribute('src', source);
        else this.media.removeAttribute('src');
        this.media.load();
    }

    update(node) {
        if (node.type !== this.node.type) return false;
        if (node.eq(this.node)) {
            this.node = node;
            return true;
        }
        this.node = node;
        this.render();
        return true;
    }

    selectNode() {
        super.selectNode();
        this.renderCaption();
        this.toolbar.show();
        this.placeToolbar();
    }

    deselectNode() {
        super.deselectNode();
        this.renderCaption();
        this.toolbar.hide();
    }

    placeToolbar() {
        const surface = this.dom.closest('.roundeditor__surface');
        if (!surface || this.toolbar.element.hidden) return;
        if (surface !== this.surface) {
            this.surface?.removeEventListener('scroll', this.placeToolbarOnScroll);
            this.surface = surface;
            this.surface.addEventListener('scroll', this.placeToolbarOnScroll, { passive: true });
        }
        const surfaceRect = surface.getBoundingClientRect();
        const mediaRect = this.videoFrame.getBoundingClientRect();
        const toolbarHeight = this.toolbar.element.getBoundingClientRect().height;
        this.toolbar.element.classList.toggle(
            'roundeditor__media-toolbar--below',
            mediaRect.top - surfaceRect.top < toolbarHeight + 12
        );
    }

    values() {
        return {
            ...this.currentSize(),
            autoplay: this.node.attrs.autoplay,
            controls: this.node.attrs.controls,
            align: this.node.attrs.align,
        };
    }

    resizeFromForm(width, height) {
        const current = this.currentSize();
        const ratio = current.width && current.height ? current.width / current.height : 16 / 9;
        let nextWidth = width || current.width || 640;
        let nextHeight = height || current.height || nextWidth / ratio;
        const widthChanged = width && width !== current.width;
        const heightChanged = height && height !== current.height;
        if (widthChanged && !heightChanged) nextHeight = width / ratio;
        else if (heightChanged && !widthChanged) nextWidth = height * ratio;
        this.updateSize(nextWidth, nextHeight);
    }

    resetSize() {
        this.updateAttrs({ width: null, height: null, displayWidth: null, displayHeight: null });
    }

    updateAttrs(attrs, { select = true } = {}) {
        const position = this.position();
        if (position === null) return;
        const transaction = this.view.state.tr.setNodeMarkup(position, null, { ...this.node.attrs, ...attrs });
        if (select) transaction.setSelection(NodeSelection.create(transaction.doc, position));
        this.view.dispatch(transaction);
    }

    setCaption(caption, options = {}) {
        this.updateAttrs({ caption: String(caption || '') }, options);
    }

    toggleAutoplay() {
        const autoplay = !this.node.attrs.autoplay;
        this.updateAttrs({
            autoplay,
            muted: autoplay ? true : this.node.attrs.muted,
            playsinline: autoplay ? true : this.node.attrs.playsinline,
        });
    }

    setAlign(align) {
        this.updateAttrs(videoAlignmentAttrs(align));
    }

    remove() {
        const position = this.position();
        if (position === null) return;
        this.view.dispatch(this.view.state.tr.delete(position, position + this.node.nodeSize));
        this.view.focus();
    }

    destroy() {
        this.surface?.removeEventListener('scroll', this.placeToolbarOnScroll);
        this.observer?.disconnect();
        this.dom.removeEventListener('pointerenter', this.refreshEdgeOnPointerEnter);
        this.bridge.imageViews?.delete(this);
        this.media.removeEventListener('play', this.pausePlayback);
        this.media.removeEventListener('loadedmetadata', this.showMetadata);
        this.media.pause();
    }
}

export function videoNodeView(bridge) {
    return (node, view, getPos) => new VideoView(node, view, getPos, bridge);
}
