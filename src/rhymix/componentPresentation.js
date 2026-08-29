import { uiIcon } from '../icons.js';

const COMPONENT_PRESENTATIONS = {
    poll_maker: {
        icon: { type: 'ui', name: 'poll' },
        fallbackDetails: false,
        resolveDetails: resolvePollDetails,
        pendingDetails: labels => [pollDetail(labels, labels.componentPollLoading || 'Loading…')],
        unavailableDetails: labels => [pollDetail(labels, labels.componentPollUnavailable || 'Unavailable')],
        invalidateDetails: invalidatePollDetails,
    },
};

const pollDetailRequests = new Map();

const EXCLUDED_DETAILS = new Set([
    'class', 'contenteditable', 'editor_component', 'height', 'src', 'style', 'width',
]);

export function componentElement(html) {
    const template = document.createElement('template');
    template.innerHTML = String(html || '');
    return template.content.querySelector('[editor_component]');
}

export function componentPresentation(name, title, element, labels = {}) {
    const definition = COMPONENT_PRESENTATIONS[name] || {};
    let details = (definition.details || []).flatMap(detail => {
        const value = element?.getAttribute(detail.attribute);
        return value ? [{ label: detail.label(labels), value }] : [];
    });
    if (!details.length && element && definition.fallbackDetails !== false) {
        details = Array.from(element.attributes)
            .filter(attribute => !EXCLUDED_DETAILS.has(attribute.name) && !attribute.name.startsWith('data-roundeditor-'))
            .slice(0, 3)
            .map(attribute => ({ label: attribute.name, value: attribute.value }));
    }
    return {
        name,
        title: title || name,
        icon: definition.icon || null,
        details,
        resolveDetails: definition.resolveDetails || null,
        pendingDetails: definition.pendingDetails?.(labels) || [],
        unavailableDetails: definition.unavailableDetails?.(labels) || [],
    };
}

export function resolveComponentDetails(presentation, element, labels = {}) {
    if (!presentation.resolveDetails) return Promise.resolve(presentation.details);
    return presentation.resolveDetails(element, labels);
}

export function invalidateComponentDetails(name, element) {
    COMPONENT_PRESENTATIONS[name]?.invalidateDetails?.(element);
}

export function componentToolbarIcon(name, title) {
    const presentation = componentPresentation(name, title, null);
    if (!presentation.icon) return null;
    return createComponentIcon(presentation.icon, 'roundeditor__component-icon');
}

export function componentCardIcon(icon) {
    return icon ? createComponentIcon(icon, 'roundeditor__component-card-icon') : null;
}

function createComponentIcon(icon, className) {
    if (icon.type === 'ui') {
        const svg = uiIcon(icon.name);
        svg.classList.add(className);
        return svg;
    }
    const image = document.createElement('img');
    image.className = className;
    image.src = icon.url;
    image.alt = '';
    image.setAttribute('aria-hidden', 'true');
    return image;
}

function resolvePollDetails(element, labels) {
    const pollSrl = element?.getAttribute('poll_srl');
    if (!pollSrl) return Promise.resolve([]);

    return requestPollTitles(pollSrl).then(titles => (
        titles.map(title => pollDetail(labels, title))
    ));
}

function pollDetail(labels, value) {
    return { label: labels.componentPollTitle || 'Poll title', value };
}

function invalidatePollDetails(element) {
    const pollSrl = element?.getAttribute('poll_srl');
    if (pollSrl) pollDetailRequests.delete(pollSrl);
}

function requestPollTitles(pollSrl) {
    if (pollDetailRequests.has(pollSrl)) return pollDetailRequests.get(pollSrl);

    const request = new Promise((resolve, reject) => {
        if (typeof window.exec_json !== 'function') {
            reject(new Error('The Rhymix poll API is unavailable.'));
            return;
        }
        window.exec_json('poll.getPollinfo', { poll_srl: pollSrl }, response => {
            const questions = response?.poll?.poll;
            const titles = questions && typeof questions === 'object'
                ? Object.values(questions).map(question => question?.title).filter(Boolean)
                : [];
            if (!titles.length) {
                reject(new Error('The poll has no title.'));
                return;
            }
            resolve(titles);
        }, response => {
            reject(new Error(response?.message || 'The poll request failed.'));
            return false;
        });
    });
    pollDetailRequests.set(pollSrl, request);
    return request;
}
