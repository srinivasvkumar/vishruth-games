import * as THREE from 'three';
import { Logger } from '@/utils/Logger';
import type { Game } from '@/core/Game';

/**
 * Base Scene class that all game scenes inherit from
 */
export abstract class Scene {
  protected scene: THREE.Scene;
  protected camera: THREE.Camera;
  protected renderer: THREE.WebGLRenderer;
  protected game: Game;
  protected isLoaded: boolean = false;
  protected isActive: boolean = false;
  
  constructor(game: Game, camera?: THREE.Camera) {
    this.game = game;
    this.scene = new THREE.Scene();
    this.camera = camera || this.createCamera();
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    
    Logger.debug('Scene created', { name: this.constructor.name });
  }
  
  /**
   * Load scene assets and initialize
   */
  async load(): Promise<void> {
    if (this.isLoaded) return;
    
    try {
      Logger.info(`Loading scene: ${this.constructor.name}`);
      await this.onLoad();
      this.isLoaded = true;
      Logger.info(`Scene loaded: ${this.constructor.name}`);
    } catch (error) {
      Logger.error(`Failed to load scene: ${this.constructor.name}`, error);
      throw error;
    }
  }
  
  /**
   * Enter the scene
   */
  enter(): void {
    if (!this.isLoaded || this.isActive) return;
    
    this.isActive = true;
    this.onEnter();
    Logger.info(`Entered scene: ${this.constructor.name}`);
  }
  
  /**
   * Update scene state
   */
  update(deltaTime: number): void {
    if (!this.isActive) return;
    this.onUpdate(deltaTime);
  }
  
  /**
   * Exit the scene
   */
  exit(): void {
    if (!this.isActive) return;
    
    this.isActive = false;
    this.onExit();
    Logger.info(`Exited scene: ${this.constructor.name}`);
  }
  
  /**
   * Clean up scene resources
   */
  cleanup(): void {
    this.onCleanup();
    this.isLoaded = false;
    this.isActive = false;
    Logger.info(`Scene cleaned up: ${this.constructor.name}`);
  }
  
  /**
   * Render the scene
   */
  render(): void {
    if (!this.isActive) return;
    this.renderer.render(this.scene, this.camera);
  }
  
  /**
   * Abstract methods to be implemented by child classes
   */
  protected abstract createCamera(): THREE.Camera;
  protected abstract onLoad(): Promise<void>;
  protected abstract onEnter(): void;
  protected abstract onUpdate(deltaTime: number): void;
  protected abstract onExit(): void;
  protected abstract onCleanup(): void;
  
  // Public getters
  getScene(): THREE.Scene { return this.scene; }
  getCamera(): THREE.Camera { return this.camera; }
  getRenderer(): THREE.WebGLRenderer { return this.renderer; }
  isSceneLoaded(): boolean { return this.isLoaded; }
  isSceneActive(): boolean { return this.isActive; }
}
