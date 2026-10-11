import { SceneManager } from '@/core/SceneManager';
import { GameStateMachine } from '@/core/State';
import type { GameState } from '@/core/State';
import { InputSystem } from '@/systems/Input';
import { PhysicsSystem } from '@/systems/Physics';
import { AudioSystem } from '@/systems/Audio';
import { UISystem } from '@/systems/UI';
import { AccessibilitySystem } from '@/systems/Accessibility';
import { BodySync } from '@/systems/BodySync';
import { Renderer } from '@/core/Renderer';
import { AssetLoader } from '@/utils/AssetLoader';
import { Logger } from '@/utils/Logger';
import type { GameConfig } from '@/types/GameTypes';

/**
 * Options for the Game constructor (W2-A.2).
 */
export interface GameOptions {
  /**
   * Shared Renderer to use for all scenes (W2-A.2).
   * When omitted, Game creates one on #game-canvas during init.
   */
  renderer?: Renderer;
}

/**
 * Main Game class that orchestrates all game systems
 *
 * W2-D.2: lifecycle is now driven by a formal `GameStateMachine`
 * (src/core/State.ts) instead of the ad-hoc `isRunning` flag. States:
 *   menu -> playing -> paused -> gameOver -> restart
 * Only transitions in the FSM table are applied; all others are blocked
 * (no state change, no side effects) and `game:state:change` is emitted
 * on every valid transition.
 */
export class Game {
  private sceneManager: SceneManager;
  private inputSystem: InputSystem;
  private physicsSystem: PhysicsSystem;
  private audioSystem: AudioSystem;
  private uiSystem: UISystem;
  private accessibilitySystem: AccessibilitySystem;
  private physicsSync: BodySync;
  private renderer: Renderer;
  private fsm: GameStateMachine;
  private lastTimestamp = 0;
  /** W5 FIX: frame-pump lifecycle flag, decoupled from the run FSM. */
  private running = false;
  /**
   * W3-C.4: game-speed multiplier applied to the frame delta time in the
   * game loop (settings: 0.5x / 1x / 1.5x / 2x). 1.0 = normal speed.
   * Set from the menu settings panel via setSpeedMultiplier(); GameScene
   * also applies the user's speed to its own update path on entry.
   */
  private speedMultiplier = 1.0;
  
  constructor(config: GameConfig, options: GameOptions = {}) {
    this.sceneManager = new SceneManager(this);
    this.inputSystem = new InputSystem();
    this.physicsSystem = new PhysicsSystem(config.physics);
    // W2-B.1 (Task 6.2): Game owns the BodySync — the single system that
    // keeps the visual THREE meshes in sync with the Cannon-es bodies.
    // Built from the PhysicsSystem so it sees every registered body.
    this.physicsSync = new BodySync(this.physicsSystem);
    this.audioSystem = new AudioSystem(config.audio);
    this.uiSystem = new UISystem(config.ui);
    // W4-B.5: screen-reader announcements for scene transitions — a
    // visually-hidden aria-live region the SceneManager updates on every
    // scene change. Owned here alongside the other systems.
    this.accessibilitySystem = new AccessibilitySystem();

    // W2-A.2: shared renderer — one WebGL context for the whole game,
    // owned by Game and passed to the SceneManager, instead of each
    // Scene building its own detached WebGLRenderer (Scene.ts:20 pre-change).
    // If a renderer is provided (tests / embedded setups) use it; otherwise
    // create one on the #game-canvas element if present, falling back to
    // a detached canvas in environments without a DOM canvas (unit tests).
    if (options.renderer) {
      this.renderer = options.renderer;
    } else {
      const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
      this.renderer = canvas
        ? new Renderer({ canvas, width: canvas.clientWidth || 800, height: canvas.clientHeight || 600 })
        : new Renderer();
    }

    // W2-D.2: formal game state machine — single source of truth for
    // the run lifecycle.
    this.fsm = new GameStateMachine();
    
    Logger.info('Game initialized', { config });
  }
  
  /**
   * Start the game loop
   *
   * W5 FIX: two lifecycle paths.
   *   - boot(): spin the frame pump WITHOUT touching the FSM. index.ts uses
   *     this at page load, so the app boots in 'menu' and the FSM stays in
     * sync with the visible scene. The loop is gated on this.running (not
   * FSM state) so menu/gameover scenes animate and render.
   *   - start(): legacy run-start contract (menu -> playing); retained for
   *     the W2 lifecycle tests. beginRun() is what the menu START uses.
   */
  boot(): void {
    if (this.running) {
      Logger.debug('Game boot ignored: frame pump already running');
      return;
    }
    Logger.info('Booting game (frame pump, FSM stays in menu)');
    this.lastTimestamp = performance.now();
    this.running = true;
    this.gameLoop(this.lastTimestamp);

    // AssetLoader hook + first-scene boot (same wiring as start()).
    const BOOT_ASSET_MANIFEST = '/assets/manifest/boot.json';
    void AssetLoader.load(BOOT_ASSET_MANIFEST, 'json').catch((error: unknown) => {
      Logger.error('Boot asset manifest load failed', { BOOT_ASSET_MANIFEST, error });
    });
    const bootSceneName = this.sceneManager.getAllScenes().size > 0
      ? this.sceneManager.getAllScenes().keys().next().value
      : null;
    if (bootSceneName) {
      void this.sceneManager.loadScene(bootSceneName).catch((error: unknown) => {
        Logger.error('Boot scene load failed', { bootSceneName, error });
      });
    }
    this.audioSystem.bindToGameEvents();
  }

  start(): void {
    if (!this.fsm.transition('playing')) {
      Logger.warn('Game start blocked: not in a startable state', {
        state: this.fsm.getState(),
      });
      return;
    }

    // W2-A.2 (DECISION D1): wire the AssetLoader.load() hook into the boot
    // path. The minimal hook loads the boot scene's essential-asset manifest
    // (JSON) before the first frame is rendered. W3 builds on this with
    // scene-specific asset manifests. The load is fire-and-forget (void) so
    // the boot path is never blocked by a slow asset fetch; failures are
    // logged, not thrown, matching the Logger error contract in this class.
    const BOOT_ASSET_MANIFEST = '/assets/manifest/boot.json';
    void AssetLoader.load(BOOT_ASSET_MANIFEST, 'json').catch((error: unknown) => {
      Logger.error('Boot asset manifest load failed', { BOOT_ASSET_MANIFEST, error });
    });

    // W2-A.2: boot the first registered scene. If the SceneManager has no
    // scenes yet, this is a no-op (loadScene throws on missing name —
    // catch and log so start() remains safe for empty registries).
    const bootSceneName = this.sceneManager.getAllScenes().size > 0
      ? this.sceneManager.getAllScenes().keys().next().value
      : null;
    if (bootSceneName) {
      void this.sceneManager.loadScene(bootSceneName).catch((error: unknown) => {
        Logger.error('Boot scene load failed', { bootSceneName, error });
      });
    }

    // W2-C.2 (Task 6.5.2): wire game events to audio triggers. The AudioSystem
    // subscribes to the GameEvents window events that Game already dispatches
    // (game:pause/resume/stop via emit(), player:jump/collide from the
    // Player, player:powerup from GameScene). Binding here — before the boot
    // scene loads — means the SFX and music-stop wiring is live for the
    // whole session, not just after a scene switch.
    this.audioSystem.bindToGameEvents();

    // W3-C.2: defer AudioContext creation to a user gesture.
    // The context is created lazily by AudioSystem.ensureContext() when
    // markUserGesture() is called (MenuScene on first click/keypress) or
    // when the first SFX/music event fires (which only happens during
    // active gameplay, always post-gesture). Starting music at boot
    // without a gesture triggers the Firefox autoplay warning, so we
    // skip the init()+startMusic() here. Music will start on the
    // GAME_START event (bound via bindToGameEvents above).

    this.running = true;
    this.gameLoop(this.lastTimestamp);
    
    this.emit('game:start');
  }

  /**
   * W5 FIX: begin a run from the menu — the ONLY legal menu -> playing
   * transition. MenuScene.startGame() calls this instead of switchScene
   * directly, so the FSM and the scene agree on which state the game is in.
   */
  beginRun(): Promise<void> {
    if (!this.fsm.transition('playing')) {
      Logger.warn('beginRun blocked: not in a startable state', {
        state: this.fsm.getState(),
      });
      return Promise.reject(new Error(`beginRun blocked from state ${this.fsm.getState()}`));
    }
    this.lastTimestamp = performance.now();
    if (!this.running) {
      this.running = true;
      this.gameLoop(this.lastTimestamp);
    }
    this.emit('game:start');
    return this.switchScene('game').catch((error: unknown) => {
      // Roll the FSM back so the menu can retry the transition cleanly.
      if (this.fsm.getState() === 'playing') this.fsm.transition('paused');
      if (this.fsm.getState() === 'paused') this.fsm.transition('menu');
      throw error;
    });
  }

  /**
   * W5 FIX: abandon the current run and return to the menu. Walks the FSM
   * (playing/paused/gameOver -> ... -> menu) and switches scenes; safe to
   * call from any state.
   */
  returnToMenu(): Promise<void> {
    const s = this.fsm.getState();
    if (s === 'playing') this.fsm.transition('paused');
    if (this.fsm.getState() === 'gameOver') this.fsm.transition('restart');
    if (this.fsm.getState() === 'paused' || this.fsm.getState() === 'restart') {
      this.fsm.transition('menu');
    }
    this.hidePausedOverlayIfAny();
    if (!this.running) {
      this.running = true;
      this.lastTimestamp = performance.now();
      this.gameLoop(this.lastTimestamp);
    }
    return this.switchScene('menu');
  }

  /** W5 FIX: remove any lingering PAUSED overlay when leaving a run. */
  private hidePausedOverlayIfAny(): void {
    const el = document.getElementById('game-paused-overlay');
    if (el) el.style.display = 'none';
  }
  
  /**
   * Pause the game
   */
  pause(): void {
    if (!this.fsm.transition('paused')) {
      Logger.warn('Game pause blocked: not playing', { state: this.fsm.getState() });
      return;
    }
    this.running = false; // pump halts at the next frame gate
    this.emit('game:pause');
    Logger.info('Game paused');
  }
  
  /**
   * Resume the game
   */
  resume(): void {
    if (!this.fsm.transition('playing')) {
      Logger.warn('Game resume blocked: not paused', { state: this.fsm.getState() });
      return;
    }
    this.lastTimestamp = performance.now();
    this.running = true;
    this.gameLoop(this.lastTimestamp);
    this.emit('game:resume');
    Logger.info('Game resumed');
  }
  
  /**
   * Stop the game completely (teardown: -> menu).
   * If currently playing, pauses first (playing -> paused) so the
   * paused -> menu transition is valid.
   */
  stop(): void {
    this.running = false;
    this.cleanup();

    // From playing, we must go through paused to reach menu.
    if (this.fsm.getState() === 'playing') {
      this.fsm.transition('paused');
    }
    // From gameOver, restart must pass through before menu is reachable.
    if (this.fsm.getState() === 'gameOver') {
      this.fsm.transition('restart');
    }

    if (!this.fsm.transition('menu')) {
      Logger.warn('Game stop blocked: paused -> menu transition not available', {
        state: this.fsm.getState(),
      });
    }
    this.emit('game:stop');
    Logger.info('Game stopped');
  }
  
  /**
   * End the current run (playing -> gameOver)
   */
  gameOver(): boolean {
    const ok = this.fsm.transition('gameOver');
    if (ok) {
      Logger.info('Game over');
    }
    return ok;
  }
  
  /**
   * Enter the transitionary restart state (gameOver -> restart).
   * A subsequent `start()` (restart -> playing) begins a fresh run.
   */
  restart(): boolean {
    return this.fsm.transition('restart');
  }
  
  /**
   * Current formal game state.
   */
  getGameState(): GameState {
    return this.fsm.getState();
  }
  
  /**
   * Whether `target` is a legal transition from the current state.
   */
  canTransition(target: GameState): boolean {
    return this.fsm.canTransition(target);
  }
  
  /**
   * Switch to a different scene
   */
  switchScene(sceneName: string, data?: Record<string, unknown>): Promise<void> {
    return this.sceneManager.loadScene(sceneName, data);
  }
  
  /**
   * Main game loop
   */
  private gameLoop(timestamp: number): void {
    if (!this.running) return;
    
    const deltaTime = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    // W3-C.4: apply the settings speed multiplier to the frame delta time so
    // the whole simulation (physics + scene + UI) runs at the user's chosen
    // speed (0.5x / 1x / 1.5x / 2x).
    const scaledDelta = deltaTime * this.speedMultiplier;

    // Update systems
    this.inputSystem.update();
    this.physicsSystem.update(scaledDelta);
    // W2-B.1 (Task 6.2): sync the visual meshes to the (just-stepped)
    // physics bodies, every frame, BEFORE the scene updates — so meshes
    // follow bodies within the same frame, before the scene renders.
    this.physicsSync.sync();
    this.sceneManager.update(scaledDelta);
    this.uiSystem.update(scaledDelta);

    // W2-A.2: render the current scene at the end of every frame, after
    // all systems have updated. The shared renderer draws the active
    // scene's THREE.Scene / camera pair.
    this.sceneManager.render();
    
    // Request next frame
    requestAnimationFrame((time) => this.gameLoop(time));
  }
  
  /**
   * Clean up resources
   */
  private cleanup(): void {
    this.sceneManager.cleanup();
    this.physicsSystem.cleanup();
    // W2-B.1: release mesh registrations before the physics system.
    this.physicsSync.cleanup();
    this.audioSystem.cleanup();
    this.uiSystem.cleanup();
    this.accessibilitySystem.cleanup();
    this.renderer.dispose();
    Logger.info('Game resources cleaned up');
  }
  
  /**
   * Emit game events
   */
  private emit(event: string, data?: unknown): void {
    const customEvent = new CustomEvent(event, { detail: data });
    window.dispatchEvent(customEvent);
  }
  
  // Public getters
  getSceneManager(): SceneManager { return this.sceneManager; }
  getInputSystem(): InputSystem { return this.inputSystem; }
  getPhysicsSystem(): PhysicsSystem { return this.physicsSystem; }
  getPhysicsSync(): BodySync { return this.physicsSync; }
  getAudioSystem(): AudioSystem { return this.audioSystem; }
  getUISystem(): UISystem { return this.uiSystem; }
  /** W4-B.5: the screen-reader announcement system (scene transitions). */
  getAccessibilitySystem(): AccessibilitySystem { return this.accessibilitySystem; }
  getRenderer(): Renderer { return this.renderer; }
  isGameRunning(): boolean { return this.fsm.getState() === 'playing'; }

  /**
   * W3-C.4: get the current game-speed multiplier (settings: 0.5/1/1.5/2).
   */
  getSpeedMultiplier(): number {
    return this.speedMultiplier;
  }

  /**
   * W3-C.4: set the game-speed multiplier (settings panel). Clamped to
   * 0.1–10 so a bad value can't freeze or explode the simulation.
   */
  setSpeedMultiplier(multiplier: number): void {
    if (typeof multiplier === 'number' && Number.isFinite(multiplier)) {
      this.speedMultiplier = Math.min(10, Math.max(0.1, multiplier));
    }
  }
}
