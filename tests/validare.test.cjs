'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { valideaza, oLinie, redirectSigur } = require('../api/_validare.js');

const ACUM = 1_800_000_000_000;
const bun = {
  formular: 'contact',
  nume: 'Ion Popescu',
  telefon: '0734 032 624',
  email: 'ion@exemplu.ro',
  mesaj: 'Aș dori detalii despre acreditare.',
  website: '',
  ts: String(ACUM - 10_000)
};

test('oLinie elimină CR și LF', () => {
  assert.strictEqual(oLinie('Ion\r\nBcc: rau@x.ro'), 'Ion Bcc: rau@x.ro');
});

test('formular de contact valid trece', () => {
  const r = valideaza(bun, { acum: ACUM });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.curat.nume, 'Ion Popescu');
  assert.strictEqual(r.curat.tip, 'contact');
});

test('câmpurile lipsă produc erori pe fiecare câmp', () => {
  const r = valideaza({ formular: 'contact', nume: 'I', telefon: 'abc', email: 'x', mesaj: 'scurt' }, { acum: ACUM });
  assert.strictEqual(r.ok, false);
  assert.deepStrictEqual(Object.keys(r.erori).sort(), ['email', 'mesaj', 'nume', 'telefon']);
});

test('honeypot completat marchează bot fără erori', () => {
  const r = valideaza({ ...bun, website: 'http://spam' }, { acum: ACUM });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.bot, true);
  assert.deepStrictEqual(r.erori, {});
});

test('trimitere sub 3 secunde marchează bot', () => {
  const r = valideaza({ ...bun, ts: String(ACUM - 500) }, { acum: ACUM });
  assert.strictEqual(r.bot, true);
});

test('fără ts, capcana de timp nu se aplică (ruta fără JS)', () => {
  const { ts, ...faraTs } = bun;
  const r = valideaza(faraTs, { acum: ACUM });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.curat.areJs, false);
});

test('cerere: serviciu din afara listei albe e respins', () => {
  const r = valideaza({
    ...bun, formular: 'cerere', serviciu: '<script>x</script>',
    tipEntitate: 'UAT', localitate: 'Codlea', consimtamant: 'da'
  }, { acum: ACUM });
  assert.strictEqual(r.ok, false);
  assert.ok(r.erori.serviciu);
});

test('cerere validă produce titlul serviciului', () => {
  const r = valideaza({
    ...bun, formular: 'cerere', serviciu: 'acreditare-servicii-sociale',
    tipEntitate: 'UAT', localitate: 'Codlea', consimtamant: 'da'
  }, { acum: ACUM });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.curat.titluServiciu, 'Acreditarea serviciilor sociale');
});

test('cerere fără consimțământ e respinsă', () => {
  const r = valideaza({
    ...bun, formular: 'cerere', serviciu: 'acreditare-servicii-sociale',
    tipEntitate: 'UAT', localitate: 'Codlea'
  }, { acum: ACUM });
  assert.ok(r.erori.consimtamant);
});

test('redirectSigur respinge absolut, protocol-relativ și schemă', () => {
  assert.strictEqual(redirectSigur('/servicii/x.html'), '/servicii/x.html');
  assert.strictEqual(redirectSigur('https://rau.ro/x'), '/contact.html');
  assert.strictEqual(redirectSigur('//rau.ro/x'), '/contact.html');
  assert.strictEqual(redirectSigur('javascript:alert(1)'), '/contact.html');
  assert.strictEqual(redirectSigur(''), '/contact.html');
});

test('redirectSigur respinge backslash — browserele îl normalizează în /', () => {
  assert.strictEqual(redirectSigur('/\\rau.ro'), '/contact.html');
  assert.strictEqual(redirectSigur('/\\\\rau.ro'), '/contact.html');
  assert.strictEqual(redirectSigur('/servicii\\..\\x'), '/contact.html');
});
