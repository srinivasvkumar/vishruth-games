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
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { Scene } from '@/scenes/Scene';
import { BootScene } from '@/scenes/BootScene';
import { GameScene } from '@/scenes/GameScene';
import { GameConstants, GameEvents } from '@/utils/Constants';
import { Logger } from '@/utils/Logger';

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
function createMockGame() {
  const inputState = { keys: {} as Record<string, boolean> };
  return {
    _inputState: inputState,
    getInputSystem: vi.fn(() => ({ getInputState: () => inputState })),
    switchScene: vi.fn().mockResolvedValue(undefined),
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
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  async function loadedScene(): Promise<GameScene> {
    const gs = new GameScene(game);
    await gs.load();
    return gs;
  }

  it('constructor creates the hidden HUD elements and a camera at (0, 5, 15)', () => {
    const gs = new GameScene(game);
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

  it('PLAYER_DEATH event shows the game-over screen and freezes updates', async () => {
    const gs = await loadedScene();
    gs.enter();
    const player = findPlayerGroup(gs.getScene());

    window.dispatchEvent(new CustomEvent(GameEvents.PLAYER_DEATH));

    expect(document.querySelector('h1')?.textContent).toBe('GAME OVER');
    expect(document.body.innerHTML).toContain('PLAY AGAIN');

    const posBefore = player.position.clone();
    gs.update(0.016); // isGameOver → early return
    expect(player.position.x).toBe(posBefore.x);
    expect(player.position.y).toBe(posBefore.y);
    expect(player.position.z).toBe(posBefore.z);
  });

  it('cleanup() removes the entities and the HUD from the scene', async () => {
    const gs = await loadedScene();
    gs.cleanup();
    expect(gs.getScene().children).toHaveLength(4); // ground + 3 lights remain
    expect(findGroups(gs.getScene())).toHaveLength(0);
    for (const id of ['game-score', 'game-health', 'game-level']) {
      expect(document.getElementById(id)).toBeNull();
    }
    expect(gs.isSceneLoaded()).toBe(false);
  });
});
