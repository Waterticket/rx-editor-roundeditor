(function () {
    'use strict';

    var loader = document.currentScript;
    if (!loader) return;

    var version = String(loader.dataset.version || '').trim();
    var skinRoot = new URL('../', loader.src);
    var localCss = new URL('dist/roundeditor.css', skinRoot).href;
    var localJs = new URL('dist/roundeditor.min.js', skinRoot).href;
    var localAttachmentIcons = new URL('assets/attachment-icons.svg', skinRoot).href;
    var validVersion = /^[0-9A-Za-z](?:[0-9A-Za-z._-]*[0-9A-Za-z])?$/.test(version);

    function loadStylesheet(primaryUrl, fallbackUrl) {
        if (document.getElementById('RoundEditorStylesheet')) return;

        var link = document.createElement('link');
        link.id = 'RoundEditorStylesheet';
        link.rel = 'stylesheet';
        link.href = primaryUrl;
        if (fallbackUrl) {
            link.addEventListener('error', function () {
                link.href = fallbackUrl;
                link.dataset.fallback = 'local';
            }, { once: true });
        }
        document.head.appendChild(link);
    }

    function appendModule(url, isCdn) {
        var script = document.createElement('script');
        script.id = 'RoundEditorModule';
        script.type = 'module';
        script.src = url;
        if (isCdn) script.crossOrigin = 'anonymous';
        document.head.appendChild(script);
        return script;
    }

    function installCkeditorBootstrap() {
        if (window.RoundEditorCKEditor4Bootstrap) return;
        var editor = window.CKEDITOR = window.CKEDITOR || {};
        editor.instances = editor.instances || {};
        var proxy = editor.instances.editor1;
        if (!proxy) {
            var pendingListeners = [];
            proxy = {
                __roundeditorCkeditor4Proxy: true,
                __roundeditorCkeditor4PendingListeners: pendingListeners,
                on: function (name, listener) {
                    pendingListeners.push([name, listener]);
                    return proxy;
                },
            };
            editor.instances.editor1 = proxy;
        }
        window.RoundEditorCKEditor4Bootstrap = {
            ensureEditor1Proxy: function () { return editor.instances.editor1 || proxy; },
            register: function (name, facade) {
                editor.instances[name] = facade;
                var current = editor.instances.editor1;
                if (!current || current.__roundeditorCkeditor4Proxy) {
                    current = current || proxy;
                    var pending = current.__roundeditorCkeditor4PendingListeners || [];
                    Object.defineProperties(current, Object.getOwnPropertyDescriptors(facade));
                    current.__roundeditorCkeditor4PendingListeners = [];
                    pending.forEach(function (item) { facade.on(item[0], item[1]); });
                    editor.instances.editor1 = current;
                    return current;
                }
                return facade;
            },
        };
    }

    function loadModule(primaryUrl, fallbackUrl) {
        if (document.getElementById('RoundEditorModule')) return;

        var script = appendModule(primaryUrl, Boolean(fallbackUrl));
        if (fallbackUrl) {
            script.addEventListener('error', function () {
                script.remove();
                var fallback = appendModule(fallbackUrl, false);
                fallback.dataset.fallback = 'local';
            }, { once: true });
        }
    }

    function configureAttachmentIcons(url, prefix) {
        var selector = 'use[href*="attachment-icons.svg#"]';

        function update(root) {
            if (!root || root.nodeType !== 1) return;
            var uses = root.matches(selector) ? [root] : [];
            uses = uses.concat(Array.prototype.slice.call(root.querySelectorAll(selector)));
            uses.forEach(function (use) {
                var href = use.getAttribute('href') || '';
                var fragment = href.indexOf('#');
                if (fragment === -1) return;
                use.setAttribute('href', prefix
                    ? prefix + href.slice(fragment + 1)
                    : url + href.slice(fragment));
            });
        }

        window.RoundEditorAttachmentIconsUrl = url;
        window.RoundEditorAttachmentIconPrefix = prefix || '';
        update(document.documentElement);
        new MutationObserver(function (records) {
            records.forEach(function (record) {
                Array.prototype.forEach.call(record.addedNodes, update);
            });
        }).observe(document.documentElement, { childList: true, subtree: true });
    }

    function installAttachmentIcons(source, sourceUrl) {
        var namespace = 'http://www.w3.org/2000/svg';
        var prefix = 'RoundEditorAttachmentIcon-';
        var expected = ['upload', 'insert', 'trash', 'cover', 'play', 'cancel'];
        var parsed = new DOMParser().parseFromString(source, 'image/svg+xml');
        if (parsed.querySelector('parsererror')) throw new Error('Invalid RoundEditor icon sprite');

        var symbols = expected.map(function (name) {
            var symbol = parsed.getElementById(name);
            if (!symbol || symbol.localName !== 'symbol') throw new Error('Incomplete RoundEditor icon sprite');
            var clone = document.importNode(symbol, true);
            clone.id = prefix + name;
            clone.querySelectorAll('script, foreignObject, image, style').forEach(function (element) {
                element.remove();
            });
            var safeElements = [clone].concat(Array.prototype.slice.call(clone.querySelectorAll('*')));
            safeElements.forEach(function (element) {
                Array.prototype.slice.call(element.attributes).forEach(function (attribute) {
                    if (/^on/i.test(attribute.name) || /^(?:style|href|xlink:href)$/i.test(attribute.name)) {
                        element.removeAttribute(attribute.name);
                    }
                });
            });
            return clone;
        });

        var sprite = document.getElementById('RoundEditorAttachmentIconSprite');
        if (!sprite) {
            sprite = document.createElementNS(namespace, 'svg');
            sprite.id = 'RoundEditorAttachmentIconSprite';
            sprite.setAttribute('width', '0');
            sprite.setAttribute('height', '0');
            sprite.setAttribute('aria-hidden', 'true');
            sprite.setAttribute('focusable', 'false');
            document.body.prepend(sprite);
        }
        sprite.dataset.source = sourceUrl;
        sprite.replaceChildren.apply(sprite, symbols);
        configureAttachmentIcons(sourceUrl, '#' + prefix);
    }

    function fetchAttachmentIcons(url) {
        var controller = typeof AbortController === 'function' ? new AbortController() : null;
        var timeout = window.setTimeout(function () {
            if (controller) controller.abort();
        }, 3000);
        return fetch(url, {
            cache: 'force-cache',
            credentials: 'omit',
            mode: 'cors',
            signal: controller ? controller.signal : undefined,
        }).then(function (response) {
            if (!response.ok) throw new Error('Unable to load RoundEditor icon sprite');
            return response.text();
        }).finally(function () {
            window.clearTimeout(timeout);
        });
    }

    function loadAttachmentIcons(primaryUrl, fallbackUrl, callback) {
        fetchAttachmentIcons(primaryUrl)
            .then(function (source) {
                installAttachmentIcons(source, primaryUrl);
            })
            .catch(function () {
                return fetchAttachmentIcons(fallbackUrl).then(function (source) {
                    installAttachmentIcons(source, fallbackUrl);
                });
            })
            .catch(function () {
                configureAttachmentIcons(fallbackUrl, '');
            })
            .then(callback);
    }

    if (!validVersion) {
        installCkeditorBootstrap();
        loadStylesheet(localCss);
        loadAttachmentIcons(localAttachmentIcons, localAttachmentIcons, function () {
            loadModule(localJs);
        });
        return;
    }

    installCkeditorBootstrap();
    var cdnRoot = 'https://cdn.jsdelivr.net/gh/Waterticket/rx-editor-roundeditor@'
        + encodeURIComponent(version) + '/dist/';
    loadStylesheet(cdnRoot + 'roundeditor.css', localCss);
    loadAttachmentIcons(
        cdnRoot.replace(/dist\/$/, 'assets/') + 'attachment-icons.svg',
        localAttachmentIcons,
        function () {
            loadModule(cdnRoot + 'roundeditor.min.js', localJs);
        }
    );
}());
