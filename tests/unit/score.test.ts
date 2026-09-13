/**
 * W2-D.1: Score manager pure functions + LocalStorage persistence (RED phase)
 *
 * TDD cycle for TDD_PLAN.md Task 7.1.
 *
 * Design: `ScoreManager` lives in `src/systems/Score.ts`.
 *   - Core score math is exposed as PURE functions (no class state, no
 *     side effects) so they are trivially unit-testable and deterministic.
 *   - `ScoreManager` wraps those pure functions with a small stateful
 *     interface and adds LocalStorage persistence for the high score.
 *
 * Pure functions (exported):
 *   - computeScore(current, points, multiplier): number
 *       Adds `points * multiplier` to `current`, clamped to
 *       MAX_SAFE_INTEGER on overflow.
 *   - subtractScore(current, points): number
 *       Subtracts `points` from `current`, clamped to 0 on underflow.
 *   - applyMultiplier(base, multiplier): number
 *       Returns `base * multiplier` clamped to MAX_SAFE_INTEGER.
 *   - clampScore(value): number
 *       Returns `value` clamped to [0, MAX_SAFE_INTEGER].
 *
 * Class:
 *   - ScoreManager
 *       - constructor(storage?: Storage)  — accepts a Storage-like for
 *         testability; defaults to window.localStorage.
 *       - addScore(points, multiplier?)
 *       - subtractScore(points)
 *       - getScore(): number
 *       - getMultiplier(): number
 *       - setMultiplier(multiplier: number): void
 *       - reset(): void
 *       - getHighScore(): number
 *       - saveHighScore(): void
 *       - loadHighScore(): number
 *       - isNewHighScore(): boolean
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeScore,
  subtractScore,
  applyMultiplier,
  clampScore,
  ScoreManager,
} from '@/systems/Score';

// ── Pure function tests ────────────────────────────────────────────────────

describe('Score pure functions (W2-D.1)', () => {
  describe('computeScore', () => {
    it('adds points with multiplier 1 to current score', () => {
      expect(computeScore(100, 50, 1)).toBe(150);
    });

    it('adds points multiplied by multiplier', () => {
      expect(computeScore(100, 50, 2)).toBe(200);
    });

    it('handles zero multiplier', () => {
      expect(computeScore(100, 50, 0)).toBe(100);
    });

    it('handles zero points', () => {
      expect(computeScore(100, 0, 5)).toBe(100);
    });

    it('handles zero current score', () => {
      expect(computeScore(0, 50, 2)).toBe(100);
    });

    it('clamps overflow at MAX_SAFE_INTEGER', () => {
      const max = Number.MAX_SAFE_INTEGER;
      expect(computeScore(max, 1, 1)).toBe(max);
      expect(computeScore(max - 10, 100, 1)).toBe(max);
    });

    it('handles large but safe scores', () => {
      expect(computeScore(1_000_000, 500, 10)).toBe(1_005_000);
    });
  });

  describe('subtractScore', () => {
    it('subtracts points from current score', () => {
      expect(subtractScore(100, 30)).toBe(70);
    });

    it('clamps underflow at 0', () => {
      expect(subtractScore(50, 100)).toBe(0);
    });

    it('handles zero subtraction', () => {
      expect(subtractScore(100, 0)).toBe(100);
    });

    it('handles zero current score', () => {
      expect(subtractScore(0, 50)).toBe(0);
    });
  });

  describe('applyMultiplier', () => {
    it('multiplies base by multiplier', () => {
      expect(applyMultiplier(100, 3)).toBe(300);
    });

    it('handles multiplier of 1', () => {
      expect(applyMultiplier(100, 1)).toBe(100);
    });

    it('handles multiplier of 0', () => {
      expect(applyMultiplier(100, 0)).toBe(0);
    });

    it('clamps overflow at MAX_SAFE_INTEGER', () => {
      const max = Number.MAX_SAFE_INTEGER;
      expect(applyMultiplier(max, 2)).toBe(max);
    });
  });

  describe('clampScore', () => {
    it('returns value unchanged when in range', () => {
      expect(clampScore(500)).toBe(500);
    });

    it('clamps negative values to 0', () => {
      expect(clampScore(-10)).toBe(0);
    });

    it('clamps overflow to MAX_SAFE_INTEGER', () => {
      const max = Number.MAX_SAFE_INTEGER;
      expect(clampScore(max + 1)).toBe(max);
    });

    it('returns 0 for NaN', () => {
      expect(clampScore(NaN)).toBe(0);
    });
  });
});

// ── ScoreManager class tests ──────────────────────────────────────────────

describe('ScoreManager (W2-D.1)', () => {
  let manager: ScoreManager;

  beforeEach(() => {
    manager = new ScoreManager();
  });

  describe('construction', () => {
    it('initial score is 0', () => {
      expect(manager.getScore()).toBe(0);
    });

    it('initial multiplier is 1', () => {
      expect(manager.getMultiplier()).toBe(1);
    });

    it('initial high score is 0', () => {
      expect(manager.getHighScore()).toBe(0);
    });
  });

  describe('addScore', () => {
    it('increases score by points with default multiplier', () => {
      manager.addScore(100);
      expect(manager.getScore()).toBe(100);
    });

    it('applies multiplier when provided', () => {
      manager.addScore(100, 2);
      expect(manager.getScore()).toBe(200);
    });

    it('accumulates across multiple calls', () => {
      manager.addScore(50);
      manager.addScore(30);
      expect(manager.getScore()).toBe(80);
    });

    it('clamps overflow at MAX_SAFE_INTEGER', () => {
      const max = Number.MAX_SAFE_INTEGER;
      manager.addScore(max);
      expect(manager.getScore()).toBe(max);
      manager.addScore(100);
      expect(manager.getScore()).toBe(max);
    });
  });

  describe('subtractScore', () => {
    it('decreases score', () => {
      manager.addScore(100);
      manager.subtractScore(30);
      expect(manager.getScore()).toBe(70);
    });

    it('clamps at 0', () => {
      manager.subtractScore(50);
      expect(manager.getScore()).toBe(0);
    });
  });

  describe('multiplier', () => {
    it('sets and retrieves multiplier', () => {
      manager.setMultiplier(3);
      expect(manager.getMultiplier()).toBe(3);
    });

    it('applies multiplier to subsequent addScore calls', () => {
      manager.setMultiplier(2);
      manager.addScore(50);
      expect(manager.getScore()).toBe(100);
    });
  });

  describe('reset', () => {
    it('resets score and multiplier to defaults', () => {
      manager.addScore(100, 2);
      manager.reset();
      expect(manager.getScore()).toBe(0);
      expect(manager.getMultiplier()).toBe(1);
    });
  });
});

// ── LocalStorage persistence tests ────────────────────────────────────────

/**
 * Simulates a fresh "session" by creating a new Storage instance.
 * happy-dom provides localStorage; we use a simple in-memory shim to
 * guarantee isolation between "sessions" in the test.
 */
class InMemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return index < keys.length ? keys[index] : null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

describe('ScoreManager LocalStorage persistence (W2-D.1)', () => {
  describe('saveHighScore / loadHighScore across sessions', () => {
    it('saves high score to storage and loads it in a new "session"', () => {
      const storage = new InMemoryStorage();
      const session1 = new ScoreManager(storage);

      session1.addScore(500);
      session1.saveHighScore();

      // Simulate a new "session" — same storage, new manager instance
      const session2 = new ScoreManager(storage);
      const loaded = session2.loadHighScore();

      expect(loaded).toBe(500);
      expect(session2.getHighScore()).toBe(500);
    });

    it('returns 0 when no high score has been saved', () => {
      const storage = new InMemoryStorage();
      const manager = new ScoreManager(storage);
      expect(manager.loadHighScore()).toBe(0);
    });

    it('does not overwrite a higher existing high score', () => {
      const storage = new InMemoryStorage();
      const session1 = new ScoreManager(storage);
      session1.addScore(1000);
      session1.saveHighScore();

      const session2 = new ScoreManager(storage);
      session2.addScore(500);
      session2.saveHighScore();

      // High score should remain 1000, not drop to 500
      const session3 = new ScoreManager(storage);
      expect(session3.getHighScore()).toBe(1000);
    });

    it('overwrites a lower existing high score', () => {
      const storage = new InMemoryStorage();
      const session1 = new ScoreManager(storage);
      session1.addScore(500);
      session1.saveHighScore();

      const session2 = new ScoreManager(storage);
      session2.addScore(1000);
      session2.saveHighScore();

      const session3 = new ScoreManager(storage);
      expect(session3.getHighScore()).toBe(1000);
    });

    it('isNewHighScore returns true when current beats stored high', () => {
      const storage = new InMemoryStorage();
      const session1 = new ScoreManager(storage);
      session1.addScore(200);
      session1.saveHighScore();

      const session2 = new ScoreManager(storage);
      session2.addScore(300);
      expect(session2.isNewHighScore()).toBe(true);
    });

    it('isNewHighScore returns false when current does not beat stored high', () => {
      const storage = new InMemoryStorage();
      const session1 = new ScoreManager(storage);
      session1.addScore(500);
      session1.saveHighScore();

      const session2 = new ScoreManager(storage);
      session2.addScore(300);
      expect(session2.isNewHighScore()).toBe(false);
    });

    it('isNewHighScore returns true on tie (same score)', () => {
      const storage = new InMemoryStorage();
      const session1 = new ScoreManager(storage);
      session1.addScore(400);
      session1.saveHighScore();

      const session2 = new ScoreManager(storage);
      session2.addScore(400);
      expect(session2.isNewHighScore()).toBe(true);
    });
  });

  describe('localStorage integration (happy-dom)', () => {
    it('persists to window.localStorage by default', () => {
      // happy-dom provides window.localStorage
      const manager = new ScoreManager();
      manager.addScore(1234);
      manager.saveHighScore();

      const stored = window.localStorage.getItem('cluster-rush-high-score');
      expect(stored).toBe('1234');
    });

    it('reads from window.localStorage on load', () => {
      window.localStorage.setItem('cluster-rush-high-score', '9999');
      const manager = new ScoreManager();
      expect(manager.getHighScore()).toBe(9999);
    });

    it('clears stored high score when explicitly reset', () => {
      window.localStorage.setItem('cluster-rush-high-score', '5000');
      const manager = new ScoreManager();
      manager.reset();
      expect(manager.getHighScore()).toBe(0);
    });
  });
});
