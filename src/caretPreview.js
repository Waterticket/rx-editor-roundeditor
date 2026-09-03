import { Plugin } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

function storedFontSize(state) {
    if (!state.selection.empty || !state.storedMarks) return null;
    const markType = state.schema.marks.fontSize;
    const mark = markType?.isInSet(state.storedMarks);
    const value = Number.parseFloat(mark?.attrs?.value);
    return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Browsers cannot size a native caret from ProseMirror stored marks because
 * those marks do not have a DOM node until the first character is entered.
 * Render a zero-width visual caret so a newly selected font size is visible
 * immediately without inserting placeholder text into the document.
 */
export function caretPreviewPlugin() {
    return new Plugin({
        props: {
            decorations(state) {
                const fontSize = storedFontSize(state);
                if (!fontSize) return null;
                const decoration = Decoration.widget(state.selection.head, () => {
                    const caret = document.createElement('span');
                    caret.className = 'roundeditor__caret-preview';
                    caret.setAttribute('aria-hidden', 'true');
                    caret.style.setProperty('--roundeditor-caret-font-size', `${fontSize}px`);
                    return caret;
                }, {
                    key: `roundeditor-caret-${fontSize}`,
                    side: -1,
                });
                return DecorationSet.create(state.doc, [decoration]);
            },
        },
    });
}
