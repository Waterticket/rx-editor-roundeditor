import { NodeSelection } from 'prosemirror-state';
import { svgIcon } from '../icons.js';
import { MediaNodeView } from './MediaNodeView.js';
import { VideoFloatingToolbar } from '../ui/FloatingToolbar.js';
import { videoAlignmentAttrs } from '../videos.js';

const FALLBACK_LABELS = {
    videoDelete: 'Delete video', videoSize: 'Video size', videoAutoplay: 'Autoplay',
    videoControls: 'Show controls', videoWidth: 'Width', videoHeight: 'Height', apply: 'Apply',
    alignLeft: 'Align left', alignCenter: 'Align center', alignRight: 'Align right',
    sizeReset: 'Remove explicit size',
};

export class VideoView extends MediaNodeView {
    constructor(node, view, getPos, bridge) {
        const video = document.createElement('video');
        video.draggable = false;
        video.tabIndex = -1;
        super(node, view, getPos, video);
        this.bridge = bridge;
        this.previewLoaded = false;
        this.pausePlayback = () => this.media.pause();
        this.showMetadata = () => {
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
        this.playIndicator = document.createElement('span');
        this.playIndicator.className = 'roundeditor__video-play-indicator';
        this.playIndicator.contentEditable = 'false';
        this.playIndicator.setAttribute('aria-hidden', 'true');
        this.playIndicator.appendChild(svgIcon('play'));
        this.media.after(this.playIndicator);
        this.toolbar = new VideoFloatingToolbar({
            labels: { ...FALLBACK_LABELS, ...(bridge.config.labels || {}) },
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
        this.toolbar.refresh();
    }

    loadPreview() {
        this.previewLoaded = true;
        const source = this.node.attrs.src || '';
        if (this.media.getAttribute('src') === source) return;
        this.media.pause();
        if (source) this.media.setAttribute('src', source);
        else this.media.removeAttribute('src');
        this.media.load();
    }

    update(node) {
        if (node.type !== this.node.type) return false;
        this.node = node;
        this.render();
        return true;
    }

    selectNode() {
        super.selectNode();
        this.toolbar.show();
        this.placeToolbar();
    }

    deselectNode() {
        super.deselectNode();
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
        const mediaRect = this.dom.getBoundingClientRect();
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

    updateAttrs(attrs) {
        const position = this.position();
        if (position === null) return;
        const transaction = this.view.state.tr.setNodeMarkup(position, null, { ...this.node.attrs, ...attrs });
        transaction.setSelection(NodeSelection.create(transaction.doc, position));
        this.view.dispatch(transaction);
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
        this.media.removeEventListener('play', this.pausePlayback);
        this.media.removeEventListener('loadedmetadata', this.showMetadata);
        this.media.pause();
    }
}

export function videoNodeView(bridge) {
    return (node, view, getPos) => new VideoView(node, view, getPos, bridge);
}
