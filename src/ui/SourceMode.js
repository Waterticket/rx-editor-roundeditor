import { beautifyHtml, minifyHtml } from '../htmlFormatting.js';

export class SourceMode {
    constructor(bridge) {
        this.bridge = bridge;
        this.textarea = document.createElement('textarea');
        this.textarea.className = 'roundeditor__source';
        this.textarea.hidden = true;
        this.textarea.spellcheck = false;
        this.textarea.setAttribute('aria-label', bridge.config.labels?.source || 'HTML source');
        this.textarea.addEventListener('input', () => bridge.sync());
        bridge.wrapper.insertBefore(this.textarea, bridge.toolbar.footer);
    }

    get active() {
        return !this.textarea.hidden;
    }

    toggle() {
        if (this.active) this.close();
        else this.open();
    }

    open() {
        if (!this.bridge.config.htmlMode || this.bridge.config.allowHtml === false || this.active) return;
        this.bridge.toolbar.closePanel();
        this.bridge.toolbar.closeMore();
        this.textarea.value = beautifyHtml(this.bridge.serializeVisual());
        this.bridge.surface.hidden = true;
        this.textarea.hidden = false;
        this.bridge.wrapper.classList.add('roundeditor--source');
        window.editorMode[this.bridge.sequence] = 'html';
        this.bridge.compat.mode = 'html';
        this.textarea.focus();
        this.bridge.toolbar.refresh(this.bridge.view.state);
        this.bridge.sync();
    }

    close() {
        if (!this.active) return;
        this.commit();
        this.textarea.hidden = true;
        this.bridge.surface.hidden = false;
        this.bridge.wrapper.classList.remove('roundeditor--source');
        window.editorMode[this.bridge.sequence] = null;
        this.bridge.compat.mode = 'wysiwyg';
        this.bridge.view.focus();
        this.bridge.toolbar.refresh(this.bridge.view.state);
        this.bridge.sync();
    }

    commit() {
        if (!this.active) return;
        this.bridge.updateDocument(minifyHtml(this.textarea.value));
        this.textarea.value = beautifyHtml(this.bridge.serializeVisual());
    }

    getData() {
        return this.active ? minifyHtml(this.textarea.value) : this.bridge.serializeVisual();
    }

    setData(html) {
        if (this.active) this.textarea.value = beautifyHtml(html);
        else this.bridge.updateDocument(html);
    }

    insertHtml(html) {
        if (!this.active) return false;
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        this.textarea.setRangeText(String(html || ''), start, end, 'end');
        this.textarea.dispatchEvent(new window.Event('input', { bubbles: true }));
        return true;
    }

    selectedHtml() {
        return this.active
            ? this.textarea.value.slice(this.textarea.selectionStart, this.textarea.selectionEnd)
            : null;
    }

    focus() {
        if (this.active) this.textarea.focus();
        else this.bridge.view.focus();
    }
}
