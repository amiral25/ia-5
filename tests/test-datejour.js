/* « La page sait quel jour on est » : encart prochain jour férié + marquage
   des dates passées. Les dates attendues sont recalculées ICI, indépendamment
   du site — sinon on ne testerait que la cohérence du code avec lui-même. */
const { chromium } = require('playwright');
const { mesurerCLS, TOLERANCE } = require('./cls-util');

const B = process.env.BASE_URL || (process.env.BASE_URL || 'http://127.0.0.1:8099');
const PAGES = [
  ['jours-feries-france.html', 'fr', 'France'],
  ['jours-feries-belgique.html', 'be', 'Belgique'],
  ['jours-feries-suisse.html', 'ch', 'Suisse'],
  ['jours-feries-quebec.html', 'qc', 'Québec'],
  ['jours-feries-luxembourg.html', 'lu', 'Luxembourg'],
];

let pass = 0, fail = 0;
const ck = (n, ok, info) => {
  ok ? (pass++, console.log('✔ ' + n)) : (fail++, console.log('✘ ' + n + ' → ' + info));
};

// ---- moteur de référence, réécrit pour le test ----
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
const before = (y, mo, day, wd) => {
  const ts = Date.UTC(y, mo, day);
  return ts - ((new Date(ts).getUTCDay() - wd + 7) % 7 || 7) * D;
};
function feries(y, code) {
  const e = easter(y), out = [];
  const fix = (mo, d, n) => out.push([Date.UTC(y, mo, d), n]);
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
    [[0,1,'Nouvel An'],[4,1,'Fête du Travail'],[4,9,"Journée de l'Europe"],[5,23,'Fête nationale'],
     [7,15,'Assomption'],[10,1,'Toussaint'],[11,25,'Noël'],[11,26,'Saint-Étienne']].forEach(a => fix(...a));
    [[1,'Lundi de Pâques'],[39,'Ascension'],[50,'Lundi de Pentecôte']].forEach(a => mob(...a));
  } else {
    [[0,1,"Jour de l'An"],[5,24,'Fête nationale du Québec'],[6,1,'Fête du Canada'],
     [11,25,'Noël']].forEach(a => fix(...a));
    mob(-2, 'Vendredi saint');
    out.push([before(y, 4, 25, 1), 'Journée nationale des patriotes'],
             [nth(y, 8, 1, 1), 'Fête du Travail'], [nth(y, 9, 1, 2), 'Action de grâce']);
  }
  return out.sort((a, z) => a[0] - z[0]);
}
const now = new Date();
const AUJ = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
function prochain(code) {
  const y = new Date(AUJ).getUTCFullYear();
  for (const yy of [y, y + 1]) {
    const f = feries(yy, code).find(x => x[0] >= AUJ);
    if (f) return f;
  }
}

(async () => {
  const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });

  for (const [f, code, pays] of PAGES) {
    console.log('\n═══ ' + pays + ' ═══');
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => {
      if (m.type() === 'error' && !/cloudflareinsights|net::|ERR_/.test(m.text())) errs.push(m.text());
    });
    await p.goto(B + '/' + f, { waitUntil: 'load' });

    // ---- l'encart annonce le bon jour férié ----
    const [ts, nom] = prochain(code);
    const jours = Math.round((ts - AUJ) / D);
    const txt = (await p.textContent('#prochain')).replace(/\s+/g, ' ').trim();

    ck('le nom du prochain férié est juste', txt.includes(nom), `« ${nom} » absent de : ${txt}`);
    const d = new Date(ts);
    const MOIS = ['janvier','février','mars','avril','mai','juin','juillet','août',
                  'septembre','octobre','novembre','décembre'];
    const jour = d.getUTCDate() === 1 ? '1er' : String(d.getUTCDate());
    const attendu = `${jour} ${MOIS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    ck('la date est juste', txt.includes(attendu), `« ${attendu} » absent de : ${txt}`);
    const quand = jours === 0 ? "c'est aujourd'hui" : jours === 1 ? "c'est demain" : `dans ${jours} jours`;
    ck('le décompte est juste', txt.includes(quand), `« ${quand} » absent de : ${txt}`);
    ck('le texte de repli a bien été remplacé', !txt.includes('voir les tableaux de dates'), txt);

    // ---- les dates passées, et elles seules, sont marquées ----
    const lignes = await p.evaluate(() => {
      const out = [];
      document.querySelectorAll('.dl-feries').forEach(bloc => {
        const t = bloc.previousElementSibling.querySelector('table');
        t.querySelectorAll('tbody tr').forEach((tr, i) => out.push({
          annee: +bloc.getAttribute('data-annee'), i,
          passe: tr.classList.contains('passe'),
          sr: /\(date passée\)/.test(tr.cells[0].textContent),
        }));
      });
      return out;
    });

    let faux = [];
    lignes.forEach(l => {
      const attenduPasse = feries(l.annee, code)[l.i][0] < AUJ;
      if (l.passe !== attenduPasse) {
        faux.push(`${l.annee} ligne ${l.i} : marquée ${l.passe}, attendu ${attenduPasse}`);
      }
      if (l.passe !== l.sr) faux.push(`${l.annee} ligne ${l.i} : mention lecteur d'écran absente`);
    });
    const nbPasse = lignes.filter(l => l.passe).length;
    ck(`${nbPasse} dates marquées passées sur ${lignes.length}, toutes justes`,
       faux.length === 0, faux.slice(0, 4).join(' | '));
    ck('au moins une date à venir n\'est pas marquée',
       lignes.some(l => !l.passe), 'toutes marquées');

    ck('aucune erreur JS', errs.length === 0, errs.join(' | '));
    // La page de contrôle est fermée AVANT de mesurer : la laisser ouverte
    // pendant que quatre contextes tournent sous processeur ralenti ×6 crée
    // une contention qui produit des micro-décalages venus du banc de test,
    // pas de la page. Mesuré : seize chargements sans le moindre décalage en
    // isolation, contre un échec sur trois en contention.
    await p.close();

    // ---- le contrôle décisif : aucun décalage de page ----
    for (const [w, nomVue] of [[320, '320px'], [390, '390px'], [768, '768px'], [1280, '1280px']]) {
      const cls = await mesurerCLS(b, B + '/' + f, w);
      ck(`CLS ${cls.toFixed(4)} à ${nomVue} (CPU ×6, 3G lente, meilleur de 3)`,
         cls <= TOLERANCE, cls.toFixed(4));
      ck(`aucun débordement à ${nomVue}`,
         mesurerCLS.dernierDebordement <= 0, mesurerCLS.dernierDebordement + 'px');
    }
  }

  // L'accueil n'a pas d'encart : le code ne doit pas s'y plaindre.
  const p2 = await b.newPage();
  const e2 = [];
  p2.on('pageerror', e => e2.push(e.message));
  await p2.goto(B + '/');
  ck('\naccueil : aucun encart', (await p2.$$('#prochain')).length === 0);
  ck('accueil : aucune erreur JS', e2.length === 0, e2.join(' | '));

  console.log('\n════════════════════════════════════════════════════');
  console.log('RÉSULTAT : ' + pass + ' réussis, ' + fail + ' échoués');
  await b.close();
  process.exit(fail ? 1 : 0);
})();
