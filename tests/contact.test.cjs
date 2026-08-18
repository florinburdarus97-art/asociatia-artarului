'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { handler } = require('../api/contact.js');

const ACUM = 1_800_000_000_000;

const ENV = {
  RESEND_API_KEY: 'cheie',
  MAIL_TO: 'office@artarului.ro',
  MAIL_FROM: 'Website Arțarului <no-reply@artarului.ro>',
  TURNSTILE_SECRET_KEY: 'secret'
};

const CORP_BUN = {
  formular: 'contact',
  nume: 'Ion Popescu',
  telefon: '0734 032 624',
  email: 'ion@exemplu.ro',
  mesaj: 'Aș dori detalii despre acreditare.',
  website: '',
  ts: String(ACUM - 10_000),
  'cf-turnstile-response': 'tok',
  redirect: '/contact.html'
};

function raspunsFals() {
  const r = {
    _status: 0, _corp: null, _antete: {},
    status(c) { this._status = c; return this; },
    json(d) { this._corp = d; return this; },
    setHeader(k, v) { this._antete[k] = v; return this; },
    end() { return this; }
  };
  return r;
}

function cerereFalsa(corp, antete) {
  return { method: 'POST', body: corp, headers: antete || {} };
}

function deps(peste) {
  const trimise = [];
  const d = {
    env: ENV,
    acum: () => ACUM,
    log: () => {},
    verificaToken: async () => true,
    trimite: async (p) => { trimise.push(p); return { id: 'x' }; },
    ...peste
  };
  d.trimise = trimise;
  return d;
}

test('metoda non-POST e refuzată', async () => {
  const res = raspunsFals();
  await handler({ method: 'GET', headers: {}, body: {} }, res, deps());
  assert.strictEqual(res._status, 303);
  assert.strictEqual(res._antete.Location, '/contact.html');
});

test('AJAX valid întoarce 200 ok', async () => {
  const res = raspunsFals();
  const d = deps();
  await handler(cerereFalsa(CORP_BUN, { 'x-requested-with': 'fetch' }), res, d);
  assert.strictEqual(res._status, 200);
  assert.deepStrictEqual(res._corp, { ok: true });
  assert.strictEqual(d.trimise.length, 2);
});

test('erorile de validare întorc 422 cu câmpurile', async () => {
  const res = raspunsFals();
  const corp = { ...CORP_BUN, email: 'nuEmail' };
  await handler(cerereFalsa(corp, { 'x-requested-with': 'fetch' }), res, deps());
  assert.strictEqual(res._status, 422);
  assert.strictEqual(res._corp.ok, false);
  assert.ok(res._corp.erori.email);
});

test('honeypot completat pare succes, dar nu trimite nimic', async () => {
  const res = raspunsFals();
  const d = deps();
  await handler(cerereFalsa({ ...CORP_BUN, website: 'spam' }, { 'x-requested-with': 'fetch' }), res, d);
  assert.strictEqual(res._status, 200);
  assert.deepStrictEqual(res._corp, { ok: true });
  assert.strictEqual(d.trimise.length, 0);
});

test('token Turnstile invalid e respins când JS e activ', async () => {
  const res = raspunsFals();
  const d = deps({ verificaToken: async () => false });
  await handler(cerereFalsa(CORP_BUN, { 'x-requested-with': 'fetch' }), res, d);
  assert.strictEqual(res._status, 422);
  assert.ok(res._corp.erori.general);
  assert.strictEqual(d.trimise.length, 0);
});

test('fără JS, captcha nu se cere și trimiterea reușește', async () => {
  const res = raspunsFals();
  const { ts, 'cf-turnstile-response': _t, ...faraJs } = CORP_BUN;
  const d = deps({ verificaToken: async () => false });
  await handler(cerereFalsa({ ...faraJs, redirect: '/servicii/x.html' }), res, d);
  assert.strictEqual(res._status, 303);
  assert.strictEqual(res._antete.Location, '/servicii/x.html#mesaj-trimis');
  assert.strictEqual(d.trimise.length, 2);
});

test('confirmarea eșuată nu strică succesul', async () => {
  const res = raspunsFals();
  const logate = [];
  let apel = 0;
  const d = deps({
    log: (m) => logate.push(m),
    trimite: async () => { apel += 1; if (apel === 2) throw new Error('Resend 500'); return { id: 'x' }; }
  });
  await handler(cerereFalsa(CORP_BUN, { 'x-requested-with': 'fetch' }), res, d);
  assert.strictEqual(res._status, 200);
  assert.deepStrictEqual(res._corp, { ok: true });
  assert.ok(logate.some((m) => String(m).includes('confirmare')));
});

test('notificarea eșuată produce eroare', async () => {
  const res = raspunsFals();
  const d = deps({ trimite: async () => { throw new Error('Resend 500'); } });
  await handler(cerereFalsa(CORP_BUN, { 'x-requested-with': 'fetch' }), res, d);
  assert.strictEqual(res._status, 502);
  assert.strictEqual(res._corp.ok, false);
  assert.ok(res._corp.erori.general);
});

test('corpul primit ca text urlencoded e parsat', async () => {
  const res = raspunsFals();
  const d = deps();
  const text = new URLSearchParams(CORP_BUN).toString();
  await handler({ method: 'POST', body: text, headers: { 'x-requested-with': 'fetch' } }, res, d);
  assert.strictEqual(res._status, 200);
});

test('redirectul extern e ignorat la eroare', async () => {
  const res = raspunsFals();
  const { ts, ...faraJs } = CORP_BUN;
  await handler(cerereFalsa({ ...faraJs, email: 'rau', redirect: 'https://rau.ro' }), res, deps());
  assert.strictEqual(res._status, 303);
  assert.strictEqual(res._antete.Location, '/contact.html#mesaj-eroare');
});
