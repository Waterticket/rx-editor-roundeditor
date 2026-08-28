function validHref(value) {
    const href = value.trim();
    if (!href || /^\s*(?:javascript|vbscript|data):/i.test(href)) return null;
    return href;
}

export function createLinkPanel({ labels, onApply, onRemove, onClose }) {
    const panel = document.createElement('form');
    panel.className = 'roundeditor__panel-form';
    panel.noValidate = true;
    panel.innerHTML = `
        <label class="roundeditor__field roundeditor__field--grow">
            <span>${labels.url}</span>
            <input type="url" name="href" inputmode="url" placeholder="https://" autocomplete="url">
        </label>
        <label class="roundeditor__check">
            <input type="checkbox" name="target" checked>
            <span>${labels.newWindow}</span>
        </label>
        <span class="roundeditor__panel-error" role="alert"></span>
        <div class="roundeditor__panel-actions">
            <button type="button" class="roundeditor__button roundeditor__button--text" data-action="remove">${labels.remove}</button>
            <button type="button" class="roundeditor__button roundeditor__button--text" data-action="cancel">${labels.cancel}</button>
            <button type="submit" class="roundeditor__button roundeditor__button--primary">${labels.apply}</button>
        </div>
    `;
    const href = panel.elements.namedItem('href');
    const error = panel.querySelector('.roundeditor__panel-error');
    panel.addEventListener('submit', event => {
        event.preventDefault();
        const safeHref = validHref(href.value);
        if (!safeHref) {
            error.textContent = labels.invalidUrl;
            href.focus();
            return;
        }
        error.textContent = '';
        onApply(safeHref, panel.elements.namedItem('target').checked);
    });
    panel.querySelector('[data-action="remove"]').addEventListener('click', onRemove);
    panel.querySelector('[data-action="cancel"]').addEventListener('click', onClose);
    queueMicrotask(() => href.focus());
    return panel;
}
