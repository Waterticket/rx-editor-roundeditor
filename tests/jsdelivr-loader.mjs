import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const loaderSource = readFileSync(new URL('../js/jsdelivr-loader.js', import.meta.url), 'utf8');
const iconSource = readFileSync(new URL('../assets/attachment-icons.svg', import.meta.url), 'utf8');

async function runLoader(version, cdnSucceeds = true, barrier = null) {
    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
        runScripts: 'outside-only',
        url: 'https://example.com/',
    });
    dom.window.fetch = async url => {
        if (!cdnSucceeds && String(url).includes('cdn.jsdelivr.net')) throw new Error('blocked');
        return { ok: true, text: async () => iconSource };
    };
    if (barrier) dom.window.RoundEditor = { _extensionHost: { prepareFromDocument: () => barrier } };
    const loader = dom.window.document.createElement('script');
    loader.id = 'RoundEditorLoader';
    loader.dataset.version = version;
    loader.src = 'https://example.com/modules/editor/skins/roundeditor/js/jsdelivr-loader.js';
    dom.window.document.body.appendChild(loader);
    Object.defineProperty(dom.window.document, 'currentScript', {
        configurable: true,
        value: loader,
    });
    dom.window.eval(loaderSource);
    await new Promise(resolve => dom.window.setTimeout(resolve, 0));
    return dom;
}

{
    let release;
    const barrier = new Promise(resolve => { release = resolve; });
    const dom = await runLoader('1.0.0', true, barrier);
    assert.equal(dom.window.document.getElementById('RoundEditorModule'), null);
    release();
    await Promise.resolve(); await new Promise(resolve => dom.window.setTimeout(resolve, 0));
    assert.match(dom.window.document.getElementById('RoundEditorModule').src, /cdn\.jsdelivr\.net/);
}

{
    const dom = await runLoader('1.0.0');
    const { document, Event } = dom.window;
    const css = document.getElementById('RoundEditorStylesheet');
    const js = document.getElementById('RoundEditorModule');

    assert.equal(css.href, 'https://cdn.jsdelivr.net/gh/Waterticket/rx-editor-roundeditor@1.0.0/dist/roundeditor.css');
    assert.equal(js.src, 'https://cdn.jsdelivr.net/gh/Waterticket/rx-editor-roundeditor@1.0.0/dist/roundeditor.min.js');
    assert.equal(js.type, 'module');
    assert.equal(
        dom.window.RoundEditorAttachmentIconsUrl,
        'https://cdn.jsdelivr.net/gh/Waterticket/rx-editor-roundeditor@1.0.0/assets/attachment-icons.svg',
    );
    assert.equal(dom.window.RoundEditorAttachmentIconPrefix, '#RoundEditorAttachmentIcon-');
    assert.equal(document.querySelectorAll('#RoundEditorAttachmentIconSprite symbol').length, 6);
    assert.equal(
        document.getElementById('RoundEditorAttachmentIconSprite').dataset.source,
        'https://cdn.jsdelivr.net/gh/Waterticket/rx-editor-roundeditor@1.0.0/assets/attachment-icons.svg',
    );
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '/modules/editor/skins/roundeditor/assets/attachment-icons.svg#upload');
    svg.appendChild(use);
    document.body.appendChild(svg);
    await new Promise(resolve => dom.window.queueMicrotask(resolve));
    assert.equal(
        use.getAttribute('href'),
        '#RoundEditorAttachmentIcon-upload',
    );

    css.dispatchEvent(new Event('error'));
    js.dispatchEvent(new Event('error'));

    assert.equal(css.href, 'https://example.com/modules/editor/skins/roundeditor/dist/roundeditor.css');
    assert.equal(css.dataset.fallback, 'local');
    const fallbackJs = document.getElementById('RoundEditorModule');
    assert.equal(fallbackJs.src, 'https://example.com/modules/editor/skins/roundeditor/dist/roundeditor.min.js');
    assert.equal(fallbackJs.dataset.fallback, 'local');
}

{
    const dom = await runLoader('1.0.0', false);
    assert.equal(
        dom.window.RoundEditorAttachmentIconsUrl,
        'https://example.com/modules/editor/skins/roundeditor/assets/attachment-icons.svg',
    );
}

{
    const dom = await runLoader('../unsafe');
    const { document } = dom.window;
    assert.equal(
        document.getElementById('RoundEditorStylesheet').href,
        'https://example.com/modules/editor/skins/roundeditor/dist/roundeditor.css',
    );
    assert.equal(
        document.getElementById('RoundEditorModule').src,
        'https://example.com/modules/editor/skins/roundeditor/dist/roundeditor.min.js',
    );
}

console.log('RoundEditor jsDelivr loader tests passed.');
