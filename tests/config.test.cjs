'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const sursa = fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8');

test('vercel.json rămâne JSON valid (I5)', () => {
  assert.doesNotThrow(() => JSON.parse(sursa));
});

test('assets generice au cache scurt, revalidabil — nu sunt hashate în nume (I5)', () => {
  const cfg = JSON.parse(sursa);
  const regula = cfg.headers.find((h) => h.source === '/assets/(.*)');
  assert.ok(regula, 'lipsește regula pentru /assets/(.*)');
  const cacheControl = regula.headers.find((h) => h.key === 'Cache-Control');
  assert.strictEqual(cacheControl.value, 'public, max-age=86400, must-revalidate');
});

test('fonturile păstrează cache lung și imuabil (I5)', () => {
  const cfg = JSON.parse(sursa);
  const regula = cfg.headers.find((h) => h.source === '/assets/fonts/(.*)');
  assert.ok(regula, 'lipsește regula pentru /assets/fonts/(.*)');
  const cacheControl = regula.headers.find((h) => h.key === 'Cache-Control');
  assert.strictEqual(cacheControl.value, 'public, max-age=31536000, immutable');
});

test('regula de fonturi vine DUPĂ regula generică de assets, ca să nu fie umbrită (I5)', () => {
  const cfg = JSON.parse(sursa);
  const idxGeneric = cfg.headers.findIndex((h) => h.source === '/assets/(.*)');
  const idxFonturi = cfg.headers.findIndex((h) => h.source === '/assets/fonts/(.*)');
  assert.ok(idxGeneric !== -1 && idxFonturi !== -1);
  assert.ok(
    idxFonturi > idxGeneric,
    'la reguli de headers care se potrivesc pe aceeași cale, ultima câștigă — fonturile trebuie să vină după regula generică'
  );
});

// M5 — cele șase pagini trebuie să servească exact aceleași versiuni de
// css/style.css și js/main.js, altfel cache-ul mai scurt de pe /assets nu
// ajută dacă paginile rămân blocate pe un ?v= vechi.
const PAGINI = ['index.html', 'despre.html', 'portofoliu.html', 'proiecte.html', 'servicii.html', 'contact.html'];

test('toate cele șase pagini folosesc ?v=20260820-nav pentru css/style.css și js/main.js (M5)', () => {
  for (const pagina of PAGINI) {
    const html = fs.readFileSync(path.join(__dirname, '..', pagina), 'utf8');
    assert.ok(html.includes('css/style.css?v=20260820-nav'), `${pagina}: css/style.css nu e la v=20260820-nav`);
    assert.ok(html.includes('js/main.js?v=20260820-nav'), `${pagina}: js/main.js nu e la v=20260820-nav`);
  }
});
