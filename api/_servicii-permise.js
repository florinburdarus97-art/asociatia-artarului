'use strict';
/* GENERAT din servicii.json — nu edita manual. Rulează: node build-servicii.mjs */

const TITLURI = {
  'acreditare-servicii-sociale': "Consultanță pentru acreditarea serviciilor sociale",
  'autorizare-anc-men': "Autorizare cursuri ANC și acreditare MEN",
  'formare-anc': "Formare profesională autorizată ANC",
  'fonduri-nerambursabile': "Consultanță în accesarea fondurilor nerambursabile",
  'strategii-dezvoltare-locala': "Strategii de dezvoltare locală",
  'documentatie-recrutare': "Documentație recrutare — posturi în afara organigramei",
  'implementare-management-proiecte': "Implementare și management proiecte",
  'asistenta-personalizata-implementare': "Asistență personalizată în implementare",
  'identitate-vizuala-promovare': "Identitate vizuală și promovare proiecte",
  'digitalizare-automatizare': "Digitalizare și automatizare"
};

const SLUGURI_PERMISE = Object.keys(TITLURI);

module.exports = { SLUGURI_PERMISE, TITLURI };
