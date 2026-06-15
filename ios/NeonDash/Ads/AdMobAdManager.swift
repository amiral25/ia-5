import Foundation

#if canImport(GoogleMobileAds)
import GoogleMobileAds
import UIKit

/// Real ad manager backed by Google AdMob.
///
/// This whole file only compiles when the `GoogleMobileAds` SDK is linked to the
/// target, so the project builds and runs with the `StubAdManager` out of the
/// box. To go live:
///   1. Add the "Google-Mobile-Ads-SDK" Swift package to the NeonDash target.
///   2. Set `GADApplicationIdentifier` in Info.plist (see project.yml).
///   3. Replace the TEST unit IDs below with your real ones.
///   4. Call `GADMobileAds.sharedInstance().start(...)` at launch (done lazily here).
///
/// The IDs below are Google's official **test** unit IDs — safe to ship in dev,
/// but you MUST swap them before release or AdMob may suspend the account.
final class AdMobAdManager: NSObject, AdManaging {
    // Google test unit IDs.
    private let interstitialUnitID = "ca-app-pub-3940256099942544/4411468910"
    private let rewardedUnitID = "ca-app-pub-3940256099942544/1712485313"

    private var interstitial: GADInterstitialAd?
    private var rewarded: GADRewardedAd?
    private var isLoadingInterstitial = false
    private var isLoadingRewarded = false
    private var didStartSDK = false

    private var interstitialCompletion: ((Bool) -> Void)?
    private var rewardedCompletion: ((Bool) -> Void)?
    private var rewardEarned = false

    var isAvailable: Bool { interstitial != nil || rewarded != nil }

    // MARK: - Loading

    func preload() {
        startSDKIfNeeded()
        loadInterstitial()
        loadRewarded()
    }

    private func startSDKIfNeeded() {
        guard !didStartSDK else { return }
        didStartSDK = true
        GADMobileAds.sharedInstance().start(completionHandler: nil)
    }

    private func loadInterstitial() {
        guard interstitial == nil, !isLoadingInterstitial else { return }
        isLoadingInterstitial = true
        GADInterstitialAd.load(withAdUnitID: interstitialUnitID,
                               request: GADRequest()) { [weak self] ad, error in
            guard let self else { return }
            self.isLoadingInterstitial = false
            if let error { print("[Ads/admob] interstitial load failed: \(error)"); return }
            self.interstitial = ad
            self.interstitial?.fullScreenContentDelegate = self
        }
    }

    private func loadRewarded() {
        guard rewarded == nil, !isLoadingRewarded else { return }
        isLoadingRewarded = true
        GADRewardedAd.load(withAdUnitID: rewardedUnitID,
                           request: GADRequest()) { [weak self] ad, error in
            guard let self else { return }
            self.isLoadingRewarded = false
            if let error { print("[Ads/admob] rewarded load failed: \(error)"); return }
            self.rewarded = ad
            self.rewarded?.fullScreenContentDelegate = self
        }
    }

    // MARK: - Presenting

    func showInterstitial(completion: @escaping (Bool) -> Void) {
        guard let ad = interstitial, let root = Self.topViewController() else {
            completion(false)
            loadInterstitial()
            return
        }
        interstitialCompletion = completion
        ad.present(fromRootViewController: root)
    }

    func showRewarded(completion: @escaping (Bool) -> Void) {
        guard let ad = rewarded, let root = Self.topViewController() else {
            completion(false)
            loadRewarded()
            return
        }
        rewardEarned = false
        rewardedCompletion = completion
        ad.present(fromRootViewController: root) { [weak self] in
            self?.rewardEarned = true
        }
    }

    private static func topViewController() -> UIViewController? {
        let scene = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first { $0.activationState == .foregroundActive }
        var top = scene?.windows.first(where: \.isKeyWindow)?.rootViewController
        while let presented = top?.presentedViewController { top = presented }
        return top
    }
}

extension AdMobAdManager: GADFullScreenContentDelegate {
    func adDidDismissFullScreenContent(_ ad: GADFullScreenContentAd) {
        if ad === interstitial {
            interstitial = nil
            interstitialCompletion?(true)
            interstitialCompletion = nil
            loadInterstitial()
        } else if ad === rewarded {
            rewarded = nil
            let granted = rewardEarned
            rewardedCompletion?(granted)
            rewardedCompletion = nil
            loadRewarded()
        }
    }

    func ad(_ ad: GADFullScreenContentAd,
            didFailToPresentFullScreenContentWithError error: Error) {
        print("[Ads/admob] present failed: \(error)")
        if ad === interstitial {
            interstitial = nil
            interstitialCompletion?(false)
            interstitialCompletion = nil
            loadInterstitial()
        } else if ad === rewarded {
            rewarded = nil
            rewardedCompletion?(false)
            rewardedCompletion = nil
            loadRewarded()
        }
    }
}
#endif
