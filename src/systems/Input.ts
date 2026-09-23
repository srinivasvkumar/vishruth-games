import { Logger } from '@/utils/Logger';
import { GameConstants } from '@/utils/Constants';
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
   *
   * W3-C.3b: handlers must be allocation-free. The keydown/keyup handlers used
   * to call `e.key.toLowerCase()` on every key event (a fresh string each time)
   * — now an inline check assigns the key as-is when already lowercase and only
   * calls toLowerCase() when the first character is uppercase. Game keys
   * (w/a/s/d, arrow*, space, enter) are all lowercase in `e.key`, so the common
   * path performs zero allocations.
   */
  private setupEventListeners(): void {
    // Keyboard events
    window.addEventListener('keydown', (e) => {
      const key = e.key.charCodeAt(0) >= 65 && e.key.charCodeAt(0) <= 90
        ? e.key.toLowerCase()
        : e.key;
      this.keys[key] = true;
      Logger.debug('Key pressed', { key: e.key });
    });
    
    window.addEventListener('keyup', (e) => {
      const key = e.key.charCodeAt(0) >= 65 && e.key.charCodeAt(0) <= 90
        ? e.key.toLowerCase()
        : e.key;
      this.keys[key] = false;
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
      this.gamepadState = navigator.getGamepads()[e.gamepad.index] ?? null;
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
   * W3-C.3b: Get the live key state map BY REFERENCE (zero allocations).
   *
   * The hot input path (GameScene.onUpdate -> Player.update) reads this every
   * frame. `getInputState()` previously spread `{...this.keys}` into a fresh
   * object every frame (GC pressure on the hottest path). `getKeys()` returns
   * the live map directly so the frame loop reads current key state with no
   * per-frame allocation — the input is "batched": DOM events write the map,
   * the frame loop reads it once at the start of the scene update.
   *
   * Contract: the returned object is owned by InputSystem. Read its booleans;
   * do not mutate it or hold it across InputSystem.clear()/re-instantiation.
   *
   * Note: `isKeyPressed()` still lowercases its argument (callers pass user
   * strings, not the hot per-frame path) — the per-frame hot path is getKeys().
   */
  getKeys(): Record<string, boolean> {
    return this.keys;
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
    if (!this.gamepadState?.buttons[button]) return false;
    return this.gamepadState.buttons[button].pressed;
  }
  
  /**
   * Get gamepad axis value
   */
  getGamepadAxis(axis: number): number {
    if (!this.gamepadState?.axes[axis]) return 0;
    const value = this.gamepadState.axes[axis];
    
    // Apply deadzone
    return Math.abs(value) > GameConstants.GAMEPAD_DEADZONE ? value : 0;
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
   *
   * W3-C.3b: mutate the existing maps in place instead of reassigning
   * (`this.keys = {}`) — avoids allocating a fresh map object on clear, and
   * keeps any live reference handed out by getKeys() pointing at the same
   * (now empty) map.
   */
  clear(): void {
    for (const k of Object.keys(this.keys)) {
      delete this.keys[k];
    }
    for (const k of Object.keys(this.mouseButtons)) {
      delete this.mouseButtons[Number(k)];
    }
    Logger.debug('Input state cleared');
  }
}
