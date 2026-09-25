/**
 * W4-B.9 RED (2026-09-25) — Edge case: window resize during gameplay.
 *
 * Resizing the browser window during active gameplay must:
 *   1. Update the active scene's camera aspect ratio to the new viewport.
 *   2. Call updateProjectionMatrix() on the camera (real THREE requires it
 *      after mutating aspect; a no-op in the mock but must be invoked).
 *   3. Resize the shared WebGL renderer to the new container dimensions.
 *
 * Today (RED):
 *   - GameScene has no window resize handler. Dispatching 'resize' on
 *     window does NOT touch the camera aspect or the renderer size.
 *   - index.ts's resize handler resizes the renderer but does not update
 *     the camera aspect, so the 3D view is stretched/letterboxed after
 *     any non-16:9 resize.
 *
 * GREEN (after GameScene.handleResize() is added):
 *   - GameScene registers a window 'resize' listener in onLoad() and
 *     removes it in onCleanup().
 *   - handleResize() updates camera.aspect = width / height, calls
 *     camera.updateProjectionMatrix(), and delegates renderer sizing to
 *     game.getRenderer().resizeToContainer().
 *
 * Mock strategy (matches game-scene-ui.test.ts / scenes.test.ts):
 *   - `three` is mocked with importOriginal + a recording
 *     PerspectiveCamera + WebGLRenderer (happy-dom has no WebGL context).
 *   - `@/utils/Logger` is mocked (project convention).
 *   - The Game dependency is a lightweight mock whose getRenderer()
 *     returns a wrapper whose resizeToContainer is a vi.fn() we can assert
 *     on, and whose getUISystem() returns a real UISystem (so HUD divs
 *     actually exist in the DOM for the reposition assertion).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { GameScene } from '@/scenes/GameScene';
import { UISystem } from '@/systems/UI';
import type { UIConfig } from '@/types/GameTypes';

// --- Mocks ------------------------------------------------------------------

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();

  class MockPerspectiveCamera {
    fov: number;
    aspect: number;
    near: number;
    far: number;
    position: { x: number; y: number; z: number; set: (x: number, y: number, z: number) => void; lerp: (v: unknown, t: number) => void };
    updateProjectionMatrixCalls = 0;

    constructor(fov = 75, aspect = 16 / 9, near = 0.1, far = 1000) {
      this.fov = fov;
      this.aspect = aspect;
      this.near = near;
      this.far = far;
      const pos: { x: number; y: number; z: number; set: (x: number, y: number, z: number) => void; lerp: (v: unknown, t: number) => void } = {
        x: 0,
        y: 0,
        z: 0,
        set(x: number, y: number, z: number) {
          pos.x = x;
          pos.y = y;
          pos.z = z;
        },
        lerp(_v: unknown, _t: number) {},
      };
      this.position = pos;
    }

    lookAt(_x: number, _y: number, _z: number): void {}

    updateProjectionMatrix(): void {
      this.updateProjectionMatrixCalls++;
    }
  }

  class MockWebGLRenderer {
    readonly domElement: HTMLCanvasElement;
    constructor(_params?: Record<string, unknown>) {
      this.domElement = document.createElement('canvas');
    }
    render(..._args: unknown[]): void {}
  }

  return {
    ...actual,
    PerspectiveCamera: MockPerspectiveCamera,
    WebGLRenderer: MockWebGLRenderer,
  };
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

function createMockGame(uiSystem: UISystem) {
  const inputState = { keys: {} as Record<string, boolean> };
  // W2-A.2: scenes share Game's renderer. Provide a mock wrapper whose
  // resizeToContainer we can assert was called on window resize.
  const mockRendererInner = {
    render: vi.fn(),
    setSize: vi.fn(),
    clear: vi.fn(),
    dispose: vi.fn(),
  };
  const mockRendererWrapper = {
    getRenderer: () => mockRendererInner,
    resizeToContainer: vi.fn(),
    resize: vi.fn(),
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
    _rendererWrapper: mockRendererWrapper,
  };
}

type MockGame = ReturnType<typeof createMockGame>;

async function loadedAndEnteredScene(
  game: MockGame
): Promise<GameScene> {
  const gs = new GameScene(game);
  await gs.load();
  gs.enter();
  return gs;
}

/**
 * Set window.innerWidth / innerHeight to a specific size, then dispatch a
 * 'resize' event on window. This is the "user resizes the browser window"
 * simulation used by every test below.
 */
function simulateWindowResize(width: number, height: number): void {
  Object.defineProperty(window, 'innerWidth', {
    value: width,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(window, 'innerHeight', {
    value: height,
    writable: true,
    configurable: true,
  });
  window.dispatchEvent(new Event('resize'));
}

// --- Tests ------------------------------------------------------------------

describe('W4-B.9: Window resize during gameplay (no crash, HUD scales)', () => {
  let uiSystem: UISystem;
  let game: MockGame;
  let gs: GameScene;
  let camera: THREE.PerspectiveCamera;

  beforeEach(async () => {
    document.body.innerHTML = '';
    // W4-B.9: provide the #game-container the resize handler looks up, so
    // the container-resize path (resizeToContainer) is exercised rather
    // than the direct-resize fallback.
    const container = document.createElement('div');
    container.id = 'game-container';
    document.body.appendChild(container);
    // Restore default happy-dom viewport so each test starts clean.
    Object.defineProperty(window, 'innerWidth', {
      value: 1024,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'innerHeight', {
      value: 768,
      writable: true,
      configurable: true,
    });
    uiSystem = new UISystem(uiConfig);
    game = createMockGame(uiSystem);
    gs = await loadedAndEnteredScene(game);
    camera = gs.getCamera() as THREE.PerspectiveCamera;
  });

  afterEach(() => {
    gs.cleanup();
    uiSystem.cleanup();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('RED: resize triggers a camera aspect update to the new viewport ratio', () => {
    // Sanity: initial aspect reflects the 1024x768 construction viewport.
    const initialAspect = camera.aspect;

    // User resizes the window to 800x1200 (portrait, taller than wide).
    simulateWindowResize(800, 1200);

    // The active scene's camera must now have aspect = 800/1200.
    // RED: GameScene has no resize handler, so aspect is unchanged.
    expect(camera.aspect).toBeCloseTo(800 / 1200);
    expect(camera.aspect).not.toBeCloseTo(initialAspect);
  });

  it('RED: resize calls updateProjectionMatrix on the camera', () => {
    const callsBefore =
      (camera as unknown as { updateProjectionMatrixCalls: number })
        .updateProjectionMatrixCalls;

    simulateWindowResize(640, 480);

    const callsAfter =
      (camera as unknown as { updateProjectionMatrixCalls: number })
        .updateProjectionMatrixCalls;

    // Real THREE requires updateProjectionMatrix() after mutating aspect.
    // RED: no handler, so no call is recorded.
    expect(callsAfter).toBeGreaterThan(callsBefore);
  });

  it('RED: resize delegates renderer sizing to the shared renderer wrapper', () => {
    const resizeToContainer = game._rendererWrapper.resizeToContainer;

    simulateWindowResize(1280, 720);

    // The shared renderer must be resized to the new container so the WebGL
    // viewport fills the screen instead of staying locked to the initial
    // clientWidth/clientHeight.
    // RED: GameScene has no resize handler, so the wrapper is never called.
    expect(resizeToContainer).toHaveBeenCalled();
  });

  it('RED: resize during gameplay does not throw (game must not crash)', () => {
    // The game is actively playing (scene entered, update loop would be
    // running). A window resize must not throw.
    expect(() => {
      // Several rapid resizes (user dragging the window edge).
      simulateWindowResize(1024, 768);
      simulateWindowResize(1440, 900);
      simulateWindowResize(375, 812); // mobile portrait
      simulateWindowResize(812, 375); // mobile landscape
    }).not.toThrow();
  });

  it('RED: HUD elements remain positioned and visible after resize', () => {
    // The HUD divs (owned by UISystem) must survive a resize: they stay in
    // the DOM, keep their fixed-corner placement (top/left/right offsets),
    // and remain visible so the score/health/level stay readable.
    const scoreEl = document.getElementById('game-score');
    const healthEl = document.getElementById('game-health');
    const levelEl = document.getElementById('game-level');

    expect(scoreEl).toBeTruthy();
    expect(healthEl).toBeTruthy();
    expect(levelEl).toBeTruthy();

    simulateWindowResize(500, 400);

    // After resize the HUD must still be present and positioned from the
    // viewport corners (fixed px offsets are resolution-independent).
    expect(document.getElementById('game-score')).toBe(scoreEl);
    expect(document.getElementById('game-score')!.style.position).toBe(
      'fixed'
    );
    expect(document.getElementById('game-score')!.style.top).toBe('10px');
    expect(document.getElementById('game-score')!.style.left).toBe('10px');
    expect(document.getElementById('game-health')!.style.right).toBe('10px');
    expect(document.getElementById('game-level')!.style.top).toBe('50px');
  });

  it('RED: the game loop (update) still works after a resize', () => {
    // A resize must not break the active scene's update path. Call update
    // after a resize and assert the scene did not crash and the HUD is in
    // sync (score/health/level divs show the expected text).
    gs.update(0.016);
    simulateWindowResize(1280, 800);
    expect(() => gs.update(0.016)).not.toThrow();

    // HUD stays in sync after a post-resize frame.
    expect(document.getElementById('game-score')!.textContent).toBe(
      'SCORE: 0'
    );
    expect(document.getElementById('game-health')!.textContent).toBe(
      'HEALTH: 100'
    );
    expect(document.getElementById('game-level')!.textContent).toBe(
      'LEVEL: 1'
    );
  });

  it('RED: cleanup removes the resize listener (no leak, no double-resize)', () => {
    // Capture the count of 'resize' listeners on window before cleanup.
    // happy-dom does not expose getEventListeners, so we infer via a
    // side-effect: after cleanup, dispatching resize must NOT affect the
    // camera aspect (the handler was removed).
    gs.cleanup();

    const aspectBefore = camera.aspect;
    simulateWindowResize(2000, 100);
    // After cleanup the handler is detached, so aspect is unchanged.
    expect(camera.aspect).toBe(aspectBefore);
  });
});
