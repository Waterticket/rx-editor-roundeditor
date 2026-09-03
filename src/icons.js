const LOCAL_ICON_SPRITE_URL = '/modules/editor/skins/roundeditor/assets/attachment-icons.svg';

function iconSpriteHref(name) {
    if (typeof window !== 'undefined' && window.RoundEditorAttachmentIconPrefix) {
        return `${window.RoundEditorAttachmentIconPrefix}${name}`;
    }
    const url = typeof window !== 'undefined' && window.RoundEditorAttachmentIconsUrl
        ? window.RoundEditorAttachmentIconsUrl
        : LOCAL_ICON_SPRITE_URL;
    return `${url}#${name}`;
}

const UI_ICONS = {
    bold: '<text class="roundeditor__icon-letter roundeditor__icon-letter--bold" x="12" y="18" text-anchor="middle">B</text>',
    italic: '<text class="roundeditor__icon-letter roundeditor__icon-letter--italic" x="12" y="18" text-anchor="middle">I</text>',
    underline: '<text class="roundeditor__icon-letter" x="12" y="18" text-anchor="middle">U</text><path d="M5.5 21h13"/>',
    strike: '<text class="roundeditor__icon-letter" x="12" y="18" text-anchor="middle">S</text><path d="M5 12.5h14"/>',
    fontSize: '<text x="3" y="17" font-size="16" font-weight="700">A</text><text x="15" y="17" font-size="11" font-weight="650">a</text>',
    lineHeight: '<path d="M5 6h10M5 12h10M5 18h10M19 5v14M17 7l2-2 2 2M17 17l2 2 2-2"/>',
    fontFamily: '<path d="M5 5V4h14v1M12 4v16M8 20h8"/>',
    textColor: '<text x="12" y="15" text-anchor="middle" font-size="15" font-weight="650">A</text><path d="M5 20h14"/>',
    backgroundColor: '<rect x="2.5" y="3" width="19" height="18" rx="2.5" opacity=".18" fill="currentColor" stroke="none"/><text x="12" y="17.5" text-anchor="middle" font-size="16" font-weight="700">A</text>',
    clearFormatting: '<path d="M5 5h11M10.5 5 7 16M14 9l5 5-6 6-5-5zM4 20h8"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9" r="1.5"/><path d="m5 18 5-5 3 3 2-2 4 4"/>',
    video: '<rect x="3" y="5" width="14" height="14" rx="2"/><path d="m17 10 4-2v8l-4-2z"/>',
    audio: '<path d="M5 10v4h3l4 3V7L8 10H5zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
    link: '<path d="M9 8H7a4 4 0 0 0 0 8h2M15 8h2a4 4 0 0 1 0 8h-2M8 12h8"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 10h18M9 4v16M15 4v16"/>',
    specialCharacters: '<text x="12" y="17" text-anchor="middle" font-size="17" font-weight="600">Ω</text>',
    paragraph: '<path d="M13 20V5h-2.5a4 4 0 0 0 0 8H17M17 5v15"/>',
    format: '<path d="M5 19 10.5 5h3L19 19M7 15h10"/>',
    alignLeft: '<path d="M4 6h16M4 10h11M4 14h16M4 18h9"/>',
    alignCenter: '<path d="M4 6h16M6.5 10h11M4 14h16M7.5 18h9"/>',
    alignRight: '<path d="M4 6h16M9 10h11M4 14h16M11 18h9"/>',
    alignJustify: '<path d="M4 6h16M4 10h16M4 14h16M4 18h16"/>',
    orderedList: '<text x="2.5" y="9" font-size="7" font-weight="650">1</text><text x="2.5" y="19" font-size="7" font-weight="650">2</text><path d="M9 7h12M9 12h12M9 17h12"/>',
    bulletList: '<circle cx="4.5" cy="7" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="17" r="1" fill="currentColor" stroke="none"/><path d="M9 7h12M9 12h12M9 17h12"/>',
    outdent: '<path d="M10 6h11M10 12h11M10 18h11M7 9l-3 3 3 3"/>',
    indent: '<path d="M3 6h11M3 12h11M3 18h11M17 9l3 3-3 3"/>',
    quote: '<path d="M5 11h5v7H4v-6c0-4 2-6 6-7M15 11h5v7h-6v-6c0-4 2-6 6-7"/>',
    horizontalRule: '<path d="M4 12h16"/>',
    poll: '<rect x="4" y="12" width="4" height="8" rx="1" fill="currentColor" stroke="none"/><rect x="10" y="8" width="4" height="12" rx="1" fill="currentColor" stroke="none"/><rect x="16" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/>',
    undo: '<path d="M9 7 5 11l4 4M5 11h8a6 6 0 0 1 6 6"/>',
    redo: '<path d="m15 7 4 4-4 4M19 11h-8a6 6 0 0 0-6 6"/>',
    selectAll: '<path d="M8 4H4v4M16 4h4v4M20 16v4h-4M8 20H4v-4M8 12l2.5 2.5L16 9"/>',
    source: '<path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
    fullscreen: '<path d="M9 4H4v5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.4 2.4 0 1 1 3.2 2.3c-.8.3-1 1-1 1.7M12 17h.01"/>',
    more: '<circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    delete: '<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/>',
    resize: '<path d="M6 6l12 12M6 11V6h5M18 13v5h-5"/>',
    alt: '<rect x="3" y="5" width="18" height="14" rx="2"/><text x="12" y="15" text-anchor="middle" font-size="8" font-weight="700">ALT</text>',
    play: '<path d="m9 7 8 5-8 5z" fill="currentColor" stroke="none"/>',
    controls: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m8 10 4 2.5L8 15z"/><path d="M14.5 14.5h3"/>',
};

const ALIGN_ICON_CLASSES = {
    alignLeft: 'roundeditor__align-icon--left',
    alignCenter: 'roundeditor__align-icon--center',
    alignRight: 'roundeditor__align-icon--right',
    alignJustify: 'roundeditor__align-icon--justify',
};

export function svgIcon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('roundeditor__attachment-icon', `roundeditor__attachment-icon--${name}`);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', iconSpriteHref(name));
    svg.appendChild(use);
    return svg;
}

export function uiIcon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('roundeditor__icon', `roundeditor__icon--${name}`);
    if (ALIGN_ICON_CLASSES[name]) svg.classList.add(ALIGN_ICON_CLASSES[name]);
    svg.dataset.icon = name;
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.innerHTML = UI_ICONS[name] || UI_ICONS.help;
    return svg;
}
