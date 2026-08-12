import { Scene } from 'phaser';
import { GameConfig } from '../config.js';

export class BootScene extends Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // Load any assets needed before the game starts
        // For now, we'll generate sprites programmatically
        this.load.setBaseURL('.');
    }

    create() {
        // Create a simple loading bar using graphics
        const { width, height } = this.scale;
        
        const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
            fontSize: '32px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        });
        loadingText.setOrigin(0.5);
        
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        
        const width2 = this.scale.width;
        const height2 = this.scale.height;
        
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width2 / 2 - 160, height2 / 2 - 30, 320, 50);
        
        // Generate player sprite programmatically
        this.generatePlayerSprites();
        
        // Transition to menu after brief delay
        this.time.delayedCall(1000, () => {
            this.scene.start('MenuScene');
        });
    }
    
    generatePlayerSprites() {
        // Generate all player mode sprites programmatically
        const modeColors = {
            [GameConfig.colors.playerCube]: 'cube',
            [GameConfig.colors.playerShip]: 'ship',
            [GameConfig.colors.playerBall]: 'ball',
            [GameConfig.colors.playerUfo]: 'ufo',
            [GameConfig.colors.playerWave]: 'wave',
            [GameConfig.colors.playerSpider]: 'spider',
            [GameConfig.colors.playerRobot]: 'robot',
            [GameConfig.colors.playerFlux]: 'flux'
        };
        
        const size = 40;
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        
        // Generate each mode's sprite
        Object.entries(modeColors).forEach(([color, mode]) => {
            graphics.clear();
            graphics.fillStyle(color);
            graphics.lineStyle(2, 0xffffff);
            
            switch (mode) {
                case 'cube':
                    graphics.fillRect(0, 0, size, size);
                    graphics.strokeRect(0, 0, size, size);
                    break;
                case 'ship':
                    graphics.beginPath();
                    graphics.moveTo(size / 2, 0);
                    graphics.lineTo(size, size);
                    graphics.lineTo(0, size);
                    graphics.closePath();
                    graphics.fillPath();
                    graphics.strokePath();
                    break;
                case 'ball':
                    graphics.fillCircle(size / 2, size / 2, size / 2);
                    graphics.strokeCircle(size / 2, size / 2, size / 2);
                    break;
                case 'ufo':
                    graphics.fillCircle(size / 2, size / 2, size / 3);
                    graphics.fillStyle(color);
                    graphics.fillRect(5, size / 2 + 5, size - 10, 8);
                    break;
                default:
                    graphics.fillRect(0, 0, size, size);
            }
            
            graphics.generateTexture(mode, size, size);
        });
    }
}
