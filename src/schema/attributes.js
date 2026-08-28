export const ALLOWED_TAGS = new Set(`
    a abbr acronym address article aside audio b basefont bdo big blockquote br caption center cite
    code col colgroup dd del details dfn dir div dl dt em embed figcaption figure font footer h1 h2
    h3 h4 h5 h6 header hr i iframe img ins kbd li main mark menu nav object ol p param pre q s samp
    section small source span strike strong sub summary sup table tbody td tfoot th thead time tr
    track tt u ul var video wbr
`.trim().split(/\s+/));

export const DATA_ATTRIBUTE_TAGS = new Set(`
    h1 h2 h3 h4 h5 h6 div p a span img b i strong em u s sub sup header footer nav main section
    article aside details summary ul ol li mark wbr figure figcaption caption table thead tbody tr th
    td ins del iframe video audio source track blockquote code
`.trim().split(/\s+/));

export const BLOCK_TAGS = new Set(`
    address article aside audio blockquote caption center col colgroup dd del details dir div dl dt
    embed figure footer h1 h2 h3 h4 h5 h6 header hr iframe ins li main menu nav object ol p pre section
    summary table tbody td tfoot th thead tr ul video
`.trim().split(/\s+/));

export const VOID_TAGS = new Set('basefont br col embed hr img param source track wbr'.split(' '));

export const RESERVED_ATTRIBUTE_PREFIX = 'data-rxeditor-';
const ATTRIBUTE_ORDER_KEY = '__rxeditorAttributeOrder';

const COMMON_ATTRIBUTES = [
    'id', 'title', 'contenteditable', 'style', 'dir', 'xml:lang', 'lang',
];
const SPECIFIC_ATTRIBUTES = {
    a: ['href', 'rel', 'rev', 'name', 'target', 'rx_encoded_datas'],
    audio: ['src', 'type', 'preload', 'controls', 'muted', 'autoplay', 'playsinline', 'loop', 'data-file-srl', 'rx_encoded_datas'],
    b: ['rx_encoded_datas'],
    basefont: ['color', 'face', 'size', 'id'],
    bdo: ['dir'],
    blockquote: ['cite', 'rx_encoded_datas'],
    br: ['id', 'title', 'contenteditable', 'style', 'clear'],
    caption: ['align', 'rx_encoded_datas'],
    code: ['rx_encoded_datas'],
    col: ['span', 'width', 'align', 'charoff', 'valign'],
    colgroup: ['span', 'width', 'align', 'charoff', 'valign'],
    del: ['cite', 'datetime', 'rx_encoded_datas'],
    details: ['open', 'rx_encoded_datas'],
    dir: ['compact'],
    div: ['align', 'editor_component', 'rx_encoded_properties', 'rx_encoded_datas'],
    dl: ['compact'],
    em: ['rx_encoded_datas'],
    embed: ['type', 'width', 'height', 'allowscriptaccess', 'allownetworking', 'flashvars', 'wmode', 'name', 'src'],
    figcaption: ['rx_encoded_datas'],
    figure: ['rx_encoded_datas'],
    font: ['color', 'face', 'size'],
    h1: ['align', 'rx_encoded_datas'],
    h2: ['align', 'rx_encoded_datas'],
    h3: ['align', 'rx_encoded_datas'],
    h4: ['align', 'rx_encoded_datas'],
    h5: ['align', 'rx_encoded_datas'],
    h6: ['align', 'rx_encoded_datas'],
    hr: ['align', 'noshade', 'size', 'width'],
    i: ['aria-hidden', 'rx_encoded_datas'],
    iframe: ['src', 'width', 'height', 'name', 'scrolling', 'frameborder', 'longdesc', 'marginheight', 'marginwidth', 'allow', 'allowfullscreen', 'loading', 'referrerpolicy', 'sandbox', 'rx_encoded_datas'],
    img: ['height', 'width', 'longdesc', 'alt', 'src', 'name', 'align', 'border', 'hspace', 'vspace', 'srcset', 'data-file-srl', 'editor_component', 'rx_encoded_properties', 'rx_encoded_datas'],
    ins: ['cite', 'datetime', 'rx_encoded_datas'],
    li: ['value', 'type', 'rx_encoded_datas'],
    mark: ['rx_encoded_datas'],
    menu: ['compact'],
    object: ['type', 'width', 'height', 'data', 'codebase'],
    ol: ['compact', 'start', 'type', 'rx_encoded_datas'],
    p: ['align', 'rx_encoded_datas'],
    param: ['id', 'value', 'name'],
    pre: ['width'],
    q: ['cite'],
    s: ['rx_encoded_datas'],
    source: ['src', 'media', 'type', 'rx_encoded_datas'],
    span: ['rx_encoded_datas'],
    strong: ['rx_encoded_datas'],
    sub: ['rx_encoded_datas'],
    sup: ['rx_encoded_datas'],
    table: ['border', 'cellpadding', 'cellspacing', 'frame', 'rules', 'summary', 'width', 'align', 'bgcolor', 'rx_encoded_datas'],
    tbody: ['align', 'charoff', 'valign', 'rx_encoded_datas'],
    td: ['abbr', 'colspan', 'rowspan', 'scope', 'align', 'charoff', 'valign', 'bgcolor', 'height', 'nowrap', 'width', 'rx_encoded_datas'],
    tfoot: ['align', 'charoff', 'valign'],
    th: ['abbr', 'colspan', 'rowspan', 'scope', 'align', 'charoff', 'valign', 'bgcolor', 'height', 'nowrap', 'width', 'rx_encoded_datas'],
    thead: ['align', 'charoff', 'valign', 'rx_encoded_datas'],
    time: ['datetime', 'pubdate'],
    tr: ['align', 'charoff', 'valign', 'bgcolor', 'rx_encoded_datas'],
    track: ['src', 'srclang', 'label', 'kind', 'default', 'rx_encoded_datas'],
    u: ['rx_encoded_datas'],
    ul: ['compact', 'type', 'rx_encoded_datas'],
    video: ['src', 'type', 'width', 'height', 'poster', 'preload', 'controls', 'muted', 'autoplay', 'playsinline', 'loop', 'data-file-srl', 'rx_encoded_datas'],
    wbr: ['id', 'title', 'contenteditable', 'style', 'rx_encoded_datas'],
};

const CSS_PROPERTIES = new Set(`
    -khtml-opacity -moz-opacity align-content align-items align-self aspect-ratio background
    background-attachment background-color background-image background-position background-repeat
    background-size border border-bottom border-bottom-color border-bottom-left-radius
    border-bottom-right-radius border-bottom-style border-bottom-width border-collapse border-color
    border-left border-left-color border-left-style border-left-width border-radius border-right
    border-right-color border-right-style border-right-width border-spacing border-style border-top
    border-top-color border-top-left-radius border-top-right-radius border-top-style border-top-width
    border-width box-shadow box-sizing caption-side clear color display empty-cells filter flex flex-basis
    flex-direction flex-flow flex-grow flex-shrink flex-wrap float font font-family font-size font-style
    font-variant font-weight hanging-punctuation height justify-content letter-spacing line-height
    list-style list-style-image list-style-position list-style-type margin margin-bottom margin-left
    margin-right margin-top max-height max-width min-height min-width object-fit order outline
    outline-color outline-offset outline-style outline-width overflow overflow-x overflow-y padding
    padding-bottom padding-left padding-right padding-top page-break-after page-break-before
    page-break-inside resize scrollbar-arrow-color scrollbar-base-color scrollbar-darkshadow-color
    scrollbar-face-color scrollbar-highlight-color scrollbar-shadow-color table-layout text-align
    text-decoration text-decoration-color text-decoration-line text-decoration-style
    text-decoration-thickness text-indent text-overflow text-shadow text-transform vertical-align
    white-space width word-break word-spacing word-wrap
`.trim().split(/\s+/));

const DANGEROUS_URI = /^\s*(?:javascript|vbscript|data:text\/html)/i;
const URI_ATTRIBUTES = new Set(['cite', 'codebase', 'data', 'href', 'longdesc', 'poster', 'src']);

function parseStyleDeclarations(style) {
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
        } else {
            current += character;
        }
    }
    if (current) declarations.push(current);

    return declarations.map(declaration => {
        const separator = declaration.indexOf(':');
        if (separator < 1) return null;
        return [
            declaration.slice(0, separator).trim().toLowerCase(),
            declaration.slice(separator + 1).trim(),
        ];
    }).filter(Boolean);
}

function allowedAttributeNames(tagName) {
    if (tagName === 'basefont' || tagName === 'param') return new Set(SPECIFIC_ATTRIBUTES[tagName]);
    if (tagName === 'br' || tagName === 'wbr') return new Set(SPECIFIC_ATTRIBUTES[tagName]);
    return new Set([...COMMON_ATTRIBUTES, ...(SPECIFIC_ATTRIBUTES[tagName] || [])]);
}

function sanitizeStyle(element) {
    const style = parseStyleDeclarations(element.getAttribute('style')).map(([property, value]) => {
        if (!CSS_PROPERTIES.has(property) || !value || /(?:expression\s*\(|javascript\s*:|behavior\s*:)/i.test(value)) return '';
        return `${property}:${value}`;
    }).filter(Boolean).join(';');
    if (style) element.setAttribute('style', `${style};`);
    else element.removeAttribute('style');
}

export function sanitizeElementAttributes(element) {
    const tagName = element.tagName.toLowerCase();
    const allowed = allowedAttributeNames(tagName);
    const component = (tagName === 'div' || tagName === 'img') && element.hasAttribute('editor_component');

    for (const attribute of Array.from(element.attributes)) {
        const name = attribute.name.toLowerCase();
        const value = attribute.value;
        const dataAttribute = name.startsWith('data-') && DATA_ATTRIBUTE_TAGS.has(tagName);
        const componentAttribute = component && !name.startsWith('on');

        if (name === 'class' || name.startsWith(RESERVED_ATTRIBUTE_PREFIX) || name.startsWith('on')) {
            element.removeAttribute(attribute.name);
            continue;
        }
        if (!allowed.has(name) && !dataAttribute && !componentAttribute) {
            element.removeAttribute(attribute.name);
            continue;
        }
        if (name === 'style') {
            sanitizeStyle(element);
            continue;
        }
        if (name === 'contenteditable' && value.toLowerCase() !== 'false') {
            element.removeAttribute(attribute.name);
            continue;
        }
        if ((URI_ATTRIBUTES.has(name) || dataAttribute) && DANGEROUS_URI.test(value.replace(/\s+/g, ''))) {
            element.removeAttribute(attribute.name);
            continue;
        }
        if (name === 'target' && !['_blank', '_self'].includes(value.toLowerCase())) {
            element.removeAttribute(attribute.name);
            continue;
        }
        if (name === 'id' && value && !value.startsWith('user_content_')) {
            element.setAttribute(attribute.name, `user_content_${value}`);
        }
    }
}

export function collectExtraAttributes(element, excluded = []) {
    const ignored = new Set([...excluded, 'class']);
    const attributeOrder = Array.from(element.attributes)
        .map(attribute => attribute.name)
        .filter(name => name !== 'class' && !name.startsWith(RESERVED_ATTRIBUTE_PREFIX));
    const extra = attributeOrder.length ? { [ATTRIBUTE_ORDER_KEY]: attributeOrder } : {};
    for (const attribute of Array.from(element.attributes)) {
        if (!ignored.has(attribute.name) && !attribute.name.startsWith(RESERVED_ATTRIBUTE_PREFIX)) {
            extra[attribute.name] = attribute.value;
        }
    }
    return Object.keys(extra).length ? extra : null;
}

export function domAttributes(extra, explicit = {}) {
    const source = { ...(extra || {}) };
    const attributeOrder = Array.isArray(source[ATTRIBUTE_ORDER_KEY]) ? source[ATTRIBUTE_ORDER_KEY] : [];
    delete source[ATTRIBUTE_ORDER_KEY];

    const values = { ...source };
    for (const [name, value] of Object.entries(explicit)) {
        if (value === null || value === undefined || value === false) delete values[name];
        else values[name] = value === true ? '' : String(value);
    }
    const attributes = {};
    for (const name of attributeOrder) {
        if (Object.hasOwn(values, name)) attributes[name] = values[name];
    }
    for (const [name, value] of Object.entries(values)) {
        if (!Object.hasOwn(attributes, name)) attributes[name] = value;
    }
    if (attributes.style) attributes['data-rxeditor-style'] = encodeURIComponent(attributes.style);
    return attributes;
}

export function mergeStyle(extra, declarations) {
    const attributes = { ...(extra || {}) };
    const attributeOrder = attributes[ATTRIBUTE_ORDER_KEY];
    delete attributes[ATTRIBUTE_ORDER_KEY];
    const styles = new Map(parseStyleDeclarations(attributes.style));
    for (const [property, value] of Object.entries(declarations)) {
        if (value === null || value === undefined || value === '') styles.delete(property);
        else styles.set(property, String(value));
    }
    if (styles.size) {
        attributes.style = `${Array.from(styles, ([property, value]) => `${property}:${value}`).join(';')};`;
    }
    else delete attributes.style;
    if (attributeOrder) attributes[ATTRIBUTE_ORDER_KEY] = attributeOrder;
    return domAttributes(attributes);
}
