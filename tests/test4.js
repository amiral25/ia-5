const { chromium } = require('playwright');
const U = (process.env.BASE_URL || (process.env.BASE_URL || 'http://127.0.0.1:8099')) + '/index.html';
let pass = 0, fail = 0; const bad = [];
const check = (n, got, want) => {
  const ok = String(got) === String(want);
  ok ? pass++ : (fail++, bad.push(`${n}\n     attendu: ${want}\n     obtenu : ${got}`));
  console.log(`${ok ? '✔' : '✘'} ${n}${ok ? '' : `  → ${got}`}`);
};
(async () => {
  const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/cloudflareinsights|net::|ERR_/.test(m.text())) errs.push(m.text()); });
  const val = () => p.textContent('#res-value');
  const cells = () => p.$$eval('.res-cell', e => e.map(x => x.querySelector('b').textContent));
  await p.goto(U); await p.waitForTimeout(300);

  console.log('\n═══ 1. Millisecondes ═══');
  check('colonne masquée par défaut', await p.locator('.r-ms').first().isVisible(), false);
  check('non régressé : total par défaut', await val(), '4h 15min');
  await p.click('.switch-ms'); await p.waitForTimeout(200);
  check('colonne visible une fois cochée', await p.locator('.r-ms').first().isVisible(), true);
  check('marqueur posé sur <html>', await p.getAttribute('html', 'data-ms'), '1');
  const row = n => p.locator('.rows .row').nth(n);
  await row(0).locator('.r-ms').fill('500');
  await row(1).locator('.r-ms').fill('750'); await p.waitForTimeout(200);
  // 15 300 s + 1,25 s : les millisecondes ajoutent une seconde, pas une minute.
  check('2h30,500 + 1h45,750 = 4h 15min 01s 250ms', await val(), '4h 15min 01s 250ms');
  // fr-FR sépare les milliers par une espace fine insécable (U+202F).
  check('secondes totales précises', (await cells())[2].replace(/\s/g, ' '), '15 301,250 s');
  await row(0).locator('.r-h').fill(''); await row(0).locator('.r-m').fill('');
  await row(1).locator('.r-h').fill(''); await row(1).locator('.r-m').fill('');
  await row(1).locator('.r-ms').fill('600'); await p.waitForTimeout(200);
  check('500ms + 600ms = 1s 100ms', await val(), '1s 100ms');
  await row(1).locator('.sg-minus').click(); await p.waitForTimeout(200);
  check('500ms − 600ms = −100ms', await val(), '−100ms');

  console.log('\n═══ 2. Désactivation : les ms saisies sont effacées ═══');
  await p.click('.switch-ms'); await p.waitForTimeout(250);
  check('valeurs ms remises à vide', await row(0).locator('.r-ms').inputValue(), '');
  check('marqueur retiré', await p.getAttribute('html', 'data-ms'), null);

  console.log('\n═══ 3. Mémorisation entre visites (sans décalage) ═══');
  await p.click('.switch-ms'); await p.waitForTimeout(200);
  await p.reload(); await p.waitForTimeout(300);
  check('option toujours cochée', await p.locator('#opt-ms').isChecked(), true);
  check('marqueur posé dès le chargement', await p.getAttribute('html', 'data-ms'), '1');
  const cls = await p.evaluate(() => new Promise(r => {
    let v = 0;
    new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) v += e.value; }))
      .observe({ type: 'layout-shift', buffered: true });
    setTimeout(() => r(+v.toFixed(4)), 1200);
  }));
  check('CLS nul avec les ms activées', cls, 0);
  await p.evaluate(() => localStorage.removeItem('cd-ms'));
  await p.reload(); await p.waitForTimeout(300);

  console.log('\n═══ 4. Report du total ═══');
  await p.click('#btn-retenue'); await p.waitForTimeout(300);
  check('2h30 + 1h45 reporté → 4h 15min', await val(), '4h 15min');
  check('ligne 1 = 4 h', await row(0).locator('.r-h').inputValue(), '4');
  check('ligne 1 = 15 min', await row(0).locator('.r-m').inputValue(), '15');
  check('ligne 2 vidée', await row(1).locator('.r-h').inputValue(), '');
  check('deux lignes seulement', await p.locator('.rows .row').count(), 2);
  await row(1).locator('.r-h').fill('1'); await p.waitForTimeout(200);
  check('on enchaîne : 4h15 + 1h = 5h 15min', await val(), '5h 15min');
  await p.click('#btn-retenue'); await p.waitForTimeout(300);
  check('report du cumul', await row(0).locator('.r-h').inputValue(), '5');

  console.log('\n═══ 5. Report d\'un total négatif ═══');
  await p.click('#btn-reset'); await p.waitForTimeout(200);
  await row(0).locator('.r-h').fill('2');
  await row(1).locator('.r-h').fill('5'); await row(1).locator('.sg-minus').click();
  await p.waitForTimeout(300);
  check('2h − 5h = −3h 00min', await val(), '−3h 00min');
  await p.click('#btn-retenue'); await p.waitForTimeout(300);
  check('le signe est conservé au report', await val(), '−3h 00min');
  check('ligne 1 passée en soustraction',
    await row(0).locator('.sg-minus').getAttribute('aria-pressed'), 'true');

  console.log('\n═══ 6. Raccourcis clavier ═══');
  /* Une touche seule n'agit plus que si le focus est dans le calculateur :
     taper « m » en lisant un article effaçait le calcul (WCAG 2.1.4). On donne
     donc le focus à un bouton de la carte, qui n'est pas un champ de saisie. */
  const dansCalc = () => p.locator('#btn-retenue').focus();

  await p.click('#btn-reset'); await p.waitForTimeout(200);
  await dansCalc();
  const n0 = await p.locator('.rows .row').count();
  await p.keyboard.press('+'); await p.waitForTimeout(150);
  check('« + » ajoute une ligne', await p.locator('.rows .row').count(), n0 + 1);
  await dansCalc();
  await p.keyboard.press('-'); await p.waitForTimeout(150);
  check('« - » ajoute une ligne à soustraire',
    await p.locator('.rows .row').last().locator('.sg-minus').getAttribute('aria-pressed'), 'true');
  await dansCalc();
  await p.keyboard.press('m'); await p.waitForTimeout(300);
  check('« m » réinitialise', await p.locator('.rows .row').count(), 2);

  console.log('\n═══ 6 bis. Hors du calculateur, les touches ne font rien ═══');
  await p.fill('#quick', '2h30 + 1h45'); await p.waitForTimeout(200);
  const avant = await val();
  await p.locator('.content a, .plan a').first().focus();
  await p.keyboard.press('m'); await p.waitForTimeout(300);
  check('« m » depuis un lien du contenu n\'efface rien', await val(), avant);
  await p.keyboard.press('+'); await p.waitForTimeout(150);
  check('« + » depuis un lien du contenu n\'ajoute rien',
    await p.locator('.rows .row').count(), 2);

  console.log('\n═══ 6 ter. La remise à zéro est annulable ═══');
  await dansCalc();
  await p.keyboard.press('m'); await p.waitForTimeout(300);
  check('le calcul est bien effacé', await p.locator('#quick').inputValue(), '');
  check('le message propose d\'annuler',
    await p.locator('#toast .toast-annuler').isVisible(), true);
  await p.click('#toast .toast-annuler'); await p.waitForTimeout(300);
  check('le calcul est rétabli', await p.locator('#quick').inputValue(), '2h30 + 1h45');
  check('et son résultat aussi', await val(), avant);
  await p.fill('#quick', ''); await p.waitForTimeout(200);
  await p.click('#btn-reset'); await p.waitForTimeout(200);

  console.log('\n═══ 7. Les raccourcis ne gênent pas la saisie ═══');
  await p.fill('#quick', '2h30');
  await p.locator('#quick').press('+');
  await p.waitForTimeout(200);
  check('« + » tapé dans le champ n\'ajoute pas de ligne', await p.locator('.rows .row').count(), 2);
  check('le caractère est bien saisi', await p.locator('#quick').inputValue(), '2h30+');
  await p.fill('#quick', '2h30 + 1h45'); await p.waitForTimeout(200);
  check('la saisie libre fonctionne toujours', await val(), '4h 15min');
  await p.fill('#quick', ''); await p.waitForTimeout(200);

  console.log('\n═══ 8. Non-régression des autres onglets ═══');
  await p.click('#tab-2');
  await p.fill('#h-start', '08:30'); await p.fill('#h-end', '17:15'); await p.fill('#h-pause', '45');
  await p.waitForTimeout(200);
  check('onglet 2 intact', await val(), '8h 00min');
  await p.click('#tab-3');
  await p.fill('#d-start', '2026-01-01'); await p.fill('#d-end', '2026-12-31'); await p.waitForTimeout(250);
  check('onglet 3 intact', (await cells())[0], '252');
  await p.click('#tab-4'); await p.fill('#m-n', '3'); await p.waitForTimeout(200);
  check('onglet 4 intact', await val(), '7h 30min');
  // Le bouton vit dans l'onglet 1, donc masqué ici : c'est le raccourci « w »
  // qui atteint ce cas, et c'est lui qui doit refuser poliment.
  // « #btn-retenue » vit dans l'onglet 1 : hors de lui, on prend un bouton de
  // la barre d'actions, qui appartient aussi au calculateur.
  await p.locator('#btn-copy').focus();
  await p.keyboard.press('w'); await p.waitForTimeout(250);
  check('le report est refusé hors onglet 1', await val(), '7h 30min');
  check('un message l\'explique', await p.textContent('#toast'), 'Le report ne concerne que l\'addition');
  await p.click('#tab-1'); await p.waitForTimeout(200);

  console.log('\n═══ 9. Largeurs ═══');
  await p.evaluate(() => localStorage.setItem('cd-ms', '1'));
  await p.reload(); await p.waitForTimeout(300);
  for (const w of [320, 360, 390, 768, 1280]) {
    await p.setViewportSize({ width: w, height: 800 });
    await p.waitForTimeout(150);
    check(`aucun débordement à ${w}px avec les ms`, await p.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth), 0);
  }
  check('aucune erreur JS', errs.length ? errs.join(' | ') : 0, 0);

  console.log(`\n${'═'.repeat(52)}\nRÉSULTAT : ${pass} réussis, ${fail} échoués`);
  if (bad.length) console.log('\nÉCHECS :\n  ' + bad.join('\n  '));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
