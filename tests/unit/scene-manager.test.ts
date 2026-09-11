import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SceneManager } from '@/core/SceneManager';
import { Scene } from '@/scenes/Scene';
import { Game } from '@/core/Game';
import { GameEvents } from '@/utils/Constants';

vi.mock('@/utils/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

/**
 * D0.2 G4 alignment notes (see tests/evidence/d02/T2-red-analysis.md §3.1/§3.2):
 * - The old `global.CustomEvent = vi.fn().mockImplementation(() => ({}))` mock broke
 *   SceneManager.emit(): happy-dom's window.dispatchEvent() rejects the plain object
 *   the mock returned ("parameter 1 is not of type 'Event'"). The mock is removed —
 *   happy-dom's real CustomEvent is used, and emitted events are observed through a
 *   window listener (listener-call outcome / observable state) instead of asserting
 *   on dispatchEvent side effects.
 * - loadScene() is async: currentScene is only set after `await scene.load()`, so
 *   update()/render() tests must await loadScene() first (the previous fire-and-forget
 *   calls also produced the 2 unhandled rejections in the T2 evidence).
 */
describe('SceneManager Class - Retroactive Tests', () => {
  let sceneManager: SceneManager;
  let mockGame: any;

  beforeEach(() => {
    mockGame = {
      emit: vi.fn()
    };
    sceneManager = new SceneManager(mockGame);
  });

  afterEach(() => {
    sceneManager.cleanup();
  });

  describe('Initialization', () => {
    it('should create SceneManager with game reference', () => {
      expect(sceneManager).toBeDefined();
    });

    it('should start with no current scene', () => {
      expect(sceneManager.getCurrentScene()).toBeNull();
    });

    it('should start with no previous scene', () => {
      expect(sceneManager.getPreviousScene()).toBeNull();
    });
  });

  describe('Scene Registration', () => {
    it('should register a scene', () => {
      const mockScene = {
        load: vi.fn().mockResolvedValue(undefined),
        enter: vi.fn(),
        exit: vi.fn(),
        update: vi.fn(),
        render: vi.fn(),
        cleanup: vi.fn()
      };
      
      sceneManager.registerScene('testScene', mockScene as any);
      expect(sceneManager.hasScene('testScene')).toBe(true);
    });

    it('should register multiple scenes', () => {
      const scene1 = { load: vi.fn(), enter: vi.fn(), exit: vi.fn(), update: vi.fn(), render: vi.fn(), cleanup: vi.fn() };
      const scene2 = { load: vi.fn(), enter: vi.fn(), exit: vi.fn(), update: vi.fn(), render: vi.fn(), cleanup: vi.fn() };
      
      sceneManager.registerScene('scene1', scene1 as any);
      sceneManager.registerScene('scene2', scene2 as any);
      
      expect(sceneManager.hasScene('scene1')).toBe(true);
      expect(sceneManager.hasScene('scene2')).toBe(true);
    });

    it('should return false for unregistered scene', () => {
      expect(sceneManager.hasScene('nonExistent')).toBe(false);
    });
  });

  describe('Scene Loading', () => {
    // Observes the LEVEL_START event SceneManager.emit() dispatches on window —
    // the observable outcome of emission, not the dispatchEvent call itself.
    let levelStartEvents: CustomEvent[];
    const onLevelStart = (e: Event) => {
      levelStartEvents.push(e as CustomEvent);
    };

    beforeEach(() => {
      levelStartEvents = [];
      window.addEventListener(GameEvents.LEVEL_START, onLevelStart);
    });

    afterEach(() => {
      window.removeEventListener(GameEvents.LEVEL_START, onLevelStart);
    });

    it('should load a registered scene', async () => {
      const mockScene = {
        load: vi.fn().mockResolvedValue(undefined),
        enter: vi.fn(),
        exit: vi.fn(),
        update: vi.fn(),
        render: vi.fn(),
        cleanup: vi.fn()
      };
      
      sceneManager.registerScene('testScene', mockScene as any);
      await sceneManager.loadScene('testScene');
      
      expect(mockScene.load).toHaveBeenCalled();
      expect(mockScene.enter).toHaveBeenCalled();
      expect(sceneManager.getCurrentScene()).toBe(mockScene);
    });

    it('should emit LEVEL_START on window with scene name and data', async () => {
      const mockScene = {
        load: vi.fn().mockResolvedValue(undefined),
        enter: vi.fn(),
        exit: vi.fn(),
        update: vi.fn(),
        render: vi.fn(),
        cleanup: vi.fn()
      };
      
      sceneManager.registerScene('testScene', mockScene as any);
      await sceneManager.loadScene('testScene', { level: 1 });

      // Implemented wiring: load() takes no arguments; the data is delivered through
      // the LEVEL_START event detail.
      expect(mockScene.load).toHaveBeenCalledTimes(1);
      expect(mockScene.load).toHaveBeenCalledWith();
      expect(levelStartEvents).toHaveLength(1);
      expect(levelStartEvents[0].type).toBe(GameEvents.LEVEL_START);
      expect(levelStartEvents[0].detail).toEqual({ name: 'testScene', data: { level: 1 } });
    });

    it('should throw error for non-existent scene', async () => {
      await expect(sceneManager.loadScene('nonExistent')).rejects.toThrow('Scene "nonExistent" not found');
      expect(levelStartEvents).toHaveLength(0);
    });

    it('should exit current scene before loading new one', async () => {
      const calls: string[] = [];
      const scene1 = {
        load: vi.fn().mockResolvedValue(undefined),
        enter: vi.fn(),
        exit: vi.fn(() => { calls.push('scene1.exit'); }),
        update: vi.fn(),
        render: vi.fn(),
        cleanup: vi.fn()
      };
      const scene2 = {
        load: vi.fn().mockImplementation(async () => { calls.push('scene2.load'); }),
        enter: vi.fn(() => { calls.push('scene2.enter'); }),
        exit: vi.fn(),
        update: vi.fn(),
        render: vi.fn(),
        cleanup: vi.fn()
      };
      
      sceneManager.registerScene('scene1', scene1 as any);
      sceneManager.registerScene('scene2', scene2 as any);
      
      await sceneManager.loadScene('scene1');
      await sceneManager.loadScene('scene2');
      
      // Implemented order: exit current scene, then load, then enter the new one.
      expect(calls).toEqual(['scene1.exit', 'scene2.load', 'scene2.enter']);
      expect(scene1.exit).toHaveBeenCalledTimes(1);
      expect(scene2.enter).toHaveBeenCalledTimes(1);
      expect(sceneManager.getCurrentScene()).toBe(scene2);
    });

    it('should set previous scene when loading new scene', async () => {
      const scene1 = {
        load: vi.fn().mockResolvedValue(undefined),
        enter: vi.fn(),
        exit: vi.fn(),
        update: vi.fn(),
        render: vi.fn(),
        cleanup: vi.fn()
      };
      const scene2 = {
        load: vi.fn().mockResolvedValue(undefined),
        enter: vi.fn(),
        exit: vi.fn(),
        update: vi.fn(),
        render: vi.fn(),
        cleanup: vi.fn()
      };
      
      sceneManager.registerScene('scene1', scene1 as any);
      sceneManager.registerScene('scene2', scene2 as any);
      
      await sceneManager.loadScene('scene1');
      await sceneManager.loadScene('scene2');
      
      expect(sceneManager.getPreviousScene()).toBe(scene1);
    });
  });

  describe('Scene Unregistration', () => {
    it('should unregister a scene', () => {
      const mockScene = {
        load: vi.fn(),
        enter: vi.fn(),
        exit: vi.fn(),
        update: vi.fn(),
        render: vi.fn(),
        cleanup: vi.fn()
      };
      
      sceneManager.registerScene('testScene', mockScene as any);
      sceneManager.unregisterScene('testScene');
      
      expect(sceneManager.hasScene('testScene')).toBe(false);
    });

    it('should cleanup scene when unregistering', () => {
      const mockCleanup = vi.fn();
      const mockScene = {
        load: vi.fn(),
        enter: vi.fn(),
        exit: vi.fn(),
        update: vi.fn(),
        render: vi.fn(),
        cleanup: mockCleanup
      };
      
      sceneManager.registerScene('testScene', mockScene as any);
      sceneManager.unregisterScene('testScene');
      
      expect(mockCleanup).toHaveBeenCalled();
    });
  });

  describe('Scene Updates', () => {
    it('should update current scene', async () => {
      const mockUpdate = vi.fn();
      const mockScene = {
        load: vi.fn().mockResolvedValue(undefined),
        enter: vi.fn(),
        exit: vi.fn(),
        update: mockUpdate,
        render: vi.fn(),
        cleanup: vi.fn()
      };
      
      sceneManager.registerScene('testScene', mockScene as any);
      await sceneManager.loadScene('testScene');
      sceneManager.update(0.016);
      
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockUpdate).toHaveBeenCalledWith(0.016);
    });

    it('should not update if no current scene', () => {
      expect(() => sceneManager.update(0.016)).not.toThrow();
    });
  });

  describe('Scene Rendering', () => {
    it('should render current scene', async () => {
      const mockRender = vi.fn();
      const mockScene = {
        load: vi.fn().mockResolvedValue(undefined),
        enter: vi.fn(),
        exit: vi.fn(),
        update: vi.fn(),
        render: mockRender,
        cleanup: vi.fn()
      };
      
      sceneManager.registerScene('testScene', mockScene as any);
      await sceneManager.loadScene('testScene');
      sceneManager.render();
      
      expect(mockRender).toHaveBeenCalledTimes(1);
    });

    it('should not render if no current scene', () => {
      expect(() => sceneManager.render()).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup all scenes', () => {
      const mockCleanup = vi.fn();
      const mockScene = {
        load: vi.fn(),
        enter: vi.fn(),
        exit: vi.fn(),
        update: vi.fn(),
        render: vi.fn(),
        cleanup: mockCleanup
      };
      
      sceneManager.registerScene('testScene', mockScene as any);
      sceneManager.cleanup();
      
      expect(mockCleanup).toHaveBeenCalled();
    });

    it('should clear all scene references after cleanup', () => {
      const mockScene = {
        load: vi.fn(),
        enter: vi.fn(),
        exit: vi.fn(),
        update: vi.fn(),
        render: vi.fn(),
        cleanup: vi.fn()
      };
      
      sceneManager.registerScene('testScene', mockScene as any);
      sceneManager.cleanup();
      
      expect(sceneManager.getCurrentScene()).toBeNull();
      expect(sceneManager.getPreviousScene()).toBeNull();
      expect(sceneManager.hasScene('testScene')).toBe(false);
    });
  });

  describe('Getters', () => {
    it('should get all registered scenes', () => {
      const scene1 = { load: vi.fn(), enter: vi.fn(), exit: vi.fn(), update: vi.fn(), render: vi.fn(), cleanup: vi.fn() };
      const scene2 = { load: vi.fn(), enter: vi.fn(), exit: vi.fn(), update: vi.fn(), render: vi.fn(), cleanup: vi.fn() };
      
      sceneManager.registerScene('scene1', scene1 as any);
      sceneManager.registerScene('scene2', scene2 as any);
      
      const allScenes = sceneManager.getAllScenes();
      expect(allScenes.size).toBe(2);
      expect(allScenes.has('scene1')).toBe(true);
      expect(allScenes.has('scene2')).toBe(true);
    });
  });
});
