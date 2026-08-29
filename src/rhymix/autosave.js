function findNamedControl(form, name) {
    return Array.from(form.querySelectorAll('[name]')).find(control => control.name === name) || null;
}

export function restoreSavedDocument(bridge) {
    const savedTitle = findNamedControl(bridge.form, '_saved_doc_title');
    const savedContent = findNamedControl(bridge.form, '_saved_doc_content');
    const savedMessage = findNamedControl(bridge.form, '_saved_doc_message');
    const configured = bridge.config.savedDocument;
    const title = savedTitle?.value ?? configured?.title ?? '';
    const content = savedContent?.value ?? configured?.content ?? '';
    if (!title && !content) return bridge.contentInput.value || '';

    const message = savedMessage?.value || configured?.message || 'Load the autosaved document?';
    if (!window.confirm(message)) {
        window.editorRemoveSavedDoc?.();
        return bridge.contentInput.value || '';
    }

    const titleInput = findNamedControl(bridge.form, 'title');
    if (titleInput) titleInput.value = title;
    if (typeof window.exec_json === 'function') {
        window.exec_json('editor.procEditorLoadSavedDocument', {
            editor_sequence: bridge.sequence,
            primary_key: bridge.config.primaryKeyName,
            mid: window.current_mid || bridge.config.mid || '',
        }, response => {
            if (response?.document_srl && bridge.primaryInput) {
                bridge.primaryInput.value = response.document_srl;
            }
            window.reloadUploader?.(bridge.sequence);
        });
    }
    return content;
}

export function enableAutosave(bridge) {
    if (bridge.config.enableAutosave && typeof window.editorEnableAutoSave === 'function') {
        const message = bridge.form.querySelector(`#editor_autosaved_message_${bridge.sequence}`);
        if (message) {
            message.textContent = '';
            message.classList.add('roundeditor__autosave');
            message.setAttribute('role', 'status');
            message.setAttribute('aria-live', 'polite');
            bridge.toolbar.footer.prepend(message);
        }
        window.auto_saved_msg = bridge.config.autosavedMessage || window.auto_saved_msg || '';
        window.editorEnableAutoSave(bridge.form, bridge.sequence);
    }
}
