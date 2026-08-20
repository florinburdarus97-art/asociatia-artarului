'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const RADACINA = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(RADACINA, 'servicii.json'), 'utf8'));
const cuPagina = manifest.servicii.filter((s) => s.stare === 'pagina');

function citeste(rel) {
  return fs.readFileSync(path.join(RADACINA, rel), 'utf8');
}

test('fiecare serviciu pe stare pagina are fișierul generat', () => {
  for (const s of cuPagina) {
    const p = path.join(RADACINA, 'servicii', `${s.slug}.html`);
    assert.ok(fs.existsSync(p), `lipsește servicii/${s.slug}.html`);
  }
});

test('nu există pagini orfane, pentru servicii care nu mai au stare pagina', () => {
  const pePisc = fs.readdirSync(path.join(RADACINA, 'servicii'))
    .filter((f) => f.endsWith('.html'))
    .map((f) => f.replace(/\.html$/, ''));
  const asteptate = cuPagina.map((s) => s.slug).sort();
  assert.deepStrictEqual(pePisc.sort(), asteptate);
});

test('paginile poartă antetul de fișier generat', () => {
  for (const s of cuPagina) {
    assert.ok(citeste(`servicii/${s.slug}.html`).includes('GENERAT din servicii.json'),
      `${s.slug}: lipsește antetul`);
  }
});

test('căile către assets sunt prefixate pentru subfolder', () => {
  const html = citeste(`servicii/${cuPagina[0].slug}.html`);
  assert.ok(html.includes('../css/style.css'), 'CSS neprefixat');
  assert.ok(html.includes('../js/main.js'), 'JS neprefixat');
  assert.ok(!/(?:src|href|srcset)="assets\//.test(html), 'a rămas o cale neprefixată către assets');
});

test('paginile conțin titlul, leadul, rezultatul și livrabilele din manifest', () => {
  for (const s of cuPagina) {
    const html = citeste(`servicii/${s.slug}.html`);
    assert.ok(html.includes(s.titluPagina), `${s.slug}: lipsește titlul`);
    if (s.rezultat) assert.ok(html.includes(s.rezultat), `${s.slug}: lipsește rezultatul`);
    for (const grup of s.livrabile) {
      for (const el of grup.elemente) {
        assert.ok(html.includes(el), `${s.slug}: lipsește livrabilul „${el}"`);
      }
    }
  }
});

test('secțiunile fără date nu se randează goale', () => {
  for (const s of cuPagina.filter((x) => !x.faq || x.faq.length === 0)) {
    const html = citeste(`servicii/${s.slug}.html`);
    assert.ok(!html.includes('faq-lista'), `${s.slug}: FAQ randat fără date`);
    assert.ok(!html.includes('FAQPage'), `${s.slug}: JSON-LD FAQPage fără întrebări`);
  }
  for (const s of cuPagina.filter((x) => !x.pasi || x.pasi.length === 0)) {
    assert.ok(!citeste(`servicii/${s.slug}.html`).includes('steps-flow'),
      `${s.slug}: pași randați fără date`);
  }
});

test('paginile au JSON-LD Service și BreadcrumbList', () => {
  for (const s of cuPagina) {
    const html = citeste(`servicii/${s.slug}.html`);
    assert.ok(html.includes('"@type": "Service"'), `${s.slug}: lipsește Service`);
    assert.ok(html.includes('"@type": "BreadcrumbList"'), `${s.slug}: lipsește BreadcrumbList`);
  }
});

test('SEO: titlul și descrierea din manifest ajung în head', () => {
  for (const s of cuPagina) {
    const html = citeste(`servicii/${s.slug}.html`);
    assert.ok(html.includes(`<title>${s.seo.title}</title>`), `${s.slug}: title greșit`);
    assert.ok(html.includes(s.seo.description), `${s.slug}: description lipsă`);
    assert.ok(html.includes(`https://artarului.ro/servicii/${s.slug}.html`), `${s.slug}: canonical lipsă`);
  }
});

test('formularul e încorporat, în varianta cerere, cu serviciul preselectat', () => {
  for (const s of cuPagina) {
    const html = citeste(`servicii/${s.slug}.html`);
    assert.ok(html.includes('action="/api/contact"'), `${s.slug}: formularul lipsește`);
    assert.ok(html.includes('name="formular" value="cerere"'), `${s.slug}: variantă greșită`);
    assert.ok(html.includes(`value="/servicii/${s.slug}.html"`), `${s.slug}: redirect greșit`);
    assert.ok(html.includes(`value="${s.slug}" selected`), `${s.slug}: serviciul nu e preselectat`);
    assert.ok(html.includes('name="consimtamant"'), `${s.slug}: lipsește bifa de consimțământ`);
    assert.ok(!html.includes('VARIANTA:cerere'), `${s.slug}: au rămas marcajele de variantă`);
  }
});

test('nu au mai rămas marcaje necompletate, în afara sitekey-ului Turnstile', () => {
  // {{TURNSTILE_SITEKEY}} rămâne deliberat literal: cheia publică se naște în
  // Task 7 al planului A, un pas al userului. `contact.html` poartă același
  // placeholder. Orice ALT marcaj rămas e un defect de generare.
  for (const s of cuPagina) {
    const rest = citeste(`servicii/${s.slug}.html`).replace(/\{\{TURNSTILE_SITEKEY\}\}/g, '');
    assert.ok(!/\{\{[A-Z_]+\}\}/.test(rest), `${s.slug}: marcaj necompletat`);
  }
});

test('grila din servicii.html a fost regenerată între markere', () => {
  const html = citeste('servicii.html');
  assert.ok(html.includes('BEGIN:carduri-servicii'));
  assert.ok(html.includes('END:carduri-servicii'));
  assert.ok(html.includes('svc-family'), 'grila nu a fost scrisă');
  assert.ok(html.includes('Cum lucrăm'), 'conținutul scris de mână s-a pierdut');
});

test('hub-ul nu mai conține secțiuni de detaliu migrate în pagini', () => {
  const html = citeste('servicii.html');
  assert.ok(!html.includes('svc-detail'), 'detaliul trebuia mutat în paginile de serviciu');
  assert.ok(html.includes('Cum lucrăm'), 'conținutul scris de mână s-a pierdut');
  assert.ok(html.includes('cta-band'), 'banda CTA s-a pierdut');
});

test('sitemap conține cele șase pagini noi', () => {
  const xml = citeste('sitemap.xml');
  for (const s of cuPagina) {
    assert.ok(xml.includes(`/servicii/${s.slug}.html`), `sitemap: lipsește ${s.slug}`);
  }
});

test('pagina de cerere există, e noindex și nu preselectează niciun serviciu', () => {
  const html = citeste('cerere-consultanta.html');
  assert.ok(html.includes('name="robots"') && html.includes('noindex'), 'lipsește noindex');
  assert.ok(html.includes('name="formular" value="cerere"'));
  assert.ok(html.includes('value="/cerere-consultanta.html"'));
  assert.ok(!html.includes('selected'), 'pagina generică nu preselectează un serviciu');
});

test('lista albă a serverului derivă din manifest, fără divergență', () => {
  const { SLUGURI_PERMISE, TITLURI } = require('../api/_validare.js');
  const sluguri = manifest.servicii.map((s) => s.slug);
  assert.deepStrictEqual([...SLUGURI_PERMISE].sort(), [...sluguri].sort());
  for (const s of manifest.servicii) {
    assert.strictEqual(TITLURI[s.slug], s.titluCard, `titlu divergent pentru ${s.slug}`);
  }
});

test('paginile generate încarcă main.js', () => {
  for (const s of cuPagina) {
    assert.ok(citeste(`servicii/${s.slug}.html`).includes('../js/main.js'), `${s.slug}: lipsește main.js`);
  }
  assert.ok(citeste('cerere-consultanta.html').includes('js/main.js'));
});
