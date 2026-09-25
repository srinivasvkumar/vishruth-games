import * as THREE from 'three';
import { Scene } from './Scene';
import { Logger } from '@/utils/Logger';
import { GameConstants, GameEvents } from '@/utils/Constants';
import { Player } from '@/entities/Player';
import { Obstacle, type ObstacleType } from '@/entities/Obstacle';
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
  /**
   * W4-B.11: object pool for obstacles. `spawnObstacle()` pulls from here
   * before allocating a new Obstacle; `reapObstacles()` pushes off-screen /
   * deactivated obstacles back here instead of dropping them. The pool keeps
   * the live obstacle count bounded and reuses the shared geometry/material
   * caches across re-spawns — no per-spawn GPU allocation.
   */
  private readonly obstaclePool: Obstacle[] = [];
  /** W4-B.11: reap threshold — obstacles past this z are off-screen behind
   * the camera and are recycled into the pool instead of living forever. */
  private static readonly REAP_Z = -250;
  /**
   * W4-B.10: true while the run is paused because the tab lost focus
   * (window blur). Set true by the blur handler (which calls
   * `game.pause()`), cleared by the focus handler (which calls
   * `game.resume()`). Guard so focus only resumes a blur-induced pause and
   * blur only pauses a running game.
   */
  private isPaused = false;
  /**
   * W4-B.10: the "PAUSED" overlay element. A transient gameplay-state
   * overlay (NOT a HUD div — D2 HUD-ownership applies to score/health/level),
   * so GameScene owns it directly. Created in setupEventListeners() and
   * removed in onCleanup(). Hidden by default; shown on blur, hidden on focus.
   */
  private pausedOverlayEl: HTMLDivElement | null = null;

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

    // W4-B.9: window resize handler — keep the active camera's aspect ratio
    // and the shared WebGL viewport in sync with the viewport so a resize
    // during gameplay does not leave the 3D view stretched or letterboxed.
    window.addEventListener('resize', this.handleResize);

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
    
    // W4-B.11: reap off-screen obstacles into the pool. Runs at the start of
    // every frame so the spawn timer below always sees a warm pool. Also
    // bounds the live obstacle array under sustained spawning (500+).
    this.reapOffscreenObstacles();
    
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

    // W4-B.10: if the run was blur-paused, hide the "PAUSED" overlay and
    // clear the flag so it does not bleed through to the next scene. The
    // game FSM stays in whatever state the loop is in — we only hide the
    // transient overlay and drop the scene-local flag.
    if (this.isPaused) {
      this.isPaused = false;
      this.hidePausedOverlay();
    }
    Logger.debug('Game scene exited');
  }
  
  /**
   * Clean up game scene
   */
  protected onCleanup(): void {
    // W4-B.11: dispose all obstacles (live + pooled) instead of just
    // removing their meshes. dispose() detaches the mesh, resets state, and
    // drops the instance from the tracking array. Shared GPU resources are
    // retained (module-level caches).
    this.disposeAllObstacles();
    
    if (this.player) {
      this.scene.remove(this.player.getMesh());
    }
    
    this.player = null;

    // W4-B.9: detach the window resize listener so leaving the game scene
    // does not leak a handler that would keep mutating a dead camera.
    window.removeEventListener('resize', this.handleResize);

    // W4-B.10: detach the window blur/focus listeners and remove the
    // "PAUSED" overlay so a cleaned-up scene leaves no dangling listeners or
    // DOM nodes. The isPaused flag is reset (idempotent, re-enter safe).
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('focus', this.handleFocus);
    if (this.pausedOverlayEl) {
      this.pausedOverlayEl.remove();
      this.pausedOverlayEl = null;
    }
    this.isPaused = false;

    // W3A.2: HUD is owned by UISystem (D2). The HUD divs are removed by
    // Game.cleanup() calling uiSystem.cleanup(). GameScene does not
    // remove them directly.
    Logger.debug('Game scene cleaned up');
  }

  /**
   * W4-B.9: window resize handler.
   *
   * When the browser window is resized during active gameplay this must:
   *   1. Update the active camera's aspect ratio to the new viewport
   *      (window.innerWidth / window.innerHeight) and call
   *      updateProjectionMatrix() so the perspective projection rebuilds.
   *      Without this the 3D view is stretched / letterboxed.
   *   2. Resize the shared WebGL renderer to the #game-container so the
   *      canvas fills the screen (mobile rotation included).
   *
   * The HUD is owned by UISystem (D2) and uses fixed-px corner offsets,
   * which are resolution-independent by construction — no re-layout needed
   * here. This handler owns only the 3D viewport (camera + renderer).
   *
   * Guarded against a missing container / zero-size so a resize fired
   * before layout (or on a hidden tab) cannot produce a NaN aspect.
   */
  private handleResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (!width || !height) return;

    // 1. Update the active camera's aspect ratio + projection.
    const camera = this.camera as THREE.PerspectiveCamera;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    // 2. Resize the shared WebGL viewport to the game container.
    const container = document.getElementById('game-container');
    if (container) {
      this.game.getRenderer().resizeToContainer(container);
    } else {
      // Fallback (e.g. unit tests / embedded setups without #game-container):
      // resize the renderer directly to the viewport dimensions.
      this.game.getRenderer().resize(width, height);
    }
  };
  
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
   * W4-B.11: reap off-screen obstacles into the pool.
   *
   * Scans `this.obstacles`; for each one past `REAP_Z` behind the player,
   * dispose() the instance (releases the mesh from the scene graph, resets
   * per-instance state — shared geometry/material are retained), push it to
   * `this.obstaclePool`, and remove it from the tracking array.
   *
   * In-place filter (single pass, no intermediate array):
   *   - i advances to the next non-reaped index,
   *   - the write index (j) only advances when we keep an obstacle.
   *
   * Bounded at REAP_Z because:
   *   1. it keeps the live obstacle array from growing unboundedly under
   *      sustained spawning (the low-memory failure mode W4-B.11 targets),
   *   2. it keeps the pool warm so the next spawnObstacle() pulls a pooled
   *      instance instead of `new Obstacle(...)`.
   */
  private reapOffscreenObstacles(): void {
    if (this.obstacles.length === 0) return;
    const REAP_Z = GameScene.REAP_Z;
    let j = 0;
    for (let i = 0; i < this.obstacles.length; i++) {
      const o = this.obstacles[i];
      if (o.getMesh().position.z > REAP_Z) {
        // Still on-screen — keep it.
        if (j !== i) {
          this.obstacles[j] = o;
        }
        j++;
      } else {
        // Off-screen — reap.
        this.scene.remove(o.getMesh());
        o.dispose();
        this.obstaclePool.push(o);
      }
    }
    this.obstacles.length = j;
  }
  
  /**
   * W4-B.11: dispose all live obstacles at scene teardown.
   *
   * Called from onExit(). Disposes each obstacle's instance-owned resources
   * and clears the tracking array. The pool's reaped instances are dropped
   * too — they have already had their mesh detached by dispose().
   *
   * Shared geometry/material caches are NOT disposed here: they are
   * module-level and survive across scene transitions (the next game scene
   * will reuse them). Disposing them at scene exit would force the next
   * scene to re-allocate, defeating the purpose of the cache.
   */
  private disposeAllObstacles(): void {
    for (const o of this.obstacles) {
      this.scene.remove(o.getMesh());
      o.dispose();
    }
    this.obstacles.length = 0;
    // Drop pooled instances — they have already been disposed, so just
    // clear the array. No double-dispose.
    this.obstaclePool.length = 0;
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
      
      const obstacle = this.allocateObstacle(position, type);
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
    
    const obstacle = this.allocateObstacle(position, type);
    this.scene.add(obstacle.getMesh());
    this.obstacles.push(obstacle);
    
    Logger.debug('Obstacle spawned', { type, position });
  }
  
  /**
   * W4-B.11: pull an obstacle from the pool or allocate a fresh one.
   *
   * Pool-first: when a reaped obstacle is available, `reset()` repositions
   * it, re-types it, and re-activates it instead of constructing a new
   * Obstacle. The re-typed obstacle swaps in the shared material for the new
   * type and the shared geometry for its size — no GPU allocation on the hot
   * spawn path.
   *
   * Fall back to `new Obstacle(position, type)` only when the pool is empty
   * (cold start or a burst of simultaneous spawns larger than the pool).
   */
  private allocateObstacle(position: THREE.Vector3, type: ObstacleType): Obstacle {
    const pooled = this.obstaclePool.pop();
    if (pooled) {
      // The caller re-adds the mesh to the scene graph.
      pooled.reset(position, type);
      return pooled;
    }
    return new Obstacle(position, type);
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
   *
   * W4-B.10: window blur/focus are added here so the tab-switching edge case
   * is handled: blur pauses the run + shows the "PAUSED" overlay, focus
   * resumes it + hides the overlay. The overlay is created lazily (idempotent
   * — reuses #game-paused-overlay if a prior instance left it in the DOM).
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

    // W4-B.10: tab blur/focus -> pause/resume the game loop.
    this.createPausedOverlay();
    window.addEventListener('blur', this.handleBlur);
    window.addEventListener('focus', this.handleFocus);
  }

  /**
   * W4-B.10: window blur handler — the user switched away from the tab.
   *
   * Only acts while the game is actually playing (`game.isGameRunning()`):
   * pausing from menu / game-over is a no-op the FSM would block anyway, and
   * the `isPaused` guard makes repeated blurs idempotent (no double-pause).
   * Calls `game.pause()` (FSM: playing -> paused; the rAF loop halts) and
   * shows the "PAUSED" overlay.
   */
  private handleBlur = (): void => {
    if (this.isPaused) return;
    if (!this.game.isGameRunning()) return;
    this.isPaused = true;
    this.game.pause();
    this.showPausedOverlay();
    Logger.debug('GameScene: window blur -> paused');
  };

  /**
   * W4-B.10: window focus handler — the user returned to the tab.
   *
   * Only resumes a blur-induced pause (`isPaused` true): focus in any other
   * state is a no-op (avoids resuming a game the user paused manually or a
   * game that is not in the paused FSM state). Calls `game.resume()`
   * (FSM: paused -> playing; the rAF loop restarts) and hides the overlay.
   */
  private handleFocus = (): void => {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.game.resume();
    this.hidePausedOverlay();
    Logger.debug('GameScene: window focus -> resumed');
  };

  /**
   * W4-B.10: create the "PAUSED" overlay div (idempotent). A fixed,
   * full-viewport, centered overlay with the text "PAUSED", hidden by default
   * (display:none) so it never bleeds through before the first blur.
   */
  private createPausedOverlay(): void {
    const existing = document.getElementById('game-paused-overlay') as
      HTMLDivElement | null;
    if (existing) {
      this.pausedOverlayEl = existing;
      return;
    }
    const el = document.createElement('div');
    el.id = 'game-paused-overlay';
    el.textContent = 'PAUSED';
    el.style.cssText = [
      'position: fixed',
      'top: 0',
      'left: 0',
      'width: 100vw',
      'height: 100vh',
      'display: none',
      'align-items: center',
      'justify-content: center',
      'text-align: center',
      'font-family: monospace',
      'font-size: 48px',
      'font-weight: bold',
      'color: white',
      'text-shadow: 2px 2px 4px black',
      'background: rgba(0, 0, 0, 0.55)',
      'z-index: 200',
      'pointer-events: none'
    ].join('; ');
    document.body.appendChild(el);
    this.pausedOverlayEl = el;
  }

  /** W4-B.10: show the "PAUSED" overlay (no-op if cleaned up / absent). */
  private showPausedOverlay(): void {
    if (this.pausedOverlayEl) {
      this.pausedOverlayEl.style.display = 'flex';
    }
  }

  /** W4-B.10: hide the "PAUSED" overlay (no-op if cleaned up / absent). */
  private hidePausedOverlay(): void {
    if (this.pausedOverlayEl) {
      this.pausedOverlayEl.style.display = 'none';
    }
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
