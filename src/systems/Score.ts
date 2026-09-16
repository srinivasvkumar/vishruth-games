/**
 * Score manager (W2-D.1 / TDD_PLAN.md Task 7.1)
 *
 * Core score math is exposed as PURE functions so they are deterministic
 * and trivially unit-testable. `ScoreManager` wraps those pure functions
 * with a small stateful interface and adds LocalStorage persistence for
 * the high score.
 *
 * Design decisions:
 *   - Pure functions never mutate or read global state.
 *   - Overflow clamp: scores are clamped to Number.MAX_SAFE_INTEGER so a
 *     runaway multiplier can never produce Infinity or loss of precision.
 *   - Underflow clamp: subtracting more than the current score floors at 0.
 *   - LocalStorage key is a fixed constant so the HUD / game-over screen
 *     can read the same key without coupling to the class.
 */

/** Storage key used for high-score persistence. */
export const HIGH_SCORE_KEY = 'cluster-rush-high-score';

/** Maximum representable score before we clamp to avoid precision loss. */
const MAX_SAFE_SCORE = Number.MAX_SAFE_INTEGER;

// ── Pure functions ─────────────────────────────────────────────────────────

/**
 * Clamp a value to [0, MAX_SAFE_SCORE]. Returns 0 for NaN / non-finite.
 */
export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= MAX_SAFE_SCORE) return MAX_SAFE_SCORE;
  return Math.floor(value);
}

/**
 * Compute a new score: `current + points * multiplier`, clamped.
 */
export function computeScore(
  current: number,
  points: number,
  multiplier: number,
): number {
  return clampScore(current + points * multiplier);
}

/**
 * Subtract points from the current score, clamped at 0.
 */
export function subtractScore(current: number, points: number): number {
  return clampScore(current - points);
}

/**
 * Multiply a base score by a multiplier, clamped.
 */
export function applyMultiplier(base: number, multiplier: number): number {
  return clampScore(base * multiplier);
}

/**
 * W3-A.9: Canonical high-score read — behavior-normalized DRY.
 *
 * Superset of the 3 previously divergent copies:
 *   1. ScoreManager.loadHighScore() — had clampScore, NO try/catch
 *   2. MenuScene.readStoredHighScore() — had try/catch, NO clampScore
 *   3. GameOverScene.readStoredHighScore() — had try/catch, NO clampScore
 *
 * Two deliberate bug fixes:
 *   Fix A (crash): try/catch — returns 0 when storage is unavailable
 *     (privacy mode), instead of throwing.
 *   Fix B (cap): clampScore — caps at MAX_SAFE_INTEGER, so menu/gameover
 *     display now matches the in-game recorded score (was uncapped).
 *
 * @param storage - Storage-like (injected for testability).
 * @returns Parsed + clamped high score, or 0 for absent/corrupt/unavailable.
 */
export function readStoredHighScore(storage: Storage): number {
  let raw: string | null;
  try {
    raw = storage.getItem(HIGH_SCORE_KEY);
  } catch {
    // LocalStorage unavailable (e.g. privacy mode) — treat as 0.
    return 0;
  }
  if (raw === null) return 0;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? clampScore(parsed) : 0;
}

// ── ScoreManager ───────────────────────────────────────────────────────────

/**
 * Stateful score manager with LocalStorage high-score persistence.
 *
 * @param storage - Optional Storage-like (defaults to window.localStorage).
 *                  Injectable so tests can use an in-memory shim.
 */
export class ScoreManager {
  private score: number;
  private multiplier: number;
  private highScore: number;
  private storage: Storage;

  constructor(storage?: Storage) {
    this.score = 0;
    this.multiplier = 1;
    this.storage = storage ?? window.localStorage;
    this.highScore = this.loadHighScore();
  }

  /**
   * Add points to the score. Uses the current multiplier unless a
   * per-call multiplier override is provided.
   */
  addScore(points: number, multiplierOverride?: number): void {
    const mult = multiplierOverride ?? this.multiplier;
    this.score = computeScore(this.score, points, mult);
  }

  /**
   * Subtract points from the score (e.g. penalty). Clamped at 0.
   */
  subtractScore(points: number): void {
    this.score = subtractScore(this.score, points);
  }

  /** Current score. */
  getScore(): number {
    return this.score;
  }

  /** Current multiplier (used when addScore is called without override). */
  getMultiplier(): number {
    return this.multiplier;
  }

  /** Set the multiplier applied to future addScore calls. */
  setMultiplier(multiplier: number): void {
    this.multiplier = multiplier;
  }

  /** Reset score and multiplier to defaults. Clears stored high score. */
  reset(): void {
    this.score = 0;
    this.multiplier = 1;
    this.highScore = 0;
    this.storage.removeItem(HIGH_SCORE_KEY);
  }

  /** Current high score (in-memory). */
  getHighScore(): number {
    return this.highScore;
  }

  /**
   * Persist the current score as the high score if it exceeds the stored
   * value. Idempotent: calling twice with the same score is safe.
   */
  saveHighScore(): void {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.storage.setItem(HIGH_SCORE_KEY, String(this.highScore));
    }
  }

  /**
   * Read the high score from storage. Returns 0 if nothing is stored or
   * the stored value is corrupt or storage is unavailable.
   *
   * W3-A.9: Delegates to the canonical `readStoredHighScore()` helper,
   * which adds try/catch (Fix A) + clampScore (Fix B).
   */
  loadHighScore(): number {
    return readStoredHighScore(this.storage);
  }

  /**
   * True if the current score is at least the stored high score
   * (i.e. it would be a new record or tie).
   */
  isNewHighScore(): boolean {
    return this.score >= this.highScore && this.score > 0;
  }
}
