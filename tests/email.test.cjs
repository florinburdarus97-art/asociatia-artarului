'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { emailNotificare, emailConfirmare, escapeHtml } = require('../api/_email.js');

const CFG = { from: 'Website Arțarului <no-reply@artarului.ro>', to: 'office@artarului.ro' };

const cerere = {
  tip: 'cerere',
  nume: 'Ana Ionescu',
  telefon: '0756 576 933',
  email: 'ana@exemplu.ro',
  mesaj: 'Avem nevoie de acreditare pentru centrul de zi.',
  serviciu: 'acreditare-servicii-sociale',
  titluServiciu: 'Acreditarea serviciilor sociale',
  tipEntitate: 'UAT',
  localitate: 'Codlea'
};

const contact = {
  tip: 'contact',
  nume: 'Ion Popescu',
  telefon: '0734 032 624',
  email: 'ion@exemplu.ro',
  mesaj: 'O întrebare scurtă.',
  serviciu: null, titluServiciu: null, tipEntitate: null, localitate: null
};

test('escapeHtml neutralizează marcajul', () => {
  assert.strictEqual(escapeHtml('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
});

test('notificarea de cerere are serviciul în subiect', () => {
  const m = emailNotificare(cerere, CFG);
  assert.strictEqual(m.subject, 'Cerere nouă — Acreditarea serviciilor sociale — Ana Ionescu');
  assert.strictEqual(m.to, 'office@artarului.ro');
});

test('notificarea are Reply-To pe adresa clientului', () => {
  const m = emailNotificare(cerere, CFG);
  assert.strictEqual(m.reply_to, 'ana@exemplu.ro');
});

test('notificarea de contact are alt subiect', () => {
  const m = emailNotificare(contact, CFG);
  assert.strictEqual(m.subject, 'Mesaj nou de pe artarului.ro — Ion Popescu');
});

test('notificarea conține toate câmpurile de cerere', () => {
  const m = emailNotificare(cerere, CFG);
  for (const bucata of ['Ana Ionescu', '0756 576 933', 'ana@exemplu.ro', 'UAT', 'Codlea', 'centrul de zi']) {
    assert.ok(m.text.includes(bucata), `lipsește: ${bucata}`);
  }
});

test('confirmarea pleacă spre client, nu spre birou', () => {
  const m = emailConfirmare(cerere, CFG);
  assert.strictEqual(m.to, 'ana@exemplu.ro');
  assert.strictEqual(m.from, CFG.from);
});

test('confirmarea escapează inputul în HTML', () => {
  const rau = { ...cerere, nume: '<script>alert(1)</script>' };
  const m = emailConfirmare(rau, CFG);
  assert.ok(!m.html.includes('<script>'));
  assert.ok(m.html.includes('&lt;script&gt;'));
});

test('confirmarea păstrează diacriticele', () => {
  const m = emailConfirmare(cerere, CFG);
  assert.ok(m.text.includes('mulțumim') || m.text.includes('Mulțumim'));
  assert.ok(m.html.includes('Arțarului'));
});

test('confirmarea conține telefoanele de contact', () => {
  const m = emailConfirmare(cerere, CFG);
  assert.ok(m.text.includes('0734 032 624'));
  assert.ok(m.text.includes('0756 576 933'));
});

test('ghilimelele românești din confirmarea de tip cerere se închid cu „ ” (U+201D), nu cu ghilimeaua dreaptă (M2)', () => {
  const m = emailConfirmare(cerere, CFG);
  assert.ok(m.text.includes('„Acreditarea serviciilor sociale”'));
  assert.ok(m.html.includes('„Acreditarea serviciilor sociale”'));
  assert.ok(!m.text.includes('sociale"'));
  assert.ok(!m.html.includes('sociale"'));
});
