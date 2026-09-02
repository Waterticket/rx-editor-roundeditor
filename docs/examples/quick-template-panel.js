(function () {
    'use strict';

    const registration = window.RoundEditor.extensions.register({
        id: 'example.quick-template-panel',
        version: '1.0.0',
        apiVersion: '^1.0',
        requires: { capabilities: ['content.insertHTML'] },

        create(context) {
            let panel = null;
            const templates = Array.isArray(context.config.templates) && context.config.templates.length
                ? context.config.templates
                : [
                    { label: '검토 요청', lines: ['아래 내용을 검토해 주세요.', '검토 기한:'] },
                    { label: '작업 완료', lines: ['요청하신 작업을 완료했습니다.', '확인 부탁드립니다.'] },
                ];

            context.assets.addStyle({
                id: 'quick-template-panel',
                css: `
                    .example-quick-templates { display:grid; gap:8px; padding:12px; }
                    .example-quick-templates button { padding:8px 12px; text-align:left; cursor:pointer; }
                `,
            });

            function templateHTML(lines) {
                const container = document.createElement('div');
                for (const value of Array.isArray(lines) ? lines : []) {
                    const paragraph = document.createElement('p');
                    paragraph.textContent = String(value);
                    container.appendChild(paragraph);
                }
                return container.innerHTML;
            }

            return {
                commands: {
                    openTemplates({ dispatch }) {
                        if (!dispatch) return true;
                        if (panel?.open) return panel.close();

                        const content = document.createElement('div');
                        content.className = 'example-quick-templates';

                        for (const template of templates) {
                            const button = document.createElement('button');
                            button.type = 'button';
                            button.textContent = String(template.label || '서식');
                            button.addEventListener('click', () => {
                                context.content.insertHTML(templateHTML(template.lines), {
                                    source: 'extension:example.quick-template-panel',
                                    select: 'after',
                                });
                                context.editor.focus();
                                panel.close();
                            });
                            content.appendChild(button);
                        }

                        panel = context.ui.openPanel({
                            id: 'templates',
                            title: '빠른 서식',
                            content,
                            onClose(reason) {
                                context.log.debug('template panel closed', { reason });
                            },
                        });
                        return true;
                    },
                },

                keymap: {
                    'Mod-Shift-P': 'openTemplates',
                },

                toolbar: [{
                    id: 'templates',
                    label: '빠른 서식',
                    command: 'openTemplates',
                    group: 'quick-templates',
                    order: 10,
                }],

                destroy() {
                    if (panel?.open) panel.close();
                },
            };
        },
    });

    if (!registration.accepted) throw registration.error;
}());
