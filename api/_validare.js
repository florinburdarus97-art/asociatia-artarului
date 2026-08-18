'use strict';

const { SLUGURI_PERMISE, TITLURI } = require('./_servicii-permise.js');

const ENTITATI = ['UAT', 'ONG', 'furnizor privat', 'persoană fizică'];

const PRAG_TIMP_MS = 3000;

function oLinie(v) {
  return String(v == null ? '' : v).replace(/[\r\n]+/g, ' ').trim();
}

function redirectSigur(v) {
  let s = String(v == null ? '' : v).replace(/[\r\n\t]+/g, '').trim();
  if (!s.startsWith('/')) return '/contact.html';
  if (s.startsWith('//')) return '/contact.html';
  if (s.includes('\\')) return '/contact.html';   // browserele normalizează \ în / (CWE-601)
  if (s.includes('://')) return '/contact.html';
  s = s.split('#')[0];   // fragmentul nu are ce căuta în Location — ar dubla #mesaj-trimis
  if (!/^\/[\x21-\x7e]*$/.test(s)) return '/contact.html';   // doar ASCII imprimabil — evită ERR_INVALID_CHAR pe Location
  return s;
}

function valideaza(date, optiuni) {
  const opt = optiuni || {};
  const acum = typeof opt.acum === 'number' ? opt.acum : Date.now();
  const erori = {};

  if (oLinie(date.website) !== '') {
    return { ok: false, bot: true, erori: {}, curat: null };
  }

  const ts = Number(date.ts);
  const areJs = Number.isFinite(ts) && ts > 0;
  if (areJs && acum - ts < PRAG_TIMP_MS) {
    return { ok: false, bot: true, erori: {}, curat: null };
  }

  const tip = date.formular === 'cerere' ? 'cerere' : 'contact';

  const nume = oLinie(date.nume);
  const telefon = oLinie(date.telefon);
  const email = oLinie(date.email);
  const mesaj = String(date.mesaj == null ? '' : date.mesaj).trim();

  if (nume.length < 2) erori.nume = 'Te rugăm să îți scrii numele.';
  else if (nume.length > 120) erori.nume = 'Numele este prea lung (maxim 120 de caractere).';
  if (!/^[0-9+()\s.-]{6,}$/.test(telefon)) erori.telefon = 'Adaugă un număr de telefon valid.';
  else if (telefon.length > 40) erori.telefon = 'Numărul de telefon este prea lung (maxim 40 de caractere).';
  if (!/^[^\s@,<>;"']+@[^\s@,<>;"']+\.[^\s@,<>;"']{2,}$/.test(email)) erori.email = 'Adresa de email nu pare validă.';
  else if (email.length > 190) erori.email = 'Adresa de email este prea lungă (maxim 190 de caractere).';
  if (mesaj.length < 10) erori.mesaj = 'Scrie-ne câteva detalii (minim 10 caractere).';
  else if (mesaj.length > 5000) erori.mesaj = 'Mesajul este prea lung (maxim 5000 de caractere).';

  let serviciu = null;
  let tipEntitate = null;
  let localitate = null;

  if (tip === 'cerere') {
    serviciu = oLinie(date.serviciu);
    if (!SLUGURI_PERMISE.includes(serviciu)) erori.serviciu = 'Alege serviciul dorit.';

    tipEntitate = oLinie(date.tipEntitate);
    if (!ENTITATI.includes(tipEntitate)) erori.tipEntitate = 'Alege tipul entității.';

    localitate = oLinie(date.localitate);
    if (localitate.length < 2) erori.localitate = 'Adaugă localitatea.';
    else if (localitate.length > 120) erori.localitate = 'Localitatea este prea lungă (maxim 120 de caractere).';

    if (oLinie(date.consimtamant) !== 'da') {
      erori.consimtamant = 'Bifează acordul pentru a putea trimite.';
    }
  }

  if (Object.keys(erori).length > 0) {
    return { ok: false, bot: false, erori, curat: null };
  }

  return {
    ok: true,
    bot: false,
    erori: {},
    curat: {
      tip, nume, telefon, email, mesaj,
      serviciu, tipEntitate, localitate,
      titluServiciu: serviciu ? TITLURI[serviciu] : null,
      areJs,
      redirect: redirectSigur(date.redirect)
    }
  };
}

module.exports = { valideaza, oLinie, redirectSigur, SLUGURI_PERMISE, TITLURI, ENTITATI };
