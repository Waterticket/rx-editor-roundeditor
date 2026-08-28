import { collectExtraAttributes, domAttributes, mergeStyle } from './attributes.js';

function tagMark(names, outputTag) {
    return {
        attrs: {
            tag: { default: outputTag },
            extra: { default: null },
        },
        parseDOM: names.map(tag => ({
            tag,
            getAttrs: element => ({
                tag: element.tagName.toLowerCase(),
                extra: collectExtraAttributes(element),
            }),
        })),
        toDOM: mark => [mark.attrs.tag || outputTag, domAttributes(mark.attrs.extra), 0],
    };
}

function textStyleMark(property) {
    return {
        attrs: {
            value: {},
            extra: { default: null },
        },
        toDOM: mark => ['span', mergeStyle(mark.attrs.extra, { [property]: mark.attrs.value }), 0],
    };
}

export const marks = {
    link: {
        inclusive: false,
        attrs: {
            href: { default: '' },
            target: { default: null },
            rel: { default: null },
            extra: { default: null },
        },
        parseDOM: [{
            tag: 'a[href]',
            getAttrs: element => ({
                href: element.getAttribute('href') || '',
                target: element.getAttribute('target'),
                rel: element.getAttribute('rel'),
                extra: collectExtraAttributes(element, ['href', 'target', 'rel']),
            }),
        }],
        toDOM: mark => ['a', domAttributes(mark.attrs.extra, {
            href: mark.attrs.href,
            target: mark.attrs.target,
            rel: mark.attrs.rel,
        }), 0],
    },
    strong: tagMark(['strong', 'b'], 'strong'),
    em: tagMark(['em', 'i'], 'em'),
    underline: tagMark(['u'], 'u'),
    strike: tagMark(['s', 'strike'], 's'),
    code: tagMark(['code'], 'code'),
    sub: tagMark(['sub'], 'sub'),
    sup: tagMark(['sup'], 'sup'),
    fontSize: textStyleMark('font-size'),
    fontColor: textStyleMark('color'),
    bgColor: textStyleMark('background-color'),
    fontFamily: textStyleMark('font-family'),
    rawMark: {
        attrs: {
            tag: { default: 'span' },
            extra: { default: null },
        },
        parseDOM: [
            {
                tag: 'span:not([data-rxeditor-raw])',
                priority: 10,
                getAttrs: element => ({ tag: 'span', extra: collectExtraAttributes(element) }),
            },
            {
                tag: 'font',
                getAttrs: element => ({ tag: 'font', extra: collectExtraAttributes(element) }),
            },
        ],
        toDOM: mark => [mark.attrs.tag, domAttributes(mark.attrs.extra), 0],
    },
};
