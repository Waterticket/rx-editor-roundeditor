import {
    componentCardIcon,
    componentElement,
    componentPresentation,
    resolveComponentDetails,
} from '../rhymix/componentPresentation.js';

export class RawView {
    constructor(node, bridge) {
        this.node = node;
        this.dom = document.createElement(node.type.isInline ? 'span' : 'div');
        this.dom.className = `roundeditor__raw roundeditor__raw--${node.type.isInline ? 'inline' : 'block'}`;
        this.dom.contentEditable = 'false';
        this.dom.dataset.roundeditorRawNode = node.type.name;

        if (node.type.name.startsWith('rhymixComponent')) {
            this.renderComponent(bridge);
            return;
        }

        const label = document.createElement('span');
        label.className = 'roundeditor__raw-label';
        label.textContent = '이 영역은 현재 편집할 수 없습니다 · 원본 유지됨';
        this.dom.appendChild(label);
    }

    renderComponent(bridge) {
        const element = componentElement(this.node.attrs.html);
        const name = element?.getAttribute('editor_component') || '';
        const configuredTitle = bridge?.config.components?.[name];
        const title = typeof configuredTitle === 'object' ? configuredTitle.title : configuredTitle;
        const labels = bridge?.config.labels || {};
        const presentation = componentPresentation(name, title, element, labels);
        this.dom.classList.add('roundeditor__component-card');
        this.dom.dataset.componentName = name;

        const icon = componentCardIcon(presentation.icon);
        if (icon) this.dom.appendChild(icon);
        const body = document.createElement('span');
        body.className = 'roundeditor__component-card-body';
        const heading = document.createElement('strong');
        heading.textContent = presentation.title;
        body.appendChild(heading);
        this.details = document.createElement('span');
        this.details.className = 'roundeditor__component-details';
        body.appendChild(this.details);
        this.renderDetails(presentation.details);
        if (presentation.resolveDetails) {
            this.renderDetails(presentation.pendingDetails);
            resolveComponentDetails(presentation, element, labels).then(details => {
                if (!this.destroyed) this.renderDetails(details);
            }).catch(() => {
                if (!this.destroyed) this.renderDetails(presentation.unavailableDetails);
            });
        }
        const hint = document.createElement('span');
        hint.className = 'roundeditor__component-hint';
        hint.textContent = labels.componentEditHint || 'Double-click to view or edit details';
        body.appendChild(hint);
        this.dom.appendChild(body);
    }

    renderDetails(details) {
        this.details.replaceChildren(...details.map(detail => {
            const item = document.createElement('span');
            item.className = 'roundeditor__component-detail';
            item.textContent = `${detail.label}: ${detail.value}`;
            return item;
        }));
        this.details.hidden = !details.length;
    }

    stopEvent() {
        return true;
    }

    ignoreMutation() {
        return true;
    }

    destroy() {
        this.destroyed = true;
    }
}

export function rawNodeViews(bridge) {
    return Object.fromEntries([
        'embed',
        'rawBlock',
        'rawInline',
        'rhymixComponentBlock',
        'rhymixComponentInline',
    ].map(name => [name, node => new RawView(node, bridge)]));
}
