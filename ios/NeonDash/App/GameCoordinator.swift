import SwiftUI
import Combine

/// Top-level "phase" of the app, driving which SwiftUI view is shown.
enum GamePhase: Equatable {
    case menu
    case playing
    case gameOver
}

/// Observable bridge between the SpriteKit world and the SwiftUI UI layer.
///
/// The `GameScene` writes live values here (always on the main thread) and the
/// SwiftUI HUD / overlays simply observe them. Keeping this tiny and `@Published`
/// avoids coupling rendering code to the UI.
final class GameState: ObservableObject {
    @Published var phase: GamePhase = .menu
    @Published var score: Int = 0
    @Published var coins: Int = 0          // coins collected in the current run
    @Published var combo: Int = 0          // current pickup streak

    @Published private(set) var bestScore: Int = 0
    @Published private(set) var totalCoins: Int = 0   // persistent wallet
    @Published private(set) var gamesPlayed: Int = 0

    /// True once the player has already used a rewarded revive this run.
    @Published var hasRevivedThisRun: Bool = false

    /// Coins already credited to the wallet for the current run, so that a
    /// revive (which ends the run twice) never double-banks coins.
    private var coinsBankedThisRun = 0

    private let store = UserDefaults.standard
    private enum Key {
        static let best = "neondash.bestScore"
        static let wallet = "neondash.totalCoins"
        static let games = "neondash.gamesPlayed"
    }

    init() {
        bestScore = store.integer(forKey: Key.best)
        totalCoins = store.integer(forKey: Key.wallet)
        gamesPlayed = store.integer(forKey: Key.games)
    }

    func startRun() {
        score = 0
        coins = 0
        combo = 0
        coinsBankedThisRun = 0
        hasRevivedThisRun = false

        // A "game" is counted when it starts, so a revive (same run) does not
        // inflate the count used by the ad frequency policy.
        gamesPlayed += 1
        store.set(gamesPlayed, forKey: Key.games)

        phase = .playing
    }

    func endRun() {
        if score > bestScore {           // max → idempotent across revives
            bestScore = score
            store.set(bestScore, forKey: Key.best)
        }
        bankCoinDelta()
        phase = .gameOver
    }

    /// Bank only the coins not yet credited for this run.
    private func bankCoinDelta() {
        let delta = coins - coinsBankedThisRun
        guard delta > 0 else { return }
        totalCoins += delta
        coinsBankedThisRun = coins
        store.set(totalCoins, forKey: Key.wallet)
    }

    /// Reward the player after they opt into a "double coins" rewarded ad.
    func applyDoubleCoinsReward() {
        let bonus = coins
        coins += bonus
        coinsBankedThisRun += bonus      // bonus credited directly below
        totalCoins += bonus
        store.set(totalCoins, forKey: Key.wallet)
    }
}

/// Owns the long-lived objects: the game state, the ad manager and the ad
/// policy. Created once at app launch. All access happens on the main thread.
final class GameCoordinator: ObservableObject {
    let state = GameState()
    let ads: AdManaging
    let adPolicy = AdPolicy()

    /// The live SpriteKit scene, bound by `GameContainerView` once it exists.
    weak var boundScene: GameScene?

    init(ads: AdManaging = AdManagerFactory.make()) {
        self.ads = ads
        ads.preload()
    }

    // MARK: - Flow

    func play() {
        state.startRun()
    }

    /// Called by the SpriteKit scene when the player dies.
    func handlePlayerDeath() {
        state.endRun()

        // Warm up the next interstitial so it's ready by the time the policy
        // allows showing one — we never block the game-over screen on a load.
        ads.preload()
    }

    /// Returns to the menu from the game-over screen, showing an interstitial
    /// only if the (non-invasive) policy allows it.
    func backToMenu() {
        maybeShowInterstitial { [weak self] in
            self?.state.phase = .menu
        }
    }

    /// Replays immediately, optionally gated by an interstitial.
    func replay() {
        maybeShowInterstitial { [weak self] in
            self?.state.startRun()
        }
    }

    private func maybeShowInterstitial(then continuation: @escaping () -> Void) {
        guard adPolicy.shouldShowInterstitial(gamesPlayed: state.gamesPlayed) else {
            continuation()
            return
        }
        ads.showInterstitial { [weak self] _ in
            guard let self else { continuation(); return }
            self.adPolicy.didShowInterstitial(gamesPlayed: self.state.gamesPlayed)
            continuation()
        }
    }

    // MARK: - Rewarded (always player-initiated → non-invasive)

    func reviveWithAd() {
        ads.showRewarded { [weak self] granted in
            guard let self, granted else { return }
            self.state.hasRevivedThisRun = true
            self.state.phase = .playing
            self.boundScene?.revive()
        }
    }

    func doubleCoinsWithAd() {
        ads.showRewarded { [weak self] granted in
            guard granted else { return }
            self?.state.applyDoubleCoinsReward()
        }
    }
}
