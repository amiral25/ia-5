import SwiftUI

@main
struct NeonDashApp: App {
    /// Single source of truth for the whole app: owns the game state and the
    /// ad coordinator, and keeps them alive for the app's lifetime.
    @StateObject private var coordinator = GameCoordinator()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(coordinator)
                .environmentObject(coordinator.state)
                .preferredColorScheme(.dark)
                .ignoresSafeArea()
        }
    }
}
