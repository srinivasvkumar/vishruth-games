import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InputSystem } from '../../src/systems/Input';
import { GameConstants } from '@/utils/Constants';

vi.mock('@/utils/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

/**
 * W1-C gap-fill (t_fa4d5774): helpers to drive the gamepad path.
 *
 * src/systems/Input.ts reads `navigator.getGamepads()` inside
 * `pollGamepad()` (via `update()`) and inside the `gamepadconnected`
 * listener. Vitest's global setupFiles only mock three/cannon, so the
 * happy-dom `navigator.getGamepads` default (returns an empty array) is
 * in effect; we override it per-test with vi.stubGlobal.
 */
function mockGamepad(options: {
  axes?: number[];
  buttons?: Array<number | { pressed: boolean; value?: number }>;
  id?: string;
} = {}): Gamepad {
  return {
    id: options.id ?? 'Mock Gamepad 0001',
    index: 0,
    connected: true,
    mapping: 'standard',
    timestamp: 0,
    axes: options.axes ?? [0, 0, 0, 0],
    buttons: (options.buttons ?? [0, 0, 0, 0]).map((b) =>
      typeof b === 'number'
        ? { pressed: false, touched: false, value: b, type: 'button' as const }
        : { pressed: b.pressed, touched: false, value: b.value ?? 0, type: 'button' as const }
    ),
    vibrationActuator: null
  } as unknown as Gamepad;
}

function stubGetGamepads(...gamepads: Array<Gamepad | null>): void {
  vi.stubGlobal('navigator', {
    ...navigator,
    getGamepads: vi.fn(() => gamepads)
  });
}

/**
 * Bypass the 16ms (~60Hz) poll throttle in InputSystem.pollGamepad():
 * pollGamepad skips the navigator.read when performance.now() -
 * lastGamepadPoll < 16. Set the private timestamp back into the past so
 * a single update() call performs the read.
 */
function bypassPollThrottle(inputSystem: InputSystem): void {
  (inputSystem as unknown as { lastGamepadPoll: number }).lastGamepadPoll =
    performance.now() - 1000;
}

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

  // ==========================================================================
  // W1-C gap-fill (t_fa4d5774): gamepad path
  // Covers getGamepadState(), isGamepadButtonPressed(), getGamepadAxis()
  // (deadzone via GameConstants.GAMEPAD_DEADZONE). Retroactive: asserts
  // CURRENT behavior of the frozen production code.
  // ==========================================================================
  describe('Gamepad Input (W1-C gap-fill)', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('getGamepadState returns null before any gamepad is present', () => {
      expect(inputSystem.getGamepadState()).toBeNull();
    });

    it('update() polls navigator.getGamepads and captures gamepad 0', () => {
      const gp = mockGamepad();
      stubGetGamepads(gp);
      bypassPollThrottle(inputSystem);

      inputSystem.update();

      expect(inputSystem.getGamepadState()).toBe(gp);
    });

    it('update() does not poll within the 16ms throttle window', () => {
      const gp = mockGamepad();
      const getGamepads = vi.fn(() => [gp]);
      stubGetGamepads(gp);
      vi.stubGlobal('navigator', { ...navigator, getGamepads });

      // Force lastGamepadPoll to "now" so the next update() is throttled.
      (inputSystem as unknown as { lastGamepadPoll: number }).lastGamepadPoll =
        performance.now();

      inputSystem.update();

      expect(getGamepads).not.toHaveBeenCalled();
      expect(inputSystem.getGamepadState()).toBeNull();
    });

    it('update() leaves gamepadState null when no gamepad is connected', () => {
      stubGetGamepads(); // empty array
      bypassPollThrottle(inputSystem);

      inputSystem.update();

      expect(inputSystem.getGamepadState()).toBeNull();
    });

    it('gamepadconnected listener throws TypeError when the event lacks a gamepad payload (current behavior)', () => {
      const gp = mockGamepad({ id: 'Event Gamepad' });
      stubGetGamepads(gp);

      // The listener reads navigator.getGamepads()[e.gamepad.index] (Input.ts:53)
      // with no guard on e.gamepad. A real GamepadEvent carries .gamepad, so in
      // production the listener works; a bare Event (no .gamepad) triggers a
      // TypeError thrown synchronously out of dispatchEvent. We document the
      // CURRENT behavior of the frozen code — this is a latent defect candidate
      // (missing null-guard), flagged to the orchestrator, NOT fixed here.
      expect(() =>
        window.dispatchEvent(new Event('gamepadconnected'))
      ).toThrow(TypeError);

      // State is unchanged: the throw happened before the assignment, so the
      // poll path (update()) remains the only way gamepadState is set.
      expect(inputSystem.getGamepadState()).toBeNull();
    });

    it('gamepaddisconnected event clears gamepadState', () => {
      const gp = mockGamepad();
      stubGetGamepads(gp);
      bypassPollThrottle(inputSystem);
      inputSystem.update();
      expect(inputSystem.getGamepadState()).toBe(gp);

      window.dispatchEvent(new Event('gamepaddisconnected'));

      expect(inputSystem.getGamepadState()).toBeNull();
    });

    describe('isGamepadButtonPressed', () => {
      it('returns false when no gamepad is present', () => {
        expect(inputSystem.isGamepadButtonPressed(0)).toBe(false);
      });

      it('returns false for a button index out of range', () => {
        const gp = mockGamepad({ buttons: [{ pressed: true }] });
        stubGetGamepads(gp);
        bypassPollThrottle(inputSystem);
        inputSystem.update();

        expect(inputSystem.isGamepadButtonPressed(5)).toBe(false);
      });

      it('returns true for a pressed button', () => {
        const gp = mockGamepad({
          buttons: [0, { pressed: true, value: 1 }, 0, 0]
        });
        stubGetGamepads(gp);
        bypassPollThrottle(inputSystem);
        inputSystem.update();

        expect(inputSystem.isGamepadButtonPressed(1)).toBe(true);
        expect(inputSystem.isGamepadButtonPressed(0)).toBe(false);
      });
    });

    describe('getGamepadAxis', () => {
      it('returns 0 when no gamepad is present', () => {
        expect(inputSystem.getGamepadAxis(0)).toBe(0);
      });

      it('returns 0 for an axis index out of range', () => {
        const gp = mockGamepad({ axes: [0.8] });
        stubGetGamepads(gp);
        bypassPollThrottle(inputSystem);
        inputSystem.update();

        expect(inputSystem.getGamepadAxis(3)).toBe(0);
      });

      it('returns the axis value when above the deadzone', () => {
        const gp = mockGamepad({ axes: [0.5, -0.8, 0, 0] });
        stubGetGamepads(gp);
        bypassPollThrottle(inputSystem);
        inputSystem.update();

        expect(inputSystem.getGamepadAxis(0)).toBe(0.5);
        expect(inputSystem.getGamepadAxis(1)).toBe(-0.8);
      });

      it('returns 0 when the axis value is inside the deadzone', () => {
        const gp = mockGamepad({ axes: [0.1, -0.14] });
        stubGetGamepads(gp);
        bypassPollThrottle(inputSystem);
        inputSystem.update();

        expect(inputSystem.getGamepadAxis(0)).toBe(0);
        expect(inputSystem.getGamepadAxis(1)).toBe(0);
      });

      it('deadzone boundary: value === GAMEPAD_DEADZONE is NOT passed through', () => {
        // Current behavior: `Math.abs(value) > DEADZONE` — strict greater,
        // so exactly 0.15 is zeroed.
        const gp = mockGamepad({
          axes: [GameConstants.GAMEPAD_DEADZONE, -GameConstants.GAMEPAD_DEADZONE]
        });
        stubGetGamepads(gp);
        bypassPollThrottle(inputSystem);
        inputSystem.update();

        expect(inputSystem.getGamepadAxis(0)).toBe(0);
        expect(inputSystem.getGamepadAxis(1)).toBe(0);
      });

      it('deadzone boundary: value just above the deadzone IS passed through', () => {
        const above = GameConstants.GAMEPAD_DEADZONE + 0.001;
        const gp = mockGamepad({ axes: [above, -above] });
        stubGetGamepads(gp);
        bypassPollThrottle(inputSystem);
        inputSystem.update();

        expect(inputSystem.getGamepadAxis(0)).toBe(above);
        expect(inputSystem.getGamepadAxis(1)).toBe(-above);
      });
    });

    it('getInputState includes gamepad axes/buttons when a gamepad is present', () => {
      const gp = mockGamepad({
        axes: [0.9, 0],
        buttons: [{ pressed: true, value: 1 }, 0]
      });
      stubGetGamepads(gp);
      bypassPollThrottle(inputSystem);
      inputSystem.update();

      const state = inputSystem.getInputState();
      expect(state.gamepad).toBeDefined();
      expect(state.gamepad?.axes).toEqual([0.9, 0]);
      expect(state.gamepad?.buttons).toEqual([true, false]);
    });

    it('getInputState omits gamepad when none is present', () => {
      const state = inputSystem.getInputState();
      expect(state.gamepad).toBeUndefined();
    });
  });
});
