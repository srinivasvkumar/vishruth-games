import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Game } from '@/core/Game';
import { SceneManager } from '@/core/SceneManager';
import { InputSystem } from '@/systems/Input';
import { PhysicsSystem } from '@/systems/Physics';
import { AudioSystem } from '@/systems/Audio';
import { UISystem } from '@/systems/UI';
import { Renderer } from '@/core/Renderer';
import { AssetLoader } from '@/utils/AssetLoader';
import type { GameConfig } from '@/types/GameTypes';
import { Scene } from '@/scenes/Scene';

// ============================================================================
// T0.2.2 G1 alignment (2026-09-11) — tests verify the CURRENT Game.ts public
// API (RED baseline HEAD 4edf450): constructor(GameConfig) + start/pause/
// resume/stop/switchScene + system getters + isGameRunning.
//
// 1. Mock implementations are `this`-style functions: `new Mock()` flows
//    through tinyspy's Reflect.construct path, so the constructed instance
//    keeps the mocked constructor's prototype — required by the
//    toBeInstanceOf assertions. (An arrow factory returning an object
//    literal makes that object the constructor result, breaking instanceof.)
// 2. The vitest config sets `mockReset: true`, so `vi.resetAllMocks()` runs
//    before EVERY test (runner onBeforeRunTask, vitest/dist/runners.js) and
//    wipes every mockImplementation set in the vi.mock factories below.
//    beforeEach therefore re-applies the shapes after that reset, before
//    `new Game(mockConfig)`.
// 3. mockConfig is a complete GameConfig (constructor contract at HEAD
//    4edf450: physics + audio + ui + debug — all required).
// 4. Event assertions are synchronous: Game.emit() dispatches the CustomEvent
//    on window synchronously (src/core/Game.ts:122-125). The pre-alignment
//    setTimeout(..., 10) wrappers asserted nothing at test-completion time.
// 5. Audio/UI mock shapes assert ONLY the T0.2.2 stub surface
//    (Audio: cleanup; UI: update + cleanup — src/systems/{Audio,UI}.ts).
//    Real system behavior is verified by Week 1 feature tests.
// 6. W2-A.2 (2026-09-13, task t_f1aa3f33): SceneManager and Scene are no
//    longer mocked — the W2-A.2 describe exercises the real
//    registerScene / loadScene / render path. 'three' resolves to
//    tests/setup/mock-three.ts in this file via a per-file vi.mock alias
//    registered at the bottom of this file, so the real Scene constructor's
//    `new THREE.WebGLRenderer()` cannot throw in happy-dom.
// ============================================================================

// Mock implementation shapes (`this`-style; see header notes 1 and 2)
function sceneManagerImpl(this: any) {
  this.loadScene = vi.fn().mockResolvedValue(undefined);
  this.update = vi.fn();
  this.cleanup = vi.fn();
}

function inputImpl(this: any) {
  this.update = vi.fn();
  this.setupEventListeners = vi.fn();
}

function physicsImpl(this: any) {
  this.update = vi.fn();
  this.cleanup = vi.fn();
}

function audioImpl(this: any) {
  this.cleanup = vi.fn();
}

function uiImpl(this: any) {
  this.update = vi.fn();
  this.cleanup = vi.fn();
}

// W2-A.2 mock Scene: `this`-style ctor (header note 1) so `new Scene(game)`
// keeps a usable instance. Records construction args so tests can assert the
// shared renderer was passed, and records lifecycle state so boot assertions
// (load/enter/render counts, active flag) work.
function mockSceneImpl(this: any, ...args: unknown[]) {
  this.constructorArgs = args;
  this.scene = { name: 'mock-scene' };
  this.camera = { fov: 75 };
  this.loaded = false;
  this.active = false;
  this.loadCalls = 0;
  this.enterCalls = 0;
  this.renderCalls = 0;
  this.load = vi.fn(async () => {
    this.loadCalls++;
    this.loaded = true;
  });
  this.enter = vi.fn(() => {
    this.enterCalls++;
    this.active = true;
  });
  this.update = vi.fn();
  this.exit = vi.fn(() => {
    this.active = false;
  });
  this.cleanup = vi.fn(() => {
    this.active = false;
    this.loaded = false;
  });
  this.render = vi.fn(() => {
    this.renderCalls++;
  });
}

// Mock dependencies
vi.mock('@/utils/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

vi.mock('@/systems/Input', () => ({
  InputSystem: vi.fn().mockImplementation(inputImpl)
}));

vi.mock('@/systems/Physics', () => ({
  PhysicsSystem: vi.fn().mockImplementation(physicsImpl)
}));

vi.mock('@/systems/Audio', () => ({
  AudioSystem: vi.fn().mockImplementation(audioImpl)
}));

vi.mock('@/systems/UI', () => ({
  UISystem: vi.fn().mockImplementation(uiImpl)
}));

// W2-A.2: real SceneManager is used (registerScene / loadScene / render are
// the code paths under test) — do NOT mock it.
vi.mock('@/core/Renderer', () => ({
  Renderer: vi.fn()
}));

vi.mock('@/utils/AssetLoader', () => ({
  AssetLoader: {
    load: vi.fn().mockResolvedValue(undefined),
    preload: vi.fn().mockResolvedValue(undefined),
    clearCache: vi.fn(),
    getCacheStats: vi.fn()
  }
}));

// W2-A.2: mock the Scene base class so the boot tests control scene
// lifecycle (load/enter/active) without a concrete subclass.
vi.mock('@/scenes/Scene', () => ({
  Scene: vi.fn().mockImplementation(mockSceneImpl)
}));

// W2-A.2: alias 'three' to the mock-three stub for this file. Without this
// the real Scene.ts (imported by the real SceneManager) would run
// `new THREE.WebGLRenderer()` against real three in happy-dom, which throws
// "Error creating WebGL context" (see scenes.test.ts G6 probe notes).
vi.mock('three', () => import('../setup/mock-three'));

// W2-A.2: re-apply mock shapes after `mockReset: true` wipes them.
// The vi.mock factories above set implementations once at module-load time;
// every subsequent test runs `vi.resetAllMocks()` first (config), which
// clears mockImplementation / mockResolvedValue. beforeEach restores them.
//
// Renderer mock: a minimal instance shape with all methods the Game
// constructor / cleanup path can call. The W2-A.2 describe block overrides
// this with its own instance in its local beforeEach so it can assert
// getRenderer() identity.
let _rendererMockInstance: Record<string, any> | null = null;
function getRendererMockInstance(): Record<string, any> {
  if (!_rendererMockInstance) {
    _rendererMockInstance = {
      dispose: vi.fn(),
      domElement: document.createElement('canvas'),
      setSize: vi.fn(),
      setClearColor: vi.fn(),
      clear: vi.fn(),
      render: vi.fn(),
      resize: vi.fn(),
      resizeToContainer: vi.fn(),
      getRenderer: vi.fn(),
      get width() { return 800; },
      get height() { return 600; }
    };
  }
  return _rendererMockInstance;
}

function reapplyMockShapes() {
  (InputSystem as any).mockImplementation(inputImpl);
  (PhysicsSystem as any).mockImplementation(physicsImpl);
  (AudioSystem as any).mockImplementation(audioImpl);
  (UISystem as any).mockImplementation(uiImpl);
  (AssetLoader.load as any).mockResolvedValue(undefined);
  (AssetLoader.preload as any).mockResolvedValue(undefined);
  (Scene as any).mockClear();
  (Scene as any).mockImplementation(mockSceneImpl);
  (Renderer as any).mockImplementation(() => getRendererMockInstance());
}

const mockConfig: GameConfig = {
  physics: {
    gravity: -9.81,
    worldScale: 1,
    fixedTimeStep: 1 / 60,
    maxSubSteps: 5
  },
  audio: {
    masterVolume: 1.0,
    musicVolume: 0.8,
    sfxVolume: 0.9,
    spatialAudio: false
  },
  ui: {
    theme: 'dark',
    fontSize: 16,
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

describe('Game Class - Retroactive Tests', () => {
  let game: Game;

  beforeEach(() => {
    // vi.resetAllMocks() (config `mockReset: true`) has already run before
    // this hook — re-apply the factory implementations, then construct.
    vi.clearAllMocks();
    reapplyMockShapes();
    game = new Game(mockConfig);
  });

  afterEach(() => {
    if (game.isGameRunning()) {
      game.stop();
    }
  });

  describe('Initialization', () => {
    it('should create Game instance with correct config', () => {
      expect(game).toBeDefined();
      expect(game.isGameRunning()).toBe(false);
    });

    it('should initialize all systems', () => {
      expect(game.getSceneManager()).toBeInstanceOf(SceneManager);
      expect(game.getInputSystem()).toBeInstanceOf(InputSystem);
      expect(game.getPhysicsSystem()).toBeInstanceOf(PhysicsSystem);
      expect(game.getAudioSystem()).toBeInstanceOf(AudioSystem);
      expect(game.getUISystem()).toBeInstanceOf(UISystem);
    });

    it('should start in stopped state', () => {
      expect(game.isGameRunning()).toBe(false);
    });
  });

  describe('Game Lifecycle', () => {
    it('should start the game', () => {
      game.start();
      expect(game.isGameRunning()).toBe(true);
    });

    it('should not start if already running', () => {
      game.start();
      const initialRunning = game.isGameRunning();
      game.start(); // Second call
      expect(game.isGameRunning()).toBe(initialRunning);
    });

    it('should pause the game', () => {
      game.start();
      game.pause();
      expect(game.isGameRunning()).toBe(false);
    });

    it('should resume the game', () => {
      game.start();
      game.pause();
      game.resume();
      expect(game.isGameRunning()).toBe(true);
    });

    it('should stop the game', () => {
      game.start();
      game.stop();
      expect(game.isGameRunning()).toBe(false);
    });

    it('should handle multiple stop calls gracefully', () => {
      game.stop();
      game.stop(); // Should not error
      expect(game.isGameRunning()).toBe(false);
    });
  });

  describe('Scene Management', () => {
    it('should switch scenes', async () => {
      const switchPromise = game.switchScene('gameScene', { level: 1 });
      await expect(switchPromise).rejects.toThrow('Scene "gameScene" not found');
    });

    it('should pass data to scene when switching', async () => {
      const testData = { level: 5, score: 100 };
      const switchPromise = game.switchScene('gameScene', testData);
      await expect(switchPromise).rejects.toThrow('Scene "gameScene" not found');
    });
  });

  describe('Event System', () => {
    it('should emit game:start event', () => {
      const handler = vi.fn();
      window.addEventListener('game:start', handler);

      game.start();

      // Game.emit() dispatches synchronously (src/core/Game.ts:122-125)
      expect(handler).toHaveBeenCalled();
    });

    it('should emit game:pause event', () => {
      const handler = vi.fn();
      window.addEventListener('game:pause', handler);

      game.start();
      game.pause();

      expect(handler).toHaveBeenCalled();
    });

    it('should emit game:resume event', () => {
      const handler = vi.fn();
      window.addEventListener('game:resume', handler);

      game.start();
      game.pause();
      game.resume();

      expect(handler).toHaveBeenCalled();
    });

    it('should emit game:stop event', () => {
      const handler = vi.fn();
      window.addEventListener('game:stop', handler);

      game.start();
      game.stop();

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Getters', () => {
    it('should provide access to all systems', () => {
      expect(game.getSceneManager()).toBeDefined();
      expect(game.getInputSystem()).toBeDefined();
      expect(game.getPhysicsSystem()).toBeDefined();
      expect(game.getAudioSystem()).toBeDefined();
      expect(game.getUISystem()).toBeDefined();
    });

    it('should report correct running state', () => {
      expect(game.isGameRunning()).toBe(false);
      game.start();
      expect(game.isGameRunning()).toBe(true);
      game.stop();
      expect(game.isGameRunning()).toBe(false);
    });
  });
});

// ============================================================================
// W2-A.2 RED (2026-09-13) — shared renderer + boot path in Game.
//
// Spec (task t_f1aa3f33):
//   1. Game exposes the shared Renderer created by initGame() on
//      #game-canvas (W2-A.1 foundation) via getRenderer() / constructor
//      option, instead of each Scene building its own detached
//      WebGLRenderer (Scene.ts:20 pre-change).
//   2. start() boots a registered scene: after start() the SceneManager's
//      current scene is registered AND active.
//   3. gameLoop() calls sceneManager.render() at the end of every frame.
//   4. DECISION D1: a minimal AssetLoader.load() hook is wired into the
//      boot path (W3 builds on it).
//
// RED today (pre-change) — all four fail:
//   - no getRenderer() / no constructor renderer option → tests 1 and 4
//     (the AssetLoader hook lives on the same boot path; asserted together).
//   - start() never loads a scene → SceneManager.getCurrentScene() is null.
//   - gameLoop() never calls sceneManager.render() → render spy count 0.
//
// Notes:
// 1. requestAnimationFrame is stubbed per-test to a no-op so the loop does
//    not recurse after the first frame.
// 2. start() boots via `void loadScene(...)`: loadScene is async, so a
//    `setTimeout(0)` tick lets the current scene become active before
//    assertions.
// 3. 'three' is alioted to mock-three.ts at the top of this file, so the
//    real Scene.ts constructor (pulled in by the real SceneManager) cannot
//    throw in happy-dom.
// ============================================================================
describe('W2-A.2: shared renderer + boot path (RED)', () => {
  let game: Game;
  let mockRenderer: Record<string, any>;
  let rafSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    reapplyMockShapes();
    mockRenderer = {
      dispose: vi.fn(),
      domElement: document.createElement('canvas'),
      setSize: vi.fn(),
      setClearColor: vi.fn(),
      clear: vi.fn(),
      render: vi.fn(),
      resize: vi.fn(),
      resizeToContainer: vi.fn(),
      getRenderer: vi.fn()
    };
    (Renderer as any).mockImplementation(() => mockRenderer);
    rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);
  });

  afterEach(() => {
    rafSpy.mockRestore();
    if (game && game.isGameRunning()) {
      game.stop();
    }
  });

  it('RED: Game constructor accepts a shared renderer and exposes it', () => {
    const g = new Game(mockConfig, { renderer: mockRenderer });
    expect(g.getRenderer()).toBe(mockRenderer);
  });

  it('RED: start() registers a scene and boots it (active after start)', async () => {
    game = new Game(mockConfig, { renderer: mockRenderer });
    const scene = new (Scene as any)(game) as Scene;
    game.getSceneManager().registerScene('boot', scene);
    game.start();
    await new Promise((r) => setTimeout(r, 0));
    expect(game.getSceneManager().getCurrentScene()).toBe(scene);
    expect((scene as any).active).toBe(true);
  });

  it('RED: gameLoop calls sceneManager.render() at the end of every frame', async () => {
    game = new Game(mockConfig, { renderer: mockRenderer });
    const renderSpy = vi.spyOn(game.getSceneManager(), 'render');
    const scene = new (Scene as any)(game) as Scene;
    game.getSceneManager().registerScene('boot', scene);
    game.start();
    await new Promise((r) => setTimeout(r, 0));
    // First gameLoop iteration (synchronous inside start()) must call render.
    expect(renderSpy).toHaveBeenCalledTimes(1);
    // Second frame: drive one more rAF callback manually.
    const frameCallback = rafSpy.mock.calls[0]?.[0];
    if (typeof frameCallback === 'function') {
      frameCallback(performance.now());
    }
    expect(renderSpy).toHaveBeenCalledTimes(2);
  });

  it('RED: start() wires the AssetLoader.load() hook into the boot path', async () => {
    const loadSpy = vi.mocked(AssetLoader.load).mockClear();
    game = new Game(mockConfig, { renderer: mockRenderer });
    const scene = new (Scene as any)(game) as Scene;
    game.getSceneManager().registerScene('boot', scene);
    game.start();
    await new Promise((r) => setTimeout(r, 0));
    expect(loadSpy).toHaveBeenCalled();
  });
});
