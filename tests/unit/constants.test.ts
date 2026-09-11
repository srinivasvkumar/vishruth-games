import { describe, it, expect } from 'vitest';
import { GameConstants, GameEvents } from '@/utils/Constants';

/**
 * D0.2 G5 alignment notes (see tests/evidence/d02/T2-red-analysis.md §3.1/§3.2):
 * - The old tests expected `InputConstants.GAMEPAD_DEADZONE`; the implemented
 *   module puts GAMEPAD_DEADZONE on `GameConstants` (value 0.15, src/utils/
 *   Constants.ts). The two deadzone tests now assert against GameConstants.
 * - The old tests expected `GameEvents.PLAYER_DIED` / `SCORE_CHANGED`; the
 *   implemented event names are `PLAYER_DEATH` ('player:death') and
 *   `PLAYER_SCORE` ('player:score'). Tests now pin the ACTUAL names.
 * Task 0.2.2 rule: tests verify CURRENT behavior, not desired behavior —
 * no src/ changes.
 */
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

    // Deadzone lives on GameConstants in the implemented module (0.15) —
    // aligned from InputConstants (D0.2 G5).
    it('should have GAMEPAD_DEADZONE defined', () => {
      expect(GameConstants.GAMEPAD_DEADZONE).toBeDefined();
      expect(typeof GameConstants.GAMEPAD_DEADZONE).toBe('number');
    });

    it('should have valid deadzone value', () => {
      expect(GameConstants.GAMEPAD_DEADZONE).toBeGreaterThanOrEqual(0);
      expect(GameConstants.GAMEPAD_DEADZONE).toBeLessThanOrEqual(1);
    });
  });

  describe('GameEvents', () => {
    it('should have LEVEL_START event defined', () => {
      expect(GameEvents.LEVEL_START).toBeDefined();
      expect(typeof GameEvents.LEVEL_START).toBe('string');
    });

    // Aligned from PLAYER_DIED to the implemented event name (D0.2 G5).
    it('should have PLAYER_DEATH event defined', () => {
      expect(GameEvents.PLAYER_DEATH).toBeDefined();
      expect(typeof GameEvents.PLAYER_DEATH).toBe('string');
    });

    // Aligned from SCORE_CHANGED to the implemented event name (D0.2 G5).
    it('should have PLAYER_SCORE event defined', () => {
      expect(GameEvents.PLAYER_SCORE).toBeDefined();
      expect(typeof GameEvents.PLAYER_SCORE).toBe('string');
    });
  });
});
