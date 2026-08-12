import { Scene } from 'phaser';

export class PauseScene extends Scene {
    constructor() {
        super('PauseScene');
    }

    create(data) {
        this.parentScene = data?.parentScene;
        const { width, height } = this.scale;
        
        // Semi-transparent overlay
        const graphics = this.add.graphics();
        graphics.fillStyle(0x000000, 0.7);
        graphics.fillRect(0, 0, width, height);
        
        // Pause text
        this.add.text(width / 2, height / 3, 'PAUSED', {
            fontSize: '64px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        
        // Resume button
        this.resumeButton = this.add.text(width / 2, height / 2, '▶ RESUME', {
            fontSize: '32px',
            fill: '#ffffff',
            backgroundColor: '#00ffff',
            padding: { x: 30, y: 15 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        this.resumeButton.on('pointerover', () => this.resumeButton.setStyle({ fill: '#00ffff' }));
        this.resumeButton.on('pointerout', () => this.resumeButton.setStyle({ fill: '#ffffff' }));
        this.resumeButton.on('pointerdown', () => this.resumeGame());
        
        // Restart button
        this.restartButton = this.add.text(width / 2, height / 2 + 70, '↻ RESTART', {
            fontSize: '32px',
            fill: '#ffffff',
            backgroundColor: '#ffaa00',
            padding: { x: 10, y: 15 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        this.restartButton.on('pointerover', () => this.restartButton.setStyle({ fill: '#ffaa00' }));
        this.restartButton.on('pointerout', () => this.restartButton.setStyle({ fill: '#ffffff' }));
        this.restartButton.on('pointerdown', () => this.restartLevel());
        
        // Menu button
        this.menuButton = this.add.text(width / 2, height / 2 + 140, '🏡 MAIN MENU', {
            fontSize: '32px',
            fill: '#ffffff',
            backgroundColor: '#ff3333',
            padding: { x: 10, y: 15 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        this.menuButton.on('pointerover', () => this.menuButton.setStyle({ fill: '#ff3333' }));
        this.menuButton.on('pointerout', () => this.menuButton.setStyle({ fill: '#ffffff' }));
        this.menuButton.on('pointerdown', () => this.goToMenu());
        
        // Resume on ESC
        this.pauseKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESCAPE);
        this.input.keyboard.on('keydown', (event) => {
            if (event.code === 'Escape') {
                this.resumeGame();
            }
        });
        
        // Resume on click anywhere
        this.input.on('pointerdown', () => {
            this.resumeGame();
        });
    }
    
    resumeGame() {
        this.scene.resume(this.parentScene);
        this.scene.stop();
    }
    
    restartLevel() {
        this.scene.stop();
        this.scene.restart({ levelNum: this.levelNum });
    }
    
    goToMenu() {
        this.scene.stop();
        this.scene.start('MenuScene');
    }
    
    shutdown() {
        // Clean up when scene is stopped
    }
}
