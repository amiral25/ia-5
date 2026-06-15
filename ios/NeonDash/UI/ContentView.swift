import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var coordinator: GameCoordinator
    @EnvironmentObject private var state: GameState

    var body: some View {
        ZStack {
            // The game renders underneath everything, always alive.
            GameContainerView()

            switch state.phase {
            case .menu:
                MenuView()
                    .transition(.opacity)
            case .playing:
                HUDView()
                    .transition(.opacity)
            case .gameOver:
                GameOverView()
                    .transition(.opacity.combined(with: .scale(scale: 1.05)))
            }
        }
        .animation(.easeInOut(duration: 0.25), value: state.phase)
    }
}
