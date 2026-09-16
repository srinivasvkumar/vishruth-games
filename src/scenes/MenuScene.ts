import * as THREE from 'three';
import { Scene } from './Scene';
import { Logger } from '@/utils/Logger';
import { HIGH_SCORE_KEY } from '@/systems/Score';
import type { Game } from '@/core/Game';

/**
 * Full menu scene (W3A.3, TDD_PLAN Task 8.2 — MenuScene portion).
 *
 * Supersedes the minimal start-path placeholder (W2-A.3 / BUG-W2-1a) with a
 * complete menu:
 *   - Title ("CLUSTER RUSH")
 *   - START button — click + Enter/Space keydown -> game.switchScene('game'),
 *     with the BUG-W2-1a double-start guard preserved.
 *   - SETTINGS placeholder button — non-functional; shows a "coming in W3-C"
 *     toast. (Audio settings / difficulty / profiles are out of scope here.)
 *   - HIGH SCORES panel — reads the stored high score from LocalStorage under
 *     HIGH_SCORE_KEY (the same key ScoreManager persists), so a record set in
 *     a prior game session is shown when the menu is (re)entered.
 *   - Basic keyboard focus / Tab navigation — native focusable buttons in
 *     document order (START before SETTINGS) with a visible :focus style.
 *
 * Dark terminal theme: monospace, #00ff00 accents, glow shadows.
 */
export class MenuScene extends Scene {
  private menuContainer?: HTMLDivElement;
  private startButton: HTMLButtonElement | null = null;
  private settingsButton: HTMLButtonElement | null = null;
  private highScorePanel: HTMLElement | null = null;
  private keydownHandler: ((event: KeyboardEvent) => void) | null = null;
  /** Toast auto-dismiss timer (cleared on exit/cleanup). */
  private settingsToastTimer: number | null = null;
  /**
   * Double-start guard (BUG-W2-1a): once a start transition has fired,
   * key presses / clicks must not fire another. Set to true the moment
   * the transition is dispatched; cleared in onExit() when the menu
   * stops being the active scene, and in the .catch() below if the
   * transition rejects (scene not found, etc.) so the menu stays
   * reachable in either case.
   */
  private started = false;

  constructor(game: Game) {
    super(game);
    Logger.info('Menu scene created');
  }

  protected createCamera(): THREE.Camera {
    return new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- preserves the base class async contract; menu asset loading will be awaited in a later task
  protected async onLoad(): Promise<void> {
    this.setupMenuUI();
    Logger.debug('Menu scene loaded');
  }

  protected onEnter(): void {
    if (this.menuContainer) {
      this.menuContainer.style.display = 'block';
    }
    // Refresh the high score on every entry so a record set in a prior
    // game session is reflected when the player returns to the menu.
    this.updateHighScoreDisplay();
    // BUG-W2-1a: wire the start path while the menu is visible. The
    // start guard is re-armed when the menu stops being active (onExit,
    // W3-A.7), and also when a previous transition rejected (the .catch()
    // in startGame clears it without an exit) — either way, `!started`
    // here is exactly "menu is fresh and ready to dispatch".
    if (!this.started) {
      this.attachKeydownHandler();
      if (this.startButton) {
        this.startButton.disabled = false;
      }
    }
    Logger.debug('Menu scene entered');
  }

  protected onUpdate(_deltaTime: number): void {
    // No dynamic update logic in the menu (W3A.3 boundary).
  }

  protected onExit(): void {
    // W3-A.7 (BUG-W2-1a re-arm): reset the start guard the moment the menu
    // stops being the active scene. The guard only needs to hold WHILE THE
    // MENU IS ACTIVE (it suppresses a second dispatch from the same key
    // repeat / double click during the transition out). Once the game
    // scene is active, a later onEnter() — returning from the game-over
    // RESTART path — must re-arm: the .catch() in startGame() alone never
    // fires in the normal flow because switchScene RESOLVES, which left
    // started===true forever and deadened both start paths on the second
    // run. Clearing here makes the onEnter() re-arm guard fire reliably.
    this.started = false;
    // BUG-W2-1a: detach the keydown listener the moment the menu stops
    // being the active scene, so keys pressed during the transition
    // into 'game' cannot re-fire the start path.
    this.detachKeydownHandler();
    // Drop any pending settings-toast dismissal so it cannot fire on a
    // detached node after the menu is gone.
    this.clearSettingsToastTimer();
    if (this.menuContainer) {
      this.menuContainer.style.display = 'none';
    }
    Logger.debug('Menu scene exited');
  }

  protected onCleanup(): void {
    this.detachKeydownHandler();
    this.clearSettingsToastTimer();
    this.menuContainer?.parentNode?.removeChild(this.menuContainer);
    this.menuContainer = undefined;
    this.startButton = null;
    this.settingsButton = null;
    this.highScorePanel = null;
    Logger.debug('Menu scene cleaned up');
  }

  /**
   * Create the full menu DOM content: title, hint, START button,
   * SETTINGS button, and the HIGH SCORES panel.
   *
   * DOM order (which defines Tab order): title, hint, START, SETTINGS,
   * high-score panel. START stays first among the buttons so the
   * BUG-W2-1a behavior + existing tests keep holding.
   */
  private setupMenuUI(): void {
    const container = document.createElement('div');
    container.id = 'menu-container';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 100;
      font-family: monospace;
    `;

    const title = document.createElement('h1');
    title.textContent = 'CLUSTER RUSH';
    title.style.cssText = `
      color: #00ff00;
      font-size: 48px;
      margin-bottom: 20px;
      text-shadow: 0 0 10px #00ff00;
    `;

    const hint = document.createElement('p');
    hint.textContent = 'Press START to begin';
    hint.style.cssText = `
      color: #ffffff;
      font-size: 20px;
    `;

    // START button (BUG-W2-1a): the primary, filled action.
    const startButton = document.createElement('button');
    startButton.id = 'menu-start-button';
    startButton.textContent = 'START';
    startButton.style.cssText = `
      margin-top: 20px;
      padding: 12px 48px;
      font-size: 24px;
      font-family: monospace;
      background: #00ff00;
      color: #000000;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    `;
    startButton.addEventListener('click', () => {
      this.startGame();
    });

    // SETTINGS button (W3A.3 placeholder): outline variant, non-functional.
    // Shows a "coming in W3-C" toast on click. No scene transition.
    const settingsButton = document.createElement('button');
    settingsButton.id = 'menu-settings-button';
    settingsButton.textContent = 'SETTINGS';
    settingsButton.style.cssText = `
      margin-top: 12px;
      padding: 12px 48px;
      font-size: 18px;
      font-family: monospace;
      background: transparent;
      color: #00ff00;
      border: 2px solid #00ff00;
      border-radius: 4px;
      cursor: pointer;
    `;
    settingsButton.addEventListener('click', () => {
      this.showSettingsToast();
    });

    // HIGH SCORES panel (W3A.3): bordered box with label + value.
    const highScorePanel = document.createElement('div');
    highScorePanel.id = 'menu-high-score';
    highScorePanel.style.cssText = `
      margin-top: 24px;
      padding: 12px 24px;
      font-family: monospace;
      color: #ffffff;
      font-size: 18px;
      border: 1px solid #00ff00;
      border-radius: 4px;
      text-align: center;
    `;
    const highScoreLabel = document.createElement('div');
    highScoreLabel.textContent = 'HIGH SCORE';
    highScoreLabel.style.cssText = `
      color: #00ff00;
      font-size: 14px;
      letter-spacing: 2px;
      margin-bottom: 6px;
    `;
    const highScoreValue = document.createElement('div');
    highScoreValue.id = 'menu-high-score-value';
    highScoreValue.style.cssText = `
      color: #ffffff;
      font-size: 22px;
    `;
    highScoreValue.textContent = '0';
    highScorePanel.appendChild(highScoreLabel);
    highScorePanel.appendChild(highScoreValue);

    container.appendChild(title);
    container.appendChild(hint);
    container.appendChild(startButton);
    container.appendChild(settingsButton);
    container.appendChild(highScorePanel);
    document.body.appendChild(container);

    this.menuContainer = container;
    this.startButton = startButton;
    this.settingsButton = settingsButton;
    this.highScorePanel = highScorePanel;

    // Prime the high score display now so the initial render (before
    // onEnter) already shows the stored value.
    this.updateHighScoreDisplay();
  }

  /**
   * W3A.3: read the stored high score from LocalStorage under the
   * canonical HIGH_SCORE_KEY (the same key ScoreManager persists) and
   * reflect it in the HIGH SCORES panel. Mirrors ScoreManager
   * loadHighScore() semantics: parse as base-10 int, floor at 0, 0 when
   * nothing is stored or the value is corrupt.
   */
  private updateHighScoreDisplay(): void {
    if (!this.highScorePanel) return;
    const valueEl = this.highScorePanel.querySelector(
      '#menu-high-score-value'
    );
    if (!valueEl) return;
    valueEl.textContent = String(this.readStoredHighScore());
  }

  /**
   * W3A.3: read + validate the stored high score. Returns 0 when the
   * value is absent, non-numeric, or corrupt.
   */
  private readStoredHighScore(): number {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(HIGH_SCORE_KEY);
    } catch {
      // LocalStorage unavailable (e.g. privacy mode) — treat as 0.
      return 0;
    }
    if (raw === null) return 0;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  /**
   * W3A.3: show the settings-placeholder toast ("coming in W3-C").
   * Idempotent: re-clicking refreshes the content + re-arms the timer.
   * Non-destructive — does not switch scenes.
   */
  private showSettingsToast(): void {
    if (!this.menuContainer) return;
    // Re-enable the SETTINGS button if a pending start transition had
    // disabled it (belt-and-braces; the button is the placeholder so it
    // should always be actionable while the menu is visible).
    if (this.settingsButton) {
      this.settingsButton.disabled = false;
    }
    // Remove any existing toast node so re-clicks don't stack.
    this.removeSettingsToast();
    const toast = document.createElement('div');
    toast.id = 'menu-settings-toast';
    toast.textContent = 'Settings coming in W3-C';
    toast.style.cssText = `
      position: fixed;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%);
      padding: 10px 20px;
      font-family: monospace;
      font-size: 16px;
      color: #000000;
      background: #00ff00;
      border-radius: 4px;
      z-index: 200;
      box-shadow: 0 0 10px #00ff00;
    `;
    this.menuContainer.appendChild(toast);
    // Auto-dismiss after 2.5s. Guarded timer so it can't fire after
    // the menu is exited/cleaned up.
    this.clearSettingsToastTimer();
    this.settingsToastTimer = window.setTimeout(() => {
      this.removeSettingsToast();
      this.settingsToastTimer = null;
    }, 2500);
  }

  /** Remove the settings toast if present (no-op otherwise). */
  private removeSettingsToast(): void {
    const toast = this.menuContainer?.querySelector(
      '#menu-settings-toast'
    ) as HTMLElement | null;
    if (toast) {
      toast.parentNode?.removeChild(toast);
    }
  }

  /** Clear any pending toast-dismiss timer (safe when none is pending). */
  private clearSettingsToastTimer(): void {
    if (this.settingsToastTimer !== null) {
      window.clearTimeout(this.settingsToastTimer);
      this.settingsToastTimer = null;
    }
  }

  /**
   * BUG-W2-1a: fire the start transition once.
   *
   * Guard order:
   *   1. `started` flag — blocks any second dispatch from either the
   *      keydown listener or the button click (covers browser
   *      keydown auto-repeat on a held key and double-clicks). This also
   *      covers the case where a focused button + Enter/Space fires both
   *      the native click and the window keydown: only the first dispatch
   *      reaches switchScene.
   *   2. Remove the keydown listener immediately on dispatch so no
   *      further key events can even reach the handler.
   *   3. Disable the button so a second click is a no-op at the DOM
   *      level too (belt-and-braces for the guard).
   *
   * If the transition REJECTS (e.g. 'game' not registered), re-arm:
   * the flag clears, the listener is re-attached, and the button is
   * re-enabled — the menu remains reachable and the player can retry.
   */
  private startGame(): void {
    if (this.started) return;
    this.started = true;
    this.detachKeydownHandler();
    if (this.startButton) {
      this.startButton.disabled = true;
    }
    Logger.info('Menu: starting game');
    this.game
      .switchScene('game')
      .catch((error) => {
        Logger.error('Failed to start game from menu', { error });
        // Re-arm the start path — the menu is still the active scene
        // (SceneManager falls back to the previous scene on failure).
        this.started = false;
        this.attachKeydownHandler();
        if (this.startButton) {
          this.startButton.disabled = false;
        }
      });
  }

  /**
   * BUG-W2-1a: attach the window-level keydown listener for Enter/Space.
   * Idempotent — a second call while attached is a no-op.
   */
  private attachKeydownHandler(): void {
    if (this.keydownHandler) return;
    this.keydownHandler = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.startGame();
      }
    };
    window.addEventListener('keydown', this.keydownHandler);
  }

  /**
   * BUG-W2-1a: detach the keydown listener. Safe to call when not
   * attached (no-op).
   */
  private detachKeydownHandler(): void {
    if (this.keydownHandler) {
      window.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }
  }
}
