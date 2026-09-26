#!/usr/bin/env node
/* Lance les douze suites l'une après l'autre et rend un compte unique.
   Sert en local comme en intégration continue. */
const { spawn, spawnSync } = require('child_process');
const http = require('http');
const path = require('path');

const DOCS = process.env.DOCS || path.join(__dirname, '..', 'docs');
const PORT = Number(process.env.PORT || 8099);
const BASE = `http://127.0.0.1:${PORT}`;

const SUITES = [
  'test-pages.js', 'test4.js', 'test-export.js', 'test-share.js', 'test-racine.js',
  'test-feries.js', 'test-reponses.js', 'test-datejour.js', 'test-menu.js',
  'test-histo.js', 'test-semaine.js', 'test-coupee.js',
];

function attendre(url, essais = 60) {
  return new Promise((ok, ko) => {
    const coup = () => http.get(url, (r) => { r.resume(); ok(); })
      .on('error', () => (--essais ? setTimeout(coup, 200) : ko(new Error('serveur muet'))));
    coup();
  });
}

(async () => {
  const serveur = spawn(process.execPath, [path.join(__dirname, 'serveur.js')], {
    env: { ...process.env, PORT: String(PORT), DOCS }, stdio: 'ignore',
  });
  process.on('exit', () => serveur.kill());

  await attendre(BASE + '/index.html');
  console.log(`Site servi depuis ${DOCS} sur ${BASE}\n`);

  let echecs = 0;
  const debut = Date.now();
  for (const suite of SUITES) {
    const r = spawnSync(process.execPath, [path.join(__dirname, suite)], {
      encoding: 'utf8', env: { ...process.env, BASE_URL: BASE, DOCS },
    });
    const sortie = (r.stdout || '') + (r.stderr || '');
    const bilan = (sortie.match(/^RÉSULTAT.*$/m) || ['(la suite s’est interrompue)'])[0];
    const ok = r.status === 0;
    if (!ok) echecs++;
    console.log(`${ok ? '✔' : '✘'} ${suite.padEnd(20)} ${bilan}`);
    if (!ok) {
      // Seules les lignes en échec intéressent : le reste noierait le journal.
      const util = sortie.split('\n').filter((l) => l.startsWith('✘') || /attendu|Error/.test(l));
      (util.length ? util : sortie.split('\n').slice(-12)).forEach((l) => console.log('    ' + l));
    }
  }

  const secondes = ((Date.now() - debut) / 1000).toFixed(0);
  console.log(`\n${SUITES.length - echecs}/${SUITES.length} suites au vert en ${secondes} s`);
  serveur.kill();
  process.exit(echecs ? 1 : 0);
})();
