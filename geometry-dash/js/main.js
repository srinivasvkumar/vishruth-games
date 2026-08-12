// Main entry point - Phaser is loaded from CDN
import { GameConfig } from './config.js';
import { BootScene } from './scenes/Boot.js';
import { MenuScene } from './scenes/Menu.js';
import { GameScene } from './scenes/Game.js';
import { PauseScene } from './scenes/Pause.js';
import { GameOverScene } from './scenes/GameOver.js';

// Create Phaser game instance
const config = {
    type: Phaser.AUTO,
    width: GameConfig.width,
    height: GameConfig.height,
    parent: 'game-container',
    backgroundColor: GameConfig.colors.backgroundTop,
    physics: GameConfig.physics,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [
        BootScene,
        MenuScene,
        GameScene,
        PauseScene,
        GameOverScene
    ]
};

const game = new Phaser.Game(config);

// Handle window resize
window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
});
