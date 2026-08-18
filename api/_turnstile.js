'use strict';

const URL_VERIFICARE = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

async function verificaToken(token, secret, ip, fetchImpl) {
  if (!token || !secret) return false;
  const f = fetchImpl || fetch;

  const corp = new URLSearchParams({ secret, response: token });
  if (ip) corp.set('remoteip', ip);

  try {
    const r = await f(URL_VERIFICARE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: corp.toString()
    });
    if (!r.ok) return false;
    const d = await r.json();
    return d.success === true;
  } catch (_) {
    return false;
  }
}

module.exports = { verificaToken };
