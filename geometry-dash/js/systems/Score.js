import { Scene } from 'phaser';

export class ScoreManager {
    constructor(scene) {
        this.scene = scene;
        this.startTime = 0;
        this.distance = 0;
    }
    
    update(time, delta) {
        // Update distance based on player position
        if (this.scene.player && this.scene.player.sprite) {
            this.distance = this.scene.player.sprite.x;
        }
    }
    
    // Calculate score as percentage of level completion
    getProgress(currentX) {
        const totalDistance = this.scene.levelData?.totalDistance || 5000;
        return Math.min(100, Math.max(0, Math.round((currentX / totalDistance) * 100)));
    }
    
    // Get raw distance
    getDistance() {
        return this.distance;
    }
    
    // Reset score
    reset() {
        this.startTime = Date.now();
        this.distance = 0;
    }
}
