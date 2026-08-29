import { pickerPacks, resolveStickerItems, stickerElements } from '../../rhymix/sticker.js';
import { insertSticker } from '../../stickers.js';

const RECENT_KEY = 'roundeditor.recentStickers';
const RECENT_LIMIT = 30;

function recentItems() {
    try {
        const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
        return Array.isArray(parsed) ? parsed.slice(0, RECENT_LIMIT) : [];
    } catch (error) {
        return [];
    }
}

function remember(item) {
    const identity = { sticker_srl: item.sticker_srl, sticker_file_srl: item.sticker_file_srl };
    const next = [identity, ...recentItems().filter(saved => (
        String(saved.sticker_srl) !== String(identity.sticker_srl)
        || String(saved.sticker_file_srl) !== String(identity.sticker_file_srl)
    ))].slice(0, RECENT_LIMIT);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch (error) { /* Storage may be disabled. */ }
}

function mediaPreview(item, label) {
    if (item.type === 'video') {
        const video = document.createElement('video');
        video.dataset.src = item.url || '';
        video.poster = item.poster || '';
        video.autoplay = true;
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = 'none';
        video.setAttribute('aria-label', label);
        return video;
    }
    const image = document.createElement('img');
    image.dataset.src = item.poster || item.url || '';
    image.alt = label;
    image.loading = 'lazy';
    return image;
}

export function createStickerPanel(bridge, labels, onClose) {
    const root = document.createElement('div');
    root.className = 'roundeditor__sticker-panel';
    const sidebar = document.createElement('div');
    sidebar.className = 'roundeditor__sticker-packs';
    sidebar.setAttribute('role', 'tablist');
    sidebar.setAttribute('aria-label', labels.stickerPacks);
    const grid = document.createElement('div');
    grid.className = 'roundeditor__sticker-grid';
    const status = document.createElement('p');
    status.className = 'roundeditor__sticker-status';
    status.textContent = labels.stickerLoading;
    grid.appendChild(status);
    root.append(sidebar, grid);
    const cache = new Map();
    let observer = null;
    let activePack = null;

    const renderItems = (items, pack = null) => {
        items = items.filter(item => item?.valid !== false);
        observer?.disconnect();
        observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                const media = entry.target;
                if (media.dataset.src && !media.getAttribute('src')) media.setAttribute('src', media.dataset.src);
                if (media.tagName === 'VIDEO') media.play().catch(() => {});
                observer.unobserve(media);
            }
        }, { root: grid, rootMargin: '180px' }) : null;
        grid.replaceChildren();
        if (!items.length) {
            status.textContent = labels.stickerEmpty;
            grid.appendChild(status);
            return;
        }
        for (const item of items) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'roundeditor__sticker-item';
            const label = item.name || item.title || labels.sticker;
            const media = mediaPreview(item, label);
            button.title = label;
            button.setAttribute('aria-label', label);
            button.appendChild(media);
            button.addEventListener('click', () => {
                insertSticker(bridge, item, pack?.title || item.title || '');
                remember(item);
                onClose();
            });
            grid.appendChild(button);
            if (observer) observer.observe(media);
            else if (media.dataset.src) media.setAttribute('src', media.dataset.src);
        }
    };

    const selectPack = async (pack, button) => {
        activePack = pack?.sticker_srl || 'recent';
        for (const candidate of sidebar.querySelectorAll('button')) candidate.setAttribute('aria-selected', String(candidate === button));
        status.textContent = labels.stickerLoading;
        grid.replaceChildren(status);
        try {
            if (!cache.has(activePack)) {
                const items = pack
                    ? (await stickerElements(bridge.config, pack.sticker_srl)).map(item => ({
                        ...item,
                        sticker_srl: item.sticker_srl || pack.sticker_srl,
                    }))
                    : await resolveStickerItems(bridge.config, recentItems());
                cache.set(activePack, items);
            }
            if (activePack === (pack?.sticker_srl || 'recent')) renderItems(cache.get(activePack), pack);
        } catch (error) {
            status.textContent = error.message || labels.stickerError;
            grid.replaceChildren(status);
        }
    };

    const packButton = (pack, label, imageUrl = '') => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'roundeditor__sticker-pack';
        button.setAttribute('role', 'tab');
        if (imageUrl) {
            const image = document.createElement('img');
            image.src = imageUrl;
            image.alt = '';
            image.loading = 'lazy';
            button.appendChild(image);
        }
        const text = document.createElement('span');
        text.textContent = label;
        button.appendChild(text);
        button.addEventListener('click', () => selectPack(pack, button));
        return button;
    };

    const recent = packButton(null, labels.stickerRecent);
    sidebar.appendChild(recent);
    pickerPacks(bridge.config).then(packs => {
        for (const pack of packs) sidebar.appendChild(packButton(pack, pack.title, pack.main_image));
        selectPack(null, recent);
    }).catch(error => {
        status.textContent = error.message || labels.stickerError;
    });
    root.addEventListener('roundeditor:close', () => {
        observer?.disconnect();
        for (const video of root.querySelectorAll('video')) video.pause();
    });
    return root;
}
