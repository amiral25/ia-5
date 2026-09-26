/* Vérifie les téléchargements « jours fériés » des 4 pages pays :
   le CSV et l'ICS doivent correspondre EXACTEMENT au tableau affiché. */
const { chromium } = require('playwright');
const fs = require('fs');

const B = process.env.BASE_URL || (process.env.BASE_URL || 'http://127.0.0.1:8099');
const PAGES = [
  ['jours-feries-france.html', 'France', 11],
  ['jours-feries-belgique.html', 'Belgique', 10],
  ['jours-feries-suisse.html', 'Suisse', 7],
  ['jours-feries-luxembourg.html', 'Luxembourg', 11],
  ['jours-feries-quebec.html', 'Québec', 8],
];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
              'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

let pass = 0, fail = 0;
const ck = (n, ok, info) => {
  ok ? (pass++, console.log('✔ ' + n)) : (fail++, console.log('✘ ' + n + ' → ' + info));
};
const oct = s => Buffer.byteLength(s, 'utf8');

/** « vendredi 1er janvier » → { jour: 'vendredi', d: 1, m: 1 } */
function parseDateFR(txt) {
  const p = txt.replace(/ /g, ' ').replace(/(\d+)\s*er\b/, '$1').trim().split(/\s+/);
  return { jour: p[0], d: parseInt(p[1], 10), m: MOIS.indexOf(p[2]) + 1 };
}

(async () => {
  const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const ctx = await b.newContext({ acceptDownloads: true });

  for (const [fichier, pays, attendu] of PAGES) {
    console.log('\n═══ ' + pays + ' ═══');
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => {
      if (m.type() === 'error' && !/cloudflareinsights|net::|ERR_/.test(m.text())) errs.push(m.text());
    });
    await p.goto(B + '/' + fichier);

    const blocs = await p.$$('.dl-feries');
    ck(pays + ' : 3 blocs de téléchargement', blocs.length === 3, blocs.length);

    for (const bloc of blocs) {
      const annee = await bloc.getAttribute('data-annee');

      // Le tableau qui précède immédiatement le bloc.
      const table = await bloc.evaluate(el => {
        const t = el.previousElementSibling.querySelector('table');
        // On compare au texte VISIBLE : la mention « (date passée) » est
        // destinée aux lecteurs d'écran et n'a rien à faire dans le CSV.
        const visible = (el) => {
          const c = el.cloneNode(true);
          c.querySelectorAll('.hors-ecran').forEach(x => x.remove());
          return c.textContent.trim();
        };
        return [...t.querySelectorAll('tbody tr')].map(tr => {
          const td = tr.querySelectorAll('td');
          return [visible(td[0]), visible(td[1])];
        });
      });
      ck(`  ${annee} : tableau de ${attendu} lignes`, table.length === attendu, table.length);

      // ---- CSV ----
      const [dlCsv] = await Promise.all([
        p.waitForEvent('download'),
        (await bloc.$('[data-dl="csv"]')).click(),
      ]);
      ck(`  ${annee} : nom du fichier CSV`,
         /^jours-feries-[a-z]+-\d{4}\.csv$/.test(dlCsv.suggestedFilename()),
         dlCsv.suggestedFilename());
      const csv = fs.readFileSync(await dlCsv.path(), 'utf8');

      ck(`  ${annee} : BOM UTF-8 pour Excel FR`, csv.charCodeAt(0) === 0xFEFF, csv.charCodeAt(0));
      ck(`  ${annee} : séparateur point-virgule`, csv.split('\r\n')[0] === '﻿Jour férié;Date;Jour de la semaine',
         JSON.stringify(csv.split('\r\n')[0]));

      const lignes = csv.replace(/^﻿/, '').split('\r\n').slice(1).filter(Boolean);
      ck(`  ${annee} : ${attendu} lignes dans le CSV`, lignes.length === attendu, lignes.length);

      let ecarts = [];
      lignes.forEach((l, i) => {
        const [nom, date, jour] = l.split(';');
        const ref = table[i];
        if (!ref) return ecarts.push(`ligne ${i} absente du tableau`);
        if (nom !== ref[0]) ecarts.push(`nom « ${nom} » ≠ « ${ref[0]} »`);
        const r = parseDateFR(ref[1]);
        const attenduDate = String(r.d).padStart(2, '0') + '/' +
                            String(r.m).padStart(2, '0') + '/' + annee;
        if (date !== attenduDate) ecarts.push(`date ${date} ≠ ${attenduDate} (${nom})`);
        if (jour !== r.jour) ecarts.push(`jour « ${jour} » ≠ « ${r.jour} » (${nom})`);
      });
      ck(`  ${annee} : le CSV correspond au tableau affiché`, ecarts.length === 0, ecarts.join(' | '));

      // ---- ICS ----
      const [dlIcs] = await Promise.all([
        p.waitForEvent('download'),
        (await bloc.$('[data-dl="ics"]')).click(),
      ]);
      ck(`  ${annee} : nom du fichier ICS`,
         /^jours-feries-[a-z]+-\d{4}\.ics$/.test(dlIcs.suggestedFilename()),
         dlIcs.suggestedFilename());
      const ics = fs.readFileSync(await dlIcs.path(), 'utf8');

      ck(`  ${annee} : fins de ligne CRLF`, !/[^\r]\n/.test(ics), 'LF nu trouvé');
      const li = ics.split('\r\n');
      ck(`  ${annee} : enveloppe VCALENDAR`,
         li[0] === 'BEGIN:VCALENDAR' && li[li.length - 2] === 'END:VCALENDAR',
         li[0] + ' … ' + li[li.length - 2]);
      ck(`  ${annee} : ${attendu} événements`,
         (ics.match(/BEGIN:VEVENT/g) || []).length === attendu &&
         (ics.match(/END:VEVENT/g) || []).length === attendu,
         (ics.match(/BEGIN:VEVENT/g) || []).length);

      const trop = li.filter(l => oct(l) > 75);
      ck(`  ${annee} : aucune ligne au-delà de 75 octets`, trop.length === 0,
         trop.map(l => oct(l) + 'o : ' + l).join(' | '));

      // Les DTSTART doivent être les mêmes dates que le CSV.
      const dts = [...ics.matchAll(/DTSTART;VALUE=DATE:(\d{8})/g)].map(m => m[1]);
      const attendus = lignes.map(l => {
        const [, d] = l.split(';');
        const [jj, mm, aa] = d.split('/');
        return aa + mm + jj;
      });
      ck(`  ${annee} : dates ICS identiques au CSV`,
         JSON.stringify(dts) === JSON.stringify(attendus),
         dts.join(',') + ' ≠ ' + attendus.join(','));

      // Journée entière : DTEND = lendemain de DTSTART.
      const paires = [...ics.matchAll(/DTSTART;VALUE=DATE:(\d{8})\r\nDTEND;VALUE=DATE:(\d{8})/g)];
      const mauvais = paires.filter(([, a, z]) => {
        const j = new Date(Date.UTC(+a.slice(0, 4), +a.slice(4, 6) - 1, +a.slice(6)));
        j.setUTCDate(j.getUTCDate() + 1);
        return z !== j.toISOString().slice(0, 10).replace(/-/g, '');
      });
      ck(`  ${annee} : DTEND = lendemain (journée entière)`,
         paires.length === attendu && mauvais.length === 0,
         paires.length + ' paires, ' + mauvais.length + ' fausses');
    }

    // Largeurs
    for (const w of [320, 360, 390, 768, 1280]) {
      await p.setViewportSize({ width: w, height: 800 });
      const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ck(`  aucun débordement à ${w}px`, over <= 0, over + 'px');
    }

    ck('  aucune erreur JS', errs.length === 0, errs.join(' | '));
    await p.close();
  }

  // Les pages calculatrice ne doivent pas être affectées.
  const p2 = await ctx.newPage();
  const errs2 = [];
  p2.on('pageerror', e => errs2.push(e.message));
  await p2.goto(B + '/');
  ck('\naccueil : aucun bloc de téléchargement fériés', (await p2.$$('.dl-feries')).length === 0);
  ck('accueil : aucune erreur JS', errs2.length === 0, errs2.join(' | '));

  console.log('\n════════════════════════════════════════════════════');
  console.log('RÉSULTAT : ' + pass + ' réussis, ' + fail + ' échoués');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
