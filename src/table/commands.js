import { Fragment } from 'prosemirror-model';
import { closeHistory } from 'prosemirror-history';
import { TextSelection } from 'prosemirror-state';
import { addColumnAfter, addRowAfter, CellSelection, moveTableColumn, moveTableRow, TableMap } from 'prosemirror-tables';
import { mergeExtraStyle } from '../schema/attributes.js';
import { hasMergedCells, selectColumn, selectRow, tableContext } from './context.js';

function cells(context, axis) {
    const rect = axis === 'row'
        ? { left: 0, right: context.map.width, top: context.row, bottom: context.row + 1 }
        : { left: context.column, right: context.column + 1, top: 0, bottom: context.map.height };
    return [...new Set(context.map.cellsInRect(rect))];
}

export function addLastRow(state, dispatch) {
    const context = tableContext(state);
    if (!context || context.map.height >= 20) return false;
    const last = context.map.map[(context.map.height - 1) * context.map.width];
    const selected = state.apply(state.tr.setSelection(CellSelection.rowSelection(state.doc.resolve(context.table.start + last))));
    if (!dispatch) return addRowAfter(selected);
    return addRowAfter(selected, tr => {
        const table = tr.doc.nodeAt(context.table.pos);
        if (table) {
            const map = TableMap.get(table);
            const cell = map.map[(map.height - 1) * map.width];
            tr.setSelection(TextSelection.near(tr.doc.resolve(context.table.start + cell + 1)));
        }
        dispatch(tr);
    });
}

export function addLastColumn(state, dispatch) {
    const context = tableContext(state);
    if (!context || context.map.width >= 10) return false;
    const last = context.map.map[context.map.width - 1];
    const selected = state.apply(state.tr.setSelection(CellSelection.colSelection(state.doc.resolve(context.table.start + last))));
    if (!dispatch) return addColumnAfter(selected);
    return addColumnAfter(selected, tr => {
        const table = tr.doc.nodeAt(context.table.pos);
        if (table) {
            const map = TableMap.get(table);
            const cell = map.map[map.width - 1];
            tr.setSelection(TextSelection.near(tr.doc.resolve(context.table.start + cell + 1)));
        }
        dispatch(tr);
    });
}

export function moveTable(target) {
    return (state, dispatch) => {
        const context = tableContext(state);
        if (!context) return false;
        const from = context.table.pos;
        const end = from + context.table.node.nodeSize;
        if (target === from || target === end || target > from && target < end) return false;
        if (!dispatch) return true;
        let tr = state.tr.delete(from, end);
        const insertedAt = tr.mapping.map(target);
        tr = tr.insert(insertedAt, context.table.node);
        const table = tr.doc.nodeAt(insertedAt);
        if (table) {
            const map = TableMap.get(table);
            tr = tr.setSelection(CellSelection.rowSelection(
                tr.doc.resolve(insertedAt + 1 + map.map[0]),
                tr.doc.resolve(insertedAt + 1 + map.map.at(-1)),
            ));
        }
        dispatch(closeHistory(tr).scrollIntoView());
        return true;
    };
}

export function moveAxis(axis, from, to) {
    return (state, dispatch) => {
        const context = tableContext(state);
        if (!context || hasMergedCells(context) || from === to) return false;
        const command = axis === 'row' ? moveTableRow : moveTableColumn;
        return command({ from, to, pos: context.table.start, select: true })(state, tr => dispatch(closeHistory(tr)));
    };
}

export function setAxisStyle(axis, declarations) {
    return (state, dispatch) => {
        const context = tableContext(state);
        if (!context) return false;
        const positions = cells(context, axis);
        if (!dispatch) return true;
        let tr = state.tr;
        for (const offset of positions) {
            const pos = tr.mapping.map(context.table.start + offset);
            const cell = tr.doc.nodeAt(pos);
            if (cell) tr = tr.setNodeMarkup(pos, null, { ...cell.attrs, extra: mergeExtraStyle(cell.attrs.extra, declarations) });
        }
        dispatch(closeHistory(tr).scrollIntoView());
        return true;
    };
}

export function setRowHeight(row, height) {
    return (state, dispatch) => {
        const context = tableContext(state);
        const pixels = Math.max(40, Math.round(Number(height) || 0));
        if (!context || row < 0 || row >= context.table.node.childCount || !pixels) return false;
        let position = context.table.start;
        for (let index = 0; index < row; index++) position += context.table.node.child(index).nodeSize;
        const rowNode = state.doc.nodeAt(position);
        if (!rowNode) return false;
        if (dispatch) {
            dispatch(closeHistory(state.tr.setNodeMarkup(position, null, {
                ...rowNode.attrs,
                extra: mergeExtraStyle(rowNode.attrs.extra, { height: `${pixels}px` }),
            })).scrollIntoView());
        }
        return true;
    };
}

export function clearAxis(axis) {
    return (state, dispatch) => {
        const context = tableContext(state); if (!context) return false;
        if (!dispatch) return true;
        let tr = state.tr;
        for (const offset of cells(context, axis)) {
            const pos = tr.mapping.map(context.table.start + offset); const cell = tr.doc.nodeAt(pos);
            if (cell) tr = tr.replaceWith(pos + 1, pos + cell.nodeSize - 1, Fragment.from(cell.type.schema.nodes.paragraph.create()));
        }
        dispatch(closeHistory(tr).scrollIntoView()); return true;
    };
}

export function duplicateAxis(axis) {
    return (state, dispatch) => {
        const context = tableContext(state); if (!context || hasMergedCells(context)) return false;
        if (!dispatch) return true;
        let tr = state.tr;
        if (axis === 'row') {
            const row = context.table.node.child(context.row);
            let pos = context.table.start + 1;
            for (let i = 0; i <= context.row; i++) pos += context.table.node.child(i).nodeSize;
            tr = tr.insert(pos, row.copy(row.content));
        } else {
            // Inserting after then replacing the newly-created cells preserves table invariants.
            const selected = tr.setSelection(state.selection);
            if (!addColumnAfter(selected, transaction => { tr = transaction; })) return false;
        }
        dispatch(closeHistory(tr).scrollIntoView()); return true;
    };
}

export function sortColumn(direction = 1, locale = 'ko') {
    return (state, dispatch) => {
        const context = tableContext(state); if (!context || hasMergedCells(context) || context.map.height < 2) return false;
        const header = context.table.node.firstChild?.firstChild?.type.spec.tableRole === 'header_cell' ? 1 : 0;
        const rows = Array.from({ length: context.table.node.childCount - header }, (_, i) => ({ row: context.table.node.child(i + header), index: i + header }));
        const value = entry => entry.row.child(context.column)?.textContent.trim() || '';
        rows.sort((a, b) => { const av = value(a), bv = value(b); if (!av) return bv ? 1 : a.index - b.index; if (!bv) return -1; const result = av.localeCompare(bv, locale, { numeric: true, sensitivity: 'base' }); return result || a.index - b.index; });
        if (direction < 0) rows.reverse();
        const ordered = [...Array.from({ length: header }, (_, i) => context.table.node.child(i)), ...rows.map(entry => entry.row)];
        if (!dispatch) return true;
        dispatch(closeHistory(state.tr.replaceWith(context.table.pos, context.table.pos + context.table.node.nodeSize, context.table.node.type.create(context.table.node.attrs, ordered))).scrollIntoView()); return true;
    };
}
