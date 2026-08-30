import { BLOCK_TAGS, VOID_TAGS } from './schema/attributes.js';

function isBlock(node) {
    return Boolean(node) && node.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has(node.tagName.toLowerCase());
}

function shallowTags(element) {
    const marker = `roundeditor-${Math.random().toString(36).slice(2)}`;
    const clone = element.cloneNode(false);
    clone.appendChild(document.createTextNode(marker));
    const html = clone.outerHTML;
    const position = html.indexOf(marker);
    return [html.slice(0, position), html.slice(position + marker.length)];
}

function inlineHtml(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue;
    if (node.nodeType === Node.COMMENT_NODE) return `<!--${node.nodeValue}-->`;
    return node.outerHTML || '';
}

function renderContainer(container, depth) {
    const lines = [];
    let inline = '';
    const flushInline = () => {
        if (!inline) return;
        lines.push(`${'  '.repeat(depth)}${inline}`);
        inline = '';
    };

    for (const node of container.childNodes) {
        if (!isBlock(node)) {
            inline += inlineHtml(node);
            continue;
        }
        flushInline();
        lines.push(...renderBlock(node, depth));
    }
    flushInline();
    return lines;
}

function renderBlock(element, depth) {
    const indent = '  '.repeat(depth);
    const tagName = element.tagName.toLowerCase();
    const hasBlockChild = Array.from(element.children).some(isBlock);
    if (VOID_TAGS.has(tagName) || !hasBlockChild || ['pre', 'code'].includes(tagName)) {
        return [`${indent}${element.outerHTML}`];
    }
    const [opening, closing] = shallowTags(element);
    return [
        `${indent}${opening}`,
        ...renderContainer(element, depth + 1),
        `${indent}${closing}`,
    ];
}

export function beautifyHtml(html) {
    const template = document.createElement('template');
    template.innerHTML = String(html || '');
    return renderContainer(template.content, 0).join('\n');
}

function removeFormattingWhitespace(container) {
    const hasBlockChild = Array.from(container.children || []).some(isBlock);
    for (const node of Array.from(container.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE) {
            const formatting = /^[\t\n\r ]+$/u.test(node.nodeValue) && node.nodeValue.includes('\n');
            if (formatting && (container.nodeType === Node.DOCUMENT_FRAGMENT_NODE || hasBlockChild || isBlock(node.previousSibling) || isBlock(node.nextSibling))) {
                node.remove();
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            removeFormattingWhitespace(node);
        }
    }
}

export function minifyHtml(html) {
    const template = document.createElement('template');
    template.innerHTML = String(html || '');
    removeFormattingWhitespace(template.content);
    return template.innerHTML;
}
