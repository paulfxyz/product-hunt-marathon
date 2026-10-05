<?php
// Public read-only calendar. No accounts, database or private calendar access.
// PHP bypasses the host's six-month static-file cache for unknown extensions.
header('Content-Type: text/calendar; charset=utf-8');
header('Content-Disposition: ' . (isset($_GET['download']) ? 'attachment' : 'inline') . '; filename="weekathon.ics"');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('X-Accel-Expires: 0');
header('X-Content-Type-Options: nosniff');
$calendar = __DIR__ . '/calendar.ics';
if (!is_readable($calendar)) {
    http_response_code(503);
    exit;
}
readfile($calendar);
