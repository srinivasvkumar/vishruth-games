import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Logger } from '@/utils/Logger';

/**
 * Asset types
 */
export type AssetType = 'texture' | 'model' | 'audio' | 'font' | 'json';

/**
 * Asset loading utility
 */
export class AssetLoader {
  private static textureLoader = new THREE.TextureLoader();
  private static gltfLoader = new GLTFLoader();
  private static audioContext: AudioContext | null = null;
  private static cache = new Map<string, any>();
  
  /**
   * Load an asset by URL and type
   */
  static async load<T>(url: string, type: AssetType): Promise<T> {
    // Check cache first
    const cacheKey = `${type}:${url}`;
    if (this.cache.has(cacheKey)) {
      Logger.debug('Asset loaded from cache', { url, type });
      return this.cache.get(cacheKey) as T;
    }
    
    try {
      Logger.debug('Loading asset', { url, type });
      
      let asset: any;
      
      switch (type) {
        case 'texture':
          asset = await this.loadTexture(url);
          break;
        case 'model':
          asset = await this.loadModel(url);
          break;
        case 'audio':
          asset = await this.loadAudio(url);
          break;
        case 'font':
          asset = await this.loadFont(url);
          break;
        case 'json':
          asset = await this.loadJSON(url);
          break;
        default:
          throw new Error(`Unknown asset type: ${type}`);
      }
      
      // Cache the asset
      this.cache.set(cacheKey, asset);
      Logger.debug('Asset loaded successfully', { url, type });
      
      return asset as T;
    } catch (error) {
      Logger.error('Failed to load asset', { url, type, error });
      throw error;
    }
  }
  
  /**
   * Load a texture
   */
  private static loadTexture(url: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          resolve(texture);
        },
        undefined,
        (error) => reject(error)
      );
    });
  }
  
  /**
   * Load a 3D model
   */
  private static loadModel(url: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => resolve(gltf.scene),
        undefined,
        (error) => reject(error)
      );
    });
  }
  
  /**
   * Load audio
   */
  private static async loadAudio(url: string): Promise<AudioBuffer> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    
    return this.audioContext!.decodeAudioData(arrayBuffer);
  }
  
  /**
   * Load font
   */
  private static loadFont(url: string): Promise<FontFace> {
    return new Promise(async (resolve, reject) => {
      try {
        const fontName = url.split('/').pop()?.split('.')[0] || 'CustomFont';
        const fontFace = new FontFace(fontName, `url(${url})`);
        
        await fontFace.load();
        document.fonts.add(fontFace);
        
        resolve(fontFace);
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Load JSON
   */
  private static async loadJSON(url: string): Promise<any> {
    const response = await fetch(url);
    return response.json();
  }
  
  /**
   * Preload multiple assets
   */
  static async preload(assets: Array<{ url: string; type: AssetType }>): Promise<void> {
    Logger.info('Preloading assets', { count: assets.length });
    
    const promises = assets.map(asset => this.load(asset.url, asset.type));
    await Promise.allSettled(promises);
    
    Logger.info('Assets preloaded');
  }
  
  /**
   * Clear asset cache
   */
  static clearCache(): void {
    this.cache.clear();
    Logger.info('Asset cache cleared');
  }
  
  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}
