import { Fragment, Slice } from 'prosemirror-model';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { parseDocument } from './schema/index.js';

const URL_PATTERN = /^(?:https?:)?\/\/[^\s<>"]+$/i;
const FAILED_HOSTS_KEY = 'oembed:failed_hosts';
// OG sites can fail transiently because of rate limits or remote fetch errors.
// Keep only a very short debounce so one failure does not silently disable an
// entire host (for example every pixiv.net artwork) for the rest of the tab.
const FAILED_HOST_TTL_MS = 10 * 1000;
const SAME_HOST_REQUEST_GAP_MS = 2 * 1000;
const hostRequestQueues = new Map();

export const oembedPlaceholderKey = new PluginKey('roundeditor-oembed-placeholders');

function placeholderDecoration(from, to, id) {
    return Decoration.node(from, to, { class: 'roundeditor__oembed-pending' }, { id });
}

export function oembedPlaceholderPlugin() {
    return new Plugin({
        key: oembedPlaceholderKey,
        state: {
            init: () => new Map(),
            apply(transaction, placeholders) {
                const next = new Map();
                for (const [id, placeholder] of placeholders) {
                    const from = transaction.mapping.mapResult(placeholder.from, 1);
                    const node = transaction.doc.nodeAt(from.pos);
                    if (!from.deletedAcross
                        && node?.type.name === 'paragraph'
                        && node.textContent === placeholder.url) {
                        next.set(id, { from: from.pos, to: from.pos + node.nodeSize, url: placeholder.url });
                    }
                }
                const action = transaction.getMeta(oembedPlaceholderKey);
                if (action?.add) {
                    next.set(action.add.id, {
                        from: action.add.from,
                        to: action.add.to,
                        url: action.add.url,
                    });
                }
                if (action?.remove) {
                    next.delete(action.remove.id);
                }
                return next;
            },
        },
        props: {
            decorations(state) {
                const decorations = [];
                for (const [id, placeholder] of oembedPlaceholderKey.getState(state) || []) {
                    const node = state.doc.nodeAt(placeholder.from);
                    if (node && placeholder.to === placeholder.from + node.nodeSize) {
                        decorations.push(placeholderDecoration(placeholder.from, placeholder.to, id));
                    }
                }
                return DecorationSet.create(state.doc, decorations);
            },
        },
    });
}

function loadFailedHosts() {
    try {
        const failed = JSON.parse(window.sessionStorage.getItem(FAILED_HOSTS_KEY) || '{}');
        const now = Date.now();
        let changed = false;
        for (const [host, failedAt] of Object.entries(failed)) {
            if (typeof failedAt !== 'number' || now - failedAt > FAILED_HOST_TTL_MS) {
                delete failed[host];
                changed = true;
            }
        }
        if (changed) window.sessionStorage.setItem(FAILED_HOSTS_KEY, JSON.stringify(failed));
        return failed;
    } catch (error) {
        return {};
    }
}

function rememberFailedHost(host) {
    if (!host) return;
    try {
        const failed = loadFailedHosts();
        failed[host] = Date.now();
        window.sessionStorage.setItem(FAILED_HOSTS_KEY, JSON.stringify(failed));
    } catch (error) {
        // sessionStorage may be unavailable in privacy-restricted contexts.
    }
}

function forgetFailedHost(host) {
    if (!host) return;
    try {
        const failed = loadFailedHosts();
        if (!Object.hasOwn(failed, host)) return;
        delete failed[host];
        window.sessionStorage.setItem(FAILED_HOSTS_KEY, JSON.stringify(failed));
    } catch (error) {
        // sessionStorage may be unavailable in privacy-restricted contexts.
    }
}

function hostOf(url) {
    try {
        return new URL(url, window.location.href).host;
    } catch (error) {
        return '';
    }
}

function csrfToken(bridge) {
    if (bridge.config.csrfToken) return String(bridge.config.csrfToken);
    if (window.Rhymix && typeof window.Rhymix.getCSRFToken === 'function') {
        return String(window.Rhymix.getCSRFToken() || '');
    }
    return String(window.rx_csrf_token
        || document.querySelector('meta[name="csrf-token"]')?.content
        || window.csrf_token
        || '');
}

function requestBody(bridge, values) {
    const body = new URLSearchParams();
    for (const [name, value] of Object.entries(values)) {
        if (value !== null && value !== undefined && value !== '') body.append(name, String(value));
    }
    body.append('mid', bridge.config.mid || window.current_mid || '');
    const token = csrfToken(bridge);
    if (token) body.append('_rx_csrf_token', token);
    return { body, token };
}

function post(bridge, url, values) {
    const { body, token } = requestBody(bridge, values);
    return window.fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-Token': token,
            Accept: 'application/json',
        },
        body: body.toString(),
    });
}

function fetchOembed(bridge, url) {
    return post(bridge, '/index.php?module=oembed&act=procOembedFetch', {
        url,
        editor_sequence: bridge.sequence,
    }).then(response => (response.ok ? response.json() : { kind: 'fail' }))
        .catch(() => ({ kind: 'fail' }));
}

function queueOembedFetch(bridge, url, host) {
    const key = host || url;
    const queued = hostRequestQueues.has(key);
    const previous = hostRequestQueues.get(key) || Promise.resolve();
    const request = previous.catch(() => {})
        .then(() => (queued
            ? new Promise(resolve => window.setTimeout(resolve, SAME_HOST_REQUEST_GAP_MS))
            : null))
        .then(() => fetchOembed(bridge, url));
    const tail = request.finally(() => {
        if (hostRequestQueues.get(key) === tail) hostRequestQueues.delete(key);
    });
    hostRequestQueues.set(key, tail);
    return request;
}

function abortAttachment(bridge, fileSrl) {
    if (!bridge.sequence || !fileSrl) return;
    post(bridge, '/index.php?module=file&act=procFileDelete', {
        editor_sequence: bridge.sequence,
        file_srl: fileSrl,
    }).catch(() => {});
}

function syncUploadTarget(bridge, uploadTargetSrl) {
    if (!uploadTargetSrl) return;
    bridge.rebindControls?.();
    if (bridge.primaryInput) bridge.primaryInput.value = String(uploadTargetSrl);
    bridge.config.uploadTargetSrl = Number(uploadTargetSrl);
}

export function pickPastedUrl(clipboardData) {
    const text = String(clipboardData?.getData?.('text/plain') || '').trim();
    return text && URL_PATTERN.test(text) ? text : null;
}

function insertPlaceholder(bridge, url) {
    const { state } = bridge.view;
    const link = state.schema.marks.link.create({ href: url });
    const placeholder = state.schema.nodes.paragraph.create(null, state.schema.text(url, [link]));
    const slice = new Slice(Fragment.from(placeholder), 0, 0);
    const id = {};
    const transaction = state.tr.replaceSelection(slice);
    let position = null;
    transaction.doc.descendants((node, pos) => {
        if (node !== placeholder) return true;
        position = pos;
        return false;
    });
    if (position === null) return null;
    transaction.setMeta(oembedPlaceholderKey, {
        add: { id, from: position, to: position + placeholder.nodeSize, url },
    });
    bridge.view.dispatch(transaction.scrollIntoView());
    return id;
}

function findPlaceholder(state, id, url) {
    const placeholder = oembedPlaceholderKey.getState(state)?.get(id);
    if (!placeholder) return null;
    const node = state.doc.nodeAt(placeholder.from);
    if (node?.type !== state.schema.nodes.paragraph || node.textContent !== url) return null;
    return placeholder;
}

function removePlaceholderMarker(bridge, id) {
    bridge.view.dispatch(bridge.view.state.tr.setMeta(oembedPlaceholderKey, { remove: { id } }));
}

function replacePlaceholder(bridge, id, url, html) {
    const { state } = bridge.view;
    const placeholder = findPlaceholder(state, id, url);
    if (!placeholder) return false;
    const content = parseDocument(html).content;
    if (!content.childCount) return false;
    const nodes = [...content.content];
    if (nodes.some(node => !node.isBlock)) return false;
    nodes.push(state.schema.nodes.paragraph.create());
    const replacement = new Slice(Fragment.fromArray(nodes), 0, 0);
    const transaction = state.tr
        // Replace exactly this placeholder. replaceRange() may expand across
        // an adjacent placeholder to find a schema-friendly boundary, which
        // drops one item when several URLs are pasted before requests finish.
        .replace(placeholder.from, placeholder.to, replacement)
        .setMeta(oembedPlaceholderKey, { remove: { id } });
    bridge.view.dispatch(transaction.scrollIntoView());
    return true;
}

export function handleOembedPaste(bridge, event) {
    if (!bridge.config.oembedAvailable || typeof window.fetch !== 'function') return false;
    const url = pickPastedUrl(event.clipboardData);
    if (!url) return false;
    const host = hostOf(url);
    if (host && loadFailedHosts()[host]) return false;

    event.preventDefault();
    if (bridge.extensionHost?.beginAsyncContent) {
        const escaped = url.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
        const task = bridge.extensionHost.beginAsyncContent({
            kind: 'rx.oembed',
            placeholderHTML: `<p><a href="${escaped}">${escaped}</a></p>`,
            originalHTML: `<p>${escaped}</p>`,
            source: 'module:oembed',
        });
        queueOembedFetch(bridge, url, host).then(response => {
            if ((response.kind === 'embed' || response.kind === 'card') && response.wrapped_html) {
                if (task.alive) {
                    task.replaceHTML(response.wrapped_html, { appendParagraph: true });
                    forgetFailedHost(host);
                    syncUploadTarget(bridge, response.upload_target_srl);
                    if (response.file_srl) bridge.attachments?.refresh();
                } else if (response.file_srl) abortAttachment(bridge, response.file_srl);
                return;
            }
            if (host && !response.provider) rememberFailedHost(host);
            if (task.alive) task.restoreOriginal();
        });
        return true;
    }
    const placeholderId = insertPlaceholder(bridge, url);
    if (!placeholderId) return true;

    queueOembedFetch(bridge, url, host).then(response => {
        if ((response.kind === 'embed' || response.kind === 'card') && response.wrapped_html) {
            if (replacePlaceholder(bridge, placeholderId, url, response.wrapped_html)) {
                forgetFailedHost(host);
                syncUploadTarget(bridge, response.upload_target_srl);
                if (response.file_srl) bridge.attachments?.refresh();
            } else if (response.file_srl) {
                abortAttachment(bridge, response.file_srl);
            }
            return;
        }
        if (host && !response.provider) rememberFailedHost(host);
        removePlaceholderMarker(bridge, placeholderId);
    });
    return true;
}
