import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

export const uploadPlaceholderKey = new PluginKey('roundeditor-upload-placeholders');

function placeholderElement(type, label) {
    const element = document.createElement('span');
    element.className = `roundeditor__upload-placeholder roundeditor__upload-placeholder--${type}`;
    element.contentEditable = 'false';
    element.setAttribute('role', 'status');
    element.setAttribute('aria-live', 'polite');
    const spinner = document.createElement('span');
    spinner.className = 'roundeditor__upload-spinner';
    spinner.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span');
    text.textContent = label;
    element.append(spinner, text);
    return element;
}

export function uploadPlaceholderPlugin() {
    return new Plugin({
        key: uploadPlaceholderKey,
        state: {
            init: () => DecorationSet.empty,
            apply(transaction, decorations) {
                let next = decorations.map(transaction.mapping, transaction.doc);
                const action = transaction.getMeta(uploadPlaceholderKey);
                if (action?.add) {
                    const { id, position, type, label } = action.add;
                    next = next.add(transaction.doc, [Decoration.widget(
                        position,
                        () => placeholderElement(type, label),
                        { id, side: -1 }
                    )]);
                }
                if (action?.remove) {
                    next = next.remove(next.find(null, null, specification => specification.id === action.remove.id));
                }
                return next;
            },
        },
        props: {
            decorations: state => uploadPlaceholderKey.getState(state),
        },
    });
}

export function addUploadPlaceholder(view, type, label, position = view.state.selection.from) {
    const id = {};
    view.dispatch(view.state.tr.setMeta(uploadPlaceholderKey, {
        add: { id, position, type, label },
    }));
    return id;
}

export function findUploadPlaceholder(state, id) {
    return uploadPlaceholderKey.getState(state)?.find(
        null,
        null,
        specification => specification.id === id
    )[0]?.from ?? null;
}

export function removeUploadPlaceholder(view, id) {
    view.dispatch(view.state.tr.setMeta(uploadPlaceholderKey, { remove: { id } }));
}

export function removeUploadPlaceholderFrom(transaction, id) {
    return transaction.setMeta(uploadPlaceholderKey, { remove: { id } });
}
