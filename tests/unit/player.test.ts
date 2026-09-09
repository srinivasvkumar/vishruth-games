import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Player } from '@/entities/Player';
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
    PLAYER_HEALTH: 100,
    PLAYER_LIVES: 3,
    PLAYER_SPEED: 10,
    JUMP_FORCE: 15,
    GRAVITY: 20,
    MAX_JUMP_VELOCITY: 30
  }
}));

describe('Player Class - Retroactive Tests', () => {
  let player: Player;

  beforeEach(() => {
    player = new Player(new Vector3(0, 1, 0));
  });

  describe('Initialization', () => {
    it('should create Player instance', () => {
      expect(player).toBeDefined();
    });

    it('should create player mesh at specified position', () => {
      const position = player.getPosition();
      expect(position.x).toBe(0);
      expect(position.y).toBe(1);
      expect(position.z).toBe(0);
    });

    it('should start with default health', () => {
      const state = player.getState();
      expect(state.health).toBe(100);
    });

    it('should start with default lives', () => {
      const state = player.getState();
      expect(state.lives).toBe(3);
    });

    it('should start with zero score', () => {
      const state = player.getState();
      expect(state.score).toBe(0);
    });

    it('should start alive', () => {
      expect(player.isPlayerAlive()).toBe(true);
    });

    it('should have empty power-ups initially', () => {
      const state = player.getState();
      expect(state.powerUps).toEqual([]);
    });

    it('should not be invincible initially', () => {
      const state = player.getState();
      expect(state.isInvincible).toBe(false);
    });

    it('should not be jumping initially', () => {
      const state = player.getState();
      expect(state.isJumping).toBe(false);
    });

    it('should have zero velocity initially', () => {
      const velocity = player.getVelocity();
      expect(velocity.x).toBe(0);
      expect(velocity.y).toBe(0);
      expect(velocity.z).toBe(0);
    });
  });

  describe('Movement', () => {
    it('should move forward with W key', () => {
      const initialZ = player.getPosition().z;
      player.update(0.016, { w: true });
      const newZ = player.getPosition().z;
      expect(newZ).toBeLessThan(initialZ);
    });

    it('should move backward with S key', () => {
      const initialZ = player.getPosition().z;
      player.update(0.016, { s: true });
      const newZ = player.getPosition().z;
      expect(newZ).toBeGreaterThan(initialZ);
    });

    it('should move left with A key', () => {
      const initialX = player.getPosition().x;
      player.update(0.016, { a: true });
      const newX = player.getPosition().x;
      expect(newX).toBeLessThan(initialX);
    });

    it('should move right with D key', () => {
      const initialX = player.getPosition().x;
      player.update(0.016, { d: true });
      const newX = player.getPosition().x;
      expect(newX).toBeGreaterThan(initialX);
    });

    it('should support arrow keys for movement', () => {
      player.update(0.016, { arrowup: true });
      expect(player.getVelocity().z).toBeLessThan(0);
    });

    it('should not move when no keys pressed', () => {
      const initialPosition = player.getPosition();
      player.update(0.016, {});
      const newPosition = player.getPosition();
      expect(newPosition.x).toBe(initialPosition.x);
      expect(newPosition.z).toBe(initialPosition.z);
    });

    it('should handle combined movement', () => {
      player.update(0.016, { w: true, d: true });
      const velocity = player.getVelocity();
      expect(velocity.x).toBeGreaterThan(0);
      expect(velocity.z).toBeLessThan(0);
    });
  });

  describe('Jump Mechanics', () => {
    it('should jump when SPACE is pressed and grounded', () => {
      player.update(0.016, { ' ': true });
      const velocity = player.getVelocity();
      expect(velocity.y).toBeGreaterThan(0);
    });

    it('should set isJumping to true when jumping', () => {
      player.update(0.016, { ' ': true });
      const state = player.getState();
      expect(state.isJumping).toBe(true);
    });

    it('should not jump when already jumping', () => {
      player.update(0.016, { ' ': true });
      const initialY = player.getVelocity().y;
      player.update(0.016, { ' ': true });
      expect(player.getVelocity().y).toBe(initialY);
    });

    it('should apply gravity', () => {
      player.update(0.016, {});
      const velocity = player.getVelocity();
      expect(velocity.y).toBeLessThan(0);
    });

    it('should prevent jumping through floor', () => {
      // Set player at ground level
      const mockMesh = player.getMesh();
      mockMesh.position.y = 0;
      
      player.update(0.016, {});
      expect(mockMesh.position.y).toBe(0);
    });
  });

  describe('Damage and Health', () => {
    it('should take damage', () => {
      player.damage(20);
      const state = player.getState();
      expect(state.health).toBe(80);
    });

    it('should not reduce health below zero', () => {
      player.damage(150);
      const state = player.getState();
      expect(state.health).toBe(0);
    });

    it('should die when health reaches zero', () => {
      player.damage(100);
      expect(player.isPlayerAlive()).toBe(false);
    });

    it('should decrement lives on death', () => {
      player.damage(100);
      const state = player.getState();
      expect(state.lives).toBe(2);
    });

    it('should be invincible when invincibility power-up is active', () => {
      player.addPowerUp('invincibility', 5000);
      player.damage(50);
      const state = player.getState();
      expect(state.health).toBe(100); // No damage taken
    });
  });

  describe('Healing', () => {
    it('should heal player', () => {
      player.damage(30);
      player.heal(20);
      const state = player.getState();
      expect(state.health).toBe(90);
    });

    it('should not exceed max health', () => {
      player.heal(100);
      const state = player.getState();
      expect(state.health).toBe(100);
    });
  });

  describe('Scoring', () => {
    it('should add score', () => {
      player.addScore(100);
      const state = player.getState();
      expect(state.score).toBe(100);
    });

    it('should accumulate score', () => {
      player.addScore(50);
      player.addScore(30);
      const state = player.getState();
      expect(state.score).toBe(80);
    });
  });

  describe('Power-ups', () => {
    it('should add power-up', () => {
      player.addPowerUp('speed', 3000);
      const state = player.getState();
      expect(state.powerUps).toContain('speed');
    });

    it('should add multiple power-ups', () => {
      player.addPowerUp('speed', 3000);
      player.addPowerUp('shield', 5000);
      const state = player.getState();
      expect(state.powerUps).toContain('speed');
      expect(state.powerUps).toContain('shield');
    });

    it('should set invincibility flag for invincibility power-up', () => {
      player.addPowerUp('invincibility', 5000);
      const state = player.getState();
      expect(state.isInvincible).toBe(true);
    });
  });

  describe('Respawn', () => {
    it('should respawn dead player', () => {
      player.damage(100);
      expect(player.isPlayerAlive()).toBe(false);
      
      player.respawn();
      expect(player.isPlayerAlive()).toBe(true);
    });

    it('should restore health on respawn', () => {
      player.damage(50);
      player.respawn();
      const state = player.getState();
      expect(state.health).toBe(100);
    });

    it('should respawn at specified position', () => {
      const customPosition = new Vector3(5, 2, 10);
      player.respawn(customPosition);
      const position = player.getPosition();
      expect(position.x).toBe(5);
      expect(position.y).toBe(2);
      expect(position.z).toBe(10);
    });

    it('should reset velocity on respawn', () => {
      player.update(0.016, { d: true });
      player.damage(100);
      player.respawn();
      
      const velocity = player.getVelocity();
      expect(velocity.x).toBe(0);
      expect(velocity.y).toBe(0);
      expect(velocity.z).toBe(0);
    });

    it('should not respawn alive player', () => {
      const initialAlive = player.isPlayerAlive();
      player.respawn();
      expect(player.isPlayerAlive()).toBe(initialAlive);
    });
  });

  describe('Getters', () => {
    it('should provide mesh access', () => {
      const mesh = player.getMesh();
      expect(mesh).toBeDefined();
    });

    it('should provide position copy', () => {
      const position = player.getPosition();
      expect(position).toBeInstanceOf(Vector3);
    });

    it('should provide velocity copy', () => {
      const velocity = player.getVelocity();
      expect(velocity).toBeInstanceOf(Vector3);
    });

    it('should provide state copy', () => {
      const state = player.getState();
      expect(state).toBeDefined();
      expect(state.health).toBe(100);
    });
  });

  describe('Death and Game Over', () => {
    it('should mark player as dead when lives exhausted', () => {
      player.damage(100); // Lose 1 life
      player.damage(100); // Lose 2nd life
      player.damage(100); // Lose 3rd life (game over)
      expect(player.isPlayerAlive()).toBe(false);
    });

    it('should allow respawn when lives remain', () => {
      player.damage(100); // Lose 1 life, 2 remain
      expect(player.isPlayerAlive()).toBe(false);
      player.respawn();
      expect(player.isPlayerAlive()).toBe(true);
    });
  });
});
