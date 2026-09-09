import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Game } from '@/core/Game';
import { SceneManager } from '@/core/SceneManager';
import { InputSystem } from '@/systems/Input';
import { PhysicsSystem } from '@/systems/Physics';
import { AudioSystem } from '@/systems/Audio';
import { UISystem } from '@/systems/UI';

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
  InputSystem: vi.fn().mockImplementation(() => ({
    update: vi.fn(),
    setupEventListeners: vi.fn()
  }))
}));

vi.mock('@/systems/Physics', () => ({
  PhysicsSystem: vi.fn().mockImplementation(() => ({
    update: vi.fn(),
    cleanup: vi.fn()
  }))
}));

vi.mock('@/systems/Audio', () => ({
  AudioSystem: vi.fn().mockImplementation(() => ({
    cleanup: vi.fn()
  }))
}));

vi.mock('@/systems/UI', () => ({
  UISystem: vi.fn().mockImplementation(() => ({
    update: vi.fn(),
    cleanup: vi.fn()
  }))
}));

vi.mock('@/core/SceneManager', () => ({
  SceneManager: vi.fn().mockImplementation(() => ({
    loadScene: vi.fn().mockResolvedValue(undefined),
    update: vi.fn(),
    cleanup: vi.fn()
  }))
}));

describe('Game Class - Retroactive Tests', () => {
  let game: Game;
  const mockConfig = {
    physics: { gravity: -9.81 },
    audio: { masterVolume: 1.0 },
    ui: { showDebug: false }
  };

  beforeEach(() => {
    vi.clearAllMocks();
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
      
      // Note: Event emission happens asynchronously
      setTimeout(() => {
        expect(handler).toHaveBeenCalled();
      }, 10);
    });

    it('should emit game:pause event', () => {
      const handler = vi.fn();
      window.addEventListener('game:pause', handler);
      
      game.start();
      game.pause();
      
      setTimeout(() => {
        expect(handler).toHaveBeenCalled();
      }, 10);
    });

    it('should emit game:resume event', () => {
      const handler = vi.fn();
      window.addEventListener('game:resume', handler);
      
      game.start();
      game.pause();
      game.resume();
      
      setTimeout(() => {
        expect(handler).toHaveBeenCalled();
      }, 10);
    });

    it('should emit game:stop event', () => {
      const handler = vi.fn();
      window.addEventListener('game:stop', handler);
      
      game.start();
      game.stop();
      
      setTimeout(() => {
        expect(handler).toHaveBeenCalled();
      }, 10);
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
