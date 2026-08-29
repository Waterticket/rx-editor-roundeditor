import { uiIcon } from '../icons.js';

function actionButton(action, label, icon = action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.mediaAction = action;
    button.title = label;
    button.setAttribute('aria-label', label);
    button.appendChild(uiIcon(icon));
    return button;
}

function alignmentButton(action, label) {
    return actionButton(action, label, `align${action[0].toUpperCase()}${action.slice(1)}`);
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
    constructor({ labels, values, onDelete, onSize, onResetSize, onLink, onAlt, onAlign }) {
        this.labels = labels;
        this.values = values;
        this.handlers = { onDelete, onSize, onResetSize, onLink, onAlt, onAlign };
        this.element = document.createElement('div');
        this.element.className = 'roundeditor__media-toolbar';
        this.element.hidden = true;
        this.element.contentEditable = 'false';
        this.row = document.createElement('div');
        this.row.className = 'roundeditor__media-toolbar-row';
        this.row.append(
            actionButton('delete', labels.imageDelete),
            actionButton('size', labels.imageSize, 'resize'),
            actionButton('link', labels.imageLink),
            actionButton('alt', labels.imageAlt),
            alignmentButton('left', labels.alignLeft),
            alignmentButton('center', labels.alignCenter),
            alignmentButton('right', labels.alignRight)
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
            const reset = document.createElement('button');
            reset.type = 'button';
            reset.textContent = this.labels.sizeReset;
            reset.addEventListener('click', () => {
                this.handlers.onResetSize();
                this.formHost.replaceChildren();
            });
            form.appendChild(reset);
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

export class VideoFloatingToolbar {
    constructor({ labels, values, onDelete, onSize, onResetSize, onToggleAutoplay, onToggleControls, onAlign }) {
        this.labels = labels;
        this.values = values;
        this.handlers = { onDelete, onSize, onResetSize, onToggleAutoplay, onToggleControls, onAlign };
        this.element = document.createElement('div');
        this.element.className = 'roundeditor__media-toolbar';
        this.element.hidden = true;
        this.element.contentEditable = 'false';
        this.row = document.createElement('div');
        this.row.className = 'roundeditor__media-toolbar-row';
        this.row.append(
            actionButton('delete', labels.videoDelete),
            actionButton('size', labels.videoSize, 'resize'),
            actionButton('autoplay', labels.videoAutoplay, 'play'),
            actionButton('controls', labels.videoControls),
            alignmentButton('left', labels.alignLeft),
            alignmentButton('center', labels.alignCenter),
            alignmentButton('right', labels.alignRight)
        );
        this.formHost = document.createElement('div');
        this.formHost.className = 'roundeditor__media-toolbar-form';
        this.element.append(this.row, this.formHost);
        this.element.addEventListener('click', event => this.execute(event));
    }

    show() {
        this.element.hidden = false;
        this.refresh();
    }

    hide() {
        this.element.hidden = true;
        this.formHost.replaceChildren();
    }

    refresh() {
        const values = this.values();
        this.row.querySelector('[data-media-action="autoplay"]')?.setAttribute('aria-pressed', String(values.autoplay));
        this.row.querySelector('[data-media-action="controls"]')?.setAttribute('aria-pressed', String(values.controls));
        for (const align of ['left', 'center', 'right']) {
            this.row.querySelector(`[data-media-action="${align}"]`)?.setAttribute(
                'aria-pressed',
                String((values.align || 'left') === align)
            );
        }
    }

    execute(event) {
        const action = event.target.closest('[data-media-action]')?.dataset.mediaAction;
        if (!action) return;
        event.preventDefault();
        event.stopPropagation();
        if (action === 'delete') this.handlers.onDelete();
        else if (action === 'autoplay') this.handlers.onToggleAutoplay();
        else if (action === 'controls') this.handlers.onToggleControls();
        else if (['left', 'center', 'right'].includes(action)) this.handlers.onAlign(action);
        else this.openSizeForm();
        this.refresh();
    }

    openSizeForm() {
        const values = this.values();
        const form = document.createElement('form');
        const width = field(this.labels.videoWidth, 'width', 'number');
        const height = field(this.labels.videoHeight, 'height', 'number');
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
        const reset = document.createElement('button');
        reset.type = 'button';
        reset.textContent = this.labels.sizeReset;
        reset.addEventListener('click', () => {
            this.handlers.onResetSize();
            this.formHost.replaceChildren();
        });
        form.appendChild(reset);
        const apply = document.createElement('button');
        apply.type = 'submit';
        apply.textContent = this.labels.apply;
        form.appendChild(apply);
        this.formHost.replaceChildren(form);
        width.input.focus();
    }
}
