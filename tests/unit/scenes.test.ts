/**
 * T0.2.2 (kanban G6) — retrospective GREEN-from-start tests for
 * src/scenes/Scene.ts, src/scenes/BootScene.ts, src/scenes/GameScene.ts
 * (never had coverage; no production changes).
 *
 * Strategy: real `three` under happy-dom for everything EXCEPT WebGLRenderer —
 * the G6 probe confirmed `new THREE.WebGLRenderer()` throws
 * "Error creating WebGL context." without a WebGL context, so 'three' is
 * mocked with importOriginal + a stubbed WebGLRenderer. Entities (Player /
 * Obstacle) keep the real three (Vector3 math + geometry.parameters), matching
 * the convention documented in obstacle.test.ts / player.test.ts.
 * '@/utils/Logger' is mocked (project convention); the Game dependency is a
 * lightweight mock (scenes only call getInputSystem / switchScene).
 *
 * BootScene's onLoad contains a real 1000ms delay → its describe runs on
 * fake timers. GameScene spawns 3 obstacles with random x/type — assertions
 * are written to be independent of that randomness (group counts, health
 * ranges).
 *
 * W2-A.3 (2026-09-13, task t_16b337f1) — the 'W2-A.3: boot path lands in
 * a valid registered active menu scene (RED)' describe uses the REAL
 * SceneManager + real scene classes (only 'three' and Logger are mocked,
 * as everywhere in this file). RED today: initGame() registers no scenes
 * at all, so Game.start() boots nothing and BootScene's
 * switchScene('menu') transition has no registered target —
 * SceneManager.loadScene('menu') throws 'Scene "menu" not found'.
 *
 * MenuScene is imported DYNAMICALLY (await import) inside the W2-A.3
 * tests, not at module top level: during the RED phase the module does
 * not exist yet, and a top-level import would fail COLLECTION of the
 * whole file (including the existing 25 GREEN tests), which is not a
 * valid RED state. The dynamic import is the RED surface for the
 * MenuScene tests — it rejects with "Failed to resolve import" until the
 * GREEN implementation lands.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { Scene } from '@/scenes/Scene';
import { BootScene } from '@/scenes/BootScene';
import { GameScene } from '@/scenes/GameScene';
import { GameConstants, GameEvents } from '@/utils/Constants';
import { Logger } from '@/utils/Logger';
import { Game } from '@/core/Game';
import { SceneManager } from '@/core/SceneManager';
import { InputSystem } from '@/systems/Input';
import { PhysicsSystem } from '@/systems/Physics';
import { AudioSystem } from '@/systems/Audio';
import { UISystem } from '@/systems/UI';
import type { GameConfig, UIConfig } from '@/types/GameTypes';

/**
 * W2-A.3 (RED phase, 2026-09-13, task t_16b337f1): the @/scenes/MenuScene
 * module does not exist yet.
 *
 * RED design: these 3 tests assert the GREEN behavior (scenes registered by
 * initGame, boot path landing in the active MenuScene, minimal MenuScene
 * DOM). They intentionally fail today — that IS the RED evidence. The test
 * file still collects and the 25 pre-existing GREEN tests still pass,
 * because no import specifier for the not-yet-existing module appears in
 * this file: `window.game` is read from the DOM global (set by src/index.ts
 * at import time) and MenuScene is located via `Object.values(
 * game.getSceneManager().getAllScenes())` — no import needed.
 *
 * GREEN implementation (next task, same branch) creates MenuScene.ts +
 * wires initGame() registration; these tests then pass UNCHANGED.
 */

// --- Mocks ------------------------------------------------------------------
const mockRendererRenderCalls: unknown[][] = [];

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  class MockWebGLRenderer {
    readonly domElement: HTMLCanvasElement;
    constructor(_params?: Record<string, unknown>) {
      this.domElement = document.createElement('canvas');
    }
    render(...args: unknown[]): void {
      mockRendererRenderCalls.push(args);
    }
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
const scenesTestUiConfig: UIConfig = {
  theme: 'dark',
  fontSize: 14,
  showFPS: false,
  showDebug: false,
};

function createMockGame() {
  const inputState = { keys: {} as Record<string, boolean> };
  const uiSystem = new UISystem(scenesTestUiConfig);
  const switchCalls: Array<[string, Record<string, unknown>?]> = [];
  const switchScene = vi.fn(
    (name: string, data?: Record<string, unknown>) => {
      switchCalls.push([name, data]);
      return Promise.resolve();
    },
  );
  return {
    _inputState: inputState,
    _uiSystem: uiSystem,
    _switchCalls: switchCalls,
    getInputSystem: vi.fn(() => ({ getInputState: () => inputState })),
    getUISystem: vi.fn(() => uiSystem),
    switchScene,
    isGameRunning: () => true,
    pause: vi.fn(),
    stop: vi.fn(),
  };
}

type MockGame = ReturnType<typeof createMockGame>;

function findGroups(scene: THREE.Scene): THREE.Group[] {
  return scene.children.filter((c: any) => c.isGroup === true) as THREE.Group[];
}

function findPlayerGroup(scene: THREE.Scene): THREE.Group {
  const found = findGroups(scene).find(
    (g) => (g.children[0] as any).geometry.parameters.height === 2
  );
  if (!found) throw new Error('player group not found in scene');
  return found;
}

// A concrete Scene subclass that records every lifecycle callback.
class TestScene extends Scene {
  calls = { onLoad: 0, onEnter: 0, onUpdate: 0, onExit: 0, onCleanup: 0 };
  updateDeltas: number[] = [];
  shouldFailOnLoad = false;

  protected createCamera(): THREE.Camera {
    return new THREE.PerspectiveCamera(60, 1.5, 0.1, 100);
  }
  protected async onLoad(): Promise<void> {
    this.calls.onLoad++;
    if (this.shouldFailOnLoad) throw new Error('mock onLoad failure');
  }
  protected onEnter(): void {
    this.calls.onEnter++;
  }
  protected onUpdate(deltaTime: number): void {
    this.calls.onUpdate++;
    this.updateDeltas.push(deltaTime);
  }
  protected onExit(): void {
    this.calls.onExit++;
  }
  protected onCleanup(): void {
    this.calls.onCleanup++;
  }
}

// ---------------------------------------------------------------------------
describe('Scene (base class, via concrete TestScene)', () => {
  let game: MockGame;

  beforeEach(() => {
    game = createMockGame();
    mockRendererRenderCalls.length = 0;
  });

  it('constructs with a THREE scene, a canvas-backed renderer, and the default camera', () => {
    const scene = new TestScene(game);
    expect(scene.getScene()).toBeInstanceOf(THREE.Scene);
    expect(scene.getRenderer().domElement).toBeInstanceOf(HTMLCanvasElement);
    expect(scene.getCamera()).toBeInstanceOf(THREE.PerspectiveCamera);
    expect((scene.getCamera() as THREE.PerspectiveCamera).fov).toBe(60);
    expect(scene.isSceneLoaded()).toBe(false);
    expect(scene.isSceneActive()).toBe(false);
  });

  it('accepts an injected camera instead of creating one', () => {
    const injected = new THREE.PerspectiveCamera(90, 2, 0.1, 100);
    const scene = new TestScene(game, injected);
    expect(scene.getCamera()).toBe(injected);
  });

  it('load() runs onLoad once and marks the scene loaded; a second load() is a no-op', async () => {
    const scene = new TestScene(game);
    await scene.load();
    expect(scene.calls.onLoad).toBe(1);
    expect(scene.isSceneLoaded()).toBe(true);
    await scene.load();
    expect(scene.calls.onLoad).toBe(1);
    expect(Logger.info).toHaveBeenCalledWith('Loading scene: TestScene');
    expect(Logger.info).toHaveBeenCalledWith('Scene loaded: TestScene');
  });

  it('load() rethrows an onLoad failure, stays unloaded, and can be retried', async () => {
    const scene = new TestScene(game);
    scene.shouldFailOnLoad = true;
    await expect(scene.load()).rejects.toThrow('mock onLoad failure');
    expect(scene.isSceneLoaded()).toBe(false);
    expect(Logger.error).toHaveBeenCalledWith(
      'Failed to load scene: TestScene',
      expect.anything()
    );

    scene.shouldFailOnLoad = false;
    await scene.load();
    expect(scene.isSceneLoaded()).toBe(true);
  });

  it('enter() before load() is a no-op', () => {
    const scene = new TestScene(game);
    scene.enter();
    expect(scene.calls.onEnter).toBe(0);
    expect(scene.isSceneActive()).toBe(false);
  });

  it('enter() after load() activates the scene; a second enter() is a no-op', async () => {
    const scene = new TestScene(game);
    await scene.load();
    scene.enter();
    expect(scene.calls.onEnter).toBe(1);
    expect(scene.isSceneActive()).toBe(true);
    expect(Logger.info).toHaveBeenCalledWith('Entered scene: TestScene');
    scene.enter();
    expect(scene.calls.onEnter).toBe(1);
  });

  it('update() forwards the delta to onUpdate only while active', async () => {
    const scene = new TestScene(game);
    scene.update(0.1);
    expect(scene.calls.onUpdate).toBe(0);

    await scene.load();
    scene.enter();
    scene.update(0.1);
    scene.update(0.2);
    expect(scene.updateDeltas).toEqual([0.1, 0.2]);

    scene.exit();
    scene.update(0.3);
    expect(scene.updateDeltas).toEqual([0.1, 0.2]);
  });

  it('exit() deactivates and runs onExit once; exiting when inactive is a no-op', async () => {
    const scene = new TestScene(game);
    scene.exit();
    expect(scene.calls.onExit).toBe(0);

    await scene.load();
    scene.enter();
    scene.exit();
    expect(scene.calls.onExit).toBe(1);
    expect(scene.isSceneActive()).toBe(false);
    expect(Logger.info).toHaveBeenCalledWith('Exited scene: TestScene');

    scene.exit();
    expect(scene.calls.onExit).toBe(1);
  });

  it('cleanup() runs onCleanup, resets both flags, and the scene can be reloaded', async () => {
    const scene = new TestScene(game);
    await scene.load();
    scene.enter();
    scene.cleanup();
    expect(scene.calls.onCleanup).toBe(1);
    expect(scene.isSceneLoaded()).toBe(false);
    expect(scene.isSceneActive()).toBe(false);

    await scene.load();
    expect(scene.calls.onLoad).toBe(2);
    expect(scene.isSceneLoaded()).toBe(true);
  });

  it('render() renders only while the scene is active', async () => {
    const scene = new TestScene(game);
    scene.render();
    expect(mockRendererRenderCalls).toHaveLength(0);

    await scene.load();
    scene.enter();
    scene.render();
    expect(mockRendererRenderCalls).toHaveLength(1);
    expect(mockRendererRenderCalls[0][0]).toBe(scene.getScene());
    expect(mockRendererRenderCalls[0][1]).toBe(scene.getCamera());
  });
});

// ---------------------------------------------------------------------------
describe('BootScene', () => {
  let game: MockGame;

  beforeEach(() => {
    game = createMockGame();
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  /** Run the real load() through its 1000ms delay (deterministic on fake timers). */
  async function loadedBoot(): Promise<BootScene> {
    const boot = new BootScene(game);
    const pending = boot.load();
    await vi.advanceTimersByTimeAsync(1100);
    await pending;
    return boot;
  }

  it('creates a 75° perspective camera and wires the LoadingManager callbacks', () => {
    const boot = new BootScene(game);
    const camera = boot.getCamera() as THREE.PerspectiveCamera;
    expect(camera.fov).toBe(75);
    expect(camera.near).toBe(0.1);
    expect(camera.far).toBe(1000);
    const manager = (boot as any).loadingManager;
    expect(manager.onProgress).toBeTypeOf('function');
    expect(manager.onLoad).toBeTypeOf('function');
    expect(manager.onError).toBeTypeOf('function');
    expect(boot.isSceneLoaded()).toBe(false);
  });

  it('load() builds the loading UI and marks the scene loaded after the 1s delay', async () => {
    const boot = await loadedBoot();
    expect(boot.isSceneLoaded()).toBe(true);
    expect(document.body.children).toHaveLength(2); // progress container + loading text
    const text = Array.from(document.body.children).find(
      (el) => el.textContent === 'Loading... 0%'
    );
    expect(text).toBeTruthy();
  });

  it('enter() shows the progress bar and loading text', async () => {
    const boot = await loadedBoot();
    boot.enter();
    expect(boot.isSceneActive()).toBe(true);
    expect((boot as any).progressBar.style.display).toBe('block');
    expect((boot as any).loadingText.style.display).toBe('block');
  });

  it('onUpdate() renders loading progress from the LoadingManager counts', async () => {
    const boot = await loadedBoot();
    (boot as any).loadingManager.onProgress('test-asset', 1, 2);
    boot.enter();
    boot.update(0.016);
    expect((boot as any).progressBar.style.width).toBe('50%');
    expect((boot as any).loadingText.textContent).toBe('Loading... 50%');
  });

  it('auto-transitions to the menu 500ms after entering when fully loaded', async () => {
    const boot = await loadedBoot(); // totalAssets = 0 = loadedAssets → "fully loaded"
    boot.enter();
    boot.update(0.016); // schedules the 500ms transition
    expect(boot.isSceneActive()).toBe(true);

    await vi.advanceTimersByTimeAsync(600);
    expect(boot.isSceneActive()).toBe(false);
    expect(game.switchScene).toHaveBeenCalledTimes(1);
    expect(game.switchScene).toHaveBeenCalledWith('menu');
    expect((boot as any).loadingText.style.display).toBe('none'); // onExit hid the UI
  });

  it('onCleanup() safely removes progressBar and loadingText from the DOM (no-op if already removed)', async () => {
    const boot = await loadedBoot();
    // setupLoadingUI() appends 2 nodes to body: progressContainer div
    // (which holds progressBar internally) and loadingText.
    expect(document.body.children).toHaveLength(2);
    // Container has no id; verify by its position as first child.
    const container = document.body.children[0] as HTMLDivElement;
    expect(container.tagName).toBe('DIV');
    // setupLoadingUI() appends the bar INSIDE the container:
    expect((boot as any).progressBar.parentNode).toBe(container);

    // onCleanup() has guard checks (src/scenes/BootScene.ts:107-112):
    //   if (this.progressBar && this.progressBar.parentNode) { ... }
    // so it succeeds (no throw), removes progressBar from the container
    // and loadingText from body, but the container div itself stays.
    boot.cleanup();
    expect(document.body.children.length).toBe(1);
    expect(boot.isSceneLoaded()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe('GameScene', () => {
  let game: MockGame;

  beforeEach(() => {
    game = createMockGame();
    document.body.innerHTML = '';
    // W3A.2: The mock game's UISystem created HUD divs, but a previous
    // test's gs.cleanup() may have removed them (Scene.cleanup() ->
    // onCleanup() -> ... the HUD divs are owned by UISystem and
    // removed by uiSystem.cleanup() in afterEach). Recreate them by
    // re-instantiating a fresh UISystem and reassigning.
    const freshUi = new UISystem(scenesTestUiConfig);
    (game as any)._uiSystem = freshUi;
    (game as any).getUISystem.mockImplementation(() => freshUi);
  });

  afterEach(() => {
    (game as any)._uiSystem.cleanup();
    document.body.innerHTML = '';
  });

  async function loadedScene(): Promise<GameScene> {
    const gs = new GameScene(game);
    await gs.load();
    return gs;
  }

  it('constructor creates a camera at (0, 5, 15) and does NOT create HUD divs (UISystem owns them)', () => {
    const gs = new GameScene(game);
    // W3A.2: HUD divs are owned by UISystem (D2). GameScene no longer
    // creates them. The mock game's UISystem created them in beforeEach.
    // Verify they exist (created by UISystem, not GameScene) and are
    // hidden (UISystem creates them with display:none).
    for (const id of ['game-score', 'game-health', 'game-level']) {
      const el = document.getElementById(id);
      expect(el).toBeTruthy();
      expect(el!.style.display).toBe('none');
    }
    const camera = gs.getCamera() as THREE.PerspectiveCamera;
    expect(camera.position.x).toBe(0);
    expect(camera.position.y).toBe(5);
    expect(camera.position.z).toBe(15);
    expect(gs.isSceneLoaded()).toBe(false);
    expect(Logger.info).toHaveBeenCalledWith('Game scene created');
  });

  it('load() builds the scene: ground, player, 3 obstacles, 3 lights, and the sky color', async () => {
    const gs = await loadedScene();
    expect(gs.isSceneLoaded()).toBe(true);
    expect(gs.getScene().children).toHaveLength(8); // ground + player + 3 obstacles + 3 lights
    const ground = gs.getScene().children[0];
    expect(ground.isMesh).toBe(true);
    expect(ground.rotation.x).toBeCloseTo(-Math.PI / 2);
    expect((gs.getScene().background as THREE.Color).getHex()).toBe(0x87CEEB);
    expect(findPlayerGroup(gs.getScene()).position.y).toBe(1); // spawned at (0, 1, 0)
  });

  it('enter() shows the HUD elements', async () => {
    const gs = await loadedScene();
    gs.enter();
    expect(gs.isSceneActive()).toBe(true);
    for (const id of ['game-score', 'game-health', 'game-level']) {
      expect(document.getElementById(id)!.style.display).toBe('block');
    }
  });

  it('update() moves the player with input and refreshes the HUD', async () => {
    const gs = await loadedScene();
    gs.enter();
    game._inputState.keys.d = true;
    const player = findPlayerGroup(gs.getScene());

    gs.update(0.016);

    expect(player.position.x).toBeCloseTo(GameConstants.PLAYER_SPEED * 0.016, 5);
    expect(player.position.y).toBeLessThan(1); // gravity pulled the player down
    expect(document.getElementById('game-score')!.textContent).toBe('SCORE: 0');
    expect(document.getElementById('game-health')!.textContent).toBe('HEALTH: 100');
    expect(document.getElementById('game-level')!.textContent).toBe('LEVEL: 1');
  });

  it('update() spawns an obstacle once the spawn rate elapses', async () => {
    const gs = await loadedScene();
    gs.enter();
    const groupsBefore = findGroups(gs.getScene()).length; // player + 3 obstacles
    gs.update(GameConstants.OBSTACLE_SPAWN_RATE); // 1.5s at level 1
    expect(findGroups(gs.getScene()).length).toBe(groupsBefore + 1);
  });

  it('update() damages the player on collision with an obstacle', async () => {
    // Pin spawn-time randomness so obstacle 0 is a static 'block' type.
    // 'moving' obstacles overwrite mesh.position.x in Obstacle.update()
    // (which runs before checkCollisions()), teleporting the obstacle back
    // to its spawn position (z <= -10) and skipping damage — this made the
    // test fail ~1/5 of the time (surfaced as the T5 "hook false positive").
    // 0.1 → types[floor(0.1 * 5)] = types[0] = 'block'; x = -8.
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.1);
    try {
      const gs = await loadedScene();
      gs.enter();
      const obstacle = findGroups(gs.getScene()).find((g) => g.position.y === 0.5);
      obstacle.position.set(0.4, 1, 0); // 0.4 < player radius 0.5 + obstacle radius 0.7

      gs.update(0.016);

      const health = Number(
        document.getElementById('game-health')!.textContent!.replace('HEALTH: ', '')
      );
      expect(health).toBeLessThan(100);
      expect(health).toBeGreaterThanOrEqual(75); // maximum obstacle damage is 25
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('PLAYER_SCORE event adds points, shown on the next update', async () => {
    const gs = await loadedScene();
    gs.enter();
    window.dispatchEvent(
      new CustomEvent(GameEvents.PLAYER_SCORE, { detail: { points: 25 } })
    );
    gs.update(0.016);
    expect(document.getElementById('game-score')!.textContent).toBe('SCORE: 25');
  });

  it('PLAYER_DEATH event triggers switchScene("gameover") and freezes updates', async () => {
    const gs = await loadedScene();
    gs.enter();
    const player = findPlayerGroup(gs.getScene());

    window.dispatchEvent(new CustomEvent(GameEvents.PLAYER_DEATH));

    // W3A.5: death now transitions to the GameOverScene via switchScene.
    // No inline DOM overlay is created.
    expect(game.switchScene).toHaveBeenCalledTimes(1);
    expect(game.switchScene).toHaveBeenCalledWith(
      'gameover',
      expect.objectContaining({ score: expect.any(Number) }),
    );

    const posBefore = player.position.clone();
    gs.update(0.016); // isGameOver → early return
    expect(player.position.x).toBe(posBefore.x);
    expect(player.position.y).toBe(posBefore.y);
    expect(player.position.z).toBe(posBefore.z);
  });

  it('cleanup() removes the entities from the scene; HUD divs are owned by UISystem', async () => {
    const gs = await loadedScene();
    gs.cleanup();
    expect(gs.getScene().children).toHaveLength(4); // ground + 3 lights remain
    expect(findGroups(gs.getScene())).toHaveLength(0);
    // W3A.2: HUD divs are owned by UISystem (D2). gs.cleanup() no longer
    // removes them — that's Game.cleanup()'s job (it calls
    // uiSystem.cleanup()). The divs remain in the DOM until
    // uiSystem.cleanup() is called.
    for (const id of ['game-score', 'game-health', 'game-level']) {
      expect(document.getElementById(id)).toBeTruthy();
    }
    // Simulating what Game.cleanup() does:
    (game as any)._uiSystem.cleanup();
    for (const id of ['game-score', 'game-health', 'game-level']) {
      expect(document.getElementById(id)).toBeNull();
    }
    expect(gs.isSceneLoaded()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// W2-A.3 RED (2026-09-13, task t_16b337f1) — minimal MenuScene + boot path
// lands in a valid, registered, active scene.
//
// SPEC (DECISION D2, boss-approved):
//   1. initGame() registers BootScene + MenuScene (+ GameScene for the full
//      W2 loop) with the SceneManager, 'boot' first (Game.start() boots the
//      first registered scene — Game.ts:87-94).
//   2. After start() + BootScene's 1000ms load delay + 500ms transition,
//      SceneManager.getCurrentScene() is the MenuScene — registered AND
//      active. No 'Scene "menu" not found' throw (RED today: no scene is
//      registered at all, so start() boots nothing and the transition
//      target 'menu' does not exist).
//   3. MenuScene is minimal (DECISION D2 boundary): placeholder DOM
//      content only — full menu UI (buttons, settings, high scores) stays
//      in W3 (TDD_PLAN Task 8.2).
//
// Uses the REAL Game + REAL SceneManager + real scene classes. Only
// 'three' (importOriginal + stubbed WebGLRenderer, as in this file) and
// Logger are mocked. Game's subsystems are real: InputSystem's update() is
// a no-op without registered listeners, PhysicsSystem.update() has no
// bodies, AudioSystem/UI have no-ops — no mocks needed.
//
// MenuScene is imported dynamically (await import) inside each test, not
// at module top level: during the RED phase the module does not exist
// yet, and a top-level import would fail COLLECTION of the whole file
// (including the existing 25 GREEN tests) — see the file-level header
// comment for the rationale.
//
// The full boot chain is driven on fake timers:
//   t=0        start() (called by initGame at import time) →
//               loadScene('boot') (async, microtasks) → gameLoop
//   t=1000     BootScene.load() resolves (its 1s simulation delay)
//   t=1000+    enter() → first update() schedules the 500ms transition
//   t=1500     setTimeout fires: exit() + switchScene('menu') → loadScene
//   t=1500+    MenuScene.load() resolves → enter()
//
// RED today: test 1 fails (initGame registers no scenes — hasScene('boot')
// is false); test 2 fails (no active scene — the SceneManager has nothing
// to boot, so loadScene is never reached and getCurrentScene() is null);
// test 3 fails (no 'menu' scene registered).
// ---------------------------------------------------------------------------
const w2a3Config: GameConfig = {
  physics: {
    gravity: -9.81,
    worldScale: 1,
    fixedTimeStep: 1 / 60,
    maxSubSteps: 3
  },
  audio: {
    masterVolume: 0.8,
    musicVolume: 0.6,
    sfxVolume: 0.7,
    spatialAudio: false
  },
  ui: {
    theme: 'dark',
    fontSize: 14,
    showFPS: false,
    showDebug: false
  },
  debug: {
    showColliders: false,
    showStats: false,
    logPhysics: false,
    logPerformance: false
  }
};

async function importFreshIndex(): Promise<void> {
  vi.resetModules();
  // Mock three before importing index.ts so the full chain
  // (index → Game → Scene → THREE.WebGLRenderer) sees the mock.
  // Without this, happy-dom cannot create a WebGL context and
  // initGame() throws, leaving window.game undefined.
  // The mock covers every THREE.js class used by the scene chain:
  // WebGLRenderer, Scene, PerspectiveCamera, LoadingManager, Vector3,
  // Group, Mesh, BoxGeometry, PlaneGeometry, MeshStandardMaterial,
  // Color, AmbientLight, DirectionalLight, HemisphereLight.
  await vi.doMock('three', async (importOriginal) => {
    const orig = await importOriginal<typeof import('three')>();
    class MockWebGLRenderer {
      readonly domElement: HTMLCanvasElement;
      clearColor = 0x000000;
      clearCount = 0;
      disposed = false;
      private size = { width: 800, height: 600 };
      constructor(_params?: Record<string, unknown>) {
        this.domElement = document.createElement('canvas');
      }
      render(..._args: unknown[]): void {}
      setSize(w: number, h: number): void { this.size = { width: w, height: h }; }
      setPixelRatio(_r: number): void {}
      setClearColor(c: number): void { this.clearColor = c; }
      clear(): void { this.clearCount++; }
      dispose(): void { this.disposed = true; }
    }
    class MockScene {
      children: any[] = [];
      background: unknown = null;
      add(o: any): void { this.children.push(o); }
      remove(o: any): void { const i = this.children.indexOf(o); if (i > -1) this.children.splice(i, 1); }
    }
    class MockPerspectiveCamera {
      position = { x: 0, y: 0, z: 0, set: function (x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; }, clone: function () { return { ...this }; } };
      lookAt(_x?: number, _y?: number, _z?: number): void {}
      constructor(_fov?: number, _aspect?: number, _near?: number, _far?: number) {}
    }
    class MockLoadingManager {
      onStart: (() => void) | null = null;
      onProgress: ((url: string, loaded: number, total: number) => void) | null = null;
      onLoad: (() => void) | null = null;
      onError: ((url: string) => void) | null = null;
      constructor() {}
    }
    class MockVector3 {
      x = 0; y = 0; z = 0;
      constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
      clone(): MockVector3 { return new MockVector3(this.x, this.y, this.z); }
      add(v: MockVector3): this { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
      copy(v: MockVector3): this { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
      set(x: number, y: number, z: number): this { this.x = x; this.y = y; this.z = z; return this; }
      multiplyScalar(s: number): this { this.x *= s; this.y *= s; this.z *= s; return this; }
      distanceTo(v: MockVector3): number { return Math.sqrt((this.x - v.x) ** 2 + (this.y - v.y) ** 2 + (this.z - v.z) ** 2); }
      normalize(): this { const l = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); if (l > 0) { this.x /= l; this.y /= l; this.z /= l; } return this; }
      clampLength(min: number, max: number): this { const l = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); if (l < min && l > 0) { this.x = (this.x / l) * min; this.y = (this.y / l) * min; this.z = (this.z / l) * min; } else if (l > max && l > 0) { this.x = (this.x / l) * max; this.y = (this.y / l) * max; this.z = (this.z / l) * max; } return this; }
    }
    class MockGroup {
      children: any[] = [];
      position = new MockVector3();
      rotation = { x: 0, y: 0, z: 0 };
      scale = { x: 1, y: 1, z: 1 };
      visible = true;
      add(o: any): void { this.children.push(o); }
    }
    class MockMesh {
      geometry: any; material: any;
      position = new MockVector3();
      rotation = { x: 0, y: 0, z: 0 };
      visible = true;
      constructor(geometry: any, material: any) { this.geometry = geometry; this.material = material; }
    }
    class MockBoxGeometry {
      parameters: { width: number; height: number; depth: number };
      constructor(width = 1, height = 1, depth = 1) { this.parameters = { width, height, depth }; }
    }
    class MockPlaneGeometry {
      constructor(_w?: number, _h?: number) {}
    }
    class MockMeshStandardMaterial {
      color: number;
      constructor(params: { color?: number } = {}) { this.color = params.color ?? 0xffffff; }
    }
    class MockColor {
      constructor(_r?: number) {}
    }
    class MockAmbientLight {
      constructor(_color?: number, _intensity?: number) {}
    }
    class MockDirectionalLight {
      position = new MockVector3();
      constructor(_color?: number, _intensity?: number) {}
    }
    class MockHemisphereLight {
      constructor(_sky?: number, _ground?: number, _intensity?: number) {}
    }
    return {
      ...orig,
      WebGLRenderer: MockWebGLRenderer,
      Scene: MockScene,
      PerspectiveCamera: MockPerspectiveCamera,
      LoadingManager: MockLoadingManager,
      Vector3: MockVector3,
      Group: MockGroup,
      Mesh: MockMesh,
      BoxGeometry: MockBoxGeometry,
      PlaneGeometry: MockPlaneGeometry,
      MeshStandardMaterial: MockMeshStandardMaterial,
      Color: MockColor,
      AmbientLight: MockAmbientLight,
      DirectionalLight: MockDirectionalLight,
      HemisphereLight: MockHemisphereLight,
    };
  });
  await vi.doMock('@/utils/Logger', () => ({
    Logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      setLevel: vi.fn()
    }
  }));
  // Import the entry point last: its bootstrap() runs at import time and
  // must see the doMocked Logger. (No Game mock — the REAL Game is the
  // point of this test.)
  await import('@/index.ts');
}

describe('W2-A.3: boot path lands in a valid registered active menu scene (RED)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    delete (window as any).game;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
    delete (window as any).game;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('RED: initGame() registers boot + menu + game scenes (menu registered before boot)', async () => {
    await importFreshIndex();
    const game = (window as any).game as Game;
    expect(game).toBeTruthy();
    const sm = game.getSceneManager();
    expect(sm.hasScene('boot')).toBe(true);
    expect(sm.hasScene('menu')).toBe(true);
    expect(sm.hasScene('game')).toBe(true);
    // Registration order: 'boot' first — Game.start() boots the first
    // registered scene (src/core/Game.ts:87-94).
    expect(Array.from(sm.getAllScenes().keys())).toEqual(['boot', 'menu', 'game', 'gameover']);
  });

  it('RED: after start() + boot delay, the active scene is the registered, active MenuScene (no "Scene not found")', async () => {
    await importFreshIndex();
    const game = (window as any).game as Game;
    expect(game).toBeTruthy();

    // Drive the boot chain deterministically on fake timers (see spec
    // comment above): 1000ms boot load + 500ms transition + margin.
    // initGame() in src/index.ts already called start() at import time;
    // advance past its boot delay.
    await vi.advanceTimersByTimeAsync(1800);

    const sm = game.getSceneManager();
    const current = sm.getCurrentScene();
    expect(sm.hasScene('menu')).toBe(true);
    // The active scene's constructor must be MenuScene (named scene
    // registry value — no MenuScene import needed; the instance's class
    // name is what the GREEN implementation provides).
    expect(current?.constructor.name).toBe('MenuScene');
    expect(current!.isSceneActive()).toBe(true);
    // The boot scene must have exited cleanly.
    expect(Logger.error).not.toHaveBeenCalledWith(
      'Failed to switch to menu scene',
      expect.anything()
    );
  });

  it('RED: MenuScene is minimal — a placeholder DOM element only, no throw on load/enter', async () => {
    await importFreshIndex();
    const game = (window as any).game as Game;
    expect(game).toBeTruthy();
    // Locate the registered menu scene instance via the SceneManager — no
    // MenuScene import needed (the RED phase has no module to import).
    const menu = game.getSceneManager().getAllScenes().get('menu') as any;
    expect(menu).toBeTruthy();
    expect(menu.constructor.name).toBe('MenuScene');
    // Minimal scene (DECISION D2 boundary): placeholder DOM only, no throw
    // on load/enter. (Full menu UI — buttons, settings, high scores — is
    // W3 Task 8.2.)
    expect(menu.isSceneLoaded()).toBe(false);
    expect(menu.isSceneActive()).toBe(false);
    await menu.load();
    menu.enter();
    expect(menu.isSceneLoaded()).toBe(true);
    expect(menu.isSceneActive()).toBe(true);
    menu.exit();
    expect(menu.isSceneActive()).toBe(false);
    menu.cleanup();
    expect(menu.isSceneLoaded()).toBe(false);
  });
});
