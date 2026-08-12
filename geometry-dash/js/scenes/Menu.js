import { Scene } from 'phaser';
import { GameConfig } from '../config.js';

export class MenuScene extends Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        const { width, height } = this.scale;
        
        // Title
        this.add.text(width / 2, height / 4, 'GEOMETRY DASH', {
            fontSize: '64px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            stroke: '#00ffff',
            strokeThickness: 3
        }).setOrigin(0.5);
        
        // Subtitle
        this.add.text(width / 2, height / 4 + 60, 'Web Edition', {
            fontSize: '24px',
            fill: '#aaaaaa',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        
        // Play button
        this.playButton = this.add.text(width / 2, height / 2 - 50, '▶ PLAY', {
            fontSize: '32px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            backgroundColor: '#00ffff',
            padding: { x: 30, y: 15 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        this.playButton.on('pointerover', () => this.playButton.setStyle({ fill: '#00ffff' }));
        this.playButton.on('pointerout', () => this.playButton.setStyle({ fill: '#ffffff' }));
        this.playButton.on('pointerdown', () => this.startGame(1));
        
        // Level Editor button
        this.editorButton = this.add.text(width / 2, height / 2 + 10, '✎ LEVEL EDITOR', {
            fontSize: '32px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            backgroundColor: '#00ff00',
            padding: { x: 10, y: 15 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        this.editorButton.on('pointerover', () => this.editorButton.setStyle({ fill: '#00ff00' }));
        this.editorButton.on('pointerout', () => this.editorButton.setStyle({ fill: '#ffffff' }));
        this.editorButton.on('pointerdown', () => this.startLevelEditor());
        
        // Settings button
        this.settingsButton = this.add.text(width / 2, height / 2 + 70, '⚙ SETTINGS', {
            fontSize: '32px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            backgroundColor: '#ffaa00',
            padding: { x: 10, y: 15 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        this.settingsButton.on('pointerover', () => this.settingsButton.setStyle({ fill: '#ffaa00' }));
        this.settingsButton.on('pointerout', () => this.settingsButton.setStyle({ fill: '#ffffff' }));
        this.settingsButton.on('pointerdown', () => this.openSettings());
        
        // Footer
        this.add.text(width / 2, height - 50, 'Click or press any key to start', {
            fontSize: '18px',
            fill: '#888888',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        
        // Add click listener anywhere to start
        this.input.on('pointerdown', () => this.startGame(1));
    }
    
    startGame(levelNum) {
        this.scene.start('GameScene', { levelNum });
    }
    
    startLevelEditor() {
        this.scene.start('GameScene', { levelNum: 0, editorMode: true });
    }
    
    openSettings() {
        // For now, just log - can be expanded later
        console.log('Open settings');
    }
}
