import * as THREE from 'three';
import { Scene } from './Scene';
import { Logger } from '@/utils/Logger';
import type { Game } from '@/core/Game';

/**
 * Minimal menu scene (W2-A.3, DECISION D2 boundary).
 *
 * Provides placeholder DOM content — a title, a "Press START" hint, and
 * (BUG-W2-1a) the minimal player start path:
 *   - Enter / Space keydown -> game.switchScene('game')
 *   - START button click   -> game.switchScene('game')
 *
 * Full menu UI (settings, high scores, styled buttons) stays in W3
 * Task 8.2 — this card adds the start path only.
 */
export class MenuScene extends Scene {
  private menuContainer?: HTMLDivElement;
  private startButton: HTMLButtonElement | null = null;
  private keydownHandler: ((event: KeyboardEvent) => void) | null = null;
  /**
   * Double-start guard (BUG-W2-1a): once a start transition has fired,
   * key presses / clicks must not fire another. Set to true the moment
   * the transition is dispatched; cleared only if the transition
   * rejects (scene not found, etc.) so the menu stays reachable.
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

  // eslint-disable-next-line @typescript-eslint/require-await -- preserves the base class async contract; menu asset loading will be awaited in W3
  protected async onLoad(): Promise<void> {
    this.setupMenuUI();
    Logger.debug('Menu scene loaded');
  }

  protected onEnter(): void {
    if (this.menuContainer) {
      this.menuContainer.style.display = 'block';
    }
    // BUG-W2-1a: wire the start path while the menu is visible. If a
    // previous transition rejected (game not registered), started is
    // false again — re-arm.
    if (!this.started) {
      this.attachKeydownHandler();
      if (this.startButton) {
        this.startButton.disabled = false;
      }
    }
    Logger.debug('Menu scene entered');
  }

  protected onUpdate(_deltaTime: number): void {
    // No dynamic update logic in the minimal menu (W2-A.3 boundary).
  }

  protected onExit(): void {
    // BUG-W2-1a: detach the keydown listener the moment the menu stops
    // being the active scene, so keys pressed during the transition
    // into 'game' cannot re-fire the start path.
    this.detachKeydownHandler();
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
    Logger.debug('Menu scene cleaned up');
  }

  /**
   * Create the minimal placeholder DOM content: title, hint, and the
   * BUG-W2-1a START button.
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

    // BUG-W2-1a: the visible, clickable START button. Minimal styling
    // only — the styled button treatment stays in W3 Task 8.2.
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

    container.appendChild(title);
    container.appendChild(hint);
    container.appendChild(startButton);
    document.body.appendChild(container);
    this.menuContainer = container;
    this.startButton = startButton;
  }

  /**
   * BUG-W2-1a: fire the start transition once.
   *
   * Guard order:
   *   1. `started` flag — blocks any second dispatch from either the
   *      keydown listener or the button click (covers browser
   *      keydown auto-repeat on a held key and double-clicks).
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
