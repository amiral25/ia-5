import Foundation

/// Abstraction over an ad network so the game never depends on a concrete SDK.
///
/// Design goals (the "non-invasive" contract):
///  - The game logic only ever *asks* to show an ad; the policy decides whether
///    it actually appears (see `AdPolicy`).
///  - Interstitials are full-screen and disruptive, so they are only ever shown
///    on the game-over / menu boundary — never during active play.
///  - Rewarded ads are **opt-in**: the player taps a button to get something
///    (a revive, doubled coins). They are never forced.
///  - There are **no banners during gameplay** anywhere in this codebase.
protocol AdManaging: AnyObject {
    /// Whether the network is ready to be used (SDK configured, consent ok…).
    var isAvailable: Bool { get }

    /// Begin loading the next interstitial + rewarded ad in the background.
    /// Safe to call repeatedly; implementations should de-dupe in-flight loads.
    func preload()

    /// Show a full-screen interstitial. `completion(shown)` reports whether an
    /// ad was actually presented. Always called on the main thread.
    func showInterstitial(completion: @escaping (_ shown: Bool) -> Void)

    /// Show a rewarded ad. `completion(granted)` is `true` only if the user
    /// watched it through to the reward. Always called on the main thread.
    func showRewarded(completion: @escaping (_ granted: Bool) -> Void)
}

enum AdManagerFactory {
    static func make() -> AdManaging {
        #if canImport(GoogleMobileAds)
        return AdMobAdManager()
        #else
        // No ad SDK linked → simulate ads so the full UX is testable in dev.
        return StubAdManager()
        #endif
    }
}
