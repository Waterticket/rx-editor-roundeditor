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

function packPreview(pack) {
    if (pack?.type === 'video' && pack.url) {
        const video = document.createElement('video');
        video.src = pack.url;
        video.poster = pack.poster || pack.main_image || '';
        video.autoplay = true;
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = 'metadata';
        video.setAttribute('aria-hidden', 'true');
        return video;
    }
    const image = document.createElement('img');
    image.src = pack?.poster || pack?.main_image || '';
    image.alt = '';
    image.loading = 'lazy';
    return image;
}

export function createStickerPanel(bridge, labels, onClose) {
    const root = document.createElement('div');
    root.className = 'roundeditor__sticker-panel';
    const main = document.createElement('div');
    main.className = 'roundeditor__sticker-main';
    const sidebar = document.createElement('div');
    sidebar.className = 'roundeditor__sticker-packs';
    sidebar.setAttribute('role', 'tablist');
    sidebar.setAttribute('aria-label', labels.stickerPacks);
    const previous = document.createElement('button');
    previous.type = 'button';
    previous.className = 'roundeditor__sticker-page';
    previous.setAttribute('aria-label', labels.stickerPrevious);
    previous.textContent = '▲';
    const packList = document.createElement('div');
    packList.className = 'roundeditor__sticker-pack-list';
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'roundeditor__sticker-page';
    next.setAttribute('aria-label', labels.stickerNext);
    next.textContent = '▼';
    sidebar.append(previous, packList, next);
    const body = document.createElement('div');
    body.className = 'roundeditor__sticker-body';
    const packTitle = document.createElement('span');
    packTitle.className = 'roundeditor__sticker-pack-title';
    const grid = document.createElement('div');
    grid.className = 'roundeditor__sticker-grid';
    const status = document.createElement('p');
    status.className = 'roundeditor__sticker-status';
    status.textContent = labels.stickerLoading;
    grid.appendChild(status);
    body.append(packTitle, grid);
    main.append(sidebar, body);
    const footer = document.createElement('div');
    footer.className = 'roundeditor__sticker-footer';
    for (const [label, href] of [[labels.stickerOrder, '/sticker/mylist'], [labels.stickerList, '/sticker']]) {
        const link = document.createElement('a');
        link.className = 'roundeditor__sticker-link';
        link.href = href;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = label;
        footer.appendChild(link);
    }
    root.append(main, footer);
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
            });
            grid.appendChild(button);
            if (observer) observer.observe(media);
            else if (media.dataset.src) media.setAttribute('src', media.dataset.src);
        }
    };

    const selectPack = async (pack, button) => {
        activePack = pack?.sticker_srl || 'recent';
        packTitle.textContent = pack?.title || labels.stickerRecent;
        for (const candidate of packList.querySelectorAll('.roundeditor__sticker-pack')) {
            candidate.setAttribute('aria-selected', String(candidate === button));
        }
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

    const packButton = (pack, label) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'roundeditor__sticker-pack';
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-label', label);
        button.title = label;
        if (pack?.main_image || pack?.poster) {
            button.appendChild(packPreview(pack));
        } else {
            const icon = document.createElement('span');
            icon.className = 'roundeditor__sticker-pack-icon';
            icon.textContent = '↺';
            icon.setAttribute('aria-hidden', 'true');
            button.appendChild(icon);
        }
        const text = document.createElement('span');
        text.textContent = label;
        button.appendChild(text);
        button.addEventListener('click', () => selectPack(pack, button));
        return button;
    };

    const updatePaging = () => {
        previous.disabled = packList.scrollTop <= 0;
        next.disabled = packList.scrollTop + packList.clientHeight >= packList.scrollHeight - 1;
    };
    previous.addEventListener('click', () => packList.scrollBy({ top: -58, behavior: 'smooth' }));
    next.addEventListener('click', () => packList.scrollBy({ top: 58, behavior: 'smooth' }));
    packList.addEventListener('scroll', updatePaging, { passive: true });

    const recent = packButton(null, labels.stickerRecent);
    packList.appendChild(recent);
    pickerPacks(bridge.config).then(packs => {
        for (const pack of packs) packList.appendChild(packButton(pack, pack.title));
        selectPack(null, recent);
        setTimeout(updatePaging, 0);
    }).catch(error => {
        status.textContent = error.message || labels.stickerError;
    });
    root.addEventListener('roundeditor:close', () => {
        observer?.disconnect();
        for (const video of root.querySelectorAll('video')) video.pause();
    });
    return root;
}
