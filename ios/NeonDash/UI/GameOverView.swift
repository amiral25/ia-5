import SwiftUI

/// Game-over screen. This is the *only* place a full-screen interstitial can
/// appear (and only when the `AdPolicy` allows it). The two rewarded actions —
/// "Continuer" (revive) and "Doubler les pièces" — are strictly opt-in.
struct GameOverView: View {
    @EnvironmentObject private var coordinator: GameCoordinator
    @EnvironmentObject private var state: GameState

    @State private var doubledThisScreen = false

    private var isNewBest: Bool { state.score >= state.bestScore && state.score > 0 }

    var body: some View {
        VStack(spacing: 22) {
            Spacer()

            Text(isNewBest ? "NOUVEAU RECORD !" : "PERDU")
                .font(Theme.big)
                .foregroundColor(isNewBest ? Theme.gold : Theme.danger)
                .shadow(color: (isNewBest ? Theme.gold : Theme.danger).opacity(0.7), radius: 10)

            VStack(spacing: 6) {
                Text("\(state.score)")
                    .font(Theme.title)
                    .foregroundColor(.white)
                Text("Meilleur : \(state.bestScore)")
                    .font(Theme.label)
                    .foregroundColor(.white.opacity(0.6))
                HStack(spacing: 6) {
                    Image(systemName: "circle.fill").foregroundColor(Theme.gold)
                    Text("+\(state.coins)")
                        .font(Theme.label)
                        .foregroundColor(.white.opacity(0.85))
                }
            }

            Spacer()

            VStack(spacing: 12) {
                // Opt-in revive: only offered once per run.
                if !state.hasRevivedThisRun {
                    NeonButton(title: "CONTINUER (pub)", systemImage: "arrow.clockwise.heart",
                               tint: Theme.danger) {
                        coordinator.reviveWithAd()
                    }
                }

                // Opt-in reward: double the coins from this run.
                if state.coins > 0 && !doubledThisScreen {
                    NeonButton(title: "DOUBLER LES PIÈCES (pub)", systemImage: "circle.grid.2x2.fill",
                               tint: Theme.gold) {
                        doubledThisScreen = true
                        coordinator.doubleCoinsWithAd()
                    }
                }

                NeonButton(title: "REJOUER", systemImage: "play.fill") {
                    coordinator.replay()
                }

                Button {
                    coordinator.backToMenu()
                } label: {
                    Text("Menu")
                        .font(Theme.label)
                        .foregroundColor(.white.opacity(0.7))
                        .padding(.vertical, 10)
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 40)
            .padding(.bottom, 50)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Theme.bg.opacity(0.7).ignoresSafeArea())
    }
}
