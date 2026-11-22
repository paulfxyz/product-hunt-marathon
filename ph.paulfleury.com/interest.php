<?php
declare(strict_types=1);
// Optional Weekathon interest capture. No mail, newsletter or public read endpoint.
ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private, max-age=0');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow');

function respond(int $status, string $code): void {
    http_response_code($status);
    echo json_encode(['ok' => $status === 200, 'code' => $code]);
    exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405, 'method_not_allowed');
}
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = ['https://ph.paulfleury.com'];
// The PHP development server is never the production host.
if (PHP_SAPI === 'cli-server') {
    $allowed[] = 'http://127.0.0.1:3211';
    $allowed[] = 'http://localhost:3211';
}
if (!in_array($origin, $allowed, true)) respond(403, 'origin_not_allowed');
if (strpos(strtolower($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json') !== 0) respond(415, 'json_required');
if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 4096) respond(413, 'too_large');
$body = file_get_contents('php://input', false, null, 0, 4097);
if ($body === false || strlen($body) > 4096) respond(413, 'too_large');
$input = json_decode($body, true);
if (!is_array($input)) respond(400, 'invalid_json');
if (!empty($input['website'])) respond(400, 'invalid_submission');
if (($input['notice'] ?? '') !== 'weekathon-interest-v1') respond(400, 'notice_required');
$email = is_string($input['email'] ?? null) ? trim($input['email']) : '';
if (strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) respond(422, 'invalid_email');
$languages = ['en', 'fr', 'zh', 'es', 'pt', 'ar', 'he', 'hi', 'bn', 'id'];
$language = in_array($input['language'] ?? '', $languages, true) ? $input['language'] : 'en';

// Outside public_html. Never move this store into the downloadable site bundle.
$directory = dirname(__DIR__) . '/weekathon-private';
$lock = null;
$temporary = null;
try {
    if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) throw new RuntimeException('directory');
    if (!is_writable($directory)) throw new RuntimeException('permissions');
    $lock = fopen($directory . '/interest.lock', 'c');
    if (!$lock || !flock($lock, LOCK_EX)) throw new RuntimeException('lock');
    @chmod($directory . '/interest.lock', 0600);
    $path = $directory . '/interest.json';
    if (is_file($path)) {
        if (filesize($path) > 8388608) throw new RuntimeException('capacity');
        $data = json_decode((string)file_get_contents($path), true);
        if (!is_array($data) || !isset($data['salt'], $data['emails'], $data['rates'])) throw new RuntimeException('invalid_store');
    } else {
        $data = ['schema' => 1, 'salt' => bin2hex(random_bytes(32)), 'emails' => [], 'rates' => []];
    }
    $now = time();
    // Keep only the current hour's pseudonymous abuse counters; never store raw IPs.
    $hour = (int)floor($now / 3600);
    foreach ($data['rates'] as $key => $rate) if ($rate['hour'] !== $hour) unset($data['rates'][$key]);
    $rateKey = hash_hmac('sha256', $hour . ':' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'), $data['salt']);
    $count = $data['rates'][$rateKey]['count'] ?? 0;
    if ($count >= 30 || count($data['rates']) > 10000) {
        flock($lock, LOCK_UN); fclose($lock);
        header('Retry-After: 3600');
        respond(429, 'rate_limited');
    }
    $data['rates'][$rateKey] = ['hour' => $hour, 'count' => $count + 1];
    $emailKey = hash('sha256', strtolower($email));
    if (!isset($data['emails'][$emailKey])) {
        if (count($data['emails']) >= 10000) throw new RuntimeException('capacity');
        $data['emails'][$emailKey] = [
            'email' => $email,
            'created_at' => gmdate('c', $now),
            'language' => $language,
            'notice_version' => 'weekathon-interest-v1',
            'purpose' => 'weekathon-interest',
            'newsletter_opt_in' => false,
            'verified' => false
        ];
    }
    $encoded = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    $temporary = tempnam($directory, '.interest-');
    if (!$temporary || file_put_contents($temporary, $encoded) !== strlen($encoded)) throw new RuntimeException('write');
    if (!chmod($temporary, 0600) || !rename($temporary, $path)) throw new RuntimeException('commit');
    $temporary = null;
    flock($lock, LOCK_UN); fclose($lock);
    respond(200, 'saved');
} catch (Throwable $e) {
    if ($temporary && is_file($temporary)) @unlink($temporary);
    if (is_resource($lock)) { flock($lock, LOCK_UN); fclose($lock); }
    // Do not log submitted addresses, request bodies or internal file paths.
    respond(503, 'storage_unavailable');
}
