import * as THREE from 'three';
import { Scene } from './Scene';
import { Logger } from '@/utils/Logger';
import { readStoredHighScore } from '@/systems/Score';
import {
  SettingsManager,
  type Difficulty,
} from '@/systems/Settings';
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
  private highScorePanel: HTMLElement | null = null;
  private keydownHandler: ((event: KeyboardEvent) => void) | null = null;
  /**
   * W3-C.4: settings panel + persistence.
   * - settingsPanel: the overlay div (created lazily on first open, hidden
   *   by default).
   * - settingsManager: owns the persisted Settings object (volume / speed /
   *   difficulty), loaded from LocalStorage on menu onEnter().
   * - settingsOpen: whether the panel is currently showing.
   */
  private settingsPanel: HTMLElement | null = null;
  private settingsManager: SettingsManager | null = null;
  private settingsOpen = false;
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
    // W3-C.4: (re)load persisted settings on every menu entry so the panel
    // reflects a prior session's volume / speed / difficulty, and the live
    // audio + game-loop speed are re-applied from storage.
    this.refreshSettingsFromStorage();
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
    // W3-C.4: close the settings panel so it never lingers across the
    // transition into the game scene.
    this.closeSettingsPanel();
    if (this.menuContainer) {
      this.menuContainer.style.display = 'none';
    }
    Logger.debug('Menu scene exited');
  }

  protected onCleanup(): void {
    this.detachKeydownHandler();
    this.menuContainer?.parentNode?.removeChild(this.menuContainer);
    this.menuContainer = undefined;
    this.startButton = null;
    this.highScorePanel = null;
    this.settingsPanel = null;
    this.settingsOpen = false;
    this.settingsManager = null;
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

    // SETTINGS button (W3-C.4): outline variant, opens the full settings
    // panel (volume / speed / difficulty / controls). Clicking toggles it.
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
      this.toggleSettingsPanel();
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
    this.highScorePanel = highScorePanel;

    // W3-C.4: build the settings panel eagerly (always display:none until
    // opened) so its DOM — volume slider, speed / difficulty / controls
    // sections, CLOSE — exists and is queryable from the moment the menu
    // loads. onEnter() then syncs its controls to the persisted settings.
    this.buildSettingsPanel();

    // Prime the high score display now so the initial render (before
    // onEnter) already shows the stored value.
    this.updateHighScoreDisplay();
  }

  /**
   * W3A.3: read the stored high score from LocalStorage under the
   * canonical HIGH_SCORE_KEY (the same key ScoreManager persists) and
   * reflect it in the HIGH SCORES panel.
   *
   * W3-A.9: delegates to the canonical `readStoredHighScore()` helper
   * (try/catch + clampScore + 0-floor) instead of the old private copy.
   */
  private updateHighScoreDisplay(): void {
    if (!this.highScorePanel) return;
    const valueEl = this.highScorePanel.querySelector(
      '#menu-high-score-value'
    );
    if (!valueEl) return;
    valueEl.textContent = String(readStoredHighScore(window.localStorage));
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
      // W3-C.4: while the settings panel is open, Enter/Space must NOT fire
      // the START transition — they activate the currently-focused settings
      // control instead (native button/range activation). Esc closes the
      // panel and returns focus to START.
      if (this.settingsOpen) {
        if (event.key === 'Escape') {
          event.preventDefault();
          this.closeSettingsPanel();
        }
        return;
      }
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

  // ── W3-C.4: Settings panel ────────────────────────────────────────────────

  /**
   * Toggle the settings panel open/closed. Opening loads persisted settings
   * (if not already loaded this session), rebuilds the control states to
   * match, and focuses the first control.
   */
  private toggleSettingsPanel(): void {
    if (this.settingsOpen) {
      this.closeSettingsPanel();
      return;
    }
    this.openSettingsPanel();
  }

  /** Open the settings panel (built eagerly in setupMenuUI). */
  private openSettingsPanel(): void {
    if (!this.menuContainer) return;
    if (!this.settingsPanel) return;
    // Load the latest persisted settings + apply to live systems.
    this.refreshSettingsFromStorage();
    this.settingsPanel.style.display = 'flex';
    this.settingsOpen = true;
    // Focus the first control (volume slider) so keyboard nav starts there.
    const first = this.settingsPanel.querySelector<HTMLElement>(
      'input[type=range], button, [tabindex]:not([tabindex="-1"])'
    );
    first?.focus();
  }

  /**
   * Close the settings panel and return focus to the START button.
   * Idempotent — safe to call when the panel is already closed.
   */
  private closeSettingsPanel(): void {
    if (this.settingsPanel) {
      this.settingsPanel.style.display = 'none';
    }
    this.settingsOpen = false;
    this.startButton?.focus();
  }

  /**
   * Load settings from LocalStorage, apply them to the live audio +
   * game-loop speed, and sync the panel controls to the loaded values.
   * Called on menu onEnter() and whenever the panel is opened.
   */
  private refreshSettingsFromStorage(): void {
    if (!this.settingsManager) {
      this.settingsManager = new SettingsManager();
    }
    const settings = this.settingsManager.load();
    // Apply volume to the live AudioSystem.
    const audio = this.game.getAudioSystem();
    audio.setMasterVolume(settings.volume / 100);
    // Apply speed to the game loop.
    this.game.setSpeedMultiplier(settings.speed);
    // If the panel is already built, sync its controls to the loaded values.
    this.syncPanelControls(settings);
  }

  /** Sync the built panel's control state to a Settings object. */
  private syncPanelControls(settings: {
    volume: number;
    speed: number;
    difficulty: Difficulty;
  }): void {
    if (!this.settingsPanel) return;
    const slider = this.settingsPanel.querySelector<HTMLInputElement>(
      '#settings-volume-slider'
    );
    if (slider) slider.value = String(settings.volume);

    this.settingsPanel.querySelectorAll<HTMLElement>('[id^="settings-speed-"]').forEach((btn) => {
      const speed = Number(btn.id.replace('settings-speed-', ''));
      const selected = speed === settings.speed;
      btn.dataset.selected = selected ? 'true' : 'false';
      btn.setAttribute('aria-pressed', String(selected));
      if (selected) {
        btn.style.background = '#00ff00';
        btn.style.color = '#000000';
      } else {
        btn.style.background = 'transparent';
        btn.style.color = '#00ff00';
      }
    });

    this.settingsPanel.querySelectorAll<HTMLElement>('[id^="settings-difficulty-"]').forEach((btn) => {
      const difficulty = btn.id.replace('settings-difficulty-', '') as Difficulty;
      const selected = difficulty === settings.difficulty;
      btn.dataset.selected = selected ? 'true' : 'false';
      btn.setAttribute('aria-pressed', String(selected));
      if (selected) {
        btn.style.background = '#00ff00';
        btn.style.color = '#000000';
      } else {
        btn.style.background = 'transparent';
        btn.style.color = '#00ff00';
      }
    });
  }

  /** Build the settings panel DOM (called once on first open). */
  private buildSettingsPanel(): void {
    if (!this.menuContainer) return;

    const panel = document.createElement('div');
    panel.id = 'settings-panel';
    panel.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.92);
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      z-index: 150;
      font-family: monospace;
      color: #ffffff;
      padding-top: 60px;
      box-sizing: border-box;
      overflow-y: auto;
    `;

    const heading = document.createElement('h2');
    heading.id = 'settings-heading';
    heading.textContent = 'SETTINGS';
    heading.style.cssText = `
      color: #00ff00;
      font-size: 32px;
      margin-bottom: 24px;
      text-shadow: 0 0 8px #00ff00;
      letter-spacing: 4px;
    `;
    panel.appendChild(heading);

    // ── Volume section ──────────────────────────────────────────────────────
    const volumeSection = this.buildSection('settings-volume-section', 'VOLUME');
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = 'settings-volume-slider';
    slider.min = '0';
    slider.max = '100';
    slider.step = '1';
    slider.value = '80';
    slider.style.cssText = `
      width: 260px;
      height: 8px;
      -webkit-appearance: none;
      appearance: none;
      background: #1a1a1a;
      border: 1px solid #00ff00;
      border-radius: 4px;
      outline: none;
      cursor: pointer;
      margin: 8px 0;
    `;
    slider.addEventListener('input', () => {
      const volume = Number(slider.value);
      this.settingsManager?.setVolume(volume);
      this.game.getAudioSystem().setMasterVolume(volume / 100);
    });
    const volumeLabel = document.createElement('span');
    volumeLabel.id = 'settings-volume-label';
    volumeLabel.textContent = '80';
    volumeLabel.style.cssText = 'color: #00ff00; font-size: 16px; margin-left: 12px;';
    slider.addEventListener('input', () => {
      volumeLabel.textContent = slider.value;
    });
    const volumeRow = document.createElement('div');
    volumeRow.style.cssText = 'display: flex; align-items: center;';
    volumeRow.appendChild(slider);
    volumeRow.appendChild(volumeLabel);
    volumeSection.appendChild(volumeRow);
    panel.appendChild(volumeSection);

    // ── Speed section ───────────────────────────────────────────────────────
    const speedSection = this.buildSection('settings-speed-section', 'SPEED');
    const speeds: { value: number; label: string }[] = [
      { value: 0.5, label: '0.5x' },
      { value: 1.0, label: '1x' },
      { value: 1.5, label: '1.5x' },
      { value: 2.0, label: '2x' },
    ];
    const speedRow = document.createElement('div');
    speedRow.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap;';
    speeds.forEach(({ value, label }) => {
      const btn = document.createElement('button');
      btn.id = `settings-speed-${value}`;
      btn.textContent = label;
      btn.style.cssText = `
        padding: 8px 16px;
        font-family: monospace;
        font-size: 14px;
        background: transparent;
        color: #00ff00;
        border: 1px solid #00ff00;
        border-radius: 4px;
        cursor: pointer;
      `;
      btn.addEventListener('click', () => {
        this.settingsManager?.setSpeed(value);
        this.game.setSpeedMultiplier(value);
        this.syncPanelControls(this.settingsManager!.getSettings());
      });
      speedRow.appendChild(btn);
    });
    speedSection.appendChild(speedRow);
    panel.appendChild(speedSection);

    // ── Difficulty section ──────────────────────────────────────────────────
    const difficultySection = this.buildSection(
      'settings-difficulty-section',
      'DIFFICULTY'
    );
    const difficulties: { value: Difficulty; label: string }[] = [
      { value: 'easy', label: 'EASY' },
      { value: 'normal', label: 'NORMAL' },
      { value: 'hard', label: 'HARD' },
    ];
    const difficultyRow = document.createElement('div');
    difficultyRow.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap;';
    difficulties.forEach(({ value, label }) => {
      const btn = document.createElement('button');
      btn.id = `settings-difficulty-${value}`;
      btn.textContent = label;
      btn.style.cssText = `
        padding: 8px 16px;
        font-family: monospace;
        font-size: 14px;
        background: transparent;
        color: #00ff00;
        border: 1px solid #00ff00;
        border-radius: 4px;
        cursor: pointer;
      `;
      btn.addEventListener('click', () => {
        this.settingsManager?.setDifficulty(value);
        this.syncPanelControls(this.settingsManager!.getSettings());
      });
      difficultyRow.appendChild(btn);
    });
    difficultySection.appendChild(difficultyRow);
    panel.appendChild(difficultySection);

    // ── Controls section (read-only) ────────────────────────────────────────
    const controlsSection = this.buildSection(
      'settings-controls-section',
      'CONTROLS'
    );
    const controlsText = document.createElement('div');
    controlsText.id = 'settings-controls-text';
    // tabindex makes the read-only controls block a focus stop in the
    // panel's Tab order (Volume -> Speed -> Difficulty -> Controls -> CLOSE).
    controlsText.setAttribute('tabindex', '0');
    controlsText.textContent =
      'W A S D — Move | ENTER / SPACE — Start / Confirm';
    controlsText.style.cssText = `
      color: #ffffff;
      font-size: 14px;
      line-height: 1.8;
      max-width: 400px;
    `;
    controlsSection.appendChild(controlsText);
    panel.appendChild(controlsSection);

    // ── CLOSE button ────────────────────────────────────────────────────────
    const closeBtn = document.createElement('button');
    closeBtn.id = 'settings-close-button';
    closeBtn.textContent = 'CLOSE';
    closeBtn.style.cssText = `
      margin-top: 32px;
      padding: 10px 40px;
      font-size: 16px;
      font-family: monospace;
      background: transparent;
      color: #00ff00;
      border: 2px solid #00ff00;
      border-radius: 4px;
      cursor: pointer;
    `;
    closeBtn.addEventListener('click', () => {
      this.closeSettingsPanel();
    });
    panel.appendChild(closeBtn);

    this.menuContainer.appendChild(panel);
    this.settingsPanel = panel;
    // Sync controls to the current settings immediately.
    const settings = this.settingsManager?.getSettings();
    if (settings) {
      this.syncPanelControls(settings);
    }
  }

  /** Build a labeled section wrapper for the settings panel. */
  private buildSection(id: string, label: string): HTMLElement {
    const section = document.createElement('div');
    section.id = id;
    section.style.cssText = `
      width: 100%;
      max-width: 420px;
      margin-bottom: 20px;
      padding: 16px;
      border: 1px solid rgba(0, 255, 0, 0.3);
      border-radius: 4px;
      box-sizing: border-box;
    `;
    const labelEl = document.createElement('div');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      color: #00ff00;
      font-size: 14px;
      letter-spacing: 2px;
      margin-bottom: 10px;
    `;
    section.appendChild(labelEl);
    return section;
  }
}
