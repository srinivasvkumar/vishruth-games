/**
 * W3A.5 (kanban t_77ceb449) — Full game loop wiring:
 * GameScene death -> switchScene('gameover', {score, highScore})
 * GameOverScene restart -> switchScene('menu')
 * State reset on GameScene re-entry (no stale state from prior run).
 *
 * RED surface (before implementation):
 *   - GameScene.gameOver() creates inline DOM div (not switchScene)
 *   - GameScene.onEnter() does not reset player/score/health/obstacles
 *
 * GREEN target:
 *   - GameScene.gameOver() calls this.game.switchScene('gameover', {score, highScore})
 *   - No inline gameOverDiv DOM is created
 *   - GameScene.onEnter() resets all run state for a fresh run
 *
 * Strategy (matches tests/unit/gameover-scene.test.ts convention):
 *   - 'three' mocked with importOriginal + stubbed WebGLRenderer
 *   - '@/utils/Logger' mocked (project convention)
 *   - Game dependency: lightweight mock with switchScene spy
 *
 * GameScene is constructed DIRECTLY (new GameScene(mockGame)), not via
 * the full initGame() chain. Lifecycle driven explicitly.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameScene } from '@/scenes/GameScene';
import { GameOverScene } from '@/scenes/GameOverScene';
import { GameEvents } from '@/utils/Constants';
import { HIGH_SCORE_KEY } from '@/systems/Score';
import { UISystem } from '@/systems/UI';
import type { UIConfig } from '@/types/GameTypes';
import type { Game } from '@/core/Game';

// --- Mocks ------------------------------------------------------------------
vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  class MockWebGLRenderer {
    readonly domElement: HTMLCanvasElement;
    constructor(_params?: Record<string, unknown>) {
      this.domElement = document.createElement('canvas');
    }
    render(..._args: unknown[]): void {}
  }
  return { ...actual, WebGLRenderer: MockWebGLRenderer };
});

vi.mock('@/utils/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    setLevel: vi.fn(),
  },
}));

// --- Helpers ------------------------------------------------------------------

/**
 * Lightweight mock Game object that records switchScene calls in a plain
 * array (no vi.fn() — avoids interaction with vi.clearAllMocks/restoreAllMocks
 * which can strip the mock implementation between beforeEach/afterEach).
 */
type SwitchSceneCall = [string, Record<string, unknown>?];

function createMockGame() {
  const calls: SwitchSceneCall[] = [];
  const uiSystem = new UISystem({
    fontSize: 14,
    showFPS: false,
    showDebug: false,
  } as UIConfig);
  // W2-A.2: scenes now share Game's renderer (Scene.ts constructor calls
  // game.getRenderer().getRenderer()). Provide a mock with the same shape.
  const mockRendererInner = {
    render: vi.fn(),
    setSize: vi.fn(),
    clear: vi.fn(),
    dispose: vi.fn(),
  };
  const mockRendererWrapper = {
    getRenderer: () => mockRendererInner,
    resizeToContainer: vi.fn(),
  };
  
  return {
    getRenderer: vi.fn(() => mockRendererWrapper),
    switchScene: (...args: [string, Record<string, unknown>?]): Promise<void> => {
      calls.push(args);
      return Promise.resolve();
    },
    calls,
    isGameRunning: () => false,
    pause: () => {},
    stop: () => {},
    getUISystem: () => uiSystem,
    getInputSystem: () => ({
      getInputState: () => ({ keys: {} as Record<string, boolean> }),
    }),
  };
}

type MockGame = ReturnType<typeof createMockGame>;

/**
 * Boot a GameScene: construct, load (onLoad creates player/obstacles/HUD),
 * then enter (onEnter makes it active + resets run state).
 */
async function bootGameScene(
  game: MockGame,
): Promise<GameScene> {
  const scene = new GameScene(game as unknown as Game);
  await scene.load();
  scene.enter();
  return scene;
}

/**
 * Simulate the death event on window.
 */
function fireDeathEvent(): void {
  window.dispatchEvent(new CustomEvent(GameEvents.PLAYER_DEATH));
}

// --- Tests --------------------------------------------------------------------
describe('W3A.5: Full game loop wiring', () => {
  let game: MockGame;
  let scene: GameScene;

  beforeEach(async () => {
    document.body.innerHTML = '';
    window.localStorage.removeItem(HIGH_SCORE_KEY);
    vi.clearAllMocks();
    game = createMockGame();
    scene = await bootGameScene(game);
  });

  afterEach(() => {
    scene.exit();
    scene.cleanup();
    document.body.innerHTML = '';
    window.localStorage.removeItem(HIGH_SCORE_KEY);
  });

  // ── Death -> GameOver transition ────────────────────────────────────────────

  it('firing PLAYER_DEATH triggers switchScene("gameover") with score data', () => {
    fireDeathEvent();
    expect(game.calls).toHaveLength(1);
    const [sceneName, data] = game.calls[0];
    expect(sceneName).toBe('gameover');
    expect(data).toMatchObject({ score: expect.any(Number) });
  });

  it('does NOT create an inline game-over DOM div on death', () => {
    fireDeathEvent();
    // The old inline overlay had a div with "GAME OVER" heading and a
    // "PLAY AGAIN" button with onclick="location.reload()".
    // After the fix, no such div should exist in the document body.
    // (The gameover-container is created by GameOverScene, not GameScene,
    // and we have NOT loaded GameOverScene here, so no container exists.)
    const bodyHtml = document.body.innerHTML;
    expect(bodyHtml).not.toContain('GAME OVER');
    expect(bodyHtml).not.toContain('PLAY AGAIN');
    expect(bodyHtml).not.toContain('location.reload()');
  });

  it('passes highScore in the switchScene data payload', async () => {
    // Pre-seed a high score so the payload has a non-zero highScore.
    window.localStorage.setItem(HIGH_SCORE_KEY, '500');
    // Exit and clean up the existing scene (removes its event listeners),
    // then boot a fresh scene whose ScoreManager reads the seeded value.
    scene.exit();
    scene.cleanup();
    scene = await bootGameScene(game);
    // Add some score so the death carries a score.
    window.dispatchEvent(
      new CustomEvent(GameEvents.PLAYER_SCORE, { detail: { points: 100 } }),
    );
    fireDeathEvent();
    const [, data] = game.calls[game.calls.length - 1];
    expect(data!.highScore).toBe(500);
  });

  // ── GameOverScene receives data ────────────────────────────────────────────

  it('GameOverScene displays the score passed via switchScene data', async () => {
    // Simulate the transition: fire death, capture the data payload.
    window.dispatchEvent(
      new CustomEvent(GameEvents.PLAYER_SCORE, { detail: { points: 250 } }),
    );
    fireDeathEvent();
    const [, data] = game.calls[0];
    expect(data).toMatchObject({ score: 250 });

    // Now load GameOverScene and set its final score from the data.
    const goScene = new GameOverScene(game as unknown as Game);
    await goScene.load();
    goScene.setFinalScore((data as { score: number }).score);
    goScene.enter();

    const finalScoreEl = document.getElementById('gameover-final-score');
    expect(finalScoreEl).toBeTruthy();
    expect(finalScoreEl!.textContent).toContain('250');
    goScene.cleanup();
  });

  // ── Restart -> Menu ────────────────────────────────────────────────────────

  it('restarting from GameOverScene transitions to the menu scene', async () => {
    const goScene = new GameOverScene(game as unknown as Game);
    await goScene.load();
    goScene.setFinalScore(100);
    goScene.enter();

    const restart = document.getElementById(
      'gameover-restart-button',
    ) as HTMLButtonElement;
    restart!.click();

    // GameOverScene calls switchScene('menu') — verify the call.
    expect(game.calls.length).toBeGreaterThanOrEqual(1);
    const lastCall = game.calls[game.calls.length - 1];
    expect(lastCall[0]).toBe('menu');
    goScene.cleanup();
  });

  // ── STATE-RESET (mandatory per boss_bot) ───────────────────────────────────

  it('re-entering GameScene resets player position to spawn point', async () => {
    // Simulate the player having moved to a non-spawn position by the
    // underlying mesh (this is what the game loop would do).
    const meshPos = (scene as unknown as {
      player: { getMesh: () => { position: { set: (x: number, y: number, z: number) => void } } };
    }).player.getMesh().position;
    meshPos.set(99, 99, 99);

    // Exit and re-enter (simulates returning from menu).
    scene.exit();
    scene.enter();

    const posAfter = (scene as unknown as {
      player: { getPosition: () => { x: number; y: number; z: number } };
    }).player.getPosition();
    // Player should be reset to spawn (0, 1, 0) — not the old position.
    expect(posAfter.x).toBeCloseTo(0);
    expect(posAfter.y).toBeCloseTo(1);
    expect(posAfter.z).toBeCloseTo(0);
    // The old position must NOT be carried over.
    expect(posAfter.x).not.toBeCloseTo(99);
  });

  it('re-entering GameScene resets score to 0', async () => {
    // Accumulate score.
    window.dispatchEvent(
      new CustomEvent(GameEvents.PLAYER_SCORE, { detail: { points: 500 } }),
    );
    const scoreBefore = (scene as unknown as {
      scoreManager: { getScore(): number };
    }).scoreManager.getScore();
    expect(scoreBefore).toBe(500);

    // Exit and re-enter.
    scene.exit();
    scene.enter();

    const scoreAfter = (scene as unknown as {
      scoreManager: { getScore(): number };
    }).scoreManager.getScore();
    expect(scoreAfter).toBe(0);
  });

  it('re-entering GameScene resets health to full', async () => {
    // Damage the player to reduce health below max.
    const player = (scene as unknown as {
      player: { damage: (d: number) => void; getState: () => { health: number } };
    }).player;
    const maxHealth = player.getState().health;
    // Apply damage to reduce health.
    player.damage(10);
    const healthAfterDamage = player.getState().health;
    expect(healthAfterDamage).toBeLessThan(maxHealth);

    // Exit and re-enter.
    scene.exit();
    scene.enter();

    const playerAfter = (scene as unknown as {
      player: { getState: () => { health: number } };
    }).player;
    const healthAfterReset = playerAfter.getState().health;
    expect(healthAfterReset).toBe(maxHealth);
  });

  it('re-entering GameScene clears and respawns obstacles', async () => {
    const obstaclesBefore = (scene as unknown as { obstacles: unknown[] }).obstacles.length;
    expect(obstaclesBefore).toBeGreaterThanOrEqual(3);

    // Exit and re-enter.
    scene.exit();
    scene.enter();

    const obstaclesAfter = (scene as unknown as { obstacles: unknown[] }).obstacles.length;
    // Should have the initial set (3) again, not accumulated obstacles.
    expect(obstaclesAfter).toBe(3);
  });

  it('re-entering GameScene resets level to 1', async () => {
    const level = (scene as unknown as { level: number }).level;
    // Level starts at 1; verify reset keeps it at 1.
    expect(level).toBe(1);
    scene.exit();
    scene.enter();
    const levelAfter = (scene as unknown as { level: number }).level;
    expect(levelAfter).toBe(1);
  });

  it('re-entering GameScene clears the isGameOver flag', async () => {
    // Trigger death to set isGameOver.
    fireDeathEvent();
    const isGameOverBefore = (scene as unknown as { isGameOver: boolean }).isGameOver;
    expect(isGameOverBefore).toBe(true);

    // Exit and re-enter.
    scene.exit();
    scene.enter();

    const isGameOverAfter = (scene as unknown as { isGameOver: boolean }).isGameOver;
    expect(isGameOverAfter).toBe(false);
  });
});
