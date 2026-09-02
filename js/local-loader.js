(function () {
    'use strict';
    var loader = document.currentScript;
    var skinRoot = new URL('../', loader?.src || document.baseURI);
    var moduleUrl = new URL('dist/roundeditor.min.js', skinRoot).href;

    function appendModule() {
        if (document.getElementById('RoundEditorModule')) return;
        var script = document.createElement('script');
        script.id = 'RoundEditorModule'; script.type = 'module'; script.src = moduleUrl;
        document.head.appendChild(script);
    }
    function start() {
        var barrier = window.RoundEditor?._extensionHost?.prepareFromDocument?.() || Promise.resolve();
        Promise.resolve(barrier).then(appendModule).catch(function (error) {
            document.querySelectorAll('.roundeditor').forEach(function (wrapper) {
                wrapper.classList.add('roundeditor--error');
                var surface = wrapper.querySelector('.roundeditor__surface');
                if (surface) surface.textContent = 'roundeditor extension initialization failed.\n' + (error.message || error);
            });
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
}());
