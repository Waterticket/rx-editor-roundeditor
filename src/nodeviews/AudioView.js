import { NodeSelection } from 'prosemirror-state';
import { normalizeRhymixUrl } from '../rhymix/upload.js';
import { AudioFloatingToolbar } from '../ui/FloatingToolbar.js';
import { MediaNodeView } from './MediaNodeView.js';

const FALLBACK_LABELS = {
    audio: 'Audio', audioDelete: 'Delete audio', audioSource: 'Audio source',
    audioAutoplay: 'Autoplay', audioControls: 'Show controls', audioLoop: 'Loop',
    audioMuted: 'Muted', apply: 'Apply', invalidUrl: 'Enter a safe URL.',
};

export class AudioView extends MediaNodeView {
    constructor(node, view, getPos, bridge) {
        const audio = document.createElement('audio');
        audio.draggable = false;
        super(node, view, getPos, audio);
        this.bridge = bridge;
        this.labels = { ...FALLBACK_LABELS, ...(bridge.config.labels || {}) };
        this.dom.classList.add('roundeditor__media--audio');
        this.suppressPlaybackClick = false;
        this.selectForEditing = () => {
            const position = this.position();
            if (position === null) return false;
            this.view.dispatch(this.view.state.tr.setSelection(NodeSelection.create(this.view.state.doc, position)));
            return true;
        };
        this.selectBeforePlayback = event => {
            if (this.dom.classList.contains('roundeditor__media--selected')) return;
            if (!this.selectForEditing()) return;
            this.suppressPlaybackClick = true;
            event.preventDefault();
            event.stopImmediatePropagation();
        };
        this.blockFirstPlayback = event => {
            const needsSelection = !this.dom.classList.contains('roundeditor__media--selected');
            if (!this.suppressPlaybackClick && !needsSelection) return;
            if (needsSelection && !this.selectForEditing()) return;
            this.suppressPlaybackClick = true;
            event.preventDefault();
            event.stopImmediatePropagation();
            if (event.type === 'click') this.suppressPlaybackClick = false;
        };
        this.media.addEventListener('pointerdown', this.selectBeforePlayback, true);
        this.media.addEventListener('mousedown', this.blockFirstPlayback, true);
        this.media.addEventListener('click', this.blockFirstPlayback, true);
        this.selectionCover = document.createElement('span');
        this.selectionCover.className = 'roundeditor__audio-selection-cover';
        this.selectionCover.contentEditable = 'false';
        this.selectionCover.setAttribute('aria-hidden', 'true');
        this.selectFromCover = event => {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.suppressPlaybackClick = true;
            this.selectForEditing();
        };
        this.selectionCover.addEventListener('mousedown', this.selectFromCover, true);
        this.dom.appendChild(this.selectionCover);
        this.toolbar = new AudioFloatingToolbar({
            labels: this.labels,
            values: () => this.values(),
            onDelete: () => this.remove(),
            onSource: src => this.updateAttrs({ src: normalizeRhymixUrl(src) }),
            onToggleAutoplay: () => this.updateAttrs({ autoplay: !this.node.attrs.autoplay }),
            onToggleControls: () => this.updateAttrs({ controls: !this.node.attrs.controls }),
            onToggleLoop: () => this.updateAttrs({ loop: !this.node.attrs.loop }),
            onToggleMuted: () => this.updateAttrs({ muted: !this.node.attrs.muted }),
        });
        this.dom.appendChild(this.toolbar.element);
        this.surface = null;
        this.placeToolbarOnScroll = () => {
            if (this.dom.classList.contains('roundeditor__media--selected')) this.placeToolbar();
        };
        this.render();
    }

    render() {
        const source = this.node.attrs.src || '';
        if (this.media.getAttribute('src') !== source) {
            this.media.pause();
            if (source) this.media.setAttribute('src', source);
            else this.media.removeAttribute('src');
            this.media.load();
        }
        // Keep the player visible and prevent saved autoplay settings from
        // firing while the document is being edited. The toolbar reflects the
        // real document attributes and serialization preserves them.
        this.media.controls = true;
        this.media.autoplay = false;
        this.media.loop = false;
        this.media.muted = false;
        this.media.preload = 'metadata';
        this.media.setAttribute('aria-label', this.labels.audio);
        this.media.dataset.fileSrl = this.node.attrs.fileSrl || '';
        this.dom.style.width = this.node.attrs.displayWidth || '';
        this.toolbar.refresh();
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
            src: this.node.attrs.src,
            autoplay: this.node.attrs.autoplay,
            controls: this.node.attrs.controls,
            loop: this.node.attrs.loop,
            muted: this.node.attrs.muted,
        };
    }

    updateAttrs(attrs) {
        const position = this.position();
        if (position === null) return;
        const transaction = this.view.state.tr.setNodeMarkup(position, null, { ...this.node.attrs, ...attrs });
        transaction.setSelection(NodeSelection.create(transaction.doc, position));
        this.view.dispatch(transaction);
    }

    remove() {
        const position = this.position();
        if (position === null) return;
        this.view.dispatch(this.view.state.tr.delete(position, position + this.node.nodeSize));
        this.view.focus();
    }

    destroy() {
        this.surface?.removeEventListener('scroll', this.placeToolbarOnScroll);
        this.media.removeEventListener('pointerdown', this.selectBeforePlayback, true);
        this.media.removeEventListener('mousedown', this.blockFirstPlayback, true);
        this.media.removeEventListener('click', this.blockFirstPlayback, true);
        this.selectionCover.removeEventListener('mousedown', this.selectFromCover, true);
        this.media.pause();
    }
}

export function audioNodeView(bridge) {
    return (node, view, getPos) => new AudioView(node, view, getPos, bridge);
}
