import { SceneManager } from '@/core/SceneManager';
import { InputSystem } from '@/systems/Input';
import { PhysicsSystem } from '@/systems/Physics';
import { AudioSystem } from '@/systems/Audio';
import { UISystem } from '@/systems/UI';
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
 */
export class Game {
  private sceneManager: SceneManager;
  private inputSystem: InputSystem;
  private physicsSystem: PhysicsSystem; 
  private audioSystem: AudioSystem;
  private uiSystem: UISystem;
  private physicsSync: BodySync;
  private renderer: Renderer;
  private isRunning = false;
  private lastTimestamp = 0;
  
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

    Logger.info('Game initialized', { config });
  }
  
  /**
   * Start the game loop
   */
  start(): void {
    if (this.isRunning) {
      Logger.warn('Game already running');
      return;
    }
    
    Logger.info('Starting game');
    this.isRunning = true;
    this.lastTimestamp = performance.now();

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

    this.gameLoop(this.lastTimestamp);
    
    this.emit('game:start');
  }
  
  /**
   * Pause the game
   */
  pause(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.emit('game:pause');
    Logger.info('Game paused');
  }
  
  /**
   * Resume the game
   */
  resume(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTimestamp = performance.now();
    this.gameLoop(this.lastTimestamp);
    this.emit('game:resume');
    Logger.info('Game resumed');
  }
  
  /**
   * Stop the game completely
   */
  stop(): void {
    this.isRunning = false;
    this.cleanup();
    this.emit('game:stop');
    Logger.info('Game stopped');
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
    if (!this.isRunning) return;
    
    const deltaTime = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    
    // Update systems
    this.inputSystem.update();
    this.physicsSystem.update(deltaTime);
    // W2-B.1 (Task 6.2): sync the visual meshes to the (just-stepped)
    // physics bodies, every frame, BEFORE the scene updates — so meshes
    // follow bodies within the same frame, before the scene renders.
    this.physicsSync.sync();
    this.sceneManager.update(deltaTime);
    this.uiSystem.update(deltaTime);

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
  getRenderer(): Renderer { return this.renderer; }
  isGameRunning(): boolean { return this.isRunning; }
}
