import { baseKeymap, toggleMark } from 'prosemirror-commands';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';
import { history, redo, undo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { columnResizing, tableEditing } from 'prosemirror-tables';
import '../css/roundeditor.scss';
import { AttachmentList } from './AttachmentList.js';
import { handleImageDrop, handleImagePaste } from './images.js';
import { imageNodeView } from './nodeviews/ImageView.js';
import { rawNodeViews } from './nodeviews/RawView.js';
import { videoNodeView } from './nodeviews/VideoView.js';
import { stickerNodeView } from './nodeviews/StickerView.js';
import { normalizeForParse, parseDocument, parseSlice, schema, serializeDocument } from './schema/index.js';
import { Toolbar } from './ui/Toolbar.js';
import { exitInlineNode, splitAfterInlineNode } from './ui/commands.js';
import { uploadPlaceholderPlugin } from './uploadPlaceholders.js';
import { resolveDocumentStickers } from './stickers.js';

const registry = Object.create(null);
let previousGlobals = null;

function normalizeSequence(value) {
    const sequence = Number.parseInt(String(value ?? ''), 10);
    return Number.isFinite(sequence) && sequence > 0 ? sequence : 0;
}

function readConfig(wrapper) {
    try {
        return JSON.parse(wrapper.dataset.editorConfig || '{}');
    } catch (error) {
        throw new Error(`Invalid roundeditor configuration: ${error.message}`);
    }
}

function findNamedControl(form, name) {
    const descendant = Array.from(form.querySelectorAll('[name]')).find(control => control.name === name);
    if (descendant) return descendant;
    const control = form.elements.namedItem(name);
    if (!control) return null;
    if (typeof RadioNodeList !== 'undefined' && control instanceof RadioNodeList) return control[0] || null;
    return control;
}

function ensureHiddenField(form, name, value) {
    let field = findNamedControl(form, name);
    if (!field) {
        field = document.createElement('input');
        field.type = 'hidden';
        field.name = name;
        form.appendChild(field);
    }
    field.value = value;
    field.setAttribute('value', value);
    return field;
}

function createPlugins() {
    return [
        history(),
        keymap({
            'Mod-z': undo,
            'Mod-y': redo,
            'Mod-Shift-z': redo,
            'Mod-b': toggleMark(schema.marks.strong),
            'Mod-i': toggleMark(schema.marks.em),
            'Mod-u': toggleMark(schema.marks.underline),
            'Mod-Shift-x': toggleMark(schema.marks.strike),
            ArrowLeft: exitInlineNode(-1),
            ArrowRight: exitInlineNode(1),
            Enter: splitAfterInlineNode,
        }),
        keymap(baseKeymap),
        uploadPlaceholderPlugin(),
        columnResizing(),
        tableEditing(),
        dropCursor(),
        gapCursor(),
    ];
}

function insertHtml(bridge, html) {
    const slice = parseSlice(html);
    bridge.view.dispatch(bridge.view.state.tr.replaceSelection(slice));
    bridge.view.focus();
    return bridge.sync();
}

function selectedHtml(bridge) {
    return serializeDocument({ content: bridge.view.state.selection.content().content }, schema);
}

function findBridgeForFrame(frame) {
    const element = frame?.jquery ? frame[0] : frame;
    const candidates = [
        element?.dataset?.editorSequence,
        element?.editor_sequence,
        typeof element?.getAttribute === 'function' ? element.getAttribute('data-editor-sequence') : null,
        String(element?.id || '').match(/_(\d+)$/)?.[1],
        window.editorPrevSrl,
    ];

    if (typeof element?.closest === 'function') {
        candidates.push(element.closest('[data-editor-sequence]')?.dataset?.editorSequence);
    }

    for (const candidate of candidates) {
        const bridge = registry[normalizeSequence(candidate)];
        if (bridge) return bridge;
    }

    return Object.values(registry).find(bridge => {
        if (element === bridge.editable || element === bridge.wrapper) return true;
        try {
            return bridge.wrapper.contains(element);
        } catch (error) {
            return false;
        }
    }) || null;
}

function createCompatibilityBridge(bridge) {
    return {
        mode: 'wysiwyg',
        getData: () => bridge.sync(),
        setData: html => {
            bridge.updateDocument(html);
            return bridge.sync();
        },
        insertHtml: html => insertHtml(bridge, html),
        getText: () => bridge.view.state.doc.textBetween(0, bridge.view.state.doc.content.size, '\n\n'),
        getSelection: () => ({
            getSelectedText: () => bridge.view.state.doc.textBetween(
                bridge.view.state.selection.from,
                bridge.view.state.selection.to,
                '\n\n'
            ),
        }),
        focus: () => bridge.view.focus(),
    };
}

function installGlobals() {
    window.RoundEditorGlobalsInstalled = true;

    previousGlobals ||= {
        getInstance: window._getCkeInstance,
        getContainer: window._getCkeContainer,
        getFrame: window.editorGetIFrame,
        replaceHtml: window.editorReplaceHTML,
        getContent: window.editorGetContent,
        getText: window.editorGetContentTextarea_xe,
        getSelected: window.editorGetSelectedHtml,
    };
    const previous = previousGlobals;

    window._getCkeInstance = sequence => {
        const bridge = registry[normalizeSequence(sequence)];
        return bridge ? bridge.compat : previous.getInstance?.(sequence);
    };
    window._getCkeContainer = sequence => {
        const bridge = registry[normalizeSequence(sequence)];
        if (bridge) return window.jQuery ? window.jQuery(bridge.wrapper) : bridge.wrapper;
        return previous.getContainer?.(sequence);
    };
    window.editorGetIFrame = sequence => {
        const bridge = registry[normalizeSequence(sequence)];
        return bridge ? bridge.editable : previous.getFrame?.(sequence) || null;
    };
    window.editorReplaceHTML = (frame, html) => {
        const bridge = findBridgeForFrame(frame);
        if (bridge) return bridge.compat.insertHtml(html, 'unfiltered_html');
        return previous.replaceHtml?.(frame, html);
    };
    window.editorGetContent = sequence => {
        const bridge = registry[normalizeSequence(sequence)];
        return bridge ? bridge.sync() : previous.getContent?.(sequence) || '';
    };
    window.editorGetContentTextarea_xe = sequence => {
        const bridge = registry[normalizeSequence(sequence)];
        return bridge ? bridge.compat.getText() : previous.getText?.(sequence) || '';
    };
    window.editorGetSelectedHtml = sequence => {
        const bridge = registry[normalizeSequence(sequence)];
        return bridge ? selectedHtml(bridge) : previous.getSelected?.(sequence) || '';
    };
}

function publishBridges() {
    for (const bridge of Object.values(registry)) publishBridge(bridge);
}

function publishBridge(bridge) {
    installGlobals();
    window.editorRelKeys = window.editorRelKeys || [];
    window.editorMode = window.editorMode || [];
    bridge.rebindControls();
    window.editorRelKeys[bridge.sequence] = {
        primary: bridge.primaryInput,
        content: bridge.contentInput,
        func: () => bridge.sync(),
        pasteHTML: html => insertHtml(bridge, html),
        editor: { getFrame: () => bridge.editable },
    };
    window.editorMode[bridge.sequence] = null;
}

function applyContentStyles(bridge) {
    const styles = {
        '--roundeditor-height': `${bridge.config.height}px`,
        '--roundeditor-content-font': bridge.config.contentFont,
        '--roundeditor-content-font-size': bridge.config.contentFontSize,
        '--roundeditor-content-line-height': bridge.config.contentLineHeight,
        '--roundeditor-content-word-break': bridge.config.contentWordBreak,
        '--roundeditor-content-paragraph-spacing': bridge.config.contentParagraphSpacing,
    };
    Object.entries(styles).forEach(([name, value]) => bridge.wrapper.style.setProperty(name, value));
}

function showError(wrapper, error) {
    wrapper.classList.add('roundeditor--error');
    const loading = wrapper.querySelector('.roundeditor__loading');
    if (loading) loading.remove();
    const surface = wrapper.querySelector('.roundeditor__surface');
    if (surface) {
        surface.className = 'roundeditor__error';
        surface.textContent = `roundeditor could not be initialized.\n${error.message || error}`;
    }
    console.error('[roundeditor] Initialization failed.', error);
}

function initialize(wrapper) {
    const config = readConfig(wrapper);
    const sequence = normalizeSequence(config.editorSequence || wrapper.dataset.editorSequence);
    const form = wrapper.closest('form');
    if (!sequence || !form) throw new Error('The editor sequence or parent form is missing.');

    const contentInput = findNamedControl(form, config.contentKeyName);
    if (!contentInput) throw new Error(`The Rhymix content field "${config.contentKeyName}" was not found.`);

    const bridge = {
        wrapper,
        form,
        config,
        sequence,
        primaryInput: findNamedControl(form, config.primaryKeyName) || { value: '' },
        contentInput,
        view: null,
        editable: null,
        compat: null,
        toolbar: null,
        attachments: null,
        rebindControls() {
            const currentForm = this.wrapper.closest('form') || this.form;
            this.form = currentForm;
            this.primaryInput = findNamedControl(currentForm, this.config.primaryKeyName) || this.primaryInput;
            this.contentInput = findNamedControl(currentForm, this.config.contentKeyName) || this.contentInput;
        },
        sync() {
            this.rebindControls();
            if (this.view) this.contentInput.value = serializeDocument(this.view.state.doc, schema);
            publishBridge(this);
            return this.contentInput.value;
        },
        updateDocument(html) {
            const state = EditorState.create({
                doc: parseDocument(html),
                plugins: createPlugins(),
            });
            this.view.updateState(state);
            this.toolbar?.refresh(state);
        },
    };
    const state = EditorState.create({
        doc: parseDocument(contentInput.value),
        plugins: createPlugins(),
    });
    bridge.view = new EditorView(wrapper.querySelector('.roundeditor__surface'), {
        state,
        attributes: {
            class: 'rhymix_content xe_content editable',
            'data-editor-sequence': String(sequence),
            spellcheck: 'false',
        },
        transformPastedHTML: normalizeForParse,
        handlePaste: (view, event) => handleImagePaste(bridge, event),
        handleDrop: (view, event, slice, moved) => handleImageDrop(bridge, event, moved),
        nodeViews: {
            ...rawNodeViews(),
            image: imageNodeView(bridge),
            video: videoNodeView(bridge),
            sticker: stickerNodeView(bridge),
        },
        dispatchTransaction(transaction) {
            bridge.view.updateState(bridge.view.state.apply(transaction));
            bridge.sync();
            bridge.toolbar?.refresh(bridge.view.state);
        },
    });
    bridge.editable = bridge.view.dom;
    bridge.editable.editor_sequence = sequence;
    bridge.editable.setFocus = () => bridge.view.focus();
    bridge.editable.replaceHTML = html => insertHtml(bridge, html);
    bridge.compat = createCompatibilityBridge(bridge);
    bridge.toolbar = new Toolbar(bridge);
    if (config.allowUpload) bridge.attachments = new AttachmentList(bridge);
    bridge.toolbar.refresh(bridge.view.state);
    registry[sequence] = bridge;

    form.setAttribute('editor_sequence', String(sequence));
    ensureHiddenField(form, 'use_editor', 'Y');
    ensureHiddenField(form, 'use_html', 'Y');
    applyContentStyles(bridge);
    publishBridges();

    form.addEventListener('submit', () => bridge.sync(), true);
    bridge.sync();
    resolveDocumentStickers(bridge).catch(error => console.warn('[roundeditor] Sticker resolution failed.', error));
    wrapper.querySelector('.roundeditor__loading')?.remove();
    wrapper.classList.add('roundeditor--ready');
    if (config.focus) bridge.view.focus();
}

function boot() {
    document.querySelectorAll('.roundeditor:not([data-roundeditor-started])').forEach(wrapper => {
        wrapper.setAttribute('data-roundeditor-started', 'true');
        try {
            initialize(wrapper);
        } catch (error) {
            showError(wrapper, error);
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
    boot();
}

window.addEventListener('load', publishBridges);
window.addEventListener('pageshow', () => {
    boot();
    publishBridges();
});
document.addEventListener('click', event => {
    const submitter = event.target.closest?.('button[type="submit"], input[type="submit"], button:not([type])');
    if (!submitter?.form) return;
    for (const bridge of Object.values(registry)) {
        if (bridge.wrapper.closest('form') === submitter.form) bridge.sync();
    }
}, true);
window.addEventListener('submit', event => {
    for (const bridge of Object.values(registry)) {
        if (bridge.wrapper.closest('form') === event.target) bridge.sync();
    }
});
