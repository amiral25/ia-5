const { chromium } = require('playwright');
const B = process.env.BASE_URL || (process.env.BASE_URL || 'http://127.0.0.1:8099');
let pass = 0, fail = 0;
const ck = (n, ok, info) => { ok ? (pass++, console.log('✔ ' + n)) : (fail++, console.log('✘ ' + n + ' → ' + info)); };
(async () => {
  const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const p = await b.newPage();

  // 1. depuis une sous-page, le logo ramène à la racine
  await p.goto(B + '/jours-feries-belgique.html');
  await p.click('a.brand');
  await p.waitForLoadState('load');
  ck('logo → racine', p.url() === B + '/', p.url());
  ck('c’est bien la calculatrice', await p.locator('#quick').count() === 1, 'pas de #quick');

  // 2. le fil d’Ariane aussi
  await p.goto(B + '/multiplier-diviser-une-duree.html');
  await p.click('nav.fil a');
  await p.waitForLoadState('load');
  ck('fil d’Ariane → racine', p.url() === B + '/', p.url());

  // 3. aucun lien interne cassé sur les 14 pages
  const fs = require('fs');
  const pages = fs.readdirSync((process.env.DOCS || require('path').join(__dirname, '..', 'docs'))).filter(f => f.endsWith('.html'));
  const vus = new Set(); let casses = 0;
  for (const f of pages) {
    await p.goto(B + '/' + f);
    const hrefs = await p.$$eval('a[href]', as => as.map(a => a.getAttribute('href')));
    for (const h of hrefs) {
      if (!h || /^(https?:|mailto:|#)/.test(h)) continue;
      const u = new URL(h, B + '/' + f).toString();
      if (vus.has(u)) continue; vus.add(u);
      const r = await p.request.get(u);
      if (!r.ok()) { casses++; console.log('   cassé : ' + u + ' (' + r.status() + ') depuis ' + f); }
    }
  }
  ck('aucun lien interne cassé (' + vus.size + ' adresses testées)', casses === 0, casses + ' cassés');

  console.log('\nRÉSULTAT : ' + pass + ' réussis, ' + fail + ' échoués');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
