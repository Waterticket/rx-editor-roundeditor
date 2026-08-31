import { CellSelection, TableMap, findTable, selectionCell } from 'prosemirror-tables';

export function tableContext(state) {
    let $cell;
    try { $cell = selectionCell(state); } catch (_) { return null; }
    const table = findTable($cell);
    if (!table) return null;
    const map = TableMap.get(table.node);
    const offset = $cell.pos - table.start;
    const index = map.map.indexOf(offset);
    if (index < 0) return null;
    return { table, map, $cell, row: Math.floor(index / map.width), column: index % map.width };
}

export function hasMergedCells(context) {
    let merged = false;
    context.table.node.descendants(node => {
        if (node.type.spec.tableRole === 'cell' || node.type.spec.tableRole === 'header_cell') {
            if (node.attrs.rowspan > 1 || node.attrs.colspan > 1) merged = true;
        }
    });
    return merged;
}

export function selectRow(context, state, dispatch) {
    const rect = { left: 0, right: context.map.width, top: context.row, bottom: context.row + 1 };
    const cells = context.map.cellsInRect(rect);
    if (!cells.length) return false;
    if (dispatch) {
        const selection = CellSelection.rowSelection(
            state.doc.resolve(context.table.start + cells[0]),
            state.doc.resolve(context.table.start + cells.at(-1)),
        );
        dispatch(state.tr.setSelection(selection));
    }
    return true;
}

export function selectColumn(context, state, dispatch) {
    const rect = { left: context.column, right: context.column + 1, top: 0, bottom: context.map.height };
    const cells = context.map.cellsInRect(rect);
    if (!cells.length) return false;
    if (dispatch) {
        const selection = CellSelection.colSelection(
            state.doc.resolve(context.table.start + cells[0]),
            state.doc.resolve(context.table.start + cells.at(-1)),
        );
        dispatch(state.tr.setSelection(selection));
    }
    return true;
}

export function selectTable(context, state, dispatch) {
    const first = context.map.map[0];
    const last = context.map.map.at(-1);
    if (first == null || last == null) return false;
    if (dispatch) {
        const selection = CellSelection.rowSelection(
            state.doc.resolve(context.table.start + first),
            state.doc.resolve(context.table.start + last),
        );
        dispatch(state.tr.setSelection(selection));
    }
    return true;
}

export function isTableSelected(state) {
    return state.selection instanceof CellSelection
        && state.selection.isRowSelection()
        && state.selection.isColSelection();
}
