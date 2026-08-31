import {
    ALLOWED_TAGS,
    BLOCK_TAGS,
    sanitizeElementAttributes,
} from './attributes.js';
import { RAW_ATTRIBUTE, encodeRawHtml } from './raw.js';

const KNOWN_TAGS = new Set(`
    a audio b blockquote br caption code em font h1 h2 h3 h4 h5 h6 hr i img li ol p pre s span strike strong sub
    sup table tbody td th tr u ul video
`.trim().split(/\s+/));
const DANGEROUS_TAGS = new Set('script style form input button select textarea canvas svg'.split(' '));
const PREVIEW_WRAPPER_CLASSES = new Set(['media_embed_wrapper', 'preview_card_wrapper']);

function rawReplacement(element, kind) {
    const inline = kind === 'inline' || kind === 'component-inline';
    const replacement = document.createElement(inline ? 'span' : 'div');
    replacement.setAttribute(RAW_ATTRIBUTE, encodeRawHtml(element.outerHTML));
    replacement.setAttribute('data-roundeditor-kind', kind);
    element.replaceWith(replacement);
}

function unwrapElement(element) {
    const parent = element.parentNode;
    if (!parent) return;
    while (element.firstChild) parent.insertBefore(element.firstChild, element);
    element.remove();
}

function sanitizeRawSubtree(root) {
    for (const element of Array.from(root.querySelectorAll('*')).reverse()) {
        const tagName = element.tagName.toLowerCase();
        if (DANGEROUS_TAGS.has(tagName)) {
            element.remove();
        } else if (!ALLOWED_TAGS.has(tagName)) {
            unwrapElement(element);
        } else {
            sanitizeElementAttributes(element);
        }
    }
}

function sanitizePreviewSubtree(root) {
    for (const element of [root, ...root.querySelectorAll('*')]) {
        if (!element.isConnected && element !== root && !root.contains(element)) continue;
        const tagName = element.tagName.toLowerCase();
        if (DANGEROUS_TAGS.has(tagName)) {
            element.remove();
            continue;
        }
        if (!ALLOWED_TAGS.has(tagName)) {
            unwrapElement(element);
            continue;
        }
        const className = element.getAttribute('class');
        sanitizeElementAttributes(element);
        if (className) element.setAttribute('class', className);
    }
}

function hasUnsupportedStructuralNodes(element) {
    return Array.from(element.childNodes).some(node => (
        node.nodeType !== Node.ELEMENT_NODE
        && !(node.nodeType === Node.TEXT_NODE && !node.nodeValue.trim())
    ));
}

function tableIsEditable(table) {
    if (hasUnsupportedStructuralNodes(table)) return false;
    const directElements = Array.from(table.children);
    const captions = directElements.filter(element => element.tagName === 'CAPTION');
    const bodies = directElements.filter(element => element.tagName === 'TBODY');
    if (captions.length > 1 || !bodies.length) return false;
    if (directElements.some(element => !['CAPTION', 'TBODY'].includes(element.tagName))) return false;
    if (captions.length && directElements[0] !== captions[0]) return false;
    return bodies.every(tbody => (
        !hasUnsupportedStructuralNodes(tbody)
        &&
        Array.from(tbody.children).every(row => (
            row.tagName === 'TR'
            && !hasUnsupportedStructuralNodes(row)
            && Array.from(row.children).every(cell => ['TD', 'TH'].includes(cell.tagName))
        ))
    ));
}

function listIsEditable(list) {
    return !Array.from(list.childNodes).some(node => node.nodeType !== Node.ELEMENT_NODE)
        && Array.from(list.children).every(element => element.tagName === 'LI');
}

function preIsEditable(pre) {
    return pre.children.length === 1 && pre.firstElementChild === pre.lastElementChild && pre.firstElementChild.tagName === 'CODE';
}

function videoIsEditable(video) {
    return video.children.length === 0 && !video.textContent.trim();
}

function audioIsEditable(audio) {
    return audio.children.length === 0 && !audio.textContent.trim();
}

function structurallyEditable(element) {
    const tagName = element.tagName.toLowerCase();
    if (tagName === 'a') return element.hasAttribute('href');
    if (tagName === 'caption') return element.parentElement?.tagName === 'TABLE';
    if (tagName === 'li') return ['OL', 'UL'].includes(element.parentElement?.tagName);
    if (tagName === 'tbody') return element.parentElement?.tagName === 'TABLE';
    if (tagName === 'tr') return element.parentElement?.tagName === 'TBODY';
    if (tagName === 'td' || tagName === 'th') return element.parentElement?.tagName === 'TR';
    if (tagName === 'table') return tableIsEditable(element);
    if (tagName === 'ol' || tagName === 'ul') return listIsEditable(element);
    if (tagName === 'pre') return preIsEditable(element);
    if (tagName === 'audio') return audioIsEditable(element);
    if (tagName === 'video') return videoIsEditable(element);
    return true;
}

function visitElement(element) {
    const tagName = element.tagName.toLowerCase();
    if (tagName === 'span' && element.hasAttribute('data-roundeditor-video')) {
        const video = element.querySelector('video');
        if (!video) {
            element.remove();
            return;
        }
        const caption = element.querySelector('.roundeditor-content-media__caption, .roundeditor-content-image__caption')
            || Array.from(element.children).find(child => child !== video && child.tagName === 'SPAN');
        if (caption) video.setAttribute('data-rx-roundeditor-caption', caption.textContent || '');
        element.replaceWith(video);
        visitElement(video);
        return;
    }
    if (tagName === 'span' && element.hasAttribute('data-roundeditor-image')) {
        const image = element.querySelector('img:not([data-rx-sticker])');
        const video = element.querySelector('video');
        if (!image && video) {
            const caption = element.hasAttribute('data-roundeditor-caption')
                ? element.querySelector('.roundeditor-content-image__caption')
                : null;
            if (caption) video.setAttribute('data-rx-roundeditor-caption', caption.textContent || '');
            element.replaceWith(video);
            visitElement(video);
            return;
        }
        if (!image) {
            element.remove();
            return;
        }
        const explicitCaption = element.hasAttribute('data-roundeditor-caption');
        const caption = explicitCaption
            ? element.querySelector('.roundeditor-content-image__caption')
            : null;
        const baseAlt = element.getAttribute('data-roundeditor-alt');
        if (baseAlt !== null) image.setAttribute('alt', baseAlt);
        if (caption) image.setAttribute('data-rx-roundeditor-caption', caption.textContent || '');
        element.replaceWith(image);
        visitElement(image);
        return;
    }
    if (DANGEROUS_TAGS.has(tagName)) {
        element.remove();
        return;
    }
    if (!ALLOWED_TAGS.has(tagName)) {
        for (const child of Array.from(element.children)) visitElement(child);
        unwrapElement(element);
        return;
    }

    const previewWrapper = tagName === 'div'
        && Array.from(PREVIEW_WRAPPER_CLASSES).some(className => element.classList.contains(className));
    if (previewWrapper) {
        // Preview module output is a self-contained atomic block. Preserve its
        // layout classes and safe iframe markup while applying the same URI and
        // event-attribute filtering used for other raw HTML.
        sanitizePreviewSubtree(element);
        rawReplacement(element, 'block');
        return;
    }

    sanitizeElementAttributes(element);
    const component = element.getAttribute('editor_component');
    const nativeImageComponent = tagName === 'img' && component === 'image_link';
    const oembedComponent = tagName === 'div' && component === 'oembed';
    const embed = tagName === 'div' && element.hasAttribute('data-oembed-url');
    const known = KNOWN_TAGS.has(tagName) && structurallyEditable(element);

    if ((component && !nativeImageComponent) || embed || !known) {
        // oEmbed markup has already passed through the module's provider/card
        // renderer and must survive editor round trips byte-for-byte enough to
        // retain iframe attributes and the classes used by provider SDKs.
        // Raw node views never mount this subtree, so preserving it does not
        // execute pasted markup inside the editing surface.
        if (!oembedComponent) {
            sanitizeRawSubtree(element);
        } else {
            for (const block of element.querySelectorAll('p,h1,h2,h3,h4,h5,h6')) {
                trimBlockBoundaryWhitespace(block);
            }
        }
        const kind = component
            ? (BLOCK_TAGS.has(tagName) ? 'component-block' : 'component-inline')
            : (embed ? 'embed' : (BLOCK_TAGS.has(tagName) ? 'block' : 'inline'));
        rawReplacement(element, kind);
        return;
    }

    for (const child of Array.from(element.children)) visitElement(child);
}

function isBlockNode(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    const element = node;
    if (['AUDIO', 'VIDEO'].includes(element.tagName) && !element.hasAttribute('data-roundeditor-kind')) return false;
    if (element.getAttribute('data-roundeditor-kind') === 'block') return true;
    if (element.getAttribute('data-roundeditor-kind') === 'component-block') return true;
    if (element.getAttribute('data-roundeditor-kind') === 'embed') return true;
    return BLOCK_TAGS.has(element.tagName.toLowerCase());
}

function splitParagraphAtBlocks(paragraph) {
    if (!Array.from(paragraph.childNodes).some(isBlockNode)) return;
    const parent = paragraph.parentNode;
    let replacementParagraph = null;

    for (const child of Array.from(paragraph.childNodes)) {
        if (isBlockNode(child)) {
            replacementParagraph = null;
            parent.insertBefore(child, paragraph);
            continue;
        }
        if (!replacementParagraph) {
            replacementParagraph = paragraph.cloneNode(false);
            parent.insertBefore(replacementParagraph, paragraph);
        }
        replacementParagraph.appendChild(child);
    }
    paragraph.remove();
}

function removeEmptyParagraphFiller(paragraph) {
    if (paragraph.children.length || !/^[\s\u00a0]*$/u.test(paragraph.textContent)) return;
    paragraph.replaceChildren();
}

function removeTableFormattingWhitespace(root) {
    for (const container of root.querySelectorAll('table,tbody,tr,td,th')) {
        for (const child of Array.from(container.childNodes)) {
            if (child.nodeType === Node.TEXT_NODE && !child.nodeValue.trim()) child.remove();
        }
    }
}

function extractTableCaptions(root) {
    for (const table of root.querySelectorAll('table')) {
        const caption = Array.from(table.children).find(child => child.tagName === 'CAPTION');
        if (!caption) continue;
        table.setAttribute('data-roundeditor-table-caption', caption.textContent || '');
        caption.remove();
    }
}

function trimBlockBoundaryWhitespace(element) {
    const textNodes = [];
    const walker = document.createTreeWalker(element, 4);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) textNodes.push(node);
    if (!textNodes.length) return;
    textNodes[0].nodeValue = textNodes[0].nodeValue.replace(/^[\s\u00a0]+/u, '');
    const last = textNodes.at(-1);
    last.nodeValue = last.nodeValue.replace(/[\s\u00a0]+$/u, '');
}

function wrapInlineRuns(container, createEmpty = false) {
    let paragraph = null;
    let foundContent = false;
    for (const child of Array.from(container.childNodes)) {
        if (isBlockNode(child)) {
            paragraph = null;
            continue;
        }
        if (!paragraph) {
            paragraph = document.createElement('p');
            paragraph.setAttribute('data-roundeditor-unwrap', '');
            container.insertBefore(paragraph, child);
        }
        paragraph.appendChild(child);
        if (child.nodeType !== Node.TEXT_NODE || child.nodeValue) foundContent = true;
    }
    if (createEmpty && !foundContent && !container.querySelector(':scope > p')) {
        paragraph = document.createElement('p');
        paragraph.setAttribute('data-roundeditor-unwrap', '');
        container.insertBefore(paragraph, container.firstChild);
    }
}

export function normalizeForParse(html) {
    const template = document.createElement('template');
    template.innerHTML = String(html || '');

    for (const element of Array.from(template.content.children)) visitElement(element);
    extractTableCaptions(template.content);
    removeTableFormattingWhitespace(template.content);
    for (const paragraph of Array.from(template.content.querySelectorAll('p'))) splitParagraphAtBlocks(paragraph);
    for (const container of Array.from(template.content.querySelectorAll('li,td,th,blockquote'))) {
        wrapInlineRuns(container, true);
    }
    wrapInlineRuns(template.content, false);
    for (const block of Array.from(template.content.querySelectorAll('p,h1,h2,h3,h4,h5,h6'))) {
        trimBlockBoundaryWhitespace(block);
    }
    for (const paragraph of Array.from(template.content.querySelectorAll('p'))) removeEmptyParagraphFiller(paragraph);

    if (!template.content.childNodes.length) template.innerHTML = '<p></p>';
    return template.innerHTML;
}
