import { DOMSerializer } from 'prosemirror-model';
import { VOID_TAGS } from './attributes.js';
import { RAW_ATTRIBUTE, decodeRawHtml } from './raw.js';

function styleDeclarations(style) {
    const declarations = [];
    let current = '';
    let quote = '';
    let depth = 0;
    for (const character of String(style || '')) {
        if (quote) {
            current += character;
            if (character === quote) quote = '';
        } else if (character === '"' || character === "'") {
            quote = character;
            current += character;
        } else if (character === '(') {
            depth++;
            current += character;
        } else if (character === ')') {
            depth = Math.max(0, depth - 1);
            current += character;
        } else if (character === ';' && depth === 0) {
            declarations.push(current);
            current = '';
        } else current += character;
    }
    if (current) declarations.push(current);
    return declarations.map(declaration => {
        const separator = declaration.indexOf(':');
        return separator < 1 ? null : [
            declaration.slice(0, separator).trim().toLowerCase(),
            declaration.slice(separator + 1).trim(),
        ];
    }).filter(Boolean);
}

function mergeNestedStyleSpans(container) {
    let merged = true;
    while (merged) {
        merged = false;
        for (const parent of Array.from(container.querySelectorAll('span[style]'))) {
            if (parent.attributes.length !== 1 || parent.childNodes.length !== 1) continue;
            const child = parent.firstElementChild;
            if (!child || child.tagName !== 'SPAN' || child.attributes.length !== 1 || !child.hasAttribute('style')) continue;
            const styles = new Map(styleDeclarations(parent.getAttribute('style')));
            for (const [property, value] of styleDeclarations(child.getAttribute('style'))) styles.set(property, value);
            child.setAttribute('style', `${Array.from(styles, ([property, value]) => `${property}:${value}`).join(';')};`);
            parent.replaceWith(child);
            merged = true;
        }
    }
}

function restoreSourceStyles(container) {
    for (const element of Array.from(container.querySelectorAll('[data-roundeditor-style]'))) {
        try {
            element.setAttribute('style', decodeURIComponent(element.getAttribute('data-roundeditor-style')));
        } catch (error) {
            element.removeAttribute('style');
        }
        element.removeAttribute('data-roundeditor-style');
    }
}

function unwrapInternalNodes(container) {
    for (const wrapper of Array.from(container.querySelectorAll(`[${RAW_ATTRIBUTE}]`))) {
        const template = document.createElement('template');
        template.innerHTML = decodeRawHtml(wrapper.getAttribute(RAW_ATTRIBUTE));
        wrapper.replaceWith(...Array.from(template.content.childNodes));
    }
    for (const paragraph of Array.from(container.querySelectorAll('p[data-roundeditor-unwrap]'))) {
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
