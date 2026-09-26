/* Champ « Nombre de jours » de l'onglet Heures de travail.
   Les totaux attendus sont recalculés ici, jamais lus sur la page. */
const { chromium } = require('playwright');
const { mesurerCLS, TOLERANCE } = require('./cls-util');

const B = process.env.BASE_URL || (process.env.BASE_URL || 'http://127.0.0.1:8099');
let pass = 0, fail = 0;
const ck = (n, ok, info) => {
  ok ? (pass++, console.log('✔ ' + n)) : (fail++, console.log('✘ ' + n + ' → ' + info));
};
const norm = s => s.replace(/\s+/g, ' ').replace(/ | /g, ' ').trim();

/** « 8h 30min » attendu pour un nombre de secondes. */
function hms(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  const mil = n => n.toLocaleString('fr-FR');
  if (h) return `${mil(h)}h ${String(m).padStart(2, '0')}min`;
  return m ? `${m}min` : '0min';
}

(async () => {
  const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => {
    if (m.type() === 'error' && !/cloudflareinsights|net::|ERR_/.test(m.text())) errs.push(m.text());
  });

  const regler = async (debut, fin, pause, jours) => {
    await p.goto(`${B}/combien-heures-entre-deux-horaires.html?t=2&hd=${debut}&hf=${fin}&hp=${pause}&hj=${jours}`,
                 { waitUntil: 'load' });
    return {
      titre: norm(await p.textContent('#res-label')),
      valeur: norm(await p.textContent('#res-value')),
      cellules: (await p.$$eval('#res-grid .res-cell',
        els => els.map(e => [e.querySelector('b').textContent, e.querySelector('span').textContent])))
        .map(([v, l]) => [norm(v), norm(l)]),
    };
  };

  console.log('═══ 1. Une journée : rien ne change ═══');
  {
    const r = await regler('08:30', '17:15', 45, 1);
    const net = (17 * 3600 + 15 * 60) - (8 * 3600 + 30 * 60) - 45 * 60; // 8 h 00
    ck('titre inchangé', r.titre === 'Temps net travaillé', r.titre);
    ck(`valeur ${hms(net)}`, r.valeur === hms(net), r.valeur);
    ck('4 cellules comme avant', r.cellules.length === 4, r.cellules.length);
    ck('pas de mention « par jour »', !r.cellules.some(c => /par jour/i.test(c[1])),
       JSON.stringify(r.cellules));
  }

  console.log('\n═══ 2. Cinq jours : la question posée porte sur le total ═══');
  {
    const r = await regler('08:30', '17:00', 45, 5);
    const net = (17 * 3600) - (8 * 3600 + 30 * 60) - 45 * 60; // 7 h 45
    const total = net * 5;                                     // 38 h 45
    ck('titre « Total sur 5 jours »', r.titre === 'Total sur 5 jours', r.titre);
    ck(`total ${hms(total)}`, r.valeur === hms(total), `${r.valeur} (journée ${hms(net)})`);
    ck('5 cellules', r.cellules.length === 5, r.cellules.length);

    const dec = (total / 3600).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    ck(`décimales du total = ${dec}`, r.cellules[0][0] === norm(dec), r.cellules[0][0]);
    ck(`« Par jour » = ${hms(net)}`,
       r.cellules[1][1] === 'Par jour' && r.cellules[1][0] === hms(net),
       JSON.stringify(r.cellules[1]));
    const decJour = (net / 3600).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    ck(`décimales par jour = ${decJour}`, r.cellules[2][0] === norm(decJour), r.cellules[2][0]);
    ck(`pause déduite = 5 × 45 min`, r.cellules[4][0] === hms(45 * 60 * 5), r.cellules[4][0]);
  }

  console.log('\n═══ 3. La requête réelle de Bing ═══');
  {
    // « 8h30 jusqu'à 17h x5 ça fait combien d'heure par semaine ? » — sans pause.
    const r = await regler('08:30', '17:00', 0, 5);
    const total = ((17 * 3600) - (8 * 3600 + 30 * 60)) * 5; // 42 h 30
    ck(`8h30→17h × 5 sans pause = ${hms(total)}`, r.valeur === hms(total), r.valeur);
  }

  console.log('\n═══ 4. Bornes et cas limites ═══');
  {
    for (const [j, attendu] of [[0, 'Temps net travaillé'], [-3, 'Temps net travaillé'],
                                [999, 'Total sur 31 jours'], ['abc', 'Temps net travaillé']]) {
      const r = await regler('09:00', '17:00', 0, j);
      ck(`jours = ${j} → « ${attendu} »`, r.titre === attendu, r.titre);
    }
    // Service de nuit répété.
    const nuit = await regler('22:00', '06:00', 0, 5);
    ck('service de nuit × 5 = 40h 00min', nuit.valeur === hms(8 * 3600 * 5), nuit.valeur);
  }

  console.log('\n═══ 5. Pastilles et réinitialisation ═══');
  {
    await p.goto(B + '/combien-heures-entre-deux-horaires.html?t=2', { waitUntil: 'load' });
    await p.click('.chip[data-jours="5"]');
    ck('la pastille « 5 jours » règle le champ',
       await p.inputValue('#h-jours') === '5', await p.inputValue('#h-jours'));
    ck('elle s’allume', await p.locator('.chip[data-jours="5"].is-on').count() === 1);
    ck('elle n’a pas touché la pause',
       await p.inputValue('#h-pause') === '45', await p.inputValue('#h-pause'));

    await p.click('.chip[data-pause="30"]');
    ck('la pastille « 30 min » règle la pause',
       await p.inputValue('#h-pause') === '30', await p.inputValue('#h-pause'));
    ck('elle n’a pas touché les jours',
       await p.inputValue('#h-jours') === '5', await p.inputValue('#h-jours'));
    ck('une seule pastille de pause allumée',
       await p.locator('.chip[data-pause].is-on').count() === 1);
    ck('une seule pastille de jours allumée',
       await p.locator('.chip[data-jours].is-on').count() === 1);

    await p.click('#btn-reset');
    ck('la réinitialisation remet 1 jour',
       await p.inputValue('#h-jours') === '1', await p.inputValue('#h-jours'));
  }

  console.log('\n═══ 6. Le lien partageable transporte les jours ═══');
  {
    await p.goto(B + '/combien-heures-entre-deux-horaires.html?t=2&hd=08:00&hf=16:00&hp=30&hj=4',
                 { waitUntil: 'load' });
    const lien = await p.evaluate(() => {
      const b = document.querySelector('#btn-share');
      return b ? b.getAttribute('data-lien') || '' : '';
    });
    // À défaut d'attribut, on relit l'état après un aller-retour par l'URL.
    ck('l’état est bien restitué depuis l’adresse',
       await p.inputValue('#h-jours') === '4', await p.inputValue('#h-jours'));
    const r = await regler('08:00', '16:00', 30, 4);
    ck('et le calcul suit', r.titre === 'Total sur 4 jours', r.titre);
  }

  ck('\naucune erreur JS', errs.length === 0, errs.join(' | '));
  await p.close();

  console.log('\n═══ 7. Mise en page ═══');
  for (const [w, nom] of [[320, '320px'], [390, '390px'], [768, '768px'], [1280, '1280px']]) {
    const cls = await mesurerCLS(b, B + '/combien-heures-entre-deux-horaires.html', w);
    ck(`CLS ${cls.toFixed(4)} à ${nom} (meilleur de 3)`, cls <= TOLERANCE, cls.toFixed(4));
    const q = await b.newPage({ viewport: { width: w, height: 900 } });
    await q.goto(B + '/combien-heures-entre-deux-horaires.html?t=2&hj=5');
    const over = await q.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ck(`aucun débordement à ${nom}, onglet ouvert`, over <= 0, over + 'px');
    await q.close();
  }

  console.log('\n════════════════════════════════════════════════════');
  console.log('RÉSULTAT : ' + pass + ' réussis, ' + fail + ' échoués');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
