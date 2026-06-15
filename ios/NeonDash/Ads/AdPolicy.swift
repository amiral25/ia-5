import Foundation

/// Decides *when* it is acceptable to show an interstitial. This is the heart of
/// the "non-invasive" promise — tune these numbers (ideally from a remote config
/// later) to balance revenue against player enjoyment.
///
/// Rules applied for interstitials:
///  1. Never on the very first runs (let players get hooked first).
///  2. Never more often than every `minGamesBetweenAds` games.
///  3. Never more often than every `minSecondsBetweenAds` seconds.
///
/// Rewarded ads are intentionally *not* governed here: they are always
/// player-initiated, so showing them is never invasive.
final class AdPolicy {
    /// Skip ads entirely for the first N games of a fresh install.
    var freeGamesAtStart: Int = 3
    /// Minimum number of games between two interstitials.
    var minGamesBetweenAds: Int = 3
    /// Minimum wall-clock gap between two interstitials.
    var minSecondsBetweenAds: TimeInterval = 90

    private var lastInterstitialDate: Date?
    private var gamesAtLastInterstitial: Int = 0

    func shouldShowInterstitial(gamesPlayed: Int) -> Bool {
        guard gamesPlayed > freeGamesAtStart else { return false }

        if gamesPlayed - gamesAtLastInterstitial < minGamesBetweenAds {
            return false
        }

        if let last = lastInterstitialDate,
           Date().timeIntervalSince(last) < minSecondsBetweenAds {
            return false
        }

        return true
    }

    /// Record that an interstitial was shown so the caps above kick in.
    func didShowInterstitial(gamesPlayed: Int = -1) {
        lastInterstitialDate = Date()
        if gamesPlayed >= 0 {
            gamesAtLastInterstitial = gamesPlayed
        } else {
            gamesAtLastInterstitial += minGamesBetweenAds
        }
    }
}
