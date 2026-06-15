import SpriteKit

/// The endless arcade core.
///
/// One mechanic: **tap to jump** (double-jump allowed). The world scrolls left
/// forever; obstacles and coins are generated procedurally just off the right
/// edge and recycled when they leave on the left, so a single run has no end
/// other than the player crashing. Speed ramps slowly and continuously, which is
/// what makes it "just one more try" addictive without ever hitting a wall.
///
/// The player's vertical motion is integrated manually (see `update`) so the
/// jump feel is fully deterministic and independent of SpriteKit's gravity
/// scaling. The physics body exists only for contact detection.
final class GameScene: SKScene, SKPhysicsContactDelegate {

    /// Reports gameplay events back to the SwiftUI layer (main thread).
    weak var state: GameState?
    /// Called once when the player dies.
    var onDeath: (() -> Void)?

    private let player = SKShapeNode(circleOfRadius: GameConfig.playerRadius)
    private var jumpsRemaining = GameConfig.maxJumps
    private var playerVY: CGFloat = 0          // vertical velocity, points/sec

    private var scrollSpeed = GameConfig.startScrollSpeed
    private var distanceUntilNextSpawn: CGFloat = 0
    private var elapsed: TimeInterval = 0
    private var lastUpdate: TimeInterval = 0
    private var isAlive = false

    private var scoreAccumulator: Double = 0
    private var coinsThisRun = 0
    private var comboCount = 0

    private let neon = SKColor(red: 0.18, green: 0.96, blue: 0.84, alpha: 1)
    private let danger = SKColor(red: 1.0, green: 0.28, blue: 0.45, alpha: 1)
    private let gold = SKColor(red: 1.0, green: 0.82, blue: 0.2, alpha: 1)

    private var groundTopY: CGFloat { GameConfig.groundHeight }
    private var restingY: CGFloat { groundTopY + GameConfig.playerRadius }

    // MARK: - Lifecycle

    override func didMove(to view: SKView) {
        backgroundColor = SKColor(red: 0.05, green: 0.06, blue: 0.12, alpha: 1)
        physicsWorld.gravity = .zero            // motion is manual; physics is contact-only
        physicsWorld.contactDelegate = self
        buildGround()
        buildPlayer()
    }

    // MARK: - Public control (called from SwiftUI)

    func startGame() {
        removeObstaclesAndCoins()
        scrollSpeed = GameConfig.startScrollSpeed
        distanceUntilNextSpawn = size.width * 0.6
        elapsed = 0
        scoreAccumulator = 0
        coinsThisRun = 0
        comboCount = 0
        jumpsRemaining = GameConfig.maxJumps
        playerVY = 0
        isAlive = true
        isPaused = false

        player.position = CGPoint(x: size.width * GameConfig.playerScreenXFraction,
                                  y: size.height * 0.55)
        player.alpha = 1
    }

    /// Revive in place: clear nearby hazards and give a short visible flash.
    func revive() {
        coinsThisRun = state?.coins ?? coinsThisRun
        comboCount = 0
        clearHazardsNearPlayer()
        playerVY = 0
        player.position.y = size.height * 0.6
        jumpsRemaining = GameConfig.maxJumps
        player.alpha = 1
        isAlive = true
        isPaused = false
        flashPlayer()
    }

    func jump() {
        guard isAlive, jumpsRemaining > 0 else { return }
        jumpsRemaining -= 1
        playerVY = GameConfig.jumpVelocity
        emitJumpBurst()
    }

    // MARK: - Build

    private func buildGround() {
        let strip = SKShapeNode(rectOf: CGSize(width: size.width, height: GameConfig.groundHeight))
        strip.position = CGPoint(x: size.width / 2, y: GameConfig.groundHeight / 2)
        strip.fillColor = SKColor(red: 0.10, green: 0.12, blue: 0.22, alpha: 1)
        strip.strokeColor = neon
        strip.lineWidth = 2
        strip.glowWidth = 4
        strip.zPosition = ZPosition.ground
        addChild(strip)
    }

    private func buildPlayer() {
        player.fillColor = neon
        player.strokeColor = .white
        player.lineWidth = 2
        player.glowWidth = 8
        player.zPosition = ZPosition.player
        player.position = CGPoint(x: size.width * GameConfig.playerScreenXFraction,
                                  y: size.height * 0.55)

        // Dynamic so contacts fire, but it never moves under physics — we drive
        // the position manually and disable physics collisions.
        let body = SKPhysicsBody(circleOfRadius: GameConfig.playerRadius)
        body.isDynamic = true
        body.affectedByGravity = false
        body.allowsRotation = false
        body.categoryBitMask = PhysicsCategory.player
        body.collisionBitMask = PhysicsCategory.none
        body.contactTestBitMask = PhysicsCategory.obstacle | PhysicsCategory.coin
        player.physicsBody = body
        addChild(player)
    }

    // MARK: - Update loop

    override func update(_ currentTime: TimeInterval) {
        if lastUpdate == 0 { lastUpdate = currentTime }
        let dt = min(currentTime - lastUpdate, 1.0 / 30.0)   // clamp after pauses
        lastUpdate = currentTime
        guard isAlive else { return }

        elapsed += dt

        // Continuous, gentle speed ramp → the endless difficulty curve.
        scrollSpeed = min(GameConfig.maxScrollSpeed,
                          GameConfig.startScrollSpeed + GameConfig.speedRampPerSecond * CGFloat(elapsed))

        integratePlayer(dt: dt)

        let dx = scrollSpeed * CGFloat(dt)
        scrollWorld(by: dx)
        spawnIfNeeded(advancedBy: dx)
        updateScore(dt: dt)
        cullOffscreen()
    }

    private func integratePlayer(dt: TimeInterval) {
        playerVY += GameConfig.gravity * CGFloat(dt)
        var y = player.position.y + playerVY * CGFloat(dt)

        if y <= restingY {
            y = restingY
            playerVY = 0
            jumpsRemaining = GameConfig.maxJumps
        }
        // Keep within the top of the screen so the player can't fly off.
        let maxY = size.height - GameConfig.playerRadius
        if y > maxY { y = maxY; playerVY = min(playerVY, 0) }

        player.position.y = y
    }

    private func scrollWorld(by dx: CGFloat) {
        for node in children where node.name == "scroller" {
            node.position.x -= dx
        }
    }

    private func updateScore(dt: TimeInterval) {
        scoreAccumulator += dt * GameConfig.pointsPerSecond
        let newScore = Int(scoreAccumulator)
        publish { $0.score = newScore }
    }

    // MARK: - Procedural generation

    private func spawnIfNeeded(advancedBy dx: CGFloat) {
        distanceUntilNextSpawn -= dx
        guard distanceUntilNextSpawn <= 0 else { return }

        spawnPattern()

        // Gaps shrink as speed grows → keeps challenge proportional, never impossible.
        let speedFactor = (scrollSpeed - GameConfig.startScrollSpeed) /
                          max(1, GameConfig.maxScrollSpeed - GameConfig.startScrollSpeed)
        let gap = GameConfig.baseSpawnGap -
                  (GameConfig.baseSpawnGap - GameConfig.minSpawnGap) * speedFactor
        let jitter = CGFloat.random(in: -GameConfig.spawnGapJitter...GameConfig.spawnGapJitter)
        distanceUntilNextSpawn = max(GameConfig.minSpawnGap, gap + jitter)
    }

    /// Picks one of a few hand-tuned, always-solvable patterns.
    private func spawnPattern() {
        let spawnX = size.width + 60
        switch Int.random(in: 0..<4) {
        case 0:
            spawnSpike(at: spawnX, scale: 1.0)
            maybeSpawnCoinArc(centerX: spawnX, lowY: groundTopY + 120)
        case 1:
            spawnSpike(at: spawnX, scale: 1.4)
        case 2:
            // Floating block to jump under/over, coins above it.
            let blockY = groundTopY + CGFloat.random(in: 150...230)
            spawnFloatingBlock(at: spawnX, y: blockY)
            maybeSpawnCoinArc(centerX: spawnX, lowY: blockY + 70)
        default:
            spawnSpike(at: spawnX, scale: 1.0)
            spawnSpike(at: spawnX + 90, scale: 1.0)   // double spike → double-jump timing
        }
    }

    private func spawnSpike(at x: CGFloat, scale: CGFloat) {
        let w: CGFloat = 44 * scale
        let h: CGFloat = 60 * scale
        let path = CGMutablePath()
        path.move(to: CGPoint(x: -w / 2, y: 0))
        path.addLine(to: CGPoint(x: w / 2, y: 0))
        path.addLine(to: CGPoint(x: 0, y: h))
        path.closeSubpath()

        let spike = SKShapeNode(path: path)
        spike.fillColor = danger
        spike.strokeColor = .white
        spike.lineWidth = 1.5
        spike.glowWidth = 4
        spike.name = "scroller"
        spike.zPosition = ZPosition.obstacle
        spike.position = CGPoint(x: x, y: groundTopY)

        let body = SKPhysicsBody(polygonFrom: path)
        body.isDynamic = false
        body.categoryBitMask = PhysicsCategory.obstacle
        body.contactTestBitMask = PhysicsCategory.player
        body.collisionBitMask = PhysicsCategory.none
        spike.physicsBody = body
        addChild(spike)
    }

    private func spawnFloatingBlock(at x: CGFloat, y: CGFloat) {
        let blockSize = CGSize(width: 56, height: 56)
        let block = SKShapeNode(rectOf: blockSize, cornerRadius: 8)
        block.fillColor = danger.withAlphaComponent(0.85)
        block.strokeColor = .white
        block.lineWidth = 1.5
        block.glowWidth = 4
        block.name = "scroller"
        block.zPosition = ZPosition.obstacle
        block.position = CGPoint(x: x, y: y)

        let body = SKPhysicsBody(rectangleOf: blockSize)
        body.isDynamic = false
        body.categoryBitMask = PhysicsCategory.obstacle
        body.contactTestBitMask = PhysicsCategory.player
        body.collisionBitMask = PhysicsCategory.none
        block.physicsBody = body
        addChild(block)
    }

    private func maybeSpawnCoinArc(centerX: CGFloat, lowY: CGFloat) {
        guard Bool.random() else { return }
        let count = Int.random(in: 3...5)
        for i in 0..<count {
            let t = CGFloat(i) / CGFloat(max(1, count - 1))
            let x = centerX - 40 + t * 80
            let y = lowY + sin(t * .pi) * 50
            spawnCoin(at: CGPoint(x: x, y: y))
        }
    }

    private func spawnCoin(at point: CGPoint) {
        let coin = SKShapeNode(circleOfRadius: 11)
        coin.fillColor = gold
        coin.strokeColor = .white
        coin.lineWidth = 1
        coin.glowWidth = 5
        coin.name = "scroller"
        coin.zPosition = ZPosition.coin
        coin.position = point

        let body = SKPhysicsBody(circleOfRadius: 11)
        body.isDynamic = false
        body.categoryBitMask = PhysicsCategory.coin
        body.contactTestBitMask = PhysicsCategory.player
        body.collisionBitMask = PhysicsCategory.none
        coin.physicsBody = body

        coin.run(.repeatForever(.sequence([
            .scale(to: 1.15, duration: 0.5),
            .scale(to: 1.0, duration: 0.5)
        ])))
        addChild(coin)
    }

    private func cullOffscreen() {
        for node in children where node.name == "scroller" && node.position.x < -120 {
            node.removeFromParent()
        }
    }

    private func removeObstaclesAndCoins() {
        for node in children where node.name == "scroller" {
            node.removeFromParent()
        }
    }

    private func clearHazardsNearPlayer() {
        for node in children where node.name == "scroller" {
            if node.physicsBody?.categoryBitMask == PhysicsCategory.obstacle,
               node.position.x < size.width * 0.75 {
                node.removeFromParent()
            }
        }
    }

    // MARK: - Contacts

    func didBegin(_ contact: SKPhysicsContact) {
        let mask = contact.bodyA.categoryBitMask | contact.bodyB.categoryBitMask

        if mask & PhysicsCategory.obstacle != 0 {
            die()
        } else if mask & PhysicsCategory.coin != 0 {
            let coinNode = (contact.bodyA.categoryBitMask == PhysicsCategory.coin)
                ? contact.bodyA.node : contact.bodyB.node
            collectCoin(coinNode)
        }
    }

    private func collectCoin(_ node: SKNode?) {
        guard let node, node.parent != nil else { return }
        coinsThisRun += GameConfig.coinValue
        comboCount += 1

        var bonus = false
        if comboCount % GameConfig.comboBonusEvery == 0 {
            bonus = true
            scoreAccumulator += 1
        }

        let coins = coinsThisRun
        let combo = comboCount
        let score = Int(scoreAccumulator)
        publish {
            $0.coins = coins
            $0.combo = combo
            if bonus { $0.score = score }
        }

        emitPickupSpark(at: node.position)
        node.removeFromParent()
    }

    private func die() {
        guard isAlive else { return }
        isAlive = false
        emitDeathBurst()
        run(.sequence([.wait(forDuration: 0.35),
                       .run { [weak self] in self?.onDeath?() }]))
    }

    // MARK: - FX

    private func emitJumpBurst() {
        let ring = SKShapeNode(circleOfRadius: GameConfig.playerRadius)
        ring.strokeColor = neon
        ring.lineWidth = 2
        ring.glowWidth = 4
        ring.position = player.position
        ring.zPosition = ZPosition.fx
        addChild(ring)
        ring.run(.sequence([
            .group([.scale(to: 2.2, duration: 0.3), .fadeOut(withDuration: 0.3)]),
            .removeFromParent()
        ]))
    }

    private func emitPickupSpark(at point: CGPoint) {
        let spark = SKShapeNode(circleOfRadius: 6)
        spark.fillColor = gold
        spark.strokeColor = .clear
        spark.glowWidth = 6
        spark.position = point
        spark.zPosition = ZPosition.fx
        addChild(spark)
        spark.run(.sequence([
            .group([.scale(to: 2.5, duration: 0.25), .fadeOut(withDuration: 0.25)]),
            .removeFromParent()
        ]))
    }

    private func emitDeathBurst() {
        for _ in 0..<14 {
            let p = SKShapeNode(circleOfRadius: CGFloat.random(in: 2...5))
            p.fillColor = danger
            p.strokeColor = .clear
            p.glowWidth = 3
            p.position = player.position
            p.zPosition = ZPosition.fx
            addChild(p)
            let dx = CGFloat.random(in: -120...120)
            let dy = CGFloat.random(in: -120...120)
            p.run(.sequence([
                .group([.moveBy(x: dx, y: dy, duration: 0.5), .fadeOut(withDuration: 0.5)]),
                .removeFromParent()
            ]))
        }
        player.run(.fadeOut(withDuration: 0.3))
    }

    private func flashPlayer() {
        player.alpha = 1
        player.run(.repeat(.sequence([.fadeAlpha(to: 0.3, duration: 0.12),
                                      .fadeAlpha(to: 1, duration: 0.12)]), count: 4))
    }

    // MARK: - Helpers

    /// Mutate the shared `GameState` on the main thread.
    private func publish(_ block: @escaping (GameState) -> Void) {
        guard let state else { return }
        if Thread.isMainThread {
            block(state)
        } else {
            DispatchQueue.main.async { block(state) }
        }
    }
}
