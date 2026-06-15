import SwiftUI

struct MenuView: View {
    @EnvironmentObject private var coordinator: GameCoordinator
    @EnvironmentObject private var state: GameState

    @State private var pulse = false

    var body: some View {
        VStack(spacing: 28) {
            Spacer()

            VStack(spacing: 4) {
                Text("NEON")
                    .font(Theme.title)
                    .foregroundColor(Theme.neon)
                    .shadow(color: Theme.neon.opacity(0.9), radius: 16)
                Text("DASH")
                    .font(Theme.title)
                    .foregroundColor(.white)
                    .shadow(color: Theme.danger.opacity(0.7), radius: 12)
            }
            .scaleEffect(pulse ? 1.04 : 1.0)
            .animation(.easeInOut(duration: 1.1).repeatForever(autoreverses: true), value: pulse)

            HStack(spacing: 24) {
                stat(title: "MEILLEUR", value: "\(state.bestScore)", tint: Theme.neon)
                stat(title: "PIÈCES", value: "\(state.totalCoins)", tint: Theme.gold)
            }

            Spacer()

            VStack(spacing: 14) {
                NeonButton(title: "JOUER", systemImage: "play.fill") {
                    coordinator.play()
                }
                Text("Tape l'écran pour sauter. Survis le plus longtemps possible.")
                    .font(.system(size: 13, weight: .medium, design: .rounded))
                    .foregroundColor(.white.opacity(0.4))
                    .multilineTextAlignment(.center)
            }
            .padding(.horizontal, 40)
            .padding(.bottom, 50)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Theme.bg.opacity(0.55).ignoresSafeArea())
        .onAppear { pulse = true }
    }

    private func stat(title: String, value: String, tint: Color) -> some View {
        VStack(spacing: 2) {
            Text(title)
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .foregroundColor(.white.opacity(0.5))
            Text(value)
                .font(Theme.big)
                .foregroundColor(tint)
        }
    }
}
