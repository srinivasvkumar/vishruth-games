/**
 * W3-B.0 (kanban t_a3c5bda0) — TDD RED + GREEN: debug accessors.
 *
 * Three deterministic debug accessors are installed on window by
 * GameScene.onEnter() so that Playwright E2E specs (B3 CP2 movement,
 * B4 CP3 score, B5 CP4 restart) can read and drive game state without
 * timing-dependent collision choreography.
 *
 * Accessors (all set on window, no arguments for getters):
 *   1. window.__debugPlayerPos()  → { x: number, z: number }
 *   2. window.__setPlayerHealth(n) → void  (clamps n to [0, PLAYER_HEALTH])
 *   3. window.__debugScore()      → number
 *
 * RED surface (fails before GameScene.onEnter() installs the accessors):
 *   - window.__debugPlayerPos is not a function
 *   - window.__setPlayerHealth is not a function
 *   - window.__debugScore is not a function
 *
 * GREEN surface (passes after GameScene.onEnter() installs the accessors):
 *   - All three exist and are functions
 *   - __debugPlayerPos() returns { x: 0, z: 0 } at spawn
 *   - __setPlayerHealth(0) marks the player dead (isPlayerAlive() === false)
 *   - __setPlayerHealth(50) updates the HUD health display to "HEALTH: 50"
 *   - __debugScore() returns 0 initially, 42 after a PLAYER_SCORE event
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { GameScene } from '@/scenes/GameScene';
import { Logger } from '@/utils/Logger';
import { UISystem } from '@/systems/UI';
import type { UIConfig } from '@/types/GameTypes';

// --- Mocks ------------------------------------------------------------------

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  class MockWebGLRenderer {
    readonly domElement: HTMLCanvasElement;
    constructor(_params?: Record<string, unknown>) {
      this.domElement = document.createElement('canvas');
    }
    render(..._args: unknown[]): void {}
  }
  return { ...actual, WebGLRenderer: MockWebGLRenderer };
});

vi.mock('@/utils/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    setLevel: vi.fn(),
  },
}));

// --- Helpers ------------------------------------------------------------------

const uiConfig: UIConfig = {
  theme: 'dark',
  fontSize: 14,
  showFPS: false,
  showDebug: false,
};

function createMockGame(uiSystem: UISystem) {
  const inputState = { keys: {} as Record<string, boolean> };
  return {
    _inputState: inputState,
    getInputSystem: vi.fn(() => ({ getInputState: () => inputState })),
    getUISystem: vi.fn(() => uiSystem),
    switchScene: vi.fn().mockResolvedValue(undefined),
    isGameRunning: () => true,
    pause: vi.fn(),
    stop: vi.fn(),
  };
}

type MockGame = ReturnType<typeof createMockGame>;

async function loadedAndEnteredScene(game: MockGame): Promise<GameScene> {
  const gs = new GameScene(game);
  await gs.load();
  gs.enter();
  return gs;
}

// --- Tests ------------------------------------------------------------------

describe('W3-B.0: Debug accessors (window.__debugPlayerPos / __setPlayerHealth / __debugScore)', () => {
  let uiSystem: UISystem;
  let game: MockGame;

  beforeEach(() => {
    document.body.innerHTML = '';
    uiSystem = new UISystem(uiConfig);
    game = createMockGame(uiSystem);
    // Clean up any leftover accessors from a previous test
    delete (window as any).__debugPlayerPos;
    delete (window as any).__setPlayerHealth;
    delete (window as any).__debugScore;
  });

  afterEach(() => {
    uiSystem.cleanup();
    document.body.innerHTML = '';
    delete (window as any).__debugPlayerPos;
    delete (window as any).__setPlayerHealth;
    delete (window as any).__debugScore;
    vi.restoreAllMocks();
  });

  // --- RED: accessors do NOT exist before enter() -----------------------------

  it('RED: before enter(), the three accessors do not exist on window', async () => {
    const gs = new GameScene(game);
    await gs.load();
    // load() is called but enter() has NOT been called yet
    expect((window as any).__debugPlayerPos).toBeUndefined();
    expect((window as any).__setPlayerHealth).toBeUndefined();
    expect((window as any).__debugScore).toBeUndefined();
    void gs;
  });

  // --- GREEN: accessors exist and work after enter() --------------------------

  it('GREEN: after enter(), all three accessors are functions on window', async () => {
    await loadedAndEnteredScene(game);
    expect(typeof (window as any).__debugPlayerPos).toBe('function');
    expect(typeof (window as any).__setPlayerHealth).toBe('function');
    expect(typeof (window as any).__debugScore).toBe('function');
  });

  it('GREEN: __debugPlayerPos() returns { x, z } as numbers (0,0 at spawn)', async () => {
    await loadedAndEnteredScene(game);
    const pos = (window as any).__debugPlayerPos();
    expect(pos).toHaveProperty('x');
    expect(pos).toHaveProperty('z');
    expect(typeof pos.x).toBe('number');
    expect(typeof pos.z).toBe('number');
    // Player spawns at (0, 1, 0) — x and z should be 0 at spawn
    expect(pos.x).toBe(0);
    expect(pos.z).toBe(0);
  });

  it('GREEN: __setPlayerHealth(0) marks the player as dead', async () => {
    const gs = await loadedAndEnteredScene(game);
    // Before: player is alive
    expect(gs.getPlayer()!.isPlayerAlive()).toBe(true);
    
    // Set health to 0 deterministically — no collision timing needed.
    // Player.setHealth(0) calls die() which sets isAlive=false.
    (window as any).__setPlayerHealth(0);
    
    // After: player is dead
    expect(gs.getPlayer()!.isPlayerAlive()).toBe(false);
    
    // The next update() exits early (isPlayerAlive() is false) — no crash
    gs.update(0.016);
  });

  it('GREEN: __setPlayerHealth(50) updates the HUD health display', async () => {
    const gs = await loadedAndEnteredScene(game);
    
    // Set to an in-range value
    (window as any).__setPlayerHealth(50);
    gs.update(0.016);
    
    // The HUD health display should reflect 50
    expect(document.getElementById('game-health')!.textContent).toBe('HEALTH: 50');
    
    // Set to a value above max — should clamp to 100
    (window as any).__setPlayerHealth(999);
    gs.update(0.016);
    expect(document.getElementById('game-health')!.textContent).toBe('HEALTH: 100');
  });

  it('GREEN: __debugScore() returns 0 initially', async () => {
    await loadedAndEnteredScene(game);
    const score = (window as any).__debugScore();
    expect(typeof score).toBe('number');
    expect(score).toBe(0);
  });

  it('GREEN: __debugScore() reflects score after a PLAYER_SCORE event', async () => {
    await loadedAndEnteredScene(game);
    
    // Fire a PLAYER_SCORE event — GameScene's setupEventListeners() adds points
    window.dispatchEvent(
      new CustomEvent('player:score', { detail: { points: 42 } })
    );
    
    // The score is updated in the event listener
    const score = (window as any).__debugScore();
    expect(score).toBe(42);
  });
});
