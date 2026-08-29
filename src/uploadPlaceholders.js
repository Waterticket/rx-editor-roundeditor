import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

export const uploadPlaceholderKey = new PluginKey('roundeditor-upload-placeholders');

function normalizedProgress(value) {
    const progress = Number(value);
    if (!Number.isFinite(progress)) return 0;
    return Math.min(1, Math.max(0, progress));
}

function placeholderElement(type, label, progress = 0) {
    const percentage = Math.round(normalizedProgress(progress) * 100);
    const element = document.createElement('span');
    element.className = `roundeditor__upload-placeholder roundeditor__upload-placeholder--${type}`;
    element.style.setProperty('--roundeditor-upload-progress', `${percentage}%`);
    element.contentEditable = 'false';
    element.setAttribute('role', 'status');
    element.setAttribute('aria-live', 'polite');
    element.setAttribute('aria-label', `${label} ${percentage}%`);
    const bar = document.createElement('span');
    bar.className = 'roundeditor__upload-placeholder-progress';
    bar.setAttribute('aria-hidden', 'true');
    const spinner = document.createElement('span');
    spinner.className = 'roundeditor__upload-spinner';
    spinner.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span');
    text.className = 'roundeditor__upload-label';
    text.textContent = label;
    const percent = document.createElement('strong');
    percent.className = 'roundeditor__upload-percent';
    percent.textContent = `${percentage}%`;
    element.append(bar, spinner, text, percent);
    return element;
}

function placeholderDecoration(position, specification) {
    return Decoration.widget(
        position,
        () => placeholderElement(specification.type, specification.label, specification.progress),
        { ...specification, side: -1 }
    );
}

export function uploadPlaceholderPlugin() {
    return new Plugin({
        key: uploadPlaceholderKey,
        state: {
            init: () => DecorationSet.empty,
            apply(transaction, decorations) {
                const previous = decorations.find();
                let next = decorations.map(transaction.mapping, transaction.doc);
                const action = transaction.getMeta(uploadPlaceholderKey);

                // Inserting block media at a position shared by several widget
                // decorations can make ProseMirror drop every widget at that
                // boundary. Restore still-active uploads at their mapped
                // position; the completed ID is removed explicitly below.
                const mappedIds = new Set(next.find().map(decoration => decoration.spec.id));
                const restored = previous.flatMap(decoration => {
                    if (mappedIds.has(decoration.spec.id)) return [];
                    const position = Math.min(
                        transaction.doc.content.size,
                        Math.max(0, transaction.mapping.map(decoration.from, 1))
                    );
                    return [placeholderDecoration(position, decoration.spec)];
                });
                if (restored.length) next = next.add(transaction.doc, restored);

                if (action?.add) {
                    const { position, ...specification } = action.add;
                    next = next.add(transaction.doc, [placeholderDecoration(position, specification)]);
                }
                if (action?.update) {
                    const current = next.find(
                        null,
                        null,
                        specification => specification.id === action.update.id
                    )[0];
                    if (current) {
                        const specification = {
                            ...current.spec,
                            progress: normalizedProgress(action.update.progress),
                            label: action.update.label ?? current.spec.label,
                        };
                        next = next.remove([current]);
                        next = next.add(transaction.doc, [placeholderDecoration(current.from, specification)]);
                    }
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
        add: { id, position, type, label, progress: 0 },
    }));
    return id;
}

export function updateUploadPlaceholder(view, id, progress, label = null) {
    view.dispatch(view.state.tr.setMeta(uploadPlaceholderKey, {
        update: { id, progress, label },
    }));
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
