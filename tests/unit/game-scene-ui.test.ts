/**
 * W3A.2 (kanban t_501493cf) — RED test: GameScene does NOT hand-roll the
 * HUD DOM. The HUD lives in UISystem (D2 HUD-ownership ruling).
 *
 * RED surface (fails today, passes after GameScene is migrated):
 *   1. `new GameScene(mockGame)` does NOT create #game-score /
 *      #game-health / #game-level via document.createElement.
 *      (Today GameScene.setupUI() creates all three divs in the
 *       constructor — the spy catches it.)
 *   2. After load() + enter() + update(), the HUD divs in the DOM show
 *      the correct text ("SCORE: 0", "HEALTH: 100", "LEVEL: 1").
 *      Proves UISystem drives the HUD, not GameScene's old inline divs.
 *      (Today this passes because GameScene's divs show the same text —
 *       the test is designed to still pass after migration, where
 *       UISystem's divs show the text instead.)
 *   3. After cleanup(), the HUD divs are no longer in the DOM.
 *      (Today GameScene.removeUI() removes them. After migration,
 *       UISystem.cleanup() removes them — the test still passes.)
 *
 * The RED assertion is test 1: it specifically asserts that GameScene
 * does NOT call document.createElement for the HUD divs. Test 2 and 3
 * are behavioral guarantees that must hold both before and after
 * migration (the visible HUD looks identical — only the owning object
 * changes).
 *
 * Mock strategy:
 *   - `three` is mocked with importOriginal + a stubbed WebGLRenderer
 *     (happy-dom cannot create WebGL contexts) — same convention as
 *     scenes.test.ts / obstacle.test.ts / player.test.ts.
 *   - `@/utils/Logger` is mocked (project convention).
 *   - The Game dependency is a lightweight mock that includes
 *     getUISystem() returning a REAL UISystem instance (the point of
 *     this test is to verify GameScene delegates to the real UISystem).
 *   - The real UISystem creates the HUD divs in its constructor.
 *     GameScene must NOT create them itself.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { GameScene } from '@/scenes/GameScene';
import { GameConstants, GameEvents } from '@/utils/Constants';
import { Logger } from '@/utils/Logger';
import { UISystem } from '@/systems/UI';
import type { UIConfig } from '@/types/GameTypes';

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

const HUD_IDS = ['game-score', 'game-health', 'game-level'] as const;

const uiConfig: UIConfig = {
  theme: 'dark',
  fontSize: 14,
  showFPS: false,
  showDebug: false,
};

function createMockGame(uiSystem: UISystem) {
  const inputState = { keys: {} as Record<string, boolean> };
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
    _inputState: inputState,
    getInputSystem: vi.fn(() => ({ getInputState: () => inputState })),
    getUISystem: vi.fn(() => uiSystem),
    switchScene: vi.fn().mockResolvedValue(undefined),
    isGameRunning: () => true,
    pause: vi.fn(),
    stop: vi.fn(),
  };
}

type MockGame = ReturnType<typeof createMockGame>;

async function loadedScene(game: MockGame): Promise<GameScene> {
  const gs = new GameScene(game);
  await gs.load();
  return gs;
}

// --- Tests ------------------------------------------------------------------

describe('W3A.2: GameScene HUD ownership (D2 — HUD lives in UISystem)', () => {
  let uiSystem: UISystem;
  let game: MockGame;

  beforeEach(() => {
    document.body.innerHTML = '';
    uiSystem = new UISystem(uiConfig);
    game = createMockGame(uiSystem);
  });

  afterEach(() => {
    uiSystem.cleanup();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('RED: GameScene constructor does NOT create #game-score / #game-health / #game-level via document.createElement', () => {
    // Capture the real createElement BEFORE any mock, to avoid recursion.
    const realCreate = document.createElement.bind(document);
    const createdDivs: HTMLDivElement[] = [];
    const spy = vi
      .spyOn(document, 'createElement')
      .mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
        const el = realCreate(tagName, options);
        if (tagName.toLowerCase() === 'div') {
          createdDivs.push(el as HTMLDivElement);
        }
        return el;
      }) as typeof document.createElement);

    // Construct the GameScene. The UISystem already created the HUD divs
    // in beforeEach (before the spy was installed), so any div created
    // here is GameScene's own.
    const gs = new GameScene(game);

    // After construction, check if any of the created divs have an id
    // matching one of the HUD ids.
    const hudIdsCreated = createdDivs.filter((el) =>
      (HUD_IDS as readonly string[]).includes(el.id)
    );

    expect(hudIdsCreated).toHaveLength(0);

    spy.mockRestore();
    // Clean up: remove any divs GameScene created (there should be none
    // in the GREEN state; in the RED state this prevents DOM pollution).
    for (const el of createdDivs) {
      el.remove();
    }
    // The UISystem's divs are still in the DOM (created in beforeEach).
    // Verify they exist — this confirms the HUD is owned by UISystem.
    for (const id of HUD_IDS) {
      expect(document.getElementById(id)).toBeTruthy();
    }
    // gs is unused — the assertion is on document.createElement calls.
    void gs;
  });

  it('after load() + enter() + update(), the HUD divs show correct text (UISystem-driven)', async () => {
    const gs = await loadedScene(game);
    gs.enter();
    gs.update(0.016);

    // The HUD divs (created by UISystem in beforeEach) should show:
    // "SCORE: 0" (ScoreManager starts at 0)
    // "HEALTH: 100" (Player starts at full health)
    // "LEVEL: 1" (GameScene starts at level 1)
    expect(document.getElementById('game-score')!.textContent).toBe('SCORE: 0');
    expect(document.getElementById('game-health')!.textContent).toBe('HEALTH: 100');
    expect(document.getElementById('game-level')!.textContent).toBe('LEVEL: 1');

    // All three divs should be visible (display:block) after enter().
    for (const id of HUD_IDS) {
      expect(document.getElementById(id)!.style.display).toBe('block');
    }
  });

  it('after update() with a score event, the HUD reflects the new score', async () => {
    const gs = await loadedScene(game);
    gs.enter();
    gs.update(0.016);

    // Fire a PLAYER_SCORE event — GameScene's setupEventListeners()
    // adds points to the ScoreManager.
    window.dispatchEvent(
      new CustomEvent(GameEvents.PLAYER_SCORE, { detail: { points: 50 } })
    );
    gs.update(0.016);

    expect(document.getElementById('game-score')!.textContent).toBe('SCORE: 50');
  });

  it('after cleanup(), the HUD divs are no longer in the DOM', async () => {
    const gs = await loadedScene(game);
    gs.cleanup();

    // GameScene's cleanup should result in the HUD divs being removed.
    // Today: GameScene.removeUI() removes them directly.
    // After migration: UISystem.cleanup() removes them (called by
    // Game.cleanup(), but in this test we call uiSystem.cleanup()
    // in afterEach — so we verify the divs are gone after the scene
    // cleanup + UISystem cleanup).
    //
    // For this test to be meaningful, we call uiSystem.cleanup()
    // explicitly (simulating what Game.cleanup() does).
    uiSystem.cleanup();

    for (const id of HUD_IDS) {
      expect(document.getElementById(id)).toBeNull();
    }
    expect(gs.isSceneLoaded()).toBe(false);
  });
});
