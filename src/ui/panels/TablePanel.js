export function createTablePanel({ labels, operations, onInsert, onOperation, onClose }) {
    const panel = document.createElement('form');
    panel.className = 'roundeditor__panel-form';
    panel.innerHTML = `
        <label class="roundeditor__field">
            <span>${labels.rows}</span>
            <input type="number" name="rows" min="1" max="20" value="3" inputmode="numeric">
        </label>
        <span aria-hidden="true">×</span>
        <label class="roundeditor__field">
            <span>${labels.columns}</span>
            <input type="number" name="columns" min="1" max="10" value="3" inputmode="numeric">
        </label>
        <div class="roundeditor__panel-actions">
            <button type="button" class="roundeditor__button roundeditor__button--text" data-action="cancel">${labels.cancel}</button>
            <button type="submit" class="roundeditor__button roundeditor__button--primary">${labels.insert}</button>
        </div>
    `;
    panel.addEventListener('submit', event => {
        event.preventDefault();
        const rows = Math.min(20, Math.max(1, Number(panel.elements.namedItem('rows').value) || 1));
        const columns = Math.min(10, Math.max(1, Number(panel.elements.namedItem('columns').value) || 1));
        onInsert(rows, columns);
    });
    panel.querySelector('[data-action="cancel"]').addEventListener('click', onClose);
    if (operations.length) {
        const tools = document.createElement('div');
        tools.className = 'roundeditor__table-actions';
        for (const operation of operations) {
            const tool = document.createElement('button');
            tool.type = 'button';
            tool.className = 'roundeditor__button';
            tool.textContent = labels[operation.name];
            tool.disabled = !operation.enabled;
            tool.addEventListener('click', () => onOperation(operation.command));
            tools.appendChild(tool);
        }
        panel.prepend(tools);
    }
    queueMicrotask(() => panel.elements.namedItem('rows').focus());
    return panel;
}
