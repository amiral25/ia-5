# Neon Dash — jeu iOS sans fin + infrastructure pub

Un jeu d'arcade **addictif, en un seul tap, et sans fin** pour iOS, écrit en
**SwiftUI + SpriteKit**. Le code embarque une **infrastructure de publicité
non-invasive** prête à brancher sur AdMob.

## Le jeu

- **Une seule règle** : tape l'écran pour sauter (double saut autorisé).
- **Sans fin** : le monde défile à l'infini. Les obstacles et les pièces sont
  générés **procéduralement** juste hors de l'écran puis recyclés. La seule fin
  possible, c'est de se crasher.
- **Courbe de difficulté continue** : la vitesse augmente doucement et en
  permanence, et l'écart entre les obstacles se resserre proportionnellement —
  jamais de mur infranchissable, toujours « encore une partie ».
- **Boucle de rétention** : score, record, pièces persistantes, combos.

## Pourquoi c'est « addictif » (et pas frustrant)

| Levier | Mise en œuvre |
|---|---|
| Sessions ultra-courtes | Mort instantanée, *replay* en un tap |
| Progression visible | Record + porte-monnaie de pièces sauvegardés (`UserDefaults`) |
| Récompense variable | Arcs de pièces aléatoires, bonus de combo |
| Montée en tension douce | Rampe de vitesse continue, sans paliers brutaux |
| Pas d'attente | Aucune pub ne bloque le redémarrage les premières parties |

## Infrastructure publicitaire — *non invasive par conception*

Tout passe par le protocole [`AdManaging`](NeonDash/Ads/AdManaging.swift). Le jeu
ne fait que **demander** une pub ; c'est la
[`AdPolicy`](NeonDash/Ads/AdPolicy.swift) qui décide si elle s'affiche.

Règles appliquées :

- **Aucune bannière pendant le jeu.** Nulle part.
- **Interstitiels uniquement sur l'écran de fin de partie**, jamais pendant une
  partie, et encadrés par un *frequency cap* :
  - rien pendant les 3 premières parties (le temps d'accrocher) ;
  - au plus 1 interstitiel toutes les 3 parties ;
  - au plus 1 interstitiel toutes les 90 s.
- **Pubs récompensées = 100 % opt-in** (le joueur appuie sur un bouton) :
  - **Continuer** : revivre une fois par partie ;
  - **Doubler les pièces** de la partie.

### Brancher AdMob (production)

Le code réel est dans [`AdMobAdManager.swift`](NeonDash/Ads/AdMobAdManager.swift),
encadré par `#if canImport(GoogleMobileAds)`. Sans le SDK, le jeu tourne avec un
[`StubAdManager`](NeonDash/Ads/StubAdManager.swift) qui **simule** les pubs : tout
le parcours est testable dans le Simulateur, sans compte ni clé.

Pour passer en prod :

1. Ajouter le package Swift **Google-Mobile-Ads-SDK** à la cible `NeonDash`.
   `AdManagerFactory` basculera automatiquement sur AdMob.
2. Renseigner `GADApplicationIdentifier` dans `Info.plist` (voir `project.yml`).
3. Remplacer les **ID de test** par tes vrais ad unit IDs dans `AdMobAdManager`.
4. (Recommandé) Brancher un CMP pour le consentement (ATT / GDPR) avant `preload()`.

> Les ID présents sont les ID **de test** officiels de Google — à ne **jamais**
> garder en production.

## Construire le projet

Le projet Xcode est généré avec [XcodeGen](https://github.com/yonyz/XcodeGen)
pour rester lisible et versionnable.

```bash
brew install xcodegen
cd ios
xcodegen generate
open NeonDash.xcodeproj
```

Puis dans Xcode : choisir un simulateur iPhone et lancer (⌘R). Pour signer sur un
appareil réel, renseigne ton `DEVELOPMENT_TEAM` dans `project.yml`.

La CI ([`.github/workflows/ios-build.yml`](../.github/workflows/ios-build.yml))
compile l'app pour le Simulateur à chaque push, sans signature.

## Architecture

```
ios/NeonDash/
├── App/
│   ├── NeonDashApp.swift        # point d'entrée SwiftUI
│   └── GameCoordinator.swift    # état partagé + orchestration des pubs (GameState)
├── Game/
│   ├── GameConfig.swift         # toutes les constantes de gameplay (à tuner)
│   └── GameScene.swift          # cœur SpriteKit : génération infinie, physique manuelle
├── Ads/
│   ├── AdManaging.swift         # protocole + factory
│   ├── AdPolicy.swift           # règles « non invasif » (frequency cap)
│   ├── StubAdManager.swift      # pubs simulées (dev)
│   └── AdMobAdManager.swift     # implémentation AdMob (gated par #if canImport)
└── UI/
    ├── ContentView.swift        # bascule menu / jeu / fin de partie
    ├── GameContainerView.swift  # hôte SpriteView + taps
    ├── HUDView.swift            # score/pièces en jeu (ne capte aucun tap)
    ├── MenuView.swift
    ├── GameOverView.swift       # seul endroit où un interstitiel peut apparaître
    └── Theme.swift
```

Le découplage clé : `GameScene` (rendu/jeu) communique avec l'UI via un simple
objet observable `GameState`, et ne connaît **rien** des pubs. Les pubs sont
pilotées par `GameCoordinator` aux frontières de partie uniquement.
