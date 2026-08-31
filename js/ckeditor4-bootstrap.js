(function (window) {
    'use strict';

    function ensureNamespace() {
        var editor = window.CKEDITOR = window.CKEDITOR || {};
        editor.instances = editor.instances || {};
        return editor;
    }

    function ensureEditor1Proxy() {
        var editor = ensureNamespace();
        if (editor.instances.editor1) return editor.instances.editor1;

        var pendingListeners = [];
        var proxy = {
            __roundeditorCkeditor4Proxy: true,
            __roundeditorCkeditor4PendingListeners: pendingListeners,
            on: function (name, listener) {
                pendingListeners.push([name, listener]);
                return proxy;
            },
        };
        editor.instances.editor1 = proxy;
        return proxy;
    }

    window.RoundEditorCKEditor4Bootstrap = {
        ensureEditor1Proxy: ensureEditor1Proxy,
        register: function (name, facade) {
            var editor = ensureNamespace();
            editor.instances[name] = facade;

            var editor1 = editor.instances.editor1;
            if (!editor1 || editor1.__roundeditorCkeditor4Proxy) {
                var proxy = ensureEditor1Proxy();
                if (proxy !== facade) {
                    var pendingListeners = proxy.__roundeditorCkeditor4PendingListeners || [];
                    Object.defineProperties(proxy, Object.getOwnPropertyDescriptors(facade));
                    proxy.__roundeditorCkeditor4PendingListeners = [];
                    pendingListeners.forEach(function (item) { facade.on(item[0], item[1]); });
                }
                return proxy;
            }
            return facade;
        },
    };

    ensureEditor1Proxy();
}(window));
