import * as THREE from 'three';
import { Scene } from './Scene';
import { AssetLoader } from '@/utils/AssetLoader';
import { Logger } from '@/utils/Logger';
import { GameConstants } from '@/utils/Constants';
import type { Game } from '@/core/Game';

/**
 * Boot/loading scene
 */
export class BootScene extends Scene {
  private loadingManager: THREE.LoadingManager;
  private progressBar: HTMLDivElement;
  private loadingText: HTMLDivElement;
  private totalAssets: number = 0;
  private loadedAssets: number = 0;
  
  constructor(game: Game) {
    super(game);
    
    // Setup loading manager
    this.loadingManager = new THREE.LoadingManager();
    this.setupLoadingProgress();
    
    Logger.info('Boot scene created');
  }
  
  /**
   * Create camera for boot scene
   */
  protected createCamera(): THREE.Camera {
    return new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
  }
  
  /**
   * Load boot scene assets
   */
  protected async onLoad(): Promise<void> {
    // Setup loading UI
    this.setupLoadingUI();
    
    // Load essential assets
    await this.loadEssentialAssets();
    
    // Simulate loading for demonstration
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  /**
   * Enter boot scene
   */
  protected onEnter(): void {
    // Show loading UI
    if (this.progressBar && this.loadingText) {
      this.progressBar.style.display = 'block';
      this.loadingText.style.display = 'block';
    }
    
    Logger.debug('Boot scene entered');
  }
  
  /**
   * Update boot scene
   */
  protected onUpdate(deltaTime: number): void {
    // Update loading animation
    if (this.progressBar) {
      const width = Math.min(100, (this.loadedAssets / this.totalAssets) * 100);
      this.progressBar.style.width = `${width}%`;
      
      if (this.loadingText) {
        this.loadingText.textContent = `Loading... ${Math.floor(width)}%`;
      }
    }
    
    // Auto-transition when loaded
    if (this.loadedAssets >= this.totalAssets && this.isActive) {
      setTimeout(() => {
        this.exit();
        this.game.switchScene('menu');
      }, 500);
    }
  }
  
  /**
   * Exit boot scene
   */
  protected onExit(): void {
    // Hide loading UI
    if (this.progressBar && this.loadingText) {
      this.progressBar.style.display = 'none';
      this.loadingText.style.display = 'none';
    }
    
    Logger.debug('Boot scene exited');
  }
  
  /**
   * Clean up boot scene
   */
  protected onCleanup(): void {
    if (this.progressBar && this.progressBar.parentNode) {
      this.progressBar.parentNode.removeChild(this.progressBar);
    }
    if (this.loadingText && this.loadingText.parentNode) {
      this.loadingText.parentNode.removeChild(this.loadingText);
    }
    
    Logger.debug('Boot scene cleaned up');
  }
  
  /**
   * Setup loading progress tracking
   */
  private setupLoadingProgress(): void {
    this.loadingManager.onStart = () => {
      Logger.info('Started loading assets');
    };
    
    this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      this.totalAssets = itemsTotal;
      this.loadedAssets = itemsLoaded;
      Logger.debug('Asset loading progress', { url, itemsLoaded, itemsTotal });
    };
    
    this.loadingManager.onLoad = () => {
      Logger.info('All assets loaded');
      this.loadedAssets = this.totalAssets;
    };
    
    this.loadingManager.onError = (url) => {
      Logger.error('Failed to load asset', { url });
    };
  }
  
  /**
   * Setup loading UI elements
   */
  private setupLoadingUI(): void {
    // Create progress bar container
    const progressContainer = document.createElement('div');
    progressContainer.style.cssText = \`
      position: fixed;
      top: 50%;
      left: 10%;
      width: 80%;
      height: 20px;
      background: rgba(0, 0, 0, 0.5);
      border: 2px solid #00ff00;
      transform: translateY(-50%);
      overflow: hidden;
    \`;
    
    // Create progress bar
    this.progressBar = document.createElement('div');
    this.progressBar.style.cssText = \`
      height: 100%;
      width: 0%;
      background: #00ff00;
      transition: width 0.3s ease;
    \`;
    
    // Create loading text
    this.loadingText = document.createElement('div');
    this.loadingText.style.cssText = \`
      position: fixed;
      top: calc(50% - 30px);
      left: 0;
      width: 100%;
      text-align: center;
      color: #00ff00;
      font-family: monospace;
      font-size: 20px;
    \`;
    this.loadingText.textContent = 'Loading... 0%';
    
    progressContainer.appendChild(this.progressBar);
    document.body.appendChild(progressContainer);
    document.body.appendChild(this.loadingText);
  }
  
  /**
   * Load essential assets
   */
  private async loadEssentialAssets(): Promise<void> {
    const essentialAssets = [
      // Core game assets would be listed here
      // { type: 'texture', url: '/assets/textures/player.png' },
      // { type: 'model', url: '/assets/models/player.glb' },
    ];
    
    this.totalAssets = essentialAssets.length;
    
    // Load each asset
    for (const asset of essentialAssets) {
      try {
        // AssetLoader.load would be called here
        // await AssetLoader.load(asset.url, asset.type);
        this.loadedAssets++;
      } catch (error) {
        Logger.error('Failed to load essential asset', { asset, error });
      }
    }
  }
}
