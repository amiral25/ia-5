const { chromium } = require('playwright');
const fs = require('fs');
const U = (process.env.BASE_URL || (process.env.BASE_URL || 'http://127.0.0.1:8099')) + '/index.html';
let pass = 0, fail = 0; const bad = [];
const check = (n, got, want) => {
  const ok = String(got) === String(want);
  ok ? pass++ : (fail++, bad.push(`${n}\n     attendu: ${want}\n     obtenu : ${got}`));
  console.log(`${ok ? '✔' : '✘'} ${n}${ok ? '' : `  → ${got}`}`);
};

(async () => {
  const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/cloudflareinsights|net::|ERR_/.test(m.text())) errs.push(m.text()); });
  await p.goto(U);
  await p.waitForTimeout(300);

  console.log('\n═══ 1. L\'historique se remplit ═══');
  check('bloc masqué tant qu\'on n\'a rien fait', await p.locator('#history-box').isHidden(), true);

  // trois calculs sur trois onglets différents
  await p.fill('#quick', '2h30 + 1h45'); await p.waitForTimeout(1900);
  await p.click('#tab-2');
  await p.fill('#h-start', '08:30'); await p.fill('#h-end', '17:15'); await p.fill('#h-pause', '45');
  await p.waitForTimeout(1900);
  await p.click('#tab-4');
  await p.fill('#m-n', '3'); await p.waitForTimeout(1900);

  const n = await p.locator('#history-list li').count();
  check('3 calculs enregistrés', n, 3);
  check('bloc visible', await p.locator('#history-box').isVisible(), true);
  check('la date est affichée', /\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/.test(
    await p.locator('#history-list li .h-date').first().textContent()), true);

  console.log('\n═══ 2. Export CSV ═══');
  const dl = await Promise.all([p.waitForEvent('download'), p.click('#btn-csv')]);
  const file = await dl[0].path();
  const brut = fs.readFileSync(file);
  const txt = brut.toString('utf8');
  check('nom de fichier daté', /^releve-durees-\d{4}-\d{2}-\d{2}\.csv$/.test(dl[0].suggestedFilename()), true);
  check('BOM UTF-8 présent (accents lisibles dans Excel)', brut[0] === 0xEF && brut[1] === 0xBB && brut[2] === 0xBF, true);
  const lignes = txt.replace(/^﻿/, '').split('\r\n');
  check('séparateur point-virgule', lignes[0], 'Date;Type de calcul;Opération;Résultat');
  check('1 en-tête + 3 lignes', lignes.length, 4);
  check('fin de ligne CRLF', txt.includes('\r\n'), true);
  check('ordre chronologique (addition en premier)', lignes[1].includes('Addition / Soustraction'), true);
  check('dernier calcul en fin de fichier', lignes[3].includes('Multiplier / Diviser'), true);
  check('accents corrects', txt.includes('Opération') && txt.includes('Résultat'), true);
  console.log('\n--- contenu réel du CSV ---');
  lignes.forEach(l => console.log('   ' + l));

  console.log('\n═══ 3. Échappement CSV ═══');
  const ech = await p.evaluate(() => {
    // on injecte une valeur piégée dans l'historique puis on relit
    const h = JSON.parse(localStorage.getItem('cd-hist'));
    h.unshift({ d: Date.now(), t: 'Test', i: 'a;b "c" d', o: 'ligne1\nligne2' });
    localStorage.setItem('cd-hist', JSON.stringify(h));
    return true;
  });
  await p.reload(); await p.waitForTimeout(300);
  const dl2 = await Promise.all([p.waitForEvent('download'), p.click('#btn-csv')]);
  const t2 = fs.readFileSync(await dl2[0].path(), 'utf8');
  check('point-virgule et guillemets échappés', t2.includes('"a;b ""c"" d"'), true);
  check('saut de ligne encapsulé', t2.includes('"ligne1\nligne2"'), true);

  console.log('\n═══ 4. Impression ═══');
  /* Deux impressions différentes désormais : le relevé, déclenché par le
     bouton, qui masque la page pour ne garder que le tableau des calculs ;
     et le Ctrl+P ordinaire, qui doit imprimer la page telle quelle. */
  await p.emulateMedia({ media: 'print' });
  await p.waitForTimeout(200);
  const ordinaire = await p.evaluate(() => {
    const vis = s => { const e = document.querySelector(s); return e && getComputedStyle(e).display !== 'none'; };
    return { contenu: vis('.content'), onglets: vis('.tabs'), listes: vis('.content .uses'),
             releve: vis('.history'), entetePage: vis('.site-header') };
  });
  check('Ctrl+P : le contenu de la page est imprimé', ordinaire.contenu, true);
  check('Ctrl+P : les listes du contenu aussi', ordinaire.listes, true);
  check('Ctrl+P : le relevé de calculs ne s\'invite pas', ordinaire.releve, false);
  check('Ctrl+P : l\'en-tête du site est retiré', ordinaire.entetePage, false);

  // À partir d'ici, on imprime le relevé : c'est le bouton qui pose la classe.
  await p.evaluate(() => document.documentElement.classList.add('imprime-releve'));
  await p.waitForTimeout(100);
  const imp = await p.evaluate(() => {
    const vis = s => { const e = document.querySelector(s); return e && getComputedStyle(e).display !== 'none'; };
    return {
      entete: vis('.print-seul'),
      releve: vis('#history-list'),
      boutons: vis('.history-actions'),
      pub: vis('.ad'),
      onglets: vis('.tabs'),
      contenu: vis('.content'),
      entetePage: vis('.site-header'),
      dateVisible: vis('.history-list .h-date'),
      fond: getComputedStyle(document.body).backgroundColor,
      texte: getComputedStyle(document.body).color,
    };
  });
  check('en-tête du relevé visible', imp.entete, true);
  check('lignes du relevé visibles', imp.releve, true);
  check('date visible à l\'impression', imp.dateVisible, true);
  check('boutons masqués', imp.boutons, false);
  check('publicité masquée', imp.pub, false);
  check('onglets masqués', imp.onglets, false);
  check('contenu éditorial masqué', imp.contenu, false);
  check('en-tête du site masqué', imp.entetePage, false);
  check('fond blanc forcé', imp.fond, 'rgb(255, 255, 255)');
  check('texte noir forcé', imp.texte, 'rgb(0, 0, 0)');

  console.log('\n═══ 5. Impression en thème sombre ═══');
  await p.evaluate(() => document.documentElement.classList.remove('imprime-releve'));
  await p.emulateMedia({ media: 'screen' });
  await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await p.emulateMedia({ media: 'print' });
  await p.waitForTimeout(200);
  const sombre = await p.evaluate(() => ({
    fond: getComputedStyle(document.body).backgroundColor,
    texte: getComputedStyle(document.body).color,
  }));
  check('fond blanc même en thème sombre', sombre.fond, 'rgb(255, 255, 255)');
  check('texte noir même en thème sombre', sombre.texte, 'rgb(0, 0, 0)');
  await p.emulateMedia({ media: 'screen' });

  console.log('\n═══ 6. Cas vides et plafond ═══');
  await p.evaluate(() => localStorage.removeItem('cd-hist'));
  await p.reload(); await p.waitForTimeout(300);
  check('bloc masqué quand l\'historique est vide', await p.locator('#history-box').isHidden(), true);
  const plafond = await p.evaluate(() => {
    const h = []; for (let i = 0; i < 80; i++) h.push({ d: Date.now() - i * 6e4, t: 'X', i: 'i' + i, o: 'o' + i });
    localStorage.setItem('cd-hist', JSON.stringify(h)); return true;
  });
  await p.reload(); await p.waitForTimeout(300);
  await p.fill('#quick', '1h + 1h'); await p.waitForTimeout(1900);
  check('plafonné à 50 lignes', await p.evaluate(() => JSON.parse(localStorage.getItem('cd-hist')).length), 50);

  console.log('\n═══ 7. Pas de régression ═══');
  await p.evaluate(() => localStorage.removeItem('cd-hist'));
  await p.reload(); await p.waitForTimeout(400);
  for (const w of [320, 390, 768, 1280]) {
    await p.setViewportSize({ width: w, height: 800 });
    await p.waitForTimeout(120);
    check(`aucun débordement à ${w}px`, await p.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth), 0);
  }
  // débordement avec l'historique affiché, sur petit écran
  await p.setViewportSize({ width: 320, height: 800 });
  await p.fill('#quick', '2h30 + 1h45'); await p.waitForTimeout(1900);
  check('aucun débordement à 320px avec le relevé affiché', await p.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth), 0);
  check('aucune erreur JS', errs.length ? errs.join(' | ') : 0, 0);

  console.log(`\n${'═'.repeat(52)}\nRÉSULTAT : ${pass} réussis, ${fail} échoués`);
  if (bad.length) console.log('\nÉCHECS :\n  ' + bad.join('\n  '));
  await b.close();
  process.exit(fail ? 1 : 0);
})();
