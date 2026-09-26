#!/usr/bin/env node
/* Serveur statique minimal pour les tests : le site n'est que des fichiers,
   l'intégration continue n'a donc rien à installer de plus. Il tourne dans son
   propre processus — lancé depuis la boucle d'événements de lancer.js, il
   serait figé par les appels bloquants qui enchaînent les suites. */
const http = require('http');
const path = require('path');
const fs = require('fs');

const DOCS = process.env.DOCS || path.join(__dirname, '..', 'docs');
const PORT = Number(process.env.PORT || 8099);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml',
  '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
};

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const abs = path.join(DOCS, path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
  fs.readFile(abs, (err, data) => {
    if (err) {
      // 404.html existe : autant la servir, c'est aussi une page à vérifier.
      return fs.readFile(path.join(DOCS, '404.html'), (e2, page) => {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(e2 ? 'introuvable' : page);
      });
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(abs)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log('prêt sur http://127.0.0.1:' + PORT);
});
