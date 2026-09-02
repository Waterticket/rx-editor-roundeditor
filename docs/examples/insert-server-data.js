(function () {
    'use strict';

    const registration = window.RoundEditor.extensions.register({
        id: 'example.insert-server-data',
        version: '1.0.0',
        apiVersion: '^1.0',

        create(context) {
            const { Fragment, Slice } = context.pm.model;
            const defaults = {
                customerName: String(context.config.customerName || '이름 없음'),
                orderNumber: String(context.config.orderNumber || '주문번호 없음'),
                status: String(context.config.status || '상태 없음'),
            };

            return {
                commands: {
                    insertOrderSummary({ state, dispatch }, params = {}) {
                        const values = { ...defaults, ...params };
                        const lines = [
                            `고객: ${String(values.customerName)}`,
                            `주문번호: ${String(values.orderNumber)}`,
                            `상태: ${String(values.status)}`,
                        ];
                        const paragraph = state.schema.nodes.paragraph;
                        if (!paragraph) return false;
                        if (!dispatch) return true;

                        const blocks = lines.map(line => paragraph.create(null, state.schema.text(line)));
                        const slice = new Slice(Fragment.fromArray(blocks), 0, 0);
                        const transaction = state.tr.replaceSelection(slice)
                            .setMeta('roundeditorSource', 'extension:example.insert-server-data')
                            .scrollIntoView();
                        dispatch(transaction);
                        return true;
                    },
                },

                toolbar: [{
                    id: 'order-summary',
                    label: '주문 정보',
                    command: 'insertOrderSummary',
                    params: { status: context.config.toolbarStatus || defaults.status },
                    group: 'business-data',
                    order: 10,
                    placement: { before: 'components' },
                }],
            };
        },
    });

    if (!registration.accepted) throw registration.error;
}());
