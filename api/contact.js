'use strict';

const { valideaza, redirectSigur } = require('./_validare.js');
const { emailNotificare, emailConfirmare } = require('./_email.js');
const { verificaToken: verificaTokenReal } = require('./_turnstile.js');
const { trimite: trimiteReal } = require('./_mailer.js');

function citesteCorp(req) {
  const b = req.body;
  if (b && typeof b === 'object') return b;
  if (typeof b === 'string') return Object.fromEntries(new URLSearchParams(b));
  return {};
}

function esteAjax(req) {
  const h = req.headers || {};
  const xrw = String(h['x-requested-with'] || '').toLowerCase();
  if (xrw === 'fetch') return true;
  return String(h.accept || '').includes('application/json');
}

function ipClient(req) {
  const h = req.headers || {};
  const inaintat = String(h['x-forwarded-for'] || '');
  return inaintat.split(',')[0].trim() || null;
}

function raspunde(req, res, ok, erori, redirect, statusEroare) {
  if (esteAjax(req)) {
    res.status(ok ? 200 : (statusEroare || 422));
    res.json(ok ? { ok: true } : { ok: false, erori: erori || {} });
    return;
  }
  res.status(303);
  res.setHeader('Location', `${redirect}#${ok ? 'mesaj-trimis' : 'mesaj-eroare'}`);
  res.end();
}

async function handler(req, res, deps) {
  const d = deps || {};
  const env = d.env || process.env;
  const log = d.log || console.error;
  const acum = d.acum || Date.now;
  const verifica = d.verificaToken || verificaTokenReal;
  const trimite = d.trimite || trimiteReal;

  const corp = citesteCorp(req);
  const caleRetur = redirectSigur(corp.redirect);

  if (req.method !== 'POST') {
    res.status(303);
    res.setHeader('Location', caleRetur);
    res.end();
    return;
  }

  const rezultat = valideaza(corp, { acum: acum() });

  if (rezultat.bot) {
    log('[contact] trimitere blocată de honeypot sau capcana de timp');
    raspunde(req, res, true, {}, caleRetur);
    return;
  }

  if (!rezultat.ok) {
    raspunde(req, res, false, rezultat.erori, caleRetur);
    return;
  }

  const c = rezultat.curat;

  if (c.areJs) {
    const token = corp['cf-turnstile-response'];
    const valid = await verifica(token, env.TURNSTILE_SECRET_KEY, ipClient(req), null);
    if (!valid) {
      log('[contact] token Turnstile invalid');
      raspunde(req, res, false, { general: 'Verificarea antispam nu a trecut. Reîncarcă pagina și încearcă din nou.' }, c.redirect);
      return;
    }
  } else {
    log('[contact] trimitere fără JavaScript, captcha nu a fost evaluată');
  }

  const cfg = { from: env.MAIL_FROM, to: env.MAIL_TO };

  try {
    await trimite(emailNotificare(c, cfg), env.RESEND_API_KEY, null);
  } catch (e) {
    log(`[contact] notificarea internă a eșuat: ${e.message}`);
    raspunde(req, res, false, { general: 'Mesajul nu a putut fi trimis acum. Încearcă din nou sau sună-ne direct.' }, c.redirect, 502);
    return;
  }

  try {
    await trimite(emailConfirmare(c, cfg), env.RESEND_API_KEY, null);
  } catch (e) {
    log(`[contact] emailul de confirmare a eșuat, notificarea a plecat: ${e.message}`);
  }

  raspunde(req, res, true, {}, c.redirect);
}

module.exports = (req, res) => handler(req, res, {});
module.exports.handler = handler;
