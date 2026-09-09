import { describe, it, expect } from 'vitest';
import { GameConstants, InputConstants, GameEvents } from '@/utils/Constants';

describe('Constants - Retroactive Tests', () => {
  describe('GameConstants', () => {
    it('should have PLAYER_HEALTH defined', () => {
      expect(GameConstants.PLAYER_HEALTH).toBeDefined();
      expect(typeof GameConstants.PLAYER_HEALTH).toBe('number');
    });

    it('should have PLAYER_LIVES defined', () => {
      expect(GameConstants.PLAYER_LIVES).toBeDefined();
      expect(typeof GameConstants.PLAYER_LIVES).toBe('number');
    });

    it('should have PLAYER_SPEED defined', () => {
      expect(GameConstants.PLAYER_SPEED).toBeDefined();
      expect(typeof GameConstants.PLAYER_SPEED).toBe('number');
    });

    it('should have JUMP_FORCE defined', () => {
      expect(GameConstants.JUMP_FORCE).toBeDefined();
      expect(typeof GameConstants.JUMP_FORCE).toBe('number');
    });

    it('should have GRAVITY defined', () => {
      expect(GameConstants.GRAVITY).toBeDefined();
      expect(typeof GameConstants.GRAVITY).toBe('number');
    });

    it('should have MAX_JUMP_VELOCITY defined', () => {
      expect(GameConstants.MAX_JUMP_VELOCITY).toBeDefined();
      expect(typeof GameConstants.MAX_JUMP_VELOCITY).toBe('number');
    });

    it('should have valid values', () => {
      expect(GameConstants.PLAYER_HEALTH).toBeGreaterThan(0);
      expect(GameConstants.PLAYER_LIVES).toBeGreaterThan(0);
      expect(GameConstants.PLAYER_SPEED).toBeGreaterThan(0);
      expect(GameConstants.JUMP_FORCE).toBeGreaterThan(0);
      expect(GameConstants.GRAVITY).toBeGreaterThan(0);
    });
  });

  describe('InputConstants', () => {
    it('should have GAMEPAD_DEADZONE defined', () => {
      expect(InputConstants.GAMEPAD_DEADZONE).toBeDefined();
      expect(typeof InputConstants.GAMEPAD_DEADZONE).toBe('number');
    });

    it('should have valid deadzone value', () => {
      expect(InputConstants.GAMEPAD_DEADZONE).toBeGreaterThanOrEqual(0);
      expect(InputConstants.GAMEPAD_DEADZONE).toBeLessThanOrEqual(1);
    });
  });

  describe('GameEvents', () => {
    it('should have LEVEL_START event defined', () => {
      expect(GameEvents.LEVEL_START).toBeDefined();
      expect(typeof GameEvents.LEVEL_START).toBe('string');
    });

    it('should have PLAYER_DIED event defined', () => {
      expect(GameEvents.PLAYER_DIED).toBeDefined();
      expect(typeof GameEvents.PLAYER_DIED).toBe('string');
    });

    it('should have SCORE_CHANGED event defined', () => {
      expect(GameEvents.SCORE_CHANGED).toBeDefined();
      expect(typeof GameEvents.SCORE_CHANGED).toBe('string');
    });
  });
});
