import * as THREE from 'three';
import { Scene } from './Scene';
import { Logger } from '@/utils/Logger';
import type { Game } from '@/core/Game';

/**
 * Boot/loading scene
 */
export class BootScene extends Scene {
  private loadingManager: THREE.LoadingManager;
  private progressBar!: HTMLDivElement;
  private loadingText!: HTMLDivElement;
  private totalAssets = 0;
  private loadedAssets = 0;
  /** One-shot guard: the boot->menu advance must fire exactly once.
   * Without it the empty-asset condition stayed true every frame and
   * enqueued ~60 duplicate menu loads (W5 diagnosis). */
  private advancedToMenu = false;
  private progressContainer: HTMLElement | null = null;
  
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
  protected onUpdate(_deltaTime: number): void {
    // Update loading animation
    if (this.progressBar) {
      const width = Math.min(100, (this.loadedAssets / this.totalAssets) * 100);
      this.progressBar.style.width = `${width}%`;
      
      if (this.loadingText) {
        this.loadingText.textContent = `Loading... ${Math.floor(width)}%`;
      }
    }
    
    // Auto-transition when loaded — ONE SHOT only. The loaded>=total guard
    // is trivially true for the empty manifest, so without the flag this
    // fired every frame and flooded the SceneManager queue.
    if (!this.advancedToMenu && this.loadedAssets >= this.totalAssets && this.isActive) {
      this.advancedToMenu = true;
      setTimeout(() => {
        this.exit(); // idempotent; SceneManager guards on isActive too
        this.game.switchScene('menu').catch((error) => {
          this.advancedToMenu = false; // allow retry if the switch failed
          Logger.error('Failed to switch to menu scene', { error });
        });
      }, 500);
    }
  }
  
  /**
   * Exit boot scene
   */
  protected onExit(): void {
    // Remove the loading UI entirely — hiding only the inner bar left the
    // green-bordered container floating over every later scene (W5).
    this.progressContainer?.remove();
    this.loadingText?.remove();

    // Clear the static #loading-message from index.html
    const loadingMsg = document.getElementById('loading-message');
    if (loadingMsg) {
      loadingMsg.textContent = '';
      loadingMsg.style.display = 'none';
    }

    Logger.debug('Boot scene exited');
  }
  
  /**
   * Clean up boot scene
   */
  protected onCleanup(): void {
    this.progressContainer?.remove();
    this.progressBar?.parentNode?.removeChild(this.progressBar);
    this.loadingText?.parentNode?.removeChild(this.loadingText);
    this.advancedToMenu = false;
    
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
    this.progressContainer = progressContainer;
    progressContainer.style.cssText = `
      position: fixed;
      top: 50%;
      left: 10%;
      width: 80%;
      height: 20px;
      background: rgba(0, 0, 0, 0.5);
      border: 2px solid #00ff00;
      transform: translateY(-50%);
      overflow: hidden;
    `;
    
    // Create progress bar
    this.progressBar = document.createElement('div');
    this.progressBar.style.cssText = `
      height: 100%;
      width: 0%;
      background: #00ff00;
      transition: width 0.3s ease;
    `;
    
    // Create loading text
    this.loadingText = document.createElement('div');
    this.loadingText.style.cssText = `
      position: fixed;
      top: calc(50% - 30px);
      left: 0;
      width: 100%;
      text-align: center;
      color: #00ff00;
      font-family: monospace;
      font-size: 20px;
    `;
    this.loadingText.textContent = 'Loading... 0%';
    
    progressContainer.appendChild(this.progressBar);
    document.body.appendChild(progressContainer);
    document.body.appendChild(this.loadingText);
  }
  
  /**
   * Load essential assets
   */
  // eslint-disable-next-line @typescript-eslint/require-await -- async contract: asset loads will be awaited as the essential-asset list is enabled
  private async loadEssentialAssets(): Promise<void> {
    const essentialAssets: { type: string; url: string }[] = [
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
