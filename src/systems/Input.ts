import { Logger } from '@/utils/Logger';
import { InputConstants } from '@/utils/Constants';
import type { InputState } from '@/types/GameTypes';

/**
 * Input system for handling keyboard, mouse, and gamepad input
 */
export class InputSystem {
  private keys: Record<string, boolean> = {};
  private mouseButtons: Record<number, boolean> = {};
  private mousePosition = { x: 0, y: 0 };
  private gamepadState: Gamepad | null = null;
  private lastGamepadPoll = 0;
  
  constructor() {
    this.setupEventListeners();
    Logger.info('Input system initialized');
  }
  
  /**
   * Set up input event listeners
   */
  private setupEventListeners(): void {
    // Keyboard events
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      Logger.debug('Key pressed', { key: e.key });
    });
    
    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
      Logger.debug('Key released', { key: e.key });
    });
    
    // Mouse events
    window.addEventListener('mousedown', (e) => {
      this.mouseButtons[e.button] = true;
      Logger.debug('Mouse button pressed', { button: e.button });
    });
    
    window.addEventListener('mouseup', (e) => {
      this.mouseButtons[e.button] = false;
      Logger.debug('Mouse button released', { button: e.button });
    });
    
    window.addEventListener('mousemove', (e) => {
      this.mousePosition.x = e.clientX;
      this.mousePosition.y = e.clientY;
    });
    
    // Gamepad events
    window.addEventListener('gamepadconnected', (e) => {
      this.gamepadState = navigator.getGamepads()[e.gamepad.index] || null;
      Logger.info('Gamepad connected', { id: e.gamepad.id });
    });
    
    window.addEventListener('gamepaddisconnected', () => {
      this.gamepadState = null;
      Logger.info('Gamepad disconnected');
    });
  }
  
  /**
   * Update input state (called each frame)
   */
  update(): void {
    this.pollGamepad();
  }
  
  /**
   * Poll gamepad state
   */
  private pollGamepad(): void {
    const now = performance.now();
    if (now - this.lastGamepadPoll < 16) return; // ~60Hz polling
    
    if (navigator.getGamepads) {
      const gamepads = navigator.getGamepads();
      if (gamepads[0]) {
        this.gamepadState = gamepads[0];
      }
    }
    
    this.lastGamepadPoll = now;
  }
  
  /**
   * Check if a key is currently pressed
   */
  isKeyPressed(key: string): boolean {
    return !!this.keys[key.toLowerCase()];
  }
  
  /**
   * Check if a key was just pressed (no repeat)
   */
  isKeyJustPressed(key: string): boolean {
    // Implementation would track previous state
    return this.isKeyPressed(key);
  }
  
  /**
   * Check if a mouse button is pressed
   */
  isMouseButtonPressed(button: number): boolean {
    return !!this.mouseButtons[button];
  }
  
  /**
   * Get mouse position
   */
  getMousePosition(): { x: number; y: number } {
    return { ...this.mousePosition };
  }
  
  /**
   * Get gamepad state
   */
  getGamepadState(): Gamepad | null {
    return this.gamepadState;
  }
  
  /**
   * Check if a gamepad button is pressed
   */
  isGamepadButtonPressed(button: number): boolean {
    if (!this.gamepadState || !this.gamepadState.buttons[button]) return false;
    return this.gamepadState.buttons[button].pressed;
  }
  
  /**
   * Get gamepad axis value
   */
  getGamepadAxis(axis: number): number {
    if (!this.gamepadState || !this.gamepadState.axes[axis]) return 0;
    const value = this.gamepadState.axes[axis];
    
    // Apply deadzone
    return Math.abs(value) > InputConstants.GAMEPAD_DEADZONE ? value : 0;
  }
  
  /**
   * Get complete input state
   */
  getInputState(): InputState {
    return {
      keys: { ...this.keys },
      mouse: {
        x: this.mousePosition.x,
        y: this.mousePosition.y,
        buttons: { ...this.mouseButtons }
      },
      gamepad: this.gamepadState ? {
        axes: [...this.gamepadState.axes],
        buttons: this.gamepadState.buttons.map(b => b.pressed)
      } : undefined
    };
  }
  
  /**
   * Clear input state (e.g., when game loses focus)
   */
  clear(): void {
    this.keys = {};
    this.mouseButtons = {};
    Logger.debug('Input state cleared');
  }
}
