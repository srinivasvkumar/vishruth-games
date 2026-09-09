import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InputSystem } from '../../src/systems/Input';

vi.mock('@/utils/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

describe('InputSystem Class - Retroactive Tests', () => {
  let inputSystem: InputSystem;

  beforeEach(() => {
    inputSystem = new InputSystem();
  });

  afterEach(() => {
    inputSystem.clear();
  });

  describe('Initialization', () => {
    it('should create InputSystem instance', () => {
      expect(inputSystem).toBeDefined();
    });

    it('should set up event listeners on construction', () => {
      expect(inputSystem.isKeyPressed('a')).toBe(false);
    });
  });

  describe('Keyboard Input', () => {
    it('should detect key press', () => {
      const event = new KeyboardEvent('keydown', { key: 'a' });
      window.dispatchEvent(event);
      expect(inputSystem.isKeyPressed('a')).toBe(true);
    });

    it('should detect key release', () => {
      const keydown = new KeyboardEvent('keydown', { key: 'a' });
      const keyup = new KeyboardEvent('keyup', { key: 'a' });
      
      window.dispatchEvent(keydown);
      expect(inputSystem.isKeyPressed('a')).toBe(true);
      
      window.dispatchEvent(keyup);
      expect(inputSystem.isKeyPressed('a')).toBe(false);
    });

    it('should handle multiple keys simultaneously', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
      
      expect(inputSystem.isKeyPressed('w')).toBe(true);
      expect(inputSystem.isKeyPressed('a')).toBe(true);
      expect(inputSystem.isKeyPressed('s')).toBe(true);
      expect(inputSystem.isKeyPressed('d')).toBe(true);
    });
  });

  describe('Mouse Input', () => {
    it('should detect mouse button press', () => {
      const event = new MouseEvent('mousedown', { button: 0 });
      window.dispatchEvent(event);
      expect(inputSystem.isMouseButtonPressed(0)).toBe(true);
    });

    it('should track mouse position', () => {
      const event = new MouseEvent('mousemove', { clientX: 100, clientY: 200 });
      window.dispatchEvent(event);
      const position = inputSystem.getMousePosition();
      expect(position.x).toBe(100);
      expect(position.y).toBe(200);
    });
  });

  describe('Input State Management', () => {
    it('should get complete input state', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
      const state = inputSystem.getInputState();
      expect(state.keys).toBeDefined();
    });

    it('should clear all input state', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      inputSystem.clear();
      expect(inputSystem.isKeyPressed('a')).toBe(false);
    });
  });
});
