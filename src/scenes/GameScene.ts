import * as THREE from 'three';
import { Scene } from './Scene';
import { Logger } from '@/utils/Logger';
import { GameConstants, GameEvents } from '@/utils/Constants';
import { Player } from '@/entities/Player';
import { Obstacle } from '@/entities/Obstacle';
import type { ObstacleType } from '@/entities/Obstacle';
import type { Game } from '@/core/Game';
import { ScoreManager } from '@/systems/Score';
import { SettingsManager, type Difficulty } from '@/systems/Settings';

/**
 * W3-C.4: difficulty -> obstacle spawn parameters.
 *
 * The user's difficulty (persisted in LocalStorage under the settings key)
 * scales how often obstacles spawn and how fast they move. `spawnRateMultiplier`
 * divides the base OBSTACLE_SPAWN_RATE (lower = more frequent spawns),
 * `obstacleSpeedMultiplier` multiplies the per-frame obstacle movement.
 *
 *   easy   — spawn slower, obstacles slower (spawnRateMultiplier > 1, speed < 1)
 *   normal — baseline (both 1.0)
 *   hard   — spawn faster, obstacles faster (spawnRateMultiplier < 1, speed > 1)
 */
const DIFFICULTY_PARAMS: Record<Difficulty, {
  spawnRateMultiplier: number;
  obstacleSpeedMultiplier: number;
}> = {
  easy: { spawnRateMultiplier: 1.5, obstacleSpeedMultiplier: 0.8 },
  normal: { spawnRateMultiplier: 1.0, obstacleSpeedMultiplier: 1.0 },
  hard: { spawnRateMultiplier: 0.6, obstacleSpeedMultiplier: 1.4 },
};

/**
 * Main gameplay scene
 */
export class GameScene extends Scene {
  private player: Player | null = null;
  private obstacles: Obstacle[] = [];
  private level = 1;
  private isGameOver = false;
  private obstacleSpawnTimer = 0;
  private scoreManager: ScoreManager;
  /**
   * W3-C.3b: pre-allocated camera-follow target. onUpdate() used to build a
   * `new THREE.Vector3(...)` every frame for the camera lerp — one heap
   * allocation per rendered frame on the hottest path. Reusing this vector
   * (set() in place) removes that per-frame allocation.
   */
  private readonly camTarget = new THREE.Vector3();
  /**
   * W3-C.4: difficulty-driven spawn parameters, resolved from the persisted
   * settings on every onEnter(). Read by the spawn timer (onUpdate) and the
   * per-frame obstacle movement so 'hard' spawns faster + obstacles move
   * faster, 'easy' the opposite. Defaults to 'normal' until first enter.
   */
  private difficulty: Difficulty = 'normal';
  private spawnRateMultiplier = 1.0;
  private obstacleSpeedMultiplier = 1.0;
  
  constructor(game: Game) {
    super(game);
    this.scoreManager = new ScoreManager();
    Logger.info('Game scene created');
  }
  
  /**
   * Create main game camera
   */
  protected createCamera(): THREE.Camera {
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 15);
    camera.lookAt(0, 0, 0);
    return camera;
  }
  
  /**
   * Load game assets
   */
  // eslint-disable-next-line @typescript-eslint/require-await -- preserves the base class async contract; asset loading is synchronous in the retroactive baseline
  protected async onLoad(): Promise<void> {
    Logger.info('Loading game scene assets...');
    
    // Setup scene
    this.setupScene();
    
    // Create player
    this.player = new Player(new THREE.Vector3(0, 1, 0));
    this.scene.add(this.player.getMesh());
    
    // Create initial obstacles
    this.spawnObstacles(3);
    
    // Setup lights
    this.setupLights();
    
    // Setup event listeners
    this.setupEventListeners();
    
    Logger.info('Game scene loaded');
  }
  
  /**
   * Enter game scene
   *
   * W3A.5: Reset all run state on every entry so re-entering after a
   * restart (Menu -> Game) starts a fresh run with no stale state from
   * the prior run (player position, score, health, obstacles, level).
   *
   * W3-B.0: Install deterministic debug accessors on window so Playwright
   * E2E specs (B3 CP2, B4 CP3, B5 CP4) can read and drive game state
   * without timing-dependent collision choreography.
   */
  protected onEnter(): void {
    // W3A.5: Reset all run state on every entry so re-entering after a
    // restart (Menu -> Game) starts a fresh run with no stale state from
    // the prior run (player position, score, health, obstacles, level).
    this.resetRunState();

    // W3-C.4: resolve the persisted difficulty into spawn parameters so the
    // run respects the user's chosen difficulty.
    this.applyDifficultySettings();

    // W3A.2: HUD visibility is owned by UISystem (D2). Push the current
    // state so the HUD divs become visible with the correct text.
    if (this.player) {
      const state = this.player.getState();
      this.game.getUISystem().setScore(this.scoreManager.getScore());
      this.game.getUISystem().setHealth(state.health);
      this.game.getUISystem().setLevel(this.level);
    }

    // W3-B.0: Install deterministic debug accessors on window.
    // These are read by Playwright E2E specs to verify game state
    // without relying on collision timing or DOM scraping.
    // Installed on every enter() so they always reference the
    // current run's player and scoreManager (fresh after reset).
    (window as any).__debugPlayerPos = () => {
      const pos = this.player?.getPosition();
      return pos ? { x: pos.x, z: pos.z } : { x: 0, z: 0 };
    };
    (window as any).__setPlayerHealth = (n: number) => {
      this.player?.setHealth(n);
    };
    (window as any).__debugScore = () => {
      return this.scoreManager.getScore();
    };

    Logger.debug('Game scene entered');
  }
  
  /**
   * Update game scene
   */
  protected onUpdate(deltaTime: number): void {
    if (this.isGameOver || !this.player?.isPlayerAlive()) return;
    
    // W3-B.0: Deterministic death check. If __setPlayerHealth(0) was called,
    // the player's health is 0 and the update loop must trigger game-over
    // on the next frame — no collision required. This makes the B5 CP4
    // restart test deterministic: set health to 0, call update(), and the
    // scene transitions to gameover without timing-dependent collision.
    if (this.player.getState().health <= 0) {
      this.gameOver();
      return;
    }
    
    // Update player
    // W3-C.3b: read the live key state BY REFERENCE via getKeys() (zero
    // allocations) instead of getInputState() which spread {...this.keys} into
    // a fresh object every frame. Falls back to getInputState().keys when the
    // input source has no getKeys() (unit-test mocks). Input is batched: DOM
    // keydown/keyup events write the map; the frame loop reads it once here,
    // at the start of the scene update, before physics/render.
    const inputSystem = this.game.getInputSystem() as {
      getKeys?: () => Record<string, boolean>;
      getInputState?: () => { keys: Record<string, boolean> };
    };
    const keyState: Record<string, boolean> =
      typeof inputSystem.getKeys === 'function'
        ? inputSystem.getKeys()
        : inputSystem.getInputState?.().keys ?? {};
    this.player.update(deltaTime, keyState);
    
    // Camera follows the player (smooth lerp)
    // W3-C.3b: mutate the pre-allocated camTarget in place instead of
    // allocating a new THREE.Vector3 every frame.
    const playerPos = this.player.getPosition();
    this.camTarget.set(
      playerPos.x * 0.5,
      8 + playerPos.y * 0.5,
      playerPos.z + 12
    );
    const lerpFactor = 1 - Math.pow(0.001, deltaTime);
    this.camera.position.lerp(this.camTarget, lerpFactor);
    this.camera.lookAt(playerPos.x * 0.5, 2, playerPos.z - 10);
    
    // Update obstacles
    // W3-C.4: scale per-frame obstacle movement by the difficulty's
    // obstacleSpeedMultiplier (hard moves faster, easy slower).
    for (const obstacle of this.obstacles) {
      obstacle.update(deltaTime * this.obstacleSpeedMultiplier);
    }
    
    // Spawn new obstacles
    // W3-C.4: divide the base spawn rate by the difficulty's
    // spawnRateMultiplier (hard => smaller interval => more frequent spawns).
    this.obstacleSpawnTimer += deltaTime;
    const spawnInterval =
      GameConstants.OBSTACLE_SPAWN_RATE / this.level / this.spawnRateMultiplier;
    if (this.obstacleSpawnTimer >= spawnInterval) {
      this.spawnObstacle();
      this.obstacleSpawnTimer = 0;
    }
    
    // Check collisions
    this.checkCollisions();
    
    // W3A.2: HUD is owned by UISystem (D2). Push current state each frame
    // so the HUD divs stay in sync with the game state.
    if (this.player) {
      const state = this.player.getState();
      this.game.getUISystem().setScore(this.scoreManager.getScore());
      this.game.getUISystem().setHealth(state.health);
      this.game.getUISystem().setLevel(this.level);
    }
  }
  
  /**
   * Exit game scene
   */
  protected onExit(): void {
    // W3A.2: HUD is owned by UISystem (D2). Hide the HUD divs when leaving
    // the game scene so they are not visible on the game-over / menu scenes
    // (W3A.6 S3: "Game HUD must be hidden in the game-over scene").
    this.game.getUISystem().hideHud();
    Logger.debug('Game scene exited');
  }
  
  /**
   * Clean up game scene
   */
  protected onCleanup(): void {
    this.obstacles.forEach(obstacle => {
      this.scene.remove(obstacle.getMesh());
    });
    
    if (this.player) {
      this.scene.remove(this.player.getMesh());
    }
    
    this.obstacles = [];
    this.player = null;
    
    // W3A.2: HUD is owned by UISystem (D2). The HUD divs are removed by
    // Game.cleanup() calling uiSystem.cleanup(). GameScene does not
    // remove them directly.
    Logger.debug('Game scene cleaned up');
  }
  
  /**
   * Setup game scene
   */
  private setupScene(): void {
    // Add ground
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333,
      metalness: 0.1,
      roughness: 0.8
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);
    
    // Add sky
    this.scene.background = new THREE.Color(0x87CEEB);
  }
  
  /**
   * Setup lighting
   */
  private setupLights(): void {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 10);
    this.scene.add(directionalLight);
    
    // Hemisphere light
    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x006400, 0.3);
    this.scene.add(hemisphereLight);
  }
  
  /**
   * Spawn initial obstacles
   */
  private spawnObstacles(count: number): void {
    for (let i = 0; i < count; i++) {
      const type = this.getRandomObstacleType();
      const position = new THREE.Vector3(
        (Math.random() - 0.5) * 20,
        0.5,
        -10 - i * 10
      );
      
      const obstacle = new Obstacle(position, type);
      this.scene.add(obstacle.getMesh());
      this.obstacles.push(obstacle);
    }
  }
  
  /**
   * Spawn single obstacle
   */
  private spawnObstacle(): void {
    const type = this.getRandomObstacleType();
    const position = new THREE.Vector3(
      (Math.random() - 0.5) * 20,
      0.5,
      -30
    );
    
    const obstacle = new Obstacle(position, type);
    this.scene.add(obstacle.getMesh());
    this.obstacles.push(obstacle);
    
    Logger.debug('Obstacle spawned', { type, position });
  }
  
  /**
   * Get random obstacle type
   */
  private getRandomObstacleType(): ObstacleType {
    const types: ObstacleType[] = [
      'block', 'spike', 'moving', 'rotating', 'breakable'
    ];
    return types[Math.floor(Math.random() * types.length)];
  }
  
  /**
   * Check collisions
   */
  private checkCollisions(): void {
    if (!this.player) return;
    
    const playerPosition = this.player.getPosition();
    const playerRadius = 3.5;
    
    for (const obstacle of this.obstacles) {
      if (!obstacle.isObstacleActive()) continue;
      
      const obstaclePosition = obstacle.getMesh().position;
      const obstacleRadius = 3.0;
      
      const distance = playerPosition.distanceTo(obstaclePosition);
      
      if (distance < playerRadius + obstacleRadius) {
        this.handleCollision(obstacle);
      }
    }
  }
  
  /**
   * Handle collision
   */
  private handleCollision(obstacle: Obstacle): void {
    if (!this.player) return;

    this.player.damage(obstacle.getDamage());

    // W2-C.2: fire the collide SFX trigger. The AudioSystem (bound in
    // Game.start()) listens for this window event and calls
    // playSfx('collide'). Emitted on every collision so the SFX stays
    // in sync with the physics.
    window.dispatchEvent(new CustomEvent(GameEvents.PLAYER_COLLIDE));

    if (obstacle.getType() === 'breakable') {
      obstacle.deactivate();
      this.scoreManager.addScore(100);
    }
    
    Logger.info('Collision detected', { 
      playerHealth: this.player.getState().health,
      obstacleType: obstacle.getType(),
      damage: obstacle.getDamage()
    });
  }
  
  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    window.addEventListener(GameEvents.PLAYER_SCORE, (e: Event) => {
      const points = (e as CustomEvent<{ points: number }>).detail?.points;
      if (this.player && typeof points === 'number') {
        this.scoreManager.addScore(points);
      }
    });
    
    window.addEventListener(GameEvents.PLAYER_DEATH, () => {
      this.gameOver();
    });
  }
  
  /**
   * Game over handler
   *
   * W3A.5: Replace the inline DOM overlay with a scene transition to the
   * GameOverScene. The final score and high score are passed via the
   * switchScene data payload so GameOverScene can display them.
   *
   * No inline DOM creation — the D2 HUD-ownership rule applies: all
   * display logic lives in dedicated scenes / the UISystem.
   */
  private gameOver(): void {
    this.isGameOver = true;
    
    // Persist high score before transitioning.
    this.scoreManager.saveHighScore();
    const score = this.scoreManager.getScore();
    const highScore = this.scoreManager.getHighScore();
    
    Logger.info('Game over — transitioning to gameover scene', { 
      score,
      highScore,
      level: this.level
    });
    
    // W3A.5: transition to the GameOverScene with the score data.
    const transition = this.game.switchScene('gameover', { score, highScore });
    Promise.resolve(transition).catch((error: unknown) => {
      Logger.error('Failed to transition to gameover scene', { error });
      // Re-arm: clear the game-over flag so the update loop can continue
      // if the transition fails (e.g. 'gameover' not registered).
      this.isGameOver = false;
    });
  }
  
  // W3-B.0: getter for test access (debug accessor support)
  getPlayer() { return this.player; }

  /**
   * W3-C.4: resolve the persisted difficulty into this run's spawn
   * parameters. Reads the settings from LocalStorage (never throws —
   * corrupt/missing storage degrades to 'normal') and stores the matching
   * multipliers.
   *
   * Exposed for unit-test inspection: `getDifficultyParams()` returns the
   * current { spawnRateMultiplier, obstacleSpeedMultiplier }.
   */
  private applyDifficultySettings(): void {
    const settings = new SettingsManager().load();
    this.difficulty = settings.difficulty;
    const params = DIFFICULTY_PARAMS[this.difficulty];
    this.spawnRateMultiplier = params.spawnRateMultiplier;
    this.obstacleSpeedMultiplier = params.obstacleSpeedMultiplier;
    Logger.debug('Game scene difficulty applied', {
      difficulty: this.difficulty,
      spawnRateMultiplier: this.spawnRateMultiplier,
      obstacleSpeedMultiplier: this.obstacleSpeedMultiplier,
    });
  }

  /** W3-C.4: read access to the resolved difficulty (test/E2E support). */
  getDifficulty(): Difficulty {
    return this.difficulty;
  }

  /** W3-C.4: read access to the resolved spawn params (test support). */
  getDifficultyParams(): {
    spawnRateMultiplier: number;
    obstacleSpeedMultiplier: number;
  } {
    return {
      spawnRateMultiplier: this.spawnRateMultiplier,
      obstacleSpeedMultiplier: this.obstacleSpeedMultiplier,
    };
  }
  
  /**
   * Reset all run state for a fresh game run.
   *
   * Called from onEnter() so re-entering the GameScene (after a restart
   * via Menu) starts with clean state: fresh player at spawn, zero score,
   * full health, initial obstacle set, level 1, and the update loop re-enabled.
   *
   * This is the state-reset that replaces the old location.reload() behavior:
   * instead of a full page reload, we reset the in-memory run state in place.
   */
  private resetRunState(): void {
    // Reset flags.
    this.isGameOver = false;
    this.level = 1;
    this.obstacleSpawnTimer = 0;
    
    // Fresh score manager (reads high score from localStorage).
    this.scoreManager = new ScoreManager();
    
    // Clear existing obstacles from the scene and array.
    for (const obstacle of this.obstacles) {
      this.scene.remove(obstacle.getMesh());
    }
    this.obstacles = [];
    
    // Recreate the player at the spawn point (0, 1, 0) with full health.
    if (this.player) {
      this.scene.remove(this.player.getMesh());
    }
    this.player = new Player(new THREE.Vector3(0, 1, 0));
    this.scene.add(this.player.getMesh());
    
    // Respawn the initial obstacle set.
    this.spawnObstacles(3);
    
    Logger.debug('Game scene run state reset', {
      player: this.player.getPosition().toArray(),
      score: this.scoreManager.getScore(),
      level: this.level,
      obstacles: this.obstacles.length,
    });
  }
}
