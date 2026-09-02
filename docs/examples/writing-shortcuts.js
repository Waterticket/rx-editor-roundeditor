(function () {
    'use strict';

    const registration = window.RoundEditor.extensions.register({
        id: 'example.writing-shortcuts',
        version: '1.0.0',
        apiVersion: '^1.0',

        create(context) {
            function insertText({ state, dispatch }, value) {
                const text = String(value || '');
                if (!text) return false;
                if (!dispatch) return true;
                dispatch(state.tr.insertText(text).scrollIntoView());
                return true;
            }

            return {
                commands: {
                    insertTimestamp(commandContext) {
                        const formatter = new Intl.DateTimeFormat(context.config.locale || 'ko-KR', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                        });
                        return insertText(commandContext, formatter.format(new Date()));
                    },

                    insertSignature(commandContext) {
                        const name = String(context.config.authorName || '작성자');
                        const department = String(context.config.department || '').trim();
                        return insertText(commandContext, `— ${name}${department ? ` / ${department}` : ''}`);
                    },
                },

                keymap: {
                    'Mod-Shift-T': 'insertTimestamp',
                    'Mod-Shift-S': 'insertSignature',
                },

                toolbar: [{
                    id: 'timestamp',
                    label: '날짜·시간',
                    command: 'insertTimestamp',
                    group: 'writing-tools',
                    order: 10,
                    placement: { after: 'paragraph' },
                }],
            };
        },
    });

    if (!registration.accepted) throw registration.error;
}());
