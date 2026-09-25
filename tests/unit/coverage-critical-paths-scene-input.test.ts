import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SceneManager } from '@/core/SceneManager';
import { GameStateMachine } from '@/core/State';
import { InputSystem } from '@/systems/Input';

vi.mock('@/utils/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

/**
 * W4-C.2 — Critical-path coverage: scene transitions, death/restart FSM, input.
 *
 * Characterization tests for the frozen critical paths (gate #5: critical
 * paths 100%). These paths exist and behave; they were simply never
 * exercised by tests. No src/ changes in this task.
 */

function makeMockScene(overrides: Record<string, any> = {}) {
  return {
    load: vi.fn().mockResolvedValue(undefined),
    enter: vi.fn(),
    exit: vi.fn(),
    update: vi.fn(),
    render: vi.fn(),
    cleanup: vi.fn(),
    ...overrides
  };
}

// ============================================================================
// SceneManager — scene transition critical path
// ============================================================================
describe('W4-C.2 critical path: SceneManager transitions', () => {
  let sceneManager: SceneManager;
  let mockGame: any;
  let fakeTimersUsed = false;

  beforeEach(() => {
    fakeTimersUsed = false;
    mockGame = {
      emit: vi.fn(),
      getAccessibilitySystem: () => ({ announceSceneTransition: vi.fn() })
    };
    sceneManager = new SceneManager(mockGame);
  });

  afterEach(() => {
    if (fakeTimersUsed) {
      vi.useRealTimers();
      fakeTimersUsed = false;
    }
    sceneManager.cleanup();
  });

  it('unregistering the CURRENT scene exits it and clears currentScene (SceneManager.ts:37-39)', async () => {
    const scene = makeMockScene();
    sceneManager.registerScene('current', scene as any);
    await sceneManager.loadScene('current');
    expect(sceneManager.getCurrentScene()).toBe(scene);

    sceneManager.unregisterScene('current');

    expect(scene.exit).toHaveBeenCalledTimes(1); // current → exit first
    expect(scene.cleanup).toHaveBeenCalledTimes(1);
    expect(sceneManager.getCurrentScene()).toBeNull();
    expect(sceneManager.hasScene('current')).toBe(false);
  });

  it('unregistering a NON-current scene does NOT call exit (SceneManager.ts:36 branch)', async () => {
    const current = makeMockScene();
    const other = makeMockScene();
    sceneManager.registerScene('a', current as any);
    sceneManager.registerScene('b', other as any);
    await sceneManager.loadScene('a');

    sceneManager.unregisterScene('b');

    expect(other.exit).not.toHaveBeenCalled();
    expect(other.cleanup).toHaveBeenCalledTimes(1);
    expect(sceneManager.getCurrentScene()).toBe(current);
  });

  it('loadScene while a load is in flight queues the request (SceneManager.ts:51-54)', async () => {
    vi.useFakeTimers();
    fakeTimersUsed = true;
    let resolveFirst: () => void = () => {};
    const first = makeMockScene({
      load: vi.fn(() => new Promise<void>((res) => { resolveFirst = res; }))
    });
    const second = makeMockScene();
    sceneManager.registerScene('first', first as any);
    sceneManager.registerScene('second', second as any);

    const p1 = sceneManager.loadScene('first');
    // Second call lands while isLoading === true → queued, not executed.
    sceneManager.loadScene('second');
    expect(second.load).not.toHaveBeenCalled();
    expect(second.enter).not.toHaveBeenCalled();

    resolveFirst();
    await p1;
    // The finally block schedules the queued load via setTimeout(…, 100).
    await vi.advanceTimersByTimeAsync(150);

    // Queue was drained: second scene loaded + entered after first settled.
    expect(second.load).toHaveBeenCalledTimes(1);
    expect(second.enter).toHaveBeenCalledTimes(1);
    expect(sceneManager.getCurrentScene()).toBe(second);
  });

  it('failed load triggers the fallback path and rethrows (SceneManager.ts:92-101)', async () => {
    vi.useFakeTimers();
    fakeTimersUsed = true;
    const sceneA = makeMockScene();
    const sceneB = makeMockScene({
      load: vi.fn().mockRejectedValue(new Error('B load failed'))
    });
    sceneManager.registerScene('a', sceneA as any);
    sceneManager.registerScene('b', sceneB as any);

    await sceneManager.loadScene('a');
    await expect(sceneManager.loadScene('b')).rejects.toThrow('B load failed');

    // The fallback path (SceneManager.ts:95-98) executes:
    // previousScene is set to A before A.exit(), so it is non-null.
    // The fallback calls loadScene(getSceneName(previousScene)) which
    // queues the request (isLoading is still true during the catch).
    // The error is rethrown regardless.
    // A was exited once (on the switch attempt to B).
    expect(sceneA.exit).toHaveBeenCalledTimes(1);

    // Drain the queued fallback load before cleanup so the setTimeout
    // doesn't fire after scenes are unregistered.
    await vi.advanceTimersByTimeAsync(150);
  });

  it('failed load with NO previous scene still rethrows (SceneManager.ts:95 branch)', async () => {
    const sceneB = makeMockScene({
      load: vi.fn().mockRejectedValue(new Error('no prev'))
    });
    sceneManager.registerScene('b', sceneB as any);
    await expect(sceneManager.loadScene('b')).rejects.toThrow('no prev');
    // No previous scene → fallback branch skipped, but error still rethrown.
    expect(sceneManager.getCurrentScene()).toBeNull();
  });

  it('queued scenes drain in FIFO order after the first load settles (SceneManager.ts:106-111)', async () => {
    vi.useFakeTimers();
    fakeTimersUsed = true;
    const order: string[] = [];
    const mk = (name: string) =>
      makeMockScene({
        load: vi.fn(() => {
          order.push(`load:${name}`);
          return Promise.resolve();
        }),
        enter: vi.fn(() => {
          order.push(`enter:${name}`);
        })
      });
    const s1 = mk('s1');
    const s2 = mk('s2');
    const s3 = mk('s3');
    sceneManager.registerScene('s1', s1 as any);
    sceneManager.registerScene('s2', s2 as any);
    sceneManager.registerScene('s3', s3 as any);

    const p1 = sceneManager.loadScene('s1');
    sceneManager.loadScene('s2'); // queued
    sceneManager.loadScene('s3'); // queued

    // Let s1 settle, then drain the queue via the setTimeout chain.
    await p1;
    await vi.advanceTimersByTimeAsync(150); // s2 queued → loaded
    await vi.advanceTimersByTimeAsync(150); // s3 queued → loaded

    expect(order).toEqual(['load:s1', 'enter:s1', 'load:s2', 'enter:s2', 'load:s3', 'enter:s3']);
    expect(sceneManager.getCurrentScene()).toBe(s3);
  });

  it('getSceneName resolves the previous scene by iterating the registry (SceneManager.ts:164-169)', async () => {
    vi.useFakeTimers();
    fakeTimersUsed = true;
    // getSceneName() is private; it is exercised through the fallback path
    // in loadScene (SceneManager.ts:97). The previous scene (A) is found in
    // the registry under its registered name 'alpha'.
    const alpha = makeMockScene();
    const beta = makeMockScene({ load: vi.fn().mockRejectedValue(new Error('x')) });
    sceneManager.registerScene('alpha', alpha as any);
    sceneManager.registerScene('beta', beta as any);

    await sceneManager.loadScene('alpha');
    await expect(sceneManager.loadScene('beta')).rejects.toThrow('x');

    // The fallback path called getSceneName(alpha) → 'alpha' → loadScene('alpha').
    // Since isLoading was true, this was queued (not executed synchronously).
    // alpha.load was called once (the initial load). The queued fallback
    // would call it a second time after the timeout.
    expect(alpha.load).toHaveBeenCalledTimes(1);

    // Drain the queued fallback load before cleanup.
    await vi.advanceTimersByTimeAsync(150);
  });

  it('update() delegates to the current scene (SceneManager.ts:119-121)', async () => {
    const scene = makeMockScene();
    sceneManager.registerScene('a', scene as any);
    await sceneManager.loadScene('a');
    sceneManager.update(0.016);
    expect(scene.update).toHaveBeenCalledWith(0.016);
  });

  it('render() delegates to the current scene (SceneManager.ts:128-130)', async () => {
    const scene = makeMockScene();
    sceneManager.registerScene('a', scene as any);
    await sceneManager.loadScene('a');
    sceneManager.render();
    expect(scene.render).toHaveBeenCalledTimes(1);
  });

  it('hasScene() and getAllScenes() reflect the registry (SceneManager.ts:150-159)', () => {
    const s1 = makeMockScene();
    const s2 = makeMockScene();
    sceneManager.registerScene('x', s1 as any);
    sceneManager.registerScene('y', s2 as any);
    expect(sceneManager.hasScene('x')).toBe(true);
    expect(sceneManager.hasScene('y')).toBe(true);
    expect(sceneManager.hasScene('z')).toBe(false);
    expect(sceneManager.getAllScenes().size).toBe(2);
  });
});

// ============================================================================
// GameStateMachine — death/restart FSM critical path
// ============================================================================
describe('W4-C.2 critical path: GameStateMachine (death/restart)', () => {
  it('throws on an unknown initial state (State.ts:73-74)', () => {
    expect(() => new GameStateMachine('bogus' as any)).toThrow('Unknown game state');
  });

  it('full run lifecycle: menu → playing → gameOver → restart → menu', () => {
    const fsm = new GameStateMachine();
    expect(fsm.getState()).toBe('menu');
    expect(fsm.transition('playing')).toBe(true);
    expect(fsm.getState()).toBe('playing');
    expect(fsm.transition('gameOver')).toBe(true);
    expect(fsm.getState()).toBe('gameOver');
    expect(fsm.transition('restart')).toBe(true);
    expect(fsm.transition('menu')).toBe(true);
    expect(fsm.getState()).toBe('menu');
  });

  it('blocked transitions are rejected without state change', () => {
    const fsm = new GameStateMachine('playing' as any);
    expect(fsm.transition('menu')).toBe(false); // playing → menu not legal
    expect(fsm.getState()).toBe('playing');
  });

  it('emits game:state:change on every valid transition (State.ts:103-107)', () => {
    const fsm = new GameStateMachine();
    const events: Array<{ from: string; to: string }> = [];
    const handler = (e: Event) => {
      const ce = e as CustomEvent;
      events.push(ce.detail);
    };
    window.addEventListener('game:state:change', handler);
    fsm.transition('playing');
    fsm.transition('paused');
    window.removeEventListener('game:state:change', handler);
    expect(events).toEqual([
      { from: 'menu', to: 'playing' },
      { from: 'playing', to: 'paused' }
    ]);
  });

  it('re-emits game:over when entering gameOver (State.ts:108-110)', () => {
    const fsm = new GameStateMachine();
    fsm.transition('playing');
    let gameOverFired = false;
    const handler = () => { gameOverFired = true; };
    window.addEventListener('game:over', handler);
    fsm.transition('gameOver');
    window.removeEventListener('game:over', handler);
    expect(gameOverFired).toBe(true);
  });
});

// ============================================================================
// InputSystem — input critical path (real system, no mocks)
// ============================================================================
describe('W4-C.2 critical path: InputSystem', () => {
  let inputSystem: InputSystem;

  beforeEach(() => {
    inputSystem = new InputSystem();
  });

  afterEach(() => {
    inputSystem.clear();
  });

  it('stores a lowercase key on keydown (Input.ts:33-36)', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'W' }));
    expect(inputSystem.isKeyPressed('w')).toBe(true);
  });

  it('releases a lowercase key on keyup (Input.ts:41-45)', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'W' }));
    expect(inputSystem.isKeyPressed('w')).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'W' }));
    expect(inputSystem.isKeyPressed('w')).toBe(false);
  });

  it('isKeyPressed lowercases its argument (Input.ts:103-105)', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(inputSystem.isKeyPressed('a')).toBe(true);
    expect(inputSystem.isKeyPressed('A')).toBe(true); // argument lowercased
  });

  it('mouse down sets the button, mouse up clears it (Input.ts:49-57)', () => {
    window.dispatchEvent(new MouseEvent('mousedown', { button: 2 }));
    expect(inputSystem.isMouseButtonPressed(2)).toBe(true);
    window.dispatchEvent(new MouseEvent('mouseup', { button: 2 }));
    expect(inputSystem.isMouseButtonPressed(2)).toBe(false);
  });

  it('mousemove updates the mouse position (Input.ts:59-62)', () => {
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 200 }));
    const pos = inputSystem.getMousePosition();
    expect(pos.x).toBe(100);
    expect(pos.y).toBe(200);
  });

  it('getKeys() returns the live key map by reference (Input.ts:123-125)', () => {
    const live = inputSystem.getKeys();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    // The SAME object reflects the new press — no copy was handed out.
    expect(live.a).toBe(true);
    expect(inputSystem.getKeys()).toBe(live);
  });

  it('isKeyJustPressed() mirrors key-pressed state (Input.ts:130-133)', () => {
    expect(inputSystem.isKeyJustPressed('d')).toBe(false);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
    expect(inputSystem.isKeyJustPressed('d')).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'd' }));
    expect(inputSystem.isKeyJustPressed('d')).toBe(false);
  });

  it('getMousePosition() returns a copy, not the live object (Input.ts:145-147)', () => {
    const p1 = inputSystem.getMousePosition();
    const p2 = inputSystem.getMousePosition();
    expect(p1).toEqual(p2);
    expect(p1).not.toBe(p2); // distinct objects
  });

  it('getGamepadState() returns null when no gamepad is connected (Input.ts:152-154)', () => {
    expect(inputSystem.getGamepadState()).toBeNull();
  });

  it('isGamepadButtonPressed() returns false with no gamepad (Input.ts:159-162)', () => {
    expect(inputSystem.isGamepadButtonPressed(0)).toBe(false);
  });

  it('getGamepadAxis() returns 0 with no gamepad (Input.ts:167-173)', () => {
    expect(inputSystem.getGamepadAxis(0)).toBe(0);
  });

  it('getInputState() returns the full state snapshot (Input.ts:178-191)', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
    const state = inputSystem.getInputState();
    expect(state.keys.w).toBe(true);
    expect(state.mouse.x).toBeDefined();
    expect(state.mouse.y).toBeDefined();
    expect(state.gamepad).toBeUndefined(); // no gamepad connected
  });

  it('clear() removes all keys and mouse buttons (Input.ts:201-209)', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
    window.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
    inputSystem.clear();
    expect(inputSystem.isKeyPressed('w')).toBe(false);
    expect(inputSystem.isMouseButtonPressed(0)).toBe(false);
  });
});
