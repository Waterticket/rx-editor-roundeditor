import { MediaNodeView } from './MediaNodeView.js';

export class StickerView extends MediaNodeView {
    constructor(node, view, getPos, bridge) {
        const media = document.createElement(node.attrs.mediaType === 'video' ? 'video' : 'img');
        media.draggable = false;
        super(node, view, getPos, media);
        this.bridge = bridge;
        this.dom.classList.add('roundeditor__media--sticker');
        for (const handle of this.handles) handle.remove();
        this.handles = [];
        this.observer = null;
        this.render();
    }

    render() {
        this.observer?.disconnect();
        this.observer = null;
        const wantsVideo = this.node.attrs.mediaType === 'video' && this.node.attrs.videoSrc;
        if (wantsVideo !== (this.media.tagName === 'VIDEO')) {
            const replacement = document.createElement(wantsVideo ? 'video' : 'img');
            replacement.draggable = false;
            this.media.replaceWith(replacement);
            this.media = replacement;
        }
        if (this.media.tagName === 'VIDEO') {
            this.media.src = this.node.attrs.videoSrc;
            this.media.poster = this.node.attrs.src;
            this.media.autoplay = true;
            this.media.muted = true;
            this.media.loop = true;
            this.media.playsInline = true;
            this.media.preload = 'metadata';
            this.observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
                if (entries.some(entry => entry.isIntersecting)) this.media.play().catch(() => {});
                else this.media.pause();
            }, { rootMargin: '120px' }) : null;
            this.observer?.observe(this.media);
        } else {
            this.media.src = this.node.attrs.src;
            this.media.alt = this.node.attrs.title || '';
        }
        this.media.setAttribute('aria-label', this.node.attrs.title || this.bridge.config.labels?.sticker || 'Sticker');
        this.renderSize();
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

    destroy() {
        this.observer?.disconnect();
        if (this.media.tagName === 'VIDEO') this.media.pause();
    }
}

export function stickerNodeView(bridge) {
    return (node, view, getPos) => new StickerView(node, view, getPos, bridge);
}
