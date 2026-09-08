import { Logger } from '@/utils/Logger';
import { GameEvents } from '@/utils/Constants';
import type { Game } from '@/core/Game';
import type { Scene } from '@/scenes/Scene';

/**
 * SceneManager handles scene transitions and lifecycle
 */
export class SceneManager {
  private game: Game;
  private scenes: Map<string, Scene> = new Map();
  private currentScene: Scene | null = null;
  private previousScene: Scene | null = null;
  private sceneQueue: string[] = [];
  private isLoading: boolean = false;
  
  constructor(game: Game) {
    this.game = game;
    Logger.info('SceneManager initialized');
  }
  
  /**
   * Register a scene
   */
  registerScene(name: string, scene: Scene): void {
    this.scenes.set(name, scene);
    Logger.debug('Scene registered', { name, scene: scene.constructor.name });
  }
  
  /**
   * Unregister a scene
   */
  unregisterScene(name: string): void {
    const scene = this.scenes.get(name);
    if (scene) {
      if (this.currentScene === scene) {
        scene.exit();
        this.currentScene = null;
      }
      scene.cleanup();
      this.scenes.delete(name);
      Logger.debug('Scene unregistered', { name });
    }
  }
  
  /**
   * Load and switch to a scene
   */
  async loadScene(name: string, data?: Record<string, any>): Promise<void> {
    if (this.isLoading) {
      Logger.warn('Already loading a scene, queuing request', { name });
      this.sceneQueue.push(name);
      return;
    }
    
    const scene = this.scenes.get(name);
    if (!scene) {
      Logger.error('Scene not found', { name });
      throw new Error(`Scene "${name}" not found`);
    }
    
    this.isLoading = true;
    
    try {
      Logger.info('Loading scene', { name });
      
      // Exit current scene
      if (this.currentScene) {
        this.previousScene = this.currentScene;
        this.currentScene.exit();
        Logger.debug('Exited current scene', { name: this.currentScene.constructor.name });
      }
      
      // Load new scene
      await scene.load();
      this.currentScene = scene;
      
      // Enter new scene
      scene.enter();
      
      // Emit scene loaded event
      this.emit(GameEvents.LEVEL_START, { name, data });
      
      Logger.info('Scene loaded successfully', { name });
      
    } catch (error) {
      Logger.error('Failed to load scene', { name, error });
      
      // Fallback to previous scene
      if (this.previousScene) {
        Logger.info('Falling back to previous scene');
        await this.loadScene(this.getSceneName(this.previousScene));
      }
      
      throw error;
      
    } finally {
      this.isLoading = false;
      
      // Process queued scenes
      if (this.sceneQueue.length > 0) {
        const nextScene = this.sceneQueue.shift();
        if (nextScene) {
          setTimeout(() => this.loadScene(nextScene), 100);
        }
      }
    }
  }
  
  /**
   * Update current scene
   */
  update(deltaTime: number): void {
    if (this.currentScene) {
      this.currentScene.update(deltaTime);
    }
  }
  
  /**
   * Render current scene
   */
  render(): void {
    if (this.currentScene) {
      this.currentScene.render();
    }
  }
  
  /**
   * Get current scene
   */
  getCurrentScene(): Scene | null {
    return this.currentScene;
  }
  
  /**
   * Get previous scene
   */
  getPreviousScene(): Scene | null {
    return this.previousScene;
  }
  
  /**
   * Check if scene exists
   */
  hasScene(name: string): boolean {
    return this.scenes.has(name);
  }
  
  /**
   * Get all registered scenes
   */
  getAllScenes(): Map<string, Scene> {
    return new Map(this.scenes);
  }
  
  /**
   * Get scene name from instance
   */
  private getSceneName(scene: Scene): string {
    for (const [name, s] of this.scenes) {
      if (s === scene) return name;
    }
    return '';
  }
  
  /**
   * Clean up all scenes
   */
  cleanup(): void {
    if (this.currentScene) {
      this.currentScene.exit();
    }
    
    for (const scene of this.scenes.values()) {
      scene.cleanup();
    }
    
    this.scenes.clear();
    this.currentScene = null;
    this.previousScene = null;
    this.sceneQueue = [];
    
    Logger.info('SceneManager cleaned up');
  }
  
  /**
   * Emit events
   */
  private emit(event: string, data?: any): void {
    const customEvent = new CustomEvent(event, { detail: data });
    window.dispatchEvent(customEvent);
  }
}
