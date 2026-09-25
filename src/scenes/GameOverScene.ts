import * as THREE from "three";
import { Scene } from "./Scene";
import { Logger } from "@/utils/Logger";
import { readStoredHighScore } from "@/systems/Score";
import { GameEvents } from "@/utils/Constants";
import type { Game } from "@/core/Game";

/**
 * Game over scene (W3A.4, TDD_PLAN Task 8.2 — GameOverScene portion).
 *
 * Displays:
 *   - "GAME OVER" heading
 *   - Final score (set via setFinalScore() before or after load())
 *   - High score (read from localStorage HIGH_SCORE_KEY on every enter)
 *   - RESTART button — click + Enter/Space keydown -> game.switchScene('menu')
 *     with a double-restart guard (same pattern as MenuScene BUG-W2-1a).
 *
 * Restart target is 'menu' (clean loop: game-over -> menu -> start).
 * Dark terminal theme: monospace, #00ff00 accents, glow shadows.
 *
 * The GameScene's private gameOver() handler (src/scenes/GameScene.ts:378)
 * currently creates its own inline DOM overlay with a location.reload()
 * button. That is out of scope for this card — the GameOverScene here is
 * the formal scene that will replace it in a follow-up task (W3-B or
 * a dedicated GameScene refactor card). GameScene.ts is NOT modified here
 * (file budget: <=3 files, and GameScene.ts is not one of them).
 */
export class GameOverScene extends Scene {
  private container?: HTMLDivElement;
  private restartButton: HTMLButtonElement | null = null;
  private finalScoreEl: HTMLDivElement | null = null;
  private highScoreEl: HTMLDivElement | null = null;
  private keydownHandler: ((event: KeyboardEvent) => void) | null = null;
  /**
   * W3-A.8: LEVEL_START event listener — attached in onLoad() (before
   * enter() is called by SceneManager), so it receives the live payload
   * emitted at SceneManager.loadScene() L80 (AFTER enter()).
   */
  private levelStartHandler: ((event: Event) => void) | null = null;
  private finalScore = 0;
  /**
   * Double-restart guard: once a restart transition has fired, key
   * presses / clicks must not fire another. Set to true the moment the
   * transition is dispatched; cleared only if the transition rejects.
   */
  private restarted = false;

  constructor(game: Game) {
    super(game);
    Logger.info("Game over scene created");
  }

  protected createCamera(): THREE.Camera {
    return new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- preserves the base class async contract; no asset loading
  protected async onLoad(): Promise<void> {
    this.setupUI();
    Logger.debug("Game over scene loaded");
  }

  protected onEnter(): void {
    if (this.container) {
      this.container.style.display = "block";
    }
    // Refresh the high score on every entry so the current record is shown.
    this.updateHighScoreDisplay();
    // W4-B.5: screen-reader announcement with the scene's authoritative
    // final score (the value actually displayed). Overwrites the
    // SceneManager's data-payload announcement, so the SR always hears
    // the score the user sees — including on direct entry where no
    // transition data payload was passed.
    this.game
      .getAccessibilitySystem()
      .announce(`Game over, final score: ${this.finalScore}`);
    // Wire the restart path. If a previous transition rejected,
    // restarted is false again — re-arm.
    if (!this.restarted) {
      this.attachKeydownHandler();
      if (this.restartButton) {
        this.restartButton.disabled = false;
      }
    }
    Logger.debug("Game over scene entered");
  }

  protected onUpdate(_deltaTime: number): void {
    // No dynamic update logic in the game-over scene.
  }

  protected onExit(): void {
    this.detachKeydownHandler();
    this.detachLevelStartHandler();
    if (this.container) {
      this.container.style.display = "none";
    }
    Logger.debug("Game over scene exited");
  }

  protected onCleanup(): void {
    this.detachKeydownHandler();
    this.detachLevelStartHandler();
    this.container?.parentNode?.removeChild(this.container);
    this.container = undefined;
    this.restartButton = null;
    this.finalScoreEl = null;
    this.highScoreEl = null;
    Logger.debug("Game over scene cleaned up");
  }

  /**
   * Set the final score to display. Call before or after load(); the
   * value is reflected immediately if the DOM exists.
   */
  setFinalScore(score: number): void {
    this.finalScore = Math.max(0, Math.floor(score));
    if (this.finalScoreEl) {
      this.finalScoreEl.textContent = String(this.finalScore);
    }
  }

  /**
   * Create the game-over DOM content: heading, final score, high score,
   * and the RESTART button.
   *
   * DOM order: heading, final-score label + value, high-score label +
   * value, RESTART button.
   */
  private setupUI(): void {
    const container = document.createElement("div");
    container.id = "gameover-container";
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
      color: #ffffff;
    `;

    const heading = document.createElement("h1");
    heading.textContent = "GAME OVER";
    heading.style.cssText = `
      color: #ff4444;
      font-size: 48px;
      margin-bottom: 24px;
      text-shadow: 0 0 10px #ff4444;
    `;

    // Final score block
    const finalScoreLabel = document.createElement("div");
    finalScoreLabel.textContent = "SCORE";
    finalScoreLabel.style.cssText = `
      color: #00ff00;
      font-size: 14px;
      letter-spacing: 2px;
      margin-bottom: 6px;
    `;
    const finalScoreValue = document.createElement("div");
    finalScoreValue.id = "gameover-final-score";
    finalScoreValue.setAttribute("aria-label", "Final score");
    finalScoreValue.textContent = String(this.finalScore);
    finalScoreValue.style.cssText = `
      color: #ffffff;
      font-size: 36px;
      margin-bottom: 16px;
    `;
    const finalScoreBlock = document.createElement("div");
    finalScoreBlock.style.cssText = "text-align: center;";
    finalScoreBlock.appendChild(finalScoreLabel);
    finalScoreBlock.appendChild(finalScoreValue);

    // High score block
    const highScoreLabel = document.createElement("div");
    highScoreLabel.textContent = "HIGH SCORE";
    highScoreLabel.style.cssText = `
      color: #00ff00;
      font-size: 14px;
      letter-spacing: 2px;
      margin-bottom: 6px;
    `;
    const highScoreValue = document.createElement("div");
    highScoreValue.id = "gameover-high-score";
    highScoreValue.textContent = "0";
    highScoreValue.style.cssText = `
      color: #ffffff;
      font-size: 22px;
      margin-bottom: 24px;
    `;
    const highScoreBlock = document.createElement("div");
    highScoreBlock.style.cssText = "text-align: center;";
    highScoreBlock.appendChild(highScoreLabel);
    highScoreBlock.appendChild(highScoreValue);

    // RESTART button
    const restartButton = document.createElement("button");
    restartButton.id = "gameover-restart-button";
    restartButton.textContent = "RESTART";
    restartButton.setAttribute("aria-label", "Restart game");
    restartButton.style.cssText = `
      padding: 12px 48px;
      font-size: 24px;
      font-family: monospace;
      background: #00ff00;
      color: #000000;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    `;
    restartButton.addEventListener("click", () => {
      this.restartGame();
    });

    container.appendChild(heading);
    container.appendChild(finalScoreBlock);
    container.appendChild(highScoreBlock);
    container.appendChild(restartButton);
    document.body.appendChild(container);

    this.container = container;
    this.restartButton = restartButton;
    this.finalScoreEl = finalScoreValue;
    this.highScoreEl = highScoreValue;

    // Prime the high score display now.
    this.updateHighScoreDisplay();

    // W3-A.8: attach the LEVEL_START listener HERE (in setupUI, called from
    // onLoad), NOT in onEnter. SceneManager.loadScene() order is:
    //   load() -> onLoad()/setupUI() -> enter() -> onEnter() -> emit(LEVEL_START)
    // A listener registered in onEnter() would attach AFTER the event fires,
    // so it never receives the live payload.
    this.attachLevelStartHandler();
  }

  /**
   * Read the stored high score from LocalStorage under the canonical
   * HIGH_SCORE_KEY (same key ScoreManager persists) and reflect it in
   * the high-score display.
   *
   * W3-A.9: delegates to the canonical `readStoredHighScore()` helper
   * (try/catch + clampScore + 0-floor) instead of the old private copy.
   */
  private updateHighScoreDisplay(): void {
    if (!this.highScoreEl) return;
    this.highScoreEl.textContent = String(
      readStoredHighScore(window.localStorage),
    );
  }

  /**
   * Fire the restart transition once.
   *
   * Guard order (same pattern as MenuScene BUG-W2-1a):
   *   1. `restarted` flag — blocks any second dispatch.
   *   2. Remove the keydown listener immediately on dispatch.
   *   3. Disable the button so a second click is a no-op at the DOM level.
   *
   * If the transition REJECTS (e.g. 'menu' not registered), re-arm:
   * the flag clears, the listener is re-attached, and the button is
   * re-enabled — the game-over screen remains reachable.
   */
  private restartGame(): void {
    if (this.restarted) return;
    this.restarted = true;
    this.detachKeydownHandler();
    if (this.restartButton) {
      this.restartButton.disabled = true;
    }
    Logger.info("Game over: restarting to menu");
    this.game.switchScene("menu").catch((error) => {
      Logger.error("Failed to restart from game over", { error });
      // Re-arm the restart path.
      this.restarted = false;
      this.attachKeydownHandler();
      if (this.restartButton) {
        this.restartButton.disabled = false;
      }
    });
  }

  /**
   * Attach the window-level keydown listener for Enter/Space.
   * Idempotent — a second call while attached is a no-op.
   */
  private attachKeydownHandler(): void {
    if (this.keydownHandler) return;
    this.keydownHandler = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this.restartGame();
      }
    };
    window.addEventListener("keydown", this.keydownHandler);
  }

  /**
   * Detach the keydown listener. Safe to call when not attached (no-op).
   */
  private detachKeydownHandler(): void {
    if (this.keydownHandler) {
      window.removeEventListener("keydown", this.keydownHandler);
      this.keydownHandler = null;
    }
  }

  /**
   * W3-A.8: attach the window-level LEVEL_START listener.
   * Must be called in setupUI() (from onLoad), NOT in onEnter — see the
   * SceneManager.loadScene() ordering comment in setupUI().
   * Idempotent — a second call while attached is a no-op.
   */
  private attachLevelStartHandler(): void {
    if (this.levelStartHandler) return;
    this.levelStartHandler = (event: Event) => {
      this.handleLevelStart(event as CustomEvent);
    };
    window.addEventListener(GameEvents.LEVEL_START, this.levelStartHandler);
  }

  /**
   * W3-A.8: detach the LEVEL_START listener. Safe to call when not
   * attached (no-op).
   */
  private detachLevelStartHandler(): void {
    if (this.levelStartHandler) {
      window.removeEventListener(
        GameEvents.LEVEL_START,
        this.levelStartHandler,
      );
      this.levelStartHandler = null;
    }
  }

  /**
   * W3-A.8: handle the LEVEL_START event.
   *
   * SceneManager.loadScene() emits LEVEL_START with { name, data } where
   * data carries the { score, highScore } payload from
   * GameScene.gameOver() -> switchScene('gameover', { score, highScore }).
   *
   * Read logic:
   *   - Only act when name === 'gameover' (ignore other scene transitions).
   *   - score: data.score if present and finite, else 0.
   *   - highScore: always from localStorage via readStoredHighScore()
   *     (the source of truth — GameScene.gameOver() calls
   *     saveHighScore() before the transition). The event payload's
   *     highScore field is redundant and NOT used.
   *
   * No crash, no 'undefined' display.
   */
  private handleLevelStart(event: CustomEvent): void {
    const detail = event.detail as
      { name?: string; data?: Record<string, unknown> | null } | undefined;
    if (!detail || detail.name !== "gameover") return;

    const data = detail.data;

    // Score: read from event payload, fall back to 0.
    let score = 0;
    if (data) {
      const rawScore = data.score;
      if (typeof rawScore === "number" && Number.isFinite(rawScore)) {
        score = Math.max(0, Math.floor(rawScore));
      }
    }

    // High score: always from localStorage (source of truth).
    // W3-A.9: uses the canonical readStoredHighScore() helper.
    const highScore = readStoredHighScore(window.localStorage);

    // Update the display.
    this.setFinalScore(score);
    if (this.highScoreEl) {
      this.highScoreEl.textContent = String(highScore);
    }

    Logger.debug("Game over: LEVEL_START payload applied", {
      score,
      highScore,
    });
  }
}
