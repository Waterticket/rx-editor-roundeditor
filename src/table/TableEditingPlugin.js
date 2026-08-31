import { Plugin, TextSelection } from 'prosemirror-state';
import {
    addColumnAfter, addColumnBefore, addRowAfter, addRowBefore, CellSelection, deleteColumn, deleteRow,
    deleteTable, toggleHeader,
} from 'prosemirror-tables';
import { hasMergedCells, isTableSelected, selectColumn, selectRow, selectTable, tableContext } from './context.js';
import { addLastColumn, addLastRow, clearAxis, moveAxis, moveTable, setAxisStyle, setRowHeight, sortColumn } from './commands.js';

const fallback = {
    rowActions: 'Row actions', columnActions: 'Column actions', addLastRow: 'Add last row', addLastColumn: 'Add last column',
    selectTable: 'Select entire table',
    headerRow: 'Toggle header row', headerColumn: 'Toggle header column', addRowBefore: 'Add row above', addRowAfter: 'Add row below',
    addColumnBefore: 'Add column left', addColumnAfter: 'Add column right', deleteRow: 'Delete row', deleteColumn: 'Delete column',
    moveRowUp: 'Move row up', moveRowDown: 'Move row down', moveColumnLeft: 'Move column left', moveColumnRight: 'Move column right',
    sortAscending: 'Sort ascending', sortDescending: 'Sort descending', backgroundColor: 'Background color', removeBackgroundColor: 'Remove background color',
    alignLeft: 'Align left', alignCenter: 'Align center', alignRight: 'Align right', alignTop: 'Align top', alignMiddle: 'Align middle', alignBottom: 'Align bottom',
    clearRowContents: 'Clear row contents', clearColumnContents: 'Clear column contents', deleteTable: 'Delete table',
    mergedCellsMoveUnavailable: 'Unavailable when the table contains merged cells.',
};

function element(tag, className, label) {
    const node = document.createElement(tag); node.className = className;
    if (label) { node.title = label; node.setAttribute('aria-label', label); }
    return node;
}

class TableEditingView {
    constructor(view, labels) {
        this.view = view; this.labels = { ...fallback, ...(labels || {}) }; this.context = null; this.raf = 0; this.menu = null; this.drag = null;
        this.surface = view.dom.closest('.roundeditor__surface');
        this.layer = element('div', 'roundeditor__table-overlay');
        this.tableHandle = this.button('select', this.labels.selectTable, '▦');
        this.rowHandle = this.button('row', this.labels.rowActions, '⋮'); this.columnHandle = this.button('column', this.labels.columnActions, '⋯');
        this.addRow = this.button('add-row', this.labels.addLastRow, '+'); this.addColumn = this.button('add-column', this.labels.addLastColumn, '+');
        this.rowResize = element('div', 'roundeditor__table-row-resize'); this.rowResize.setAttribute('aria-hidden', 'true');
        this.dropLine = element('div', 'roundeditor__table-drop-line'); this.dropLine.hidden = true; this.dropLine.setAttribute('aria-hidden', 'true');
        this.layer.append(this.tableHandle, this.rowHandle, this.columnHandle, this.addRow, this.addColumn, this.rowResize, this.dropLine); this.surface.appendChild(this.layer);
        this.onScroll = () => this.schedule(); this.onResize = () => this.schedule(); this.onKeydown = event => { if (event.key === 'Escape') { this.cancelDrag(); this.closeMenu(); } };
        this.surface.addEventListener('scroll', this.onScroll, { passive: true }); window.addEventListener('resize', this.onResize); document.addEventListener('keydown', this.onKeydown);
        this.observer = typeof ResizeObserver === 'function' ? new ResizeObserver(this.onResize) : null; this.observer?.observe(this.surface);
        this.bind(this.rowHandle, 'row'); this.bind(this.columnHandle, 'column');
        this.bindTable();
        this.bindRowResize();
        this.onCellMouseDown = event => this.beginCellSelection(event);
        this.view.dom.addEventListener('mousedown', this.onCellMouseDown, true);
        this.addRow.addEventListener('mousedown', event => event.preventDefault()); this.addColumn.addEventListener('mousedown', event => event.preventDefault());
        this.addRow.addEventListener('click', () => this.run(addLastRow)); this.addColumn.addEventListener('click', () => this.run(addLastColumn));
        this.schedule();
    }
    beginCellSelection(event) {
        if (event.button !== 0 || !event.target.closest('td,th')) return;
        this.cellSelectionDrag = { last: null };
        const finish = () => {
            document.removeEventListener('mouseup', finish);
            const drag = this.cellSelectionDrag;
            this.cellSelectionDrag = null;
            if (!drag?.last) return;
            setTimeout(() => {
                const { anchor, head } = drag.last;
                const selection = this.view.state.selection;
                if (selection instanceof CellSelection && selection.$anchorCell.pos === anchor && selection.$headCell.pos === head) return;
                if (anchor >= this.view.state.doc.content.size || head >= this.view.state.doc.content.size) return;
                window.getSelection?.()?.removeAllRanges();
                this.view.dispatch(this.view.state.tr.setSelection(new CellSelection(
                    this.view.state.doc.resolve(anchor), this.view.state.doc.resolve(head),
                )));
            }, 0);
        };
        document.addEventListener('mouseup', finish);
    }
    bindRowResize() {
        this.rowResize.addEventListener('pointerdown', event => {
            if (event.button !== 0 || !this.context || !this.activeRow) return;
            event.preventDefault();
            this.closeMenu();
            this.rowResize.setPointerCapture?.(event.pointerId);
            this.resizeDrag = {
                pointerId: event.pointerId,
                row: this.context.row,
                startY: event.clientY,
                startHeight: this.activeRow.getBoundingClientRect().height,
                height: this.activeRow.getBoundingClientRect().height,
            };
            this.layer.classList.add('is-resizing-row');
        });
        this.rowResize.addEventListener('pointermove', event => {
            if (!this.resizeDrag || event.pointerId !== this.resizeDrag.pointerId) return;
            const height = Math.max(40, Math.round(this.resizeDrag.startHeight + event.clientY - this.resizeDrag.startY));
            this.resizeDrag.height = height;
            this.showLiveRowHeight(this.resizeDrag.row, height);
            this.schedule();
        });
        const finish = event => {
            if (!this.resizeDrag || event.pointerId !== this.resizeDrag.pointerId) return;
            const drag = this.resizeDrag;
            this.resizeDrag = null;
            this.layer.classList.remove('is-resizing-row');
            this.run(setRowHeight(drag.row, drag.height));
            this.clearLiveRowHeight();
        };
        this.rowResize.addEventListener('pointerup', finish);
        this.rowResize.addEventListener('pointercancel', event => {
            if (!this.resizeDrag || event.pointerId !== this.resizeDrag.pointerId) return;
            this.resizeDrag = null;
            this.layer.classList.remove('is-resizing-row');
            this.clearLiveRowHeight();
            this.place();
        });
    }
    showLiveRowHeight(row, height) {
        const id = this.activeTable?.dataset.roundeditorTableId;
        const style = this.activeTable?.querySelector('.roundeditor__table-resize-style');
        if (!id || !style) return;
        style.textContent = `[data-roundeditor-table-id="${id}"] > table > tbody > tr:nth-child(${row + 1}) { height: ${height}px !important; }`;
    }
    clearLiveRowHeight() {
        const style = this.activeTable?.querySelector('.roundeditor__table-resize-style');
        if (style) style.textContent = '';
    }
    button(kind, label, text) { const button = element('button', `roundeditor__table-${kind}`, label); button.type = 'button'; button.dataset.axis = kind; button.textContent = text; return button; }
    bind(button, axis) {
        button.addEventListener('pointerdown', event => {
            if (event.button !== 0 || !this.context || event.target.closest('.column-resize-handle')) return;
            event.preventDefault(); button.setPointerCapture?.(event.pointerId);
            this.drag = { axis, x: event.clientX, y: event.clientY, index: axis === 'row' ? this.context.row : this.context.column, moved: false, pointerId: event.pointerId };
        });
        button.addEventListener('pointermove', event => this.dragMove(event));
        button.addEventListener('pointerup', event => this.dragEnd(event));
        button.addEventListener('pointercancel', () => this.cancelDrag());
        button.addEventListener('click', event => {
            event.preventDefault();
            if (this.ignoreClick === button) {
                this.ignoreClick = null;
                return;
            }
            this.selectAndOpen(axis);
        });
    }
    bindTable() {
        this.tableHandle.addEventListener('pointerdown', event => {
            if (event.button !== 0 || !this.context) return;
            event.preventDefault(); this.closeMenu();
            selectTable(this.context, this.view.state, tr => this.view.dispatch(tr));
            this.tableHandle.setPointerCapture?.(event.pointerId);
            this.drag = { axis: 'table', x: event.clientX, y: event.clientY, target: null, moved: false, pointerId: event.pointerId };
        });
        this.tableHandle.addEventListener('pointermove', event => this.dragMove(event));
        this.tableHandle.addEventListener('pointerup', event => this.dragEnd(event));
        this.tableHandle.addEventListener('pointercancel', () => this.cancelDrag());
        this.tableHandle.addEventListener('click', event => {
            event.preventDefault();
            if (this.ignoreClick === this.tableHandle) {
                this.ignoreClick = null;
                return;
            }
            if (!this.context) return;
            selectTable(this.context, this.view.state, tr => this.view.dispatch(tr));
            this.openMenu('table');
        });
    }
    dragMove(event) {
        if (!this.drag || event.pointerId !== this.drag.pointerId) return;
        const distance = Math.hypot(event.clientX - this.drag.x, event.clientY - this.drag.y);
        if (distance <= 4) return;
        if (this.drag.axis === 'table') {
            this.drag.moved = true; this.layer.classList.add('is-dragging');
            const target = this.tableDropTarget(event);
            this.drag.target = target?.pos ?? null;
            if (target) this.showTableDropLine(target); else this.dropLine.hidden = true;
            return;
        }
        if (hasMergedCells(this.context)) return;
        this.drag.moved = true; this.layer.classList.add('is-dragging');
        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('td,th');
        if (!target || !this.view.dom.contains(target)) return;
        const pos = this.view.posAtDOM(target, 0); const next = tableContext({ ...this.view.state, selection: TextSelection.near(this.view.state.doc.resolve(pos + 1)) });
        if (!next || next.table.pos !== this.context.table.pos) return;
        this.drag.index = this.drag.axis === 'row' ? next.row : next.column;
        this.layer.style.setProperty('--roundeditor-table-drop', `${this.drag.axis}:${this.drag.index}`);
    }
    dragEnd(event) {
        if (!this.drag || event.pointerId !== this.drag.pointerId) return;
        const drag = this.drag; this.cancelDrag();
        if (!drag.moved) return;
        this.ignoreClick = event.currentTarget;
        if (drag.axis === 'table') {
            if (drag.target != null) this.run(moveTable(drag.target));
            return;
        }
        const from = drag.axis === 'row' ? this.context.row : this.context.column;
        if (from !== drag.index) this.run(moveAxis(drag.axis, from, drag.index));
    }
    tableDropTarget(event) {
        let block = document.elementFromPoint(event.clientX, event.clientY);
        while (block && block.parentElement !== this.view.dom) block = block.parentElement;
        if (!block) return null;
        let target = null;
        this.view.state.doc.forEach((node, pos) => {
            if (this.view.nodeDOM(pos) !== block) return;
            const rect = block.getBoundingClientRect();
            target = { pos: event.clientY > rect.top + rect.height / 2 ? pos + node.nodeSize : pos, rect, after: event.clientY > rect.top + rect.height / 2 };
        });
        if (!target) return null;
        const from = this.context.table.pos, end = from + this.context.table.node.nodeSize;
        return target.pos === from || target.pos === end || target.pos > from && target.pos < end ? null : target;
    }
    showTableDropLine(target) {
        const surface = this.surface.getBoundingClientRect();
        const editor = this.view.dom.getBoundingClientRect();
        const top = (target.after ? target.rect.bottom : target.rect.top) - surface.top + this.surface.scrollTop;
        Object.assign(this.dropLine.style, {
            left: `${editor.left - surface.left + this.surface.scrollLeft}px`,
            top: `${top}px`,
            width: `${editor.width}px`,
        });
        this.dropLine.hidden = false;
    }
    cancelDrag() {
        this.drag = null; this.layer.classList.remove('is-dragging'); this.dropLine.hidden = true;
    }
    selectAndOpen(axis) { const select = axis === 'row' ? selectRow : selectColumn; select(this.context, this.view.state, tr => this.view.dispatch(tr)); this.openMenu(axis); }
    run(command) { if (command(this.view.state, this.view.dispatch, this.view)) this.view.focus(); }
    update(view) {
        this.view = view;
        const selection = view.state.selection;
        if (this.cellSelectionDrag && selection instanceof CellSelection && selection.$anchorCell.pos !== selection.$headCell.pos) {
            this.cellSelectionDrag.last = { anchor: selection.$anchorCell.pos, head: selection.$headCell.pos };
        }
        this.schedule();
    }
    schedule() {
        if (this.raf) return;
        const nextFrame = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : callback => setTimeout(callback, 0);
        this.raf = nextFrame(() => { this.raf = 0; this.place(); });
    }
    place() {
        if (this.surface.hidden) return this.hide();
        this.context = tableContext(this.view.state); if (!this.context) return this.hide();
        const tableNodeDom = this.view.nodeDOM(this.context.table.pos); const cellDom = this.view.nodeDOM(this.context.$cell.pos);
        const tableDom = tableNodeDom?.matches?.('table') ? tableNodeDom : tableNodeDom?.querySelector?.('table');
        const tableWrap = tableDom?.closest?.('.roundeditor__table-wrap') || tableNodeDom;
        const rowDom = cellDom?.closest?.('tr');
        if (!(tableDom instanceof HTMLElement) || !(tableWrap instanceof HTMLElement) || !(cellDom instanceof HTMLElement) || !(rowDom instanceof HTMLElement)) return this.hide();
        if (this.activeTable && this.activeTable !== tableWrap) this.deactivateTable(this.activeTable);
        this.activeTable = tableWrap; this.activeRow = rowDom;
        tableWrap.classList.add('roundeditor__table-wrap--active');
        const surface = this.surface.getBoundingClientRect(), table = tableDom.getBoundingClientRect(), cell = cellDom.getBoundingClientRect(), row = rowDom.getBoundingClientRect(); const sl = this.surface.scrollLeft, st = this.surface.scrollTop;
        const x = cell.left - surface.left + sl, y = cell.top - surface.top + st;
        Object.assign(this.tableHandle.style, { left: `${table.left - surface.left + sl}px`, top: `${table.top - surface.top + st}px` });
        Object.assign(this.columnHandle.style, { left: `${x + cell.width / 2}px`, top: `${table.top - surface.top + st - 10}px`, width: `${cell.width}px` });
        Object.assign(this.rowHandle.style, { left: `${table.left - surface.left + sl - 10}px`, top: `${y + cell.height / 2}px`, height: `${cell.height}px` });
        Object.assign(this.rowResize.style, { left: `${table.left - surface.left + sl}px`, top: `${row.bottom - surface.top + st}px`, width: `${table.width}px` });
        Object.assign(this.addColumn.style, { left: `${table.right - surface.left + sl + 6}px`, top: `${table.top - surface.top + st + table.height / 2}px` });
        Object.assign(this.addRow.style, { left: `${table.left - surface.left + sl + table.width / 2}px`, top: `${table.bottom - surface.top + st + 6}px` });
        this.addRow.disabled = this.context.map.height >= 20; this.addColumn.disabled = this.context.map.width >= 10;
        this.tableHandle.setAttribute('aria-pressed', isTableSelected(this.view.state) ? 'true' : 'false');
        this.layer.hidden = false;
    }
    hide() {
        this.deactivateTable(this.activeTable);
        this.activeTable = null; this.activeRow = null;
        this.layer.hidden = true; this.closeMenu();
    }
    deactivateTable(table) {
        if (!table) return;
        table.classList.remove('roundeditor__table-wrap--active');
        const EventClass = table.ownerDocument?.defaultView?.CustomEvent || CustomEvent;
        table.dispatchEvent(new EventClass('roundeditor:table-deactivate'));
    }
    openMenu(axis) {
        this.closeMenu(); const menu = element('div', `roundeditor__table-menu roundeditor__table-menu--${axis}`); menu.setAttribute('role', 'menu');
        menu.id = `roundeditor-table-menu-${Math.random().toString(36).slice(2)}`;
        const handle = axis === 'row' ? this.rowHandle : axis === 'column' ? this.columnHandle : this.tableHandle;
        handle.setAttribute('aria-expanded', 'true'); handle.setAttribute('aria-controls', menu.id);
        const merged = hasMergedCells(this.context); const c = this.context; const add = (label, command, disabled = false, danger = false) => {
            const item = element('button', `roundeditor__table-menuitem${danger ? ' is-danger' : ''}`, label); item.type = 'button'; item.setAttribute('role', 'menuitem'); item.disabled = disabled; if (disabled && merged) item.title = this.labels.mergedCellsMoveUnavailable;
            item.textContent = label;
            item.addEventListener('mousedown', event => event.preventDefault()); item.addEventListener('click', () => { if (!item.disabled) { this.run(command); this.closeMenu(); } }); menu.appendChild(item);
        };
        if (axis === 'table') {
            add(this.labels.deleteTable, deleteTable, false, true);
        } else if (axis === 'row') {
            add(this.labels.headerRow, toggleHeader('row'), c.row !== 0); add(this.labels.addRowBefore, addRowBefore); add(this.labels.addRowAfter, addRowAfter);
            add(this.labels.moveRowUp, moveAxis('row', c.row, c.row - 1), merged || c.row === 0); add(this.labels.moveRowDown, moveAxis('row', c.row, c.row + 1), merged || c.row === c.map.height - 1);
            add(this.labels.clearRowContents, clearAxis('row')); add(this.labels.deleteRow, deleteRow, c.map.height <= 1, true);
        } else {
            add(this.labels.headerColumn, toggleHeader('column'), c.column !== 0); add(this.labels.addColumnBefore, addColumnBefore); add(this.labels.addColumnAfter, addColumnAfter);
            add(this.labels.moveColumnLeft, moveAxis('column', c.column, c.column - 1), merged || c.column === 0); add(this.labels.moveColumnRight, moveAxis('column', c.column, c.column + 1), merged || c.column === c.map.width - 1);
            add(this.labels.sortAscending, sortColumn(1), merged); add(this.labels.sortDescending, sortColumn(-1), merged); add(this.labels.clearColumnContents, clearAxis('column')); add(this.labels.deleteColumn, deleteColumn, c.map.width <= 1, true);
        }
        if (axis !== 'table') {
            const color = element('input', 'roundeditor__table-color', this.labels.backgroundColor); color.type = 'color'; color.value = '#ffffff'; color.addEventListener('input', () => this.run(setAxisStyle(axis, { 'background-color': color.value })));
            menu.appendChild(color);
            for (const [label, declarations] of [[this.labels.alignLeft, { 'text-align': 'left' }], [this.labels.alignCenter, { 'text-align': 'center' }], [this.labels.alignRight, { 'text-align': 'right' }], [this.labels.alignTop, { 'vertical-align': 'top' }], [this.labels.alignMiddle, { 'vertical-align': 'middle' }], [this.labels.alignBottom, { 'vertical-align': 'bottom' }]]) add(label, setAxisStyle(axis, declarations));
            add(this.labels.deleteTable, deleteTable, false, true);
        }
        const rootStyle = getComputedStyle(this.surface.closest('.roundeditor') || this.surface);
        for (const name of ['--roundeditor-border', '--roundeditor-toolbar', '--roundeditor-color', '--roundeditor-hover', '--roundeditor-active', '--roundeditor-accent', '--roundeditor-field']) {
            menu.style.setProperty(name, rootStyle.getPropertyValue(name));
        }
        document.body.appendChild(menu); const rect = handle.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();
        const desiredLeft = axis === 'table' ? rect.right + 8 : rect.left;
        const desiredTop = axis === 'table' ? rect.top : rect.bottom + 6;
        menu.style.left = `${Math.max(8, Math.min(window.innerWidth - menuRect.width - 8, desiredLeft))}px`;
        menu.style.top = `${Math.max(8, Math.min(window.innerHeight - menuRect.height - 8, desiredTop))}px`;
        this.menu = menu; this.menuHandle = handle;
        this.outside = event => { if (!menu.contains(event.target) && !this.layer.contains(event.target)) this.closeMenu(); };
        setTimeout(() => {
            if (this.menu !== menu) return;
            document.addEventListener('pointerdown', this.outside);
            menu.querySelector(':scope > button:not(:disabled)')?.focus();
        }, 0);
    }
    closeMenu() {
        if (this.outside) document.removeEventListener('pointerdown', this.outside);
        this.outside = null; this.menu?.remove(); this.menu = null;
        if (this.menuHandle) {
            this.menuHandle.setAttribute('aria-expanded', 'false');
            this.menuHandle.removeAttribute('aria-controls');
        }
        this.menuHandle = null;
    }
    destroy() { if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this.raf); else clearTimeout(this.raf); this.closeMenu(); this.observer?.disconnect(); this.surface.removeEventListener('scroll', this.onScroll); this.view.dom.removeEventListener('mousedown', this.onCellMouseDown, true); window.removeEventListener('resize', this.onResize); document.removeEventListener('keydown', this.onKeydown); this.layer.remove(); }
}

export function tableEditingUiPlugin(options = {}) {
    return new Plugin({
        props: {
            handleKeyDown(view, event) {
                if (!['Backspace', 'Delete'].includes(event.key) || !isTableSelected(view.state)) return false;
                return deleteTable(view.state, view.dispatch);
            },
        },
        view: view => new TableEditingView(view, options.labels),
    });
}
