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
  const start = new RegExp('<!--\\s*BEGIN:' + nume + '\\b[^>]*-->');
  const stop = new RegExp('<!--\\s*END:' + nume + '\\s*-->');

  const nrStart = (text.match(new RegExp(start.source, 'g')) || []).length;
  const nrStop = (text.match(new RegExp(stop.source, 'g')) || []).length;

  if (nrStart === 0 || nrStop === 0) {
    throw new Error(`Markerul ${nume} lipsește din fișier.`);
  }
  if (nrStart > 1 || nrStop > 1) {
    throw new Error(`Markerul ${nume} apare de două ori; regenerarea ar fi ambiguă.`);
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
  return html.replace(/\b(src|href)="([^"]+)"/g, (tot, atr, val) => {
    if (/^(\/|#|https?:|\/\/|mailto:|tel:|data:)/.test(val)) return tot;
    return `${atr}="${prefix}${val}"`;
  });
}
