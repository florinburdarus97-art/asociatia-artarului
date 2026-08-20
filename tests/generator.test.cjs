'use strict';
const test = require('node:test');
const assert = require('node:assert');

let G;
test.before(async () => { G = await import('../build-servicii.mjs'); });

const CU_MARCAJE = [
  '<h1>Servicii</h1>',
  '<!-- BEGIN:carduri-servicii — generat din servicii.json, nu edita -->',
  '<p>continut vechi</p>',
  '<!-- END:carduri-servicii -->',
  '<footer>scris de mana</footer>'
].join('\n');

test('injecteazaIntreMarcaje înlocuiește doar regiunea dintre markere', () => {
  const out = G.injecteazaIntreMarcaje(CU_MARCAJE, 'carduri-servicii', '<p>nou</p>');
  assert.ok(out.includes('<p>nou</p>'));
  assert.ok(!out.includes('continut vechi'));
  assert.ok(out.includes('<h1>Servicii</h1>'), 'conținutul de dinainte s-a pierdut');
  assert.ok(out.includes('<footer>scris de mana</footer>'), 'conținutul de după s-a pierdut');
});

test('injecteazaIntreMarcaje păstrează ambele markere, ca regenerarea să fie repetabilă', () => {
  const o1 = G.injecteazaIntreMarcaje(CU_MARCAJE, 'carduri-servicii', '<p>unu</p>');
  const o2 = G.injecteazaIntreMarcaje(o1, 'carduri-servicii', '<p>doi</p>');
  assert.ok(o2.includes('<p>doi</p>'));
  assert.ok(!o2.includes('<p>unu</p>'));
  assert.ok(o2.includes('<footer>scris de mana</footer>'));
});

test('injecteazaIntreMarcaje aruncă dacă markerul lipsește', () => {
  assert.throws(() => G.injecteazaIntreMarcaje('<p>nimic</p>', 'carduri-servicii', 'x'),
    /carduri-servicii/);
});

test('injecteazaIntreMarcaje aruncă la marker duplicat', () => {
  const dublu = CU_MARCAJE + '\n' + CU_MARCAJE;
  assert.throws(() => G.injecteazaIntreMarcaje(dublu, 'carduri-servicii', 'x'), /de mai multe ori/);
});

test('prefixeaza rescrie srcset, listă cu descriptori', () => {
  const html = '<img src="assets/img/logo-96.png" srcset="assets/img/logo-96.png 1x, assets/img/logo-192.png 2x">';
  const out = G.prefixeaza(html, '../');
  assert.ok(out.includes('src="../assets/img/logo-96.png"'));
  assert.ok(out.includes('srcset="../assets/img/logo-96.png 1x, ../assets/img/logo-192.png 2x"'),
    'srcset neprefixat: imaginile retina ar da 404 în subfolder');
});

test('prefixeaza nu atinge srcset absolut sau extern', () => {
  const html = '<img srcset="/assets/a.webp 1x, https://cdn.ro/b.webp 2x">';
  assert.strictEqual(G.prefixeaza(html, '../'), html);
});

test('prefixeaza rescrie căile relative, nu și pe cele absolute sau externe', () => {
  const html = [
    '<img src="assets/img/leaf.webp">',
    '<link href="css/style.css?v=1">',
    '<script src="js/main.js"></script>',
    '<a href="/api/contact">absolut</a>',
    '<a href="https://artarului.ro">extern</a>',
    '<a href="#ancora">ancora</a>'
  ].join('\n');
  const out = G.prefixeaza(html, '../');
  assert.ok(out.includes('src="../assets/img/leaf.webp"'));
  assert.ok(out.includes('href="../css/style.css?v=1"'));
  assert.ok(out.includes('src="../js/main.js"'));
  assert.ok(out.includes('href="/api/contact"'), 'calea absolută nu se prefixează');
  assert.ok(out.includes('href="https://artarului.ro"'), 'URL extern nu se prefixează');
  assert.ok(out.includes('href="#ancora"'), 'ancora nu se prefixează');
});

test('prefixeaza cu prefix gol lasă totul neatins', () => {
  const html = '<img src="assets/x.webp">';
  assert.strictEqual(G.prefixeaza(html, ''), html);
});

test('prefixeaza rescrie și paginile interne', () => {
  const out = G.prefixeaza('<a href="contact.html">Contact</a>', '../');
  assert.ok(out.includes('href="../contact.html"'));
});

test('esc neutralizează marcajul din conținut', () => {
  assert.strictEqual(G.esc('<b>&"x"</b>'), '&lt;b&gt;&amp;&quot;x&quot;&lt;/b&gt;');
});

test('slugValid acceptă doar ASCII cu cratime', () => {
  assert.ok(G.slugValid('digitalizare-automatizare'));
  assert.ok(!G.slugValid('strategii-dezvoltare-locală'));
  assert.ok(!G.slugValid('Majuscule'));
  assert.ok(!G.slugValid('cu spatiu'));
});

test('incarcaManifest citește manifestul real și îl întoarce parsat', () => {
  const m = G.incarcaManifest();
  assert.strictEqual(m.servicii.length, 10);
  assert.strictEqual(m.familii.length, 4);
});

test('hrefCard: doar starea `pagina` produce o legătură', () => {
  assert.strictEqual(G.hrefCard({ slug: 'x', stare: 'pagina' }), 'servicii/x.html');
  assert.strictEqual(G.hrefCard({ slug: 'x', stare: 'modal' }), null);
});

test('rândul cu etichetă o afișează, dar rămâne linkat', () => {
  const html = G.randRand({ slug: 'formare-anc', stare: 'pagina', icon: 'i-medal',
    titluCard: 'Formare ANC', lead: 'x', eticheta: 'În pregătire' });
  assert.ok(html.includes('svc-row-eticheta'));
  assert.ok(html.includes('În pregătire'));
  assert.ok(html.includes('href="servicii/formare-anc.html"'), 'eticheta nu suspendă linkul');
});

test('grila emite lista de rânduri și marchează familia', () => {
  const m = G.incarcaManifest();
  const html = G.randGrila(m);
  assert.ok(html.includes('<ul class="svc-list">'), 'lipsește lista de index');
  assert.ok(!html.includes('svc-index'), 'grila decalată de carduri a fost eliminată');
  assert.ok(!/<article class="svc"/.test(html), 'indexul nu mai folosește cardul .svc');
  for (const f of m.familii) {
    assert.ok(html.includes(`data-familie="${f.id}"`), `lipsește marcajul familiei ${f.id}`);
  }
});

test('rândul pe stare pagina e o ancoră cu săgeată, fără buton de dialog', () => {
  const html = G.randRand({
    slug: 'digitalizare-automatizare', stare: 'pagina', icon: 'i-gear',
    titluCard: 'Digitalizare și automatizare', lead: 'Un sistem mai bun de lucru.'
  });
  assert.ok(html.includes('href="servicii/digitalizare-automatizare.html"'));
  assert.ok(html.includes('svc-row-link'));
  assert.ok(html.includes('svc-row-sageata'));
  assert.ok(html.includes('#i-gear'));
  assert.ok(html.includes('Digitalizare și automatizare'));
  assert.ok(!html.includes('data-dialog'), 'un serviciu cu pagină nu deschide dialog');
});

test('rândul fără pagină e un buton care deschide dialogul, nu un link', () => {
  const html = G.randRand({
    slug: 'formare-anc', stare: 'modal', icon: 'i-medal',
    titluCard: 'Formare profesională autorizată ANC', lead: 'Cursuri cu certificare ANC.'
  });
  assert.ok(html.includes('data-dialog="dlg-formare-anc"'));
  assert.ok(html.includes('aria-haspopup="dialog"'));
  assert.ok(html.includes('type="button"'));
  assert.ok(!html.includes('<a '), 'rândul fără pagină nu trebuie să conțină link');
});

test('rândul escapează conținutul din manifest', () => {
  const html = G.randRand({
    slug: 'x', stare: 'modal', icon: 'i-scales',
    titluCard: '<script>alert(1)</script>', lead: 'ok'
  });
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('dialogul poartă titlul, butonul de cerere și niciun formular', () => {
  const m = G.incarcaManifest();
  const s = m.servicii.find((x) => x.stare !== 'pagina');
  assert.ok(s, 'manifestul trebuie să aibă cel puțin un serviciu fără pagină');
  const html = G.randModal(s);
  assert.ok(html.includes(`<dialog class="svc-modal" id="dlg-${s.slug}"`));
  assert.ok(html.includes(`aria-labelledby="dlg-${s.slug}-titlu"`));
  assert.ok(html.includes(`href="cerere-consultanta.html?serviciu=${s.slug}"`));
  assert.ok(html.includes('data-inchide'), 'lipsește butonul de închidere');
  assert.ok(!html.includes('<form'), 'dialogul nu conține formular: un singur widget Turnstile pe pagină');
  assert.ok(!html.includes('cf-turnstile'), 'dialogul nu conține widget de captcha');
});

test('randModale acoperă exact serviciile fără pagină proprie', () => {
  const m = G.incarcaManifest();
  const html = G.randModale(m);
  for (const s of m.servicii) {
    const prezent = html.includes(`id="dlg-${s.slug}"`);
    assert.strictEqual(prezent, s.stare !== 'pagina',
      `${s.slug} (${s.stare}) ${prezent ? 'nu ar trebui' : 'ar trebui'} să aibă dialog`);
  }
});

test('dialogul nu repetă lead-ul în corpul de text', () => {
  const m = G.incarcaManifest();
  for (const s of m.servicii.filter((x) => x.stare !== 'pagina')) {
    for (const par of s.context || []) {
      assert.notStrictEqual(par.trim(), String(s.lead).trim(),
        `${s.slug}: contextul repetă lead-ul`);
    }
  }
});

test('grila are patru secțiuni de familie, în ordinea din manifest', () => {
  const html = G.randGrila(G.incarcaManifest());
  for (const titlu of ['Acreditări și autorizări', 'Finanțare', 'Implementare', 'Comunicare și tehnologie']) {
    assert.ok(html.includes(titlu), `lipsește familia ${titlu}`);
  }
  const poz = ['Acreditări și autorizări', 'Finanțare', 'Implementare', 'Comunicare și tehnologie']
    .map((t) => html.indexOf(t));
  assert.deepStrictEqual(poz, [...poz].sort((a, b) => a - b), 'familiile nu sunt în ordine');
});

test('sprite-ul acoperă fiecare iconiță cerută de manifest', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const sprite = fs.readFileSync(path.join(__dirname, '..', 'partials', 'sprite.html'), 'utf8');
  const prezente = new Set([...sprite.matchAll(/symbol id="([^"]+)"/g)].map((m) => m[1]));
  for (const s of G.incarcaManifest().servicii) {
    assert.ok(prezente.has(s.icon), `sprite-ul nu conține ${s.icon}, cerut de ${s.slug}`);
  }
  // iconițele folosite de nav, footer și formular
  for (const i of ['i-arrow-right', 'i-phone', 'i-envelope', 'i-facebook', 'i-check-circle', 'i-warning-circle']) {
    assert.ok(prezente.has(i), `sprite-ul nu conține ${i}, folosit de fragmentele comune`);
  }
});

test('grila conține toate cele zece servicii', () => {
  const m = G.incarcaManifest();
  const html = G.randGrila(m);
  for (const s of m.servicii) {
    assert.ok(html.includes(G.esc(s.titluCard)), `lipsește cardul ${s.slug}`);
  }
});

test('grila ordonează serviciile după câmpul ordine în fiecare familie', () => {
  const m = G.incarcaManifest();
  const html = G.randGrila(m);
  for (const f of m.familii) {
    const aleFamiliei = m.servicii
      .filter((s) => s.familie === f.id)
      .sort((a, b) => a.ordine - b.ordine)
      .map((s) => html.indexOf(G.esc(s.titluCard)));
    assert.deepStrictEqual(aleFamiliei, [...aleFamiliei].sort((a, b) => a - b),
      `familia ${f.id} nu respectă ordinea`);
  }
});
