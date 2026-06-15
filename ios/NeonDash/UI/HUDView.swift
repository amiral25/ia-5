import SwiftUI

/// Minimal in-game overlay. Deliberately tiny and non-blocking — no banners, no
/// buttons that could be tapped by accident mid-run (taps go to the game).
struct HUDView: View {
    @EnvironmentObject private var state: GameState

    var body: some View {
        VStack {
            HStack(alignment: .top) {
                Text("\(state.score)")
                    .font(Theme.big)
                    .foregroundColor(.white)
                    .shadow(color: Theme.neon.opacity(0.8), radius: 8)

                Spacer()

                HStack(spacing: 6) {
                    Image(systemName: "circle.fill").foregroundColor(Theme.gold)
                    Text("\(state.coins)")
                        .font(Theme.label)
                        .foregroundColor(.white)
                }
            }
            .padding(.horizontal, 24)
            .padding(.top, 16)

            if state.combo >= GameConfig.comboBonusEvery {
                Text("COMBO x\(state.combo)")
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .foregroundColor(Theme.gold)
                    .padding(.top, 4)
            }

            Spacer()

            Text("Tape pour sauter • double saut autorisé")
                .font(.system(size: 13, weight: .medium, design: .rounded))
                .foregroundColor(.white.opacity(0.35))
                .padding(.bottom, 24)
        }
        .allowsHitTesting(false)   // never steal taps from the game
    }
}
