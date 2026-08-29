const ICON_SPRITE_URL = '/modules/editor/skins/roundeditor/assets/attachment-icons.svg';

export function svgIcon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('roundeditor__attachment-icon', `roundeditor__attachment-icon--${name}`);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `${ICON_SPRITE_URL}#${name}`);
    svg.appendChild(use);
    return svg;
}
