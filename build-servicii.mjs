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

export function hrefCard(s) {
  return s.stare === 'in-lucru' ? null : `servicii/${s.slug}.html`;
}

export function randCard(s) {
  const href = hrefCard(s);
  const eticheta = s.eticheta
    ? `\n          <span class="svc-eticheta">${esc(s.eticheta)}</span>`
    : '';
  const corp = `
          <span class="svc-icon" aria-hidden="true"><svg viewBox="0 0 256 256"><use href="#${esc(s.icon)}"/></svg></span>
          <h3 class="svc-title">${esc(s.titluCard)}</h3>${eticheta}
          <p class="svc-text">${esc(s.lead)}</p>`;

  if (!href) {
    return `        <article class="svc svc--in-lucru">${corp}
          <span class="svc-badge">În lucru</span>
        </article>`;
  }

  return `        <article class="svc">${corp}
          <a class="svc-card-link" href="${href}">
            <span>Detalii</span>
            <svg class="link-ico" viewBox="0 0 256 256" aria-hidden="true"><use href="#i-arrow-right"/></svg>
          </a>
        </article>`;
}

export function randGrila(manifest) {
  return manifest.familii.map((f) => {
    const carduri = manifest.servicii
      .filter((s) => s.familie === f.id)
      .sort((a, b) => a.ordine - b.ordine)
      .map(randCard)
      .join('\n');

    return `      <section class="svc-family" aria-labelledby="fam-${esc(f.id)}" data-familie="${esc(f.id)}">
        <img class="svc-family-leaf" src="assets/img/leaf-sage-480.webp" width="260" height="241" alt="" loading="lazy" aria-hidden="true">
        <header class="svc-family-head" data-reveal>
          <h2 id="fam-${esc(f.id)}" class="svc-family-title">${esc(f.titlu)}</h2>
          <p class="svc-family-lead">${esc(f.lead)}</p>
        </header>
        <div class="svc-index">
${carduri}
        </div>
      </section>`;
  }).join('\n\n');
}

const PARTIALS = ['head', 'nav', 'footer', 'sprite', 'formular'];

export function incarcaPartials(dir = path.join(AICI, 'partials')) {
  const p = {};
  for (const nume of PARTIALS) {
    p[nume] = fs.readFileSync(path.join(dir, `${nume}.html`), 'utf8');
  }
  return p;
}

function bloc(clasa, interior) {
  return `    <section class="section ${clasa}">\n      <div class="section-inner">\n${interior}\n      </div>\n    </section>`;
}

function jsonLd(obiect) {
  return `  <script type="application/ld+json">\n${JSON.stringify(obiect, null, 2)}\n  </script>`;
}

export function randPagina(s, manifest, partials) {
  const P = '../';
  const canonical = `https://artarului.ro/servicii/${s.slug}.html`;

  const head = prefixeaza(
    partials.head
      .replace(/\{\{SEO_TITLE\}\}/g, esc(s.seo.title))
      .replace(/\{\{SEO_DESCRIPTION\}\}/g, esc(s.seo.description))
      .replace(/\{\{CANONICAL\}\}/g, canonical),
    P);

  const formular = prefixeaza(randFormular(partials.formular, {
    formular: 'cerere',
    redirect: `/servicii/${s.slug}.html`,
    sitekey: '{{TURNSTILE_SITEKEY}}',
    serviciu: s.slug,
    manifest
  }), P);

  const bucati = [];

  // 1. breadcrumb
  bucati.push(`    <nav class="breadcrumb" aria-label="Traseu">
      <ol>
        <li><a href="${P}index.html">Acasă</a></li>
        <li><a href="${P}servicii.html">Servicii</a></li>
        <li aria-current="page">${esc(s.titluCard)}</li>
      </ol>
    </nav>`);

  // 2. head de pagină
  bucati.push(`    <section class="page-head">
      <div class="section-inner">
        <span class="svc-icon" aria-hidden="true"><svg viewBox="0 0 256 256"><use href="#${esc(s.icon)}"/></svg></span>
        <h1 class="page-title">${esc(s.titluPagina)}</h1>
        <p class="page-lead">${esc(s.lead)}</p>
      </div>
    </section>`);

  // 3. pentru cine — doar dacă există
  if (s.pentruCine && s.pentruCine.length) {
    bucati.push(bloc('', `        <h2 class="aside-label">Pentru cine</h2>
        <ul class="pill-list">
${s.pentruCine.map((x) => `          <li>${esc(x)}</li>`).join('\n')}
        </ul>`));
  }

  // 4. context
  if (s.context && s.context.length) {
    bucati.push(bloc('', s.context.map((par) => `        <p class="svc-detail-text">${esc(par)}</p>`).join('\n')));
  }

  // 5. pași — doar dacă există
  if (s.pasi && s.pasi.length) {
    bucati.push(bloc('tint', `        <h2 class="section-title">Cum decurge</h2>
        <ol class="steps-flow">
${s.pasi.map((pas) => `          <li><strong>${esc(pas.titlu)}</strong>${pas.text ? ' — ' + esc(pas.text) : ''}</li>`).join('\n')}
        </ol>`));
  }

  // 6. livrabile, grupate
  if (s.livrabile && s.livrabile.length) {
    const grupuri = s.livrabile.map((g) => {
      const titlu = g.titlu ? `        <h3 class="aside-label">${esc(g.titlu)}</h3>\n` : '';
      return titlu + `        <ul class="pill-list">
${g.elemente.map((el) => `          <li>${esc(el)}</li>`).join('\n')}
        </ul>`;
    }).join('\n');
    bucati.push(bloc('', `        <h2 class="section-title">Ce cuprinde</h2>\n${grupuri}`));
  }

  // 7. FAQ — doar dacă există
  if (s.faq && s.faq.length) {
    bucati.push(bloc('', `        <h2 class="section-title">Întrebări frecvente</h2>
        <div class="faq-lista">
${s.faq.map((q) => `          <details>
            <summary>${esc(q.intrebare)}</summary>
            <p>${esc(q.raspuns)}</p>
          </details>`).join('\n')}
        </div>`));
  }

  // 8. rezultatul
  if (s.rezultat) {
    bucati.push(bloc('', `        <p class="svc-result"><span class="svc-result-text">${esc(s.rezultat)}</span></p>`));
  }

  // 9. formular
  bucati.push(bloc('', `        <h2 class="section-title">Cere o ofertă</h2>\n${formular}`));

  // JSON-LD
  const ld = [
    jsonLd({
      '@context': 'https://schema.org', '@type': 'Service',
      name: s.titluPagina, description: s.seo.description, url: canonical,
      provider: { '@type': 'NGO', name: 'Asociația Arțarului', url: 'https://artarului.ro' }
    }),
    jsonLd({
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Acasă', item: 'https://artarului.ro/' },
        { '@type': 'ListItem', position: 2, name: 'Servicii', item: 'https://artarului.ro/servicii.html' },
        { '@type': 'ListItem', position: 3, name: s.titluCard, item: canonical }
      ]
    })
  ];
  if (s.faq && s.faq.length) {
    ld.push(jsonLd({
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: s.faq.map((q) => ({
        '@type': 'Question', name: q.intrebare,
        acceptedAnswer: { '@type': 'Answer', text: q.raspuns }
      }))
    }));
  }

  return `<!-- GENERAT din servicii.json — nu edita manual -->
${head}
${ld.join('\n')}
</head>
<body>
${prefixeaza(partials.sprite, P)}
${prefixeaza(partials.nav, P)}
  <main id="main">
${bucati.join('\n\n')}
  </main>
${prefixeaza(partials.footer, P)}
<script src="${P}js/main.js?v=20260820"></script>
</body>
</html>
`;
}

export function randPaginaCerere(manifest, partials) {
  const formular = randFormular(partials.formular, {
    formular: 'cerere',
    redirect: '/cerere-consultanta.html',
    sitekey: '{{TURNSTILE_SITEKEY}}',
    serviciu: null,
    manifest
  });

  const head = partials.head
    .replace(/\{\{SEO_TITLE\}\}/g, 'Cerere de consultanță | Asociația Arțarului')
    .replace(/\{\{SEO_DESCRIPTION\}\}/g, 'Completează formularul și revenim cu pașii următori.')
    .replace(/\{\{CANONICAL\}\}/g, 'https://artarului.ro/cerere-consultanta.html')
    + '\n  <meta name="robots" content="noindex, follow">';

  return `<!-- GENERAT din servicii.json — nu edita manual -->
${head}
</head>
<body>
${partials.sprite}
${partials.nav}
  <main id="main">
    <section class="page-head">
      <div class="section-inner">
        <h1 class="page-title">Cere o ofertă</h1>
        <p class="page-lead">Spune-ne ce te interesează, iar noi revenim cu pașii următori.</p>
      </div>
    </section>
    <section class="section">
      <div class="section-inner">
${formular}
      </div>
    </section>
  </main>
${partials.footer}
<script src="js/main.js?v=20260820"></script>
</body>
</html>
`;
}

export function randFormular(partial, { formular, redirect, sitekey, serviciu = null, manifest = null }) {
  let html = partial;

  // Varianta `cerere` păstrează blocurile; varianta `contact` le scoate cu tot cu conținut.
  if (formular === 'cerere') {
    html = html.replace(/<!-- \/?VARIANTA:cerere -->\n?/g, '');
  } else {
    html = html.replace(/<!-- VARIANTA:cerere -->[\s\S]*?<!-- \/VARIANTA:cerere -->\n?/g, '');
  }

  // Opțiunile din <select name="serviciu"> vin din manifest — nu mai sunt hardcodate în partial.
  if (html.includes('BEGIN:optiuni-serviciu') && manifest) {
    const optiuni = manifest.servicii
      .map((s) => `      <option value="${esc(s.slug)}">${esc(s.titluCard)}</option>`)
      .join('\n');
    html = injecteazaIntreMarcaje(html, 'optiuni-serviciu', optiuni);
  }

  // Preselectează serviciul, dacă pagina aparține unuia. Trebuie să vină după
  // injecția opțiunilor (altfel n-ar exista niciun <option> de preselectat)
  // și înainte de substituirea marcajelor {{…}}.
  if (serviciu) {
    html = html.replace(
      new RegExp(`(<option value="${serviciu}")`),
      '$1 selected'
    );
  }

  html = html
    .replace(/\{\{FORMULAR\}\}/g, esc(formular))
    .replace(/\{\{REDIRECT\}\}/g, esc(redirect))
    .replace(/\{\{TURNSTILE_SITEKEY\}\}/g, esc(sitekey));

  return html;
}

export function randServiciiPermise(manifest) {
  const perechi = manifest.servicii
    .map((s) => `  '${s.slug}': ${JSON.stringify(s.titluCard)}`)
    .join(',\n');
  return `'use strict';
/* GENERAT din servicii.json — nu edita manual. Rulează: node build-servicii.mjs */

const TITLURI = {
${perechi}
};

const SLUGURI_PERMISE = Object.keys(TITLURI);

module.exports = { SLUGURI_PERMISE, TITLURI };
`;
}

export function scrieTot() {
  const manifest = incarcaManifest();
  const partials = incarcaPartials();
  const scrise = [];

  // validare înainte de a atinge discul
  const idFamilii = new Set(manifest.familii.map((f) => f.id));
  for (const s of manifest.servicii) {
    if (!slugValid(s.slug)) throw new Error(`Slug nevalid: ${s.slug}`);
    if (!idFamilii.has(s.familie)) throw new Error(`${s.slug}: familie inexistentă ${s.familie}`);
  }

  const cuPagina = manifest.servicii.filter((s) => s.stare === 'pagina');
  const dirServicii = path.join(AICI, 'servicii');
  fs.mkdirSync(dirServicii, { recursive: true });

  // 0. lista albă a serverului, derivată din manifest — înainte ca paginile
  //    să fie scrise, ca API-ul să nu rămână niciodată desincronizat de ele.
  fs.writeFileSync(path.join(AICI, 'api', '_servicii-permise.js'), randServiciiPermise(manifest));
  scrise.push('api/_servicii-permise.js');

  // 1. paginile de serviciu
  for (const s of cuPagina) {
    const cale = path.join(dirServicii, `${s.slug}.html`);
    fs.writeFileSync(cale, randPagina(s, manifest, partials));
    scrise.push(`servicii/${s.slug}.html`);
  }

  // 2. orfanii: pagini pentru servicii care nu mai au starea `pagina`
  const permise = new Set(cuPagina.map((s) => `${s.slug}.html`));
  for (const f of fs.readdirSync(dirServicii)) {
    if (f.endsWith('.html') && !permise.has(f)) {
      fs.unlinkSync(path.join(dirServicii, f));
      scrise.push(`ȘTERS servicii/${f}`);
    }
  }

  // 3. pagina de cerere
  fs.writeFileSync(path.join(AICI, 'cerere-consultanta.html'), randPaginaCerere(manifest, partials));
  scrise.push('cerere-consultanta.html');

  // 4. grila din hub, doar între markere
  const caleHub = path.join(AICI, 'servicii.html');
  fs.writeFileSync(caleHub, injecteazaIntreMarcaje(
    fs.readFileSync(caleHub, 'utf8'), 'carduri-servicii', randGrila(manifest)));
  scrise.push('servicii.html');

  // 5. sitemap, doar între markere
  const caleSitemap = path.join(AICI, 'sitemap.xml');
  const intrari = cuPagina.map((s) =>
    `  <url><loc>https://artarului.ro/servicii/${s.slug}.html</loc><changefreq>monthly</changefreq></url>`
  ).join('\n');
  fs.writeFileSync(caleSitemap, injecteazaIntreMarcaje(
    fs.readFileSync(caleSitemap, 'utf8'), 'servicii', intrari));
  scrise.push('sitemap.xml');

  return scrise;
}

// CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  for (const f of scrieTot()) console.log('  ' + f);
}
