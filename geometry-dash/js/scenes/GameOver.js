import { Scene } from 'phaser';

export class GameOverScene extends Scene {
    constructor() {
        super('GameOverScene');
    }

    create(data) {
        this.levelNum = data?.levelNum || 1;
        this.score = data?.score || 0;
        this.retryCallback = data?.retryCallback;
        
        const { width, height } = this.scale;
        
        // Semi-transparent overlay
        const graphics = this.add.graphics();
        graphics.fillStyle(0x000000, 0.8);
        graphics.fillRect(0, 0, width, height);
        
        // Game Over text
        this.add.text(width / 2, height / 4, 'GAME OVER', {
            fontSize: '64px',
            fill: '#ff3333',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        // Score display
        this.add.text(width / 2, height / 2 - 50, `Score: ${this.score}%`, {
            fontSize: '48px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        
        this.add.text(width / 2, height / 2, `Level: ${this.levelNum}`, {
            fontSize: '24px',
            fill: '#aaaaaa',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        
        // Retry button
        this.retryButton = this.add.text(width / 2, height / 2 + 80, '↻ RETRY', {
            fontSize: '32px',
            fill: '#ffffff',
            backgroundColor: '#00ffff',
            padding: { x: 30, y: 15 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        this.retryButton.on('pointerover', () => this.retryButton.setStyle({ fill: '#00ffff' }));
        this.retryButton.on('pointerout', () => this.retryButton.setStyle({ fill: '#ffffff' }));
        this.retryButton.on('pointerdown', () => this.retry());
        
        // Menu button
        this.menuButton = this.add.text(width / 2, height / 2 + 150, '🏡 MAIN MENU', {
            fontSize: '32px',
            fill: '#ffffff',
            backgroundColor: '#ff3333',
            padding: { x: 10, y: 15 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        this.menuButton.on('pointerover', () => this.menuButton.setStyle({ fill: '#ff3333' }));
        this.menuButton.on('pointerout', () => this.menuButton.setStyle({ fill: '#ffffff' }));
        this.menuButton.on('pointerdown', () => this.goToMenu());
    }
    
    retry() {
        if (this.retryCallback) {
            this.retryCallback();
        } else {
            this.scene.restart({ levelNum: this.levelNum });
        }
    }
    
    goToMenu() {
        this.scene.start('MenuScene');
    }
}
