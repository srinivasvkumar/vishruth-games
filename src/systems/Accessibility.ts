/**
 * AccessibilitySystem (W4-B.5, kanban t_87e672ec) — screen-reader
 * announcements for scene transitions.
 *
 * Owns a single visually-hidden aria-live="assertive" region
 * (#sr-announcer) that screen readers announce whenever the game
 * transitions between scenes:
 *   - "Menu"                        on entering the menu scene
 *   - "Game started"                on entering the game scene
 *   - "Game over, final score: X"   on entering the game-over scene
 *
 * Wiring (callers):
 *   - SceneManager.loadScene() calls announceSceneTransition(name, data)
 *     after the new scene has entered — the single transition choke point.
 *   - GameOverScene.onEnter() calls announce() with its own final-score
 *     value so the announcement carries the authoritative displayed score
 *     even when the transition data payload is absent (direct entry).
 *   - Game owns the instance (getAccessibilitySystem()) and cleans it up
 *     in Game.cleanup(), alongside the other systems.
 *
 * Design notes:
 *   - The region is visually hidden (1px clipped box) but NOT display:none —
 *     aria-live regions must stay in the accessibility tree to announce.
 *   - assertive + repeated text: screen readers skip unchanged text, so
 *     announce() clears the region first and re-sets on the next tick
 *     (double-set trick). The cleared text is empty, so no announcement
 *     is lost and the re-set always fires.
 *   - Idempotent construction: if #sr-announcer already exists (a prior
 *     cleaned-up instance, or a second system in tests), it is reused
 *     instead of stacking a duplicate region.
 */
import { Logger } from '@/utils/Logger';
import { readStoredHighScore } from '@/systems/Score';

/** DOM id of the live region. */
export const SR_ANNOUNCER_ID = 'sr-announcer';

/**
 * Visually-hidden rules: 1px clipped absolute box. The element stays in
 * the layout tree (aria-live needs it) but is invisible and non-interactive.
 * Uses `clip` (not the `inset` shorthand) for maximum screen-reader compat.
 */
const VISIBLE_HIDDEN_CSS = [
  'position: absolute',
  'width: 1px',
  'height: 1px',
  'padding: 0',
  'margin: -1px',
  'overflow: hidden',
  'clip: rect(0px, 0px, 0px, 0px)',
  'white-space: nowrap',
  'border: 0'
].join('; ');

/** Scene names that produce no announcement (silent). */
const SILENT_SCENES = new Set(['boot']);

/**
 * Resolve the announcement text for a scene transition.
 *
 * Pure-ish (reads localStorage only for the game-over fallback) so it is
 * trivially unit-testable. Exported for tests + reuse.
 *
 * @param sceneName - registered scene name ('menu' | 'game' | 'gameover' | 'boot' | …)
 * @param data - optional transition payload (GameScene passes { score, highScore })
 * @param storage - injectable storage for the high-score fallback (default: window.localStorage)
 * @returns the announcement text, or '' for silent scenes.
 */
export function sceneTransitionMessage(
  sceneName: string,
  data?: Record<string, unknown>,
  storage: Storage = window.localStorage,
): string {
  if (SILENT_SCENES.has(sceneName)) return '';
  switch (sceneName) {
    case 'menu':
      return 'Menu';
    case 'game':
      return 'Game started';
    case 'gameover': {
      const score =
        typeof data?.score === 'number' && Number.isFinite(data.score)
          ? data.score
          : readStoredHighScore(storage);
      return `Game over, final score: ${score}`;
    }
    default:
      return `Scene: ${sceneName}`;
  }
}

/**
 * Screen-reader announcement system.
 *
 * Public surface:
 *   - constructor()                              — creates/reuses #sr-announcer
 *   - announce(text: string): void              — announce arbitrary text
 *   - announceSceneTransition(name, data?): void — scene-transition shorthand
 *   - getAnnouncerElement(): HTMLElement | null — the live region (tests/debug)
 *   - cleanup(): void                           — removes the region, idempotent
 */
export class AccessibilitySystem {
  private announcerEl: HTMLElement | null = null;
  private cleanedUp = false;
  /** Pending re-set timer from the double-set trick (announced-again path). */
  private pendingTimer: number | null = null;

  constructor() {
    this.announcerEl = this.createAnnouncer();
    Logger.debug('AccessibilitySystem initialized');
  }

  /**
   * Create (or reuse) the visually-hidden live region. Idempotent: if
   * #sr-announcer already exists in the document, reuse it.
   */
  private createAnnouncer(): HTMLElement {
    const existing = document.getElementById(SR_ANNOUNCER_ID);
    if (existing) {
      return existing;
    }
    const el = document.createElement('div');
    el.id = SR_ANNOUNCER_ID;
    el.setAttribute('aria-live', 'assertive');
    el.setAttribute('role', 'status');
    el.setAttribute('aria-atomic', 'true');
    el.style.cssText = VISIBLE_HIDDEN_CSS;
    document.body.appendChild(el);
    return el;
  }

  /**
   * Announce arbitrary text to screen readers.
   *
   * Double-set: clear first, re-set on the next tick, so assertive regions
   * re-announce even when the text is identical to the previous one.
   * No-op after cleanup.
   */
  announce(text: string): void {
    if (this.cleanedUp) return;
    const el = this.announcerEl;
    if (!el) return;

    // Clear any pending re-set so rapid announces don't stack timers.
    if (this.pendingTimer !== null) {
      window.clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }

    if (el.textContent === text && text !== '') {
      // Identical text: screen readers skip it — clear, then re-set.
      el.textContent = '';
      this.pendingTimer = window.setTimeout(() => {
        if (this.cleanedUp) return;
        el.textContent = text;
        this.pendingTimer = null;
      }, 0);
      return;
    }

    el.textContent = text;
  }

  /**
   * Announce a scene transition. See sceneTransitionMessage() for the
   * scene-name → text mapping. Silent for 'boot'; no-op after cleanup.
   */
  announceSceneTransition(
    sceneName: string,
    data?: Record<string, unknown>,
  ): void {
    const text = sceneTransitionMessage(sceneName, data);
    if (text === '') return;
    this.announce(text);
  }

  /** The live region element, or null when cleaned up / never created. */
  getAnnouncerElement(): HTMLElement | null {
    return this.announcerEl;
  }

  /**
   * Release the region: clear pending timers and remove the element from
   * the DOM. Idempotent — Game.cleanup() may run more than once.
   */
  cleanup(): void {
    if (this.cleanedUp) return;
    this.cleanedUp = true;
    if (this.pendingTimer !== null) {
      window.clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
    this.announcerEl?.remove();
    this.announcerEl = null;
    Logger.debug('AccessibilitySystem cleaned up');
  }
}
