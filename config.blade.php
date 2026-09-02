@php

$roundeditorSequence = (int)($editor_sequence ?? 0);
$roundeditorModuleInfo = isset($module_info) && is_object($module_info)
    ? $module_info
    : Context::get('current_module_info');
$roundeditorUploadInfo = $_SESSION['upload_info'][$roundeditorSequence] ?? null;
$roundeditorColorset = in_array(($colorset ?? 'auto'), ['auto', 'light', 'dark'], true)
    ? $colorset
    : 'auto';
$roundeditorAutoDarkMode = (bool)($editor_auto_dark_mode ?? true);
if ($roundeditorColorset === 'auto' && !$roundeditorAutoDarkMode) {
    $roundeditorColorset = 'light';
}
$roundeditorAdditionalPlugins = $editor_additional_plugins ?? [];
if ($roundeditorAdditionalPlugins instanceof Traversable) {
    $roundeditorAdditionalPlugins = iterator_to_array($roundeditorAdditionalPlugins);
}
$roundeditorNormalizedPlugins = [];
foreach (is_array($roundeditorAdditionalPlugins) ? $roundeditorAdditionalPlugins : [] as $roundeditorPlugin) {
    $roundeditorNormalizedPlugins[] = trim((string)$roundeditorPlugin);
}
$roundeditorAdditionalPlugins = $roundeditorNormalizedPlugins;
$roundeditorUseJsdelivrCdn = in_array('jsdelivr-cdn', $roundeditorAdditionalPlugins, true);
$roundeditorAssetVersion = '';
$roundeditorRenderJsdelivrLoader = false;
$roundeditorJsdelivrLoaderUrl = '';
if ($roundeditorUseJsdelivrCdn) {
    $roundeditorSkinPath = \RX_BASEDIR . 'modules/editor/skins/roundeditor/';
    $roundeditorSkinInfo = \Rhymix\Framework\Parsers\SkinInfoParser::loadXML(
        $roundeditorSkinPath . 'skin.xml',
        'roundeditor',
        $roundeditorSkinPath
    );
    $roundeditorAssetVersion = trim((string)($roundeditorSkinInfo->version ?? ''));
    if (!preg_match('/^[0-9A-Za-z](?:[0-9A-Za-z._-]*[0-9A-Za-z])?$/', $roundeditorAssetVersion)) {
        $roundeditorUseJsdelivrCdn = false;
        $roundeditorAssetVersion = '';
    } elseif (!Context::get('__roundeditor_jsdelivr_loader_registered')) {
        Context::set('__roundeditor_jsdelivr_loader_registered', true);
        $roundeditorRenderJsdelivrLoader = true;
        $roundeditorJsdelivrLoaderUrl = rtrim((string)\RX_BASEURL, '/')
            . '/modules/editor/skins/roundeditor/js/jsdelivr-loader.js?v='
            . rawurlencode($roundeditorAssetVersion);
    }
}
$roundeditorComponents = [];
$roundeditorOembedAvailable = is_file(\RX_BASEDIR . 'modules/oembed/conf/module.xml');
$roundeditorOembedSkin = 'default';
$roundeditorOembedAssets = [];
if ($roundeditorOembedAvailable) {
    $roundeditorOembedConfig = ModuleModel::getModuleConfig('oembed');
    $roundeditorOembedSkinCandidate = is_object($roundeditorOembedConfig)
        ? (string)($roundeditorOembedConfig->skin ?? 'default')
        : 'default';
    if (preg_match('/^[a-zA-Z0-9_-]+$/', $roundeditorOembedSkinCandidate)
        && is_dir(\RX_BASEDIR . 'modules/oembed/skins/' . $roundeditorOembedSkinCandidate)) {
        $roundeditorOembedSkin = $roundeditorOembedSkinCandidate;
    }
    Context::loadFile(['./modules/oembed/tpl/css/style.css', '', '', null], true);
    $roundeditorOembedSkinCss = './modules/oembed/skins/' . $roundeditorOembedSkin . '/card.css';
    if (is_file(\RX_BASEDIR . ltrim($roundeditorOembedSkinCss, '/.'))) {
        Context::loadFile([$roundeditorOembedSkinCss, '', '', null], true);
    }
    if (class_exists(\Rhymix\Modules\Oembed\Models\Registry::class)) {
        foreach (\Rhymix\Modules\Oembed\Models\Registry::getProviders(false) as $roundeditorOembedProvider) {
            foreach ($roundeditorOembedProvider->getEmbedAssets() as $roundeditorOembedAsset) {
                $roundeditorOembedSelector = isset($roundeditorOembedAsset['selector'])
                    ? (string)$roundeditorOembedAsset['selector']
                    : '';
                $roundeditorOembedScript = isset($roundeditorOembedAsset['script'])
                    ? (string)$roundeditorOembedAsset['script']
                    : '';
                if ($roundeditorOembedSelector === '' || $roundeditorOembedScript === '') {
                    continue;
                }
                $roundeditorOembedNormalize = [];
                foreach (is_array($roundeditorOembedAsset['normalize'] ?? null)
                    ? $roundeditorOembedAsset['normalize']
                    : [] as $roundeditorOembedRule) {
                    $roundeditorOembedDetect = isset($roundeditorOembedRule['detect'])
                        ? (string)$roundeditorOembedRule['detect']
                        : '';
                    $roundeditorOembedAddClass = isset($roundeditorOembedRule['addClass'])
                        ? (string)$roundeditorOembedRule['addClass']
                        : '';
                    if ($roundeditorOembedDetect !== '' && $roundeditorOembedAddClass !== '') {
                        $roundeditorOembedNormalize[] = [
                            'detect' => $roundeditorOembedDetect,
                            'addClass' => $roundeditorOembedAddClass,
                        ];
                    }
                }
                $roundeditorOembedAssets[] = [
                    'selector' => $roundeditorOembedSelector,
                    'script' => $roundeditorOembedScript,
                    'crossorigin' => !empty($roundeditorOembedAsset['crossorigin']),
                    'normalize' => $roundeditorOembedNormalize,
                ];
            }
        }
    }
}
$roundeditorLabels = $lang->roundeditor_labels ?? [];
if ($roundeditorLabels instanceof Traversable) {
    $roundeditorLabels = iterator_to_array($roundeditorLabels);
}
$roundeditorFontList = $lang->edit->fontlist ?? [];
if ($roundeditorFontList instanceof Traversable) {
    $roundeditorFontList = iterator_to_array($roundeditorFontList);
}
$roundeditorFontFamilies = [];
foreach (array_values(is_array($roundeditorFontList) ? $roundeditorFontList : []) as $roundeditorFontFamily) {
    $roundeditorFontFamily = (string)$roundeditorFontFamily;
    $roundeditorFontFamilies[] = [
        'label' => trim(array_first(explode(',', $roundeditorFontFamily, 2)), "'\" "),
        'value' => $roundeditorFontFamily,
    ];
}
if (($content_font ?? '') && !in_array((string)$content_font, array_column($roundeditorFontFamilies, 'value'), true)) {
    array_unshift($roundeditorFontFamilies, [
        'label' => trim(array_first(explode(',', (string)$content_font, 2)), "'\" "),
        'value' => (string)$content_font,
    ]);
}

foreach ($component_list ?? [] as $roundeditorComponentName => $roundeditorComponent) {
    $roundeditorComponents[(string)$roundeditorComponentName] = escape($roundeditorComponent->title, false);
}

$roundeditorSavedDocument = null;
if (!empty($saved_doc)) {
    $roundeditorSavedDocument = [
        'title' => (string)($saved_doc->title ?? ''),
        'content' => (string)($saved_doc->content ?? ''),
        'documentSrl' => (int)($saved_doc->document_srl ?? 0),
        'message' => (string)($lang->msg_load_saved_doc ?? ''),
    ];
}

$roundeditorConfig = [
    'editorSequence' => $roundeditorSequence,
    'primaryKeyName' => (string)($editor_primary_key_name ?? 'document_srl'),
    'contentKeyName' => (string)($editor_content_key_name ?? 'content'),
    'height' => max(300, (int)($editor_height ?? 300)),
    'toolbar' => (string)($editor_toolbar ?? 'default'),
    'hideToolbar' => (bool)($editor_toolbar_hide ?? false),
    'focus' => (bool)($editor_focus ?? false),
    'colorset' => $roundeditorColorset,
    'autoDarkMode' => $roundeditorAutoDarkMode,
    'allowUpload' => (bool)($allow_fileupload ?? false),
    'allowHtml' => (bool)($allow_html ?? true),
    'htmlMode' => (bool)($html_mode ?? false) && (bool)($allow_html ?? true),
    'enableAutosave' => (bool)($enable_autosave ?? false),
    'savedDocument' => $roundeditorSavedDocument,
    'autosavedMessage' => (string)($lang->msg_auto_saved ?? ''),
    'enableComponent' => (bool)($enable_component ?? false),
    'enableDefaultComponent' => (bool)($enable_default_component ?? false),
    'components' => $roundeditorComponents,
    'oembedAvailable' => $roundeditorOembedAvailable,
    'oembedAssets' => $roundeditorOembedAssets,
    'contentFont' => (string)($content_font ?: 'inherit'),
    'fontFamilies' => $roundeditorFontFamilies,
    'contentFontSize' => (string)($content_font_size ?: '15px'),
    'contentLineHeight' => (string)($content_line_height ?: '1.5'),
    'contentWordBreak' => (string)($content_word_break ?: 'normal'),
    'contentParagraphSpacing' => (string)($content_paragraph_spacing ?: '0'),
    'contentCss' => array_values(array_filter(array_map('strval', $editor_additional_css ?? []))),
    'autoinsertTypes' => (object)($editor_autoinsert_types ?? []),
    'autoinsertPosition' => (string)($editor_autoinsert_position ?: 'paragraph'),
    'moduleSrl' => (int)(is_object($roundeditorUploadInfo)
        ? ($roundeditorUploadInfo->module_srl ?? 0)
        : (is_object($roundeditorModuleInfo) ? ($roundeditorModuleInfo->module_srl ?? 0) : 0)),
    'uploadTargetSrl' => (int)(is_object($roundeditorUploadInfo)
        ? ($roundeditorUploadInfo->upload_target_srl ?? 0)
        : ($document_srl ?? ($upload_target_srl ?? 0))),
    'mid' => (string)($mid ?? (is_object($roundeditorModuleInfo) ? ($roundeditorModuleInfo->mid ?? '') : (Context::get('mid') ?? ''))),
    'csrfToken' => (string)(Context::get('_rx_csrf_token') ?? ''),
    'labels' => is_array($roundeditorLabels) ? $roundeditorLabels : [],
];

// Extension approval must happen before the config is serialized. The trigger
// itself is the trust boundary for entrypoint scripts; browser runtime assets
// remain subject to their separate allowlist.
$roundeditorExtensionContext = (object) [
    'editor_sequence' => $roundeditorConfig['editorSequence'],
    'module_srl' => $roundeditorConfig['moduleSrl'],
    'upload_target_srl' => $roundeditorConfig['uploadTargetSrl'],
    'mid' => $roundeditorConfig['mid'],
    'extensions' => [],
];
$roundeditorExtensionResult = ModuleHandler::triggerCall(
    'editor.roundeditor.extensions',
    'before',
    $roundeditorExtensionContext
);
$roundeditorExtensionScripts = [];
$roundeditorApprovedExtensions = [];
if ($roundeditorExtensionResult instanceof BaseObject && !$roundeditorExtensionResult->toBool()) {
    $roundeditorConfig['extensionHostFailure'] = (string)($roundeditorExtensionResult->getMessage() ?: 'Extension approval trigger failed.');
} else {
    foreach (is_array($roundeditorExtensionContext->extensions ?? null) ? $roundeditorExtensionContext->extensions : [] as $roundeditorDescriptor) {
        $roundeditorDescriptor = is_object($roundeditorDescriptor) ? get_object_vars($roundeditorDescriptor) : $roundeditorDescriptor;
        if (!is_array($roundeditorDescriptor)) continue;
        $roundeditorExtensionId = trim((string)($roundeditorDescriptor['id'] ?? ''));
        $roundeditorExtensionScript = trim((string)($roundeditorDescriptor['script'] ?? ''));
        if (!preg_match('/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/', $roundeditorExtensionId)) continue;
        if (!preg_match('~^(?:https://|/|\./|\.\./)[^\x00-\x1F]+$~', $roundeditorExtensionScript)) continue;
        if (!str_starts_with($roundeditorExtensionScript, 'https://')) {
            $roundeditorExtensionScript = rtrim((string)\RX_BASEURL, '/') . '/' . ltrim($roundeditorExtensionScript, './');
        }
        $roundeditorExtensionMode = in_array(($roundeditorDescriptor['mode'] ?? 'extension'), ['extension', 'integration', 'both'], true)
            ? $roundeditorDescriptor['mode'] : 'extension';
        $roundeditorExtensionFormat = ($roundeditorDescriptor['format'] ?? 'classic') === 'module' ? 'module' : 'classic';
        $roundeditorExtensionRequired = (bool)($roundeditorDescriptor['required'] ?? false);
        $roundeditorExtensionPriority = max(-100, min(100, (int)($roundeditorDescriptor['priority'] ?? 0)));
        $roundeditorExtensionScripts[] = [
            'id' => $roundeditorExtensionId,
            'script' => $roundeditorExtensionScript,
            'mode' => $roundeditorExtensionMode,
            'format' => $roundeditorExtensionFormat,
            'required' => $roundeditorExtensionRequired,
            'priority' => $roundeditorExtensionPriority,
        ];
        if ($roundeditorExtensionMode !== 'integration') {
            $roundeditorApprovedExtensions[] = [
                'id' => $roundeditorExtensionId,
                'required' => $roundeditorExtensionRequired,
                'config' => is_array($roundeditorDescriptor['config'] ?? null) || is_object($roundeditorDescriptor['config'] ?? null)
                    ? $roundeditorDescriptor['config'] : (object)[],
            ];
        }
    }
    $roundeditorExtensionPriorities = array_column($roundeditorExtensionScripts, 'priority');
    $roundeditorExtensionIds = array_column($roundeditorExtensionScripts, 'id');
    array_multisort(
        $roundeditorExtensionPriorities,
        SORT_DESC,
        SORT_NUMERIC,
        $roundeditorExtensionIds,
        SORT_ASC,
        SORT_STRING,
        $roundeditorExtensionScripts
    );
    $roundeditorConfig['extensionScripts'] = $roundeditorExtensionScripts;
    $roundeditorConfig['approvedExtensions'] = $roundeditorApprovedExtensions;
}

$roundeditor_config_json = json_encode(
    $roundeditorConfig,
    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
);
$roundeditor_colorset = $roundeditorColorset;
$roundeditor_use_jsdelivr_cdn = $roundeditorUseJsdelivrCdn;
$roundeditor_asset_version = $roundeditorAssetVersion;
$roundeditor_render_jsdelivr_loader = $roundeditorRenderJsdelivrLoader;
$roundeditor_jsdelivr_loader_url = $roundeditorJsdelivrLoaderUrl;

unset(
    $roundeditorSequence,
    $roundeditorModuleInfo,
    $roundeditorUploadInfo,
    $roundeditorColorset,
    $roundeditorAutoDarkMode,
    $roundeditorAdditionalPlugins,
    $roundeditorNormalizedPlugins,
    $roundeditorPlugin,
    $roundeditorUseJsdelivrCdn,
    $roundeditorAssetVersion,
    $roundeditorRenderJsdelivrLoader,
    $roundeditorJsdelivrLoaderUrl,
    $roundeditorSkinPath,
    $roundeditorSkinInfo,
    $roundeditorComponents,
    $roundeditorOembedAvailable,
    $roundeditorOembedSkin,
    $roundeditorOembedConfig,
    $roundeditorOembedSkinCandidate,
    $roundeditorOembedSkinCss,
    $roundeditorOembedAssets,
    $roundeditorOembedProvider,
    $roundeditorOembedAsset,
    $roundeditorOembedSelector,
    $roundeditorOembedScript,
    $roundeditorOembedNormalize,
    $roundeditorOembedRule,
    $roundeditorOembedDetect,
    $roundeditorOembedAddClass,
    $roundeditorLabels,
    $roundeditorFontList,
    $roundeditorFontFamilies,
    $roundeditorFontFamily,
    $roundeditorComponentName,
    $roundeditorComponent,
    $roundeditorSavedDocument,
    $roundeditorExtensionContext,
    $roundeditorExtensionResult,
    $roundeditorExtensionScripts,
    $roundeditorApprovedExtensions,
    $roundeditorDescriptor,
    $roundeditorExtensionId,
    $roundeditorExtensionScript,
    $roundeditorExtensionMode,
    $roundeditorExtensionFormat,
    $roundeditorExtensionRequired,
    $roundeditorExtensionPriority,
    $roundeditorConfig
);

@endphp
