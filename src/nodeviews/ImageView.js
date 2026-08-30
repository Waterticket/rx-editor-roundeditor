import { MediaNodeView } from './MediaNodeView.js';
import { FloatingToolbar } from '../ui/FloatingToolbar.js';
import { NodeSelection } from 'prosemirror-state';
import { insertBlankParagraphBeforeMedia, mediaNeedsLeadingParagraph } from '../mediaInsertion.js';
import { svgIcon } from '../icons.js';

const FALLBACK_LABELS = {
    imageDelete: 'Delete image', imageSize: 'Image size', imageLink: 'Image link', imageAlt: 'Alternative text',
    imageWidth: 'Width', imageHeight: 'Height', url: 'URL', apply: 'Apply', alignLeft: 'Align left',
    alignCenter: 'Align center', alignRight: 'Align right',
    sizeReset: 'Remove explicit size',
    imageCaption: 'Image caption', imageCaptionPlaceholder: 'Add a caption',
    imageCoverSet: 'Set as representative image', imageCoverUnset: 'Unset representative image',
    imageInsertParagraphBefore: 'Insert an empty paragraph above image',
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
        this.labels = { ...FALLBACK_LABELS, ...(bridge.config.labels || {}) };
        this.imageFrame = document.createElement('span');
        this.imageFrame.className = 'roundeditor__image-frame';
        this.imageFrame.append(this.media, ...this.handles);
        this.dom.appendChild(this.imageFrame);
        this.edge = document.createElement('button');
        this.edge.type = 'button';
        this.edge.className = 'roundeditor__image-edge roundeditor__image-edge--top';
        this.edge.setAttribute('aria-label', this.labels.imageInsertParagraphBefore);
        this.edge.addEventListener('click', () => {
            const position = this.position();
            if (position !== null && insertBlankParagraphBeforeMedia(this.view, position)) this.refreshEdgeState();
        });
        this.dom.prepend(this.edge);
        this.refreshEdgeOnPointerEnter = () => this.refreshEdgeState();
        this.dom.addEventListener('pointerenter', this.refreshEdgeOnPointerEnter);
        this.cover = document.createElement('button');
        this.cover.type = 'button';
        this.cover.className = 'roundeditor__image-cover';
        this.cover.setAttribute('role', 'checkbox');
        this.cover.append(svgIcon('cover'), document.createElement('span'));
        this.cover.lastElementChild.textContent = '대표';
        this.cover.addEventListener('click', () => this.bridge.attachments?.toggleCover(this.node.attrs.fileSrl));
        this.imageFrame.appendChild(this.cover);
        this.caption = document.createElement('label');
        this.caption.className = 'roundeditor__image-caption';
        this.captionInput = document.createElement('input');
        this.captionInput.type = 'text';
        this.captionInput.draggable = false;
        this.captionInput.autocomplete = 'off';
        this.captionInput.placeholder = this.labels.imageCaptionPlaceholder;
        this.captionInput.setAttribute('aria-label', this.labels.imageCaption);
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
        this.toolbar = new FloatingToolbar({
            labels: this.labels,
            values: () => this.values(),
            onDelete: () => this.remove(),
            onSize: (width, height) => this.resizeFromForm(width, height),
            onResetSize: () => this.resetSize(),
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
        this.media.alt = this.node.attrs.caption || this.node.attrs.alt || '';
        this.media.dataset.fileSrl = this.node.attrs.fileSrl || '';
        this.renderSize();
        this.renderCaption();
        this.refreshCoverState();
        this.refreshEdgeState();
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
        this.cover.setAttribute('aria-label', selected ? this.labels.imageCoverUnset : this.labels.imageCoverSet);
        this.cover.classList.toggle('roundeditor__image-cover--checked', selected);
    }

    refreshEdgeState() {
        const position = this.position();
        if (position === null) return;
        this.edge.hidden = !mediaNeedsLeadingParagraph(this.view.state.doc, position);
    }

    update(node) {
        if (node.type !== this.node.type) return false;
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
        const mediaRect = this.imageFrame.getBoundingClientRect();
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
        const widthChanged = width && width !== current.width;
        const heightChanged = height && height !== current.height;
        if (widthChanged && !heightChanged) nextHeight = width / ratio;
        else if (heightChanged && !widthChanged) nextWidth = height * ratio;
        this.updateSize(nextWidth, nextHeight);
    }

    resetSize() {
        this.updateAttrs({ width: null, height: null, displayWidth: null, displayHeight: null });
    }

    updateAttrs(attrs, marks = this.node.marks, { select = true } = {}) {
        const position = this.position();
        if (position === null) return;
        const transaction = this.view.state.tr.setNodeMarkup(position, null, { ...this.node.attrs, ...attrs }, marks);
        if (select) transaction.setSelection(NodeSelection.create(transaction.doc, position));
        this.view.dispatch(transaction);
    }

    setAlt(alt, options = {}) {
        this.updateAttrs({ alt: String(alt || '') }, this.node.marks, options);
    }

    setCaption(caption, options = {}) {
        this.updateAttrs({ caption: String(caption || '') }, this.node.marks, options);
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
        this.dom.removeEventListener('pointerenter', this.refreshEdgeOnPointerEnter);
        this.bridge.imageViews?.delete(this);
    }
}

export function imageNodeView(bridge) {
    return (node, view, getPos) => new ImageView(node, view, getPos, bridge);
}
