import { SceneManager } from '@/core/SceneManager';
import { GameStateMachine } from '@/core/State';
import type { GameState } from '@/core/State';
import { InputSystem } from '@/systems/Input';
import { PhysicsSystem } from '@/systems/Physics';
import { AudioSystem } from '@/systems/Audio';
import { UISystem } from '@/systems/UI';
import { Logger } from '@/utils/Logger';
import type { GameConfig } from '@/types/GameTypes';

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
  private fsm: GameStateMachine;
  private lastTimestamp = 0;
  
  constructor(config: GameConfig) {
    this.sceneManager = new SceneManager(this);
    this.inputSystem = new InputSystem();
    this.physicsSystem = new PhysicsSystem(config.physics);
    this.audioSystem = new AudioSystem(config.audio);
    this.uiSystem = new UISystem(config.ui);
    this.fsm = new GameStateMachine();
    
    Logger.info('Game initialized', { config });
  }
  
  /**
   * Start the game loop
   */
  start(): void {
    if (!this.fsm.transition('playing')) {
      Logger.warn('Game start blocked: not in a startable state', {
        state: this.fsm.getState(),
      });
      return;
    }
    
    Logger.info('Starting game');
    this.lastTimestamp = performance.now();
    this.gameLoop(this.lastTimestamp);
    
    this.emit('game:start');
  }
  
  /**
   * Pause the game
   */
  pause(): void {
    if (!this.fsm.transition('paused')) {
      Logger.warn('Game pause blocked: not playing', { state: this.fsm.getState() });
      return;
    }
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
    this.cleanup();

    // From playing, we must go through paused to reach menu.
    if (this.fsm.getState() === 'playing') {
      this.fsm.transition('paused');
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
    if (this.fsm.getState() !== 'playing') return;
    
    const deltaTime = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    
    // Update systems
    this.inputSystem.update();
    this.physicsSystem.update(deltaTime);
    this.sceneManager.update(deltaTime);
    this.uiSystem.update(deltaTime);
    
    // Request next frame
    requestAnimationFrame((time) => this.gameLoop(time));
  }
  
  /**
   * Clean up resources
   */
  private cleanup(): void {
    this.sceneManager.cleanup();
    this.physicsSystem.cleanup();
    this.audioSystem.cleanup();
    this.uiSystem.cleanup();
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
  getAudioSystem(): AudioSystem { return this.audioSystem; }
  getUISystem(): UISystem { return this.uiSystem; }
  isGameRunning(): boolean { return this.fsm.getState() === 'playing'; }
}
