import { SceneManager } from '@/core/SceneManager';
import { InputSystem } from '@/systems/Input';
import { PhysicsSystem } from '@/systems/Physics';
import { AudioSystem } from '@/systems/Audio';
import { UISystem } from '@/systems/UI';
import { Logger } from '@/utils/Logger';
import type { GameConfig } from '@/types/GameTypes';

/**
 * Main Game class that orchestrates all game systems
 */
export class Game {
  private sceneManager: SceneManager;
  private inputSystem: InputSystem;
  private physicsSystem: PhysicsSystem; 
  private audioSystem: AudioSystem;
  private uiSystem: UISystem;
  private config: GameConfig;
  private isRunning: boolean = false;
  private lastTimestamp: number = 0;
  
  constructor(config: GameConfig) {
    this.config = config;
    this.sceneManager = new SceneManager(this);
    this.inputSystem = new InputSystem();
    this.physicsSystem = new PhysicsSystem(config.physics);
    this.audioSystem = new AudioSystem(config.audio);
    this.uiSystem = new UISystem(config.ui);
    
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
  switchScene(sceneName: string, data?: Record<string, any>): Promise<void> {
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
  private emit(event: string, data?: any): void {
    const customEvent = new CustomEvent(event, { detail: data });
    window.dispatchEvent(customEvent);
  }
  
  // Public getters
  getSceneManager(): SceneManager { return this.sceneManager; }
  getInputSystem(): InputSystem { return this.inputSystem; }
  getPhysicsSystem(): PhysicsSystem { return this.physicsSystem; }
  getAudioSystem(): AudioSystem { return this.audioSystem; }
  getUISystem(): UISystem { return this.uiSystem; }
  isGameRunning(): boolean { return this.isRunning; }
}
