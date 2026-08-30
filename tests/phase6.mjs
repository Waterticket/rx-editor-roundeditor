import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const config = {
    editorSequence: 16,
    primaryKeyName: 'document_srl',
    contentKeyName: 'content',
    height: 300,
    contentFont: 'inherit',
    contentFontSize: '15px',
    contentLineHeight: '1.5',
    contentWordBreak: 'normal',
    contentParagraphSpacing: '0',
    allowUpload: false,
    htmlMode: true,
    enableAutosave: true,
    autosavedMessage: 'Autosaved.',
    enableComponent: true,
    components: { poll_maker: 'Poll', image_gallery: 'Gallery' },
    labels: {
        source: 'Edit HTML source', fullscreen: 'Fullscreen', characterCount: 'Characters',
        componentPollTitle: 'Poll title', componentPollLoading: 'Loading…',
        componentPollUnavailable: 'Unavailable',
    },
};
const dom = new JSDOM(`<!doctype html><html><body>
    <form>
        <input name="title" value="Original title">
        <input name="document_srl" value="">
        <textarea name="content">&lt;p&gt;Original&lt;/p&gt;</textarea>
        <div class="roundeditor roundeditor--light" data-editor-sequence="16"
            data-editor-config='${JSON.stringify(config)}'>
            <div class="roundeditor__loading">Loading</div>
            <div class="roundeditor__surface"></div>
        </div>
        <p id="editor_autosaved_message_16">&nbsp;</p>
        <input type="hidden" name="_saved_doc_title" value="Recovered title">
        <input type="hidden" name="_saved_doc_content" value="&lt;p&gt;Recovered&lt;/p&gt;">
        <input type="hidden" name="_saved_doc_message" value="Restore?">
    </form>
</body></html>`, { url: 'https://example.test/' });

Object.defineProperties(globalThis, {
    window: { value: dom.window, configurable: true },
    document: { value: dom.window.document, configurable: true },
    navigator: { value: dom.window.navigator, configurable: true },
    Node: { value: dom.window.Node, configurable: true },
    Element: { value: dom.window.Element, configurable: true },
    MutationObserver: { value: dom.window.MutationObserver, configurable: true },
    getComputedStyle: { value: dom.window.getComputedStyle, configurable: true },
    innerHeight: { value: 800, configurable: true },
    pageYOffset: { value: 0, configurable: true },
});

const calls = { confirm: [], load: [], autosave: [], component: [] };
window.confirm = message => {
    calls.confirm.push(message);
    return true;
};
window.current_mid = 'notice';
window.exec_json = (action, params, callback) => {
    if (action === 'poll.getPollinfo') {
        calls.load.push({ action, params });
        callback({
            poll: {
                poll: {
                    11: { title: 'Preferred editor?' },
                    12: { title: 'Why did you choose it?' },
                },
            },
        });
        return;
    }
    calls.load.push({ action, params });
    callback({ document_srl: 991 });
};
window.reloadUploader = sequence => { calls.reload = sequence; };
window.editorEnableAutoSave = (form, sequence) => calls.autosave.push({ form, sequence });
window.openComponent = (name, sequence) => calls.component.push({ name, sequence });

await import('../dist/roundeditor.js');

const wrapper = document.querySelector('.roundeditor');
const form = document.querySelector('form');
const compat = window._getCkeInstance(16);
assert.equal(calls.confirm[0], 'Restore?');
assert.equal(form.elements.namedItem('title').value, 'Recovered title');
assert.equal(form.elements.namedItem('document_srl').value, '991');
assert.equal(window.editorGetContent(16), '<p>Recovered</p>');
assert.equal(calls.load[0].action, 'editor.procEditorLoadSavedDocument');
assert.equal(calls.reload, 16);
assert.equal(calls.autosave[0].sequence, 16);
assert.equal(window.auto_saved_msg, 'Autosaved.');
const autosaveMessage = wrapper.querySelector('#editor_autosaved_message_16');
assert.ok(autosaveMessage);
assert.equal(autosaveMessage.parentElement.classList.contains('roundeditor__footer'), true);
assert.equal(autosaveMessage.textContent, '');
assert.equal(autosaveMessage.getAttribute('role'), 'status');

const componentButton = wrapper.querySelector('[data-command="component:poll_maker"]');
assert.ok(componentButton);
assert.equal(componentButton.querySelector('img'), null);
assert.equal(componentButton.querySelector('svg').dataset.icon, 'poll');
assert.equal(componentButton.querySelectorAll('svg rect').length, 3);
componentButton.click();
assert.deepEqual(calls.component.at(-1), { name: 'poll_maker', sequence: 16 });

compat.setData('<p>Visual</p>');
const sourceButton = wrapper.querySelector('.roundeditor__tool-group--right [data-command="source"]');
sourceButton.click();
const source = wrapper.querySelector('.roundeditor__source');
assert.equal(source.hidden, false);
assert.equal(wrapper.querySelector('.roundeditor__surface').hidden, true);
assert.equal(window.editorMode[16], 'html');
assert.equal(compat.mode, 'html');
assert.equal(componentButton.disabled, true);
source.value = '<p>Source <strong title="kept">HTML</strong></p>';
source.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
assert.equal(window.editorGetContent(16), source.value);
source.setSelectionRange(3, 9);
assert.equal(window.editorGetSelectedHtml(16), 'Source');
source.value = '<p>Source <strong title="kept">HTML</strong><script>bad()</script></p>';
form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
assert.equal(window.editorGetContent(16), '<p>Source <strong title="kept">HTML</strong></p>');
assert.equal(source.hidden, false);
sourceButton.click();
assert.equal(window.editorMode[16], null);
assert.equal(compat.mode, 'wysiwyg');
assert.equal(window.editorGetContent(16), '<p>Source <strong title="kept">HTML</strong></p>');

const oembedHtml = '<div editor_component="oembed" data-oembed-type="card" data-url="https://www.pixiv.net/artworks/148675479" data-oembed-file-srl="30263" contenteditable="false"><figure contenteditable="false"><img src="/card.jpg" alt="" loading="lazy" /><figcaption><h3><a href="https://www.pixiv.net/artworks/148675479" target="_blank" rel="noopener noreferrer">Artwork</a></h3><p>Preview</p><cite>pixiv.net</cite></figcaption></figure></div>';
compat.setData(oembedHtml);
const oembedPreview = wrapper.querySelector('[editor_component="oembed"].roundeditor__oembed');
assert.ok(oembedPreview);
assert.equal(oembedPreview.querySelector('h3').textContent, 'Artwork');
assert.equal(wrapper.querySelector('[data-component-name="oembed"]'), null);
sourceButton.click();
assert.equal(source.hidden, false);
sourceButton.click();
assert.equal(source.hidden, true);
assert.equal(window.editorMode[16], null);
assert.equal(window.editorGetContent(16), oembedHtml);

const fullscreenButton = wrapper.querySelector('.roundeditor__tool-group--right [data-command="fullscreen"]');
fullscreenButton.click();
assert.equal(wrapper.classList.contains('roundeditor--fullscreen'), true);
assert.equal(document.documentElement.classList.contains('roundeditor-fullscreen-open'), true);
document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
assert.equal(wrapper.classList.contains('roundeditor--fullscreen'), false);

compat.setData('<p>Before <img src="blank.gif" editor_component="image_gallery" gallery_style="list" /></p>');
const rawComponent = wrapper.querySelector('[data-roundeditor-raw-node="rhymixComponentInline"]');
assert.ok(rawComponent);
rawComponent.dispatchEvent(new dom.window.MouseEvent('dblclick', { bubbles: true, cancelable: true }));
assert.deepEqual(calls.component.at(-1), { name: 'image_gallery', sequence: 16 });
assert.equal(window.editorPrevNode.getAttribute('gallery_style'), 'list');
window.editorPrevNode.setAttribute('gallery_style', 'slide');
await new Promise(resolve => dom.window.setTimeout(resolve, 0));
assert.match(window.editorGetContent(16), /gallery_style="slide"/);
assert.equal(wrapper.querySelector('.roundeditor__component-proxy'), null);

compat.setData('<p><img src="blank.gif" poll_srl="30213" editor_component="poll_maker" skin="default" /></p>');
const pollCard = wrapper.querySelector('[data-component-name="poll_maker"]');
assert.ok(pollCard);
assert.equal(pollCard.querySelector('strong').textContent, 'Poll');
await new Promise(resolve => dom.window.setTimeout(resolve, 0));
assert.match(pollCard.querySelector('.roundeditor__component-details').textContent, /Poll title: Preferred editor\?/);
assert.match(pollCard.querySelector('.roundeditor__component-details').textContent, /Poll title: Why did you choose it\?/);
assert.doesNotMatch(pollCard.querySelector('.roundeditor__component-details').textContent, /30213|default/);
assert.deepEqual(calls.load.at(-1), { action: 'poll.getPollinfo', params: { poll_srl: '30213' } });
assert.equal(pollCard.querySelector('img'), null);
assert.equal(pollCard.querySelector('.roundeditor__component-card-icon').dataset.icon, 'poll');
assert.equal(pollCard.querySelectorAll('.roundeditor__component-card-icon rect').length, 3);

console.log('roundeditor Phase 6 integration contract passed');
