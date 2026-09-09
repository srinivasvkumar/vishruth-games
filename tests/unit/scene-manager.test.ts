import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SceneManager } from '@/core/SceneManager';
import { Scene } from '@/scenes/Scene';
import { Game } from '@/core/Game';

vi.mock('@/utils/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

describe('SceneManager Class - Retroactive Tests', () => {
  let sceneManager: SceneManager;
  let mockGame: any;

  beforeEach(() => {
    mockGame = {
      emit: vi.fn()
    };
    sceneManager = new SceneManager(mockGame);
    
    // Mock CustomEvent
    global.CustomEvent = vi.fn().mockImplementation(() => ({}));
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
    });

    it('should pass data to scene load', async () => {
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
      
      expect(mockScene.load).toHaveBeenCalled();
    });

    it('should throw error for non-existent scene', async () => {
      await expect(sceneManager.loadScene('nonExistent')).rejects.toThrow('Scene "nonExistent" not found');
    });

    it('should exit current scene before loading new one', async () => {
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
      
      expect(scene1.exit).toHaveBeenCalled();
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
    it('should update current scene', () => {
      const mockUpdate = vi.fn();
      const mockScene = {
        load: vi.fn(),
        enter: vi.fn(),
        exit: vi.fn(),
        update: mockUpdate,
        render: vi.fn(),
        cleanup: vi.fn()
      };
      
      sceneManager.registerScene('testScene', mockScene as any);
      sceneManager.loadScene('testScene');
      sceneManager.update(0.016);
      
      expect(mockUpdate).toHaveBeenCalledWith(0.016);
    });

    it('should not update if no current scene', () => {
      expect(() => sceneManager.update(0.016)).not.toThrow();
    });
  });

  describe('Scene Rendering', () => {
    it('should render current scene', () => {
      const mockRender = vi.fn();
      const mockScene = {
        load: vi.fn(),
        enter: vi.fn(),
        exit: vi.fn(),
        update: vi.fn(),
        render: mockRender,
        cleanup: vi.fn()
      };
      
      sceneManager.registerScene('testScene', mockScene as any);
      sceneManager.loadScene('testScene');
      sceneManager.render();
      
      expect(mockRender).toHaveBeenCalled();
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
