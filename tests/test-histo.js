/* Bloc « années précédentes » 2020-2025, bloc Pâques 2027-2028, et la règle
   d'entrée en vigueur du moteur.

   Deux vérifications indépendantes :
   1. le HTML publié est comparé à un moteur réécrit ici, ligne par ligne ;
   2. le moteur EMBARQUÉ dans la page est interrogé via le calculateur de jours
      ouvrés (paramètres d'URL), pour que les deux ne puissent pas dériver. */
const { chromium } = require('playwright');
const { mesurerCLS, TOLERANCE } = require('./cls-util');

const B = process.env.BASE_URL || (process.env.BASE_URL || 'http://127.0.0.1:8099');
const AN_MIN = 2020, AN_MAX = 2025;
const PAGES = [
  ['jours-feries-france.html', 'fr', 'France', 11],
  ['jours-feries-belgique.html', 'be', 'Belgique', 10],
  ['jours-feries-suisse.html', 'ch', 'Suisse', 7],
  ['jours-feries-luxembourg.html', 'lu', 'Luxembourg', 11],
  ['jours-feries-quebec.html', 'qc', 'Québec', 8],
];
const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
              'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

let pass = 0, fail = 0;
const ck = (n, ok, info) => {
  ok ? (pass++, console.log('✔ ' + n)) : (fail++, console.log('✘ ' + n + ' → ' + info));
};

// ---- moteur de référence, réécrit ----
const D = 86400000;
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4,
        f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
        h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
        l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  return Date.UTC(y, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
}
const nth = (y, mo, wd, n) => {
  const first = new Date(Date.UTC(y, mo, 1)).getUTCDay();
  return Date.UTC(y, mo, 1 + ((wd - first + 7) % 7) + (n - 1) * 7);
};
const avant = (y, mo, day, wd) => {
  const ts = Date.UTC(y, mo, day);
  return ts - ((new Date(ts).getUTCDay() - wd + 7) % 7 || 7) * D;
};
function feries(y, code) {
  const e = easter(y), out = [];
  const fix = (mo, d, n, depuis) => { if (!depuis || y >= depuis) out.push([Date.UTC(y, mo, d), n]); };
  const mob = (off, n) => out.push([e + off * D, n]);
  if (code === 'fr') {
    [[0,1,"Jour de l'an"],[4,1,'Fête du Travail'],[4,8,'Victoire 1945'],[6,14,'Fête nationale'],
     [7,15,'Assomption'],[10,1,'Toussaint'],[10,11,'Armistice 1918'],[11,25,'Noël']]
      .forEach(a => fix(...a));
    [[1,'Lundi de Pâques'],[39,'Ascension'],[50,'Lundi de Pentecôte']].forEach(a => mob(...a));
  } else if (code === 'be') {
    [[0,1,'Nouvel An'],[4,1,'Fête du Travail'],[6,21,'Fête nationale'],[7,15,'Assomption'],
     [10,1,'Toussaint'],[10,11,'Armistice'],[11,25,'Noël']].forEach(a => fix(...a));
    [[1,'Lundi de Pâques'],[39,'Ascension'],[50,'Lundi de Pentecôte']].forEach(a => mob(...a));
  } else if (code === 'ch') {
    [[0,1,'Nouvel An'],[7,1,'Fête nationale'],[11,25,'Noël']].forEach(a => fix(...a));
    [[-2,'Vendredi saint'],[1,'Lundi de Pâques'],[39,'Ascension'],[50,'Lundi de Pentecôte']]
      .forEach(a => mob(...a));
  } else if (code === 'lu') {
    [[0,1,'Nouvel An'],[4,1,'Fête du Travail'],[4,9,"Journée de l'Europe",2019],
     [5,23,'Fête nationale'],[7,15,'Assomption'],[10,1,'Toussaint'],
     [11,25,'Noël'],[11,26,'Saint-Étienne']].forEach(a => fix(...a));
    [[1,'Lundi de Pâques'],[39,'Ascension'],[50,'Lundi de Pentecôte']].forEach(a => mob(...a));
  } else {
    [[0,1,"Jour de l'An"],[5,24,'Fête nationale du Québec'],[6,1,'Fête du Canada'],
     [11,25,'Noël']].forEach(a => fix(...a));
    mob(-2, 'Vendredi saint');
    out.push([avant(y, 4, 25, 1), 'Journée nationale des patriotes'],
             [nth(y, 8, 1, 1), 'Fête du Travail'], [nth(y, 9, 1, 2), 'Action de grâce']);
  }
  // Même règle que le moteur : deux fêtes le même jour font une seule ligne,
  // portant les deux noms (Ascension et Journée de l'Europe, 9 mai 2024).
  const fusion = new Map();
  out.sort((a, z) => a[0] - z[0]).forEach(([ts, nom]) => {
    fusion.set(ts, fusion.has(ts) ? fusion.get(ts) + ' et ' + nom : nom);
  });
  return [...fusion.entries()];
}
/** Jours ouvrés d'une année pleine, week-ends et fériés déduits. */
function ouvres(y, code) {
  const fer = new Set(feries(y, code).map(f => f[0]));
  let n = 0;
  for (let ts = Date.UTC(y, 0, 1); ts <= Date.UTC(y, 11, 31); ts += D) {
    const wd = new Date(ts).getUTCDay();
    if (wd === 0 || wd === 6) continue;
    if (fer.has(ts)) continue;
    n++;
  }
  return n;
}
const norm = s => s.replace(/\s+/g, ' ').replace(/ | /g, ' ').trim();

(async () => {
  const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });

  for (const [f, code, pays, attenduAuj] of PAGES) {
    console.log('\n═══ ' + pays + ' ═══');
    const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => {
      if (m.type() === 'error' && !/cloudflareinsights|net::|ERR_/.test(m.text())) errs.push(m.text());
    });
    await p.goto(B + '/' + f, { waitUntil: 'load' });

    const blocs = await p.evaluate(() =>
      [...document.querySelectorAll('.histo > details')].map(d => ({
        resume: d.querySelector('summary').textContent.replace(/\s+/g, ' ').trim(),
        lignes: [...d.querySelectorAll('tbody tr')].map(tr => {
          const td = tr.querySelectorAll('td');
          return [td[0].textContent.trim(), td[1].textContent.trim(), td[2].textContent.trim()];
        }),
      })));

    ck(`6 années dépliables (2020-2025)`, blocs.length === 6, blocs.length);

    let ecarts = [];
    for (let k = 0; k < blocs.length; k++) {
      const y = AN_MAX - k;                   // ordre décroissant : 2025 → 2020
      const ref = feries(y, code);
      const bl = blocs[k];
      if (!new RegExp('\\b' + y + '\\b').test(bl.resume)) {
        ecarts.push(`bloc ${k} : « ${bl.resume} » n'annonce pas ${y}`); continue;
      }
      if (bl.lignes.length !== ref.length) {
        ecarts.push(`${y} : ${bl.lignes.length} lignes ≠ ${ref.length}`); continue;
      }
      // Le résumé annonce le bon nombre de jours et de week-ends.
      const we = ref.filter(r => [0, 6].includes(new Date(r[0]).getUTCDay())).length;
      if (!bl.resume.includes(`${ref.length} jours`)) ecarts.push(`${y} : total absent du résumé`);
      const attWe = we ? `dont ${we} un week-end` : 'aucun un week-end';
      if (!bl.resume.includes(attWe)) ecarts.push(`${y} : « ${attWe} » absent de « ${bl.resume} »`);

      bl.lignes.forEach((l, i) => {
        const d = new Date(ref[i][0]);
        const attDate = (d.getUTCDate() === 1 ? '1er' : d.getUTCDate()) + ' ' + MOIS[d.getUTCMonth()];
        const attJour = JOURS[(d.getUTCDay() + 6) % 7];
        if (l[0] !== ref[i][1]) ecarts.push(`${y} l.${i} nom « ${l[0] }» ≠ « ${ref[i][1]} »`);
        if (norm(l[1]) !== attDate) ecarts.push(`${y} l.${i} date « ${l[1]} » ≠ « ${attDate} »`);
        if (l[2] !== attJour) ecarts.push(`${y} l.${i} jour « ${l[2]} » ≠ « ${attJour} »`);
      });
    }
    ck('chaque date historique correspond au moteur de référence',
       ecarts.length === 0, ecarts.slice(0, 5).join(' | '));

    // ---- le moteur EMBARQUÉ dit-il la même chose ? ----
    // On interroge le calculateur de jours ouvrés sur chaque année pleine.
    let dérives = [];
    for (let y = AN_MIN; y <= AN_MAX; y++) {
      await p.goto(`${B}/${f}?t=3&dd=${y}-01-01&df=${y}-12-31&dw=1&dh=1&dp=${code}`,
                   { waitUntil: 'load' });
      const lu = parseInt(norm(await p.textContent('#res-grid .res-cell b')), 10);
      const att = ouvres(y, code);
      if (lu !== att) dérives.push(`${y} : le site dit ${lu} jours ouvrés, attendu ${att}`);
    }
    ck('le moteur de la page donne les mêmes années que le HTML',
       dérives.length === 0, dérives.join(' | '));

    ck(`${attenduAuj} jours fériés aujourd'hui encore`,
       feries(2025, code).length === attenduAuj, feries(2025, code).length);
    ck('aucune erreur JS', errs.length === 0, errs.join(' | '));
    await p.close();
  }

  // ---- la règle d'entrée en vigueur : le point qui aurait publié du faux ----
  console.log("\n═══ Entrée en vigueur (Journée de l'Europe) ═══");
  {
    const p = await b.newPage();
    const lire = async (y) => {
      await p.goto(`${B}/jours-feries-luxembourg.html?t=3&dd=${y}-01-01&df=${y}-12-31&dw=1&dh=1&dp=lu`,
                   { waitUntil: 'load' });
      return parseInt(norm(await p.textContent('#res-grid .res-cell b')), 10);
    };
    ck('2019 et après : la Journée de l’Europe compte (11 fériés)',
       (await lire(2020)) === ouvres(2020, 'lu'), await lire(2020));
    // En 2018 elle n'existait pas : un jour ouvré de plus que si on appliquait
    // les règles d'aujourd'hui. C'est exactement l'erreur qu'on voulait éviter.
    const lu2018 = await lire(2018);
    const att2018 = ouvres(2018, 'lu');
    ck('2018 : la Journée de l’Europe ne compte pas', lu2018 === att2018,
       `le site dit ${lu2018}, attendu ${att2018}`);
    const naif = att2018 - 1; // ce qu'on aurait eu sans la date d'entrée en vigueur
    ck('la règle change bien le résultat (sinon le test ne prouverait rien)',
       att2018 !== naif + 1 || lu2018 !== naif, `naïf ${naif}, obtenu ${lu2018}`);
    await p.close();
  }

  // ---- bloc Pâques 2027-2028 ----
  console.log('\n═══ Pâques 2027-2028 (Québec) ═══');
  {
    const p = await b.newPage();
    await p.goto(B + '/jours-feries-quebec.html');
    ck('le bloc existe', await p.locator('#paques').count() === 1);
    const lignes = await p.$$eval('#paques ~ .table-wrap tbody tr', trs =>
      trs.map(tr => [...tr.querySelectorAll('td')].map(td => td.textContent.trim())));
    let mauvais = [];
    [2027, 2028].forEach((y, i) => {
      const e = easter(y), d = new Date(e);
      const fmt = ts => {
        const x = new Date(ts);
        return (x.getUTCDate() === 1 ? '1er' : x.getUTCDate()) + ' ' + MOIS[x.getUTCMonth()];
      };
      const att = [String(y), 'vendredi ' + fmt(e - 2 * D), 'dimanche ' + fmt(e),
                   'lundi ' + fmt(e + D)];
      const got = (lignes[i] || []).map(norm);
      if (JSON.stringify(got) !== JSON.stringify(att)) mauvais.push(`${y} : ${got} ≠ ${att}`);
    });
    ck('les dates de Pâques 2027 et 2028 sont justes', mauvais.length === 0, mauvais.join(' | '));
    ck('aucune date de 2026 dans le bloc (Pâques est passée)',
       !(await p.textContent('#paques')).includes('2026') &&
       !(await p.$$eval('#paques ~ .table-wrap tbody tr', t => t.map(x => x.textContent).join())).includes('2026'));
    await p.close();
  }

  // ---- mise en page ----
  console.log('\n═══ Mise en page ═══');
  for (const [w, nom] of [[320, '320px'], [390, '390px'], [768, '768px'], [1280, '1280px']]) {
    const cls = await mesurerCLS(b, B + '/jours-feries-luxembourg.html', w);
    ck(`CLS ${cls.toFixed(4)} à ${nom} (meilleur de 3)`, cls <= TOLERANCE, cls.toFixed(4));
    ck(`aucun débordement à ${nom}`,
       mesurerCLS.dernierDebordement <= 0, mesurerCLS.dernierDebordement + 'px');

    // Année dépliée : le tableau doit défiler dans sa boîte, pas élargir la page.
    const q = await b.newPage({ viewport: { width: w, height: 900 } });
    await q.goto(B + '/jours-feries-luxembourg.html');
    await q.click('.histo > details:first-child > summary');
    const over = await q.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ck(`aucun débordement à ${nom}, année dépliée`, over <= 0, over + 'px');
    await q.close();
  }

  console.log('\n════════════════════════════════════════════════════');
  console.log('RÉSULTAT : ' + pass + ' réussis, ' + fail + ' échoués');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
