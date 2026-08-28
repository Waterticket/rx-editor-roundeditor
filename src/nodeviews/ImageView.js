import { MediaNodeView } from './MediaNodeView.js';
import { FloatingToolbar } from '../ui/FloatingToolbar.js';
import { NodeSelection } from 'prosemirror-state';

const FALLBACK_LABELS = {
    imageDelete: 'Delete image', imageSize: 'Image size', imageLink: 'Image link', imageAlt: 'Alternative text',
    imageWidth: 'Width', imageHeight: 'Height', url: 'URL', apply: 'Apply', alignLeft: 'Align left',
    alignCenter: 'Align center', alignRight: 'Align right',
};

function safeHref(value) {
    const href = String(value || '').trim();
    return /^\s*(?:javascript|vbscript|data):/i.test(href) ? '' : href;
}

export class ImageView extends MediaNodeView {
    constructor(node, view, getPos, bridge) {
        const image = document.createElement('img');
        image.draggable = false;
        super(node, view, getPos, image);
        this.bridge = bridge;
        this.dom.classList.add('roundeditor__media--image');
        this.toolbar = new FloatingToolbar({
            labels: { ...FALLBACK_LABELS, ...(bridge.config.labels || {}) },
            values: () => this.values(),
            onDelete: () => this.remove(),
            onSize: (width, height) => this.resizeFromForm(width, height),
            onLink: href => this.setLink(href),
            onAlt: alt => this.setAlt(alt),
            onAlign: align => this.setAlign(align),
        });
        this.dom.appendChild(this.toolbar.element);
        this.surface = null;
        this.placeToolbarOnScroll = () => {
            if (this.dom.classList.contains('roundeditor__media--selected')) this.placeToolbar();
        };
        this.render();
    }

    render() {
        this.media.src = this.node.attrs.src;
        this.media.alt = this.node.attrs.alt || '';
        this.media.dataset.fileSrl = this.node.attrs.fileSrl || '';
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
        const spaceAbove = mediaRect.top - surfaceRect.top;
        this.toolbar.element.classList.toggle('roundeditor__media-toolbar--below', spaceAbove < toolbarHeight + 12);
    }

    values() {
        const size = this.currentSize();
        const link = this.node.marks.find(mark => mark.type === this.view.state.schema.marks.link);
        return { ...size, alt: this.node.attrs.alt || '', href: link?.attrs.href || '' };
    }

    resizeFromForm(width, height) {
        const current = this.currentSize();
        const ratio = current.width && current.height ? current.width / current.height : 1;
        let nextWidth = width || current.width || 320;
        let nextHeight = height || current.height || nextWidth / ratio;
        if (width && current.width && width !== current.width) nextHeight = width / ratio;
        else if (height && current.height && height !== current.height) nextWidth = height * ratio;
        this.updateSize(nextWidth, nextHeight);
    }

    updateAttrs(attrs, marks = this.node.marks) {
        const position = this.position();
        if (position === null) return;
        const transaction = this.view.state.tr.setNodeMarkup(position, null, { ...this.node.attrs, ...attrs }, marks);
        transaction.setSelection(NodeSelection.create(transaction.doc, position));
        this.view.dispatch(transaction);
    }

    setAlt(alt) {
        this.updateAttrs({ alt });
    }

    setLink(value) {
        const href = safeHref(value);
        const linkType = this.view.state.schema.marks.link;
        const marks = this.node.marks.filter(mark => mark.type !== linkType);
        if (href) marks.push(linkType.create({ href, target: '_blank', rel: 'noreferrer noopener' }));
        this.updateAttrs({}, marks);
    }

    setAlign(align) {
        const position = this.position();
        if (position === null) return;
        const $position = this.view.state.doc.resolve(position);
        for (let depth = $position.depth; depth > 0; depth--) {
            const parent = $position.node(depth);
            if (!parent.isTextblock) continue;
            const parentPosition = $position.before(depth);
            const transaction = this.view.state.tr.setNodeMarkup(parentPosition, null, { ...parent.attrs, align });
            transaction.setSelection(NodeSelection.create(transaction.doc, position));
            this.view.dispatch(transaction);
            return;
        }
    }

    remove() {
        const position = this.position();
        if (position === null) return;
        this.view.dispatch(this.view.state.tr.delete(position, position + this.node.nodeSize));
        this.view.focus();
    }

    destroy() {
        this.surface?.removeEventListener('scroll', this.placeToolbarOnScroll);
    }
}

export function imageNodeView(bridge) {
    return (node, view, getPos) => new ImageView(node, view, getPos, bridge);
}
