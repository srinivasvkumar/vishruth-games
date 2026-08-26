import Phaser from 'phaser';
import { Constants } from '../utils/Constants.js';

class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    console.log('🔄 BootScene: Preloading assets...');

    // Create placeholder textures directly (no loading needed)
    this.createPlaceholderTextures();
    console.log('✅ Placeholder textures created');
  }

  create() {
    console.log('✅ BootScene created - transitioning to GameScene');
    this.scene.start('GameScene');
  }

  createPlaceholderTextures() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });

    // Player cube (green square)
    graphics.clear();
    graphics.fillStyle(0x2ed573, 1);
    graphics.fillRect(0, 0, 32, 32);
    graphics.generateTexture(Constants.SPRITES.PLAYER_CUBE, 32, 32);
    console.log('  → Created texture:', Constants.SPRITES.PLAYER_CUBE);

    // Spike (red triangle)
    graphics.clear();
    graphics.fillStyle(0xff4757, 1);
    graphics.fillTriangle(0, 32, 16, 0, 32, 32);
    graphics.generateTexture(Constants.SPRITES.SPIKE, 32, 32);
    console.log('  → Created texture:', Constants.SPRITES.SPIKE);

    // Block (gray square)
    graphics.clear();
    graphics.fillStyle(0x7f8c8d, 1);
    graphics.fillRect(0, 0, 32, 32);
    graphics.generateTexture(Constants.SPRITES.BLOCK, 32, 32);
    console.log('  → Created texture:', Constants.SPRITES.BLOCK);

    // Platform (long gray rectangle)
    graphics.clear();
    graphics.fillStyle(0x34495e, 1);
    graphics.fillRect(0, 0, 64, 16);
    graphics.generateTexture(Constants.SPRITES.PLATFORM, 64, 16);
    console.log('  → Created texture:', Constants.SPRITES.PLATFORM);
  }
}

export { BootScene };
