import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Game } from '@/core/Game';
import { SceneManager } from '@/core/SceneManager';
import { InputSystem } from '@/systems/Input';
import { PhysicsSystem } from '@/systems/Physics';
import { AudioSystem } from '@/systems/Audio';
import { UISystem } from '@/systems/UI';
import type { GameConfig } from '@/types/GameTypes';

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

vi.mock('@/core/SceneManager', () => ({
  SceneManager: vi.fn().mockImplementation(sceneManagerImpl)
}));

describe('Game Class - Retroactive Tests', () => {
  let game: Game;
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

  beforeEach(() => {
    // vi.resetAllMocks() (config `mockReset: true`) has already run before
    // this hook — re-apply the factory implementations, then construct.
    vi.clearAllMocks();
    (SceneManager as any).mockImplementation(sceneManagerImpl);
    (InputSystem as any).mockImplementation(inputImpl);
    (PhysicsSystem as any).mockImplementation(physicsImpl);
    (AudioSystem as any).mockImplementation(audioImpl);
    (UISystem as any).mockImplementation(uiImpl);
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
      await expect(switchPromise).resolves.toBeUndefined();
    });

    it('should pass data to scene when switching', async () => {
      const testData = { level: 5, score: 100 };
      const switchPromise = game.switchScene('gameScene', testData);
      await expect(switchPromise).resolves.toBeUndefined();
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
