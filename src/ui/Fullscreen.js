export class Fullscreen {
    constructor(bridge) {
        this.bridge = bridge;
        this.onKeydown = event => {
            if (event.key === 'Escape' && this.active) this.toggle(false);
        };
        document.addEventListener('keydown', this.onKeydown);
    }

    get active() {
        return this.bridge.wrapper.classList.contains('roundeditor--fullscreen');
    }

    toggle(force = !this.active) {
        this.bridge.wrapper.classList.toggle('roundeditor--fullscreen', force);
        document.documentElement.classList.toggle('roundeditor-fullscreen-open', force);
        this.bridge.toolbar.refresh(this.bridge.view.state);
        this.bridge.sourceMode.focus();
    }
}
