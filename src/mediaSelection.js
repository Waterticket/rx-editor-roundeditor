import { NodeSelection, Plugin } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { insertBlankParagraphBefore, isNonTextItem, nonTextItemNeedsLeadingParagraph } from './mediaInsertion.js';

const RANGE_HIGHLIGHTED_MEDIA = new Set(['audio', 'video']);
const DRAGGABLE_MEDIA_SELECTOR = [
    '.roundeditor__media--image',
    '.roundeditor__media--video',
    '.roundeditor__media--audio',
    '.roundeditor__raw--block',
    '.roundeditor__oembed',
].join(', ');
const NON_TEXT_ITEM_SELECTOR = [
    '.roundeditor__media',
    '.roundeditor__table-wrap',
    '[data-roundeditor-raw-node]',
    'hr',
].join(', ');
export const MEDIA_HANDLE_DRAG_START_EVENT = 'roundeditor:media-handle-dragstart';

export function startMediaHandleDrag(view, source) {
    view?.dom.dispatchEvent(new window.CustomEvent(MEDIA_HANDLE_DRAG_START_EVENT, {
        bubbles: true,
        detail: { source },
    }));
}

class MediaDropIndicatorView {
    constructor(view, options = {}) {
        this.view = view;
        this.doc = view.state.doc;
        this.labels = options.labels || {};
        this.leadingPosition = null;
        this.surface = view.dom.closest('.roundeditor__surface');
        this.line = document.createElement('div');
        this.line.className = 'roundeditor__media-drop-line';
        this.line.hidden = true;
        this.line.setAttribute('aria-hidden', 'true');
        this.surface.appendChild(this.line);
        this.leadingEdge = document.createElement('button');
        this.leadingEdge.type = 'button';
        this.leadingEdge.className = 'roundeditor__image-edge roundeditor__global-media-edge';
        this.leadingEdge.hidden = true;
        this.leadingEdge.setAttribute('aria-label', this.labels.mediaInsertParagraphBefore || 'Insert empty paragraphs above item');
        this.leadingEdge.addEventListener('click', () => {
            if (this.leadingPosition === null) return;
            if (insertBlankParagraphBefore(this.view, this.leadingPosition)) this.hideLeadingEdge();
        });
        this.surface.appendChild(this.leadingEdge);
        this.onDragStart = event => {
            const media = event.target.closest?.(DRAGGABLE_MEDIA_SELECTOR);
            if (!media || !this.view.dom.contains(media)) return;
            this.start(media, false);
        };
        this.onHandleDragStart = event => {
            const source = event.detail?.source;
            if (!(source instanceof Node) || !this.view.dom.contains(source)) return;
            this.start(source, true);
        };
        this.onDragOver = event => this.positionLine(event);
        this.onMouseMove = event => {
            if (this.handleDragging) this.positionLine(event);
        };
        this.onEditorMouseMove = event => this.positionLeadingEdge(event.target);
        this.onEditorMouseLeave = event => {
            if (!this.surface.contains(event.relatedTarget)) this.hideLeadingEdge();
        };
        this.onDragLeave = event => {
            if (this.dragging && !this.view.dom.contains(event.relatedTarget)) this.hideLine();
        };
        this.onFinish = () => this.finish();
        this.onKeydown = event => { if (event.key === 'Escape') this.finish(); };
        view.dom.addEventListener('dragstart', this.onDragStart, true);
        view.dom.addEventListener(MEDIA_HANDLE_DRAG_START_EVENT, this.onHandleDragStart, true);
        view.dom.addEventListener('dragover', this.onDragOver, true);
        view.dom.addEventListener('dragleave', this.onDragLeave, true);
        view.dom.addEventListener('drop', this.onFinish, true);
        view.dom.addEventListener('mousemove', this.onEditorMouseMove, true);
        this.surface.addEventListener('mouseleave', this.onEditorMouseLeave);
        document.addEventListener('mousemove', this.onMouseMove, true);
        document.addEventListener('mouseup', this.onFinish, true);
        document.addEventListener('dragend', this.onFinish, true);
        document.addEventListener('keydown', this.onKeydown);
    }

    start(source, handleDragging) {
        this.dragging = true;
        this.handleDragging = handleDragging;
        this.dragSource = source;
        this.surface.classList.add('is-media-dragging');
        this.hideLeadingEdge();
    }

    positionLine(event) {
        if (!this.dragging) return;
        const target = this.topLevelBlock(event.target);
        if (!target || target === this.dragSource) return this.hideLine();
        const surface = this.surface.getBoundingClientRect();
        const editor = this.view.dom.getBoundingClientRect();
        const block = target.getBoundingClientRect();
        const top = (event.clientY > block.top + block.height / 2 ? block.bottom : block.top)
            - surface.top + this.surface.scrollTop;
        Object.assign(this.line.style, {
            left: `${editor.left - surface.left + this.surface.scrollLeft}px`,
            top: `${top}px`,
            width: `${editor.width}px`,
        });
        this.line.hidden = false;
    }

    topLevelBlock(node) {
        let block = node instanceof Node ? node : null;
        if (block?.nodeType === Node.TEXT_NODE) block = block.parentElement;
        while (block && block.parentElement !== this.view.dom) block = block.parentElement;
        return block;
    }

    itemPosition(target) {
        let position = null;
        this.view.state.doc.descendants((node, nodePosition) => {
            if (!isNonTextItem(node)) return true;
            const nodeDom = this.view.nodeDOM(nodePosition);
            if (nodeDom !== target) return true;
            position = nodePosition;
            return false;
        });
        return position;
    }

    positionLeadingEdge(node) {
        if (this.dragging) return this.hideLeadingEdge();
        const element = node instanceof Node && node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
        const target = element?.closest?.(NON_TEXT_ITEM_SELECTOR);
        if (!target || !this.view.dom.contains(target)) return this.hideLeadingEdge();
        // Image, video, and table NodeViews already own a type-specific edge.
        // The global edge fills the same behavior for every other non-text atom.
        if (target.querySelector?.(':scope > .roundeditor__image-edge')) return this.hideLeadingEdge();
        const position = this.itemPosition(target);
        if (position === null || !nonTextItemNeedsLeadingParagraph(this.view.state.doc, position)) {
            return this.hideLeadingEdge();
        }
        const surface = this.surface.getBoundingClientRect();
        const editor = this.view.dom.getBoundingClientRect();
        const item = target.getBoundingClientRect();
        Object.assign(this.leadingEdge.style, {
            left: `${editor.left - surface.left + this.surface.scrollLeft}px`,
            top: `${item.top - surface.top + this.surface.scrollTop - 18}px`,
            width: `${editor.width}px`,
        });
        this.leadingPosition = position;
        this.leadingEdge.hidden = false;
    }

    hideLeadingEdge() {
        this.leadingPosition = null;
        this.leadingEdge.hidden = true;
    }

    hideLine() {
        this.line.hidden = true;
    }

    finish() {
        this.dragging = false;
        this.handleDragging = false;
        this.dragSource = null;
        this.hideLine();
        this.surface.classList.remove('is-media-dragging');
    }

    update(view) {
        const docChanged = view.state.doc !== this.doc;
        this.view = view;
        this.doc = view.state.doc;
        if (docChanged) this.hideLeadingEdge();
    }

    destroy() {
        this.finish();
        this.view.dom.removeEventListener('dragstart', this.onDragStart, true);
        this.view.dom.removeEventListener(MEDIA_HANDLE_DRAG_START_EVENT, this.onHandleDragStart, true);
        this.view.dom.removeEventListener('dragover', this.onDragOver, true);
        this.view.dom.removeEventListener('dragleave', this.onDragLeave, true);
        this.view.dom.removeEventListener('drop', this.onFinish, true);
        this.view.dom.removeEventListener('mousemove', this.onEditorMouseMove, true);
        this.surface.removeEventListener('mouseleave', this.onEditorMouseLeave);
        document.removeEventListener('mousemove', this.onMouseMove, true);
        document.removeEventListener('mouseup', this.onFinish, true);
        document.removeEventListener('dragend', this.onFinish, true);
        document.removeEventListener('keydown', this.onKeydown);
        this.line.remove();
        this.leadingEdge.remove();
    }
}

export function mediaSelectionDecorations(state) {
    const { doc, selection } = state;
    if (selection.empty || selection instanceof NodeSelection) return DecorationSet.empty;

    const decorations = [];
    doc.nodesBetween(selection.from, selection.to, (node, position) => {
        if (!RANGE_HIGHLIGHTED_MEDIA.has(node.type.name)) return;
        if (position < selection.from || position + node.nodeSize > selection.to) return;
        decorations.push(Decoration.node(position, position + node.nodeSize, {
            class: 'roundeditor__media--range-selected',
        }));
    });
    return decorations.length ? DecorationSet.create(doc, decorations) : DecorationSet.empty;
}

export function mediaSelectionPlugin(options = {}) {
    return new Plugin({
        props: {
            decorations: mediaSelectionDecorations,
        },
        view: view => new MediaDropIndicatorView(view, options),
    });
}
