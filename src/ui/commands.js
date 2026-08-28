import {
    lift,
    selectAll,
    setBlockType,
    toggleMark,
    wrapIn,
} from 'prosemirror-commands';
import {
    liftListItem,
    sinkListItem,
    wrapInList,
} from 'prosemirror-schema-list';

export const FONT_SIZES = [8, 9, 10, 11, 12, 14, 18, 24, 30, 36, 48, 60, 72, 96];
export const LINE_HEIGHTS = ['1', '1.2', '1.4', '1.6', '1.8', '2'];
export const COLORS = [
    '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#ffffff',
    '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8',
    '#0000ff', '#9900ff', '#ff00ff', '#e25041', '#f6b26b', '#ffd966', '#93c47d',
    '#76a5af', '#6d9eeb', '#674ea7', '#c27ba0', '#a61c00', '#38761d',
];

export function run(view, command) {
    const result = command(view.state, view.dispatch, view);
    if (result) view.focus();
    return result;
}

export function markActive(state, type) {
    const { empty, from, to, $from } = state.selection;
    if (empty) return Boolean(type.isInSet(state.storedMarks || $from.marks()));
    return state.doc.rangeHasMark(from, to, type);
}

export function nodeActive(state, type, attrs = null) {
    const { $from, from, to } = state.selection;
    for (let depth = $from.depth; depth > 0; depth--) {
        const node = $from.node(depth);
        if (node.type !== type) continue;
        return !attrs || Object.entries(attrs).every(([name, value]) => node.attrs[name] === value);
    }
    let active = false;
    state.doc.nodesBetween(from, to, node => {
        if (node.type === type && (!attrs || Object.entries(attrs).every(([name, value]) => node.attrs[name] === value))) {
            active = true;
        }
    });
    return active;
}

export function textblockAttr(state, name) {
    if (state.selection.$from.parent.isTextblock) return state.selection.$from.parent.attrs[name] ?? null;
    let value = null;
    state.doc.nodesBetween(state.selection.from, state.selection.to, node => {
        if (value === null && node.isTextblock) value = node.attrs[name] ?? null;
    });
    return value;
}

export function toggleTextMark(markType) {
    return toggleMark(markType);
}

export function setTextStyle(markType, value) {
    return (state, dispatch) => {
        const { from, to, empty, $from } = state.selection;
        if (!dispatch) return true;
        const transaction = state.tr;
        if (empty) {
            const existing = markType.isInSet(state.storedMarks || $from.marks());
            if (existing) transaction.removeStoredMark(existing);
            if (value) transaction.addStoredMark(markType.create({ value }));
        } else {
            transaction.removeMark(from, to, markType);
            if (value) transaction.addMark(from, to, markType.create({ value }));
        }
        dispatch(transaction.scrollIntoView());
        return true;
    };
}

function textblockPositions(state) {
    const positions = [];
    const { from, to, $from } = state.selection;
    state.doc.nodesBetween(from, to, (node, position) => {
        if (node.isTextblock) positions.push(position);
    });
    if (!positions.length && $from.parent.isTextblock) positions.push($from.before($from.depth));
    return [...new Set(positions)];
}

export function setTextblockAttrs(attributes) {
    return (state, dispatch) => {
        const positions = textblockPositions(state).filter(position => {
            const type = state.doc.nodeAt(position)?.type;
            return type === state.schema.nodes.paragraph || type === state.schema.nodes.heading;
        });
        if (!positions.length) return false;
        if (!dispatch) return true;
        const transaction = state.tr;
        for (const position of positions) {
            const node = transaction.doc.nodeAt(position);
            if (node) transaction.setNodeMarkup(position, null, { ...node.attrs, ...attributes });
        }
        dispatch(transaction.scrollIntoView());
        return true;
    };
}

export function changeIndent(direction) {
    return (state, dispatch, view) => {
        if (nodeActive(state, state.schema.nodes.listItem)) {
            const listCommand = direction > 0
                ? sinkListItem(state.schema.nodes.listItem)
                : liftListItem(state.schema.nodes.listItem);
            if (listCommand(state, dispatch, view)) return true;
        }
        const positions = textblockPositions(state).filter(position => {
            const type = state.doc.nodeAt(position)?.type;
            return type === state.schema.nodes.paragraph || type === state.schema.nodes.heading;
        });
        if (!positions.length) return false;
        if (!dispatch) return true;
        const transaction = state.tr;
        for (const position of positions) {
            const node = transaction.doc.nodeAt(position);
            if (!node) continue;
            const current = Number.parseFloat(node.attrs.indent || '0') || 0;
            const indent = Math.max(0, current + (direction * 40));
            transaction.setNodeMarkup(position, null, {
                ...node.attrs,
                indent: indent ? `${indent}px` : null,
            });
        }
        dispatch(transaction.scrollIntoView());
        return true;
    };
}

export function setParagraphFormat(format) {
    return (state, dispatch, view) => {
        if (format === 'code') return setBlockType(state.schema.nodes.codeBlock)(state, dispatch, view);
        if (format === 'normal') return setBlockType(state.schema.nodes.paragraph)(state, dispatch, view);
        return setBlockType(state.schema.nodes.heading, { level: Number(format.slice(1)) })(state, dispatch, view);
    };
}

export function toggleBlockquote(schema) {
    return (state, dispatch, view) => (
        nodeActive(state, schema.nodes.blockquote)
            ? lift(state, dispatch, view)
            : wrapIn(schema.nodes.blockquote)(state, dispatch, view)
    );
}

export function toggleList(listType, itemType) {
    return (state, dispatch, view) => (
        nodeActive(state, listType)
            ? liftListItem(itemType)(state, dispatch, view)
            : wrapInList(listType)(state, dispatch, view)
    );
}

export function clearFormatting(state, dispatch) {
    if (!dispatch) return true;
    const { from, to, empty } = state.selection;
    const positions = textblockPositions(state).filter(position => {
        const type = state.doc.nodeAt(position)?.type;
        return type === state.schema.nodes.paragraph || type === state.schema.nodes.heading;
    });
    const transaction = state.tr;
    if (empty) {
        for (const mark of state.storedMarks || state.selection.$from.marks()) {
            transaction.removeStoredMark(mark);
        }
    } else {
        for (const markType of Object.values(state.schema.marks)) transaction.removeMark(from, to, markType);
    }
    for (const position of positions) {
        const node = transaction.doc.nodeAt(position);
        if (node) transaction.setNodeMarkup(position, null, {
            ...node.attrs,
            align: null,
            lineHeight: null,
            indent: null,
        });
    }
    dispatch(transaction.scrollIntoView());
    return true;
}

export function setLink(href, openInNewWindow = true) {
    return (state, dispatch) => {
        const { from, to, empty } = state.selection;
        if (!dispatch) return true;
        const transaction = state.tr;
        if (empty) {
            transaction.addStoredMark(state.schema.marks.link.create({
                href,
                target: openInNewWindow ? '_blank' : null,
                rel: openInNewWindow ? 'noreferrer noopener' : null,
            }));
        } else {
            transaction.removeMark(from, to, state.schema.marks.link);
            transaction.addMark(from, to, state.schema.marks.link.create({
                href,
                target: openInNewWindow ? '_blank' : null,
                rel: openInNewWindow ? 'noreferrer noopener' : null,
            }));
        }
        dispatch(transaction.scrollIntoView());
        return true;
    };
}

export function removeLink(state, dispatch) {
    const { from, to, empty } = state.selection;
    if (!dispatch) return true;
    const transaction = state.tr;
    if (empty) transaction.removeStoredMark(state.schema.marks.link);
    else transaction.removeMark(from, to, state.schema.marks.link);
    dispatch(transaction.scrollIntoView());
    return true;
}

export function insertTable(rows, columns) {
    return (state, dispatch) => {
        const { schema } = state;
        if (!schema.nodes.table || !schema.nodes.tableRow || !schema.nodes.tableCell) return false;
        if (!dispatch) return true;
        const rowNodes = [];
        for (let row = 0; row < rows; row++) {
            const cells = [];
            for (let column = 0; column < columns; column++) {
                cells.push(schema.nodes.tableCell.createAndFill());
            }
            rowNodes.push(schema.nodes.tableRow.create(null, cells));
        }
        const table = schema.nodes.table.create(null, rowNodes);
        dispatch(state.tr.replaceSelectionWith(table).scrollIntoView());
        return true;
    };
}

export function insertHorizontalRule(state, dispatch) {
    if (!dispatch) return true;
    dispatch(state.tr.replaceSelectionWith(state.schema.nodes.horizontalRule.create()).scrollIntoView());
    return true;
}

export function insertText(text) {
    return (state, dispatch) => {
        if (!dispatch) return true;
        dispatch(state.tr.insertText(text).scrollIntoView());
        return true;
    };
}

export function selectDocument(state, dispatch, view) {
    return selectAll(state, dispatch, view);
}

export { liftListItem, sinkListItem };
