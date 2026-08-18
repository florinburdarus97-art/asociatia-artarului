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

test('redirectSigur elimină fragmentul — nu-l lăsăm să dubleze #mesaj-trimis (M6)', () => {
  assert.strictEqual(redirectSigur('/servicii/x.html#evil'), '/servicii/x.html');
  assert.strictEqual(redirectSigur('/contact.html#mesaj-trimis'), '/contact.html');
});

test('redirectSigur respinge non-ASCII care ar sparge headerul Location (I3)', () => {
  assert.strictEqual(redirectSigur('/servicii/ă.html'), '/contact.html');
  assert.strictEqual(redirectSigur('/ab'), '/contact.html');
});

test('redirectSigur acceptă căi ASCII simple', () => {
  assert.strictEqual(redirectSigur('/ab'), '/ab');
  assert.strictEqual(redirectSigur('/servicii/x.html'), '/servicii/x.html');
});

test('nume peste 120 de caractere e respins (I2)', () => {
  const r = valideaza({ ...bun, nume: 'A'.repeat(121) }, { acum: ACUM });
  assert.strictEqual(r.erori.nume, 'Numele este prea lung (maxim 120 de caractere).');
});

test('nume la limita de 120 de caractere e acceptat', () => {
  const r = valideaza({ ...bun, nume: 'A'.repeat(120) }, { acum: ACUM });
  assert.strictEqual(r.erori.nume, undefined);
});

test('mesaj peste 5000 de caractere e respins (I2)', () => {
  const r = valideaza({ ...bun, mesaj: 'A'.repeat(5001) }, { acum: ACUM });
  assert.strictEqual(r.erori.mesaj, 'Mesajul este prea lung (maxim 5000 de caractere).');
});

test('telefon peste 40 de caractere e respins (I2)', () => {
  const r = valideaza({ ...bun, telefon: '0' + '1'.repeat(45) }, { acum: ACUM });
  assert.strictEqual(r.erori.telefon, 'Numărul de telefon este prea lung (maxim 40 de caractere).');
});

test('email peste 190 de caractere e respins (I2)', () => {
  const r = valideaza({ ...bun, email: `${'a'.repeat(185)}@ro.ro` }, { acum: ACUM });
  assert.strictEqual(r.erori.email, 'Adresa de email este prea lungă (maxim 190 de caractere).');
});

test('localitate peste 120 de caractere e respinsă (I2, variantă cerere)', () => {
  const r = valideaza({
    ...bun, formular: 'cerere', serviciu: 'acreditare-servicii-sociale',
    tipEntitate: 'UAT', consimtamant: 'da', localitate: 'A'.repeat(121)
  }, { acum: ACUM });
  assert.strictEqual(r.erori.localitate, 'Localitatea este prea lungă (maxim 120 de caractere).');
});

test('email cu caractere periculoase pentru reply_to e respins (M3)', () => {
  for (const rau of ['a@b.ro,cd', 'a"<b>@x.ro', 'a@b.ro>x', 'a@b.ro;x', "a'b@x.ro"]) {
    const r = valideaza({ ...bun, email: rau }, { acum: ACUM });
    assert.ok(r.erori.email, `ar fi trebuit respins: ${rau}`);
  }
});

test('emailurile valide obișnuite rămân acceptate după înăsprirea regexului (M3)', () => {
  for (const email of ['ion@exemplu.ro', 'ana.popescu@primaria-codlea.ro', 'test+tag@sub.domeniu.ro']) {
    const r = valideaza({ ...bun, email }, { acum: ACUM });
    assert.strictEqual(r.erori.email, undefined, `ar fi trebuit acceptat: ${email}`);
  }
});
