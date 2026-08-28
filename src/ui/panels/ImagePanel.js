import { imageFiles, insertUploadedImages } from '../../images.js';
import { uploadImageFiles } from '../../rhymix/upload.js';
import { addUploadPlaceholder, removeUploadPlaceholder } from '../../uploadPlaceholders.js';

function measureImage(url) {
    if (!url) return Promise.resolve(null);
    return new Promise(resolve => {
        const image = new window.Image();
        image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
        image.onerror = () => resolve(null);
        image.src = url;
    });
}

function stageFiles(files) {
    return imageFiles(files).map(file => {
        const preview = typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : '';
        return { file, preview, dimensions: null };
    });
}

function button(label, className = '') {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = `roundeditor__button${className ? ` ${className}` : ''}`;
    element.textContent = label;
    return element;
}

export function createImagePanel({ bridge, labels, onClose }) {
    const panel = document.createElement('div');
    panel.className = 'roundeditor__image-panel';
    let items = [];
    let busy = false;

    const policy = document.createElement('div');
    policy.className = 'roundeditor__image-policy';
    for (const text of [labels.imageExifPolicy, labels.imageFilenamePolicy]) {
        const option = document.createElement('label');
        option.className = 'roundeditor__check';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = true;
        input.disabled = true;
        option.append(input, document.createTextNode(text));
        policy.appendChild(option);
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.hidden = true;

    const dropzone = document.createElement('button');
    dropzone.type = 'button';
    dropzone.className = 'roundeditor__image-dropzone';
    dropzone.textContent = labels.imageDropzone;
    dropzone.addEventListener('click', () => input.click());

    const thumbnails = document.createElement('div');
    thumbnails.className = 'roundeditor__image-thumbnails';
    thumbnails.setAttribute('aria-live', 'polite');

    const error = document.createElement('p');
    error.className = 'roundeditor__panel-error';
    error.hidden = true;

    const actions = document.createElement('div');
    actions.className = 'roundeditor__image-actions';
    const alignLabel = document.createElement('label');
    alignLabel.className = 'roundeditor__field';
    alignLabel.appendChild(document.createTextNode(labels.imageAlign));
    const align = document.createElement('select');
    for (const [value, text] of [['', labels.alignLeft], ['center', labels.alignCenter], ['right', labels.alignRight]]) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        align.appendChild(option);
    }
    alignLabel.appendChild(align);
    const cancel = button(labels.cancel, 'roundeditor__button--text');
    const insert = button(labels.insert, 'roundeditor__button--primary');
    actions.append(alignLabel, cancel, insert);

    function revoke(item) {
        if (item.preview && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(item.preview);
    }

    function render() {
        thumbnails.replaceChildren();
        for (const [index, item] of items.entries()) {
            const card = document.createElement('div');
            card.className = 'roundeditor__image-thumbnail';
            if (item.preview) {
                const preview = document.createElement('img');
                preview.src = item.preview;
                preview.alt = '';
                card.appendChild(preview);
            }
            const name = document.createElement('span');
            name.textContent = item.file.name;
            const remove = button('×', 'roundeditor__image-remove');
            remove.setAttribute('aria-label', `${labels.remove}: ${item.file.name}`);
            remove.addEventListener('click', () => {
                revoke(item);
                items.splice(index, 1);
                render();
            });
            card.append(name, remove);
            thumbnails.appendChild(card);
        }
        insert.disabled = busy || items.length === 0;
    }

    async function add(files) {
        const staged = stageFiles(files);
        if (!staged.length) {
            error.textContent = labels.imageOnly;
            error.hidden = false;
            return;
        }
        error.hidden = true;
        items.push(...staged);
        render();
        await Promise.all(staged.map(async item => { item.dimensions = await measureImage(item.preview); }));
    }

    input.addEventListener('change', () => {
        add(input.files);
        input.value = '';
    });
    for (const eventName of ['dragenter', 'dragover']) {
        dropzone.addEventListener(eventName, event => {
            event.preventDefault();
            dropzone.classList.add('roundeditor__image-dropzone--active');
        });
    }
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('roundeditor__image-dropzone--active'));
    dropzone.addEventListener('drop', event => {
        event.preventDefault();
        dropzone.classList.remove('roundeditor__image-dropzone--active');
        add(event.dataTransfer?.files);
    });
    cancel.addEventListener('click', onClose);
    insert.addEventListener('click', async () => {
        if (busy || !items.length) return;
        busy = true;
        error.hidden = true;
        insert.disabled = true;
        const placeholderId = addUploadPlaceholder(bridge.view, 'image', labels.imageUploading);
        try {
            const uploads = await uploadImageFiles(bridge, items, (index, progress) => {
                const card = thumbnails.children[index];
                if (card) card.style.setProperty('--roundeditor-upload-progress', `${Math.round(progress * 100)}%`);
            });
            insertUploadedImages(bridge, uploads, { align: align.value || null, placeholderId });
            onClose();
        } catch (uploadError) {
            removeUploadPlaceholder(bridge.view, placeholderId);
            error.textContent = uploadError.message;
            error.hidden = false;
            busy = false;
            render();
        }
    });
    panel.addEventListener('roundeditor:close', () => items.forEach(revoke), { once: true });

    panel.append(policy, input, dropzone, thumbnails, error, actions);
    render();
    return panel;
}
