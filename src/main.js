import { baseKeymap, toggleMark } from 'prosemirror-commands';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';
import { history, redo, undo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { Fragment, Slice } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { columnResizing, tableEditing } from 'prosemirror-tables';
import '../css/roundeditor.scss';
import { AttachmentList } from './AttachmentList.js';
import { createCKEditor4Facade } from './compat/CKEditor4Facade.js';
import { createEditorHandle, installIntegrationGlobal } from './integration.js';
import { createExtensionHost, prepareExtensions } from './extensions/host.js';
import { updateEditorDocument } from './documentUpdate.js';
import { handleImagePaste, imageFiles, uploadImagesAt } from './images.js';
import { mediaSelectionPlugin } from './mediaSelection.js';
import { handleOembedPaste, oembedPlaceholderPlugin } from './oembed.js';
import { imageNodeView } from './nodeviews/ImageView.js';
import { audioNodeView } from './nodeviews/AudioView.js';
import { rawNodeViews } from './nodeviews/RawView.js';
import { videoNodeView } from './nodeviews/VideoView.js';
import { stickerNodeView } from './nodeviews/StickerView.js';
import { tableNodeView } from './nodeviews/TableView.js';
import { enableAutosave, restoreSavedDocument } from './rhymix/autosave.js';
import { installComponentEditing } from './rhymix/component.js';
import { Fullscreen } from './ui/Fullscreen.js';
import { SourceMode } from './ui/SourceMode.js';
import { Toolbar } from './ui/Toolbar.js';
import { exitInlineNode, splitEditorEnter } from './ui/commands.js';
import { uploadPlaceholderPlugin } from './uploadPlaceholders.js';
import { tableEditingUiPlugin } from './table/TableEditingPlugin.js';
import { resolveDocumentStickers } from './stickers.js';
import { uploadVideosAt, videoFiles } from './videos.js';

const registry = Object.create(null);
let previousGlobals = null;

// The standalone bootstrap creates this namespace before the bundle loads.
// Calling this here also supports installations upgraded in place.
installIntegrationGlobal();

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

function loadContentCss(files) {
    for (const file of Array.isArray(files) ? files : []) {
        const href = String(file || '').trim();
        if (!href) continue;
        const absoluteHref = new URL(href, document.baseURI).href;
        const loaded = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
            .some(link => link.href === absoluteHref);
        if (loaded) continue;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.dataset.roundeditorContentCss = '';
        document.head.appendChild(link);
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

function createPlugins(config, schema, extensionPlugins = []) {
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
        mediaSelectionPlugin({ labels: config.labels }),
        columnResizing({ handleWidth: 6, cellMinWidth: 40, defaultCellMinWidth: 100 }),
        tableEditingUiPlugin({ labels: config.labels }),
        tableEditing(),
        dropCursor(),
        gapCursor(),
    ];
    if (config.oembedAvailable) plugins.splice(5, 0, oembedPlaceholderPlugin());
    return [...plugins, ...extensionPlugins];
}

function handleMediaDrop(bridge, event, moved) {
    if (!bridge.config.allowUpload || moved) return false;
    const images = imageFiles(event.dataTransfer?.files);
    const videos = videoFiles(event.dataTransfer?.files);
    if (!images.length && !videos.length) return false;
    event.preventDefault();
    const position = bridge.view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos
        ?? bridge.view.state.selection.from;
    const media = Array.from(event.dataTransfer?.files || []).filter(file => (
        images.includes(file) || videos.includes(file)
    ));
    // Use Rhymix's attachment uploader for editor drops. It applies the site's
    // chunk size (important for large videos), updates the attachment list, and
    // AttachmentList inserts the completed media at this drop position.
    if (bridge.attachments?.uploadFiles(media, position)) return true;
    if (images.length) uploadImagesAt(bridge, images, position);
    if (videos.length) uploadVideosAt(bridge, videos, position);
    return true;
}

function fireCompatibilityPaste(bridge, event) {
    const clipboardData = event.clipboardData;
    const dataValue = clipboardData?.getData('text/html') || clipboardData?.getData('text/plain') || '';
    return bridge.compat?.fire('paste', { dataValue, dataTransfer: { $: clipboardData } }).stopped;
}

function insertHtml(bridge, html) {
    if (bridge.sourceMode?.insertHtml(html)) {
        bridge.sourceMode.focus();
        return bridge.sync();
    }
    let request = { html: String(html || ''), source: 'legacy', metadata: undefined };
    const transformed = bridge.extensionHost?.transformInsert(request);
    if (transformed?.handled) return bridge.sync();
    request = transformed || request;
    html = request.html;
    const parsed = bridge.schemaServices.parseDocument(html);
    const parsedParagraphs = Array.from({ length: parsed.childCount }, (_, index) => parsed.child(index));
    const insertionParagraphs = parsedParagraphs.filter(paragraph => !(
        paragraph.type === bridge.schema.nodes.paragraph
        && paragraph.attrs.unwrap
        && paragraph.childCount === 0
    ));
    const isMediaParagraph = paragraph => (
        paragraph.type === bridge.schema.nodes.paragraph
        && paragraph.childCount > 0
        && Array.from({ length: paragraph.childCount }, (_, index) => paragraph.child(index))
            .every(node => ['audio', 'image', 'video'].includes(node.type.name))
    );
    const mediaParagraphs = insertionParagraphs.length > 0 && insertionParagraphs.every(isMediaParagraph);
    // The legacy attachment list calls insertHtml() once per selected file.
    // parseSlice() opens a single media paragraph at both ends, which causes
    // the next call to merge its image into the previous paragraph. Keep
    // media-only paragraphs closed so every attachment retains its own block.
    const slice = mediaParagraphs
        ? new Slice(Fragment.fromArray(insertionParagraphs.flatMap(paragraph => (
            Array.from({ length: paragraph.childCount }, (_, index) => (
                paragraph.type.create({ ...paragraph.attrs, unwrap: false }, paragraph.child(index), paragraph.marks)
            ))
        ))), 0, 0)
        : bridge.schemaServices.parseSlice(html);
    let transaction = bridge.view.state.tr.replaceSelection(slice);
    if (mediaParagraphs) {
        const temporaryMediaParagraphs = [];
        transaction.doc.descendants((node, position) => {
            if (node.attrs.unwrap && isMediaParagraph(node)) temporaryMediaParagraphs.push(position);
        });
        for (const position of temporaryMediaParagraphs) {
            const paragraph = transaction.doc.nodeAt(position);
            transaction = transaction.setNodeMarkup(position, null, { ...paragraph.attrs, unwrap: false });
        }
    }
    bridge.view.dispatch(transaction);
    bridge.view.focus();
    return bridge.sync();
}

function selectedHtml(bridge) {
    const sourceSelection = bridge.sourceMode?.selectedHtml();
    if (sourceSelection !== null && sourceSelection !== undefined) return sourceSelection;
    return bridge.schemaServices.serializeDocument({ content: bridge.view.state.selection.content().content });
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
    return createCKEditor4Facade(bridge);
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
    const bootstrap = window.RoundEditorCKEditor4Bootstrap;
    if (bootstrap) {
        const editorName = `roundeditor_${bridge.sequence}`;
        const registered = bootstrap.register(editorName, bridge.compat);
        if (registered !== bridge.compat && registered.__roundeditorCkeditor4Proxy) {
            Object.defineProperties(registered, Object.getOwnPropertyDescriptors(bridge.compat));
            bridge.compat = registered;
        }
    }
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

async function initialize(wrapper) {
    const config = readConfig(wrapper);
    loadContentCss(config.contentCss);
    const sequence = normalizeSequence(config.editorSequence || wrapper.dataset.editorSequence);
    const form = wrapper.closest('form');
    if (!sequence || !form) throw new Error('The editor sequence or parent form is missing.');

    const contentInput = findNamedControl(form, config.contentKeyName);
    if (!contentInput) throw new Error(`The Rhymix content field "${config.contentKeyName}" was not found.`);

    const capabilities = new Set([
        'content.readHTML', 'content.insertHTML', 'content.replaceDocument', 'selection.readHTML',
        'selection.anchor', 'component.read', 'component.write', 'mode.source', 'ui.notification',
        ...(config.allowUpload ? ['attachment.read', 'attachment.upload', 'attachment.delete'] : []),
    ]);
    const prepared = prepareExtensions(config, capabilities);
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
        integration: null,
        extensionHost: null,
        schemaServices: prepared.schemaServices,
        schema: prepared.schemaServices.schema,
        imageViews: new Set(),
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
        insertHtml(html) {
            return insertHtml(this, html);
        },
        getText(selected = false) {
            return plainText(this, selected);
        },
        serializeVisual() {
            return this.schemaServices.serializeDocument(this.view.state.doc);
        },
        prepareSubmit() {
            this.sourceMode?.commit();
            return this.sync();
        },
        updateDocument(html) {
            updateEditorDocument(this.view, this.schemaServices.parseDocument(html));
        },
    };
    bridge.integration = createEditorHandle(bridge, { register: false });
    try {
        bridge.extensionHost = createExtensionHost(bridge, prepared.records);
    } catch (error) {
        for (const record of [...prepared.records].reverse()) {
            try { record.instance?.destroy?.(); } catch (_) {}
            for (const resource of [...record.resources].reverse()) resource.release();
        }
        bridge.integration._destroy();
        throw error;
    }
    const initialData = restoreSavedDocument(bridge);
    const state = EditorState.create({
        doc: bridge.schemaServices.parseDocument(initialData),
        plugins: createPlugins(config, bridge.schema, bridge.extensionHost.plugins),
    });
    bridge.view = new EditorView(wrapper.querySelector('.roundeditor__surface'), {
        state,
        attributes: {
            class: 'rhymix_content xe_content editable',
            'data-editor-sequence': String(sequence),
            spellcheck: 'false',
        },
        transformPastedHTML: bridge.schemaServices.normalizeForParse,
        handlePaste: (view, event) => (
            bridge.extensionHost.handlePaste(event)
            || handleImagePaste(bridge, event)
            || fireCompatibilityPaste(bridge, event)
            || handleOembedPaste(bridge, event)
        ),
        handleDrop: (view, event, slice, moved) => (
            bridge.extensionHost.handleDrop(event, moved)
            || handleMediaDrop(bridge, event, moved)
            || bridge.compat?.fire('drop', { dataTransfer: { $: event.dataTransfer } }).stopped
        ),
        nodeViews: {
            ...rawNodeViews(bridge),
            audio: audioNodeView(bridge),
            image: imageNodeView(bridge),
            video: videoNodeView(bridge),
            sticker: stickerNodeView(bridge),
            table: tableNodeView(bridge),
            ...bridge.extensionHost.nodeViews,
        },
        dispatchTransaction(transaction) {
            const previousState = bridge.view.state;
            bridge.view.updateState(bridge.view.state.apply(transaction));
            bridge.integration?._mapTransaction(transaction);
            bridge.extensionHost.afterTransaction([transaction], previousState, bridge.view.state);
            bridge.sync();
            bridge.attachments?.refreshUsageState();
            bridge.toolbar?.refresh(bridge.view.state);
            bridge.integration?._emit('change', {
                editor: bridge.integration,
                source: transaction.getMeta('roundeditorSource') || (transaction.getMeta('history$') ? 'history' : 'user'),
                docChanged: transaction.docChanged,
                selectionChanged: !previousState.selection.eq(bridge.view.state.selection),
            });
            if (!previousState.selection.eq(bridge.view.state.selection)) {
                bridge.integration?._emit('selectionChange', { editor: bridge.integration });
            }
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
    bridge.editable.addEventListener('focus', () => {
        window.RoundEditor?._activate(bridge.integration);
        bridge.integration?._emit('focus', { editor: bridge.integration });
    }, true);
    bridge.editable.addEventListener('blur', () => bridge.integration?._emit('blur', { editor: bridge.integration }), true);
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
    try {
        await bridge.extensionHost.ready();
    } catch (error) {
        bridge.extensionHost.destroy();
        bridge.view.destroy(); bridge._viewDestroyed = true;
        bridge.integration._destroy();
        delete registry[sequence];
        throw error;
    }
    bridge.integration._publish();
    queueMicrotask(() => bridge.compat._markReady());
    wrapper.querySelector('.roundeditor__loading')?.remove();
    wrapper.classList.add('roundeditor--ready');
    bridge.integration?._emit('ready', { editor: bridge.integration });
    if (config.focus) bridge.view.focus();
}

function boot() {
    window.RoundEditor?._extensionHost?.markEditorGenerationStarted();
    document.querySelectorAll('.roundeditor:not([data-roundeditor-started])').forEach(wrapper => {
        wrapper.setAttribute('data-roundeditor-started', 'true');
        Promise.resolve().then(() => initialize(wrapper)).catch(error => showError(wrapper, error));
    });
}

function startBoot() {
    Promise.resolve(window.RoundEditor?._extensionHost?.prepareFromDocument?.())
        .then(boot)
        .catch(error => document.querySelectorAll('.roundeditor:not([data-roundeditor-started])').forEach(wrapper => {
            wrapper.setAttribute('data-roundeditor-started', 'true');
            showError(wrapper, error);
        }));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startBoot, { once: true });
else startBoot();

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
