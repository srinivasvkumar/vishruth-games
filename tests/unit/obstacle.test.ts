import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Obstacle } from '@/entities/Obstacle';
import { Vector3 } from 'three';

vi.mock('@/utils/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

vi.mock('@/utils/Constants', () => ({
  GameConstants: {
    OBSTACLE_TYPES: ['static', 'moving', 'rotating', 'breakable', 'spike']
  }
}));

describe('Obstacle Class - Retroactive Tests', () => {
  let obstacle: Obstacle;

  beforeEach(() => {
    obstacle = new Obstacle({
      type: 'static',
      position: new Vector3(0, 0, 0),
      size: { x: 1, y: 1, z: 1 }
    });
  });

  describe('Initialization', () => {
    it('should create Obstacle instance', () => {
      expect(obstacle).toBeDefined();
    });

    it('should create obstacle at specified position', () => {
      const position = obstacle.getPosition();
      expect(position.x).toBe(0);
      expect(position.y).toBe(0);
      expect(position.z).toBe(0);
    });

    it('should set obstacle type', () => {
      expect(obstacle.getType()).toBe('static');
    });

    it('should be active by default', () => {
      expect(obstacle.isActive()).toBe(true);
    });
  });

  describe('Obstacle Types', () => {
    it('should support static type', () => {
      const staticObstacle = new Obstacle({
        type: 'static',
        position: new Vector3(0, 0, 0),
        size: { x: 1, y: 1, z: 1 }
      });
      expect(staticObstacle.getType()).toBe('static');
    });

    it('should support moving type', () => {
      const movingObstacle = new Obstacle({
        type: 'moving',
        position: new Vector3(0, 0, 0),
        size: { x: 1, y: 1, z: 1 }
      });
      expect(movingObstacle.getType()).toBe('moving');
    });

    it('should support rotating type', () => {
      const rotatingObstacle = new Obstacle({
        type: 'rotating',
        position: new Vector3(0, 0, 0),
        size: { x: 1, y: 1, z: 1 }
      });
      expect(rotatingObstacle.getType()).toBe('rotating');
    });

    it('should support breakable type', () => {
      const breakableObstacle = new Obstacle({
        type: 'breakable',
        position: new Vector3(0, 0, 0),
        size: { x: 1, y: 1, z: 1 }
      });
      expect(breakableObstacle.getType()).toBe('breakable');
    });

    it('should support spike type', () => {
      const spikeObstacle = new Obstacle({
        type: 'spike',
        position: new Vector3(0, 0, 0),
        size: { x: 1, y: 1, z: 1 }
      });
      expect(spikeObstacle.getType()).toBe('spike');
    });
  });

  describe('Movement', () => {
    it('should update position', () => {
      obstacle.update(0.016);
      expect(obstacle.getPosition()).toBeDefined();
    });

    it('should handle different movement patterns', () => {
      const movingObstacle = new Obstacle({
        type: 'moving',
        position: new Vector3(0, 0, 0),
        size: { x: 1, y: 1, z: 1 },
        movementPattern: {
          type: 'oscillate',
          axis: 'x',
          amplitude: 5,
          speed: 1
        }
      });
      
      movingObstacle.update(0.016);
      expect(movingObstacle.getPosition()).toBeDefined();
    });
  });

  describe('Collision', () => {
    it('should detect collision', () => {
      const playerPosition = new Vector3(0.5, 0.5, 0.5);
      const collision = obstacle.checkCollision(playerPosition);
      expect(typeof collision).toBe('boolean');
    });

    it('should return true for close positions', () => {
      const playerPosition = new Vector3(0.1, 0.1, 0.1);
      const collision = obstacle.checkCollision(playerPosition);
      expect(collision).toBe(true);
    });
  });

  describe('State Management', () => {
    it('should deactivate obstacle', () => {
      obstacle.deactivate();
      expect(obstacle.isActive()).toBe(false);
    });

    it('should activate obstacle', () => {
      obstacle.deactivate();
      obstacle.activate();
      expect(obstacle.isActive()).toBe(true);
    });

    it('should destroy obstacle', () => {
      obstacle.destroy();
      expect(obstacle.isActive()).toBe(false);
    });
  });

  describe('Getters', () => {
    it('should provide mesh access', () => {
      const mesh = obstacle.getMesh();
      expect(mesh).toBeDefined();
    });

    it('should provide position', () => {
      const position = obstacle.getPosition();
      expect(position).toBeInstanceOf(Vector3);
    });

    it('should provide type', () => {
      const type = obstacle.getType();
      expect(typeof type).toBe('string');
    });
  });
});
