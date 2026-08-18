'use strict';

const SLUGURI_PERMISE = [
  'acreditare-servicii-sociale',
  'fonduri-nerambursabile',
  'autorizare-anc-men',
  'formare-anc'
];

const TITLURI = {
  'acreditare-servicii-sociale': 'Acreditarea serviciilor sociale',
  'fonduri-nerambursabile': 'Fonduri nerambursabile',
  'autorizare-anc-men': 'Autorizare cursuri ANC și acreditare MEN',
  'formare-anc': 'Formare profesională autorizată ANC'
};

const ENTITATI = ['UAT', 'ONG', 'furnizor privat', 'persoană fizică'];

const PRAG_TIMP_MS = 3000;

function oLinie(v) {
  return String(v == null ? '' : v).replace(/[\r\n]+/g, ' ').trim();
}

function redirectSigur(v) {
  const s = String(v == null ? '' : v).replace(/[\r\n]+/g, '').trim();
  if (!s.startsWith('/')) return '/contact.html';
  if (s.startsWith('//')) return '/contact.html';
  if (s.includes('://')) return '/contact.html';
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
  if (!/^[0-9+()\s.-]{6,}$/.test(telefon)) erori.telefon = 'Adaugă un număr de telefon valid.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) erori.email = 'Adresa de email nu pare validă.';
  if (mesaj.length < 10) erori.mesaj = 'Scrie-ne câteva detalii (minim 10 caractere).';

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
