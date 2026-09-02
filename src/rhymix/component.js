import { DOMSerializer } from 'prosemirror-model';
import { NodeSelection } from 'prosemirror-state';
import { invalidateComponentDetails } from './componentPresentation.js';

const COMPONENT_TYPES = new Set(['rhymixComponentBlock', 'rhymixComponentInline']);

function componentName(node, bridge) {
    const template = document.createElement('template');
    if (COMPONENT_TYPES.has(node.type.name)) template.innerHTML = node.attrs.html;
    else template.content.appendChild(DOMSerializer.fromSchema(bridge.schema).serializeNode(node));
    return template.content.querySelector('[editor_component]')?.getAttribute('editor_component') || '';
}

function proxyHtml(node, bridge) {
    if (COMPONENT_TYPES.has(node.type.name)) return node.attrs.html;
    const container = document.createElement('div');
    container.appendChild(DOMSerializer.fromSchema(bridge.schema).serializeNode(node));
    return container.innerHTML;
}

function componentAtEvent(bridge, target) {
    const raw = target.closest?.('[data-roundeditor-raw-node^="rhymixComponent"]');
    const element = target.closest?.('[editor_component]');
    const dom = raw || element;
    if (!dom || !bridge.editable.contains(dom)) return null;
    let position;
    try {
        position = bridge.view.posAtDOM(dom, 0);
    } catch (error) {
        return null;
    }
    const candidates = [position, position - 1, position + 1].filter(value => value >= 0);
    for (const candidate of candidates) {
        const node = bridge.view.state.doc.nodeAt(candidate);
        if (node && (COMPONENT_TYPES.has(node.type.name) || node.attrs?.editorComponent)) {
            return { node, position: candidate };
        }
    }
    return null;
}

export function openComponent(bridge, name) {
    if (!name || bridge.sourceMode?.active || typeof window.openComponent !== 'function') return;
    window.editorPrevNode = null;
    bridge.view.focus();
    window.openComponent(name, bridge.sequence);
}

export function installComponentEditing(bridge) {
    if (!bridge.config.enableComponent) return;
    bridge.editable.addEventListener('dblclick', event => {
        const match = componentAtEvent(bridge, event.target);
        if (!match) return;
        const name = componentName(match.node, bridge);
        if (!name || !Object.prototype.hasOwnProperty.call(bridge.config.components || {}, name)) return;
        event.preventDefault();
        event.stopPropagation();

        const holder = document.createElement('div');
        holder.className = 'roundeditor__component-proxy';
        holder.innerHTML = proxyHtml(match.node, bridge);
        bridge.wrapper.appendChild(holder);
        window.editorPrevNode = holder.firstElementChild;
        bridge.view.dispatch(bridge.view.state.tr.setSelection(NodeSelection.create(bridge.view.state.doc, match.position)));

        let queued = false;
        let cleanupTimer = null;
        const observer = new MutationObserver(() => {
            if (queued || !holder.isConnected) return;
            queued = true;
            queueMicrotask(() => {
                queued = false;
                if (!holder.isConnected) return;
                try {
                    invalidateComponentDetails(name, holder.querySelector('[editor_component]'));
                    const slice = bridge.schemaServices.parseSlice(holder.innerHTML);
                    const transaction = bridge.view.state.tr.replaceRange(
                        match.position,
                        match.position + match.node.nodeSize,
                        slice
                    );
                    bridge.view.dispatch(transaction);
                    observer.disconnect();
                    window.clearTimeout(cleanupTimer);
                    holder.remove();
                    if (window.editorPrevNode && !window.editorPrevNode.isConnected) window.editorPrevNode = null;
                } catch (error) {
                    console.error('[roundeditor] Component update failed.', error);
                }
            });
        });
        observer.observe(holder, { subtree: true, childList: true, attributes: true, characterData: true });
        window.openComponent(name, bridge.sequence);
        cleanupTimer = window.setTimeout(() => {
            if (!holder.isConnected) return;
            observer.disconnect();
            holder.remove();
            if (window.editorPrevNode && !window.editorPrevNode.isConnected) window.editorPrevNode = null;
        }, 30 * 60 * 1000);
    }, true);
}
