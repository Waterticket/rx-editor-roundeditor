<?php

define('__XE__', true);
require dirname(__DIR__, 5) . '/common/autoload.php';

\Rhymix\Framework\Config::init();

$input = json_decode(stream_get_contents(STDIN), true, 512, JSON_THROW_ON_ERROR);
$output = array_map(
    static fn(string $html): string => \Rhymix\Framework\Filters\HTMLFilter::clean($html),
    $input
);

echo json_encode($output, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
