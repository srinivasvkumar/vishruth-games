import { Scene } from 'phaser';
import { Constants } from '../utils/Constants.js';
import { GameConfig } from '../config.js';

export class Player {
    constructor(scene, x, y) {
        this.scene = scene;
        this.mode = Constants.CUBE;
        this.speed = GameConfig.settings.playerSpeed;
        this.jumpForce = GameConfig.settings.jumpForce;
        
        // Create player sprite using graphics
        this.graphics = scene.add.graphics();
        this.drawCube(0, 0, GameConfig.colors.playerCube);
        this.sprite = this.graphics.generateTexture('player', 40, 40);
        
        // Add physics body
        this.sprite = scene.physics.add.sprite(x, y, 'player');
        this.sprite.setCollideWorldBounds(true);
        this.sprite.setBounce(0.1);
        
        // Set initial velocity
        this.sprite.setVelocityX(this.speed);
        
        // Animation
        this.rotation = 0;
        this.isGrounded = false;
        
        // Input
        this.jumpPressed = false;
        this.scene.inputManager.onJump(() => {
            this.jump();
        });
    }
    
    update(time, delta) {
        // Auto-scroll
        this.sprite.setVelocityX(this.speed);
        
        // Rotation for cube mode
        if (this.mode === Constants.CUBE) {
            this.rotation += 0.1;
            this.sprite.angle = (this.rotation * 180) / Math.PI;
        }
        
        // Check if grounded
        this.isGrounded = this.sprite.y >= GameConfig.settings.groundY - 40;
        
        // Reset jump flag
        this.jumpPressed = false;
    }
    
    jump() {
        if (this.isGrounded) {
            this.sprite.setVelocityY(this.jumpForce);
            this.isGrounded = false;
        }
    }
    
    drawCube(x, y, color) {
        this.graphics.clear();
        this.graphics.fillStyle(color);
        this.graphics.lineStyle(2, 0xffffff);
        this.graphics.fillRect(0, 0, 40, 40);
        this.graphics.strokeRect(0, 0, 40, 40);
        
        // Add face
        this.graphics.fillStyle(0x000000);
        this.graphics.fillRect(10, 12, 6, 6); // Left eye
        this.graphics.fillRect(24, 12, 6, 6); // Right eye
        this.graphics.fillRect(14, 28, 12, 4); // Mouth
    }
    
    setMode(mode) {
        this.mode = mode;
        // Update sprite based on mode
        const colors = {
            [Constants.CUBE]: GameConfig.colors.playerCube,
            [Constants.SHIP]: GameConfig.colors.playerShip,
            [Constants.BALL]: GameConfig.colors.playerBall,
            [Constants.UFO]: GameConfig.colors.playerUfo,
            [Constants.WAVE]: GameConfig.colors.playerWave,
            [Constants.SPIDER]: GameConfig.colors.playerSpider,
            [Constants.ROBOT]: GameConfig.colors.playerRobot,
            [Constants.FLUX]: GameConfig.colors.playerFlux
        };
        
        this.drawCube(0, 0, colors[mode] || colors[Constants.CUBE]);
        this.sprite.setTexture(this.graphics.generateTexture(`player_${mode}`, 40, 40));
    }
}
