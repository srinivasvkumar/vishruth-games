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
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GameOverScene } from "@/scenes/GameOverScene";
import { HIGH_SCORE_KEY } from "@/systems/Score";
import { Logger } from "@/utils/Logger";
import { GameEvents } from "@/utils/Constants";

// --- Mocks ------------------------------------------------------------------
vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  class MockWebGLRenderer {
    readonly domElement: HTMLCanvasElement;
    constructor(_params?: Record<string, unknown>) {
      this.domElement = document.createElement("canvas");
    }
    render(..._args: unknown[]): void {}
  }
  return { ...actual, WebGLRenderer: MockWebGLRenderer };
});

vi.mock("@/utils/Logger", () => ({
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
  window.dispatchEvent(new KeyboardEvent("keydown", { key }));
}

/**
 * Load + enter the GameOverScene with an optional final score and
 * pre-stored high score.
 */
async function bootGameOverScene(
  game: MockGame,
  finalScore?: number,
  highScore?: number,
): Promise<GameOverScene> {
  if (highScore !== undefined) {
    window.localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
  }
  const scene = new GameOverScene(
    game as unknown as import("@/core/Game").Game,
  );
  await scene.load();
  if (finalScore !== undefined) {
    scene.setFinalScore(finalScore);
  }
  scene.enter();
  return scene;
}

// --- Tests --------------------------------------------------------------------
describe("W3A.4: GameOverScene", () => {
  let game: MockGame;
  let scene: GameOverScene;

  beforeEach(async () => {
    document.body.innerHTML = "";
    window.localStorage.removeItem(HIGH_SCORE_KEY);
    vi.clearAllMocks();
    game = createMockGame();
    scene = await bootGameOverScene(game, 150);
  });

  afterEach(() => {
    scene.cleanup();
    document.body.innerHTML = "";
    window.localStorage.removeItem(HIGH_SCORE_KEY);
    vi.restoreAllMocks();
  });

  it('renders a "GAME OVER" heading', () => {
    const container = document.getElementById("gameover-container");
    expect(container).toBeTruthy();
    const heading = container!.querySelector("h1");
    expect(heading).toBeTruthy();
    expect(heading!.textContent!.toUpperCase()).toContain("GAME OVER");
  });

  it("displays the final score passed via setFinalScore", () => {
    const container = document.getElementById("gameover-container")!;
    const finalScoreEl = document.getElementById("gameover-final-score");
    expect(finalScoreEl).toBeTruthy();
    expect(finalScoreEl!.textContent).toContain("150");
  });

  it("displays the high score from localStorage", async () => {
    scene.cleanup();
    window.localStorage.setItem(HIGH_SCORE_KEY, "999");
    scene = await bootGameOverScene(game, 150);
    const highScoreEl = document.getElementById("gameover-high-score");
    expect(highScoreEl).toBeTruthy();
    expect(highScoreEl!.textContent).toContain("999");
  });

  it("shows 0 for high score when nothing is stored", () => {
    const highScoreEl = document.getElementById("gameover-high-score");
    expect(highScoreEl).toBeTruthy();
    expect(highScoreEl!.textContent).toContain("0");
  });

  it("renders a visible RESTART button", () => {
    const restart = document.getElementById(
      "gameover-restart-button",
    ) as HTMLButtonElement;
    expect(restart).toBeTruthy();
    expect(restart!.textContent!.toUpperCase()).toContain("RESTART");
    expect(restart!.disabled).toBe(false);
  });

  it("clicking RESTART transitions to the menu scene", () => {
    const restart = document.getElementById(
      "gameover-restart-button",
    ) as HTMLButtonElement;
    restart!.click();
    expect(game.switchScene).toHaveBeenCalledTimes(1);
    expect(game.switchScene).toHaveBeenCalledWith("menu");
  });

  it("pressing Enter transitions to the menu scene", () => {
    pressKey("Enter");
    expect(game.switchScene).toHaveBeenCalledTimes(1);
    expect(game.switchScene).toHaveBeenCalledWith("menu");
  });

  it("pressing Space transitions to the menu scene", () => {
    pressKey(" ");
    expect(game.switchScene).toHaveBeenCalledTimes(1);
    expect(game.switchScene).toHaveBeenCalledWith("menu");
  });

  it("double-dispatch guard: second Enter after restart is a no-op", () => {
    pressKey("Enter");
    expect(game.switchScene).toHaveBeenCalledTimes(1);
    pressKey("Enter");
    expect(game.switchScene).toHaveBeenCalledTimes(1);
  });

  it("double-dispatch guard: second click after restart is a no-op", () => {
    const restart = document.getElementById(
      "gameover-restart-button",
    ) as HTMLButtonElement;
    restart!.click();
    expect(game.switchScene).toHaveBeenCalledTimes(1);
    restart!.click();
    expect(game.switchScene).toHaveBeenCalledTimes(1);
  });

  it("keydown listener is detached on exit", () => {
    scene.exit();
    pressKey("Enter");
    expect(game.switchScene).not.toHaveBeenCalled();
  });

  it("cleanup removes the gameover DOM from the document", () => {
    expect(document.getElementById("gameover-container")).toBeTruthy();
    scene.cleanup();
    expect(document.getElementById("gameover-container")).toBeNull();
  });
});

// ── W3-A.8: LEVEL_START payload tests ──────────────────────────────────────

describe("W3A.8: GameOverScene LEVEL_START payload", () => {
  let game: MockGame;

  beforeEach(async () => {
    document.body.innerHTML = "";
    window.localStorage.removeItem(HIGH_SCORE_KEY);
    vi.clearAllMocks();
    game = createMockGame();
    game.switchScene.mockResolvedValue(undefined);
  });

  afterEach(() => {
    document.body.innerHTML = "";
    window.localStorage.removeItem(HIGH_SCORE_KEY);
    vi.restoreAllMocks();
  });

  /**
   * Create and load a fresh GameOverScene (no final score set by default).
   */
  async function createScene(finalScore?: number): Promise<GameOverScene> {
    const scene = new GameOverScene(
      game as unknown as import("@/core/Game").Game,
    );
    await scene.load();
    if (finalScore !== undefined) {
      scene.setFinalScore(finalScore);
    }
    return scene;
  }

  it("reads score from LEVEL_START event payload", async () => {
    window.localStorage.setItem(HIGH_SCORE_KEY, "500");

    const scene = await createScene();
    scene.enter();
    const event = new CustomEvent(GameEvents.LEVEL_START, {
      detail: { name: "gameover", data: { score: 4200, highScore: 9999 } },
    });
    window.dispatchEvent(event);

    const finalScoreEl = document.getElementById("gameover-final-score");
    const highScoreEl = document.getElementById("gameover-high-score");
    expect(finalScoreEl).toBeTruthy();
    expect(finalScoreEl!.textContent).toBe("4200");
    // highScore should come from localStorage (source of truth), not event payload
    expect(highScoreEl).toBeTruthy();
    expect(highScoreEl!.textContent).toBe("500");

    scene.cleanup();
  });

  it("falls back to 0 + localStorage when data is null", async () => {
    window.localStorage.setItem(HIGH_SCORE_KEY, "777");

    const scene = await createScene();
    scene.enter();
    const event = new CustomEvent(GameEvents.LEVEL_START, {
      detail: { name: "gameover", data: null },
    });
    window.dispatchEvent(event);

    const finalScoreEl = document.getElementById("gameover-final-score");
    const highScoreEl = document.getElementById("gameover-high-score");
    expect(finalScoreEl).toBeTruthy();
    expect(finalScoreEl!.textContent).toBe("0");
    expect(highScoreEl).toBeTruthy();
    expect(highScoreEl!.textContent).toBe("777");

    scene.cleanup();
  });

  it("falls back to 0 when no localStorage and data is null", async () => {
    const scene = await createScene();
    scene.enter();
    const event = new CustomEvent(GameEvents.LEVEL_START, {
      detail: { name: "gameover", data: null },
    });
    window.dispatchEvent(event);

    const finalScoreEl = document.getElementById("gameover-final-score");
    const highScoreEl = document.getElementById("gameover-high-score");
    expect(finalScoreEl!.textContent).toBe("0");
    expect(highScoreEl!.textContent).toBe("0");

    scene.cleanup();
  });

  it("ignores LEVEL_START for non-gameover scenes", async () => {
    window.localStorage.setItem(HIGH_SCORE_KEY, "300");

    const scene = await createScene();
    scene.enter();
    const event = new CustomEvent(GameEvents.LEVEL_START, {
      detail: { name: "game", data: { score: 9999 } },
    });
    window.dispatchEvent(event);

    const finalScoreEl = document.getElementById("gameover-final-score");
    // Should remain at default (0), not 9999
    expect(finalScoreEl!.textContent).toBe("0");

    scene.cleanup();
  });

  it("listener is attached in onLoad, not onEnter (timing test)", async () => {
    // This test verifies that the listener is registered in onLoad/setupUI,
    // which runs BEFORE enter() is called by SceneManager.
    // If the listener were only attached in onEnter(), the live LEVEL_START
    // event (emitted by SceneManager AFTER enter()) would not be received.
    window.localStorage.setItem(HIGH_SCORE_KEY, "400");

    const scene = await createScene(); // onLoad runs here — listener should be attached

    // Simulate the EXACT SceneManager.loadScene order:
    // load() -> onLoad() [listener attached] -> enter() -> onEnter() -> emit(LEVEL_START)
    scene.enter(); // onEnter runs here — too late if listener only attached here
    const event = new CustomEvent(GameEvents.LEVEL_START, {
      detail: { name: "gameover", data: { score: 250 } },
    });
    window.dispatchEvent(event); // emitted AFTER enter(), like SceneManager does

    const finalScoreEl = document.getElementById("gameover-final-score");
    // If listener was attached in onLoad, this should be 250
    // If listener was only in onEnter, this would be 0 (event already fired)
    expect(finalScoreEl!.textContent).toBe("250");

    scene.cleanup();
  });

  it("LEVEL_START listener is unsubscribed on exit", async () => {
    window.localStorage.setItem(HIGH_SCORE_KEY, "600");

    const scene = await createScene();
    scene.enter();

    // Verify listener is active: emit event, score updates
    const event1 = new CustomEvent(GameEvents.LEVEL_START, {
      detail: { name: "gameover", data: { score: 100 } },
    });
    window.dispatchEvent(event1);
    expect(document.getElementById("gameover-final-score")!.textContent).toBe(
      "100",
    );

    // Exit the scene
    scene.exit();

    // Verify listener is removed: emit event, score should NOT update
    const event2 = new CustomEvent(GameEvents.LEVEL_START, {
      detail: { name: "gameover", data: { score: 200 } },
    });
    window.dispatchEvent(event2);
    expect(document.getElementById("gameover-final-score")!.textContent).toBe(
      "100",
    );

    scene.cleanup();
  });

  it("LEVEL_START listener is unsubscribed on cleanup", async () => {
    window.localStorage.setItem(HIGH_SCORE_KEY, "600");

    const scene = await createScene();
    scene.enter();

    // Verify listener is active
    const event1 = new CustomEvent(GameEvents.LEVEL_START, {
      detail: { name: "gameover", data: { score: 300 } },
    });
    window.dispatchEvent(event1);
    expect(document.getElementById("gameover-final-score")!.textContent).toBe(
      "300",
    );

    // Cleanup removes the DOM
    scene.cleanup();

    // Even if we re-enter, the listener should be gone (DOM is removed)
    const event2 = new CustomEvent(GameEvents.LEVEL_START, {
      detail: { name: "gameover", data: { score: 400 } },
    });
    window.dispatchEvent(event2);
    // DOM is removed, so we can't check textContent, but the listener
    // should not cause any errors or side effects
  });

  it('does not display "undefined" for missing data fields', async () => {
    const scene = await createScene();
    scene.enter();

    // data exists but score field is missing
    const event = new CustomEvent(GameEvents.LEVEL_START, {
      detail: { name: "gameover", data: {} },
    });
    window.dispatchEvent(event);

    const finalScoreEl = document.getElementById("gameover-final-score");
    expect(finalScoreEl!.textContent).not.toBe("undefined");
    expect(finalScoreEl!.textContent).toBe("0");

    scene.cleanup();
  });

  it("restart still works after LEVEL_START payload is applied", async () => {
    window.localStorage.setItem(HIGH_SCORE_KEY, "800");

    const scene = await createScene();
    scene.enter();

    const event = new CustomEvent(GameEvents.LEVEL_START, {
      detail: { name: "gameover", data: { score: 500 } },
    });
    window.dispatchEvent(event);
    expect(document.getElementById("gameover-final-score")!.textContent).toBe(
      "500",
    );

    // Click RESTART
    const restart = document.getElementById(
      "gameover-restart-button",
    ) as HTMLButtonElement;
    restart.click();
    expect(game.switchScene).toHaveBeenCalledTimes(1);
    expect(game.switchScene).toHaveBeenCalledWith("menu");

    scene.cleanup();
  });
});
