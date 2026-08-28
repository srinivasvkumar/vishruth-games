import Phaser from 'phaser';
import { Constants } from '../utils/Constants.js';

class Obstacle extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, type) {
    super(scene, x, y, Constants.SPRITES[type] || Constants.SPRITES.SPIKE);

    this.type = type;
    this.setImmovable(true);
    this.setCollideWorldBounds(false);

    // Set physics body size based on type
    if (type === 'spike') {
      this.body.setSize(32, 32);
      this.body.setOffset(0, 0);
    } else if (type === 'block') {
      this.body.setSize(32, 32);
      this.body.setOffset(0, 0);
    }
  }

  update() {
    // Obstacles don't need update logic - they're static
  }
}

export { Obstacle };
