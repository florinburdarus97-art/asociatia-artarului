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
  assert.throws(() => G.injecteazaIntreMarcaje(dublu, 'carduri-servicii', 'x'), /de două ori|duplicat/i);
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
