#!/usr/bin/env node
/* Generator de pagini de servicii pentru artarului.ro.
   Rulează local: `node build-servicii.mjs`. Rezultatul se comite.
   Fără dependințe: doar module native Node. */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AICI = path.dirname(fileURLToPath(import.meta.url));

export function incarcaManifest(cale = path.join(AICI, 'servicii.json')) {
  return JSON.parse(fs.readFileSync(cale, 'utf8'));
}

export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function slugValid(s) {
  return /^[a-z0-9-]+$/.test(String(s == null ? '' : s));
}

export function injecteazaIntreMarcaje(text, nume, continutNou) {
  const numeEsc = String(nume).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const start = new RegExp('<!--\\s*BEGIN:' + numeEsc + '\\b[^>]*-->');
  const stop = new RegExp('<!--\\s*END:' + numeEsc + '\\s*-->');

  const nrStart = (text.match(new RegExp(start.source, 'g')) || []).length;
  const nrStop = (text.match(new RegExp(stop.source, 'g')) || []).length;

  if (nrStart === 0 || nrStop === 0) {
    const care = nrStart === 0 && nrStop === 0 ? 'BEGIN și END'
               : nrStart === 0 ? 'BEGIN' : 'END';
    throw new Error(`Markerul ${care}:${nume} lipsește din fișier.`);
  }
  if (nrStart > 1 || nrStop > 1) {
    throw new Error(`Markerul ${nume} apare de mai multe ori (BEGIN ×${nrStart}, END ×${nrStop}); regenerarea ar fi ambiguă.`);
  }

  const iStart = text.search(start);
  const iStop = text.search(stop);
  if (iStop < iStart) {
    throw new Error(`Markerul END:${nume} apare înaintea lui BEGIN:${nume}.`);
  }

  const marcajStart = text.match(start)[0];
  const marcajStop = text.match(stop)[0];

  return text.slice(0, iStart) + marcajStart + '\n' + continutNou + '\n' + text.slice(iStop);
}

/* Rescrie căile relative pentru o pagină aflată într-un subfolder.
   Nu atinge: căile absolute (/…), URL-urile externe (http…, //…, mailto:, tel:) și ancorele (#…). */
export function prefixeaza(html, prefix) {
  if (!prefix) return html;

  const relativa = (v) => !/^(\/|#|https?:|\/\/|mailto:|tel:|data:)/.test(v);

  // src și href poartă o singură cale.
  // `\bsrc="` nu se potrivește în `srcset="`, deci nu există dublă procesare.
  let out = html.replace(/\b(src|href)="([^"]+)"/g, (tot, atr, val) =>
    relativa(val) ? `${atr}="${prefix}${val}"` : tot);

  // srcset poartă o listă „cale descriptor", separate prin virgulă.
  out = out.replace(/\bsrcset="([^"]+)"/g, (tot, val) => {
    const lista = val.split(',').map((intrare) => {
      const t = intrare.trim();
      if (!t) return t;
      const [cale, ...descriptor] = t.split(/\s+/);
      return relativa(cale) ? [prefix + cale, ...descriptor].join(' ') : t;
    });
    return `srcset="${lista.join(', ')}"`;
  });

  return out;
}
