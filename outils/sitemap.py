# -*- coding: utf-8 -*-
"""Engendre docs/sitemap.xml à partir du dépôt.

   Le sitemap était écrit à la main : quatorze de ses vingt dates annonçaient
   le 30 août alors que les pages avaient changé depuis, et l'une d'elles était
   antérieure à la création de la page. Google cesse d'accorder foi aux
   « lastmod » d'un site dès qu'il les prend en défaut — mieux vaut donc les
   calculer que les recopier.

   « changefreq » et « priority » ne sont plus écrits : Google a annoncé de
   longue date qu'il les ignore.

   Lancer depuis la racine du dépôt :  python3 outils/sitemap.py
"""
import io, os, subprocess, sys, datetime

BASE = 'https://calculatrice-duree.fr/'
RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(RACINE, 'docs')

# Une page d'erreur n'a rien à faire dans un plan de site : elle répond 404 et
# ne doit surtout pas être proposée à l'indexation.
EXCLUES = {'404.html'}


def derniere_modif(fichier):
    """Date du dernier commit touchant le fichier, sinon celle du disque."""
    try:
        d = subprocess.run(
            ['git', 'log', '-1', '--format=%cs', '--', 'docs/' + fichier],
            cwd=RACINE, capture_output=True, text=True, check=False).stdout.strip()
        if d:
            return d
    except OSError:
        pass
    ts = os.path.getmtime(os.path.join(DOCS, fichier))
    return datetime.date.fromtimestamp(ts).isoformat()


def adresse(fichier):
    # L'accueil se sert à la racine : c'est l'adresse que porte sa canonique.
    return BASE if fichier == 'index.html' else BASE + fichier


def main():
    pages = sorted(f for f in os.listdir(DOCS)
                   if f.endswith('.html') and f not in EXCLUES)
    if not pages:
        sys.exit('aucune page trouvée dans docs/')

    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for f in pages:
        out += ['  <url>',
                '    <loc>%s</loc>' % adresse(f),
                '    <lastmod>%s</lastmod>' % derniere_modif(f),
                '  </url>']
    out.append('</urlset>')
    out.append('')

    io.open(os.path.join(DOCS, 'sitemap.xml'), 'w', encoding='utf-8').write('\n'.join(out))
    print('sitemap.xml : %d adresses' % len(pages))


if __name__ == '__main__':
    main()
