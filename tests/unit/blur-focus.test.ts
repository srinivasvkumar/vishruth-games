/**
 * W4-B.10 (kanban t_3ea43ca0) — Edge case: tab blur/focus.
 *
 * When the user switches away from the tab (window blur), the game must
 * pause: the game loop halts and a "PAUSED" overlay is shown. When the
 * user returns to the tab (window focus), the game resumes: the loop
 * restarts and the overlay is hidden.
 *
 * The product already has `Game.pause()` / `Game.resume()` (FSM-driven in
 * src/core/Game.ts):
 *   - pause():  playing -> paused, emits game:pause; the rAF gameLoop guard
 *     (`if (fsm.getState() !== 'playing') return;`) stops scheduling frames.
 *   - resume(): paused -> playing, resets lastTimestamp, re-invokes gameLoop,
 *     emits game:resume.
 *
 * GameScene is responsible for wiring the two window events to those calls
 * and for showing/hiding the "PAUSED" overlay:
 *   - window 'blur'  -> game.pause()   + show #game-paused-overlay
 *   - window 'focus' -> game.resume()  + hide #game-paused-overlay
 *
 * Behavior verified here (RED surface — fails on the un-patched product):
 *   1. window blur  pauses the game (game.pause() is called).
 *   2. window focus resumes the game (game.resume() is called).
 *   3. blur shows the #game-paused-overlay with the text "PAUSED".
 *   4. focus hides the #game-paused-overlay.
 *   5. The overlay is present in the DOM after the scene loads, hidden by
 *      default (display:none).
 *   6. blur does NOT pause when the game is not running (e.g. menu) — it
 *      only acts while playing (isGameRunning() guard).
 *   7. focus does NOT resume when the game was not paused (no-op).
 *   8. blur/focus are idempotent — repeated blurs don't double-pause.
 *
 * Mock strategy (matches game-scene-ui.test.ts):
 *   - `three` is mocked with importOriginal + a stubbed WebGLRenderer
 *     (happy-dom cannot create WebGL contexts).
 *   - `@/utils/Logger` is mocked (project convention).
 *   - The Game dependency is a lightweight mock whose pause()/resume()/
 *     isGameRunning() are spied on so the test can assert GameScene calls
 *     them in response to window blur/focus.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { GameScene } from '@/scenes/GameScene';
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

const uiConfig: UIConfig = {
  theme: 'dark',
  fontSize: 14,
  showFPS: false,
  showDebug: false,
};

/**
 * Lightweight Game mock. `pause`/`resume` are spied on so the test can assert
 * GameScene calls them on window blur/focus. `isGameRunning` reports whether
 * the FSM is in 'playing' (the guard GameScene should use before pausing).
 */
function createMockGame(uiSystem: UISystem) {
  const inputState = { keys: {} as Record<string, boolean> };
  let running = true;
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
    _uiSystem: uiSystem,
    _setRunning: (v: boolean) => {
      running = v;
    },
    getRenderer: vi.fn(() => mockRendererWrapper),
    _inputState: inputState,
    getInputSystem: vi.fn(() => ({ getInputState: () => inputState })),
    getUISystem: vi.fn(() => uiSystem),
    switchScene: vi.fn().mockResolvedValue(undefined),
    isGameRunning: vi.fn(() => running),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
  };
}

type MockGame = ReturnType<typeof createMockGame>;

async function loadedScene(game: MockGame): Promise<GameScene> {
  const gs = new GameScene(game);
  await gs.load();
  return gs;
}

/** Fire a window blur (simulate tab switching away). */
function fireBlur(): void {
  window.dispatchEvent(new Event('blur'));
}

/** Fire a window focus (simulate tab returning to the foreground). */
function fireFocus(): void {
  window.dispatchEvent(new Event('focus'));
}

// --- Tests ------------------------------------------------------------------

describe('W4-B.10: GameScene tab blur/focus pause', () => {
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

  it('blur: pauses the game when it is running', async () => {
    const gs = await loadedScene(game);
    gs.enter();
    vi.clearAllMocks();

    fireBlur();

    expect(game.pause).toHaveBeenCalledTimes(1);
    expect(game.resume).not.toHaveBeenCalled();
  });

  it('focus: resumes the game after a blur', async () => {
    const gs = await loadedScene(game);
    gs.enter();

    fireBlur(); // pauses
    vi.clearAllMocks();

    fireFocus(); // should resume

    expect(game.resume).toHaveBeenCalledTimes(1);
    expect(game.pause).not.toHaveBeenCalled();
  });

  it('blur: shows the #game-paused-overlay with the text "PAUSED"', async () => {
    const gs = await loadedScene(game);
    gs.enter();

    fireBlur();

    const overlay = document.getElementById('game-paused-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay!.textContent!.trim()).toBe('PAUSED');
    // Visible: display is a non-none value (flex is used to center the label).
    expect(overlay!.style.display).not.toBe('none');
  });

  it('focus: hides the #game-paused-overlay', async () => {
    const gs = await loadedScene(game);
    gs.enter();

    fireBlur(); // show overlay
    const overlay = document.getElementById('game-paused-overlay')!;
    expect(overlay.style.display).not.toBe('none');

    fireFocus(); // hide overlay

    expect(overlay.style.display).toBe('none');
  });

  it('overlay: is present in the DOM after load, hidden by default', async () => {
    const gs = await loadedScene(game);
    // enter() should leave the overlay hidden (game not paused yet).
    gs.enter();

    const overlay = document.getElementById('game-paused-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay!.style.display).toBe('none');
    expect(overlay!.textContent!.trim()).toBe('PAUSED');
  });

  it('blur: does NOT pause when the game is not running (isGameRunning guard)', async () => {
    const gs = await loadedScene(game);
    gs.enter();
    // Simulate the game being in a non-playing state (e.g. menu / paused already).
    game._setRunning(false);
    vi.clearAllMocks();

    fireBlur();

    expect(game.pause).not.toHaveBeenCalled();
    const overlay = document.getElementById('game-paused-overlay');
    // No overlay bleed-through when not playing.
    if (overlay) {
      expect(overlay.style.display).toBe('none');
    }
  });

  it('focus: does NOT resume when the game was not paused (no-op)', async () => {
    const gs = await loadedScene(game);
    gs.enter();
    vi.clearAllMocks();

    // No blur happened, so focus should be a no-op.
    fireFocus();

    expect(game.resume).not.toHaveBeenCalled();
  });

  it('blur x2: is idempotent — does not double-pause', async () => {
    const gs = await loadedScene(game);
    gs.enter();
    vi.clearAllMocks();

    fireBlur();
    fireBlur();

    expect(game.pause).toHaveBeenCalledTimes(1);
  });

  it('onCleanup: removes the #game-paused-overlay from the DOM', async () => {
    const gs = await loadedScene(game);
    gs.enter();

    expect(document.getElementById('game-paused-overlay')).not.toBeNull();

    gs.cleanup();

    expect(document.getElementById('game-paused-overlay')).toBeNull();
  });
});
