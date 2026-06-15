import SwiftUI
import SpriteKit
import Combine

/// Holds the single long-lived `GameScene` instance so it survives SwiftUI
/// re-renders (recreating it every frame would reset the game).
final class SceneHolder: ObservableObject {
    private(set) var scene: GameScene?

    func scene(size: CGSize, state: GameState, onDeath: @escaping () -> Void) -> GameScene {
        // Create exactly once. `.resizeFill` adapts to later size changes, so we
        // never recreate the scene (which would wipe an in-progress run).
        if let scene { return scene }
        let s = GameScene(size: size == .zero ? CGSize(width: 390, height: 844) : size)
        s.scaleMode = .resizeFill
        s.state = state
        s.onDeath = onDeath
        scene = s
        return s
    }
}

/// Hosts the SpriteKit scene and routes taps into the game. The HUD, menu and
/// game-over screens are layered on top of this by `ContentView`.
struct GameContainerView: View {
    @EnvironmentObject private var coordinator: GameCoordinator
    @EnvironmentObject private var state: GameState
    @StateObject private var holder = SceneHolder()

    var body: some View {
        GeometryReader { geo in
            let scene = holder.scene(size: geo.size, state: state) {
                coordinator.handlePlayerDeath()
            }

            SpriteView(scene: scene, options: [.ignoresSiblingOrder])
                .ignoresSafeArea()
                .contentShape(Rectangle())
                .onTapGesture {
                    if state.phase == .playing { scene.jump() }
                }
                .onReceive(state.$phase) { phase in
                    // A fresh run starts the scene; a revive keeps the same run
                    // alive (the scene's `revive()` is triggered from the
                    // game-over screen), so we must not restart in that case.
                    if phase == .playing && !state.hasRevivedThisRun {
                        scene.startGame()
                    }
                }
                .onAppear { coordinator.boundScene = scene }
        }
    }
}
