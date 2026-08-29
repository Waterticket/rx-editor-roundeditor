import { redo, undo } from 'prosemirror-history';
import {
    addColumnAfter,
    addColumnBefore,
    addRowAfter,
    addRowBefore,
    deleteColumn,
    deleteRow,
    deleteTable,
    isInTable,
    mergeCells,
    splitCell,
} from 'prosemirror-tables';
import {
    FONT_SIZES,
    LINE_HEIGHTS,
    COLORS,
    changeIndent,
    clearFormatting,
    insertHorizontalRule,
    insertTable,
    insertText,
    markActive,
    nodeActive,
    removeLink,
    run,
    selectDocument,
    setLink,
    setParagraphFormat,
    setTextStyle,
    setTextblockAttrs,
    textblockAttr,
    toggleBlockquote,
    toggleList,
    toggleTextMark,
} from './commands.js';
import { createLinkPanel } from './panels/LinkPanel.js';
import { createTablePanel } from './panels/TablePanel.js';
import { createStickerPanel } from './panels/StickerPanel.js';

const FALLBACK_LABELS = {
    toolbar: 'Editor toolbar', more: 'More', close: 'Close', bold: 'Bold', italic: 'Italic',
    underline: 'Underline', strike: 'Strikethrough', fontSize: 'Font size', lineHeight: 'Line height',
    fontFamily: 'Font family',
    textColor: 'Text color', backgroundColor: 'Background color', clearFormatting: 'Clear formatting',
    image: 'Image', video: 'Video', link: 'Link',
    table: 'Table', specialCharacters: 'Special characters', paragraph: 'Paragraph tools',
    alignLeft: 'Align left', alignCenter: 'Align center', alignRight: 'Align right',
    alignJustify: 'Justify', orderedList: 'Numbered list', bulletList: 'Bulleted list',
    outdent: 'Outdent', indent: 'Indent', quote: 'Block quote', horizontalRule: 'Horizontal rule',
    sticker: 'Sticker', stickerPacks: 'Sticker packs', stickerRecent: 'Recent', stickerLoading: 'Loading stickers…',
    stickerEmpty: 'No stickers are available.', stickerError: 'Could not load stickers.',
    undo: 'Undo', redo: 'Redo', selectAll: 'Select all',
    source: 'Source editing (available in Phase 6)', fullscreen: 'Fullscreen (available in Phase 6)',
    help: 'Keyboard shortcuts', normal: 'Normal', code: 'Code', reset: 'Reset', custom: 'Custom',
    apply: 'Apply', remove: 'Remove', cancel: 'Cancel', insert: 'Insert', url: 'URL',
    newWindow: 'Open in a new window', invalidUrl: 'Enter a safe URL.', rows: 'Rows', columns: 'Columns',
    characters: 'Characters', helpText: 'Ctrl/Cmd+B Bold · Ctrl/Cmd+I Italic · Ctrl/Cmd+U Underline · Ctrl/Cmd+Z Undo',
    characterCount: 'Characters', futureFeature: 'This feature will be added in a later phase.',
    addRowBefore: 'Add row above', addRowAfter: 'Add row below', deleteRow: 'Delete row',
    addColumnBefore: 'Add column left', addColumnAfter: 'Add column right', deleteColumn: 'Delete column',
    mergeCells: 'Merge cells', splitCell: 'Split cell', deleteTable: 'Delete table',
    imageExifPolicy: 'Use the site EXIF policy', imageFilenamePolicy: 'Use the site filename policy',
    imageDropzone: 'Choose images or drop them here', imageOnly: 'Please select image files only.',
    imageAlign: 'Alignment', imageDelete: 'Delete image', imageSize: 'Image size', imageLink: 'Image link',
    imageAlt: 'Alternative text', imageWidth: 'Width', imageHeight: 'Height',
    videoDropzone: 'Choose an MP4, WebM, or MOV file (up to 50 MB)',
    videoOnly: 'Please select an MP4, WebM, or MOV file.', videoTooLarge: 'Video files may not exceed 50 MB.',
    videoDelete: 'Delete video', videoSize: 'Video size', videoAutoplay: 'Autoplay',
    videoControls: 'Show controls', videoWidth: 'Width', videoHeight: 'Height',
    sizeReset: 'Remove explicit size',
    imageUploading: 'Uploading image…', videoUploading: 'Uploading video…',
};

const ICONS = {
    bold: '<strong>B</strong>', italic: '<em>I</em>', underline: '<u>U</u>', strike: '<s>S</s>',
    fontSize: '↕', lineHeight: '≡', textColor: 'A', backgroundColor: '▣', clearFormatting: 'Tx',
    fontFamily: 'F',
    image: '▧', video: '▶', link: '🔗', table: '▦', specialCharacters: 'Ω', paragraph: '¶',
    alignLeft: '<span class="roundeditor__align-icon roundeditor__align-icon--left"><i></i><i></i><i></i></span>',
    alignCenter: '<span class="roundeditor__align-icon roundeditor__align-icon--center"><i></i><i></i><i></i></span>',
    alignRight: '<span class="roundeditor__align-icon roundeditor__align-icon--right"><i></i><i></i><i></i></span>',
    alignJustify: '<span class="roundeditor__align-icon roundeditor__align-icon--justify"><i></i><i></i><i></i></span>',
    orderedList: '1.',
    bulletList: '•', outdent: '⇤', indent: '⇥', quote: '❝', horizontalRule: '―', sticker: '☺',
    undo: '↶', redo: '↷', selectAll: '▣', source: '&lt;/&gt;', fullscreen: '⛶', help: '?', more: '⋯',
};

function button(name, labels, options = {}) {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = `roundeditor__tool${options.className ? ` ${options.className}` : ''}`;
    element.dataset.command = name;
    element.title = labels[name] || name;
    element.setAttribute('aria-label', labels[name] || name);
    element.innerHTML = options.icon || ICONS[name] || name;
    if (options.disabled) {
        element.disabled = true;
        element.setAttribute('aria-disabled', 'true');
    }
    return element;
}

function choiceButton(label, value, selected = false) {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = 'roundeditor__choice';
    element.dataset.value = value;
    element.textContent = label;
    if (selected) element.setAttribute('aria-current', 'true');
    return element;
}

export class Toolbar {
    constructor(bridge) {
        this.bridge = bridge;
        this.labels = { ...FALLBACK_LABELS, ...(bridge.config.labels || {}) };
        this.activeMore = null;
        this.panelName = null;
        this.element = document.createElement('div');
        this.element.className = 'roundeditor__toolbar';
        this.element.setAttribute('role', 'toolbar');
        this.element.setAttribute('aria-label', this.labels.toolbar);
        this.primaryRow = document.createElement('div');
        this.primaryRow.className = 'roundeditor__toolbar-primary';
        this.moreRow = document.createElement('div');
        this.moreRow.className = 'roundeditor__toolbar-more';
        this.moreRow.hidden = true;
        this.panel = document.createElement('div');
        this.panel.className = 'roundeditor__panel';
        this.panel.hidden = true;
        this.footer = document.createElement('div');
        this.footer.className = 'roundeditor__footer';
        this.counter = document.createElement('span');
        this.counter.className = 'roundeditor__counter';
        this.counter.setAttribute('aria-live', 'polite');
        this.footer.appendChild(this.counter);
        this.element.append(this.primaryRow, this.moreRow);
        bridge.wrapper.insertBefore(this.element, bridge.wrapper.querySelector('.roundeditor__surface'));
        bridge.wrapper.insertBefore(this.panel, bridge.wrapper.querySelector('.roundeditor__surface'));
        bridge.wrapper.appendChild(this.footer);
        if (bridge.config.hideToolbar) this.element.hidden = true;
        this.build();
    }

    build() {
        const text = this.addGroup('text');
        ['bold', 'italic', 'underline', 'strike'].forEach(name => text.appendChild(button(name, this.labels)));
        ['fontSize', 'lineHeight', 'textColor', 'backgroundColor'].forEach(name => text.appendChild(button(name, this.labels)));
        text.appendChild(this.moreButton('text'));

        const rich = this.addGroup('rich');
        rich.appendChild(button('link', this.labels));
        rich.appendChild(this.moreButton('rich'));

        const paragraph = this.addGroup('paragraph');
        paragraph.appendChild(this.moreButton('paragraph', 'paragraph'));

        const sticker = this.addGroup('sticker');
        sticker.appendChild(button('sticker', this.labels));

        const spacer = document.createElement('span');
        spacer.className = 'roundeditor__toolbar-spacer';
        this.primaryRow.appendChild(spacer);

        const right = this.addGroup('right');
        ['undo', 'redo', 'selectAll'].forEach(name => right.appendChild(button(name, this.labels)));
        right.appendChild(this.moreButton('right'));

        this.element.addEventListener('mousedown', event => {
            if (event.target.closest('button') && !event.target.closest('.roundeditor__toolbar-more')) event.preventDefault();
        });
        this.element.addEventListener('click', event => {
            const target = event.target.closest('[data-command]');
            if (target && !target.disabled) this.execute(target.dataset.command);
        });
    }

    addGroup(name) {
        const group = document.createElement('div');
        group.className = `roundeditor__tool-group roundeditor__tool-group--${name}`;
        group.dataset.group = name;
        this.primaryRow.appendChild(group);
        return group;
    }

    moreButton(group, icon = 'more') {
        const element = button('more', this.labels, { icon: ICONS[icon] });
        element.dataset.moreGroup = group;
        element.addEventListener('click', event => {
            event.stopPropagation();
            this.toggleMore(group, element);
        });
        return element;
    }

    toggleMore(group, trigger) {
        if (this.activeMore === group) {
            this.closeMore();
            return;
        }
        this.closePanel();
        this.activeMore = group;
        this.moreRow.replaceChildren();
        this.moreRow.hidden = false;
        this.moreRow.dataset.group = group;
        for (const tool of this.moreTools(group)) this.moreRow.appendChild(tool);
        for (const more of this.element.querySelectorAll('[data-more-group]')) {
            more.setAttribute('aria-expanded', String(more === trigger));
        }
    }

    moreTools(group) {
        const names = {
            text: ['fontFamily', 'clearFormatting'],
            rich: ['table', 'specialCharacters'],
            paragraph: [
                'format', 'alignLeft', 'alignCenter', 'alignRight', 'alignJustify', 'orderedList',
                'bulletList', 'outdent', 'indent', 'quote', 'horizontalRule',
            ],
            right: ['source', 'fullscreen', 'help'],
        }[group] || [];
        return names.map(name => {
            if (name === 'format') return button('format', { format: this.labels.normal }, { icon: 'P' });
            return button(name, this.labels, { disabled: ['source', 'fullscreen'].includes(name) });
        });
    }

    closeMore() {
        this.activeMore = null;
        this.moreRow.hidden = true;
        this.moreRow.replaceChildren();
        for (const more of this.element.querySelectorAll('[data-more-group]')) more.setAttribute('aria-expanded', 'false');
    }

    openPanel(name, title, content) {
        if (this.panelName === name) {
            this.closePanel();
            return;
        }
        this.panelName = name;
        this.panel.dataset.panel = name;
        const heading = document.createElement('div');
        heading.className = 'roundeditor__panel-heading';
        const titleElement = document.createElement('strong');
        titleElement.textContent = title;
        const close = button('close', this.labels, { icon: '×' });
        close.addEventListener('click', () => this.closePanel());
        heading.append(titleElement, close);
        this.panel.replaceChildren(heading, content);
        this.panel.hidden = false;
    }

    closePanel() {
        this.panel.querySelector('.roundeditor__image-panel, .roundeditor__video-panel, .roundeditor__sticker-panel')
            ?.dispatchEvent(new window.Event('roundeditor:close'));
        this.panelName = null;
        delete this.panel.dataset.panel;
        this.panel.hidden = true;
        this.panel.replaceChildren();
    }

    choices(name, values, formatter, action) {
        const content = document.createElement('div');
        content.className = 'roundeditor__choices';
        for (const value of values) {
            const choice = choiceButton(formatter(value), String(value));
            choice.addEventListener('click', () => {
                action(value);
                this.closePanel();
            });
            content.appendChild(choice);
        }
        return content;
    }

    colorPanel(markName, title) {
        const content = document.createElement('div');
        content.className = 'roundeditor__palette';
        const reset = choiceButton(this.labels.reset, '');
        reset.classList.add('roundeditor__swatch', 'roundeditor__swatch--reset');
        reset.addEventListener('click', () => {
            run(this.bridge.view, setTextStyle(this.bridge.view.state.schema.marks[markName], null));
            this.closePanel();
        });
        content.appendChild(reset);
        for (const color of COLORS) {
            const swatch = choiceButton(color, color);
            swatch.classList.add('roundeditor__swatch');
            swatch.style.setProperty('--roundeditor-swatch', color);
            swatch.setAttribute('aria-label', color);
            swatch.addEventListener('click', () => {
                run(this.bridge.view, setTextStyle(this.bridge.view.state.schema.marks[markName], color));
                this.closePanel();
            });
            content.appendChild(swatch);
        }
        this.openPanel(markName, title, content);
    }

    execute(name) {
        const view = this.bridge.view;
        const { schema } = view.state;
        const commands = {
            bold: toggleTextMark(schema.marks.strong),
            italic: toggleTextMark(schema.marks.em),
            underline: toggleTextMark(schema.marks.underline),
            strike: toggleTextMark(schema.marks.strike),
            clearFormatting,
            alignLeft: setTextblockAttrs({ align: null }),
            alignCenter: setTextblockAttrs({ align: 'center' }),
            alignRight: setTextblockAttrs({ align: 'right' }),
            alignJustify: setTextblockAttrs({ align: 'justify' }),
            orderedList: toggleList(schema.nodes.orderedList, schema.nodes.listItem),
            bulletList: toggleList(schema.nodes.bulletList, schema.nodes.listItem),
            outdent: changeIndent(-1),
            indent: changeIndent(1),
            quote: toggleBlockquote(schema),
            horizontalRule: insertHorizontalRule,
            undo,
            redo,
            selectAll: selectDocument,
        };
        if (commands[name]) {
            run(view, commands[name]);
            return;
        }
        if (name === 'fontSize') {
            const choices = this.choices(name, FONT_SIZES, value => `${value}px`, value => (
                run(view, setTextStyle(schema.marks.fontSize, `${value}px`))
            ));
            const custom = choiceButton(this.labels.custom, 'custom');
            custom.addEventListener('click', () => this.customFontSize());
            choices.appendChild(custom);
            this.openPanel(name, this.labels.fontSize, choices);
        } else if (name === 'fontFamily') {
            const families = [
                { label: this.labels.reset, value: null },
                ...(Array.isArray(this.bridge.config.fontFamilies) ? this.bridge.config.fontFamilies : []),
            ];
            const choices = this.choices(name, families, family => family.label, family => (
                run(view, setTextStyle(schema.marks.fontFamily, family.value))
            ));
            for (const [index, family] of families.entries()) {
                if (family.value) choices.children[index].style.fontFamily = family.value;
            }
            this.openPanel(name, this.labels.fontFamily, choices);
        } else if (name === 'lineHeight') {
            const choices = this.choices(name, LINE_HEIGHTS, value => value === '1' ? this.labels.reset : value, value => (
                run(view, setTextblockAttrs({ lineHeight: value === '1' ? null : value }))
            ));
            this.openPanel(name, this.labels.lineHeight, choices);
        } else if (name === 'textColor') {
            this.colorPanel('fontColor', this.labels.textColor);
        } else if (name === 'backgroundColor') {
            this.colorPanel('bgColor', this.labels.backgroundColor);
        } else if (name === 'format') {
            this.formatPanel();
        } else if (name === 'link') {
            this.linkPanel();
        } else if (name === 'table') {
            this.tablePanel();
        } else if (name === 'specialCharacters') {
            this.characterPanel();
        } else if (name === 'sticker') {
            const panel = createStickerPanel(this.bridge, this.labels, () => this.closePanel());
            this.openPanel(name, this.labels.sticker, panel);
        } else if (name === 'help') {
            const content = document.createElement('p');
            content.className = 'roundeditor__help';
            content.textContent = this.labels.helpText;
            this.openPanel(name, this.labels.help, content);
        }
    }

    customFontSize() {
        const content = document.createElement('form');
        content.className = 'roundeditor__panel-form';
        content.innerHTML = `<label class="roundeditor__field"><span>${this.labels.fontSize}</span><input type="number" min="1" max="300" value="15" inputmode="numeric"></label><button class="roundeditor__button roundeditor__button--primary" type="submit">${this.labels.apply}</button>`;
        content.addEventListener('submit', event => {
            event.preventDefault();
            const value = Math.min(300, Math.max(1, Number(content.querySelector('input').value) || 15));
            run(this.bridge.view, setTextStyle(this.bridge.view.state.schema.marks.fontSize, `${value}px`));
            this.closePanel();
        });
        this.openPanel('customFontSize', this.labels.fontSize, content);
    }

    formatPanel() {
        const formats = [
            ['normal', this.labels.normal], ['h1', 'H1'], ['h2', 'H2'], ['h3', 'H3'], ['h4', 'H4'],
            ['code', this.labels.code],
        ];
        const content = this.choices('format', formats, value => value[1], value => (
            run(this.bridge.view, setParagraphFormat(value[0]))
        ));
        this.openPanel('format', this.labels.paragraph, content);
    }

    linkPanel() {
        const panel = createLinkPanel({
            labels: this.labels,
            onApply: (href, target) => {
                run(this.bridge.view, setLink(href, target));
                this.closePanel();
            },
            onRemove: () => {
                run(this.bridge.view, removeLink);
                this.closePanel();
            },
            onClose: () => this.closePanel(),
        });
        this.openPanel('link', this.labels.link, panel);
    }

    tablePanel() {
        const tableCommands = [
            ['addRowBefore', addRowBefore], ['addRowAfter', addRowAfter], ['deleteRow', deleteRow],
            ['addColumnBefore', addColumnBefore], ['addColumnAfter', addColumnAfter], ['deleteColumn', deleteColumn],
            ['mergeCells', mergeCells], ['splitCell', splitCell], ['deleteTable', deleteTable],
        ];
        const operations = isInTable(this.bridge.view.state)
            ? tableCommands.map(([name, command]) => ({ name, command, enabled: command(this.bridge.view.state) }))
            : [];
        const panel = createTablePanel({
            labels: this.labels,
            operations,
            onInsert: (rows, columns) => {
                run(this.bridge.view, insertTable(rows, columns));
                this.closePanel();
            },
            onOperation: command => {
                run(this.bridge.view, command);
                this.closePanel();
            },
            onClose: () => this.closePanel(),
        });
        this.openPanel('table', this.labels.table, panel);
    }

    characterPanel() {
        const characters = '©®™…—–·•※★☆♥♡✓→←↑↓±×÷≠≤≥∞℃₩€¥£§¶「」『』【】';
        const content = this.choices('characters', [...characters], value => value, value => (
            run(this.bridge.view, insertText(value))
        ));
        this.openPanel('characters', this.labels.specialCharacters, content);
    }

    refresh(state) {
        const markNames = { bold: 'strong', italic: 'em', underline: 'underline', strike: 'strike' };
        for (const [command, markName] of Object.entries(markNames)) {
            const element = this.element.querySelector(`[data-command="${command}"]`);
            const active = markActive(state, state.schema.marks[markName]);
            element?.classList.toggle('roundeditor__tool--active', active);
            element?.setAttribute('aria-pressed', String(active));
        }
        const activeNodes = {
            orderedList: state.schema.nodes.orderedList,
            bulletList: state.schema.nodes.bulletList,
            quote: state.schema.nodes.blockquote,
        };
        for (const [command, type] of Object.entries(activeNodes)) {
            const element = this.element.querySelector(`[data-command="${command}"]`);
            const active = nodeActive(state, type);
            element?.classList.toggle('roundeditor__tool--active', active);
            element?.setAttribute('aria-pressed', String(active));
        }
        const align = textblockAttr(state, 'align');
        for (const [command, value] of Object.entries({ alignLeft: null, alignCenter: 'center', alignRight: 'right', alignJustify: 'justify' })) {
            const element = this.element.querySelector(`[data-command="${command}"]`);
            const active = align === value;
            element?.classList.toggle('roundeditor__tool--active', active);
            element?.setAttribute('aria-pressed', String(active));
        }
        const undoButton = this.element.querySelector('[data-command="undo"]');
        const redoButton = this.element.querySelector('[data-command="redo"]');
        if (undoButton) undoButton.disabled = !undo(state);
        if (redoButton) redoButton.disabled = !redo(state);
        this.counter.textContent = `${this.labels.characterCount} : ${state.doc.textContent.length}`;
    }
}
