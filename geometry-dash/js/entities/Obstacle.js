import { Scene } from 'phaser';
import { Constants } from '../utils/Constants.js';

export class Obstacle {
    constructor(scene, x, y, type) {
        this.scene = scene;
        this.type = type;
        this.x = x;
        this.y = y;
        
        this.graphics = scene.add.graphics();
        
        switch (type) {
            case Constants.SPIKE:
                this.drawSpike(x, y);
                break;
            case Constants.SAW:
                this.drawSaw(x, y);
                break;
            case Constants.BLOCK:
                this.drawBlock(x, y);
                break;
            default:
                this.drawSpike(x, y);
        }
        
        this.sprite = scene.physics.add.sprite(x, y, 'obstacle');
        this.sprite.setImmovable(true);
    }
    
    drawSpike(x, y) {
        this.graphics.clear();
        this.graphics.fillStyle(Constants.COLORS.SPIKE);
        this.graphics.lineStyle(2, 0xffaaaa);
        
        // Draw triangle spike
        this.graphics.beginPath();
        this.graphics.moveTo(x + 20, y - 20);
        this.graphics.lineTo(x + 40, y + 20);
        this.graphics.lineTo(x, y + 20);
        this.graphics.closePath();
        this.graphics.fillPath();
        this.graphics.strokePath();
    }
    
    drawSaw(x, y) {
        this.graphics.clear();
        this.graphics.fillStyle(Constants.COLORS.SAW);
        this.graphics.lineStyle(2, 0xffcccc);
        
        // Draw circle with teeth
        this.graphics.beginPath();
        this.graphics.arc(x + 25, y + 25, 20, 0, Math.PI * 2);
        this.graphics.fillPath();
        this.graphics.strokePath();
        
        // Draw teeth
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            this.graphics.beginPath();
            this.graphics.moveTo(x + 25 + Math.cos(angle) * 20, y + 25 + Math.sin(angle) * 20);
            this.graphics.lineTo(x + 25 + Math.cos(angle) * 25, y + 25 + Math.sin(angle) * 25);
            this.graphics.strokePath();
        }
    }
    
    drawBlock(x, y) {
        this.graphics.clear();
        this.graphics.fillStyle(0xcccccc);
        this.graphics.lineStyle(2, 0xffffff);
        this.graphics.fillRect(x, y, 50, 50);
        this.graphics.strokeRect(x, y, 50, 50);
    }
}
