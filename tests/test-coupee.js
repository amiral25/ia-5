/* Calculateur de journée coupée (page restauration).
   Les trois chiffres attendus sont recalculés ici, jamais lus sur la page. */
const { chromium } = require('playwright');
const { mesurerCLS, TOLERANCE } = require('./cls-util');

const B = process.env.BASE_URL || (process.env.BASE_URL || 'http://127.0.0.1:8099');
const PAGE = '/calcul-heures-journee-coupee.html';
let pass = 0, fail = 0;
const ck = (n, ok, info) => {
  ok ? (pass++, console.log('✔ ' + n)) : (fail++, console.log('✘ ' + n + ' → ' + info));
};
const norm = s => s.replace(/\s+/g, ' ').replace(/ | /g, ' ').trim();
const hms = sec => {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return h ? `${h.toLocaleString('fr-FR')}h ${String(m).padStart(2, '0')}min` : (m ? `${m}min` : '0min');
};

/** Référence : chronologie absolue, toute heure inférieure à la précédente
    passe au lendemain — même règle que le moteur, réécrite ici. */
function attendu(services) {
  let base = 0, prec = -1, plages = [];
  for (const [d0, f0] of services) {
    if (d0 === null || f0 === null) continue;
    if (prec >= 0 && d0 + base < prec) base += 86400;
    const d = d0 + base;
    let b2 = base;
    if (f0 + b2 < d) { b2 += 86400; base = b2; }
    const f = f0 + b2;
    prec = f;
    plages.push([d, f]);
  }
  const travail = plages.reduce((s, [d, f]) => s + (f - d), 0);
  const amplitude = plages.length ? plages[plages.length - 1][1] - plages[0][0] : 0;
  return { travail, amplitude, coupure: amplitude - travail, n: plages.length };
}
const t = (h, m = 0) => h * 3600 + m * 60;

(async () => {
  const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => {
    if (m.type() === 'error' && !/cloudflareinsights|net::|ERR_/.test(m.text())) errs.push(m.text());
  });
  await p.goto(B + PAGE, { waitUntil: 'load' });

  const hhmm = s => s === null ? '' :
    `${String(Math.floor(s / 3600) % 24).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}`;

  async function saisir(services, jours = 1) {
    for (let i = 0; i < 3; i++) {
      const s = services[i] || [null, null];
      await p.fill(`#jc${i + 1}d`, hhmm(s[0]));
      await p.fill(`#jc${i + 1}f`, hhmm(s[1]));
    }
    await p.fill('#jc-jours', String(jours));
    await p.dispatchEvent('#jc-jours', 'input');
    return {
      travail: norm(await p.textContent('#jc-travail')),
      dec: norm(await p.textContent('#jc-dec')),
      ampl: norm(await p.textContent('#jc-ampl')),
      coup: norm(await p.textContent('#jc-coup')),
      sem: norm(await p.textContent('#jc-sem')),
      note: norm(await p.textContent('#jc-note')),
      alerte: await p.locator('#services.jc-alerte').count() === 1,
    };
  }

  console.log("═══ 1. L'état affiché au chargement est déjà juste ═══");
  {
    const r = {
      travail: norm(await p.textContent('#jc-travail')),
      ampl: norm(await p.textContent('#jc-ampl')),
      coup: norm(await p.textContent('#jc-coup')),
    };
    const a = attendu([[t(10), t(15)], [t(18), t(23)]]);
    ck(`travail ${hms(a.travail)}`, r.travail === hms(a.travail), r.travail);
    ck(`amplitude ${hms(a.amplitude)}`, r.ampl === hms(a.amplitude), r.ampl);
    ck(`coupure ${hms(a.coupure)}`, r.coup === hms(a.coupure), r.coup);
  }

  console.log('\n═══ 2. Les journées types de la page ═══');
  {
    const CAS = [
      ['midi seul', [[t(10), t(15)]]],
      ['soir seul', [[t(18), t(23, 30)]]],
      ['coupée classique', [[t(10), t(15)], [t(18), t(23)]]],
      ['coupure courte', [[t(11, 30), t(15)], [t(18), t(22, 30)]]],
      ['cuisine + mise en place', [[t(9), t(15)], [t(19), t(23)]]],
      ['trois services', [[t(8), t(11)], [t(12), t(15)], [t(19), t(23)]]],
    ];
    for (const [nom, sv] of CAS) {
      const r = await saisir(sv);
      const a = attendu(sv);
      ck(`${nom} : ${hms(a.travail)} de travail`, r.travail === hms(a.travail), r.travail);
      ck(`${nom} : ${hms(a.amplitude)} d'amplitude`, r.ampl === hms(a.amplitude), r.ampl);
      ck(`${nom} : coupure ${a.coupure ? hms(a.coupure) : '—'}`,
         r.coup === (a.coupure > 0 ? hms(a.coupure) : '—'), r.coup);
    }
  }

  console.log('\n═══ 3. Les services qui traversent minuit ═══');
  {
    const r = await saisir([[t(19), t(1)]]);
    ck('19h → 01h = 6h 00min', r.travail === hms(6 * 3600), r.travail);
    ck('pas de durée négative', !r.travail.startsWith('−'), r.travail);

    const r2 = await saisir([[t(11), t(15)], [t(19), t(1)]]);
    const a2 = attendu([[t(11), t(15)], [t(19), t(1)]]);
    ck(`11h-15h puis 19h-01h : travail ${hms(a2.travail)}`, r2.travail === hms(a2.travail), r2.travail);
    ck(`amplitude ${hms(a2.amplitude)} (14 h)`, r2.ampl === hms(a2.amplitude) && a2.amplitude === 14 * 3600,
       `${r2.ampl} / attendu ${hms(a2.amplitude)}`);
  }

  console.log("\n═══ 4. L'alerte des 13 heures ═══");
  {
    const sous = await saisir([[t(11, 30), t(15)], [t(18), t(22, 30)]]);   // 11 h
    ck('sous 13 h : pas d’alerte', !sous.alerte, sous.note);
    ck('la note dit « sous la limite »', /sous la limite/.test(sous.note), sous.note);

    const pile = await saisir([[t(10), t(15)], [t(18), t(23)]]);           // 13 h
    ck('exactement 13 h : pas d’alerte', !pile.alerte, pile.note);
    ck('la note dit « exactement la limite »', /exactement la limite/.test(pile.note), pile.note);

    const au = await saisir([[t(9), t(15)], [t(19), t(23)]]);              // 14 h
    ck('au-delà de 13 h : alerte activée', au.alerte, au.note);
    ck('la note dit « au-delà »', /au-delà de la limite/.test(au.note), au.note);
  }

  console.log('\n═══ 5. Le nombre de jours ═══');
  {
    const sv = [[t(10), t(15)], [t(18), t(23)]];
    const a = attendu(sv);
    const r = await saisir(sv, 5);
    ck(`× 5 jours = ${hms(a.travail * 5)}`, r.travail === hms(a.travail * 5), r.travail);
    ck('le détail par jour apparaît', r.sem === hms(a.travail) + ' / jour', r.sem);
    ck("l'intitulé annonce la période",
       norm(await p.textContent('.jc-label')) === 'Temps de travail effectif sur 5 jours',
       await p.textContent('.jc-label'));
    ck("l'amplitude reste journalière", r.ampl === hms(a.amplitude), r.ampl);

    const un = await saisir(sv, 1);
    ck('retour à 1 jour : plus de détail', un.sem === '—', un.sem);
  }

  console.log('\n═══ 6. Cas limites ═══');
  {
    const vide = await saisir([]);
    ck('aucun service : message explicite', /Renseignez au moins un service/.test(vide.note), vide.note);
    ck('aucun service : 0min', vide.travail === '0min', vide.travail);

    const nul = await saisir([[t(14), t(14)]]);
    ck('heures identiques = durée nulle, pas 24 h', nul.travail === '0min', nul.travail);

    const seul = await saisir([[t(10), t(15)]]);
    ck('un seul service : coupure « — »', seul.coup === '—', seul.coup);

    await p.click('.chip[data-jc="6"]');
    ck('pastille 6 jours', await p.inputValue('#jc-jours') === '6', await p.inputValue('#jc-jours'));
  }

  console.log('\n═══ 7. Page et intégration ═══');
  {
    await p.goto(B + PAGE, { waitUntil: 'load' });
    ck('un seul <h1>', await p.locator('h1').count() === 1, await p.locator('h1').count());
    ck('6 questions fréquentes', await p.locator('.faq details').count() === 6,
       await p.locator('.faq details').count());
    const ld = await p.evaluate(() => {
      const d = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent);
      return d['@graph'].find(g => g['@type'] === 'FAQPage').mainEntity.map(q => q.name);
    });
    const vis = await p.$$eval('.faq summary', e => e.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
    ck('balisage FAQ = questions visibles',
       JSON.stringify(ld.map(x => norm(x))) === JSON.stringify(vis.map(x => norm(x))),
       JSON.stringify(ld) + ' ≠ ' + JSON.stringify(vis));
    ck('la restauration est dans le titre', /restauration/i.test(await p.title()), await p.title());

    // Un seul calculateur sur la page : celui de la journée coupée.
    ck('pas de calculateur principal', await p.locator('#calculatrice').count() === 0);
    ck('pas de second jeu d’onglets', await p.locator('.tabs').count() === 0);
    ck('un seul bloc calculateur', await p.locator('.card.calc').count() === 1,
       await p.locator('.card.calc').count());
    ck('pas d’historique orphelin', await p.locator('#history-box').count() === 0);
    ck('le lien d’évitement mène au bon calculateur',
       await p.getAttribute('.skip-link', 'href') === '#services',
       await p.getAttribute('.skip-link', 'href'));
    ck('le bouton de retour mène au bon calculateur',
       await p.getAttribute('#retour-calc', 'href') === '#services',
       await p.getAttribute('#retour-calc', 'href'));
    ck('la barre latérale publicitaire est conservée',
       await p.locator('.col-side .ad-rect').count() === 1);

    // Le script est partagé : sans calculateur principal, le reste doit vivre.
    const avant = await p.getAttribute('html', 'data-theme');
    await p.click('#theme-toggle');
    ck('le thème bascule quand même',
       await p.getAttribute('html', 'data-theme') !== avant,
       await p.getAttribute('html', 'data-theme'));
    await p.click('#theme-toggle');
    await p.click('.nav-groupe > summary');
    ck('le menu s’ouvre quand même',
       await p.locator('.nav-groupe[open]').count() === 1,
       await p.locator('.nav-groupe[open]').count());
    await p.keyboard.press('Escape');
    ck('Échap referme le menu', await p.locator('.nav-groupe[open]').count() === 0);
    ck("l'année du pied de page est remplie",
       /^\d{4}$/.test(norm(await p.textContent('#year'))), await p.textContent('#year'));
    ck('le menu mène à cette page',
       await p.locator('.site-nav a[href="calcul-heures-journee-coupee.html"]').count() === 1);
    ck('elle est marquée page courante',
       await p.locator('.site-nav a[aria-current="page"][href="calcul-heures-journee-coupee.html"]').count() === 1);
  }

  console.log('\n═══ 8. Les règles propres à chaque pays ═══');
  {
    /* Ce qui justifie cinq pages plutôt qu'une : le calcul est le même
       partout, les seuils et les textes cités ne le sont pas. Chaque cas est
       choisi pour séparer un pays des autres — le même horaire doit passer
       ici et alerter là. */
    const CLASSIQUE = [[t(10), t(15)], [t(18), t(23)]];     // 10 h de travail, 13 h d'amplitude
    const MISE_EN_PLACE = [[t(9), t(15)], [t(19), t(23)]];  // 10 h de travail, 14 h d'amplitude
    const DEUX_COURTS = [[t(11, 30), t(13, 30)], [t(18), t(20)]];  // deux fois 2 h

    const PAYS = [
      { f: '/calcul-heures-journee-coupee.html', nom: 'France', code: 'fr', cas: [
        ['13 h d’amplitude : la limite', CLASSIQUE, false, /exactement la limite de 13 heures/],
        ['14 h d’amplitude : dépassement', MISE_EN_PLACE, true, /au-delà de la limite de 13 heures/],
      ] },
      { f: '/journee-coupee-belgique.html', nom: 'Belgique', code: 'be', cas: [
        ['13 h d’amplitude : la limite', CLASSIQUE, false, /exactement la limite de 13 heures/],
        ['14 h d’amplitude : dépassement', MISE_EN_PLACE, true, /au-delà de la limite de 13 heures/],
        ['deux prestations de 2 h', DEUX_COURTS, true, /2 services durent moins de trois heures.*article 21/],
        ['une seule prestation courte', [[t(11, 30), t(13, 30)], [t(18), t(23)]], true,
         /^1 service dure moins de trois heures/],
      ] },
      { f: '/journee-coupee-suisse.html', nom: 'Suisse', code: 'ch', cas: [
        ['14 h d’amplitude : encore dans les clous', MISE_EN_PLACE, false,
         /exactement l'espace de 14 heures.*article 10 LTr/],
        ['14 h 30 : dépassement', [[t(9), t(15)], [t(19), t(23, 30)]], true,
         /au-delà de l'espace de 14 heures/],
      ] },
      { f: '/journee-coupee-luxembourg.html', nom: 'Luxembourg', code: 'lu', cas: [
        ['10 h de travail : la limite', CLASSIQUE, false, /exactement la limite de 13 heures/],
        ['11 h de travail sous 13 h d’amplitude', [[t(8), t(14)], [t(15), t(20)]], true,
         /11h 00min de travail effectif.*L\.211-12/],
        ['trois services, donc deux coupures', [[t(8), t(10)], [t(12), t(14)], [t(18), t(20)]],
         true, /3 services, donc 2 coupures.*L\.211-16/],
      ] },
      { f: '/journee-coupee-quebec.html', nom: 'Québec', code: 'qc', cas: [
        ['deux présences de 2 h : payées 6 h', DEUX_COURTS, false,
         /4h 00min travaillées mais 6h 00min payées.*article 58/],
        ['des présences pleines : rien à ajouter', CLASSIQUE, false,
         /Chaque présence atteint trois heures/],
        ['15 h 30 d’amplitude : aucune alerte au Québec', [[t(8), t(15)], [t(19), t(23, 30)]],
         false, /Chaque présence atteint trois heures/],
      ] },
    ];

    for (const pays of PAYS) {
      await p.goto(B + pays.f, { waitUntil: 'load' });
      ck(`${pays.nom} : le calculateur est réglé sur ce pays`,
         await p.getAttribute('#services', 'data-pays') === pays.code,
         await p.getAttribute('#services', 'data-pays'));

      // Le bandeau doit mener aux quatre autres et se marquer lui-même.
      ck(`${pays.nom} : bandeau de 5 pays`,
         await p.locator('.jc-pays li').count() === 5, await p.locator('.jc-pays li').count());
      ck(`${pays.nom} : le pays courant n’est pas un lien`,
         norm(await p.textContent('.jc-pays strong[aria-current="page"]')) === pays.nom,
         await p.textContent('.jc-pays strong'));
      ck(`${pays.nom} : 4 liens vers les autres pays`,
         await p.locator('.jc-pays a').count() === 4, await p.locator('.jc-pays a').count());

      // La cellule « heures payées » n'a de sens qu'au Québec.
      ck(`${pays.nom} : cellule « heures payées » ${pays.code === 'qc' ? 'présente' : 'absente'}`,
         await p.locator('#jc-paye').count() === (pays.code === 'qc' ? 1 : 0));

      for (const [nom, sv, alerte, motif] of pays.cas) {
        const r = await saisir(sv);
        ck(`${pays.nom} · ${nom} : ${alerte ? 'alerte' : 'pas d’alerte'}`, r.alerte === alerte, r.note);
        ck(`${pays.nom} · ${nom} : le bon texte est cité`, motif.test(r.note), r.note);
        // Le travail effectif ne dépend jamais du pays.
        ck(`${pays.nom} · ${nom} : travail ${hms(attendu(sv).travail)}`,
           r.travail === hms(attendu(sv).travail), r.travail);
      }

      if (pays.code === 'qc') {
        await saisir(DEUX_COURTS);
        ck('Québec : 6h 00min affichées en heures payées',
           norm(await p.textContent('#jc-paye')) === '6h 00min',
           await p.textContent('#jc-paye'));
        await saisir(DEUX_COURTS, 5);
        ck('Québec : les heures payées suivent le nombre de jours',
           norm(await p.textContent('#jc-paye')) === hms(30 * 3600),
           await p.textContent('#jc-paye'));
      }
    }
  }

  ck('\naucune erreur JS sur les cinq pages', errs.length === 0, errs.join(' | '));
  await p.close();

  console.log('\n═══ 9. Mise en page ═══');
  {
    /* La page française aux quatre largeurs, les quatre autres aux deux
       extrêmes : elles sortent du même gabarit, seul le contenu diffère —
       et c'est le Québec, avec sa cinquième cellule, qui est le cas
       tendu à 320 px. */
    const MESURES = [
      [PAGE, 320], [PAGE, 390], [PAGE, 768], [PAGE, 1280],
      ['/journee-coupee-belgique.html', 320], ['/journee-coupee-belgique.html', 1280],
      ['/journee-coupee-suisse.html', 320], ['/journee-coupee-suisse.html', 1280],
      ['/journee-coupee-luxembourg.html', 320], ['/journee-coupee-luxembourg.html', 1280],
      ['/journee-coupee-quebec.html', 320], ['/journee-coupee-quebec.html', 390],
      ['/journee-coupee-quebec.html', 1280],
    ];
    for (const [page, w] of MESURES) {
      const court = page.replace('/journee-coupee-', '').replace('.html', '')
                        .replace('calcul-heures-journee-coupee', 'france');
      const cls = await mesurerCLS(b, B + page, w);
      ck(`${court} · CLS ${cls.toFixed(4)} à ${w}px (meilleur de 3)`, cls <= TOLERANCE, cls.toFixed(4));
      ck(`${court} · aucun débordement à ${w}px`,
         mesurerCLS.dernierDebordement <= 0, mesurerCLS.dernierDebordement + 'px');
    }
  }

  console.log('\n════════════════════════════════════════════════════');
  console.log('RÉSULTAT : ' + pass + ' réussis, ' + fail + ' échoués');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
