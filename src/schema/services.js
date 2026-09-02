import { DOMParser as ProseMirrorDOMParser, Schema } from 'prosemirror-model';
import { marks as coreMarks } from './marks.js';
import { nodes as coreNodes } from './nodes.js';
import { normalizeForParse } from './normalize.js';
import { serializeDocument } from './serialize.js';
import { promoteDocumentTextStyles, promoteSliceTextStyles } from './textStyles.js';

const FORBIDDEN_NAMES = new Set(['doc', 'text']);

export function createSchemaServices(contributions = []) {
    const nodes = { ...coreNodes };
    const marks = { ...coreMarks };
    const owners = new Map();
    const activeExtensions = new Set(contributions.map(contribution => contribution.extensionId));
    const extensionSelectors = [];

    for (const contribution of contributions) {
        const extensionId = contribution.extensionId;
        for (const [name, definition] of Object.entries(contribution.schema?.nodes || {})) {
            if (FORBIDDEN_NAMES.has(name) || Object.hasOwn(nodes, name)) {
                throw contributionError(extensionId, name);
            }
            validateNodeContribution(extensionId, name, definition);
            nodes[name] = secureSpec(extensionId, name, definition.fallback, definition.spec);
            owners.set(`node:${name}`, Object.freeze({ extensionId, fallback: definition.fallback }));
            collectParseSelectors(definition.spec, extensionSelectors);
        }
        for (const [name, definition] of Object.entries(contribution.schema?.marks || {})) {
            if (FORBIDDEN_NAMES.has(name) || Object.hasOwn(marks, name)) {
                throw contributionError(extensionId, name);
            }
            validateMarkContribution(extensionId, name, definition);
            marks[name] = secureSpec(extensionId, name, definition.fallback, definition.spec);
            owners.set(`mark:${name}`, Object.freeze({ extensionId, fallback: definition.fallback }));
            collectParseSelectors(definition.spec, extensionSelectors);
        }
    }

    const schema = new Schema({ nodes, marks });
    const normalize = html => normalizeForParse(html, {
        activeExtensions,
        isExtensionElement: element => extensionSelectors.some(selector => {
            try { return element.matches(selector); }
            catch (error) { return false; }
        }),
    });
    const parseDocument = html => {
        const template = document.createElement('template');
        template.innerHTML = normalize(html);
        const doc = ProseMirrorDOMParser.fromSchema(schema).parse(template.content, { preserveWhitespace: 'full' });
        return promoteDocumentTextStyles(doc, schema);
    };
    const parseSlice = html => {
        const template = document.createElement('template');
        template.innerHTML = normalize(html);
        const slice = ProseMirrorDOMParser.fromSchema(schema).parseSlice(template.content, { preserveWhitespace: 'full' });
        return promoteSliceTextStyles(slice, schema);
    };
    return Object.freeze({
        schema,
        parseDocument,
        parseSlice,
        normalizeForParse: normalize,
        serializeDocument: value => serializeDocument(value, schema),
        contributions: owners,
    });
}

function collectParseSelectors(spec, target) {
    for (const rule of spec?.parseDOM || []) {
        if (typeof rule?.tag === 'string' && rule.tag.trim()) target.push(rule.tag.trim());
    }
}

function contributionError(extensionId, name) {
    return Object.assign(new Error(`Schema name "${name}" conflicts with an existing node or mark.`), {
        code: 'E_EXTENSION_CONFLICT', extensionId, details: { name },
    });
}

function validateNodeContribution(extensionId, name, definition) {
    if (!definition || !['raw-block', 'raw-inline', 'drop'].includes(definition.fallback) || !definition.spec) {
        throw Object.assign(new Error(`Invalid node contribution "${name}".`), {
            code: 'E_EXTENSION_INVALID', extensionId, details: { name },
        });
    }
}

function validateMarkContribution(extensionId, name, definition) {
    if (!definition || !['preserve-content', 'drop-mark'].includes(definition.fallback) || !definition.spec) {
        throw Object.assign(new Error(`Invalid mark contribution "${name}".`), {
            code: 'E_EXTENSION_INVALID', extensionId, details: { name },
        });
    }
}

function secureSpec(extensionId, name, fallback, spec) {
    if (typeof spec.toDOM !== 'function') return spec;
    return {
        ...spec,
        toDOM(value) {
            const output = spec.toDOM(value);
            validateDOMOutput(output, extensionId, name);
            return addFallbackMetadata(output, extensionId, fallback);
        },
    };
}

function addFallbackMetadata(output, extensionId, fallback) {
    if (output?.nodeType === 1) {
        output.setAttribute('data-roundeditor-extension', extensionId);
        output.setAttribute('data-roundeditor-fallback', fallback);
        return output;
    }
    if (output?.dom?.nodeType === 1) {
        output.dom.setAttribute('data-roundeditor-extension', extensionId);
        output.dom.setAttribute('data-roundeditor-fallback', fallback);
        return output;
    }
    if (!Array.isArray(output)) return output;
    const tag = output[0];
    const hasAttrs = output[1] && typeof output[1] === 'object' && !Array.isArray(output[1]);
    const attrs = {
        ...(hasAttrs ? output[1] : {}),
        'data-roundeditor-extension': extensionId,
        'data-roundeditor-fallback': fallback,
    };
    return hasAttrs ? [tag, attrs, ...output.slice(2)] : [tag, attrs, ...output.slice(1)];
}

function validateDOMOutput(output, extensionId, name) {
    if (!Array.isArray(output)) return;
    const tag = String(output[0] || '').toLowerCase();
    if (tag === 'script') throw unsafeDOMError(extensionId, name);
    const attrs = output[1] && typeof output[1] === 'object' && !Array.isArray(output[1]) ? output[1] : null;
    if (attrs && Object.keys(attrs).some(attribute => /^on/i.test(attribute))) throw unsafeDOMError(extensionId, name);
    output.slice(attrs ? 2 : 1).forEach(child => validateDOMOutput(child, extensionId, name));
}

function unsafeDOMError(extensionId, name) {
    return Object.assign(new Error(`Unsafe DOM output from schema contribution "${name}".`), {
        code: 'E_EXTENSION_RUNTIME', extensionId, details: { name },
    });
}
