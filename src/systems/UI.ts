/**
 * UISystem — owns the game's HUD (W3A.1, Task 8.1; D2 HUD-ownership ruling).
 *
 * D2: the HUD DOM lives here, NOT in GameScene.ts. GameScene's inline
 * #game-score / #game-health / #game-level divs (setupUI/updateUI/removeUI)
 * are being replaced by this system in the follow-up W3A card; until then
 * the two coexist harmlessly (GameScene's divs are display:none at
 * construction and it is a separate document.body child).
 *
 * Public surface:
 *   - constructor(config: UIConfig)   — Game.ts:55 `new UISystem(config.ui)`
 *   - update(deltaTime: number): void — Game.ts game loop
 *   - cleanup(): void                 — Game.ts teardown
 *   - setScore(n: number): void       — updates #game-score
 *   - setHealth(h: number): void      — updates #game-health
 *   - setLevel(l: number): void       — updates #game-level
 *   - setPowerUpIndicator(...)        — stub; W3 power-up cards build the
 *                                        indicator DOM
 *
 * Layout contract (matches GameScene's current inline HUD exactly so the
 * visible HUD is unchanged when GameScene switches over):
 *   #game-score  position:fixed; top:10px; left:10px;  font-size:24px
 *   #game-health position:fixed; top:10px; right:10px; font-size:24px
 *   #game-level  position:fixed; top:50px; left:10px;  font-size:18px
 *   all: color:white; font-family:monospace;
 *         text-shadow:2px 2px 2px black; z-index:100;
 *         display:none until a setter makes it visible.
 *   text formats: "SCORE: n" / "HEALTH: n" / "LEVEL: n"
 *
 * Responsiveness: fixed px offsets from the viewport corners are
 * resolution-independent by construction (the HUD always hugs the corner
 * pair it is anchored to). A window resize handler is registered anyway
 * (re-asserts positions, no-ops today) so future theme/font-size work
 * (UIConfig.fontSize) has a hook to re-layout from.
 */
import type { UIConfig } from '@/types/GameTypes';

/** Shared visual rules for all HUD divs (GameScene parity). */
const HUD_BASE_STYLE = [
  'color: white',
  'font-family: monospace',
  'text-shadow: 2px 2px 2px black',
  'z-index: 100',
  'display: none'
].join('; ');

/** Per-div placement + sizing (GameScene parity: 24px score/health, 18px level). */
const HUD_PLACEMENT: Record<string, string> = {
  'game-score': 'position: fixed; top: 10px; left: 10px; font-size: 24px',
  'game-health': 'position: fixed; top: 10px; right: 10px; font-size: 24px',
  'game-level': 'position: fixed; top: 50px; left: 10px; font-size: 18px'
};

/**
 * A pending power-up indicator (W3 power-up cards). The core stores it only;
 * rendering the indicator DOM is a later W3 card's job (stub per task body).
 */
export interface PowerUpIndicator {
  id: string;
  label: string;
}

export class UISystem {
  private scoreEl: HTMLDivElement | null = null;
  private healthEl: HTMLDivElement | null = null;
  private levelEl: HTMLDivElement | null = null;
  private cleanedUp = false;
  private powerUpIndicator: PowerUpIndicator | null = null;
  /**
   * Retained for future theme/font-size work (UIConfig.fontSize, theme).
   * W3A.1 hardcodes GameScene-parity values (24px/18px) so the visible HUD
   * is unchanged; the config is plumbed through for the later theming card.
   */
  readonly config: UIConfig;

  constructor(config: UIConfig) {
    this.config = config;
    this.createHud();
    window.addEventListener('resize', this.handleResize);
  }

  /**
   * Per-frame update driven by the game loop. W3A.1: no per-frame HUD
   * animation — values are pushed by setScore/setHealth/setLevel from
   * GameScene. Kept on the surface for Game.ts's loop.
   */
  update(_deltaTime: number): void {
    // no-op — HUD state is setter-driven
  }

  /**
   * Create the HUD divs. Idempotent: if #game-score already exists in the
   * document (a prior, cleaned-up instance or GameScene's own div during
   * the transition period), reuse it instead of stacking a duplicate.
   */
  private createHud(): void {
    const existingScore = document.getElementById('game-score');
    if (existingScore) {
      this.scoreEl = existingScore as HTMLDivElement;
      this.healthEl = document.getElementById(
        'game-health'
      ) as HTMLDivElement | null;
      this.levelEl = document.getElementById(
        'game-level'
      ) as HTMLDivElement | null;
      return;
    }
    this.scoreEl = this.createHudDiv('game-score');
    this.healthEl = this.createHudDiv('game-health');
    this.levelEl = this.createHudDiv('game-level');
  }

  private createHudDiv(id: string): HTMLDivElement {
    const el = document.createElement('div');
    el.id = id;
    el.style.cssText = `${HUD_PLACEMENT[id]}; ${HUD_BASE_STYLE}`;
    document.body.appendChild(el);
    return el;
  }

  /** Make a div visible; no-op if it was cleaned up. */
  private show(el: HTMLDivElement | null): void {
    if (el && !this.cleanedUp) {
      el.style.display = 'block';
    }
  }

  /** Update #game-score to `SCORE: n` and make it visible. */
  setScore(n: number): void {
    if (this.cleanedUp) return;
    if (this.scoreEl) {
      this.scoreEl.textContent = `SCORE: ${n}`;
      this.show(this.scoreEl);
    }
  }

  /** Update #game-health to `HEALTH: h` and make it visible. */
  setHealth(h: number): void {
    if (this.cleanedUp) return;
    if (this.healthEl) {
      this.healthEl.textContent = `HEALTH: ${h}`;
      this.show(this.healthEl);
    }
  }

  /** Update #game-level to `LEVEL: l` and make it visible. */
  setLevel(l: number): void {
    if (this.cleanedUp) return;
    if (this.levelEl) {
      this.levelEl.textContent = `LEVEL: ${l}`;
      this.show(this.levelEl);
    }
  }

  /**
   * Stub for W3 power-ups. Stores the active indicator (or null when none).
   * The indicator DOM (icon + label + timer) is built by the W3 power-up
   * cards; until then this is a safe no-op beyond storage.
   */
  setPowerUpIndicator(powerUp: PowerUpIndicator | null): void {
    this.powerUpIndicator = powerUp;
  }

  /**
   * The active power-up indicator, or null when none. Read by the W3
   * power-up cards that render the indicator DOM.
   */
  getPowerUpIndicator(): PowerUpIndicator | null {
    return this.powerUpIndicator;
  }

  /**
   * Window resize handler. Fixed px corner offsets are already
   * resolution-independent, so today this is a no-op re-assert; the W3
   * theming card (UIConfig.fontSize) will use it to re-layout from.
   */
  private handleResize = (): void => {
    // No re-layout needed today (fixed px corner offsets). Hook kept for
    // the W3 theming card.
  };

  /**
   * Release UI resources: remove the HUD divs from the DOM and detach the
   * resize listener. Idempotent — Game.cleanup() may run more than once.
   */
  cleanup(): void {
    if (this.cleanedUp) return;
    this.cleanedUp = true;
    window.removeEventListener('resize', this.handleResize);
    this.scoreEl?.remove();
    this.healthEl?.remove();
    this.levelEl?.remove();
    this.scoreEl = null;
    this.healthEl = null;
    this.levelEl = null;
    this.powerUpIndicator = null;
  }
}
