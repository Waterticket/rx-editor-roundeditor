@include('config')

@load('^/common/css/xeicon/xeicon.min.css')
@load('../../tpl/js/editor_common.js')
@load('dist/roundeditor.css')
@load('dist/roundeditor.min.js', 'module')

<div id="roundeditor_instance_{{ $editor_sequence }}"
    class="roundeditor roundeditor--{{ $roundeditor_colorset }}"
    data-editor-sequence="{{ $editor_sequence }}"
    data-editor-primary-key-name="{{ $editor_primary_key_name }}"
    data-editor-content-key-name="{{ $editor_content_key_name }}"
    data-editor-config="{{ $roundeditor_config_json }}">
    <div class="roundeditor__loading" role="status" aria-live="polite">{{ $lang->roundeditor_loading }}</div>
    <div class="roundeditor__surface"></div>
</div>

@if ($enable_autosave)
<p id="editor_autosaved_message_{{ $editor_sequence }}" class="editor_autosaved_message autosave_message">&nbsp;</p>
<input type="hidden" name="_saved_doc_title" value="{{ empty($saved_doc) ? '' : $saved_doc->title }}" />
<input type="hidden" name="_saved_doc_content" value="{{ empty($saved_doc) ? '' : $saved_doc->content }}" />
<input type="hidden" name="_saved_doc_document_srl" value="{{ empty($saved_doc) ? '' : $saved_doc->document_srl }}" />
<input type="hidden" name="_saved_doc_message" value="{{ $lang->msg_load_saved_doc }}" />
@endif

@if ($allow_fileupload)
@include('../ckeditor/file_upload.html')
@endif
