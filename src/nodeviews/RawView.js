import {
    componentCardIcon,
    componentElement,
    componentPresentation,
    resolveComponentDetails,
} from '../rhymix/componentPresentation.js';
import { NodeSelection } from 'prosemirror-state';
import { startMediaHandleDrag } from '../mediaSelection.js';

const UNSAFE_OEMBED_ELEMENTS = 'script,style,form,input,button,select,textarea,object,embed';
const UNSAFE_RAW_PREVIEW_ELEMENTS = `${UNSAFE_OEMBED_ELEMENTS},iframe`;
const PREVIEW_MEDIA_SELECTOR = '.media_embed_wrapper';
const PREVIEW_EMBED_SELECTOR = `${PREVIEW_MEDIA_SELECTOR},.preview_card_wrapper`;
const URI_ATTRIBUTES = new Set(['href', 'src', 'poster', 'data']);
const sdkPromises = new Map();
const sdkReloadPromises = new Map();
const loadedSdks = new Set();
const sdkRefreshers = new Map([
    ['https://platform.twitter.com/widgets.js', root => {
        if (typeof window.twttr?.widgets?.load !== 'function') return false;
        window.twttr.widgets.load(root);
        return true;
    }],
    ['https://www.instagram.com/embed.js', () => {
        if (typeof window.instgrm?.Embeds?.process !== 'function') return false;
        window.instgrm.Embeds.process();
        return true;
    }],
    ['https://connect.facebook.net/ko_KR/sdk.js#xfbml=1&version=v18.0', root => {
        if (typeof window.FB?.XFBML?.parse !== 'function') return false;
        window.FB.XFBML.parse(root);
        return true;
    }],
]);

function refreshSdk(asset, root) {
    const refresh = sdkRefreshers.get(asset.script);
    if (!refresh) return false;
    try {
        return refresh(root);
    } catch (_) {
        return false;
    }
}

function normalizeOembed(root, asset) {
    for (const rule of Array.isArray(asset?.normalize) ? asset.normalize : []) {
        if (!rule || typeof rule.detect !== 'string' || typeof rule.addClass !== 'string' || !rule.addClass) continue;
        try {
            if (root.matches(rule.detect)) root.classList.add(rule.addClass);
            for (const node of root.querySelectorAll(rule.detect)) node.classList.add(rule.addClass);
        } catch (_) {
            // A malformed provider selector must not disable other providers.
        }
    }
}

function matchesOembed(root, selector) {
    try {
        return root.matches(selector) || Boolean(root.querySelector(selector));
    } catch (_) {
        return false;
    }
}

function injectSdk(asset, force = false) {
    const src = asset.script;
    if (!force && sdkPromises.has(src)) return sdkPromises.get(src);
    if (force && sdkReloadPromises.has(src)) return sdkReloadPromises.get(src);

    const promise = new Promise((resolve, reject) => {
        let script = force ? null : Array.from(document.scripts).find(item => item.src === src);
        if (script?.dataset.roundeditorLoaded === 'true') {
            loadedSdks.add(src);
            resolve();
            return;
        }
        if (!script) {
            script = document.createElement('script');
            script.async = true;
            script.src = src;
            script.dataset.roundeditorOembedSdk = src;
            if (asset.crossorigin === true) script.crossOrigin = 'anonymous';
            (document.head || document.documentElement).appendChild(script);
        }
        script.addEventListener('load', () => {
            script.dataset.roundeditorLoaded = 'true';
            loadedSdks.add(src);
            for (const duplicate of document.querySelectorAll('script[data-roundeditor-oembed-sdk]')) {
                if (duplicate !== script && duplicate.dataset.roundeditorOembedSdk === src) duplicate.remove();
            }
            resolve();
        }, { once: true });
        script.addEventListener('error', () => reject(new Error('The oEmbed SDK failed to load.')), { once: true });
    }).catch(error => {
        sdkPromises.delete(src);
        throw error;
    });
    if (force) {
        sdkReloadPromises.set(src, promise);
        promise.then(
            () => sdkReloadPromises.delete(src),
            () => sdkReloadPromises.delete(src),
        );
    } else {
        sdkPromises.set(src, promise);
    }
    return promise;
}

function activateOembed(root, assets) {
    for (const asset of Array.isArray(assets) ? assets : []) normalizeOembed(root, asset);
    const matching = (Array.isArray(assets) ? assets : []).filter(asset => (
        asset && typeof asset.script === 'string' && typeof asset.selector === 'string'
        && matchesOembed(root, asset.selector)
    ));
    if (!matching.length) return;

    // NodeViews are attached immediately after construction. Deferring one
    // microtask guarantees that document-scanning SDKs can see this node.
    Promise.resolve().then(() => {
        for (const asset of matching) {
            if (refreshSdk(asset, root)) continue;
            // Provider SDKs scan matching selectors when they execute. Re-run
            // an already loaded SDK for dynamic NodeViews; the editor never
            // needs to know a provider name. A small SDK adapter is only needed
            // when an SDK refuses to initialize twice in the same document.
            injectSdk(asset, loadedSdks.has(asset.script)).then(() => {
                refreshSdk(asset, root);
            }).catch(() => {});
        }
    });
}

function safeOembedElement(html) {
    const template = document.createElement('template');
    template.innerHTML = String(html || '');
    const element = template.content.firstElementChild;
    if (!element || element.tagName !== 'DIV' || element.getAttribute('editor_component') !== 'oembed') return null;
    for (const unsafe of element.querySelectorAll(UNSAFE_OEMBED_ELEMENTS)) unsafe.remove();
    for (const child of [element, ...element.querySelectorAll('*')]) {
        for (const attribute of Array.from(child.attributes)) {
            const name = attribute.name.toLowerCase();
            if (name.startsWith('on') || name === 'srcdoc') {
                child.removeAttribute(attribute.name);
            } else if (URI_ATTRIBUTES.has(name) && /^\s*(?:javascript|vbscript|data:text\/html)/i.test(attribute.value)) {
                child.removeAttribute(attribute.name);
            }
        }
    }
    element.contentEditable = 'false';
    element.classList.add('roundeditor__oembed');
    element.dataset.roundeditorRawNode = 'rhymixComponentBlock';
    return element;
}

function safeRawPreview(html) {
    const template = document.createElement('template');
    template.innerHTML = String(html || '');
    const element = template.content.firstElementChild;
    if (!element) return null;
    const previewMedia = element.matches(PREVIEW_MEDIA_SELECTOR);
    const unsafeSelector = previewMedia ? UNSAFE_OEMBED_ELEMENTS : UNSAFE_RAW_PREVIEW_ELEMENTS;
    for (const unsafe of element.matches(unsafeSelector)
        ? [element]
        : element.querySelectorAll(unsafeSelector)) {
        unsafe.remove();
    }
    if (!element.isConnected && !template.content.contains(element)) return null;
    for (const child of [element, ...element.querySelectorAll('*')]) {
        for (const attribute of Array.from(child.attributes)) {
            const name = attribute.name.toLowerCase();
            if (name.startsWith('on') || name === 'srcdoc') {
                child.removeAttribute(attribute.name);
            } else if (URI_ATTRIBUTES.has(name) && /^\s*(?:javascript|vbscript|data:text\/html)/i.test(attribute.value)) {
                child.removeAttribute(attribute.name);
            }
        }
    }
    element.contentEditable = 'false';
    element.classList.add('roundeditor__raw-preview');
    if (element.matches(PREVIEW_EMBED_SELECTOR)) element.classList.add('roundeditor__raw-preview--embed');
    if (previewMedia) element.classList.add('roundeditor__raw-preview--media');
    return element;
}

function rawDragHandle(selectNode) {
    const handle = document.createElement('span');
    handle.className = 'roundeditor__raw-drag-handle';
    handle.setAttribute('role', 'button');
    handle.tabIndex = 0;
    handle.setAttribute('aria-label', 'Drag to move embed');
    handle.title = 'Drag to move embed';
    handle.textContent = '⠿';
    handle.addEventListener('mousedown', event => {
        if (event.button === 0) selectNode(event);
    });
    return handle;
}

export class RawView {
    constructor(node, bridge, view, getPos) {
        this.node = node;
        this.view = view;
        this.getPos = getPos;
        this.dom = document.createElement(node.type.isInline ? 'span' : 'div');
        this.dom.className = `roundeditor__raw roundeditor__raw--${node.type.isInline ? 'inline' : 'block'}`;
        this.dom.contentEditable = 'false';
        this.dom.dataset.roundeditorRawNode = node.type.name;

        if (node.type.name.startsWith('rhymixComponent')) {
            const component = componentElement(node.attrs.html);
            if (component?.getAttribute('editor_component') === 'oembed') {
                const oembed = safeOembedElement(node.attrs.html);
                if (oembed) {
                    this.dom = oembed;
                    this.isOembed = true;
                    this.dom.classList.add('roundeditor__raw--embed');
                    this.dom.appendChild(rawDragHandle(event => this.beginHandleDrag(event)));
                    if (bridge?.config.oembedAvailable) activateOembed(this.dom, bridge.config.oembedAssets);
                }
                return;
            }
            this.renderComponent(bridge);
            return;
        }

        const preview = safeRawPreview(node.attrs.html);
        if (preview) {
            this.dom.appendChild(preview);
            if (preview.classList.contains('roundeditor__raw-preview--embed')) {
                this.dom.classList.add('roundeditor__raw--embed');
                this.dom.appendChild(rawDragHandle(event => this.beginHandleDrag(event)));
            }
        }
    }

    beginHandleDrag(event) {
        if (!this.view || typeof this.getPos !== 'function') return;
        event.preventDefault();
        event.stopPropagation();
        this.selectEditorNode();
        this.dom.classList.add('roundeditor__raw--dragging');
        startMediaHandleDrag(this.view, this.dom);
        const finish = mouseEvent => {
            document.removeEventListener('mouseup', finish, true);
            document.removeEventListener('keydown', cancel, true);
            this.dom.classList.remove('roundeditor__raw--dragging');
            this.moveToMouseTarget(mouseEvent);
        };
        const cancel = keyEvent => {
            if (keyEvent.key !== 'Escape') return;
            document.removeEventListener('mouseup', finish, true);
            document.removeEventListener('keydown', cancel, true);
            this.dom.classList.remove('roundeditor__raw--dragging');
        };
        document.addEventListener('mouseup', finish, true);
        document.addEventListener('keydown', cancel, true);
    }

    moveToMouseTarget(event) {
        const source = this.getPos();
        if (!Number.isInteger(source)) return;
        let target = event.target instanceof Node ? event.target : null;
        if (target?.nodeType === Node.TEXT_NODE) target = target.parentElement;
        while (target && target.parentElement !== this.view.dom) target = target.parentElement;
        if (!target) return;
        const children = Array.from(this.view.dom.children);
        const index = children.indexOf(target);
        if (index < 0 || index >= this.view.state.doc.childCount) return;
        let boundary = 0;
        for (let childIndex = 0; childIndex < index; childIndex++) {
            boundary += this.view.state.doc.child(childIndex).nodeSize;
        }
        const targetNode = this.view.state.doc.child(index);
        const rect = target.getBoundingClientRect();
        if (event.clientY > rect.top + rect.height / 2) boundary += targetNode.nodeSize;
        if (boundary >= source && boundary <= source + this.node.nodeSize) return;

        let transaction = this.view.state.tr.delete(source, source + this.node.nodeSize);
        const insertion = transaction.mapping.map(boundary, boundary < source ? -1 : 1);
        transaction = transaction.insert(insertion, this.node)
            .setSelection(NodeSelection.create(transaction.doc, insertion));
        this.view.dispatch(transaction.scrollIntoView());
    }

    selectEditorNode() {
        if (!this.view || typeof this.getPos !== 'function') return;
        const position = this.getPos();
        if (!Number.isInteger(position)) return;
        this.view.dispatch(this.view.state.tr.setSelection(NodeSelection.create(this.view.state.doc, position)));
    }

    selectNode() {
        this.dom.classList.add('ProseMirror-selectednode');
    }

    deselectNode() {
        this.dom.classList.remove('ProseMirror-selectednode');
    }

    renderComponent(bridge) {
        const element = componentElement(this.node.attrs.html);
        const name = element?.getAttribute('editor_component') || '';
        const configuredTitle = bridge?.config.components?.[name];
        const title = typeof configuredTitle === 'object' ? configuredTitle.title : configuredTitle;
        const labels = bridge?.config.labels || {};
        const presentation = componentPresentation(name, title, element, labels);
        this.dom.classList.add('roundeditor__component-card');
        this.dom.dataset.componentName = name;

        const icon = componentCardIcon(presentation.icon);
        if (icon) this.dom.appendChild(icon);
        const body = document.createElement('span');
        body.className = 'roundeditor__component-card-body';
        const heading = document.createElement('strong');
        heading.textContent = presentation.title;
        body.appendChild(heading);
        this.details = document.createElement('span');
        this.details.className = 'roundeditor__component-details';
        body.appendChild(this.details);
        this.renderDetails(presentation.details);
        if (presentation.resolveDetails) {
            this.renderDetails(presentation.pendingDetails);
            resolveComponentDetails(presentation, element, labels).then(details => {
                if (!this.destroyed) this.renderDetails(details);
            }).catch(() => {
                if (!this.destroyed) this.renderDetails(presentation.unavailableDetails);
            });
        }
        const hint = document.createElement('span');
        hint.className = 'roundeditor__component-hint';
        hint.textContent = labels.componentEditHint || 'Double-click to view or edit details';
        body.appendChild(hint);
        this.dom.appendChild(body);
    }

    renderDetails(details) {
        this.details.replaceChildren(...details.map(detail => {
            const item = document.createElement('span');
            item.className = 'roundeditor__component-detail';
            item.textContent = `${detail.label}: ${detail.value}`;
            return item;
        }));
        this.details.hidden = !details.length;
    }

    stopEvent() {
        // Let ProseMirror handle pointer and drag events for raw atoms so a
        // preview card or legacy media embed can be selected and repositioned.
        // Non-oEmbed Rhymix components keep their own double-click editing
        // interaction and are handled by the component integration instead.
        return this.node.type.name.startsWith('rhymixComponent') && !this.isOembed;
    }

    ignoreMutation() {
        return true;
    }

    destroy() {
        this.destroyed = true;
    }
}

export function rawNodeViews(bridge) {
    return Object.fromEntries([
        'embed',
        'rawBlock',
        'rawInline',
        'rhymixComponentBlock',
        'rhymixComponentInline',
    ].map(name => [name, (node, view, getPos) => new RawView(node, bridge, view, getPos)]));
}
