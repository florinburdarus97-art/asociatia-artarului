'use strict';
// Testele astea nu pot instanția DOM-ul (zero dependențe npm, deci fără
// jsdom) — verificăm sursa lui js/main.js direct, la fel cum face deja
// formular.test.cjs pentru partialul de HTML. Scopul e să prindem regresii
// de poziționare a codului (I4, M4), nu comportamentul la runtime.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const mainJs = fs.readFileSync(path.join(__dirname, '..', 'js', 'main.js'), 'utf8');

function blocFormular() {
  const start = mainJs.indexOf('S5 - formular de contact');
  assert.ok(start !== -1, 'nu găsesc secțiunea S5 din main.js');
  const end = mainJs.indexOf('S6 - „Site viu"', start);
  return mainJs.slice(start, end === -1 ? undefined : end);
}

test('reset Turnstile rulează în .finally(), nu doar pe ramura de succes (I4)', () => {
  const bloc = blocFormular();
  const idxThen = bloc.indexOf('.then(function (res)');
  const idxFinally = bloc.indexOf('.finally(function ()');
  assert.ok(idxThen !== -1 && idxFinally !== -1, 'nu găsesc .then/.finally în handler-ul de submit');

  const blocThen = bloc.slice(idxThen, idxFinally);
  const blocFinally = bloc.slice(idxFinally);

  assert.ok(
    !/window\.turnstile\.reset\(\)/.test(blocThen),
    'reset() nu ar trebui apelat direct în ramura de succes — trebuie mutat în finally'
  );
  assert.ok(
    /window\.turnstile\.reset\(\)/.test(blocFinally),
    'reset() lipsește din blocul .finally() — la un eșec urmat de reîncercare, tokenul rămâne consumat'
  );
});

test('eroarea generală de la server (erori.general) e scrisă în paragraful #mesaj-eroare (M4)', () => {
  const bloc = blocFormular();
  assert.ok(
    bloc.includes("noteErrParagraf.textContent = erori.general"),
    'mesajul real al serverului nu mai e aruncat — trebuie scris în #mesaj-eroare'
  );
});

test('textul static implicit din #mesaj-eroare e restaurat când nu există erori.general (M4)', () => {
  const bloc = blocFormular();
  assert.ok(
    bloc.includes('noteErrHtmlImplicit'),
    'lipsește mecanismul de restaurare a textului implicit din #mesaj-eroare'
  );
  assert.ok(
    /else noteErrParagraf\.innerHTML = noteErrHtmlImplicit/.test(bloc),
    'ramura fără erori.general nu restaurează textul static implicit'
  );
});

// ---------------------------------------------------------------------
// Oglinda client/server (I2, M3): mesajele și regexurile din reguli din
// js/main.js trebuie să fie byte-identice cu api/_validare.js. O
// divergență aici înseamnă că userul vede text diferit după cum îl
// respinge stratul client sau cel server.
// ---------------------------------------------------------------------
const validareJs = fs.readFileSync(path.join(__dirname, '..', 'api', '_validare.js'), 'utf8');

test('mesajele de lungime maximă (I2) sunt identice în api/_validare.js și js/main.js', () => {
  const mesaje = [
    'Numele este prea lung (maxim 120 de caractere).',
    'Localitatea este prea lungă (maxim 120 de caractere).',
    'Numărul de telefon este prea lung (maxim 40 de caractere).',
    'Adresa de email este prea lungă (maxim 190 de caractere).',
    'Mesajul este prea lung (maxim 5000 de caractere).'
  ];
  for (const m of mesaje) {
    assert.ok(validareJs.includes(m), `lipsește din api/_validare.js: ${m}`);
    assert.ok(mainJs.includes(m), `lipsește din js/main.js: ${m}`);
  }
});

test('mesajele de bază (minim, format) rămân identice în ambele fișiere', () => {
  const mesaje = [
    'Te rugăm să îți scrii numele.',
    'Adaugă localitatea.',
    'Adaugă un număr de telefon valid.',
    'Adresa de email nu pare validă.',
    'Scrie-ne câteva detalii (minim 10 caractere).'
  ];
  for (const m of mesaje) {
    assert.ok(validareJs.includes(m), `lipsește din api/_validare.js: ${m}`);
    assert.ok(mainJs.includes(m), `lipsește din js/main.js: ${m}`);
  }
});

test('regexul de email înăsprit (M3) e byte-identic în api/_validare.js și js/main.js', () => {
  const regex = '/^[^\\s@,<>;"\']+@[^\\s@,<>;"\']+\\.[^\\s@,<>;"\']{2,}$/';
  assert.ok(validareJs.includes(regex), 'regexul de email din api/_validare.js nu se potrivește cu cel așteptat');
  assert.ok(mainJs.includes(regex), 'regexul de email din js/main.js nu se potrivește cu cel așteptat');
});

test('regexul de telefon rămâne identic în ambele fișiere', () => {
  const regex = '/^[0-9+()\\s.-]{6,}$/';
  assert.ok(validareJs.includes(regex), 'regexul de telefon din api/_validare.js nu se potrivește');
  assert.ok(mainJs.includes(regex), 'regexul de telefon din js/main.js nu se potrivește');
});
