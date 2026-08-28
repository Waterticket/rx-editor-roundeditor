export class RawView {
    constructor(node) {
        this.node = node;
        this.dom = document.createElement(node.type.isInline ? 'span' : 'div');
        this.dom.className = `rxeditor__raw rxeditor__raw--${node.type.isInline ? 'inline' : 'block'}`;
        this.dom.contentEditable = 'false';
        this.dom.dataset.rxeditorRawNode = node.type.name;

        const label = document.createElement('span');
        label.className = 'rxeditor__raw-label';
        label.textContent = node.type.name.startsWith('rhymixComponent')
            ? '라이믹스 에디터 컴포넌트 · 원본 유지됨'
            : '이 영역은 현재 편집할 수 없습니다 · 원본 유지됨';
        this.dom.appendChild(label);
    }

    stopEvent() {
        return true;
    }

    ignoreMutation() {
        return true;
    }
}

export function rawNodeViews() {
    return Object.fromEntries([
        'embed',
        'rawBlock',
        'rawInline',
        'rhymixComponentBlock',
        'rhymixComponentInline',
    ].map(name => [name, node => new RawView(node)]));
}
