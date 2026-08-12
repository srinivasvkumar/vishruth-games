import { Scene } from 'phaser';
import { Constants } from '../utils/Constants.js';

export class Portal {
    constructor(scene, x, y, type) {
        this.scene = scene;
        this.type = type;
        this.x = x;
        this.y = y;
        
        this.graphics = scene.add.graphics();
        this.drawPortal(x, y, type);
        
        this.sprite = scene.physics.add.sprite(x, y, 'portal');
        this.sprite.setImmovable(true);
    }
    
    drawPortal(x, y, type) {
        this.graphics.clear();
        
        // Color based on type
        const colors = {
            [Constants.GRAVITY]: '#aa00ff', // Purple
            [Constants.SHRINK]: '#00ff00',  // Green
            [Constants.GROW]: '#ff0000'     // Red
        };
        
        const color = colors[type] || colors[Constants.GRAVITY];
        this.graphics.fillStyle(color);
        this.graphics.lineStyle(2, 0xffffff);
        
        // Draw portal circle
        this.graphics.beginPath();
        this.graphics.arc(x + 30, y + 30, 25, 0, Math.PI * 2);
        this.graphics.fillPath();
        this.graphics.strokePath();
        
        // Draw swirl effect
        this.graphics.lineStyle(2, 0xffffff);
        this.graphics.beginPath();
        this.graphics.arc(x + 30, y + 30, 15, 0, Math.PI);
        this.graphics.strokePath();
        
        // Draw label
        this.graphics.fillStyle(0xffffff);
        this.graphics.font = '12px Arial';
        this.graphics.fillText(type.substring(0, 3).toUpperCase(), x + 15, y + 35);
    }
}
