'use strict';

const URL_RESEND = 'https://api.resend.com/emails';

async function trimite(payload, apiKey, fetchImpl) {
  const f = fetchImpl || fetch;

  const r = await f(URL_RESEND, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!r.ok) {
    let detaliu = '';
    try { detaliu = await r.text(); } catch (_) { detaliu = ''; }
    throw new Error(`Resend ${r.status}: ${detaliu}`);
  }

  return r.json();
}

module.exports = { trimite };
