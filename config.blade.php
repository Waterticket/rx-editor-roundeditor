@php

$roundeditorSequence = (int)($editor_sequence ?? 0);
$roundeditorModuleInfo = isset($module_info) && is_object($module_info)
    ? $module_info
    : Context::get('current_module_info');
$roundeditorUploadInfo = $_SESSION['upload_info'][$roundeditorSequence] ?? null;
$roundeditorColorset = in_array(($colorset ?? 'auto'), ['auto', 'light', 'dark'], true)
    ? $colorset
    : 'auto';
$roundeditorComponents = [];
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
    'autoDarkMode' => (bool)($editor_auto_dark_mode ?? true),
    'allowUpload' => (bool)($allow_fileupload ?? false),
    'allowHtml' => (bool)($allow_html ?? true),
    'htmlMode' => (bool)($html_mode ?? false),
    'enableAutosave' => (bool)($enable_autosave ?? false),
    'savedDocument' => $roundeditorSavedDocument,
    'autosavedMessage' => (string)($lang->msg_auto_saved ?? ''),
    'enableComponent' => (bool)($enable_component ?? false),
    'enableDefaultComponent' => (bool)($enable_default_component ?? false),
    'components' => $roundeditorComponents,
    'contentFont' => (string)($content_font ?: 'inherit'),
    'fontFamilies' => $roundeditorFontFamilies,
    'contentFontSize' => (string)($content_font_size ?: '15px'),
    'contentLineHeight' => (string)($content_line_height ?: '1.5'),
    'contentWordBreak' => (string)($content_word_break ?: 'normal'),
    'contentParagraphSpacing' => (string)($content_paragraph_spacing ?: '0'),
    'autoinsertTypes' => array_values($editor_autoinsert_types ?? []),
    'autoinsertPosition' => (string)($editor_autoinsert_position ?: 'paragraph'),
    'moduleSrl' => (int)(is_object($roundeditorUploadInfo)
        ? ($roundeditorUploadInfo->module_srl ?? 0)
        : (is_object($roundeditorModuleInfo) ? ($roundeditorModuleInfo->module_srl ?? 0) : 0)),
    'uploadTargetSrl' => (int)(is_object($roundeditorUploadInfo)
        ? ($roundeditorUploadInfo->upload_target_srl ?? 0)
        : ($document_srl ?? ($upload_target_srl ?? 0))),
    'mid' => (string)($mid ?? (is_object($roundeditorModuleInfo) ? ($roundeditorModuleInfo->mid ?? '') : (Context::get('mid') ?? ''))),
    'csrfToken' => (string)(Context::get('_rx_csrf_token') ?? ''),
    'stickerMaxSize' => 100,
    'labels' => is_array($roundeditorLabels) ? $roundeditorLabels : [],
];

$roundeditor_config_json = json_encode(
    $roundeditorConfig,
    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
);
$roundeditor_colorset = $roundeditorColorset;

unset(
    $roundeditorSequence,
    $roundeditorModuleInfo,
    $roundeditorUploadInfo,
    $roundeditorColorset,
    $roundeditorComponents,
    $roundeditorLabels,
    $roundeditorFontList,
    $roundeditorFontFamilies,
    $roundeditorFontFamily,
    $roundeditorComponentName,
    $roundeditorComponent,
    $roundeditorSavedDocument,
    $roundeditorConfig
);

@endphp
