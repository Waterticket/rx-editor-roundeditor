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

function fillEmptyParagraphs(container) {
    for (const paragraph of Array.from(container.querySelectorAll('p'))) {
        if (!paragraph.childNodes.length) paragraph.appendChild(document.createTextNode('\u00a0'));
    }
}

function normalizeInlineStyles(container) {
    for (const element of Array.from(container.querySelectorAll('[style]'))) {
        const style = styleDeclarations(element.getAttribute('style'))
            .map(([property, value]) => `${property}:${element.matches('.roundeditor-content-image__caption, .roundeditor-content-media__caption')
                ? value.replace(/rgba?\(([^)]*)\)/gi, match => match.replace(/\s*,\s*/g, ','))
                : value}`).join(';');
        if (style) element.setAttribute('style', `${style};`);
        else element.removeAttribute('style');
    }
}

function addStyleDefaults(element, defaults) {
    const styles = new Map(styleDeclarations(element.getAttribute('style')));
    for (const [property, value] of defaults) {
        if (!styles.has(property)) styles.set(property, value);
    }
    const style = `${Array.from(styles, ([property, value]) => `${property}:${value}`).join(';')};`;
    const dataAttributes = Array.from(element.attributes)
        .filter(attribute => attribute.name.startsWith('data-'))
        .map(attribute => [attribute.name, attribute.value]);
    for (const [name] of dataAttributes) element.removeAttribute(name);
    element.setAttribute('style', style);
    for (const [name, value] of dataAttributes) element.setAttribute(name, value);
}

function storedColumnWidths(row) {
    const columns = [];
    let hasStoredWidth = false;
    for (const cell of Array.from(row?.cells || [])) {
        const colspan = Math.max(1, cell.colSpan || 1);
        const stored = String(cell.getAttribute('data-colwidth') || '').split(',');
        let cellWidth = 0;
        let cellHasCompleteWidth = true;
        for (let index = 0; index < colspan; index++) {
            const width = Number.parseInt(stored[index], 10);
            if (Number.isFinite(width) && width > 0) {
                columns.push(width);
                cellWidth += width;
                hasStoredWidth = true;
            } else {
                columns.push(null);
                cellHasCompleteWidth = false;
            }
        }
        if (cellHasCompleteWidth && cellWidth > 0) addStyleDefaults(cell, [['width', `${cellWidth}px`]]);
    }
    return hasStoredWidth ? columns : [];
}

function applyTablePresentation(container) {
    for (const table of Array.from(container.querySelectorAll('table'))) {
        const columns = storedColumnWidths(table.rows?.[0]);
        const hasFixedWidth = columns.length > 0 && columns.every(Boolean);
        const totalWidth = columns.reduce((total, width) => total + (width || 100), 0);
        const tableStyles = [
            ['box-sizing', 'border-box'],
            ['width', hasFixedWidth ? `${totalWidth}px` : '100%'],
            ['margin', '12px 0'],
            ['border-collapse', 'collapse'],
            ['table-layout', 'fixed'],
        ];
        if (columns.length && !hasFixedWidth) tableStyles.push(['min-width', `${totalWidth}px`]);
        addStyleDefaults(table, tableStyles);

        for (const cell of Array.from(table.querySelectorAll('td, th'))) {
            const horizontalAlign = cell.getAttribute('align') || (cell.tagName === 'TH' ? 'center' : 'left');
            const verticalAlign = cell.getAttribute('valign') || 'top';
            addStyleDefaults(cell, [
                ['box-sizing', 'border-box'],
                ['min-width', '40px'],
                ['padding', '8px'],
                ['border', '1px solid rgba(128,128,128,0.32)'],
                ['vertical-align', verticalAlign],
                ['text-align', horizontalAlign],
            ]);
            for (const paragraph of Array.from(cell.querySelectorAll('p'))) {
                addStyleDefaults(paragraph, [['margin-top', '0'], ['margin-bottom', '0']]);
            }
        }
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
    fillEmptyParagraphs(container);
    applyTablePresentation(container);
    normalizeInlineStyles(container);
    return useFilterStableEntities(useXhtmlVoidTags(container.innerHTML));
}
