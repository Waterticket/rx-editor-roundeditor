<?php

define('__XE__', true);
require dirname(__DIR__, 5) . '/common/autoload.php';

\Rhymix\Framework\Config::init();

$args = new stdClass();
$args->page = 1;
$args->list_count = 500;
$output = executeQueryArray('document.getDocumentList', $args);

if (!$output->toBool()) {
    fwrite(STDERR, $output->getMessage() . PHP_EOL);
    exit(1);
}

$documents = array_map(
    static fn(object $document): array => [
        'document_srl' => (string) $document->document_srl,
        'content' => (string) $document->content,
    ],
    array_values($output->data ?? [])
);

echo json_encode($documents, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
