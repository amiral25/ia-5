# 🚀 Guide ultra-débutant : mettre le site en ligne et gagner de l'argent avec

> Vous n'avez **jamais** fait ça ? Parfait. Suivez les étapes dans l'ordre, sans en sauter.
> Comptez **30 minutes** pour la mise en ligne, puis **1 à 3 semaines d'attente** pour la publicité.

---

## 📦 Étape 0 — Ce que vous avez

Tous les fichiers du site sont dans le dossier **`docs/`** :

| Fichier | À quoi il sert | Y toucher ? |
|---|---|---|
| `index.html` | La page du site (le texte, la structure) | Oui, un peu (étape 3) |
| `style.css` | Les couleurs, les formes, le design | Non |
| `script.js` | Les calculs de la calculatrice | Non |
| `mentions-legales.html` | Page obligatoire en France + exigée par Google | **Oui, à remplir** |
| `robots.txt` | Dit à Google « tu peux visiter » | Oui, 1 ligne |
| `sitemap.xml` | La carte du site pour Google | Oui, 2 lignes |
| `ads.txt` | Prouve que les pubs vous appartiennent | Oui, plus tard |
| `favicon.svg` | La petite icône dans l'onglet du navigateur | Non |
| `.nojekyll` | Fichier technique pour GitHub | Non |

### Voir le site tout de suite, sans rien installer
Ouvrez le dossier `docs` sur votre ordinateur et **double-cliquez sur `index.html`**.
Le site s'ouvre dans votre navigateur. Tout fonctionne déjà (calculs, thème sombre, historique).
👉 C'est exactement ce que verront vos visiteurs.

---

## 🌍 Étape 1 — Mettre le site en ligne (choisissez UNE méthode)

### ⭐ Méthode A — Netlify (la plus simple : 2 minutes, gratuit, aucune ligne de commande)

1. Sur votre ordinateur, repérez le dossier **`docs`**.
2. Allez sur **https://app.netlify.com/drop**
3. **Glissez-déposez le dossier `docs` entier** dans le grand rectangle de la page.
4. Attendez 20 secondes. Netlify affiche une adresse du type
   `https://joyeux-calcul-a1b2c3.netlify.app` → **votre site est en ligne, tout de suite.**
5. Créez un compte gratuit (bouton *Sign up*) pour **conserver** le site, sinon il expire.
6. Pour changer l'adresse : *Site configuration → Change site name* → mettez par exemple `calculatrice-duree`.

> Pour mettre le site à jour plus tard : re-glissez le dossier `docs` dans
> *Deploys → Drag and drop your site folder here*. C'est tout.

---

### Méthode B — GitHub Pages (déjà en place ✅)

Le site est publié automatiquement sur la branche **`gh-pages`** par le workflow
`.github/workflows/deploy-pages.yml`, à chaque modification du dossier `docs/`.

**Adresse définitive : https://calculatrice-duree.fr**

Le fichier `docs/CNAME` contient le domaine : c'est lui qui dit à GitHub quel nom accepter.
**Ne le supprimez jamais**, sinon le domaine cesse de fonctionner à la publication suivante.

Pour suivre une mise en ligne : onglet **Actions** → *Publier le site (GitHub Pages)*.

---

### Méthode C — Hébergeur classique + FTP (si vous avez déjà un hébergement)

1. Installez **FileZilla** (gratuit, https://filezilla-project.org).
2. Connectez-vous avec les identifiants FTP fournis par votre hébergeur (hôte, identifiant, mot de passe).
3. À droite, ouvrez le dossier `www` (ou `public_html`).
4. Glissez-y **le contenu** du dossier `docs` (les fichiers eux-mêmes, **pas** le dossier `docs`).
5. Le site est en ligne sur votre domaine.

---

## 🏷️ Étape 2 — Le nom de domaine (fait ✅)

Domaine : **calculatrice-duree.fr**, acheté chez OVHcloud.

### Configuration DNS chez OVH (zone DNS du domaine)

| Type | Sous-domaine | Cible |
|---|---|---|
| A | *(vide ou `@`)* | `185.199.108.153` |
| A | *(vide ou `@`)* | `185.199.109.153` |
| A | *(vide ou `@`)* | `185.199.110.153` |
| A | *(vide ou `@`)* | `185.199.111.153` |
| CNAME | `www` | `amiral25.github.io.` *(point final compris)* |

> ⚠️ **Si OVH refuse le CNAME `www`** : c'est qu'une entrée `www` existe déjà (OVH en crée une
> vers sa page de parking à l'achat). Une règle DNS interdit à un CNAME de cohabiter avec un autre
> enregistrement du même nom. Supprimez d'abord les lignes `www` de type A et AAAA, puis réessayez.

### Côté GitHub

*Settings → Pages → Custom domain* → `calculatrice-duree.fr` → **Save**,
puis cochez **Enforce HTTPS** dès que la case devient cliquable (jusqu'à 24 h le temps que le
certificat se génère).

⏱️ La propagation DNS prend de 15 minutes à 24 h. C'est normal que le domaine ne réponde pas
immédiatement.

---

## ✏️ Étape 3 — Adresse dans les fichiers (fait ✅)

`calculatrice-duree.fr` est déjà renseigné partout : balise canonique, Open Graph, données
structurées JSON-LD, `robots.txt`, `sitemap.xml`, et le fichier `docs/CNAME`.

La page `mentions-legales.html` est remplie en **version A** (éditeur non professionnel : ni nom
ni adresse à publier, conformément à la LCEN art. 6-III-2), avec l'e-mail de contact et
l'hébergeur. **Basculez sur la version B** — nom, adresse, téléphone, SIRET — le jour où vous
activez AdSense : un site monétisé n'est plus un site non professionnel. Les deux versions sont
dans le fichier, la marche à suivre est en commentaire tout en haut.

---

## 🔎 Étape 4 — Déclarer le site à Google (indispensable pour être trouvé)

1. Allez sur **https://search.google.com/search-console** et connectez-vous avec un compte Google.
2. *Ajouter une propriété* → choisissez la case de droite **« Préfixe de l'URL »** → tapez `https://calculatrice-duree.fr`
3. Google demande de prouver que le site est à vous. La méthode la plus simple : **Balise HTML**.
   Google vous donne une ligne du type
   `<meta name="google-site-verification" content="AbC123..." />`
   → copiez-la, ouvrez `index.html`, et collez-la juste **en dessous** de la ligne `<meta charset="utf-8">`.
   Republiez le site, puis cliquez sur **Vérifier**.
4. Une fois vérifié : menu de gauche → **Sitemaps** → tapez `sitemap.xml` → **Envoyer**.
5. Menu **Inspection d'URL** → collez `https://calculatrice-duree.fr` → **Demander une indexation**.

⏳ Google met **quelques jours à quelques semaines** pour vous faire apparaître dans les résultats.
C'est normal, il n'y a rien à forcer.

---

## 📊 Étape 4 bis — Voir combien de personnes visitent le site (fait ✅)

La mesure d'audience est assurée par **Cloudflare Web Analytics**, déjà installé sur les deux pages.

**Voir les statistiques :** https://dash.cloudflare.com → *Analytics & Logs* → **Web Analytics**

Vous y trouverez le nombre de visites, les pages vues, les pays, les types d'appareils et les sites
qui vous envoient du trafic.

Pourquoi cet outil plutôt que Google Analytics&nbsp;:
- **gratuit et illimité**, sans carte bancaire&nbsp;;
- **aucun cookie**, donc **aucun bandeau de consentement** à afficher et aucun risque CNIL —
  Google Analytics, lui, dépose des cookies et a déjà valu des sanctions à des sites français&nbsp;;
- script minuscule et non bloquant (`type="module"`), il ne dégrade pas les performances.
  Google Analytics pèse ~50 Ko.

⏳ Les premières statistiques apparaissent au bout de quelques minutes. Un site neuf affiche
**0 visiteur pendant des jours, voire des semaines** — c'est normal, le temps que Google l'indexe.

> Le token est inscrit en clair dans `index.html` et `mentions-legales.html`. Ce n'est pas un secret&nbsp;:
> il identifie le site, il ne donne accès à rien.

---

## 🧭 Étape 4 ter — Les pages satellites (fait ✅)

Le site compte désormais **12 pages de contenu** au lieu d'une. Chacune vise une recherche précise,
bien moins concurrentielle que « calculatrice de durée », et ouvre directement le bon onglet du
calculateur&nbsp;:

| Page | Recherche ciblée | Onglet ouvert |
|---|---|---|
| `index.html` | calculatrice de durée | Addition |
| `convertir-minutes-en-heures.html` | convertir minutes en heures / centièmes | Addition |
| `additionner-des-heures.html` | additionner des heures | Addition |
| `calcul-heures-de-travail.html` | calcul heures de travail | Entre 2 heures |
| `calcul-jours-ouvres.html` | jours ouvrés entre 2 dates | Entre 2 dates |
| `duree-entre-deux-dates.html` | durée entre deux dates | Entre 2 dates |
| `combien-heures-entre-deux-horaires.html` | de 8h à 17h combien d'heures | Entre 2 heures |
| `multiplier-diviser-une-duree.html` | multiplier / diviser une durée | Multiplier / Diviser |
| `jours-feries-belgique.html` | jours fériés Belgique | Entre 2 dates (Belgique) |
| `jours-feries-suisse.html` | jours fériés Suisse | Entre 2 dates (Suisse) |
| `jours-feries-luxembourg.html` | jours fériés Luxembourg | Entre 2 dates (Luxembourg) |
| `jours-feries-quebec.html` | jours fériés Québec | Entre 2 dates (Québec) |

Toutes sont reliées entre elles par un bloc « Les autres calculateurs du site » et un fil d'Ariane
(**maillage interne**), et sont déclarées dans `sitemap.xml`.

### Ce qu'il vous reste à faire dans Search Console

1. **Sitemaps** → supprimez `sitemap.xml` puis re-soumettez-le, pour que Google relise les 7 URLs.
2. **Inspection d'URL** → demandez l'indexation de chaque nouvelle page, une par une. C'est plus
   rapide que d'attendre que Google les découvre seul.

### Pour aller plus loin plus tard

D'autres recherches restent à couvrir&nbsp;: `calcul-anciennete`, `convertir-heures-en-minutes`,
`calcul-temps-de-trajet`, `nombre-de-jours-dans-le-mois`. Le principe est toujours le même&nbsp;:
une page = une recherche = un contenu unique.

---

## 🎯 Étape 4 quater — Titres calés sur les vraies recherches (fait ✅)

Une étude de mots-clés (HaloScan) a montré deux écarts entre ce que le site disait et ce que les
gens tapent réellement.

**1. Le mot « temps » pèse plus lourd que « durée »** — « calcul temps » 8 250 recherches/mois,
« calculatrice temps » 3 273, « calculatrice de temps » 2 182, contre 1 900 pour « calculatrice de
durée ». Le mot est désormais présent dans le titre et l'accroche de la page d'accueil.

**2. Les gens tapent « calculatrice », le site écrivait « calcul ».** Les titres ont été réécrits
avec les expressions exactes&nbsp;:

| Page | Nouveau titre | Recherches/mois visées |
|---|---|---|
| `index.html` | Calculatrice de Durée et de Temps – Calcul d'Heures Gratuit | 1 900 + 2 182 |
| `calcul-heures-de-travail.html` | Calculatrice d'Heure de Travail – Calcul du Temps de Travail | 2 200 + 2 100 |
| `additionner-des-heures.html` | Addition d'Heures – Additionner Heures et Minutes en Ligne | 1 900 + 480 |
| `duree-entre-deux-dates.html` | Calcul Durée entre Deux Dates – Jours, Semaines et Mois | 1 500 + 320 |

**3. Les « questions liées » de Google sont devenues des entrées FAQ** (avec le balisage
`FAQPage` correspondant, condition pour apparaître dans « Autres questions posées »)&nbsp;:
« De 8h à 17h, combien d'heures&nbsp;? », « Comment faire une soustraction de durée&nbsp;? »,
« Comment calculer le nombre d'heures travaillées par mois&nbsp;? », et cinq autres.

> ⚠️ Les volumes annoncés par ces outils sont des **estimations**. « calcul temps » (8 250) mélange
> des intentions très différentes — temps de trajet, de cuisson, de travail — d'où le choix de ne pas
> construire une page entière dessus.

---

## ✖️ Étape 4 quinquies — Multiplier / diviser une durée + 2 pages (fait ✅)

C'était le dernier manque relevé par l'étude de mots-clés. Trois choses ont été ajoutées.

### 1. Un 4ᵉ onglet dans le calculateur : « Multiplier / Diviser »

Il répond à des questions que le site ne savait pas traiter&nbsp;:

- **× (multiplier)** — « 3 séances de 2h30, ça fait combien&nbsp;? » → `2h30 × 3 = 7h 30min`
- **÷ (diviser)** — « je dois répartir 10h sur 4 jours » → `10h ÷ 4 = 2h 30min`

Le nombre accepte **la virgule française** (`2,5`) comme le point (`2.5`) — un champ classique
« nombre » refuse la virgule, ce qui aurait bloqué la majorité des visiteurs français.

> Sur mobile les onglets passent automatiquement sur **2 lignes de 2**, ils restent lisibles
> et rien ne déborde. Vérifié de 320&nbsp;px à 1440&nbsp;px de large.

### 2. Deux nouvelles pages

| Page | Recherche ciblée | Ce qu'elle contient en plus |
|---|---|---|
| `combien-heures-entre-deux-horaires.html` | « de 8h à 17h combien d'heure », « calcul durée entre deux heures » (480/mois) | Un tableau de 12 horaires courants (8h-17h, 9h-18h…) avec amplitude, pause 45 min, pause 1 h et heures décimales |
| `multiplier-diviser-une-duree.html` | « multiplier une durée », « diviser des heures » | Une table de multiplication de durées prête à lire |

Ces tableaux sont **calculés par le générateur**, pas tapés à la main&nbsp;: aucun risque d'erreur
de calcul, et ce sont exactement le genre de réponses immédiates que Google met en avant.

### 3. Contrôles automatiques

Le site est vérifié par deux séries de tests avant chaque mise en ligne&nbsp;:
**287 contrôles** au total (calculs justes, titres uniques, FAQ cohérente avec son balisage,
aucun lien mort, aucune barre de défilement horizontale, **CLS = 0** sur les 9 pages).
Tous au vert.

### Ce qu'il vous reste à faire dans Search Console

Demandez l'indexation des deux nouvelles adresses (menu **Inspection d'URL**, collez l'adresse,
puis **Demander une indexation**)&nbsp;:

```
https://calculatrice-duree.fr/combien-heures-entre-deux-horaires.html
https://calculatrice-duree.fr/multiplier-diviser-une-duree.html
```

---

## 🌍 Étape 4 sexies — Toute la francophonie, pas seulement la France (fait ✅)

Jusqu'ici le calculateur ne connaissait qu'un seul calendrier&nbsp;: le français. Un visiteur belge,
suisse, luxembourgeois ou québécois obtenait donc un **résultat faux** sans le savoir. C'est corrigé.

### Un menu « Jours fériés du pays »

Dans l'onglet « Entre 2 dates », un menu déroulant permet de choisir&nbsp;:

| Pays | Jours fériés | Jours ouvrés en 2026 |
|---|---|---|
| France métropolitaine | 11 | 252 |
| Belgique | 10 | 253 |
| Suisse (socle romand) | 7 | 255 |
| Luxembourg | 11 | 254 |
| Québec | 8 | 253 |

Le pays choisi est **mémorisé** dans le navigateur&nbsp;: un visiteur belge ne le resélectionne pas à
chaque visite. Les dates mobiles sont recalculées pays par pays — le Vendredi saint en Suisse et au
Québec, la Journée des patriotes québécoise (le lundi précédant le 25 mai), l'Action de grâce
(2ᵉ lundi d'octobre), qui n'existent pas dans le calendrier français.

### Quatre nouvelles pages

Chacune a un contenu **réellement différent**, pas un simple copier-coller avec le nom du pays changé
(Google sanctionne les pages jumelles)&nbsp;:

| Page | Ce qu'elle apporte de spécifique |
|---|---|
| `jours-feries-belgique.html` | La règle du **jour de remplacement** : en Belgique un férié tombant un dimanche n'est pas perdu, il doit être remplacé. Et le fait que le 11 juillet n'est pas férié dans le privé. |
| `jours-feries-suisse.html` | Un seul jour est **fédéral** (le 1ᵉʳ août), tout le reste est cantonal. Tableau des ajouts par canton romand, et le fait que férié ≠ payé. |
| `jours-feries-luxembourg.html` | Le cas des **frontaliers** : on suit les fériés du pays où l'on travaille, pas de son domicile. Un frontalier français travaille le 14 juillet. |
| `jours-feries-quebec.html` | Les 8 congés de la **Loi sur les normes du travail**, la différence fériés provinciaux / fédéraux, l'indemnité au 1/20ᵉ. |

### Pourquoi ça compte pour le référencement

« jours fériés belgique 2026 », « jours fériés luxembourg », « jours fériés québec » sont des
recherches à **fort volume et faible concurrence francophone** — beaucoup moins disputées que
« calculatrice de durée ». Et le Luxembourg comme la Suisse ont un revenu publicitaire par visiteur
sensiblement supérieur à la France, ce qui compte le jour où AdSense sera activé.

### Contrôles

**390 contrôles automatiques** au vert, dont une série entière sur les cinq calendriers&nbsp;: chaque
année civile complète est recomptée pays par pays, et une quinzaine de dates piège sont vérifiées une
par une (le 14 juillet férié en France mais travaillé en Belgique, le 21 juillet l'inverse, le
9 mai luxembourgeois, l'Action de grâce recalculée en 2026 **et** en 2027…).

### Ce qu'il vous reste à faire dans Search Console

Demandez l'indexation des quatre nouvelles adresses&nbsp;:

```
https://calculatrice-duree.fr/jours-feries-belgique.html
https://calculatrice-duree.fr/jours-feries-suisse.html
https://calculatrice-duree.fr/jours-feries-luxembourg.html
https://calculatrice-duree.fr/jours-feries-quebec.html
```

Puis re-soumettez `sitemap.xml`, qui compte désormais **13 adresses**.

> 💡 Dans Search Console, l'onglet **PAYS** devient maintenant intéressant à surveiller. Si la
> Belgique ou la Suisse décollent, ce sera le signe qu'il faut pousser plus loin dans cette
> direction.

### Pistes restantes

`calcul-anciennete`, `convertir-heures-en-minutes`, `calcul-temps-de-trajet`,
`nombre-de-jours-dans-le-mois`, et une page « jours fériés Alsace-Moselle » (2 fériés de plus).
Toujours le même principe&nbsp;: une page = une recherche.

---

## 💰 Étape 5 — Activer la publicité Google AdSense (l'argent)

### 5.1 Avant de candidater — les conditions à respecter
Google refuse la plupart des sites vides. Vous partez avec un avantage : ce site a déjà 1 200 mots de
contenu utile, un outil qui fonctionne, et une page de mentions légales. Vérifiez juste que :
- ✅ le site est en ligne sur **votre nom de domaine** (pas une adresse `.netlify.app` temporaire) ;
- ✅ la page **mentions légales est remplie** — passez à la **version B** du fichier (nom, adresse, SIRET), car un site monétisé n'est plus un site non professionnel ;
- ✅ vous avez **18 ans** et un **compte bancaire** à votre nom (ou celui d'un parent, avec son accord) ;
- ✅ le site est en ligne depuis **au moins quelques jours** et reçoit quelques visites.

### 5.2 Créer le compte
1. Allez sur **https://adsense.google.com** → *Commencer*.
2. Renseignez : l'URL de votre site, votre pays (France), acceptez les conditions.
3. Renseignez votre adresse postale exacte (elle servira à recevoir un code PIN par courrier). ⚠️ Cette adresse-là reste **privée** : elle est stockée dans votre compte Google et n'apparaît **jamais** sur le site. À ne pas confondre avec l'adresse des mentions légales.
4. AdSense affiche alors **un code à mettre sur le site** pour vérifier que vous en êtes propriétaire.

### 5.3 Coller le code de vérification
Ouvrez **`docs/index.html`**. Vers la **ligne 35** (cherchez `GOOGLE ADSENSE`), vous trouverez ce bloc **déjà préparé** :

```html
<!-- ============================================================
     GOOGLE ADSENSE — décommentez ces 2 lignes après validation
     et remplacez ca-pub-XXXXXXXXXXXXXXXX par votre identifiant.
     ============================================================
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>
-->
```

Faites deux choses :
1. **Supprimez** la ligne `<!-- ====...` du haut (et les 3 lignes de commentaire) **et** la ligne `-->` du bas.
   Il ne doit rester **que** la ligne `<script async src=...>`.
2. Remplacez `ca-pub-XXXXXXXXXXXXXXXX` par **votre identifiant**, que AdSense affiche à l'écran
   (il ressemble à `ca-pub-1234567890123456`).

Le même bloc commenté existe dans `mentions-legales.html` (ligne 14) si vous voulez des pubs aussi sur cette page — c'est facultatif.

Republiez le site, puis cliquez sur **« J'ai placé le code »** dans AdSense.

### 5.4 Le fichier `ads.txt` (ne l'oubliez pas, sinon vous perdez de l'argent)
Ouvrez `docs/ads.txt`, remplacez `pub-XXXXXXXXXXXXXXXX` par votre identifiant
(⚠️ ici **sans** le `ca-` du début, juste `pub-1234567890123456`). Republiez.

### 5.5 Attendre la validation
Google examine le site : **de 24 h à 3 semaines**. Vous recevez un e-mail.
Si c'est refusé, l'e-mail indique la raison (le plus souvent « contenu insuffisant » →
ajoutez 2 ou 3 pages d'articles, puis recandidatez). **On peut recandidater autant de fois qu'on veut.**

### 5.6 Créer les 2 blocs de pub et les coller au bon endroit
Une fois accepté : AdSense → **Annonces → Par unité d'annonce**.

**Bloc n°1 — la bannière du haut**
- Cliquez sur **Display ads** (Annonces display) → nommez-la `Banniere-haut` → format **Horizontal** → *Créer*.
- Google vous donne un code. Copiez-le.
- Dans `index.html`, cherchez `COLLEZ ICI VOTRE BLOC ADSENSE « Bannière »`. Un modèle commenté est déjà là :
  remplacez tout le bloc entre `<!-- ▼▼` et `▲▲ -->` par votre code, et **supprimez** la ligne
  `<span class="ad-ph">Emplacement publicitaire</span>` juste en dessous.

**Bloc n°2 — le pavé de droite**
- Créez une deuxième unité `Pave-300x250` → **Display ads** → format **Rectangle** (300×250) → *Créer*.
- Dans `index.html`, cherchez `COLLEZ ICI VOTRE BLOC ADSENSE « Rectangle 300×250 »` et faites pareil.

Republiez. Les vraies annonces apparaissent au bout de **quelques heures à 48 h** (au début, des cases blanches : c'est normal).

> 🔒 Les emplacements ont une **hauteur déjà réservée** en CSS (90/100 px et 300×250).
> Résultat : quand la pub se charge, **rien ne bouge** sur la page. C'est ce que Google mesure sous le nom de
> « CLS », et c'est un critère de classement. Ne modifiez pas ces tailles au hasard.

### 5.7 Le bandeau de consentement aux cookies (obligatoire en Europe)
Sans lui, vos revenus européens sont bloqués par Google et vous êtes hors-la-loi (RGPD).
Bonne nouvelle : Google le fournit gratuitement.
👉 AdSense → **Confidentialité et messagerie → Réglementation européenne → Créer un message** →
choisissez « Consentement », activez-le sur votre site, **Publier**. Rien à coder.

### 5.8 Être payé
- Dès **10 €** gagnés : Google envoie un **code PIN par courrier postal** (2 à 4 semaines). À saisir dans votre compte.
- Renseignez votre **RIB** dans *Paiements → Ajouter un mode de paiement*.
- Le versement part automatiquement quand vous atteignez **70 €**, autour du **21 du mois suivant**.

### 5.9 Faut-il créer une société ? (non)
Pour **ouvrir** le compte, non : Google accepte les comptes « particulier », sans SIRET, avec votre RIB personnel.

Le critère légal n'est pas le montant mais le **caractère habituel** de l'activité :
- quelques euros une seule fois → à déclarer en revenus non professionnels (formulaire 2042-C-PRO) ;
- un revenu qui tombe **tous les mois**, même 30 € → créez une **micro-entreprise**.

La micro-entreprise n'est **pas** une société : pas de capital, pas de statuts, pas de comptable.
Création **gratuite** en ~20 minutes sur **formalites.entreprises.gouv.fr** (le guichet officiel — méfiez-vous
des sites qui facturent 50-100 € pour la même démarche). Activité : *exploitation de site internet, régie
publicitaire* (BIC, prestations de services).

Ce que cela implique : environ **21-22 % de cotisations** sur le chiffre d'affaires encaissé (taux à vérifier
sur urssaf.fr), une déclaration mensuelle ou trimestrielle **même à 0 €**, l'**ACRE** (−50 % la 1ʳᵉ année) à
demander à la création, et la CFE exonérée la 1ʳᵉ année. Piège peu connu : Google vous paie depuis **Google
Ireland**, ce qui impose normalement un **numéro de TVA intracommunautaire** et une **DES** — demandez
confirmation à votre service des impôts des entreprises.

Une vraie société (SASU, EURL) ne devient intéressante qu'au-delà de **~2 000-3 000 €/mois** : en dessous,
le comptable coûte plus cher que le gain. *(Information générale, pas un conseil juridique.)*

### 🚫 Les 4 interdits qui font bannir un compte (définitivement)
1. **Ne cliquez JAMAIS sur vos propres publicités**, même « pour tester ». Google le détecte immédiatement.
2. Ne demandez à personne de cliquer (ni famille, ni amis, ni « échange de clics »).
3. N'achetez jamais de trafic (bots, « visites garanties »).
4. Ne collez pas plus de blocs de pub que de contenu, et ne cachez rien derrière une pub.

---

## 📊 Combien ça peut rapporter ? (chiffres honnêtes)

On raisonne en **RPM** = revenu pour 1 000 pages vues. En France, sur un site outil/calculatrice,
comptez **2 € à 8 € de RPM** selon la saison et la qualité du trafic.

| Visites par jour | Pages vues / mois | Revenu mensuel réaliste |
|---|---|---|
| 100 | ~3 000 | 6 € – 25 € |
| 500 | ~15 000 | 30 € – 120 € |
| 2 000 | ~60 000 | 120 € – 480 € |
| 10 000 | ~300 000 | 600 € – 2 400 € |

⚠️ **Soyez patient et lucide** : les 3 premiers mois rapportent souvent **quelques euros**.
Le trafic d'un site neuf met **3 à 6 mois** à décoller sur Google, parfois plus sur un mot-clé
concurrentiel comme « calculatrice de durée ». Personne — aucun code, aucune agence — ne peut vous
garantir la 1ʳᵉ place ni une date. Ce qui est garanti ici, c'est que la **partie technique est
irréprochable** : c'est la condition nécessaire, pas suffisante.

---

## 🥇 Étape 6 — Ce qui reste à faire pour viser la 1ʳᵉ place

Le site est déjà optimisé côté technique (vitesse, balises, données structurées, mobile, contenu).
Ce qui fera vraiment la différence ensuite, dans l'ordre d'importance :

1. **Ajouter des pages satellites** (une par recherche précise). Dupliquez `index.html`, changez le titre,
   le H1 et le texte. Idées à fort potentiel :
   `convertir-minutes-en-heures.html`, `calcul-heures-de-travail.html`,
   `additionner-des-heures.html`, `calcul-jours-ouvres.html`, `duree-entre-deux-dates.html`.
   Reliez-les entre elles par des liens dans le texte (**maillage interne**) et ajoutez-les au `sitemap.xml`.
2. **Obtenir des liens entrants** : forums (les-forums RH, entraide informatique), annuaires d'outils gratuits,
   groupes Facebook de secrétaires/RH/freelances, Reddit r/france. Un lien depuis un site sérieux vaut
   plus que 100 liens douteux — **n'achetez jamais de liens**.
3. **Surveiller Search Console** chaque semaine : onglet *Performances* → voyez sur quelles recherches vous
   apparaissez, et enrichissez le texte avec ces expressions exactes.
4. **Tester la vitesse** : https://pagespeed.web.dev → collez votre URL. Sans pub vous devez être
   autour de 100/100. Avec AdSense, un score de 75-90 sur mobile est **normal et acceptable** — c'est
   le prix de la publicité, tous vos concurrents ont le même handicap.
5. **Ne pas ajouter de pub supplémentaire.** Deux emplacements bien placés rapportent plus, à terme,
   que six qui font fuir les visiteurs.

### Une précision honnête sur les « étoiles » dans Google
Les données structurées incluses (`WebApplication` + `FAQPage`) permettent d'obtenir des **questions
dépliables** sous votre lien. En revanche, je n'ai **pas** mis de fausse note « 4,8 ★ sur 1 250 avis » :
inventer des avis est une violation des règles de Google (pénalité ou déclassement à la clé), et Google
ignore de toute façon les notes qu'un site s'attribue à lui-même. Si vous voulez des étoiles un jour,
il faudra de vrais avis vérifiables.

---

## 🆘 Petits problèmes fréquents

| Symptôme | Cause et solution |
|---|---|
| Le site s'affiche sans couleurs | `style.css` n'a pas été envoyé, ou pas dans le même dossier que `index.html`. |
| La calculatrice ne calcule rien | `script.js` manquant. Vérifiez qu'il est bien à côté de `index.html`. |
| Page blanche sur GitHub Pages | Attendez 2 min, videz le cache (`Ctrl+F5`), vérifiez *Branch = main / dossier = /docs*. |
| Les modifications n'apparaissent pas | Cache du navigateur : `Ctrl+F5` (Windows) ou `Cmd+Shift+R` (Mac). |
| AdSense affiche des cases vides | Normal pendant 24-48 h après validation. Vérifiez ensuite `ads.txt`. |
| « Site indisponible » dans AdSense | Le domaine déclaré ne correspond pas exactement à celui du site (avec/sans `www`). |

---

## ✅ Récapitulatif à cocher

- [ ] Site testé en local (double-clic sur `index.html`)
- [ ] Site publié (Netlify, GitHub Pages ou FTP)
- [ ] Nom de domaine acheté et relié, HTTPS actif 🔒
- [ ] `VOTRE-SITE.fr` remplacé partout (4 fichiers)
- [ ] `mentions-legales.html` rempli avec vos vraies informations
- [ ] Search Console vérifiée + `sitemap.xml` envoyé
- [ ] Indexation demandée pour les 12 pages de contenu
- [ ] Compte AdSense créé, code collé, `ads.txt` rempli
- [ ] Bandeau de consentement RGPD publié
- [ ] Blocs de pub créés et collés aux 2 emplacements
- [ ] RIB ajouté, code PIN saisi à 10 €

Bonne chance 🚀
