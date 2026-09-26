const { chromium } = require('playwright');
const fs = require('fs');
const DOCS = process.env.DOCS || require('path').join(__dirname, '..', 'docs');
let pass = 0, fail = 0; const bad = [];
const check = (n, got, want) => {
  const ok = String(got) === String(want);
  ok ? pass++ : (fail++, bad.push(`${n} → ${got} (attendu ${want})`));
  if (!ok) console.log(`✘ ${n} → ${got}`);
};
(async () => {
  const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const pages = fs.readdirSync(DOCS).filter(f => f.endsWith('.html'));
  for (const f of pages) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => { if (m.type() === 'error' && !/cloudflareinsights|net::|ERR_/.test(m.text())) errs.push(m.text()); });
    await p.goto('file://' + DOCS + '/' + f);
    const cls = await p.evaluate(() => new Promise(r => {
      let v = 0;
      new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) v += e.value; }))
        .observe({ type: 'layout-shift', buffered: true });
      setTimeout(() => r(+v.toFixed(4)), 1200);
    }));
    // Pages de service : ni calculateur, ni liens contextuels.
    const SERVICE = ['mentions-legales.html', 'nouveautes.html', 'a-propos.html', '404.html'];
    const calc = !SERVICE.includes(f);
    /* Les cinq pages « journée coupée » portent leur propre calculateur, sans
       historique : ni export CSV ni impression à attendre sur celles-là. */
    const histo = calc && !/journee-coupee/.test(f);
    check(`${f} · CLS`, cls, 0);
    check(`${f} · erreurs JS`, errs.length ? errs.join('|') : 0, 0);
    check(`${f} · boutons export`, await p.locator('#btn-csv, #btn-print').count(), histo ? 2 : 0);
    check(`${f} · débordement`, await p.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth), 0);
    check(`${f} · liens contextuels`, await p.locator('.voisins a').count(), calc ? 3 : 0);
    // 21 entrées au plan, dont la page courante qui n'est pas un lien. La page
    // d'erreur ne figure pas au plan : elle garde donc ses 21 liens.
    check(`${f} · plan complet`, await p.locator('.plan a').count(),
          f === '404.html' ? 21 : 20);
    // Seuls les liens internes se vérifient sur le disque : une source
    // officielle se termine parfois en « .html » sans vivre dans docs/.
    const morts = await p.$$eval('a[href$=".html"]', a => a.map(x => x.getAttribute('href')))
      .then(l => l.filter(h => !/^(https?:)?\/\//.test(h)));
    check(`${f} · liens valides`, morts.filter(h => !fs.existsSync(DOCS + '/' + h)).join(',') || 0, 0);
    await p.close();
  }
  console.log(`\nRÉSULTAT : ${pass} réussis, ${fail} échoués`);
  if (bad.length) console.log('ÉCHECS :\n  ' + bad.join('\n  '));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
