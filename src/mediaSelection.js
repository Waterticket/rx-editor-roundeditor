import { NodeSelection, Plugin } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

const RANGE_HIGHLIGHTED_MEDIA = new Set(['audio', 'sticker', 'video']);
const DRAGGABLE_MEDIA_SELECTOR = '.roundeditor__media--image, .roundeditor__media--video, .roundeditor__media--audio';

class MediaDropIndicatorView {
    constructor(view) {
        this.view = view;
        this.surface = view.dom.closest('.roundeditor__surface');
        this.line = document.createElement('div');
        this.line.className = 'roundeditor__media-drop-line';
        this.line.hidden = true;
        this.line.setAttribute('aria-hidden', 'true');
        this.surface.appendChild(this.line);
        this.onDragStart = event => {
            const media = event.target.closest?.(DRAGGABLE_MEDIA_SELECTOR);
            if (!media || !this.view.dom.contains(media)) return;
            this.dragging = true;
            this.surface.classList.add('is-media-dragging');
        };
        this.onDragOver = event => {
            if (!this.dragging) return;
            const target = this.topLevelBlock(event.target);
            if (!target) return this.hideLine();
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
        };
        this.onDragLeave = event => {
            if (this.dragging && !this.view.dom.contains(event.relatedTarget)) this.hideLine();
        };
        this.onFinish = () => this.finish();
        this.onKeydown = event => { if (event.key === 'Escape') this.finish(); };
        view.dom.addEventListener('dragstart', this.onDragStart, true);
        view.dom.addEventListener('dragover', this.onDragOver, true);
        view.dom.addEventListener('dragleave', this.onDragLeave, true);
        view.dom.addEventListener('drop', this.onFinish, true);
        document.addEventListener('dragend', this.onFinish, true);
        document.addEventListener('keydown', this.onKeydown);
    }

    topLevelBlock(node) {
        let block = node instanceof Node ? node : null;
        if (block?.nodeType === Node.TEXT_NODE) block = block.parentElement;
        while (block && block.parentElement !== this.view.dom) block = block.parentElement;
        return block;
    }

    hideLine() {
        this.line.hidden = true;
    }

    finish() {
        this.dragging = false;
        this.hideLine();
        this.surface.classList.remove('is-media-dragging');
    }

    update(view) {
        this.view = view;
    }

    destroy() {
        this.finish();
        this.view.dom.removeEventListener('dragstart', this.onDragStart, true);
        this.view.dom.removeEventListener('dragover', this.onDragOver, true);
        this.view.dom.removeEventListener('dragleave', this.onDragLeave, true);
        this.view.dom.removeEventListener('drop', this.onFinish, true);
        document.removeEventListener('dragend', this.onFinish, true);
        document.removeEventListener('keydown', this.onKeydown);
        this.line.remove();
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

export function mediaSelectionPlugin() {
    return new Plugin({
        props: {
            decorations: mediaSelectionDecorations,
        },
        view: view => new MediaDropIndicatorView(view),
    });
}
