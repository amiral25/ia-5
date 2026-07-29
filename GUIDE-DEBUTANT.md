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

### Méthode B — GitHub Pages (gratuit, depuis le dépôt où se trouve déjà ce code)

Le code est déjà sur GitHub, dans la branche `claude/duration-calculator-seo-wyoyjn`.

1. Fusionnez d'abord cette branche dans `main` (bouton vert *Merge pull request* si une Pull Request existe,
   sinon GitHub → onglet **Pull requests** → *New pull request* → base `main` ← compare `claude/duration-calculator-seo-wyoyjn` → *Create* → *Merge*).
2. Sur la page du dépôt, cliquez sur **Settings** (⚙️ en haut à droite).
3. Menu de gauche : **Pages**.
4. Section *Build and deployment* :
   - **Source** : `Deploy from a branch`
   - **Branch** : `main`  +  dossier **`/docs`**
   - Cliquez **Save**.
5. Attendez 1 à 2 minutes, rechargez la page : GitHub affiche
   `Your site is live at https://VOTRE-PSEUDO.github.io/ia-5/`

⚠️ Avec cette méthode l'adresse contient `/ia-5/`. Si vous branchez un vrai nom de domaine (étape 2), ce problème disparaît.

---

### Méthode C — Hébergeur classique + FTP (si vous avez déjà un hébergement)

1. Installez **FileZilla** (gratuit, https://filezilla-project.org).
2. Connectez-vous avec les identifiants FTP fournis par votre hébergeur (hôte, identifiant, mot de passe).
3. À droite, ouvrez le dossier `www` (ou `public_html`).
4. Glissez-y **le contenu** du dossier `docs` (les fichiers eux-mêmes, **pas** le dossier `docs`).
5. Le site est en ligne sur votre domaine.

---

## 🏷️ Étape 2 — Acheter un nom de domaine (fortement recommandé)

Un vrai domaine inspire confiance à Google **et** à AdSense. Coût : **8 à 15 € par an**.

1. Allez chez un vendeur : **OVHcloud**, **Gandi**, **Namecheap** ou **Hostinger**.
2. Cherchez un nom court contenant le mot-clé, par exemple :
   `calculatrice-duree.fr`, `calcul-duree.fr`, `duree-calcul.com`.
3. Achetez-le (prenez l'option *protection des données WHOIS*, souvent gratuite).
4. **Reliez-le à votre site :**
   - **Netlify** : *Domain management → Add a domain* → tapez votre domaine → Netlify vous donne
     2 valeurs à copier chez votre vendeur de domaine (des « serveurs DNS » type `dns1.p01.nsone.net`).
     Chez le vendeur : *Serveurs DNS → Utiliser des serveurs personnalisés* → collez-les.
   - **GitHub Pages** : *Settings → Pages → Custom domain* → tapez votre domaine → Save.
     Puis chez le vendeur, créez un enregistrement **CNAME** `www` → `VOTRE-PSEUDO.github.io`.
5. Attendez de 1 à 24 h (propagation DNS). Vérifiez que **HTTPS** est activé (cadenas 🔒) — c'est automatique et gratuit sur les deux plateformes.

---

## ✏️ Étape 3 — Remplacer `VOTRE-SITE.fr` par votre vrai domaine

C'est **la seule modification de code obligatoire**. Ouvrez chaque fichier avec le **Bloc-notes**
(Windows) ou **TextEdit** (Mac), ou mieux : **Visual Studio Code** (gratuit).

Utilisez **Rechercher / Remplacer** (`Ctrl+H` ou `Cmd+H`) :
- Rechercher : `VOTRE-SITE.fr`
- Remplacer par : `calculatrice-duree.fr` (votre domaine, **sans** `https://` ni `www` si vous n'en utilisez pas)
- Cliquez **Tout remplacer**

À faire dans ces 4 fichiers : `index.html`, `mentions-legales.html`, `robots.txt`, `sitemap.xml`.

Puis, dans **`mentions-legales.html`**, remplacez tout ce qui est entre crochets
`[VOTRE PRÉNOM ET NOM]`, `[votre-email@exemple.fr]`, `[NOM DE L'HÉBERGEUR]`… par vos vraies informations.
👉 **Google refuse les sites sans mentions légales identifiables. Ne sautez pas cette étape.**

Enfin, republiez (re-glissez le dossier sur Netlify, ou re-poussez sur GitHub).

---

## 🔎 Étape 4 — Déclarer le site à Google (indispensable pour être trouvé)

1. Allez sur **https://search.google.com/search-console** et connectez-vous avec un compte Google.
2. *Ajouter une propriété* → choisissez la case de droite **« Préfixe de l'URL »** → tapez `https://votre-domaine.fr`
3. Google demande de prouver que le site est à vous. La méthode la plus simple : **Balise HTML**.
   Google vous donne une ligne du type
   `<meta name="google-site-verification" content="AbC123..." />`
   → copiez-la, ouvrez `index.html`, et collez-la juste **en dessous** de la ligne `<meta charset="utf-8">`.
   Republiez le site, puis cliquez sur **Vérifier**.
4. Une fois vérifié : menu de gauche → **Sitemaps** → tapez `sitemap.xml` → **Envoyer**.
5. Menu **Inspection d'URL** → collez `https://votre-domaine.fr` → **Demander une indexation**.

⏳ Google met **quelques jours à quelques semaines** pour vous faire apparaître dans les résultats.
C'est normal, il n'y a rien à forcer.

---

## 💰 Étape 5 — Activer la publicité Google AdSense (l'argent)

### 5.1 Avant de candidater — les conditions à respecter
Google refuse la plupart des sites vides. Vous partez avec un avantage : ce site a déjà 1 200 mots de
contenu utile, un outil qui fonctionne, et une page de mentions légales. Vérifiez juste que :
- ✅ le site est en ligne sur **votre nom de domaine** (pas une adresse `.netlify.app` temporaire) ;
- ✅ la page **mentions légales est remplie** avec votre vrai nom et un e-mail ;
- ✅ vous avez **18 ans** et un **compte bancaire** à votre nom (ou celui d'un parent, avec son accord) ;
- ✅ le site est en ligne depuis **au moins quelques jours** et reçoit quelques visites.

### 5.2 Créer le compte
1. Allez sur **https://adsense.google.com** → *Commencer*.
2. Renseignez : l'URL de votre site, votre pays (France), acceptez les conditions.
3. Renseignez votre adresse postale exacte (elle servira à vous envoyer un code PIN par courrier plus tard).
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
- [ ] Compte AdSense créé, code collé, `ads.txt` rempli
- [ ] Bandeau de consentement RGPD publié
- [ ] Blocs de pub créés et collés aux 2 emplacements
- [ ] RIB ajouté, code PIN saisi à 10 €

Bonne chance 🚀
