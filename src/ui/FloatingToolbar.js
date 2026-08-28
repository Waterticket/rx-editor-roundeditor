function actionButton(action, label, text = label) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.mediaAction = action;
    button.title = label;
    button.setAttribute('aria-label', label);
    button.textContent = text;
    return button;
}

function field(label, name, type = 'text') {
    const wrapper = document.createElement('label');
    wrapper.className = 'roundeditor__media-field';
    const caption = document.createElement('span');
    caption.textContent = label;
    const input = document.createElement('input');
    input.name = name;
    input.type = type;
    wrapper.append(caption, input);
    return { wrapper, input };
}

export class FloatingToolbar {
    constructor({ labels, values, onDelete, onSize, onLink, onAlt, onAlign }) {
        this.labels = labels;
        this.values = values;
        this.handlers = { onDelete, onSize, onLink, onAlt, onAlign };
        this.element = document.createElement('div');
        this.element.className = 'roundeditor__media-toolbar';
        this.element.hidden = true;
        this.element.contentEditable = 'false';
        this.row = document.createElement('div');
        this.row.className = 'roundeditor__media-toolbar-row';
        this.row.append(
            actionButton('delete', labels.imageDelete, '×'),
            actionButton('size', labels.imageSize, '↔'),
            actionButton('link', labels.imageLink, '🔗'),
            actionButton('alt', labels.imageAlt, 'ALT'),
            actionButton('left', labels.alignLeft, '≡'),
            actionButton('center', labels.alignCenter, '≡'),
            actionButton('right', labels.alignRight, '≡')
        );
        this.formHost = document.createElement('div');
        this.formHost.className = 'roundeditor__media-toolbar-form';
        this.element.append(this.row, this.formHost);
        this.element.addEventListener('click', event => this.execute(event));
    }

    show() { this.element.hidden = false; }
    hide() {
        this.element.hidden = true;
        this.formHost.replaceChildren();
    }

    execute(event) {
        const action = event.target.closest('[data-media-action]')?.dataset.mediaAction;
        if (!action) return;
        event.preventDefault();
        event.stopPropagation();
        if (action === 'delete') this.handlers.onDelete();
        else if (['left', 'center', 'right'].includes(action)) this.handlers.onAlign(action === 'left' ? null : action);
        else this.openForm(action);
    }

    openForm(action) {
        const values = this.values();
        const form = document.createElement('form');
        if (action === 'size') {
            const width = field(this.labels.imageWidth, 'width', 'number');
            const height = field(this.labels.imageHeight, 'height', 'number');
            for (const item of [width, height]) {
                item.input.min = '24';
                item.input.inputMode = 'numeric';
            }
            width.input.value = values.width || '';
            height.input.value = values.height || '';
            form.append(width.wrapper, height.wrapper);
            form.addEventListener('submit', event => {
                event.preventDefault();
                this.handlers.onSize(Number(width.input.value), Number(height.input.value));
                this.formHost.replaceChildren();
            });
        } else if (action === 'link') {
            const href = field(this.labels.url, 'href', 'url');
            href.input.value = values.href || '';
            href.input.placeholder = 'https://';
            form.appendChild(href.wrapper);
            form.addEventListener('submit', event => {
                event.preventDefault();
                this.handlers.onLink(href.input.value.trim());
                this.formHost.replaceChildren();
            });
        } else {
            const alt = field(this.labels.imageAlt, 'alt');
            alt.input.value = values.alt || '';
            form.appendChild(alt.wrapper);
            form.addEventListener('submit', event => {
                event.preventDefault();
                this.handlers.onAlt(alt.input.value);
                this.formHost.replaceChildren();
            });
        }
        const apply = document.createElement('button');
        apply.type = 'submit';
        apply.textContent = this.labels.apply;
        form.appendChild(apply);
        this.formHost.replaceChildren(form);
        form.querySelector('input')?.focus();
    }
}
