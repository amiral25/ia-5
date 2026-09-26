# Audit complet de calculatrice-duree.fr

*Réalisé le 26 septembre 2026, sur la branche `main` (commit `11fe7d2`), soit 20 pages HTML, `script.js`, `style.css`, `sitemap.xml`, `robots.txt`, `ads.txt` et le workflow de publication.*

---

## Sommaire

1. [Méthode et limites](#1-méthode-et-limites)
2. [Synthèse : les notes et les 10 priorités](#2-synthèse)
3. [Audit SEO technique (tout le site)](#3-audit-seo-technique)
4. [Audit performance](#4-audit-performance)
5. [Audit contenu (tout le site)](#5-audit-contenu)
6. [Audit accessibilité](#6-audit-accessibilité)
7. [Audit UX et tests fonctionnels](#7-audit-ux-et-tests-fonctionnels)
8. [Conformité légale et sécurité](#8-conformité-légale-et-sécurité)
9. [Audit page par page (20 pages)](#9-audit-page-par-page)
10. [Pistes d'amélioration : plan d'action](#10-pistes-damélioration)
11. [Annexes](#11-annexes)

---

## 1. Méthode et limites

| Audit | Outil / méthode | Portée |
|---|---|---|
| SEO on-page | Extraction automatique (titre, description, Hn, canonical, Open Graph, JSON-LD, liens) | 20 pages |
| Performance | **Lighthouse 13.5**, mobile + bureau, site servi en local avec gzip et `Cache-Control: max-age=600` (comme GitHub Pages) | 40 mesures |
| Accessibilité | Lighthouse + **axe-core** en thème **clair ET sombre** (Lighthouse ne teste que le clair) | 40 passes |
| Responsive | Chromium à 320 px et 360 px : recherche de tout débordement horizontal | 40 passes |
| Fonctionnel | Scénarios Playwright : 4 onglets, cas limites, liens partagés, journée coupée, raccourcis | ~35 cas |
| Impression | Rendu PDF « Ctrl+P » des pages | 3 pages |
| Validité HTML | html-validate | 20 pages |
| Contenu | Lecture intégrale des 20 pages, vérification des calculs cités, recherche de doublons (6-grammes) | 20 pages |
| Exactitude juridique | Vérification en ligne des points douteux | 4 points |
| Sitemap | Comparaison `lastmod` / historique git | 20 URL |

**Limite importante.** L'environnement d'audit n'a pas pu joindre `calculatrice-duree.fr` : la politique réseau bloque ce domaine. N'ont donc **pas** pu être mesurés : les en-têtes HTTP réels, les redirections `www` → apex et HTTP → HTTPS, les données terrain (CrUX), l'indexation et les requêtes Search Console. Pour qu'un prochain audit les couvre, il faut autoriser le domaine dans les réglages de l'environnement cloud (menu de l'environnement dans la barre de titre → *Edit* → *Network access*, voir <https://code.claude.com/docs/en/claude-code-on-the-web>). Dans Search Console, pensez aussi à vérifier les rapports *Pages* et *Signaux Web essentiels*.

---

## 2. Synthèse

### Les notes

| Axe | Note | En une phrase |
|---|---|---|
| **Performance** | **10/10** | 100/100 sur les 40 mesures Lighthouse, ~40 Ko transférés par page, CLS = 0. Difficile de faire mieux. |
| **SEO technique** | **8/10** | Base saine (canonical, sitemap, robots, maillage, IndexNow), mais `lastmod` faux, pas d'`og:image`, pas de page 404, langue incohérente. |
| **SEO on-page** | **8/10** | Titres et descriptions bien calibrés et tous uniques ; quelques cannibalisations entre pages. |
| **Contenu** | **7,5/10** | Très au-dessus de la moyenne des sites de calculatrices (exemples chiffrés justes, vrais cas d'usage), mais **4 erreurs factuelles**, **5 incohérences**, aucune source citée, aucun auteur identifié. |
| **Accessibilité** | **7,5/10** | 100/100 Lighthouse en thème clair, mais **contrastes insuffisants en thème sombre**, tableaux inaccessibles au clavier et raccourcis à une touche. |
| **UX / fonctionnel** | **8/10** | Calculs exacts sur tous les cas testés, mais **l'impression des pages est cassée** et l'en-tête prend beaucoup de place sur mobile. |
| **Conformité légale** | **4/10** | Les mentions légales décrivent une publicité et un bandeau cookies qui n'existent pas, se contredisent sur l'historique, et l'anonymat de l'éditeur est fragile pour un site monétisé. |

### Les 10 priorités

| # | Problème | Gravité | Effort |
|---|---|---|---|
| 1 | **4 erreurs factuelles** : Vaud et le 26 décembre, un article de loi luxembourgeois faux, le lundi de Pâques fédéral au Canada, le « temps plein » à 37 h 30 | 🔴 Haute (crédibilité, contenu juridique) | 30 min |
| 2 | **Mentions légales / confidentialité** : AdSense et bandeau de consentement décrits mais absents, « cinq derniers calculs » au lieu de 50, anonymat LCEN fragile, téléphone de l'hébergeur manquant | 🔴 Haute (légal) | 1 h |
| 3 | **L'impression (Ctrl+P) masque tout le contenu** : une page fériés s'imprime sans aucun tableau de dates, l'accueil s'imprime quasi vide | 🔴 Haute (usage fréquent) | 1 h |
| 4 | **Contraste en thème sombre** (blanc sur `#60a5fa` = 2,54:1, il faut 4,5:1) sur 8 pages | 🟠 Moyenne (WCAG AA) | 15 min |
| 5 | **`lastmod` du sitemap faux** : `jours-feries-france.html` est datée du 30/08 alors qu'elle a été créée le 14/09 | 🟠 Moyenne (SEO) | 30 min (automatisation) |
| 6 | **Aucune `og:image`** : les partages Facebook, LinkedIn, WhatsApp et X s'affichent sans visuel | 🟠 Moyenne (CTR social) | 2 h |
| 7 | **Pas de page 404** : GitHub affiche sa page d'erreur générique, sans lien vers le site | 🟠 Moyenne | 30 min |
| 8 | **Touche « M » : efface tout le calcul sans confirmation** (raccourci à une touche, WCAG 2.1.4) | 🟠 Moyenne | 20 min |
| 9 | **`ads.txt` publié avec l'identifiant fictif `pub-XXXXXXXXXXXXXXXX`** | 🟡 Faible | 5 min |
| 10 | **Aucune source officielle citée** sur des contenus de droit du travail (critères E-E-A-T de Google pour les sujets « argent / travail ») | 🟠 Moyenne (SEO long terme) | 3 h |

---

## 3. Audit SEO technique

### Ce qui est déjà très bien

- ✅ **Canonical** absolue et correcte sur les 20 pages, et cohérente avec `og:url`.
- ✅ **20/20 pages dans le sitemap**, aucune URL morte, aucun lien interne cassé (vérifié sur tous les `href`).
- ✅ **`robots.txt`** propre, qui déclare le sitemap.
- ✅ **IndexNow** envoyé automatiquement à chaque publication (Bing, donc Copilot et ChatGPT), et vérifications Google et Bing en place.
- ✅ **Titres uniques** (0 doublon), entre 42 et 63 caractères ; **descriptions uniques**, entre 123 et 155 caractères.
- ✅ **Un seul H1 par page**, aucun saut de niveau de titre (h2 → h4).
- ✅ **Maillage interne très dense** : plan du site en pied de page, liens « À voir aussi », bandeau de pays. Chaque page reçoit entre 19 et 128 liens internes.
- ✅ **HTML valide** : 0 erreur html-validate sur les 20 pages.
- ✅ **Contenu dans le HTML** (pas de rendu JavaScript), donc entièrement lisible par les robots, y compris ceux des IA.
- ✅ **Données structurées** : WebApplication, WebPage, FAQPage et BreadcrumbList sont présentes et syntaxiquement valides.

### Ce qui doit être corrigé

| Problème | Détail | Correction |
|---|---|---|
| ❌ **`lastmod` du sitemap faux** | 14 URL sur 20 sont datées du `2026-08-30`, dont `jours-feries-france.html`, **créée le 14/09**. Google ignore les `lastmod` d'un site dès qu'il les juge peu fiables. | Générer `sitemap.xml` dans le workflow de publication à partir de `git log -1 --format=%cs -- <fichier>`. Supprimer `changefreq` et `priority`, que Google ignore. |
| ❌ **Pas d'`og:image`** (20/20 pages) | `twitter:card=summary` sans image. Un lien partagé s'affiche sans visuel. | Créer 5 ou 6 visuels 1200×630 (un par famille de pages) et passer à `summary_large_image`. |
| ❌ **Pas de page `404.html`** | GitHub Pages sert sa page d'erreur générique : le visiteur est perdu. | Créer `docs/404.html` avec l'en-tête, un message et les liens vers les calculateurs. |
| ⚠️ **Langue incohérente** | Les pages « journée coupée » sont en `fr-BE`, `fr-CH`, `fr-LU` et `fr-CA`, mais les pages « jours fériés » du même pays sont en `lang="fr"` avec `inLanguage: "fr-FR"` (alors que `og:locale` vaut `fr_BE`). | Harmoniser : `lang="fr-BE"` et `inLanguage: "fr-BE"` sur `jours-feries-belgique.html`, et de même pour CH, LU et QC. |
| ⚠️ **Pas de `hreflang` entre les 5 pages « journée coupée »** | Ce sont 5 variantes par pays du même sujet : exactement le cas d'usage de `hreflang`. Sans lui, un Belge qui cherche « journée coupée horeca » peut tomber sur la page française. | Ajouter sur les 5 pages les `<link rel="alternate" hreflang="fr-FR|fr-BE|fr-CH|fr-LU|fr-CA|x-default">`. **Pas** sur les pages fériés, dont le sujet diffère réellement d'un pays à l'autre. |
| ⚠️ **Fil d'Ariane de l'accueil inutile** | Le `BreadcrumbList` de l'accueil pointe vers `/#calculatrice` (`docs/index.html:157`). | Le supprimer sur l'accueil. |
| ⚠️ **Pas d'éditeur ni de date dans le schéma** | Aucun `publisher`, `Organization`, `logo`, `dateModified` ni `datePublished`. | Ajouter un nœud `Organization` (nom, logo, email) et `dateModified` sur chaque `WebPage`. |
| ⚠️ **Attente irréaliste sur la FAQ** | Depuis août 2023, Google n'affiche plus les résultats enrichis FAQ que pour les sites gouvernementaux et de santé. | Garder le balisage (inoffensif, et utile aux IA), mais ne pas compter dessus pour le clic. |
| ⚠️ **`ads.txt` factice** | `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, …` est en production. | Retirer la ligne tant qu'AdSense n'est pas validé, puis mettre le vrai identifiant. |
| ⚠️ **Titres en « Title Case » anglais** | « Calculatrice de Durée et de Temps – Calcul d'Heures Gratuit » : la typographie française ne met une majuscule qu'au premier mot. Aucun effet sur le classement, mais cela fait « traduit ». | « Calculatrice de durée et de temps – Calcul d'heures gratuit ». |
| ℹ️ À vérifier en production | Redirection `www` → apex, HTTPS forcé (case *Enforce HTTPS* de GitHub Pages), réponse de `/additionner-des-heures` sans `.html` (la canonical protège de toute façon). | À contrôler dans le navigateur ou dans Search Console. |

### Cannibalisation (plusieurs pages visent la même requête)

| Requête | Pages en concurrence | Recommandation |
|---|---|---|
| « de 8h à 17h combien d'heures » | `combien-heures-entre-deux-horaires` (qui la vise dans son titre) **et** la FAQ + FAQPage de `calcul-heures-de-travail` | Retirer la question de la FAQ de `calcul-heures-de-travail` et la remplacer par un lien. |
| « jours fériés 2026 / 2027 France » | `jours-feries-france` **et** `calcul-jours-ouvres`, qui contient les deux tableaux complets 2026 et 2027, plus la FAQ « Combien y a-t-il de jours fériés en France ? » | Dans `calcul-jours-ouvres`, garder un résumé (« 252 jours ouvrés en 2026 ») et renvoyer vers `jours-feries-france` pour les tableaux. |
| « convertir minutes en heures décimales », « additionner des heures », « heures de travail » | L'**accueil** reprend une section complète de chacun de ces sujets, dont la même table de conversion. | Réduire chaque section de l'accueil à 3 ou 4 lignes suivies d'un lien « Guide complet → ». L'accueil doit viser « calculatrice de durée » et « calcul d'heures ». |

---

## 4. Audit performance

### Résultats Lighthouse 13.5 (les 20 pages)

| Mesure | Mobile (4G lente simulée) | Bureau |
|---|---|---|
| Score Performance | **100** sur les 20 pages | **100** sur les 20 pages |
| First / Largest Contentful Paint | **1,38 s** (accueil 1,53 s) | **0,39 s** (accueil 0,43 s) |
| Total Blocking Time | **0 ms** | **0 ms** |
| Cumulative Layout Shift | **0,000** (multiplier : 0,004 en bureau) | **0,000** |
| Poids transféré | **37 à 46 Ko** par page (16 Ko pour les mentions légales et les nouveautés) | idem |
| Requêtes | 4 (HTML, CSS, JS, favicon) + la balise Cloudflare | idem |
| Taille du DOM | ~600 éléments, profondeur 10 | idem |

Le détail page par page est en [annexe A](#annexe-a--lighthouse-page-par-page).

**Pourquoi c'est si bon :** pas d'image, pas de police web, pas de framework, CSS et JS uniques, hauteurs réservées partout (résultat, encart « prochain férié », emplacements publicitaires), script en `defer`, thème appliqué avant le premier rendu. C'est un modèle du genre.

### Gains restants (marginaux)

| Point | Gain | Comment |
|---|---|---|
| CSS et JS non minifiés | −3 Ko (CSS) et −8 Ko (JS) transférés | Ajouter une étape de minification au workflow (esbuild / lightningcss), en gardant les sources commentées dans le dépôt. |
| Cache de 10 minutes (imposé par GitHub Pages) | Les visites répétées retéléchargent 31 Ko | Impossible à régler sur GitHub Pages. Option : passer le DNS chez Cloudflare (déjà utilisé pour les statistiques) avec proxy, cache long et noms de fichiers versionnés (`style.3f2a.css`). |
| `style.css` bloque le rendu | ~11 Ko compressés | Optionnel : mettre en ligne le CSS critique au-dessus de la ligne de flottaison. Gain faible vu le score. |
| `script.js` (62 Ko bruts) chargé partout | — | Acceptable. Il pourrait être découpé (le moteur fériés n'est utile qu'à certaines pages), mais le gain ne justifie pas la complexité. |

### ⚠️ Le vrai risque performance, c'est l'arrivée d'AdSense

L'activation d'AdSense (code prêt mais commenté) ajoute typiquement plusieurs centaines de Ko de JavaScript tiers et fait souvent perdre **20 à 40 points** de performance mobile. Pour limiter la casse :

- garder les emplacements à **hauteur réservée** (déjà prévu) ;
- **2 ou 3 emplacements maximum**, jamais au-dessus du résultat du calculateur sur mobile ;
- chargement différé des blocs situés sous la ligne de flottaison ;
- mesurer les Signaux Web essentiels dans Search Console 28 jours avant et 28 jours après l'activation.

---

## 5. Audit contenu

### Points forts (à conserver)

- **Exactitude arithmétique** : tous les exemples chiffrés du site ont été recalculés (additions, conversions, 151,67 h, heures sup, tables de 1 à 60 min, jours ouvrés 2026/2027 des 5 pays, dates de Pâques, Jeûne genevois, Patriotes, décomptes des fériés tombant le week-end 2020-2025). **Aucune erreur de calcul trouvée.**
- **Une vraie valeur ajoutée** : le piège du résultat négatif inversé, la différence entre amplitude et travail effectif, « férié ≠ chômé », le jour de remplacement belge, les frontaliers luxembourgeois, la règle des 3 heures au Québec. C'est du contenu d'expert, pas du remplissage.
- **Vocabulaire localisé** : pécule et CP 302 pour la Belgique, LTr et CCNT pour la Suisse, horaire brisé et CNESST pour le Québec. Excellent pour le ciblage francophone.
- **Structure « réponse d'abord »** : les blocs « L'essentiel », les tableaux « Cette date est-elle fériée ? » et « Prochain jour férié » répondent directement aux requêtes, ce qui est idéal pour les extraits Google et les réponses d'IA.
- **Volume** : de 1 000 à 2 700 mots par page outil, avec tableaux, FAQ et exemples.

### ❌ Erreurs factuelles (vérifiées)

| # | Page | Erreur | Correction |
|---|---|---|---|
| 1 | `docs/jours-feries-suisse.html:653` et `:683` | Le **26 décembre (Saint-Étienne)** est présenté comme férié dans le **canton de Vaud**, qui compterait ainsi 10 jours. | Les jours fériés officiels vaudois sont le 1er et le 2 janvier, le Vendredi saint, le lundi de Pâques, l'Ascension, le lundi de Pentecôte, le 1er août, le lundi du Jeûne fédéral et Noël, soit **9 jours**. Le 26/12 n'est chômé que par l'administration cantonale. Retirer Vaud de la ligne Saint-Étienne et corriger le total à 9. |
| 2 | `docs/journee-coupee-luxembourg.html:69`, `:338`, `:394` et `docs/script.js:1087` (plus le commentaire `:1001`) | La durée maximale de 10 h par jour et 48 h par semaine est attribuée à l'**article L.211-26**. | C'est l'**article L.211-12** du Code du travail luxembourgeois. Les articles L.211-5 (durée légale) et L.211-16 (repos de 11 h, pause au-delà de 6 h) sont, eux, corrects. |
| 3 | `docs/jours-feries-quebec.html:682` | « Lundi de Pâques : **Fédéral**, ou provincial au choix ». | Le lundi de Pâques **ne fait pas partie** des 10 jours fériés du Code canadien du travail (qui comprend en revanche le Vendredi saint). Il n'est accordé qu'à la fonction publique fédérale. Écrire : « Fonction publique fédérale seulement ; au Québec, alternative au Vendredi saint au choix de l'employeur ». |
| 4 | `docs/multiplier-diviser-une-duree.html:559` | « 7h30 × 5 jours = 37 h 30 — **le fameux temps plein français** ». | La durée légale d'un temps plein en France est de **35 h**. Écrire par exemple « un horaire courant dans les entreprises à 37 h 30 avec RTT ». |

### ⚠️ Incohérences internes

| # | Où | Problème |
|---|---|---|
| 1 | `docs/index.html:767` et `docs/mentions-legales.html:160` | « L'historique des **cinq** derniers calculs » alors que le relevé compte **50 lignes** depuis le 28/08 (d'après la page Nouveautés et le reste de l'accueil). |
| 2 | `docs/jours-feries-quebec.html:894` (et le JSON-LD, ligne 115) | La FAQ dit de cocher « **Déduire** les jours fériés », mais la case s'appelle « **Exclure** les jours fériés ». Elle promet aussi que « le résultat indique le nombre de fériés déduits » : ce nombre n'apparaît **pas** à l'écran, seulement dans le texte copié. |
| 3 | Pied de page des 18 pages (`docs/index.html:903`…) | « Aucune donnée collectée », alors que Cloudflare Web Analytics mesure l'audience et que la politique de confidentialité parle de cookies publicitaires. Préférer « Aucune donnée saisie n'est collectée ». |
| 4 | `docs/additionner-des-heures.html:539` | « … que **la page suivante** détaille » : aucun lien, on ne sait pas de quelle page il s'agit (sans doute `convertir-minutes-en-heures.html`). |
| 5 | `docs/calcul-heures-de-travail.html:575` | « **Forfait** 39 h » : en droit français, un « forfait » désigne un forfait heures ou jours, pas un contrat à 39 h. Écrire « Contrat à 39 h ». |

### ⚠️ Points à faire vérifier (non tranchés)

- `jours-feries-suisse.html` : les totaux par canton (Neuchâtel 10, Valais 11, Fribourg 11, Jura 12) et la ligne Berchtoldstag pour Neuchâtel sont complexes (jours conditionnels, demi-journées). Comparer avec les listes officielles cantonales.
- `journee-coupee-luxembourg.html` : d'après plusieurs sources, la journée de travail ne peut être interrompue que par **un seul** repos non rémunéré. Si c'est confirmé, c'est une règle très pertinente pour une journée coupée à 3 services, à ajouter (et à signaler dans le calculateur).

### Faiblesses de fond (E-E-A-T)

Google applique des exigences renforcées aux sujets qui touchent à l'argent et au travail (« Your Money or Your Life »). Sur ces critères :

| Critère | État | Recommandation |
|---|---|---|
| **Sources** | ❌ **0 lien externe** sur les 18 pages de contenu (seule exception : un lien Google dans les mentions). Les articles de loi sont cités sans lien. | Lier chaque article cité vers la source officielle : Légifrance et service-public.fr (FR), SPF Emploi (BE), Legilux et ITM (LU), Fedlex et SECO (CH), LégisQuébec et CNESST (QC). C'est le levier de crédibilité le plus rentable. |
| **Auteur / éditeur** | ❌ Anonyme, contact en `@gmail.com` | Page « À propos et méthode » : qui écrit, pourquoi, comment les dates sont calculées, comment les erreurs sont corrigées. Adresse `contact@calculatrice-duree.fr`. |
| **Fraîcheur visible** | ⚠️ Aucune date « Mis à jour le » sur les pages | Afficher « Mis à jour le JJ/MM/AAAA » sous le H1, en cohérence avec `dateModified`. |
| **Relecture juridique** | ⚠️ Mention « à titre indicatif » présente, mais aucune date de vérification | Ajouter « Règles vérifiées le … » sur les pages de droit du travail. |

### Duplication entre pages (mesurée)

- Les 5 pages **journée coupée** partagent **27 à 40 %** de texte identique (même gabarit, mêmes FAQ « Comment calculer… » et « Un service qui finit après minuit… » sur 4 pages). C'est acceptable parce que chaque page a sa section juridique propre, mais ces pages ne font qu'environ 1 000 mots. Il faut **enrichir la partie spécifique** de chaque pays plutôt que d'ajouter du texte commun.
- Les pages **fériés BE, LU et FR** se recoupent à 26-30 % (structure « Cette date est-elle fériée ? » commune). Rien d'inquiétant.

### Fraîcheur saisonnière

On est fin septembre 2026 : les recherches « jours fériés 2027 » et « ponts 2027 » vont culminer d'octobre à janvier. Les pages montrent 2026 et 2027 : c'est bien. **Il faut prévoir l'ajout de 2028 et le passage des titres à « 2027 et 2028 » vers décembre**, et ajouter une section « ponts » pour la France.

---

## 6. Audit accessibilité

**Lighthouse : 100/100 sur les 40 mesures.** Mais Lighthouse ne teste que le thème clair et applique moins de règles qu'axe-core. La passe axe-core en clair **et** en sombre a trouvé ceci :

| Problème | Pages | Norme | Correction |
|---|---|---|---|
| ❌ **Contraste 2,54:1** en thème sombre : texte blanc sur `#60a5fa` (pastilles actives « 45 min » et « 5 jours », bouton « × Multiplier », pays courant du bandeau journée coupée, et de même pour `+` actif et le lien d'évitement) | 8 pages | WCAG 1.4.3 (AA) | En sombre, fond `#2563eb` (5,17:1) ou texte `#0b1220` sur `#60a5fa`. Créer un jeton `--on-brand` distinct de `--brand`. **La page Nouveautés annonce « accessibilité 100/100 » : ce n'est vrai qu'en thème clair.** |
| ❌ **Tableaux à défilement horizontal inaccessibles au clavier** (`.table-wrap` en `overflow-x:auto`, non focalisable) | 11 pages | WCAG 2.1.1 (A) | Ajouter `tabindex="0" role="region" aria-labelledby="<id de la caption>"` sur chaque `.table-wrap`. |
| ⚠️ **Raccourcis à une seule touche** (`+`, `-`, `W`, `C`, `M`) actifs sur toute la page | 13 pages avec calculateur | WCAG 2.1.4 (A) | Les limiter au focus dans le calculateur, **ou** exiger Alt, **ou** offrir un interrupteur. Surtout : proposer « Annuler » dans le message affiché après une remise à zéro. |
| ⚠️ Nom accessible différent du libellé visible (« + Ajouter une durée » contre `aria-label="Ajouter une durée"`, etc.) | 13 pages (bureau) | WCAG 2.5.3 | Faux positif en grande partie (le libellé est contenu dans le nom). Le plus simple : supprimer les `aria-label` quand le texte visible suffit, et ne les garder que pour les versions mobiles raccourcies. |
| ⚠️ Résultat du calculateur journée coupée **sans `aria-live`** | 5 pages | WCAG 4.1.3 | Ajouter `aria-live="polite"` sur `#jc-note` (pas sur toute la carte, pour éviter le bruit). |
| ⚠️ Le bouton flottant « ↑ Calculateur » reste **focalisable quand il est invisible** (`opacity:0`) | 18 pages | WCAG 2.4.7 | Ajouter `visibility:hidden` quand `.is-on` est absent. |
| ℹ️ Le lien `#retour-calc` est hors de tout repère (*landmark*) | 18 pages | bonne pratique | Le placer dans `<main>` ou lui donner un `<nav aria-label>`. |

Points positifs : lien d'évitement, navigation par `<details>` natifs (utilisable sans JavaScript), `aria-selected` et flèches clavier sur les onglets, libellés sur tous les champs, `prefers-reduced-motion` respecté, dates passées signalées par du texte masqué et pas seulement par le barré.

---

## 7. Audit UX et tests fonctionnels

### Tests réussis ✅

| Cas testé | Résultat |
|---|---|
| `2h30 + 1h45 - 20min` | 3h 55min ✅ |
| `2h - 5h` | −3h 00min, −3,00, −180 min ✅ (signe conservé partout) |
| `1,5h`, `2 h 30 min`, `1j 2h` | 1h30, 2h30, 26h ✅ |
| `3h - ` / `abc` | Messages d'erreur clairs ✅ |
| 22:00 → 06:00, pause 30 min, puis × 5 jours | 7h30 (note « service de nuit »), puis 37h30 ✅ |
| 01/01 → 31/12/2026 en France, puis en Belgique | 364 j, 252 puis 253 jours ouvrés ✅ |
| Changement d'heure 29 → 30 mars | 1 jour, sans décalage ✅ |
| 2h30 ÷ 0 / ÷ 2,5 | Erreur claire / 1h00 ✅ (virgule acceptée) |
| Lien partagé `?t=3&…&dp=lu` (mai 2026) | Onglet, pays et 18 jours ouvrés restaurés ✅ |
| Belgique, 2 services de 2 h | Alerte « prestation minimale de 3 heures » ✅ |
| Québec, 2 services de 2 h | « 4 h travaillées mais 6 h payées » ✅ |
| Service 19h → 01h | 6h, pas de durée négative ✅ |
| « Prochain jour férié » au Québec | Action de grâce, lundi 12 octobre 2026, dans 16 jours ✅ |
| Débordement horizontal à 320 et 360 px | Aucun, sur les 20 pages ✅ |

### Problèmes trouvés

| # | Problème | Gravité | Détail et correction |
|---|---|---|---|
| 1 | ❌ **Impression cassée** | Haute | `style.css:577-587` masque `.content`, `.hero`, `.panel`… pour **toute** impression. Résultat : Ctrl+P sur `jours-feries-france.html` donne 1 page avec « L'essentiel » et **aucun tableau de dates**. Sur l'accueil, la page imprimée ne contient que « À voir aussi ». Or imprimer la liste des fériés est un usage très courant. **Correction :** poser une classe (`html.imprime-releve`) seulement quand on clique sur « Imprimer / PDF », et ne cibler que cette classe dans les règles d'impression. Ctrl+P imprime alors la page normalement. Masquer aussi `.voisins` et `.jc-pays` à l'impression. |
| 2 | ⚠️ **Touche M = remise à zéro immédiate** | Moyenne | Testé : 15h45 affichées, focus hors d'un champ, touche « m », et tout revient à 0h00, sans annulation. |
| 3 | ⚠️ **Page « Convertir minutes en heures » : taper `45` donne 45 heures** | Moyenne | La page ouvre l'onglet 1, où « un nombre seul = des heures ». Quelqu'un venu convertir 45 minutes obtient « 45h 00min ». **Correction :** un petit convertisseur dédié en tête de page (minutes → h:min et décimal, et l'inverse), ou `data-unite="min"` sur cette page. |
| 4 | ⚠️ **Bouton « ↑ Calculateur » trompeur sur les pages fériés** | Moyenne | Sur mobile, il apparaît **dès l'arrivée** (le calculateur est 880 px plus bas), avec une flèche **vers le haut** alors que la cible est **en dessous**, et il recouvre le texte de « L'essentiel ». Afficher « ↓ » quand la cible est en dessous, ou n'afficher le bouton qu'une fois le calculateur dépassé. |
| 5 | ⚠️ **En-tête mobile encombrant** | Moyenne | À 360 px, le menu tient sur 3 lignes : environ 165 px d'en-tête. Avec un H1 de 4 lignes, le résultat du calculateur de l'accueil n'est qu'à moitié visible sans défiler. **Correction :** menu horizontal défilant ou bouton « Menu » unique, et H1 raccourci sur mobile. |
| 6 | ⚠️ Nombre de fériés déduits absent de l'écran | Faible | L'onglet 3 le calcule (`feriesDeduits`) mais ne l'affiche que dans le texte copié. L'ajouter dans la note (« 9 fériés déduits ») ou dans une cellule. |
| 7 | ℹ️ `2h30 x 3` refusé dans la saisie rapide | Faible | L'onglet 4 existe, mais accepter `×`, `x`, `*` et `/` dans la saisie rapide serait naturel. |
| 8 | ℹ️ `1:75` accepté silencieusement (= 2h15) | Faible | Afficher un avertissement quand les minutes ou secondes dépassent 59 en format `h:mm`. |
| 9 | ℹ️ « 1 JOURS OUVRÉS » | Faible | Libellé au pluriel figé ; accorder selon le nombre. |
| 10 | ℹ️ Québec : libellé « Temps de travail effectif » | Faible | Sur la page québécoise, écrire « Temps travaillé », le vocabulaire local que la page emploie partout ailleurs. |
| 11 | ℹ️ Pages Nouveautés et Mentions légales sans `script.js` | Faible | Pas de bouton de thème, et les menus ne se ferment ni par Échap ni au clic extérieur. Charger `script.js` partout pour être cohérent. |

---

## 8. Conformité légale et sécurité

> Ce qui suit est un repérage, pas un avis juridique. À faire valider si le site est monétisé.

| Point | État | Recommandation |
|---|---|---|
| **Anonymat de l'éditeur (LCEN)** | La page invoque l'option d'anonymat des éditeurs **non professionnels**. Or le site est conçu pour être monétisé (AdSense, guide « gagner de l'argent »). | Dès que le site génère des revenus, cette qualification devient fragile. Prévoir d'afficher l'identité de l'éditeur (nom, ou raison sociale et SIREN pour une micro-entreprise, adresse). |
| **Hébergeur** | Nom et adresse de GitHub présents, **téléphone absent** | La LCEN demande aussi le numéro de téléphone de l'hébergeur. |
| **Politique de confidentialité** | ❌ Décrit « des annonces fournies par Google AdSense », « un bandeau de consentement » et « un lien de gestion du consentement en bas de page » (`docs/mentions-legales.html:176-180`) : **rien de tout cela n'existe aujourd'hui**. | Décrire l'état réel. Mentionner aussi toutes les clés `localStorage` (`cd-theme`, `cd-hist`, `cd-pays`, `cd-ms`) et corriger « cinq derniers calculs » en « 50 ». |
| **Le jour où AdSense est activé** | — | Google impose une **CMP certifiée compatible TCF v2.2** pour diffuser des annonces dans l'EEE, au Royaume-Uni et en Suisse (celle de Google, *Confidentialité et messages*, est gratuite). Sans elle, pas d'annonces personnalisées et risque CNIL. |
| **Cloudflare Web Analytics** | Sans cookie ni empreinte : la dispense de consentement est défendable et le point est déjà mentionné. | Préciser le transfert vers Cloudflare (États-Unis) et le cadre applicable (Data Privacy Framework). |
| **Email en clair** | `contact.calculatrice@gmail.com` visible dans le HTML | Risque de spam. Adresse au nom du domaine et formulaire de contact. |
| **Sécurité du code** | ✅ Pas de faille trouvée : les paramètres d'URL partagés ne vont jamais dans `innerHTML` sans échappement ou validation par expression régulière, et l'historique est échappé (`esc()`). | — |
| **En-têtes de sécurité** | GitHub Pages n'en permet aucun (CSP, HSTS personnalisé, `X-Frame-Options`). | Optionnel : proxy Cloudflare pour les ajouter. Le risque est faible pour un site statique sans formulaire. |

---

## 9. Audit page par page

*Légende : T = longueur du titre, D = longueur de la meta description (en caractères), M = nombre approximatif de mots du contenu.*

### 9.1 Accueil — `/` (`index.html`)
**T 59 · D 155 · M 2 670 · H1** « Calculatrice de Durée et de Temps : Additionnez et Convertissez vos Heures »

- **SEO** ✅ WebApplication, FAQ (8 questions) et canonical corrects. ⚠️ Fil d'Ariane vers `#calculatrice` à supprimer. ⚠️ Les sections « convertir », « heures de travail », « additionner » et « jours ouvrés » doublonnent les pages dédiées (cannibalisation). ⚠️ H1 en Title Case et trop long sur mobile (4 lignes).
- **Contenu** ✅ Riche et juste. ❌ « cinq derniers calculs » (l. 767) contredit « relevé de 50 lignes » (l. 711) **sur la même page**. ⚠️ « aucune donnée collectée » en pied de page.
- **UX** ✅ Exemple affiché avec l'étiquette « Exemple », résultat au-dessus des champs. ⚠️ Sur mobile, le résultat n'est qu'à moitié visible (en-tête de 165 px et H1 de 4 lignes). ❌ Impression quasi vide. ⚠️ Touche M.
- **Actions** : corriger « cinq » ; H1 plus court (« Calculatrice de durée : additionnez et convertissez vos heures ») ; transformer les sections doublons en résumés avec lien ; retirer le BreadcrumbList.

### 9.2 Addition d'heures — `additionner-des-heures.html`
**T 58 · D 151 · M 2 235 · onglet 1**

- **SEO** ✅ Titre et H1 alignés sur « addition d'heures », FAQ de 6 questions, section « Calculette, calculatrice, additionneur » bien pensée pour les variantes de requête. ⚠️ 22 H2 et aucun H3 : structure très plate, à regrouper (par exemple « Méthodes » : 3 étapes, par les minutes, au-delà de 24 h).
- **Contenu** ✅ Excellent : le « piège du résultat négatif escamoté » est un vrai différenciateur. ❌ « la page suivante détaille » (l. 539) sans lien.
- **UX / a11y** ⚠️ Un tableau large non focalisable au clavier. ℹ️ `2h30 x 3` refusé dans la saisie rapide.
- **Actions** : lien vers `convertir-minutes-en-heures.html` ; regrouper les H2 ; tables focalisables.

### 9.3 Heures de travail — `calcul-heures-de-travail.html`
**T 60 · D 150 · M 1 571 · onglet 2**

- **SEO** ⚠️ La FAQ « De 8h à 17h, combien d'heures ? » cannibalise `combien-heures-entre-deux-horaires`. ✅ Bonne couverture de « heures supplémentaires », « heures complémentaires » et « 151,67 ».
- **Contenu** ✅ Règles françaises exactes (majorations 25 et 50 %, pause de 20 min après 6 h, plafonds 10/48/44 h, 11 h de repos, heures complémentaires). ⚠️ « Forfait 39 h » → « Contrat 39 h ». ⚠️ Aucun lien vers Légifrance ou service-public.fr.
- **UX** ⚠️ Contraste des pastilles actives en thème sombre. 💡 Le vrai besoin de cette audience est une **feuille d'heures hebdomadaire** (horaires différents chaque jour, pause par jour, total et heures sup), alors que l'onglet 2 suppose des journées identiques.
- **Actions** : retirer la FAQ en doublon ; sources officielles ; envisager l'outil « semaine type ».

### 9.4 Combien d'heures entre deux horaires — `combien-heures-entre-deux-horaires.html`
**T 53 · D 150 · M 1 301 · onglet 2**

- **SEO** ✅ Titre en forme de question (« De 8h à 17h Combien d'Heures ? ») : excellent pour l'intention. 💡 Déclinable : « de 9h à 17h », « de 7h à 19h »… existent en tableau, et chaque horaire courant pourrait devenir une ancre, voire une page.
- **Contenu** ✅ Juste (définition du travailleur de nuit comprise). ⚠️ La colonne « Décimal (amplitude) » est peu utile : c'est le **net** en décimal qu'on reporte sur une feuille d'heures. Ajouter « Décimal (pause 1 h) ».
- **UX** ⚠️ Contraste des pastilles en sombre ; 2 tableaux non focalisables.

### 9.5 Convertir minutes en heures — `convertir-minutes-en-heures.html`
**T 58 · D 149 · M 1 205 · onglet 1**

- **SEO** ✅ Table complète de 1 à 60 min : exactement ce que les gens recherchent. ⚠️ Page centrée sur les **heures décimales** ; les requêtes « 90 minutes en heures », « 150 min en heures » (h:min) et « heures en minutes » ne sont couvertes qu'indirectement.
- **Contenu** ✅ Exact (« 7,30 = 7 h 18 », « 4 h perdues sur 20 jours »).
- **UX** ❌ **Le calculateur de la page interprète `45` comme 45 heures.** C'est le point à corriger en priorité sur cette page.
- **Actions** : convertisseur dédié en tête de page ; ajouter une table « minutes > 60 → h:min » (75, 90, 120, 150, 180, 240 min) et une section sur l'opération inverse.

### 9.6 Multiplier / diviser — `multiplier-diviser-une-duree.html`
**T 55 · D 146 · M 1 282 · onglet 4**

- **Contenu** ✅ Méthode, tableaux et cas d'usage justes. ❌ « le fameux temps plein français » à propos de 37 h 30 (l. 559).
- **UX** ⚠️ Contraste du bouton « × Multiplier » en sombre. ✅ Division par 0 et virgule gérées.

### 9.7 Durée entre deux dates — `duree-entre-deux-dates.html`
**T 55 · D 153 · M 1 206 · onglet 3**

- **SEO** 💡 Page sous-exploitée par rapport au volume de recherche du sujet. Manquent les intentions voisines : **ajouter ou retirer X jours à une date**, **calcul d'âge**, **numéro de semaine**, **compte à rebours**. La page les évoque en texte, mais l'outil ne les fait pas.
- **Contenu** ✅ Juste (bissextiles, écart contre bornes incluses, méthode des poings, semaines ISO).
- **Actions** : ajouter un mode « date + N jours (calendaires ou ouvrés) », très demandé pour les délais de préavis et de rétractation.

### 9.8 Jours ouvrés — `calcul-jours-ouvres.html`
**T 53 · D 152 · M 1 366 · onglet 3**

- **SEO** ⚠️ Contient les tableaux complets des fériés français 2026 et 2027 et la FAQ « Combien de jours fériés en France ? » : concurrence directe avec `jours-feries-france`.
- **Contenu** ✅ Tableau ouvré / ouvrable / calendaire clair, comparatif des 5 pays exact (252 / 253 / 255 / 254 / 253). ✅ Alsace-Moselle et DOM signalés.
- **Actions** : remplacer les tableaux par un résumé et un lien ; afficher le nombre de fériés déduits dans le résultat.

### 9.9 Jours fériés France — `jours-feries-france.html`
**T 53 · D 152 · M 2 308 · onglet 3, pays FR**

- **SEO** ✅ Très complète : 2020-2027, « Cette date est-elle fériée ? », Alsace-Moselle, DOM, journée de solidarité, exports CSV et ICS. ⚠️ `lastmod` du sitemap antérieur à la création de la page. 💡 Ajouter les **ponts 2027** (forte demande en France) et 2028 d'ici décembre.
- **Contenu** ✅ Exact (L3133-1, 1er mai, moins de 18 ans, dates d'abolition de l'esclavage). ⚠️ Aucun lien vers Légifrance.
- **UX** ❌ Ctrl+P n'imprime aucun tableau. ⚠️ Bouton « ↑ Calculateur » affiché dès l'arrivée, par-dessus le texte.

### 9.10 Jours fériés Belgique — `jours-feries-belgique.html`
**T 58 · D 141 · M 2 409 · pays BE**

- **SEO** ⚠️ `lang="fr"` et `inLanguage: fr-FR` au lieu de `fr-BE`. ✅ Sujets de niche bien couverts (11 juillet, 27 septembre, 15 novembre, jour de remplacement, pécule).
- **Contenu** ✅ Exact (10 fériés, remplacement, affichage avant le 15/12, 20 jours de congés, pécule à 92 % et 15,38 %). 💡 Lien vers le SPF Emploi.
- **UX** ❌ Impression ; ⚠️ tableau large non focalisable au clavier.

### 9.11 Jours fériés Suisse — `jours-feries-suisse.html`
**T 55 · D 141 · M 2 326 · pays CH**

- **Contenu** ❌ **Vaud et Saint-Étienne** : Vaud a 9 jours, pas 10, et ne chôme pas le 26/12 (l. 653 et 683). ⚠️ Faire valider les totaux Neuchâtel, Valais, Fribourg et Jura. ✅ Article 20a LTr, 1er août payé, Jeûne genevois (10/09/2026, 09/09/2027) et Jeûne fédéral (21/09/2026, 20/09/2027) exacts.
- **Fraîcheur** ⚠️ « L'essentiel » met en avant des dates de septembre 2026 **déjà passées** (on est le 26/09). Rendre ce bloc dynamique ou afficher l'année suivante.
- **SEO** ⚠️ `lang` → `fr-CH`. 💡 Une page ou une section par canton romand (Genève, Vaud, Neuchâtel, Fribourg, Valais, Jura) viserait des requêtes précises à forte intention.

### 9.12 Jours fériés Luxembourg — `jours-feries-luxembourg.html`
**T 54 · D 142 · M 2 067 · pays LU**

- **Contenu** ✅ Exact (11 fériés, Journée de l'Europe depuis 2019, congé compensatoire sous 3 mois, 230 000 frontaliers). ⚠️ « L'essentiel » ne parle que du **dimanche** ; le texte plus bas compte aussi les samedis. Harmoniser.
- **SEO** ⚠️ `lang` → `fr-LU`. ✅ L'angle « frontaliers » est un excellent créneau.

### 9.13 Jours fériés Québec — `jours-feries-quebec.html`
**T 53 · D 151 · M 2 448 · pays QC**

- **Contenu** ❌ Lundi de Pâques « fédéral » (l. 682). ⚠️ FAQ : « Déduire » au lieu d'« Exclure », et nombre de fériés déduits promis mais non affiché. ✅ Article 58 LNT, indemnité de 1/20, 30 septembre, Patriotes et vocabulaire québécois exacts et bien ciblés.
- **SEO** ⚠️ `lang` → `fr-CA`. ✅ Le tableau de vocabulaire France / Québec est une excellente idée pour le ciblage.

### 9.14 Journée coupée France — `calcul-heures-journee-coupee.html`
**T 50 · D 149 · M 1 100 · calculateur dédié**

- **SEO** ✅ Calculateur spécifique, bandeau de pays. ⚠️ Pas de `hreflang` vers les 4 autres versions. 💡 Titre plus large : « Journée coupée : calcul des heures, amplitude et coupure (restauration) ».
- **Contenu** ✅ Juste (HCR à 39 h, L3131-1, 13 h d'amplitude par déduction). 💡 Citer les règles propres à la convention HCR sur les coupures (nombre maximal par jour, indemnités) avec un lien vers la convention.
- **a11y** ⚠️ Pas d'`aria-live` sur le verdict ; contraste du pays courant en sombre.

### 9.15 à 9.18 Journée coupée Belgique / Suisse / Luxembourg / Québec
**T 53 / 58 / 63 / 60 · D 150 / 148 / 150 / 152 · M ~1 000 chacune**

- ✅ Chaque page apporte **sa** règle, qui est aussi appliquée par le calculateur : prestation minimale de 3 h en Belgique (article 21 de la loi du 16 mars 1971), 14 h d'amplitude en Suisse (article 10 LTr), 10 h de travail effectif au Luxembourg, heures payées au Québec (article 58 LNT). C'est rare et précieux.
- ❌ **Luxembourg** : L.211-26 → **L.211-12** (page et `script.js`). Le titre Luxembourg (63 caractères) risque d'être tronqué.
- ⚠️ 27 à 40 % de texte commun avec la page française : enrichir la partie propre à chaque pays (convention CP 302 en Belgique, CCNT en Suisse, convention HORESCA au Luxembourg, décrets au Québec).
- ⚠️ Pas de `hreflang` ; contraste du pays courant et des pastilles en sombre.

### 9.19 Nouveautés — `nouveautes.html`
**T 42 · D 142 · M 622**

- ✅ Bon signal de fraîcheur et de transparence.
- ⚠️ « Accessibilité portée à 100/100 » : vrai en thème clair seulement. ⚠️ Pas d'Open Graph, pas de `script.js`.
- 💡 Un flux RSS de cette page permettrait aux curieux de s'abonner, et donne un signal de fraîcheur supplémentaire.

### 9.20 Mentions légales — `mentions-legales.html`
**T 59 · D 123 · M 447**

- ❌ Décrit AdSense et un bandeau de consentement **inexistants** ; « cinq derniers calculs » ; téléphone de l'hébergeur absent ; anonymat LCEN fragile en cas de monétisation (voir [§8](#8-conformité-légale-et-sécurité)).
- ⚠️ La description parle de « cookies publicitaires » alors qu'il n'y en a pas aujourd'hui.
- 💡 `noindex` possible (aucune valeur en recherche), ou au minimum garder la priorité basse dans le sitemap.

---

## 10. Pistes d'amélioration

### 🟥 Cette semaine : corrections (≈ 1 journée au total)

| # | Action | Fichiers | Effort |
|---|---|---|---|
| 1 | Corriger les **4 erreurs factuelles** et les **5 incohérences** du [§5](#5-audit-contenu) | suisse, quebec, journee-coupee-luxembourg, `script.js`, multiplier, index, additionner, calcul-heures-de-travail | 45 min |
| 2 | **Réécrire la politique de confidentialité** selon l'état réel (pas de pub, pas de bandeau, 50 lignes d'historique, les 4 clés `localStorage`, téléphone de l'hébergeur) | `mentions-legales.html` | 45 min |
| 3 | **Réparer l'impression** : règles d'impression limitées à une classe posée par le bouton « Imprimer / PDF » | `style.css`, `script.js` | 1 h |
| 4 | **Contraste en thème sombre** : jeton `--on-brand` (`#2563eb`) pour les fonds sous texte blanc | `style.css` | 15 min |
| 5 | **Tableaux focalisables** (`tabindex="0" role="region"`) | 11 pages | 30 min |
| 6 | **Touche M** : bouton « Annuler » dans le message de remise à zéro, et raccourcis actifs seulement dans le calculateur | `script.js` | 30 min |
| 7 | **Bouton « Calculateur »** : flèche dans le bon sens, affiché seulement quand c'est utile, `visibility:hidden` quand il est masqué | `script.js`, `style.css` | 20 min |
| 8 | **`ads.txt`** : retirer la ligne factice | `ads.txt` | 2 min |
| 9 | **Page 404** personnalisée | nouvelle `404.html` | 30 min |
| 10 | **Sitemap généré** automatiquement avec les dates git | `deploy-pages.yml` | 30 min |

### 🟧 Ce mois-ci : SEO et crédibilité

1. **Sources officielles liées** sur chaque règle de droit citée, plus une date « Règles vérifiées le … ». C'est le levier E-E-A-T n°1.
2. **Page « À propos et méthode »** et adresse de contact au nom du domaine. L'ajouter au pied de page et au schéma `Organization`.
3. **Images Open Graph** (5 ou 6 visuels 1200×630) et `twitter:card=summary_large_image`.
4. **Langue** : `lang` et `inLanguage` alignés sur le pays (pages fériés BE, CH, LU, QC). **`hreflang`** entre les 5 pages journée coupée.
5. **Schéma** : `Organization` et `publisher`, `dateModified` et date visible ; retirer le fil d'Ariane de l'accueil.
6. **Réduire la cannibalisation** : sections de l'accueil résumées avec lien ; FAQ « 8h-17h » retirée de `calcul-heures-de-travail` ; tableaux fériés remplacés par un lien dans `calcul-jours-ouvres`.
7. **Convertisseur minutes ↔ heures dédié** sur `convertir-minutes-en-heures.html`, et table des minutes au-delà de 60.
8. **En-tête mobile compact** et H1 plus court : le résultat doit être entièrement visible sans défiler à 360×700.
9. **Afficher « N fériés déduits »** dans le résultat de l'onglet 3.
10. **Tests automatiques** : le code mentionne un `test-feries.js` absent du dépôt. Ajouter en CI un test qui compare les tableaux HTML au moteur de calcul, et un test de régression sur les calculs cités dans les textes.
11. **Minification** CSS et JS dans le workflow (optionnel, −11 Ko).

### 🟨 D'ici décembre : saisonnalité

- Ajouter **2028** aux 5 pages fériés et passer les titres à « 2027 et 2028 » avant le pic de recherche de fin d'année.
- Section **« Ponts 2027 »** sur `jours-feries-france.html` (requête très recherchée en France).
- Rendre dynamiques les dates mises en avant dans « L'essentiel » de la page Suisse.

### 🟩 À 3 mois : croissance (nouveaux contenus classés par intention de recherche)

Idées qui prolongent naturellement le site (même audience, même moteur de calcul). Les volumes sont des estimations d'ordre de grandeur, à confirmer dans Search Console ou avec un outil de mots-clés.

| Idée | Intention visée | Pourquoi ce site est légitime |
|---|---|---|
| **Heure de fin de journée** (« j'arrive à 8h45, je fais 7h30 avec 45 min de pause : à quelle heure je pars ? ») | Très forte, quotidienne | Le moteur sait déjà additionner des durées ; il manque « heure + durée = heure ». |
| **Feuille d'heures hebdomadaire** (7 jours, horaires différents, pauses, heures sup, export CSV et PDF) | Très forte chez les salariés et intérimaires | Le relevé, l'export CSV et l'impression existent déjà. |
| **Ajouter ou retirer des jours à une date** (calendaires ou ouvrés) | Forte (délais, préavis, rétractation) | Le moteur des fériés existe déjà. |
| **Calcul des heures supplémentaires** (montant majoré) en FR, BE, CH et QC | Forte | Les règles sont déjà rédigées sur les pages. |
| **Numéro de semaine 2026 / 2027** | Forte et récurrente | La page dates parle déjà des semaines ISO. |
| **Calcul d'âge exact** | Forte | La décomposition années/mois/jours existe déjà (onglet 3). |
| **Jours fériés par canton suisse** (6 pages romandes) | Moyenne, très ciblée | Le socle et les particularités sont déjà rédigés. |
| **Calcul des congés payés** (ouvrés et ouvrables, FR et BE) | Forte | Les notions d'ouvré et d'ouvrable sont déjà expliquées. |

**Autres leviers :**
- **Widget intégrable** (iframe « Calculatrice d'heures ») à proposer aux blogs RH et aux sites syndicaux : une source naturelle de liens entrants.
- **Search Console** : après 4 à 8 semaines, repérer les pages en position 5 à 15 avec un CTR faible, et réécrire leurs titres en priorité.
- **AdSense** : ne l'activer qu'après la mise en place d'une CMP certifiée TCF, avec 2 ou 3 emplacements, puis mesurer l'effet sur les Signaux Web essentiels (voir [§4](#4-audit-performance)).

---

## 11. Annexes

### Annexe A : Lighthouse page par page

Toutes les pages obtiennent **100 / 100 / 100 / 100** (Performance, Accessibilité, Bonnes pratiques, SEO) en mobile **et** en bureau. La balise Cloudflare était bloquée pendant le test, mais son effet réel est négligeable (petit script module asynchrone de quelques Ko).

| Page | Poids transféré | LCP mobile | LCP bureau | CLS |
|---|---|---|---|---|
| index | 45,6 Ko | 1,53 s | 0,43 s | 0 |
| additionner-des-heures | 43,4 Ko | 1,38 s | 0,39 s | 0 |
| calcul-heures-de-travail | 41,3 Ko | 1,38 s | 0,39 s | 0 |
| calcul-heures-journee-coupee | 37,9 Ko | 1,38 s | 0,39 s | 0 |
| calcul-jours-ouvres | 40,9 Ko | 1,38 s | 0,39 s | 0 |
| combien-heures-entre-deux-horaires | 40,2 Ko | 1,38 s | 0,39 s | 0 |
| convertir-minutes-en-heures | 40,1 Ko | 1,38 s | 0,39 s | 0 |
| duree-entre-deux-dates | 40,2 Ko | 1,38 s | 0,39 s | 0 |
| journee-coupee-belgique / luxembourg / quebec / suisse | 37,4 à 37,5 Ko | 1,38 s | 0,39 s | 0 |
| jours-feries-belgique / france / luxembourg / quebec / suisse | 42,1 à 43,2 Ko | 1,38 s | 0,39 à 0,40 s | 0 |
| mentions-legales | 15,9 Ko | 1,38 s | 0,39 s | 0 |
| multiplier-diviser-une-duree | 40,1 Ko | 1,38 s | 0,39 s | 0 (0,004 en bureau) |
| nouveautes | 15,5 Ko | 1,38 s | 0,39 s | 0 |

### Annexe B : vérifications juridiques en ligne

- Vaud : jours fériés officiels, dont le 26 décembre réservé à l'administration cantonale. Sources : [État de Vaud, jours fériés 2026](https://www.vd.ch/formation/jours-feries-et-vacances-scolaires/jours-feries-et-vacances-scolaires-2026) et [mesinfos.ch](https://www.mesinfos.ch/en/public-holidays/vaud).
- Luxembourg : maximum de 10 h par jour et 48 h par semaine selon l'article L.211-12. Sources : [CSL, La durée du travail du salarié](https://www.csl.lu/app/uploads/2020/02/la-duree-du-travail-du-salarie-francais.pdf) et [pixie.lu](https://www.pixie.lu/corpus/rh/17-0003/quelle-est-la-duree-maximale-de-travail-autorisee-par-jour-au-luxembourg/).
- Luxembourg : repos de 11 h et pause au-delà de 6 h selon l'article L.211-16 (correctement cité sur le site). Source : [ITM, repos journalier](https://itm.public.lu/fr/questions-reponses/droit-travail/duree-travail/b/b1.html).
- Canada : les 10 jours fériés du Code canadien du travail n'incluent pas le lundi de Pâques. Source : [Canada.ca, congés et jours fériés (employeurs fédéraux)](https://www.canada.ca/en/services/jobs/workplace/federal-labour-standards/vacations-holidays.html).

### Annexe C : reproduire l'audit

Tous les tests ont tourné en local sur une copie de `docs/` servie avec gzip et un cache de 600 s (comme GitHub Pages) : Lighthouse 13.5 (préréglages mobile et bureau), axe-core (WCAG 2.2 AA et bonnes pratiques, thèmes clair et sombre), Playwright avec Chromium, html-validate. Pour rejouer l'audit Lighthouse sur le site en production : `npx lighthouse https://calculatrice-duree.fr/ --view`.
