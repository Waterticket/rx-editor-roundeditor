import { NodeSelection } from 'prosemirror-state';

const MIN_SIZE = 24;

function pixels(value) {
    const number = Number.parseFloat(String(value || ''));
    return Number.isFinite(number) && number > 0 ? number : 0;
}

export class MediaNodeView {
    constructor(node, view, getPos, media) {
        this.node = node;
        this.view = view;
        this.getPos = getPos;
        this.media = media;
        this.dom = document.createElement(node.type.isInline ? 'span' : 'div');
        this.dom.className = 'roundeditor__media';
        this.dom.contentEditable = 'false';
        this.dom.draggable = true;
        this.dom.appendChild(media);
        this.handles = ['nw', 'ne', 'sw', 'se'].map(direction => {
            const handle = document.createElement('span');
            handle.className = `roundeditor__media-handle roundeditor__media-handle--${direction}`;
            handle.dataset.resizeDirection = direction;
            handle.setAttribute('aria-hidden', 'true');
            handle.addEventListener('pointerdown', event => this.startResize(event, direction));
            this.dom.appendChild(handle);
            return handle;
        });
    }

    currentSize() {
        return {
            width: pixels(this.node.attrs.displayWidth || this.node.attrs.width || this.media.width),
            height: pixels(this.node.attrs.displayHeight || this.node.attrs.height || this.media.height),
        };
    }

    maxWidth() {
        const editor = this.dom.closest('.ProseMirror');
        if (!editor) return 640;
        const style = window.getComputedStyle(editor);
        const padding = pixels(style.paddingLeft) + pixels(style.paddingRight);
        const measured = editor.clientWidth || editor.getBoundingClientRect().width;
        return Math.max(MIN_SIZE, measured > padding ? measured - padding : 640);
    }

    previewSize(width, height) {
        this.media.style.width = `${Math.round(width)}px`;
        this.media.style.height = `${Math.round(height)}px`;
        this.media.style.aspectRatio = `${width} / ${height}`;
        this.dom.style.width = `${Math.round(width)}px`;
    }

    startResize(event, direction) {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        const handle = event.currentTarget;
        handle.setPointerCapture?.(event.pointerId);
        const rect = this.media.getBoundingClientRect();
        const current = this.currentSize();
        const startWidth = rect.width || current.width || MIN_SIZE;
        const startHeight = rect.height || current.height || MIN_SIZE;
        const ratio = startWidth / startHeight || 1;
        const startX = event.clientX;
        const startY = event.clientY;
        const horizontalSign = direction.endsWith('e') ? 1 : -1;
        const verticalSign = direction.startsWith('s') ? 1 : -1;
        let nextWidth = startWidth;
        let nextHeight = startHeight;
        let settled = false;

        const move = moveEvent => {
            if (settled) return;
            moveEvent.preventDefault();
            nextWidth = Math.min(this.maxWidth(), Math.max(MIN_SIZE, startWidth + ((moveEvent.clientX - startX) * horizontalSign)));
            nextHeight = moveEvent.altKey
                ? Math.max(MIN_SIZE, startHeight + ((moveEvent.clientY - startY) * verticalSign))
                : Math.max(MIN_SIZE, nextWidth / ratio);
            this.previewSize(nextWidth, nextHeight);
        };
        const cleanup = () => {
            window.removeEventListener('pointermove', move, true);
            window.removeEventListener('pointerup', finish, true);
            window.removeEventListener('pointercancel', cancel, true);
        };
        const finish = finishEvent => {
            if (settled) return;
            settled = true;
            cleanup();
            if (handle.hasPointerCapture?.(event.pointerId)) handle.releasePointerCapture(event.pointerId);
            finishEvent.preventDefault?.();
            this.updateSize(nextWidth, nextHeight);
        };
        const cancel = () => {
            if (settled) return;
            settled = true;
            cleanup();
            this.renderSize();
        };
        window.addEventListener('pointermove', move, true);
        window.addEventListener('pointerup', finish, true);
        window.addEventListener('pointercancel', cancel, true);
    }

    updateSize(width, height) {
        const position = this.position();
        if (position === null) return;
        const boundedWidth = Math.round(Math.min(this.maxWidth(), Math.max(MIN_SIZE, width)));
        const boundedHeight = Math.round(Math.max(MIN_SIZE, height));
        const transaction = this.view.state.tr.setNodeMarkup(position, null, {
            ...this.node.attrs,
            width: boundedWidth,
            height: boundedHeight,
            displayWidth: `${boundedWidth}px`,
            displayHeight: `${boundedHeight}px`,
        });
        transaction.setSelection(NodeSelection.create(transaction.doc, position));
        this.view.dispatch(transaction);
    }

    position() {
        try {
            const position = this.getPos();
            return Number.isInteger(position) ? position : null;
        } catch (error) {
            return null;
        }
    }

    renderSize() {
        const width = pixels(this.node.attrs.width);
        const height = pixels(this.node.attrs.height);
        this.media.style.width = this.node.attrs.displayWidth || (width ? `${width}px` : '');
        this.media.style.height = this.node.attrs.displayHeight || (height ? `${height}px` : '');
        const displayWidth = pixels(this.media.style.width);
        const displayHeight = pixels(this.media.style.height);
        this.media.style.aspectRatio = displayWidth && displayHeight ? `${displayWidth} / ${displayHeight}` : '';
        this.dom.style.width = this.media.style.width;
    }

    selectNode() {
        this.dom.classList.add('roundeditor__media--selected');
    }

    deselectNode() {
        this.dom.classList.remove('roundeditor__media--selected');
    }

    stopEvent(event) {
        return Boolean(event.target.closest('.roundeditor__media-toolbar, .roundeditor__media-handle, .roundeditor__image-cover, .roundeditor__image-caption, .roundeditor__image-edge'));
    }

    ignoreMutation() {
        return true;
    }
}
