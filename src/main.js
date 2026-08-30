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
import { updateEditorDocument } from './documentUpdate.js';
import { handleImagePaste, imageFiles, uploadImagesAt } from './images.js';
import { mediaSelectionPlugin } from './mediaSelection.js';
import { handleOembedPaste, oembedPlaceholderPlugin } from './oembed.js';
import { imageNodeView } from './nodeviews/ImageView.js';
import { rawNodeViews } from './nodeviews/RawView.js';
import { videoNodeView } from './nodeviews/VideoView.js';
import { stickerNodeView } from './nodeviews/StickerView.js';
import { enableAutosave, restoreSavedDocument } from './rhymix/autosave.js';
import { installComponentEditing } from './rhymix/component.js';
import { normalizeForParse, parseDocument, parseSlice, schema, serializeDocument } from './schema/index.js';
import { Fullscreen } from './ui/Fullscreen.js';
import { SourceMode } from './ui/SourceMode.js';
import { Toolbar } from './ui/Toolbar.js';
import { exitInlineNode, splitEditorEnter } from './ui/commands.js';
import { uploadPlaceholderPlugin } from './uploadPlaceholders.js';
import { resolveDocumentStickers } from './stickers.js';
import { uploadVideosAt, videoFiles } from './videos.js';

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

function createPlugins(config) {
    const plugins = [
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
            Enter: splitEditorEnter,
        }),
        keymap(baseKeymap),
        uploadPlaceholderPlugin(),
        mediaSelectionPlugin(),
        columnResizing(),
        tableEditing(),
        dropCursor(),
        gapCursor(),
    ];
    if (config.oembedAvailable) plugins.splice(5, 0, oembedPlaceholderPlugin());
    return plugins;
}

function handleMediaDrop(bridge, event, moved) {
    if (!bridge.config.allowUpload || moved) return false;
    const images = imageFiles(event.dataTransfer?.files);
    const videos = videoFiles(event.dataTransfer?.files);
    if (!images.length && !videos.length) return false;
    event.preventDefault();
    const position = bridge.view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos
        ?? bridge.view.state.selection.from;
    if (images.length) uploadImagesAt(bridge, images, position);
    if (videos.length) uploadVideosAt(bridge, videos, position);
    return true;
}

function insertHtml(bridge, html) {
    if (bridge.sourceMode?.insertHtml(html)) {
        bridge.sourceMode.focus();
        return bridge.sync();
    }
    const slice = parseSlice(html);
    bridge.view.dispatch(bridge.view.state.tr.replaceSelection(slice));
    bridge.view.focus();
    return bridge.sync();
}

function selectedHtml(bridge) {
    const sourceSelection = bridge.sourceMode?.selectedHtml();
    if (sourceSelection !== null && sourceSelection !== undefined) return sourceSelection;
    return serializeDocument({ content: bridge.view.state.selection.content().content }, schema);
}

function plainText(bridge, selected = false) {
    if (!bridge.sourceMode?.active) {
        const from = selected ? bridge.view.state.selection.from : 0;
        const to = selected ? bridge.view.state.selection.to : bridge.view.state.doc.content.size;
        return bridge.view.state.doc.textBetween(from, to, '\n\n');
    }
    const element = document.createElement('div');
    element.innerHTML = selected ? bridge.sourceMode.selectedHtml() : bridge.sourceMode.getData();
    return element.textContent || '';
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
            bridge.sourceMode?.setData(html);
            return bridge.sync();
        },
        insertHtml: html => insertHtml(bridge, html),
        getText: () => plainText(bridge),
        getSelection: () => ({
            getSelectedText: () => plainText(bridge, true),
        }),
        focus: () => bridge.sourceMode?.focus(),
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
    window.editorMode[bridge.sequence] = bridge.sourceMode?.active ? 'html' : null;
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
        surface: wrapper.querySelector('.roundeditor__surface'),
        compat: null,
        toolbar: null,
        sourceMode: null,
        fullscreen: null,
        attachments: null,
        rebindControls() {
            const currentForm = this.wrapper.closest('form') || this.form;
            this.form = currentForm;
            this.primaryInput = findNamedControl(currentForm, this.config.primaryKeyName) || this.primaryInput;
            this.contentInput = findNamedControl(currentForm, this.config.contentKeyName) || this.contentInput;
        },
        sync() {
            this.rebindControls();
            if (this.view) this.contentInput.value = this.sourceMode?.getData() ?? this.serializeVisual();
            publishBridge(this);
            return this.contentInput.value;
        },
        serializeVisual() {
            return serializeDocument(this.view.state.doc, schema);
        },
        prepareSubmit() {
            this.sourceMode?.commit();
            return this.sync();
        },
        updateDocument(html) {
            updateEditorDocument(this.view, parseDocument(html));
        },
    };
    const initialData = restoreSavedDocument(bridge);
    const state = EditorState.create({
        doc: parseDocument(initialData),
        plugins: createPlugins(config),
    });
    bridge.view = new EditorView(wrapper.querySelector('.roundeditor__surface'), {
        state,
        attributes: {
            class: 'rhymix_content xe_content editable',
            'data-editor-sequence': String(sequence),
            spellcheck: 'false',
        },
        transformPastedHTML: normalizeForParse,
        handlePaste: (view, event) => (
            handleImagePaste(bridge, event) || handleOembedPaste(bridge, event)
        ),
        handleDrop: (view, event, slice, moved) => handleMediaDrop(bridge, event, moved),
        nodeViews: {
            ...rawNodeViews(bridge),
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
    bridge.sourceMode = new SourceMode(bridge);
    bridge.fullscreen = new Fullscreen(bridge);
    if (config.allowUpload) bridge.attachments = new AttachmentList(bridge);
    bridge.toolbar.refresh(bridge.view.state);
    registry[sequence] = bridge;

    form.setAttribute('editor_sequence', String(sequence));
    ensureHiddenField(form, 'use_editor', 'Y');
    ensureHiddenField(form, 'use_html', 'Y');
    applyContentStyles(bridge);
    publishBridges();
    installComponentEditing(bridge);

    form.addEventListener('submit', () => bridge.prepareSubmit(), true);
    bridge.sync();
    enableAutosave(bridge);
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
        if (bridge.wrapper.closest('form') === submitter.form) bridge.prepareSubmit();
    }
}, true);
window.addEventListener('submit', event => {
    for (const bridge of Object.values(registry)) {
        if (bridge.wrapper.closest('form') === event.target) bridge.prepareSubmit();
    }
});
