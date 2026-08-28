import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { GameScene } from './scenes/GameScene.js';

console.log('🚀 Starting Geometry Dash Clone...');

// Game configuration
const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#1a1a2e',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1000 },
      debug: false,
    },
  },
  scene: [BootScene, GameScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  pixelArt: true,
};

// Create game instance immediately
console.log('Creating Phaser game instance...');
const game = new Phaser.Game(config);
console.log('✅ Game instance created');

// Handle window resize
window.addEventListener('resize', () => {
  console.log('Window resized:', window.innerWidth, 'x', window.innerHeight);
  game.scale.resize(window.innerWidth, window.innerHeight);
});

// Prevent default touch behaviors
document.addEventListener('touchmove', (e) => {
  e.preventDefault();
}, { passive: false });

// Export game instance for debugging
window.game = game;

console.log('🎮 Geometry Dash Clone initialized');
console.log('📐 Game dimensions:', window.innerWidth, 'x', window.innerHeight);
console.log('🔧 Game config:', config);
