import { NodeSelection } from 'prosemirror-state';
import { MediaNodeView } from './MediaNodeView.js';
import { StickerFloatingToolbar } from '../ui/FloatingToolbar.js';

const FALLBACK_LABELS = {
    stickerDelete: 'Delete sticker', stickerSize: 'Sticker size', stickerLink: 'Sticker link',
    stickerWidth: 'Width', stickerHeight: 'Height', url: 'URL', apply: 'Apply',
};

function safeHref(value) {
    const href = String(value || '').trim();
    return /^\s*(?:javascript|vbscript|data):/i.test(href) ? '' : href;
}

export class StickerView extends MediaNodeView {
    constructor(node, view, getPos, bridge) {
        const media = document.createElement(node.attrs.mediaType === 'video' ? 'video' : 'img');
        media.draggable = false;
        super(node, view, getPos, media);
        this.bridge = bridge;
        this.dom.classList.add('roundeditor__media--sticker');
        this.toolbar = new StickerFloatingToolbar({
            labels: { ...FALLBACK_LABELS, ...(bridge.config.labels || {}) },
            values: () => this.values(),
            onDelete: () => this.remove(),
            onSize: (width, height) => this.resizeFromForm(width, height),
            onLink: href => this.setLink(href),
        });
        this.dom.appendChild(this.toolbar.element);
        this.observer = null;
        this.render();
    }

    maxWidth() {
        return Math.min(Number(this.bridge.config.stickerMaxSize) || 100, super.maxWidth());
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
        this.node = node;
        this.render();
        return true;
    }

    selectNode() {
        super.selectNode();
        this.toolbar.show();
    }

    deselectNode() {
        super.deselectNode();
        this.toolbar.hide();
    }

    values() {
        const link = this.node.marks.find(mark => mark.type === this.view.state.schema.marks.link);
        return { ...this.currentSize(), href: link?.attrs.href || '' };
    }

    resizeFromForm(width, height) {
        const current = this.currentSize();
        this.updateSize(width || current.width || 100, height || current.height || 100);
    }

    updateSize(width, height) {
        const maximum = Number(this.bridge.config.stickerMaxSize) || 100;
        super.updateSize(Math.min(maximum, width), Math.min(maximum, height));
    }

    updateAttrs(attrs, marks = this.node.marks) {
        const position = this.position();
        if (position === null) return;
        const transaction = this.view.state.tr.setNodeMarkup(position, null, { ...this.node.attrs, ...attrs }, marks);
        transaction.setSelection(NodeSelection.create(transaction.doc, position));
        this.view.dispatch(transaction);
    }

    setLink(value) {
        const href = safeHref(value);
        const linkType = this.view.state.schema.marks.link;
        const marks = this.node.marks.filter(mark => mark.type !== linkType);
        if (href) marks.push(linkType.create({ href, target: '_blank', rel: 'noreferrer noopener' }));
        this.updateAttrs({}, marks);
    }

    remove() {
        const position = this.position();
        if (position === null) return;
        this.view.dispatch(this.view.state.tr.delete(position, position + this.node.nodeSize));
        this.view.focus();
    }

    destroy() {
        this.observer?.disconnect();
        if (this.media.tagName === 'VIDEO') this.media.pause();
    }
}

export function stickerNodeView(bridge) {
    return (node, view, getPos) => new StickerView(node, view, getPos, bridge);
}
