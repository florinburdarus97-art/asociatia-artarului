<?php
/* ==========================================================================
   Asociația Arțarului - handler formular de contact (self-hosted, GDPR-friendly)
   Trimite mesajele către office@artarului.ro cu mail() de pe hostingul existent.
   - Fără JS (fallback): redirect către contact.html#mesaj-trimis / #mesaj-eroare
     (blocurile de status se afișează cu :target, deci merg fără JavaScript).
   - Cu JS (fetch, antet X-Requested-With): răspuns JSON, formularul rămâne pe pagină.
   ========================================================================== */

const DESTINATAR = 'office@artarului.ro';
const SUBIECT    = 'Mesaj nou de pe artarului.ro';

/* --- Utilitare --------------------------------------------------------- */

function este_ajax(): bool {
    $xrw = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';
    if (strtolower($xrw) === 'fetch') {
        return true;
    }
    return strpos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;
}

/** Elimină CR/LF ca să nu se poată injecta antete suplimentare (header injection). */
function o_linie(string $v): string {
    return trim(str_replace(["\r", "\n", "%0a", "%0d"], '', $v));
}

function raspunde($ok, array $erori = [], string $ancora = ''): void {
    if (este_ajax()) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code($ok ? 200 : 422);
        echo json_encode(['ok' => $ok, 'erori' => $erori], JSON_UNESCAPED_UNICODE);
    } else {
        header('Location: contact.html#' . ($ancora !== '' ? $ancora : ($ok ? 'mesaj-trimis' : 'mesaj-eroare')));
    }
    exit;
}

/* --- Doar POST --------------------------------------------------------- */

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    header('Location: contact.html');
    exit;
}

/* --- Anti-spam: honeypot (câmp ascuns care trebuie să rămână gol) ------- */

if (!empty($_POST['website'] ?? '')) {
    raspunde(true); // botul crede că a reușit; nu trimitem nimic
}

/* --- Preluare + validare ---------------------------------------------- */

$nume    = o_linie($_POST['nume']    ?? '');
$telefon = o_linie($_POST['telefon'] ?? '');
$email   = o_linie($_POST['email']   ?? '');
$mesaj   = trim($_POST['mesaj']      ?? '');

$erori = [];

if (mb_strlen($nume) < 2) {
    $erori['nume'] = 'Te rugăm să îți scrii numele.';
}
if ($telefon === '' || !preg_match('/^[0-9+()\s.-]{6,}$/', $telefon)) {
    $erori['telefon'] = 'Adaugă un număr de telefon valid.';
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $erori['email'] = 'Adresa de email nu pare validă.';
}
if (mb_strlen($mesaj) < 10) {
    $erori['mesaj'] = 'Scrie-ne câteva detalii (minim 10 caractere).';
}

if ($erori) {
    raspunde(false, $erori);
}

/* --- Compunere + trimitere e-mail ------------------------------------- */

$corp  = "Mesaj nou primit prin formularul de pe artarului.ro\n";
$corp .= str_repeat('-', 48) . "\n\n";
$corp .= "Nume:    {$nume}\n";
$corp .= "Telefon: {$telefon}\n";
$corp .= "Email:   {$email}\n\n";
$corp .= "Mesaj:\n{$mesaj}\n";

$antete  = 'From: Website Arțarului <no-reply@artarului.ro>' . "\r\n";
$antete .= 'Reply-To: ' . $nume . ' <' . $email . '>' . "\r\n";
$antete .= 'Content-Type: text/plain; charset=utf-8' . "\r\n";
$antete .= 'X-Mailer: PHP/' . phpversion();

$trimis = @mail(DESTINATAR, '=?UTF-8?B?' . base64_encode(SUBIECT) . '?=', $corp, $antete);

if ($trimis) {
    raspunde(true);
} else {
    raspunde(false, ['general' => 'Mesajul nu a putut fi trimis acum. Încearcă din nou sau sună-ne direct.']);
}
