import CoreGraphics

/// All gameplay tuning lives here so the feel of the game is easy to iterate on.
enum GameConfig {
    // Player — vertical motion is integrated manually (points & points/sec),
    // independent of SpriteKit's gravity scaling, for a predictable snappy feel.
    static let playerRadius: CGFloat = 18
    static let playerScreenXFraction: CGFloat = 0.28   // fixed horizontal position
    static let gravity: CGFloat = -2600                 // points / sec^2
    static let jumpVelocity: CGFloat = 950              // points / sec
    static let maxJumps = 2                              // tap once = jump, twice = double-jump

    // World / scrolling
    static let startScrollSpeed: CGFloat = 320          // points per second
    static let maxScrollSpeed: CGFloat = 760
    static let speedRampPerSecond: CGFloat = 6          // gentle, endless ramp

    // Obstacle spawning (distance-based gaps, shrinking with speed)
    static let baseSpawnGap: CGFloat = 360              // points between obstacles
    static let minSpawnGap: CGFloat = 220
    static let spawnGapJitter: CGFloat = 90

    // Scoring
    static let pointsPerSecond: Double = 10
    static let coinValue = 1
    static let comboBonusEvery = 5                       // every N coins → +1 bonus point

    // Layout
    static let groundHeight: CGFloat = 90
}

/// Physics categories used for collision/contact masks.
enum PhysicsCategory {
    static let none: UInt32      = 0
    static let player: UInt32    = 0x1 << 0
    static let ground: UInt32    = 0x1 << 1
    static let obstacle: UInt32  = 0x1 << 2
    static let coin: UInt32      = 0x1 << 3
}

enum ZPosition {
    static let background: CGFloat = -10
    static let ground: CGFloat = 0
    static let obstacle: CGFloat = 5
    static let coin: CGFloat = 6
    static let player: CGFloat = 10
    static let fx: CGFloat = 20
}
