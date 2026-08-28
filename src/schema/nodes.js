import { tableNodes } from 'prosemirror-tables';
import { collectExtraAttributes, domAttributes, mergeStyle } from './attributes.js';
import {
    COMPONENT_BLOCK_SELECTOR,
    COMPONENT_INLINE_SELECTOR,
    EMBED_SELECTOR,
    RAW_BLOCK_SELECTOR,
    RAW_INLINE_SELECTOR,
    rawAttrsFromDom,
    rawDomSpec,
} from './raw.js';

function extraAttrs(element, excluded = []) {
    return collectExtraAttributes(element, excluded);
}

function parseParagraphAttrs(element) {
    return {
        align: element.style.getPropertyValue('text-align') || null,
        lineHeight: element.style.getPropertyValue('line-height') || null,
        indent: element.style.getPropertyValue('margin-left') || null,
        unwrap: element.hasAttribute('data-roundeditor-unwrap'),
        extra: extraAttrs(element),
    };
}

function paragraphDom(node, tagName = 'p') {
    const attributes = mergeStyle(node.attrs.extra, {
        'text-align': node.attrs.align,
        'line-height': node.attrs.lineHeight,
        'margin-left': node.attrs.indent,
    });
    if (node.attrs.unwrap) attributes['data-roundeditor-unwrap'] = '';
    return [tagName, attributes, 0];
}

function mediaBooleanAttrs(node, names) {
    return Object.fromEntries(names.map(name => [name, node.attrs[name]]));
}

const tableSpecs = tableNodes({
    tableGroup: 'block',
    cellContent: 'block+',
    cellAttributes: {
        extra: {
            default: null,
            getFromDOM: element => extraAttrs(element, ['colspan', 'rowspan', 'data-colwidth']),
            setDOMAttr: (value, attributes) => Object.assign(attributes, domAttributes(value)),
        },
    },
});

export const nodes = {
    doc: {
        content: 'block+',
        attrs: { extra: { default: null } },
    },
    paragraph: {
        content: 'inline*',
        group: 'block',
        attrs: {
            align: { default: null },
            lineHeight: { default: null },
            indent: { default: null },
            unwrap: { default: false },
            extra: { default: null },
        },
        parseDOM: [{ tag: 'p', getAttrs: parseParagraphAttrs }],
        toDOM: node => paragraphDom(node),
    },
    heading: {
        content: 'inline*',
        group: 'block',
        defining: true,
        attrs: {
            level: { default: 2 },
            align: { default: null },
            lineHeight: { default: null },
            indent: { default: null },
            extra: { default: null },
        },
        parseDOM: [1, 2, 3, 4, 5, 6].map(level => ({
            tag: `h${level}`,
            getAttrs: element => ({
                level,
                align: element.style.getPropertyValue('text-align') || null,
                lineHeight: element.style.getPropertyValue('line-height') || null,
                indent: element.style.getPropertyValue('margin-left') || null,
                extra: extraAttrs(element),
            }),
        })),
        toDOM: node => [
            `h${node.attrs.level}`,
            mergeStyle(node.attrs.extra, {
                'text-align': node.attrs.align,
                'line-height': node.attrs.lineHeight,
                'margin-left': node.attrs.indent,
            }),
            0,
        ],
    },
    blockquote: {
        content: 'block+',
        group: 'block',
        defining: true,
        attrs: { extra: { default: null } },
        parseDOM: [{ tag: 'blockquote', getAttrs: element => ({ extra: extraAttrs(element) }) }],
        toDOM: node => ['blockquote', domAttributes(node.attrs.extra), 0],
    },
    codeBlock: {
        content: 'text*',
        marks: '',
        group: 'block',
        code: true,
        defining: true,
        attrs: {
            extra: { default: null },
            codeExtra: { default: null },
        },
        parseDOM: [{
            tag: 'pre',
            preserveWhitespace: 'full',
            getAttrs: element => ({
                extra: extraAttrs(element),
                codeExtra: element.firstElementChild?.tagName === 'CODE' ? extraAttrs(element.firstElementChild) : null,
            }),
        }],
        toDOM: node => ['pre', domAttributes(node.attrs.extra), ['code', domAttributes(node.attrs.codeExtra), 0]],
    },
    horizontalRule: {
        group: 'block',
        atom: true,
        attrs: { extra: { default: null } },
        parseDOM: [{ tag: 'hr', getAttrs: element => ({ extra: extraAttrs(element) }) }],
        toDOM: node => ['hr', domAttributes(node.attrs.extra)],
    },
    orderedList: {
        content: 'listItem+',
        group: 'block',
        attrs: {
            order: { default: 1 },
            extra: { default: null },
        },
        parseDOM: [{
            tag: 'ol',
            getAttrs: element => ({
                order: Number(element.getAttribute('start') || 1),
                extra: extraAttrs(element, ['start']),
            }),
        }],
        toDOM: node => ['ol', domAttributes(node.attrs.extra, { start: node.attrs.order === 1 ? null : node.attrs.order }), 0],
    },
    bulletList: {
        content: 'listItem+',
        group: 'block',
        attrs: { extra: { default: null } },
        parseDOM: [{ tag: 'ul', getAttrs: element => ({ extra: extraAttrs(element) }) }],
        toDOM: node => ['ul', domAttributes(node.attrs.extra), 0],
    },
    listItem: {
        content: 'paragraph block*',
        defining: true,
        attrs: { extra: { default: null } },
        parseDOM: [{ tag: 'li', getAttrs: element => ({ extra: extraAttrs(element) }) }],
        toDOM: node => ['li', domAttributes(node.attrs.extra), 0],
    },
    sticker: {
        inline: true,
        group: 'inline',
        atom: true,
        draggable: true,
        selectable: true,
        attrs: {
            stickerSrl: { default: null },
            fileSrl: { default: null },
            mediaType: { default: 'image' },
            src: { default: '' },
            title: { default: '' },
            width: { default: null },
            height: { default: null },
            extra: { default: null },
        },
        parseDOM: [{
            tag: 'img[data-rx-sticker]',
            priority: 100,
            getAttrs: element => {
                const [stickerSrl, fileSrl] = String(element.getAttribute('data-rx-sticker') || '').split('|');
                return {
                    stickerSrl: stickerSrl || null,
                    fileSrl: fileSrl || null,
                    mediaType: element.getAttribute('data-rx-sticker-type') || 'image',
                    src: element.getAttribute('src') || '',
                    title: element.getAttribute('alt') || '',
                    width: element.getAttribute('width'),
                    height: element.getAttribute('height'),
                    extra: extraAttrs(element, ['data-rx-sticker', 'data-rx-sticker-type', 'src', 'alt', 'width', 'height']),
                };
            },
        }],
        toDOM: node => ['img', domAttributes(node.attrs.extra, {
            src: node.attrs.src,
            alt: node.attrs.title,
            width: node.attrs.width,
            height: node.attrs.height,
            'data-rx-sticker': `${node.attrs.stickerSrl}|${node.attrs.fileSrl}`,
            'data-rx-sticker-type': node.attrs.mediaType,
        })],
    },
    image: {
        inline: true,
        group: 'inline',
        atom: true,
        draggable: true,
        selectable: true,
        attrs: {
            src: { default: '' },
            alt: { default: '' },
            width: { default: null },
            height: { default: null },
            displayWidth: { default: null },
            displayHeight: { default: null },
            fileSrl: { default: null },
            editorComponent: { default: null },
            extra: { default: null },
        },
        parseDOM: [{
            tag: 'img:not([data-rx-sticker])',
            getAttrs: element => ({
                src: element.getAttribute('src') || '',
                alt: element.getAttribute('alt') || '',
                width: element.getAttribute('width'),
                height: element.getAttribute('height'),
                displayWidth: element.style.getPropertyValue('width') || null,
                displayHeight: element.style.getPropertyValue('height') || null,
                fileSrl: element.getAttribute('data-file-srl'),
                editorComponent: element.getAttribute('editor_component'),
                extra: extraAttrs(element, ['src', 'alt', 'width', 'height', 'data-file-srl', 'editor_component']),
            }),
        }],
        toDOM: node => ['img', mergeStyle(node.attrs.extra, {
            width: node.attrs.displayWidth,
            height: node.attrs.displayHeight,
        }, {
            src: node.attrs.src,
            alt: node.attrs.alt,
            width: node.attrs.width,
            height: node.attrs.height,
            'data-file-srl': node.attrs.fileSrl,
            editor_component: node.attrs.editorComponent,
        })],
    },
    video: {
        group: 'block',
        atom: true,
        draggable: true,
        selectable: true,
        attrs: {
            src: { default: '' },
            poster: { default: null },
            width: { default: null },
            height: { default: null },
            fileSrl: { default: null },
            controls: { default: false },
            muted: { default: false },
            autoplay: { default: false },
            loop: { default: false },
            playsinline: { default: false },
            extra: { default: null },
        },
        parseDOM: [{
            tag: 'video',
            getAttrs: element => ({
                src: element.getAttribute('src') || '',
                poster: element.getAttribute('poster'),
                width: element.getAttribute('width'),
                height: element.getAttribute('height'),
                fileSrl: element.getAttribute('data-file-srl'),
                controls: element.hasAttribute('controls'),
                muted: element.hasAttribute('muted'),
                autoplay: element.hasAttribute('autoplay'),
                loop: element.hasAttribute('loop'),
                playsinline: element.hasAttribute('playsinline'),
                extra: extraAttrs(element, [
                    'src', 'poster', 'width', 'height', 'data-file-srl',
                    'controls', 'muted', 'autoplay', 'loop', 'playsinline',
                ]),
            }),
        }],
        toDOM: node => ['video', domAttributes(node.attrs.extra, {
            src: node.attrs.src,
            poster: node.attrs.poster,
            width: node.attrs.width,
            height: node.attrs.height,
            'data-file-srl': node.attrs.fileSrl,
            ...mediaBooleanAttrs(node, ['controls', 'muted', 'autoplay', 'loop', 'playsinline']),
        })],
    },
    hardBreak: {
        inline: true,
        group: 'inline',
        selectable: false,
        attrs: { extra: { default: null } },
        parseDOM: [{ tag: 'br', getAttrs: element => ({ extra: extraAttrs(element) }) }],
        toDOM: node => ['br', domAttributes(node.attrs.extra)],
    },
    embed: {
        group: 'block',
        atom: true,
        selectable: true,
        attrs: { html: {}, extra: { default: null } },
        parseDOM: [{ tag: EMBED_SELECTOR, getAttrs: rawAttrsFromDom }],
        toDOM: node => rawDomSpec('div', 'embed', node.attrs.html),
    },
    rhymixComponentBlock: {
        group: 'block',
        atom: true,
        selectable: true,
        draggable: true,
        attrs: { html: {}, extra: { default: null } },
        parseDOM: [{ tag: COMPONENT_BLOCK_SELECTOR, getAttrs: rawAttrsFromDom }],
        toDOM: node => rawDomSpec('div', 'component-block', node.attrs.html),
    },
    rhymixComponentInline: {
        inline: true,
        group: 'inline',
        atom: true,
        selectable: true,
        draggable: true,
        attrs: { html: {}, extra: { default: null } },
        parseDOM: [{ tag: COMPONENT_INLINE_SELECTOR, getAttrs: rawAttrsFromDom }],
        toDOM: node => rawDomSpec('span', 'component-inline', node.attrs.html),
    },
    rawBlock: {
        group: 'block',
        atom: true,
        selectable: true,
        draggable: true,
        attrs: { html: {}, extra: { default: null } },
        parseDOM: [{ tag: RAW_BLOCK_SELECTOR, getAttrs: rawAttrsFromDom }],
        toDOM: node => rawDomSpec('div', 'block', node.attrs.html),
    },
    rawInline: {
        inline: true,
        group: 'inline',
        atom: true,
        selectable: true,
        draggable: true,
        attrs: { html: {}, extra: { default: null } },
        parseDOM: [{ tag: RAW_INLINE_SELECTOR, getAttrs: rawAttrsFromDom }],
        toDOM: node => rawDomSpec('span', 'inline', node.attrs.html),
    },
    table: {
        ...tableSpecs.table,
        content: 'tableRow+',
        attrs: { extra: { default: null } },
        parseDOM: [{ tag: 'table', getAttrs: element => ({ extra: extraAttrs(element) }) }],
        toDOM: node => ['table', domAttributes(node.attrs.extra), ['tbody', 0]],
    },
    tableRow: {
        ...tableSpecs.table_row,
        content: '(tableCell | tableHeader)*',
        attrs: { extra: { default: null } },
        parseDOM: [{ tag: 'tr', getAttrs: element => ({ extra: extraAttrs(element) }) }],
        toDOM: node => ['tr', domAttributes(node.attrs.extra), 0],
    },
    tableCell: tableSpecs.table_cell,
    tableHeader: tableSpecs.table_header,
    text: { group: 'inline' },
};
