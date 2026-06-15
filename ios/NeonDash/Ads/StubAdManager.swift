import Foundation

/// Development / fallback ad manager used when no real ad SDK is linked.
///
/// It simulates the *timing* and *callbacks* of a real network (with a short
/// delay) so the entire ad flow — frequency caps, rewarded revive, double coins,
/// game-over interstitials — can be exercised in the Simulator without any
/// account, key, or network. Replace at runtime by linking GoogleMobileAds (the
/// factory switches automatically) or by injecting your own `AdManaging`.
final class StubAdManager: AdManaging {
    var isAvailable: Bool { true }

    private let presentDelay: TimeInterval = 0.4

    func preload() {
        // No-op: nothing to load for the simulated network.
    }

    func showInterstitial(completion: @escaping (Bool) -> Void) {
        print("[Ads/stub] interstitial presented")
        DispatchQueue.main.asyncAfter(deadline: .now() + presentDelay) {
            completion(true)
        }
    }

    func showRewarded(completion: @escaping (Bool) -> Void) {
        print("[Ads/stub] rewarded ad presented → reward granted")
        DispatchQueue.main.asyncAfter(deadline: .now() + presentDelay) {
            completion(true)
        }
    }
}
