export const RAW_ATTRIBUTE = 'data-roundeditor-raw';
export const RAW_BLOCK_SELECTOR = `div[${RAW_ATTRIBUTE}][data-roundeditor-kind="block"]`;
export const RAW_INLINE_SELECTOR = `span[${RAW_ATTRIBUTE}][data-roundeditor-kind="inline"]`;
export const COMPONENT_BLOCK_SELECTOR = `div[${RAW_ATTRIBUTE}][data-roundeditor-kind="component-block"]`;
export const COMPONENT_INLINE_SELECTOR = `span[${RAW_ATTRIBUTE}][data-roundeditor-kind="component-inline"]`;
export const EMBED_SELECTOR = `div[${RAW_ATTRIBUTE}][data-roundeditor-kind="embed"]`;

export function encodeRawHtml(html) {
    return encodeURIComponent(String(html || ''));
}

export function decodeRawHtml(encoded) {
    try {
        return decodeURIComponent(String(encoded || ''));
    } catch (error) {
        return '';
    }
}

export function rawDomSpec(tagName, kind, html) {
    return [tagName, {
        [RAW_ATTRIBUTE]: encodeRawHtml(html),
        'data-roundeditor-kind': kind,
    }];
}

export function rawAttrsFromDom(element) {
    return { html: decodeRawHtml(element.getAttribute(RAW_ATTRIBUTE)) };
}
