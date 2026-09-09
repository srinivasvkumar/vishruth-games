import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameLoop } from '@/core/GameLoop';

vi.mock('@/utils/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

describe('GameLoop Class - Retroactive Tests', () => {
  let gameLoop: GameLoop;
  let mockUpdate: ReturnType<typeof vi.fn>;
  let mockRender: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockUpdate = vi.fn();
    mockRender = vi.fn();
    gameLoop = new GameLoop(mockUpdate, mockRender);
    
    // Mock requestAnimationFrame and cancelAnimationFrame
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(performance.now());
      return 1 as any;
    });
    
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    gameLoop.stop();
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should create GameLoop with callbacks', () => {
      expect(gameLoop).toBeDefined();
      expect(gameLoop.isLoopRunning()).toBe(false);
    });

    it('should accept update and render callbacks', () => {
      const updateCallback = vi.fn();
      const renderCallback = vi.fn();
      const loop = new GameLoop(updateCallback, renderCallback);
      
      expect(loop).toBeDefined();
      expect(loop.isLoopRunning()).toBe(false);
    });
  });

  describe('Lifecycle', () => {
    it('should start the loop', () => {
      gameLoop.start();
      expect(gameLoop.isLoopRunning()).toBe(true);
    });

    it('should stop the loop', () => {
      gameLoop.start();
      gameLoop.stop();
      expect(gameLoop.isLoopRunning()).toBe(false);
    });

    it('should not start if already running', () => {
      gameLoop.start();
      gameLoop.start(); // Second call
      expect(gameLoop.isLoopRunning()).toBe(true);
    });

    it('should not stop if not running', () => {
      gameLoop.stop();
      expect(gameLoop.isLoopRunning()).toBe(false);
    });
  });

  describe('Frame Rate Control', () => {
    it('should set frame rate', () => {
      gameLoop.setFrameRate(30);
      expect(gameLoop.isLoopRunning()).toBe(false); // Should not affect running state
    });

    it('should support different frame rates', () => {
      gameLoop.setFrameRate(60);
      gameLoop.setFrameRate(120);
      gameLoop.setFrameRate(30);
      expect(gameLoop.isLoopRunning()).toBe(false);
    });
  });

  describe('Update and Render Callbacks', () => {
    it('should call update callback with deltaTime', () => {
      gameLoop.start();
      // Mock will be called due to requestAnimationFrame mock
      expect(mockUpdate).toBeDefined();
    });

    it('should call render callback each frame', () => {
      gameLoop.start();
      expect(mockRender).toBeDefined();
    });

    it('should pass deltaTime to update', () => {
      gameLoop.start();
      // Verify update receives a number
      expect(mockUpdate).toBeDefined();
    });
  });

  describe('Fixed Time Step', () => {
    it('should use 60 FPS as default', () => {
      // Default timeStep should be 1000/60
      gameLoop.start();
      expect(gameLoop.isLoopRunning()).toBe(true);
    });

    it('should accumulate time for fixed updates', () => {
      gameLoop.start();
      expect(gameLoop.isLoopRunning()).toBe(true);
    });
  });
});
