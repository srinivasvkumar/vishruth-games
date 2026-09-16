/**
 * W3A.4 (kanban t_de156e6e) — GameOverScene:
 * 'GAME OVER' heading, final score, high score, RESTART button
 * (click + Enter/Space -> switchScene('menu')), double-restart guard,
 * dark terminal theme, scene registered as 'gameover' in initGame().
 *
 * Scope: this is the GameOverScene portion of TDD_PLAN Task 8.2.
 * Restart target is 'menu' (clean loop: game-over -> menu -> start).
 *
 * Strategy (matches tests/unit/menu-scene-full.test.ts convention):
 *   - 'three' mocked with importOriginal + stubbed WebGLRenderer
 *     (happy-dom cannot create a WebGL context; the Scene base class
 *     constructs one).
 *   - '@/utils/Logger' mocked (project convention).
 *   - Game dependency is a lightweight mock — GameOverScene only calls
 *     game.switchScene.
 *
 * GameOverScene is constructed DIRECTLY (new GameOverScene(mockGame)),
 * not via the full initGame() chain. Lifecycle driven explicitly:
 * load() -> onLoad creates the DOM; enter() -> onEnter shows the
 * container + wires keydown; cleanup() -> onCleanup removes the DOM.
 *
 * Final score: set via setFinalScore(n) before or after load().
 * High score: read from localStorage HIGH_SCORE_KEY on enter.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameOverScene } from '@/scenes/GameOverScene';
import { HIGH_SCORE_KEY } from '@/systems/Score';
import { Logger } from '@/utils/Logger';

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
function createMockGame() {
  return {
    switchScene: vi.fn().mockResolvedValue(undefined),
    isGameRunning: () => false,
    pause: vi.fn(),
    stop: vi.fn(),
  };
}

type MockGame = ReturnType<typeof createMockGame>;

function pressKey(key: string): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key }));
}

/**
 * Load + enter the GameOverScene with an optional final score and
 * pre-stored high score.
 */
async function bootGameOverScene(
  game: MockGame,
  finalScore?: number,
  highScore?: number
): Promise<GameOverScene> {
  if (highScore !== undefined) {
    window.localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
  }
  const scene = new GameOverScene(
    game as unknown as import('@/core/Game').Game
  );
  await scene.load();
  if (finalScore !== undefined) {
    scene.setFinalScore(finalScore);
  }
  scene.enter();
  return scene;
}

// --- Tests --------------------------------------------------------------------
describe('W3A.4: GameOverScene', () => {
  let game: MockGame;
  let scene: GameOverScene;

  beforeEach(async () => {
    document.body.innerHTML = '';
    window.localStorage.removeItem(HIGH_SCORE_KEY);
    vi.clearAllMocks();
    game = createMockGame();
    scene = await bootGameOverScene(game, 150);
  });

  afterEach(() => {
    scene.cleanup();
    document.body.innerHTML = '';
    window.localStorage.removeItem(HIGH_SCORE_KEY);
    vi.restoreAllMocks();
  });

  it('renders a "GAME OVER" heading', () => {
    const container = document.getElementById('gameover-container');
    expect(container).toBeTruthy();
    const heading = container!.querySelector('h1');
    expect(heading).toBeTruthy();
    expect(heading!.textContent!.toUpperCase()).toContain('GAME OVER');
  });

  it('displays the final score passed via setFinalScore', () => {
    const container = document.getElementById('gameover-container')!;
    const finalScoreEl = document.getElementById('gameover-final-score');
    expect(finalScoreEl).toBeTruthy();
    expect(finalScoreEl!.textContent).toContain('150');
  });

  it('displays the high score from localStorage', async () => {
    scene.cleanup();
    window.localStorage.setItem(HIGH_SCORE_KEY, '999');
    scene = await bootGameOverScene(game, 150);
    const highScoreEl = document.getElementById('gameover-high-score');
    expect(highScoreEl).toBeTruthy();
    expect(highScoreEl!.textContent).toContain('999');
  });

  it('shows 0 for high score when nothing is stored', () => {
    const highScoreEl = document.getElementById('gameover-high-score');
    expect(highScoreEl).toBeTruthy();
    expect(highScoreEl!.textContent).toContain('0');
  });

  it('renders a visible RESTART button', () => {
    const restart = document.getElementById(
      'gameover-restart-button'
    ) as HTMLButtonElement;
    expect(restart).toBeTruthy();
    expect(restart!.textContent!.toUpperCase()).toContain('RESTART');
    expect(restart!.disabled).toBe(false);
  });

  it('clicking RESTART transitions to the menu scene', () => {
    const restart = document.getElementById(
      'gameover-restart-button'
    ) as HTMLButtonElement;
    restart!.click();
    expect(game.switchScene).toHaveBeenCalledTimes(1);
    expect(game.switchScene).toHaveBeenCalledWith('menu');
  });

  it('pressing Enter transitions to the menu scene', () => {
    pressKey('Enter');
    expect(game.switchScene).toHaveBeenCalledTimes(1);
    expect(game.switchScene).toHaveBeenCalledWith('menu');
  });

  it('pressing Space transitions to the menu scene', () => {
    pressKey(' ');
    expect(game.switchScene).toHaveBeenCalledTimes(1);
    expect(game.switchScene).toHaveBeenCalledWith('menu');
  });

  it('double-dispatch guard: second Enter after restart is a no-op', () => {
    pressKey('Enter');
    expect(game.switchScene).toHaveBeenCalledTimes(1);
    pressKey('Enter');
    expect(game.switchScene).toHaveBeenCalledTimes(1);
  });

  it('double-dispatch guard: second click after restart is a no-op', () => {
    const restart = document.getElementById(
      'gameover-restart-button'
    ) as HTMLButtonElement;
    restart!.click();
    expect(game.switchScene).toHaveBeenCalledTimes(1);
    restart!.click();
    expect(game.switchScene).toHaveBeenCalledTimes(1);
  });

  it('keydown listener is detached on exit', () => {
    scene.exit();
    pressKey('Enter');
    expect(game.switchScene).not.toHaveBeenCalled();
  });

  it('cleanup removes the gameover DOM from the document', () => {
    expect(document.getElementById('gameover-container')).toBeTruthy();
    scene.cleanup();
    expect(document.getElementById('gameover-container')).toBeNull();
  });
});
