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

test('hrefCard trimite fiecare stare unde trebuie', () => {
  assert.strictEqual(G.hrefCard({ slug: 'x', stare: 'pagina' }), 'servicii/x.html');
  assert.strictEqual(G.hrefCard({ slug: 'x', stare: 'ancora' }), 'servicii.html#x');
  assert.strictEqual(G.hrefCard({ slug: 'x', stare: 'in-lucru' }), null);
});

test('cardul pe stare pagina are link, săgeată și overlay clickabil', () => {
  const html = G.randCard({
    slug: 'digitalizare-automatizare', stare: 'pagina', icon: 'i-gear',
    titluCard: 'Digitalizare și automatizare', lead: 'Un sistem mai bun de lucru.'
  });
  assert.ok(html.includes('href="servicii/digitalizare-automatizare.html"'));
  assert.ok(html.includes('svc-card-link'), 'lipsește overlay-ul care face tot cardul clickabil');
  assert.ok(html.includes('#i-gear'));
  assert.ok(html.includes('Digitalizare și automatizare'));
  assert.ok(!html.includes('svc-badge'));
});

test('cardul pe stare in-lucru are badge și niciun link', () => {
  const html = G.randCard({
    slug: 'formare-anc', stare: 'in-lucru', icon: 'i-medal',
    titluCard: 'Formare profesională autorizată ANC', lead: 'Cursuri cu certificare ANC.'
  });
  assert.ok(html.includes('svc-badge'));
  assert.ok(html.includes('În lucru'));
  assert.ok(!html.includes('<a '), 'cardul în lucru nu trebuie să conțină link');
});

test('cardul escapează conținutul din manifest', () => {
  const html = G.randCard({
    slug: 'x', stare: 'ancora', icon: 'i-scales',
    titluCard: '<script>alert(1)</script>', lead: 'ok'
  });
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
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

test('grila conține toate cele zece carduri', () => {
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
