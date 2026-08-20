'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const partial = fs.readFileSync(path.join(__dirname, '..', 'partials', 'formular.html'), 'utf8');
const contact = fs.readFileSync(path.join(__dirname, '..', 'contact.html'), 'utf8');

test('partialul conține toate câmpurile ascunse cerute de server', () => {
  for (const nume of ['website', 'ts', 'redirect', 'formular']) {
    assert.ok(partial.includes(`name="${nume}"`), `lipsește câmpul ascuns: ${nume}`);
  }
});

test('partialul conține widgetul Turnstile', () => {
  assert.ok(partial.includes('cf-turnstile'));
});

test('partialul păstrează id-ul pe care se leagă main.js', () => {
  assert.ok(partial.includes('id="contact-form"'));
});

test('partialul are blocul de variantă cerere, delimitat', () => {
  assert.ok(partial.includes('<!-- VARIANTA:cerere -->'));
  assert.ok(partial.includes('<!-- /VARIANTA:cerere -->'));
});

test('varianta cerere conține câmpurile suplimentare și consimțământul', () => {
  // Partialul are DOI marcatori de variantă (nu unul singur), pentru că
  // între ei stau câmpurile comune nume/telefon/email/mesaj (vezi
  // partials/formular.html). split(...)[1] singur ar prinde doar primul
  // bloc; concatenăm conținutul tuturor blocurilor delimitate.
  const blocuri = partial
    .split('<!-- VARIANTA:cerere -->')
    .slice(1)
    .map((s) => s.split('<!-- /VARIANTA:cerere -->')[0])
    .join('\n');
  for (const nume of ['serviciu', 'tipEntitate', 'localitate', 'consimtamant']) {
    assert.ok(blocuri.includes(`name="${nume}"`), `lipsește din varianta cerere: ${nume}`);
  }
});

test('contact.html trimite la /api/contact, nu la contact.php', () => {
  assert.ok(contact.includes('action="/api/contact"'));
  assert.ok(!contact.includes('contact.php'));
});

test('contact.html încarcă scriptul Turnstile', () => {
  assert.ok(contact.includes('challenges.cloudflare.com/turnstile'));
});
