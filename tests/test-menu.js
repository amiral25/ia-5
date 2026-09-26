/* Menu d'en-tête : couverture des pages, justesse des liens, page courante,
   comportement clavier et souris, et absence de décalage. */
const { chromium } = require('playwright');
const { mesurerCLS, TOLERANCE } = require('./cls-util');
const fs = require('fs');

const B = process.env.BASE_URL || (process.env.BASE_URL || 'http://127.0.0.1:8099');
const DOCS = process.env.DOCS || require('path').join(__dirname, '..', 'docs');
// Les dix-huit pages de contenu qui DOIVENT être atteignables depuis l'en-tête.
const ATTENDUES = [
  '/', 'additionner-des-heures.html', 'convertir-minutes-en-heures.html',
  'multiplier-diviser-une-duree.html', 'calcul-heures-de-travail.html',
  'combien-heures-entre-deux-horaires.html', 'calcul-heures-journee-coupee.html',
  'journee-coupee-belgique.html', 'journee-coupee-suisse.html',
  'journee-coupee-luxembourg.html', 'journee-coupee-quebec.html',
  'duree-entre-deux-dates.html',
  'calcul-jours-ouvres.html', 'jours-feries-france.html', 'jours-feries-belgique.html',
  'jours-feries-suisse.html',
  'jours-feries-luxembourg.html', 'jours-feries-quebec.html',
];
// Page → (groupe attendu actif, lien attendu marqué page courante)
const COURANTE = {
  'index.html': ['Calculs de durée', '/'],
  'additionner-des-heures.html': ['Calculs de durée', 'additionner-des-heures.html'],
  'convertir-minutes-en-heures.html': ['Calculs de durée', 'convertir-minutes-en-heures.html'],
  'multiplier-diviser-une-duree.html': ['Calculs de durée', 'multiplier-diviser-une-duree.html'],
  'calcul-heures-de-travail.html': ['Heures de travail', 'calcul-heures-de-travail.html'],
  'combien-heures-entre-deux-horaires.html': ['Heures de travail', 'combien-heures-entre-deux-horaires.html'],
  'calcul-heures-journee-coupee.html': ['Heures de travail', 'calcul-heures-journee-coupee.html'],
  'journee-coupee-belgique.html': ['Heures de travail', 'journee-coupee-belgique.html'],
  'journee-coupee-suisse.html': ['Heures de travail', 'journee-coupee-suisse.html'],
  'journee-coupee-luxembourg.html': ['Heures de travail', 'journee-coupee-luxembourg.html'],
  'journee-coupee-quebec.html': ['Heures de travail', 'journee-coupee-quebec.html'],
  'duree-entre-deux-dates.html': ['Dates et jours ouvrés', 'duree-entre-deux-dates.html'],
  'calcul-jours-ouvres.html': ['Dates et jours ouvrés', 'calcul-jours-ouvres.html'],
  'jours-feries-france.html': ['Jours fériés', 'jours-feries-france.html'],
  'jours-feries-belgique.html': ['Jours fériés', 'jours-feries-belgique.html'],
  'jours-feries-suisse.html': ['Jours fériés', 'jours-feries-suisse.html'],
  'jours-feries-luxembourg.html': ['Jours fériés', 'jours-feries-luxembourg.html'],
  'jours-feries-quebec.html': ['Jours fériés', 'jours-feries-quebec.html'],
  'mentions-legales.html': [null, null],
  'nouveautes.html': [null, null],
  'a-propos.html': [null, null],
  '404.html': [null, null],
};

let pass = 0, fail = 0;
const ck = (n, ok, info) => {
  ok ? (pass++, console.log('✔ ' + n)) : (fail++, console.log('✘ ' + n + ' → ' + info));
};

(async () => {
  const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const pages = fs.readdirSync(DOCS).filter(f => f.endsWith('.html')).sort();
  ck(`les ${pages.length} pages du site sont examinées`, pages.length === 22, pages.length);

  console.log('\n═══ 1. Chaque page porte le même menu complet ═══');
  for (const f of pages) {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(B + '/' + f);

    const menu = await p.evaluate(() => {
      const g = [...document.querySelectorAll('.nav-groupe')];
      return {
        groupes: g.map(x => (x.querySelector('summary .nav-long') || x.querySelector('summary')).textContent.trim()),
        liens: g.flatMap(x => [...x.querySelectorAll('.nav-pop a')].map(a => a.getAttribute('href'))),
        actif: (document.querySelector('.nav-groupe.est-actif summary .nav-long') || {}).textContent,
        courante: (document.querySelector('.site-nav a[aria-current="page"]') || {}).href,
        nbCourante: document.querySelectorAll('.site-nav [aria-current]').length,
      };
    });

    const manquantes = ATTENDUES.filter(a => !menu.liens.includes(a));
    ck(`${f} : les 18 destinations sont dans l'en-tête`, manquantes.length === 0, manquantes.join(', '));

    const [grpAttendu, lienAttendu] = COURANTE[f];
    ck(`${f} : groupe actif « ${grpAttendu || 'aucun'} »`,
       (menu.actif || '').trim() === (grpAttendu || ''), `« ${(menu.actif || '').trim()} »`);
    ck(`${f} : un seul lien marqué page courante`,
       menu.nbCourante === (lienAttendu ? 1 : 0), menu.nbCourante);
    if (lienAttendu) {
      const attendu = lienAttendu === '/' ? B + '/' : B + '/' + lienAttendu;
      ck(`${f} : c'est le bon lien`, menu.courante === attendu, menu.courante);
    }
    ck(`${f} : aucune erreur JS`, errs.length === 0, errs.join(' | '));
    await p.close();
  }

  console.log("\n═══ 2. Aucun lien de l'en-tête ne mène nulle part ═══");
  {
    const p = await b.newPage();
    await p.goto(B + '/index.html');
    const hrefs = await p.$$eval('.site-nav a', as => as.map(a => a.href));
    let casses = [];
    for (const u of hrefs) {
      const r = await p.request.get(u);
      if (!r.ok()) casses.push(u + ' (' + r.status() + ')');
    }
    ck(`les ${hrefs.length} liens du menu répondent`, casses.length === 0, casses.join(' | '));

    // Le défaut historique : un libellé « Jours fériés » qui menait aux jours ouvrés.
    const faux = await p.$$eval('.site-nav a, .site-nav summary', els =>
      els.filter(e => /jours fériés/i.test(e.textContent) &&
                      /jours-ouvres/.test(e.getAttribute('href') || '')).length);
    ck('aucun libellé « Jours fériés » ne pointe vers les jours ouvrés', faux === 0, faux);
    await p.close();
  }

  console.log('\n═══ 3. Comportement du menu ═══');
  {
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
    await p.goto(B + '/index.html');
    const sommaires = await p.$$('.nav-groupe > summary');

    await sommaires[0].click();
    ck('un clic ouvre le groupe', await p.$eval('.nav-groupe', g => g.open));

    await sommaires[3].click();
    const ouverts = await p.$$eval('.nav-groupe', gs => gs.filter(g => g.open).length);
    ck('un seul groupe ouvert à la fois', ouverts === 1, ouverts + ' ouverts');

    await p.keyboard.press('Escape');
    ck('Échap referme', (await p.$$eval('.nav-groupe', gs => gs.filter(g => g.open).length)) === 0);
    ck('le focus revient sur l’intitulé',
       await p.evaluate(() => document.activeElement.tagName === 'SUMMARY'),
       await p.evaluate(() => document.activeElement.tagName));

    await sommaires[2].click();
    await p.click('h1');
    ck('un clic à l’extérieur referme',
       (await p.$$eval('.nav-groupe', gs => gs.filter(g => g.open).length)) === 0);

    // Ouverture au clavier seul, sans souris.
    await p.evaluate(() => document.querySelector('.nav-groupe > summary').focus());
    await p.keyboard.press('Enter');
    ck('Entrée ouvre au clavier', await p.$eval('.nav-groupe', g => g.open));

    // Suivre un lien referme le volet.
    await p.click('.nav-groupe .nav-pop a[href="additionner-des-heures.html"]');
    await p.waitForLoadState('load');
    ck('le lien du menu navigue bien', p.url().endsWith('additionner-des-heures.html'), p.url());
    ck('le volet est refermé sur la page d’arrivée',
       (await p.$$eval('.nav-groupe', gs => gs.filter(g => g.open).length)) === 0);
    await p.close();
  }

  console.log('\n═══ 4. Mise en page ═══');
  for (const [w, nom] of [[320, '320px'], [390, '390px'], [768, '768px'], [1280, '1280px']]) {
    const cls = await mesurerCLS(b, B + '/jours-feries-quebec.html', w);
    ck(`CLS ${cls.toFixed(4)} à ${nom} (meilleur de 3)`, cls <= TOLERANCE, cls.toFixed(4));
    ck(`aucun débordement à ${nom}`,
       mesurerCLS.dernierDebordement <= 0, mesurerCLS.dernierDebordement + 'px');

    // Menu ouvert : le volet ne doit pas élargir la page non plus.
    const q = await b.newPage({ viewport: { width: w, height: 900 } });
    await q.goto(B + '/jours-feries-quebec.html');
    await q.click('.nav-groupe:nth-of-type(4) > summary');
    const over = await q.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ck(`aucun débordement à ${nom}, menu ouvert`, over <= 0, over + 'px');
    await q.close();
  }

  console.log('\n════════════════════════════════════════════════════');
  console.log('RÉSULTAT : ' + pass + ' réussis, ' + fail + ' échoués');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
