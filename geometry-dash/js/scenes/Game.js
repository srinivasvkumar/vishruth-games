import { Scene } from 'phaser';
import { GameConfig } from '../config.js';
import { Constants } from '../utils/Constants.js';
import { InputManager } from '../systems/Input.js';
import { ScoreManager } from '../systems/Score.js';
import { SaveManager } from '../systems/Save.js';
import { Player } from '../entities/Player.js';
import { Obstacle } from '../entities/Obstacle.js';
import { Portal } from '../entities/Portal.js';

export class GameScene extends Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        // Preload JSON level files
        for (let i = 1; i <= 5; i++) {
            this.load.json(`level-${i}`, `assets/levels/level-${i}.json`);
        }
    }

    create(data) {
        this.levelNum = data?.levelNum || 1;
        this.editorMode = data?.editorMode || false;
        
        // Initialize systems
        this.scoreManager = new ScoreManager(this);
        this.saveManager = new SaveManager();
        this.inputManager = new InputManager(this);
        
        // Load level data (from cache)
        this.levelData = this.loadLevelData(this.levelNum);
        
        // Create background
        this.createBackground();
        
        // Create ground
        this.createGround();
        
        // Create player
        this.player = new Player(this, this.levelData.startX || 100, this.levelData.groundY - 40);
        
        // Create obstacles
        this.obstacles = this.physics.add.group();
        this.createObstacles();
        
        // Create portals
        this.portals = this.physics.add.group();
        this.createPortals();
        
        // Create blocks (static platforms)
        this.blocks = this.physics.add.staticGroup();
        this.createBlocks();
        
        // Collision handlers
        this.physics.add.collider(this.player.sprite, this.obstacles, () => this.gameOver(), null, this);
        this.physics.add.collider(this.player.sprite, this.blocks);
        this.physics.add.overlap(this.player.sprite, this.portals, (player, portal) => {
            this.handlePortalCollision(player, portal);
        });
        
        // Setup camera
        this.cameras.main.startFollow(this.player.sprite);
        this.cameras.main.setFollowOffset(-GameConfig.width / 3, -GameConfig.height / 2);
        
        // Setup UI
        this.createUI();
        
        // Game over button
        this.gameOverButton = this.add.text(100, 650, 'Retry', {
            fontSize: '24px',
            fill: '#ffffff',
            backgroundColor: '#ff3333',
            padding: { x: 15, y: 8 }
        }).setInteractive({ useHandCursor: true });
        this.gameOverButton.on('pointerdown', () => this.retryLevel());
        this.gameOverButton.setVisible(false);
        
        // Settings button
        this.settingsButton = this.add.text(1180, 650, '⚙', {
            fontSize: '24px',
            fill: '#ffffff',
            backgroundColor: '#00ffff',
            padding: { x: 10, y: 8 }
        }).setInteractive({ useHandCursor: true });
        this.settingsButton.on('pointerdown', () => this.openSettings());
        
        // Pause handler
        this.pauseKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESCAPE);
        
        // Start music if available
        if (this.levelData.music) {
            this.music = this.sound.add(this.levelData.music);
            this.music.play({ loop: true });
        }
        
        this.events.emit('gameStart', { levelNum: this.levelNum });
    }
    
    loadLevelData(levelNum) {
        if (levelNum === 0) {
            // Editor mode - return empty level
            return {
                id: 'editor-level',
                name: 'Level Editor',
                startX: 100,
                groundY: 600,
                totalDistance: 5000,
                music: null,
                blocks: [],
                obstacles: [],
                portals: []
            };
        }
        
        // Try to load from JSON file
        const levelFile = `assets/levels/level-${levelNum}.json`;
        return this.cache.json.get(levelFile) || this.getDefaultLevel(levelNum);
    }
    
    getDefaultLevel(levelNum) {
        return {
            id: `level-${levelNum}`,
            name: `Level ${levelNum}`,
            startX: 100,
            groundY: 600,
            totalDistance: 5000,
            music: null,
            blocks: [],
            obstacles: [
                { x: 1000, y: 560, type: 'spike' },
                { x: 1500, y: 560, type: 'spike' },
                { x: 2000, y: 560, type: 'spike' },
                { x: 2040, y: 560, type: 'spike' },
                { x: 2080, y: 560, type: 'spike' },
                { x: 3000, y: 560, type: 'saw' },
                { x: 3500, y: 560, type: 'spike' },
                { x: 4000, y: 560, type: 'saw' }
            ],
            portals: []
        };
    }
    
    update(time, delta) {
        if (this.isGameOver || this.isPaused) return;
        
        // Check for pause
        if (Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
            this.togglePause();
            return;
        }
        
        // Update player
        this.player.update(time, delta);
        
        // Update score
        this.scoreManager.update(time, delta);
        
        // Update camera to follow player
        const targetX = this.player.sprite.x - GameConfig.width / 3;
        this.cameras.main.scrollX = Phaser.Math.Clamp(targetX, 0, this.levelData.totalDistance - GameConfig.width);
        
        // Check for death
        if (this.player.sprite.y > GameConfig.height + 100) {
            this.gameOver();
        }
        
        // Check for level completion
        if (this.player.sprite.x >= this.levelData.totalDistance) {
            this.levelComplete();
        }
        
        // Update UI
        this.updateUI(time, delta);
    }
    
    createBackground() {
        // Create gradient background
        const graphics = this.add.graphics();
        graphics.fillStyle(GameConfig.colors.backgroundTop, 1);
        graphics.fillRect(0, 0, GameConfig.width, GameConfig.height);
        
        // Add some geometric decorations
        graphics.lineStyle(2, 0x333366, 0.3);
        for (let i = 0; i < 20; i++) {
            const x = (i * 100) % GameConfig.width;
            const y = (i * 150) % GameConfig.height;
            const size = 20 + (i % 10) * 5;
            graphics.strokeRect(x, y, size, size);
        }
    }
    
    createGround() {
        const groundY = this.levelData.groundY || 600;
        const graphics = this.add.graphics();
        graphics.fillStyle(GameConfig.colors.playerCube, 1);
        graphics.fillRect(0, groundY, GameConfig.width, GameConfig.height - groundY);
        
        // Ground line
        graphics.lineStyle(3, 0xffffff);
        graphics.moveTo(0, groundY);
        graphics.lineTo(GameConfig.width, groundY);
        graphics.strokePath();
    }
    
    createObstacles() {
        if (!this.levelData.obstacles) return;
        
        this.levelData.obstacles.forEach(obs => {
            const obstacle = new Obstacle(this, obs.x, obs.y, obs.type);
            this.obstacles.add(obstacle.sprite);
        });
    }
    
    createPortals() {
        if (!this.levelData.portals) return;
        
        this.levelData.portals.forEach(portal => {
            const p = new Portal(this, portal.x, portal.y, portal.type);
            this.portals.add(p.sprite);
        });
    }
    
    createBlocks() {
        if (!this.levelData.blocks) return;
        
        this.levelData.blocks.forEach(block => {
            const graphics = this.add.graphics();
            graphics.fillStyle(0xcccccc, 1);
            graphics.fillRect(block.x, block.y, block.width, block.height);
            graphics.lineStyle(2, 0xffffff);
            graphics.strokeRect(block.x, block.y, block.width, block.height);
            
            const sprite = graphics.generateTexture(`block_${block.x}`, block.width, block.height);
            this.blocks.create(block.x, block.y, sprite).refreshBody();
        });
    }
    
    createUI() {
        // Level info
        this.levelText = this.add.text(20, 20, `Level: ${this.levelNum}`, {
            fontSize: '24px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        });
        
        // Score
        this.scoreText = this.add.text(20, 50, 'Score: 0%', {
            fontSize: '24px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        });
        
        // Attempts
        this.attemptsText = this.add.text(20, 80, 'Attempts: 0', {
            fontSize: '20px',
            fill: '#aaaaaa',
            fontFamily: 'Arial'
        });
        
        this.updateAttempts();
    }
    
    updateUI(time, delta) {
        const progress = this.scoreManager.getProgress(this.player.sprite.x);
        this.scoreText.setText(`Score: ${progress}%`);
    }
    
    updateAttempts() {
        const attempts = this.saveManager.getLevelAttempts(this.levelNum);
        this.attemptsText.setText(`Attempts: ${attempts}`);
    }
    
    loadLevel(levelNum) {
        // Default level data
        return {
            id: `level-${levelNum}`,
            name: `Level ${levelNum}`,
            startX: 100,
            groundY: 600,
            totalDistance: 5000,
            music: null,
            blocks: [],
            obstacles: [
                { x: 1000, y: 560, type: 'spike' },
                { x: 1500, y: 560, type: 'spike' },
                { x: 2000, y: 560, type: 'spike' },
                { x: 2040, y: 560, type: 'spike' },
                { x: 2080, y: 560, type: 'spike' },
                { x: 3000, y: 560, type: 'saw' },
                { x: 3500, y: 560, type: 'spike' },
                { x: 4000, y: 560, type: 'saw' }
            ],
            portals: [],
            groundY: 600
        };
    }
    
    handlePortalCollision(player, portal) {
        portal.destroy();
        this.portals.remove(portal);
        
        // Portal effects
        this.add.particles(player.x, player.y, 'spark', {
            speed: { min: 50, max: 150 },
            scale: { start: 1, end: 0 },
            blendMode: 'ADD',
            lifespan: 300,
            quantity: 20,
            gravity: { y: 200 }
        });
        
        // Portal type effects
        if (portal.type === 'gravity') {
            // Will be implemented in Player class
        }
    }
    
    togglePause() {
        if (this.isPaused) {
            this.scene.resume('GameScene');
            this.isPaused = false;
        } else {
            this.scene.pause('GameScene');
            this.scene.launch('PauseScene', { parentScene: this });
            this.isPaused = true;
        }
    }
    
    gameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        
        // Save attempt
        this.saveManager.incrementLevelAttempts(this.levelNum);
        this.updateAttempts();
        
        // Death effect
        this.deathEffect(this.player.sprite.x, this.player.sprite.y);
        
        // Show game over UI
        this.gameOverButton.setVisible(true);
        this.add.text(this.cameras.main.scrollX + GameConfig.width / 2, GameConfig.height / 2, 'GAME OVER', {
            fontSize: '64px',
            fill: '#ff3333',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        // Show death animation
        this.add.particles(this.player.sprite.x, this.player.sprite.y, 'spark', {
            speed: { min: 100, max: 300 },
            scale: { start: 1, end: 0 },
            blendMode: 'ADD',
            lifespan: 500,
            quantity: 50,
            gravity: { y: 300 }
        });
        
        this.time.delayedCall(1500, () => {
            this.scene.launch('GameOverScene', {
                levelNum: this.levelNum,
                score: this.scoreManager.getProgress(this.player.sprite.x),
                retryCallback: () => this.retryLevel()
            });
        });
    }
    
    deathEffect(x, y) {
        // Simple flash effect
        const graphics = this.add.graphics();
        graphics.fillStyle(0xffffff, 0.8);
        graphics.fillRect(0, 0, GameConfig.width, GameConfig.height);
        this.time.delayedCall(100, () => graphics.destroy());
    }
    
    levelComplete() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        
        // Save level completion
        this.saveManager.saveLevelProgress(this.levelNum, 100);
        
        this.add.text(this.cameras.main.scrollX + GameConfig.width / 2, GameConfig.height / 2, 'LEVEL COMPLETE!', {
            fontSize: '64px',
            fill: '#00ff00',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        this.time.delayedCall(2000, () => {
            this.scene.start('MenuScene');
        });
    }
    
    retryLevel() {
        this.scene.restart({ levelNum: this.levelNum });
    }
    
    openSettings() {
        console.log('Open settings');
    }
}
