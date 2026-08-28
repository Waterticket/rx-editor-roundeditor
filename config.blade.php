@php

$rxeditorSequence = (int)($editor_sequence ?? 0);
$rxeditorModuleInfo = isset($module_info) && is_object($module_info)
    ? $module_info
    : Context::get('current_module_info');
$rxeditorUploadInfo = $_SESSION['upload_info'][$rxeditorSequence] ?? null;
$rxeditorColorset = in_array(($colorset ?? 'auto'), ['auto', 'light', 'dark'], true)
    ? $colorset
    : 'auto';
$rxeditorComponents = [];

foreach ($component_list ?? [] as $rxeditorComponentName => $rxeditorComponent) {
    $rxeditorComponents[(string)$rxeditorComponentName] = escape($rxeditorComponent->title, false);
}

$rxeditorSavedDocument = null;
if (!empty($saved_doc)) {
    $rxeditorSavedDocument = [
        'title' => (string)($saved_doc->title ?? ''),
        'content' => (string)($saved_doc->content ?? ''),
        'documentSrl' => (int)($saved_doc->document_srl ?? 0),
        'message' => (string)($lang->msg_load_saved_doc ?? ''),
    ];
}

$rxeditorConfig = [
    'editorSequence' => $rxeditorSequence,
    'primaryKeyName' => (string)($editor_primary_key_name ?? 'document_srl'),
    'contentKeyName' => (string)($editor_content_key_name ?? 'content'),
    'height' => max(300, (int)($editor_height ?? 300)),
    'toolbar' => (string)($editor_toolbar ?? 'default'),
    'hideToolbar' => (bool)($editor_toolbar_hide ?? false),
    'focus' => (bool)($editor_focus ?? false),
    'colorset' => $rxeditorColorset,
    'autoDarkMode' => (bool)($editor_auto_dark_mode ?? true),
    'allowUpload' => (bool)($allow_fileupload ?? false),
    'allowHtml' => (bool)($allow_html ?? true),
    'htmlMode' => (bool)($html_mode ?? false),
    'enableAutosave' => (bool)($enable_autosave ?? false),
    'savedDocument' => $rxeditorSavedDocument,
    'autosavedMessage' => (string)($lang->msg_auto_saved ?? ''),
    'enableComponent' => (bool)($enable_component ?? false),
    'enableDefaultComponent' => (bool)($enable_default_component ?? false),
    'components' => $rxeditorComponents,
    'contentFont' => (string)($content_font ?: 'inherit'),
    'contentFontSize' => (string)($content_font_size ?: '15px'),
    'contentLineHeight' => (string)($content_line_height ?: '1.5'),
    'contentWordBreak' => (string)($content_word_break ?: 'normal'),
    'contentParagraphSpacing' => (string)($content_paragraph_spacing ?: '0'),
    'autoinsertTypes' => array_values($editor_autoinsert_types ?? []),
    'autoinsertPosition' => (string)($editor_autoinsert_position ?: 'paragraph'),
    'moduleSrl' => (int)(is_object($rxeditorUploadInfo)
        ? ($rxeditorUploadInfo->module_srl ?? 0)
        : (is_object($rxeditorModuleInfo) ? ($rxeditorModuleInfo->module_srl ?? 0) : 0)),
    'uploadTargetSrl' => (int)(is_object($rxeditorUploadInfo)
        ? ($rxeditorUploadInfo->upload_target_srl ?? 0)
        : ($document_srl ?? ($upload_target_srl ?? 0))),
    'mid' => (string)($mid ?? (is_object($rxeditorModuleInfo) ? ($rxeditorModuleInfo->mid ?? '') : (Context::get('mid') ?? ''))),
    'csrfToken' => (string)(Context::get('_rx_csrf_token') ?? ''),
];

$rxeditor_config_json = json_encode(
    $rxeditorConfig,
    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
);
$rxeditor_colorset = $rxeditorColorset;

unset(
    $rxeditorSequence,
    $rxeditorModuleInfo,
    $rxeditorUploadInfo,
    $rxeditorColorset,
    $rxeditorComponents,
    $rxeditorComponentName,
    $rxeditorComponent,
    $rxeditorSavedDocument,
    $rxeditorConfig
);

@endphp
