const { chromium } = require('playwright');
const D = (process.env.DOCS || require('path').join(__dirname, '..', 'docs'));
let pass = 0, fail = 0; const bad = [];
const check = (n, got, want) => {
  const ok = String(got) === String(want);
  ok ? pass++ : (fail++, bad.push(`${n}\n     attendu: ${want}\n     obtenu : ${got}`));
  console.log(`${ok ? '✔' : '✘'} ${n}${ok ? '' : `  → ${got}`}`);
};
(async () => {
  const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read','clipboard-write'] });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const val = () => p.textContent('#res-value');
  const cells = () => p.$$eval('.res-cell', e => e.map(x => x.querySelector('b').textContent));
  // le lien est construit à partir de la balise canonique : on la rend locale
  const lien = async () => (await p.evaluate(() => {
    const c = document.querySelector('link[rel=canonical]');
    const vrai = c.href; c.href = location.href.split('?')[0];
    const btn = document.querySelector('#btn-share');
    let url = null;
    const orig = navigator.clipboard.writeText.bind(navigator.clipboard);
    return new Promise(r => { navigator.clipboard.writeText = t => { url = t; r(t); return Promise.resolve(); };
      btn.click(); setTimeout(()=>r(url), 300); });
  }));

  await p.goto('file://' + D + '/index.html'); await p.waitForTimeout(300);

  console.log('\n═══ 1. Onglet 1 — saisie rapide ═══');
  await p.fill('#quick', '2h30 + 1h45 - 20min'); await p.waitForTimeout(200);
  check('calcul de départ', await val(), '3h 55min');
  let u = await lien();
  check('paramètre q présent', /[?&]q=/.test(u), true);
  check('onglet encodé', /[?&]t=1/.test(u), true);
  await p.goto(u); await p.waitForTimeout(400);
  check('rouvre le même total', await val(), '3h 55min');
  check('champ rempli', await p.inputValue('#quick'), '2h30 + 1h45 - 20min');

  console.log('\n═══ 2. Onglet 1 — lignes détaillées ═══');
  await p.goto('file://' + D + '/index.html'); await p.waitForTimeout(300);
  const row = n => p.locator('.rows .row').nth(n);
  await row(0).locator('.r-h').fill('7'); await row(0).locator('.r-m').fill('30');
  await row(1).locator('.r-h').fill('1'); await row(1).locator('.r-m').fill('15');
  await row(1).locator('.sg-minus').click(); await p.waitForTimeout(250);
  check('calcul de départ', await val(), '6h 15min');
  u = await lien();
  check('paramètre l présent', /[?&]l=/.test(u), true);
  await p.goto(u); await p.waitForTimeout(400);
  check('rouvre le même total', await val(), '6h 15min');
  check('2e ligne toujours en soustraction',
    await row(1).locator('.sg-minus').getAttribute('aria-pressed'), 'true');
  check('valeurs restaurées', await row(0).locator('.r-h').inputValue(), '7');

  console.log('\n═══ 3. Onglet 2 — entre deux heures ═══');
  await p.goto('file://' + D + '/index.html'); await p.waitForTimeout(300);
  await p.click('#tab-2');
  await p.fill('#h-start', '21:00'); await p.fill('#h-end', '05:30'); await p.fill('#h-pause', '30');
  await p.waitForTimeout(250);
  check('poste de nuit', await val(), '8h 00min');
  u = await lien();
  await p.goto(u); await p.waitForTimeout(400);
  check('rouvre sur l’onglet 2', await p.locator('#tab-2').getAttribute('aria-selected'), 'true');
  check('même résultat', await val(), '8h 00min');
  check('pause restaurée', await p.inputValue('#h-pause'), '30');

  console.log('\n═══ 4. Onglet 3 — dates et pays ═══');
  await p.goto('file://' + D + '/index.html'); await p.waitForTimeout(300);
  await p.click('#tab-3');
  await p.selectOption('#d-pays', 'be');
  await p.fill('#d-start', '2026-01-01'); await p.fill('#d-end', '2026-12-31');
  await p.waitForTimeout(300);
  check('année belge', (await cells())[0], '253');
  u = await lien();
  check('pays encodé', /[?&]dp=be/.test(u), true);
  await p.goto(u); await p.waitForTimeout(400);
  check('rouvre sur l’onglet 3', await p.locator('#tab-3').getAttribute('aria-selected'), 'true');
  check('pays restauré', await p.inputValue('#d-pays'), 'be');
  check('même décompte', (await cells())[0], '253');

  console.log('\n═══ 5. Onglet 4 — multiplication ═══');
  await p.goto('file://' + D + '/index.html'); await p.waitForTimeout(300);
  await p.click('#tab-4');
  await p.fill('#m-h', '1'); await p.fill('#m-m', '20'); await p.fill('#m-n', '2,5');
  await p.waitForTimeout(250);
  check('1h20 × 2,5', await val(), '3h 20min');
  u = await lien();
  await p.goto(u); await p.waitForTimeout(400);
  check('même résultat', await val(), '3h 20min');
  check('virgule préservée', await p.inputValue('#m-n'), '2,5');
  await p.click('#tab-4'); await p.locator('.sg-div').click(); await p.waitForTimeout(250);
  check('division', await val(), '32min');
  u = await lien();
  await p.goto(u); await p.waitForTimeout(400);
  check('opération restaurée', await val(), '32min');

  console.log('\n═══ 6. Robustesse ═══');
  for (const q of ['?t=9', '?l=nimportequoi', '?q=', '?dp=zz&t=3', '?l=+2:30:0_', '?t=1&q=%C3%A9%C3%A9']) {
    await p.goto('file://' + D + '/index.html' + q); await p.waitForTimeout(350);
    const v = await val();
    check(`« ${q} » ne casse rien`, v !== null && v !== '' && errs.length === 0, true);
  }

  console.log('\n═══ 7. Le lien pointe vers l’adresse canonique ═══');
  await p.goto('file://' + D + '/index.html'); await p.waitForTimeout(300);
  const canon = await p.evaluate(() => {
    const btn = document.querySelector('#btn-share');
    let url = null;
    return new Promise(r => { navigator.clipboard.writeText = t => { url = t; r(t); return Promise.resolve(); };
      btn.click(); setTimeout(()=>r(url), 300); });
  });
  check('base = canonique du site', canon.startsWith('https://calculatrice-duree.fr/?'), true);
  check('aucun /index.html dans le lien', canon.includes('index.html'), false);

  check('aucune erreur JS', errs.length ? errs.join(' | ') : 0, 0);
  console.log(`\n${'═'.repeat(52)}\nRÉSULTAT : ${pass} réussis, ${fail} échoués`);
  if (bad.length) console.log('\nÉCHECS :\n  ' + bad.join('\n  '));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
