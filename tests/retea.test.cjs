'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { verificaToken } = require('../api/_turnstile.js');
const { trimite } = require('../api/_mailer.js');

function fetchFals(raspuns) {
  const apeluri = [];
  const f = async (url, opt) => {
    apeluri.push({ url, opt });
    return raspuns;
  };
  f.apeluri = apeluri;
  return f;
}

const OK = { ok: true, status: 200, json: async () => ({ success: true }), text: async () => 'ok' };
const ESUAT = { ok: true, status: 200, json: async () => ({ success: false }), text: async () => 'nope' };
const E500 = { ok: false, status: 500, json: async () => ({}), text: async () => 'boom' };

test('token lipsă e respins fără apel de rețea', async () => {
  const f = fetchFals(OK);
  assert.strictEqual(await verificaToken('', 'secret', '1.2.3.4', f), false);
  assert.strictEqual(f.apeluri.length, 0);
});

test('token valid trece', async () => {
  assert.strictEqual(await verificaToken('tok', 'secret', '1.2.3.4', fetchFals(OK)), true);
});

test('success:false e respins', async () => {
  assert.strictEqual(await verificaToken('tok', 'secret', null, fetchFals(ESUAT)), false);
});

test('eroare HTTP la Cloudflare e respinsă, nu aruncată', async () => {
  assert.strictEqual(await verificaToken('tok', 'secret', null, fetchFals(E500)), false);
});

test('verificarea trimite secretul și tokenul', async () => {
  const f = fetchFals(OK);
  await verificaToken('tok', 'secret', '1.2.3.4', f);
  const corp = f.apeluri[0].opt.body;
  assert.ok(corp.includes('secret=secret'));
  assert.ok(corp.includes('response=tok'));
  assert.ok(corp.includes('remoteip=1.2.3.4'));
});

test('trimite apelează Resend cu cheia în antet', async () => {
  const f = fetchFals({ ok: true, status: 200, json: async () => ({ id: 'abc' }), text: async () => '' });
  const r = await trimite({ to: 'x@y.ro' }, 'cheie', f);
  assert.strictEqual(r.id, 'abc');
  assert.strictEqual(f.apeluri[0].url, 'https://api.resend.com/emails');
  assert.strictEqual(f.apeluri[0].opt.headers.Authorization, 'Bearer cheie');
});

test('trimite aruncă la răspuns non-2xx', async () => {
  await assert.rejects(() => trimite({ to: 'x@y.ro' }, 'cheie', fetchFals(E500)), /Resend 500/);
});
