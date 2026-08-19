'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const manifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'servicii.json'), 'utf8')
);
const { familii, servicii } = manifest;
const STARI = ['pagina', 'modal'];

test('are exact patru familii, cu id-uri unice', () => {
  assert.strictEqual(familii.length, 4);
  const ids = familii.map((f) => f.id);
  assert.strictEqual(new Set(ids).size, 4);
  assert.deepStrictEqual(ids, ['acreditari', 'finantare', 'implementare', 'comunicare']);
});

test('fiecare familie are titlu și lead nevide', () => {
  for (const f of familii) {
    assert.ok(f.titlu && f.titlu.trim().length > 0, `familia ${f.id} fără titlu`);
    assert.ok(f.lead && f.lead.trim().length > 0, `familia ${f.id} fără lead`);
  }
});

test('are exact zece servicii', () => {
  assert.strictEqual(servicii.length, 10);
});

test('slug-urile sunt unice și ASCII fără diacritice', () => {
  const sluguri = servicii.map((s) => s.slug);
  assert.strictEqual(new Set(sluguri).size, 10, 'slug duplicat');
  for (const s of sluguri) {
    assert.match(s, /^[a-z0-9-]+$/, `slug non-ASCII sau cu majuscule: ${s}`);
  }
});

test('fiecare serviciu trimite la o familie care există', () => {
  const ids = new Set(familii.map((f) => f.id));
  for (const s of servicii) {
    assert.ok(ids.has(s.familie), `${s.slug} trimite la familia inexistentă ${s.familie}`);
  }
});

test('stările sunt din mulțimea permisă', () => {
  for (const s of servicii) {
    assert.ok(STARI.includes(s.stare), `${s.slug} are starea nevalidă ${s.stare}`);
  }
});

test('repartiția stărilor: pagină pentru conținut bogat, dialog pentru restul', () => {
  const numar = (st) => servicii.filter((s) => s.stare === st).length;
  assert.strictEqual(numar('pagina') + numar('modal'), servicii.length,
    'orice serviciu e ori pagină, ori dialog');
  assert.strictEqual(numar('ancora'), 0, 'starea ancora a fost eliminată din design');
  assert.ok(numar('pagina') > 0 && numar('modal') > 0,
    'ambele stări trebuie folosite; altfel una dintre căi rămâne netestată în practică');
});

/* Regula care a produs paginile goale: o pagină întreagă construită peste
   un lead și patru pași. Pragul e măsurat pe cuvintele de conținut real,
   nu pe numărul de câmpuri completate. */
test('un serviciu cu pagină proprie are conținut cât să o umple', () => {
  const cuv = (s) => String(s == null ? '' : s).split(/\s+/).filter(Boolean).length;
  for (const s of servicii.filter((x) => x.stare === 'pagina')) {
    const total =
      (s.context || []).reduce((a, p) => a + cuv(p), 0) +
      (s.livrabile || []).reduce((a, g) => a + cuv(g.titlu) + (g.elemente || []).reduce((b, e) => b + cuv(e), 0), 0) +
      (s.pasi || []).reduce((a, p) => a + cuv(p.titlu) + cuv(p.text), 0) +
      (s.pentruCine || []).reduce((a, p) => a + cuv(p), 0);
    assert.ok(total >= 100,
      `${s.slug}: doar ${total} cuvinte de conținut; sub prag pagina rămâne goală — treci-l pe starea modal`);
  }
});

test('niciun serviciu nu repetă lead-ul în context', () => {
  for (const s of servicii) {
    for (const par of s.context || []) {
      assert.notStrictEqual(par.trim(), String(s.lead).trim(),
        `${s.slug}: contextul repetă cuvânt cu cuvânt lead-ul`);
    }
  }
});

test('livrabilele nu oglindesc pașii', () => {
  for (const s of servicii) {
    const livr = (s.livrabile || []).flatMap((g) => g.elemente || []);
    const pasi = (s.pasi || []).map((p) => p.titlu);
    if (!livr.length || livr.length !== pasi.length) continue;
    assert.ok(!livr.every((e, i) => e === pasi[i]),
      `${s.slug}: „Ce cuprinde" repetă „Cum decurge" cuvânt cu cuvânt`);
  }
});

test('eticheta, când există, e un text scurt', () => {
  for (const s of servicii.filter((x) => x.eticheta !== undefined)) {
    assert.ok(typeof s.eticheta === 'string' && s.eticheta.trim().length > 0 && s.eticheta.length <= 20,
      `${s.slug}: eticheta trebuie să fie text scurt`);
  }
});

test('ordinea e unică și acoperă 1..10', () => {
  const ordini = servicii.map((s) => s.ordine).sort((a, b) => a - b);
  assert.deepStrictEqual(ordini, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('orice serviciu are câmpurile de card completate', () => {
  for (const s of servicii) {
    for (const camp of ['icon', 'titluCard', 'lead']) {
      assert.ok(s[camp] && String(s[camp]).trim().length > 0, `${s.slug} fără ${camp}`);
    }
  }
});

test('serviciile pe stare pagina au conținut de pagină și SEO', () => {
  for (const s of servicii.filter((x) => x.stare === 'pagina')) {
    assert.ok(s.titluPagina && s.titluPagina.trim(), `${s.slug} fără titluPagina`);
    assert.ok(Array.isArray(s.context) && s.context.length > 0, `${s.slug} fără context`);
    assert.ok(Array.isArray(s.livrabile) && s.livrabile.length > 0, `${s.slug} fără livrabile`);
    assert.ok(s.seo && s.seo.title && s.seo.description, `${s.slug} fără seo`);
    assert.ok(s.seo.description.length <= 160, `${s.slug}: meta description peste 160 de caractere`);
  }
});

test('grupurile de livrabile au elemente', () => {
  for (const s of servicii.filter((x) => x.stare === 'pagina')) {
    for (const g of s.livrabile) {
      assert.ok(Array.isArray(g.elemente) && g.elemente.length > 0,
        `${s.slug}: grup de livrabile gol`);
    }
  }
});

test('identitate-vizuala-promovare are livrabilele despărțite în două grupuri titrate', () => {
  const s = servicii.find((x) => x.slug === 'identitate-vizuala-promovare');
  assert.ok(s, 'serviciul lipsește din manifest');
  assert.strictEqual(s.livrabile.length, 2);
  for (const g of s.livrabile) {
    assert.ok(g.titlu && g.titlu.trim().length > 0, 'grupul trebuie titrat');
  }
});

test('proza nu conține cuvinte fără diacritice din sursa docx', () => {
  // Slug-urile sunt ASCII prin design — `redirectSigur` respinge căile non-ASCII.
  // Verificarea privește doar textul citit de om, deci slug-urile se exclud.
  const proza = JSON.stringify(manifest, (cheie, val) => (cheie === 'slug' ? undefined : val));
  for (const gresit of ['vizuala', 'infrastructura web', 'creativitatea si', 'Identitate vizuala']) {
    assert.ok(!proza.includes(gresit), `text netranscris corect: „${gresit}"`);
  }
});
