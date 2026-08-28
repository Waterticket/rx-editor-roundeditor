import { DOMSerializer } from 'prosemirror-model';
import { VOID_TAGS } from './attributes.js';
import { RAW_ATTRIBUTE, decodeRawHtml } from './raw.js';

function mergeNestedStyleSpans(container) {
    let merged = true;
    while (merged) {
        merged = false;
        for (const parent of Array.from(container.querySelectorAll('span[style]'))) {
            if (parent.attributes.length !== 1 || parent.childNodes.length !== 1) continue;
            const child = parent.firstElementChild;
            if (!child || child.tagName !== 'SPAN' || child.attributes.length !== 1 || !child.hasAttribute('style')) continue;
            const holder = document.createElement('span');
            holder.setAttribute('style', parent.getAttribute('style'));
            for (const property of Array.from(child.style)) {
                holder.style.setProperty(property, child.style.getPropertyValue(property), child.style.getPropertyPriority(property));
            }
            child.setAttribute('style', holder.style.cssText);
            parent.replaceWith(child);
            merged = true;
        }
    }
}

function restoreSourceStyles(container) {
    for (const element of Array.from(container.querySelectorAll('[data-rxeditor-style]'))) {
        try {
            element.setAttribute('style', decodeURIComponent(element.getAttribute('data-rxeditor-style')));
        } catch (error) {
            element.removeAttribute('style');
        }
        element.removeAttribute('data-rxeditor-style');
    }
}

function unwrapInternalNodes(container) {
    for (const wrapper of Array.from(container.querySelectorAll(`[${RAW_ATTRIBUTE}]`))) {
        const template = document.createElement('template');
        template.innerHTML = decodeRawHtml(wrapper.getAttribute(RAW_ATTRIBUTE));
        wrapper.replaceWith(...Array.from(template.content.childNodes));
    }
    for (const paragraph of Array.from(container.querySelectorAll('p[data-rxeditor-unwrap]'))) {
        paragraph.replaceWith(...Array.from(paragraph.childNodes));
    }
}

function useXhtmlVoidTags(html) {
    const names = Array.from(VOID_TAGS).join('|');
    return html.replace(new RegExp(`<(${names})(\\s[^<>]*?)?>`, 'gi'), match => (
        /\/\s*>$/.test(match) ? match : `${match.slice(0, -1).trimEnd()} />`
    ));
}

function useFilterStableEntities(html) {
    return html.replace(/&nbsp;/g, '\u00a0');
}

export function serializeDocument(doc, schema) {
    const container = document.createElement('div');
    container.appendChild(DOMSerializer.fromSchema(schema).serializeFragment(doc.content));
    restoreSourceStyles(container);
    mergeNestedStyleSpans(container);
    unwrapInternalNodes(container);
    return useFilterStableEntities(useXhtmlVoidTags(container.innerHTML));
}
