'use strict';

const TELEFOANE = '0734 032 624 · 0756 576 933';

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function subiectNotificare(c) {
  return c.tip === 'cerere'
    ? `Cerere nouă — ${c.titluServiciu} — ${c.nume}`
    : `Mesaj nou de pe artarului.ro — ${c.nume}`;
}

function emailNotificare(c, cfg) {
  const linii = [
    c.tip === 'cerere'
      ? 'Cerere nouă de consultanță, primită prin artarului.ro'
      : 'Mesaj nou primit prin formularul de pe artarului.ro',
    '-'.repeat(48),
    '',
    `Nume:     ${c.nume}`,
    `Telefon:  ${c.telefon}`,
    `Email:    ${c.email}`
  ];

  if (c.tip === 'cerere') {
    linii.push(`Serviciu: ${c.titluServiciu}`);
    linii.push(`Entitate: ${c.tipEntitate}`);
    linii.push(`Localitate: ${c.localitate}`);
  }

  linii.push('', 'Mesaj:', c.mesaj, '');

  return {
    from: cfg.from,
    to: cfg.to,
    reply_to: c.email,
    subject: subiectNotificare(c),
    text: linii.join('\n')
  };
}

function emailConfirmare(c, cfg) {
  const ce = c.tip === 'cerere'
    ? `cererea ta pentru „${c.titluServiciu}”`
    : 'mesajul tău';

  const text = [
    `Bună, ${c.nume},`,
    '',
    `Îți mulțumim — am primit ${ce}. Revenim cu un răspuns în cel mult două zile lucrătoare.`,
    '',
    'Ce am primit de la tine:',
    `  Telefon: ${c.telefon}`,
    `  Email:   ${c.email}`,
    ...(c.tip === 'cerere' ? [`  Entitate: ${c.tipEntitate}`, `  Localitate: ${c.localitate}`] : []),
    '',
    'Mesajul tău:',
    c.mesaj,
    '',
    `Dacă e urgent, sună-ne: ${TELEFOANE}`,
    '',
    'Asociația Arțarului',
    'https://artarului.ro',
    '',
    'Acest email este o confirmare automată. Nu răspunde la această adresă.'
  ].join('\n');

  const html = `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#4A4A4A">
  <p>Bună, ${escapeHtml(c.nume)},</p>
  <p>Îți mulțumim — am primit ${escapeHtml(c.tip === 'cerere' ? `cererea ta pentru „${c.titluServiciu}”` : 'mesajul tău')}. Revenim cu un răspuns în cel mult două zile lucrătoare.</p>
  <p><strong>Ce am primit de la tine</strong><br>
  Telefon: ${escapeHtml(c.telefon)}<br>
  Email: ${escapeHtml(c.email)}${c.tip === 'cerere' ? `<br>Entitate: ${escapeHtml(c.tipEntitate)}<br>Localitate: ${escapeHtml(c.localitate)}` : ''}</p>
  <p><strong>Mesajul tău</strong><br>${escapeHtml(c.mesaj).replace(/\n/g, '<br>')}</p>
  <p>Dacă e urgent, sună-ne: ${TELEFOANE}</p>
  <p style="margin-top:24px">Asociația Arțarului<br>
  <a href="https://artarului.ro" style="color:#708238">artarului.ro</a></p>
  <p style="font-size:13px;color:#8a8a8a">Acest email este o confirmare automată. Nu răspunde la această adresă.</p>
</div>`;

  return {
    from: cfg.from,
    to: c.email,
    subject: 'Am primit mesajul tău — Asociația Arțarului',
    text,
    html
  };
}

module.exports = { emailNotificare, emailConfirmare, escapeHtml };
