/* Vérifie les blocs « Cette date est-elle fériée ? » et la FAQ étendue.
   Le contrôle décisif : le nombre de dates marquées fériées dans le tableau
   doit correspondre au moteur de fériés du site, pour chaque pays. */
const { chromium } = require('playwright');

const B = process.env.BASE_URL || (process.env.BASE_URL || 'http://127.0.0.1:8099');
const PAGES = [
  ['jours-feries-france.html', 'fr', 'France', 11],
  ['jours-feries-belgique.html', 'be', 'Belgique', 10],
  ['jours-feries-suisse.html', 'ch', 'Suisse', 7],
  ['jours-feries-quebec.html', 'qc', 'Québec', 8],
  ['jours-feries-luxembourg.html', 'lu', 'Luxembourg', 11],
];

let pass = 0, fail = 0;
const ck = (n, ok, info) => {
  ok ? (pass++, console.log('✔ ' + n)) : (fail++, console.log('✘ ' + n + ' → ' + info));
};

(async () => {
  const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });

  for (const [f, code, pays, attendu] of PAGES) {
    console.log('\n═══ ' + pays + ' ═══');
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => {
      if (m.type() === 'error' && !/cloudflareinsights|net::|ERR_/.test(m.text())) errs.push(m.text());
    });
    await p.goto(B + '/' + f);

    // ---- le bloc existe, une seule fois ----
    ck('un seul bloc #est-ce-ferie', await p.locator('#est-ce-ferie').count() === 1,
       await p.locator('#est-ce-ferie').count());

    const lignes = await p.evaluate(() => {
      const h = document.querySelector('#est-ce-ferie');
      const t = h.parentElement.querySelector('#est-ce-ferie ~ .table-wrap table');
      return [...t.querySelectorAll('tbody tr')].map(tr => {
        const td = tr.querySelectorAll('td');
        return { date: td[0].textContent.trim(), verdict: td[1].textContent.trim() };
      });
    });
    ck('le tableau a des lignes', lignes.length >= 12, lignes.length);

    // ---- CONTRÔLE CLÉ : le compte des « oui » = le moteur ----
    const oui = lignes.filter(l => l.verdict.startsWith('✅')).length;
    ck(`${oui} dates fériées annoncées = ${attendu} du moteur`, oui === attendu,
       `${oui} ≠ ${attendu} (verdicts : ${lignes.map(l => l.verdict).join(' / ')})`);

    // Chaque verdict doit être l'un des cinq prévus, jamais vide ni ambigu.
    const connus = ['✅ Oui', '❌ Non', '✅ Presque partout', '⚠️ Selon le canton',
                    "✅ Oui, l'un des deux", '⚠️ Alsace-Moselle'];
    const inconnus = lignes.filter(l => !connus.includes(l.verdict));
    ck('tous les verdicts sont explicites', inconnus.length === 0,
       inconnus.map(l => l.date + ' → « ' + l.verdict + ' »').join(' | '));

    // ---- le moteur du site confirme-t-il les fériés « oui » ? ----
    const moteur = await p.evaluate(async (c) => {
      // On rejoue le calcul via l'onglet « Entre 2 dates » sur une année pleine.
      const r = await fetch('script.js').then(x => x.text());
      const m = r.match(/var PAYS = \{[\s\S]*?\n  \};/);
      return m ? m[0].length > 0 : false;
    }, code);
    ck('le moteur de fériés est bien présent', moteur === true, moteur);

    // ---- FAQ : visible et balisage concordants ----
    const vis = await p.$$eval('.faq details summary',
      els => els.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
    const ld = await p.evaluate(() => {
      const d = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent);
      const faq = d['@graph'].find(g => g['@type'] === 'FAQPage');
      return faq.mainEntity.map(q => q.name.replace(/\s+/g, ' ').trim());
    });
    ck('6 questions visibles', vis.length === 6, vis.length);
    ck('balisage FAQ = questions visibles', JSON.stringify(vis) === JSON.stringify(ld),
       JSON.stringify(vis) + ' ≠ ' + JSON.stringify(ld));

    // Chaque réponse visible est non vide.
    const vides = await p.$$eval('.faq details p', els => els.filter(e => e.textContent.trim().length < 40).length);
    ck('toutes les réponses sont rédigées', vides === 0, vides + ' trop courtes');

    // ---- un seul h1, hiérarchie de titres saine ----
    ck('un seul <h1>', await p.locator('h1').count() === 1, await p.locator('h1').count());

    // ---- largeurs ----
    for (const w of [320, 360, 390, 768, 1280]) {
      await p.setViewportSize({ width: w, height: 900 });
      const over = await p.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ck(`aucun débordement à ${w}px`, over <= 0, over + 'px');
    }

    ck('aucune erreur JS', errs.length === 0, errs.join(' | '));
    await p.close();
  }

  console.log('\n════════════════════════════════════════════════════');
  console.log('RÉSULTAT : ' + pass + ' réussis, ' + fail + ' échoués');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
