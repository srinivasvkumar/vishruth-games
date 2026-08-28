import Phaser from 'phaser';
import { Constants } from '../utils/Constants.js';

class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, mode) {
    const textureKey = Constants.SPRITES[mode.toUpperCase()] || Constants.SPRITES.PLAYER_CUBE;
    
    // Check if texture exists
    if (!scene.textures.exists(textureKey)) {
      console.error(`❌ Texture '${textureKey}' not found!`);
      // Create a fallback texture if missing
      const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
      graphics.fillStyle(0x2ed573, 1);
      graphics.fillRect(0, 0, 32, 32);
      graphics.generateTexture(textureKey, 32, 32);
      console.log(`✓ Created fallback texture: ${textureKey}`);
    }

    super(scene, x, y, textureKey);

    this.scene = scene;
    this.mode = mode;
    this.onGround = false;
    this.isJumping = false;
    this.jumpForce = Constants.JUMP_FORCE;

    // Set physics properties
    this.setCollideWorldBounds(true);
    this.setGravityY(Constants.GRAVITY);
    this.setDragX(0);
    this.setMaxVelocity(500, 1000);

    // Animation for cube mode
    if (mode === Constants.MODES.CUBE) {
      this.rotation = 0;
    }

    console.log(`✓ Player created: mode=${mode}, position=(${x}, ${y}), texture=${textureKey}`);
  }

  jump() {
    if (this.onGround) {
      this.setVelocityY(this.jumpForce);
      this.onGround = false;
      this.isJumping = true;
      console.log(`🚀 Player jumped (mode: ${this.mode})`);

      // Rotate animation for cube
      if (this.mode === Constants.MODES.CUBE) {
        this.scene.tweens.add({
          targets: this,
          rotation: Math.PI * 2,
          duration: 500,
          ease: 'Linear',
        });
      }
    } else {
      console.log('⚠ Jump attempted while not on ground');
    }
  }

  stopJump() {
    // Stop upward momentum when finger is released (for ship mode, etc.)
    if (this.mode === Constants.MODES.SHIP) {
      this.setVelocityY(0);
      console.log('✈ Ship stopped ascending');
    }
  }

  onWorldBounds() {
    // Handle world boundary collision
    this.onGround = true;
  }

  update() {
    // Update player behavior based on mode
    switch (this.mode) {
      case Constants.MODES.CUBE:
        this.updateCube();
        break;
      case Constants.MODES.SHIP:
        this.updateShip();
        break;
      case Constants.MODES.BALL:
        this.updateBall();
        break;
      default:
        this.updateCube();
    }
  }

  updateCube() {
    // Standard cube behavior - just rotation animation
    if (!this.onGround) {
      this.rotation += 0.1;
    } else {
      // Snap to nearest 90 degrees when on ground
      this.rotation = Math.round(this.rotation / (Math.PI / 2)) * (Math.PI / 2);
    }
  }

  updateShip() {
    // Ship flight mechanics
    // Handled by input events in GameScene
  }

  updateBall() {
    // Ball gravity flip mechanics
    // Will be implemented in Phase 2
  }

  setMode(newMode) {
    this.mode = newMode;
    // Update texture based on new mode
    const textureKey = Constants.SPRITES[`PLAYER_${newMode.toUpperCase()}`];
    if (this.scene.textures.exists(textureKey)) {
      this.setTexture(textureKey);
      console.log(`✓ Player mode changed to ${newMode}`);
    } else {
      console.error(`❌ Texture for mode '${newMode}' not found`);
    }
  }
}

export { Player };
