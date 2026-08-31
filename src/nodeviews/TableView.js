import { NodeSelection } from 'prosemirror-state';
import { updateColumnsOnResize } from 'prosemirror-tables';
import { insertBlankParagraphBefore, tableNeedsLeadingParagraph } from '../mediaInsertion.js';

const FALLBACK_LABELS = {
    tableCaption: 'Table description',
    tableCaptionPlaceholder: 'Add a description for the table',
    tableInsertParagraphBefore: 'Insert empty paragraphs above table',
};
let tableViewSequence = 0;

export class TableView {
    constructor(node, view, getPos, bridge) {
        this.node = node;
        this.view = view;
        this.getPos = getPos;
        this.labels = { ...FALLBACK_LABELS, ...(bridge.config.labels || {}) };
        this.dom = document.createElement('div');
        this.dom.className = 'roundeditor__table-wrap';
        this.dom.dataset.roundeditorTableId = `table-${++tableViewSequence}`;
        this.resizeStyle = document.createElement('style');
        this.resizeStyle.className = 'roundeditor__table-resize-style';
        this.edge = document.createElement('button');
        this.edge.type = 'button';
        this.edge.className = 'roundeditor__image-edge roundeditor__table-edge';
        this.edge.setAttribute('aria-label', this.labels.tableInsertParagraphBefore);
        this.edge.addEventListener('click', () => {
            const position = this.position();
            if (position !== null && insertBlankParagraphBefore(this.view, position)) this.refreshEdgeState();
        });
        this.table = document.createElement('table');
        this.defaultCellMinWidth = 100;
        this.table.style.setProperty('--default-cell-min-width', `${this.defaultCellMinWidth}px`);
        this.colgroup = document.createElement('colgroup');
        this.contentDOM = document.createElement('tbody');
        this.table.append(this.colgroup, this.contentDOM);
        this.caption = document.createElement('label');
        this.caption.className = 'roundeditor__table-caption';
        this.captionInput = document.createElement('input');
        this.captionInput.type = 'text';
        this.captionInput.autocomplete = 'off';
        this.captionInput.placeholder = this.labels.tableCaptionPlaceholder;
        this.captionInput.setAttribute('aria-label', this.labels.tableCaption);
        this.caption.appendChild(this.captionInput);
        this.dom.append(this.edge, this.resizeStyle, this.table, this.caption);
        this.captionEditing = false;
        this.captionInput.addEventListener('focus', () => { this.captionEditing = true; this.renderCaption(); });
        this.captionInput.addEventListener('input', () => this.setCaptionFromInput());
        this.captionInput.addEventListener('blur', () => {
            this.captionEditing = false;
            this.setCaption(this.captionInput.value.trim(), false);
            this.renderCaption();
        });
        for (const type of ['pointerdown', 'mousedown', 'click']) this.captionInput.addEventListener(type, event => event.stopPropagation());
        this.captionInput.addEventListener('keydown', event => {
            if (!['Enter', 'Escape'].includes(event.key)) return;
            event.preventDefault();
            this.captionInput.blur();
            this.view.focus();
        });
        this.showCaption = event => {
            if (event.target.closest('.roundeditor__table-caption, .roundeditor__table-edge')) return;
            this.dom.classList.remove('roundeditor__table-wrap--caption-dismissed');
            this.captionEditing = true;
            this.renderCaption();
        };
        this.deactivateCaption = () => {
            if (this.node.attrs.caption) return;
            this.captionEditing = false;
            this.renderCaption();
        };
        this.dismissCaptionOutside = event => {
            if (this.dom.contains(event.target) || this.node.attrs.caption) return;
            this.dom.classList.add('roundeditor__table-wrap--caption-dismissed');
            this.dom.classList.remove('roundeditor__table-wrap--active');
            this.deactivateCaption();
        };
        // Table cell selection is handled by ProseMirror on mouse down. Show
        // the description field at that same point so it remains available
        // after the selection transaction completes.
        this.dom.addEventListener('mousedown', this.showCaption, true);
        this.dom.addEventListener('click', this.showCaption);
        this.dom.addEventListener('roundeditor:table-deactivate', this.deactivateCaption);
        document.addEventListener('mousedown', this.dismissCaptionOutside, true);
        this.dom.addEventListener('pointerenter', () => this.refreshEdgeState());
        this.render();
    }

    position() {
        try {
            const position = this.getPos();
            return Number.isInteger(position) ? position : null;
        } catch (error) { return null; }
    }

    render() { updateColumnsOnResize(this.node, this.colgroup, this.table, this.defaultCellMinWidth); this.renderCaption(); this.refreshEdgeState(); }
    renderCaption() {
        const value = this.node.attrs.caption || '';
        if (document.activeElement !== this.captionInput && this.captionInput.value !== value) this.captionInput.value = value;
        this.caption.hidden = !(value || this.captionEditing || this.dom.classList.contains('roundeditor__table-wrap--selected'));
    }
    refreshEdgeState() {
        const position = this.position();
        if (position !== null) this.edge.hidden = !tableNeedsLeadingParagraph(this.view.state.doc, position);
    }
    setCaptionFromInput() { this.setCaption(this.captionInput.value, false); }
    setCaption(caption, select = true) {
        const position = this.position();
        if (position === null) return;
        const transaction = this.view.state.tr.setNodeMarkup(position, null, { ...this.node.attrs, caption: String(caption || '') });
        if (select) transaction.setSelection(NodeSelection.create(transaction.doc, position));
        this.view.dispatch(transaction);
    }
    update(node) { if (node.type !== this.node.type) return false; this.node = node; this.render(); return true; }
    selectNode() { this.dom.classList.add('roundeditor__table-wrap--selected'); this.renderCaption(); }
    deselectNode() { this.dom.classList.remove('roundeditor__table-wrap--selected'); this.renderCaption(); }
    stopEvent(event) { return Boolean(event.target.closest('.roundeditor__table-caption, .roundeditor__table-edge')); }
    ignoreMutation(mutation) {
        // UI-only changes on the wrapper/caption must not make ProseMirror
        // recreate this node view. Mutations inside the editable table still
        // need normal reconciliation.
        return mutation.target === this.table
            || this.colgroup.contains(mutation.target)
            || mutation.type === 'attributes' && mutation.attributeName === 'style' && mutation.target.matches?.('tr')
            || !this.contentDOM.contains(mutation.target);
    }
    destroy() { document.removeEventListener('mousedown', this.dismissCaptionOutside, true); }
}

export function tableNodeView(bridge) { return (node, view, getPos) => new TableView(node, view, getPos, bridge); }
