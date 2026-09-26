/* Mesure du décalage de page (CLS), débruitée.

   Le problème : sous processeur ralenti ×6 dans un conteneur partagé, une
   mesure isolée porte un bruit qui monte jusqu'à ~0,016 — parfois même une
   valeur non nulle qui s'affiche « 0.0000 ». Exiger zéro strict sur une seule
   mesure produit un test qui échoue une fois sur trois sans rien signaler.

   La règle retenue : un VRAI décalage se produit à chaque chargement, le bruit
   non. On charge donc la page plusieurs fois et on garde le MINIMUM. Un défaut
   déterministe garde un minimum non nul ; le bruit retombe à zéro. C'est ainsi
   que la régression de 0,0009 du 14 septembre aurait été attrapée, alors qu'un
   simple seuil à 0,02 l'aurait laissée passer.

   Cinq essais plutôt que trois : quand les douze suites se partagent la
   machine, trois chargements bruités de suite arrivent. La boucle sort dès
   qu'une mesure est propre, le coût n'est donc payé que dans le bruit. */

const TOLERANCE = 1e-4; // poussière de calcul flottant, rien de visible

async function mesurerCLS(navigateur, url, largeur, essais = 5) {
  let mini = Infinity;
  for (let i = 0; i < essais; i++) {
    const ctx = await navigateur.newContext({ viewport: { width: largeur, height: 900 } });
    const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false, latency: 400,
      downloadThroughput: 400 * 1024 / 8, uploadThroughput: 400 * 1024 / 8,
    });
    await p.addInitScript(() => {
      window.__cls = 0;
      new PerformanceObserver(l => {
        for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await p.goto(url, { waitUntil: 'load' });
    await p.evaluate(() => new Promise(r => setTimeout(r, 2000)));
    mini = Math.min(mini, await p.evaluate(() => window.__cls));
    const debord = await p.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await ctx.close();
    if (i === 0) mesurerCLS.dernierDebordement = debord;
    if (mini <= TOLERANCE) break; // déjà propre, inutile de recharger
  }
  return mini;
}

module.exports = { mesurerCLS, TOLERANCE };
