/**
 * W2-D.2: Formal game state machine (Task 7.2 from TDD_PLAN.md) — RED phase
 *
 * A formal finite state machine replaces the ad-hoc isGameOver / isRunning
 * flags scattered across Game.ts and GameScene.ts.
 *
 * States: menu -> playing -> paused -> gameOver -> restart
 *   - menu:     idle, waiting for the player to start
 *   - playing:  gameplay running
 *   - paused:   gameplay suspended (player-initiated)
 *   - gameOver: run finished
 *   - restart:  transitionary state between runs (player confirmed restart)
 *
 * Valid transition table:
 *   menu     -> playing
 *   playing  -> paused
 *   playing  -> gameOver
 *   paused   -> playing
 *   paused   -> menu
 *   gameOver -> restart
 *   restart  -> menu
 *
 * Everything else is INVALID and must be blocked (state unchanged, no event).
 *
 * Design: `GameStateMachine` lives in `src/core/State.ts`.
 *   - Pure transition-table logic, no DOM, no three.js — trivially testable.
 *   - `transition(target: GameState): boolean` — performs the transition when
 *     valid, emits the state-change event, returns true; rejects invalid
 *     transitions (state unchanged, no event), returns false.
 *   - `getState(): GameState` / `canTransition(target: GameState): boolean`
 *   - Events:
 *       - 'game:state:change'  — detail: { from: GameState, to: GameState }
 *         Emitted on EVERY valid transition.
 *       - 'game:over' — emitted when entering gameOver.
 *
 * Integration with Game (Task 7.2 scope):
 *   - `game.start()`      => FSM transition to 'playing' (valid from menu /
 *                          restart); blocked otherwise — mirrors the old
 *                          start() guard.
 *   - `game.pause()`      => transition to 'paused' (valid only from playing)
 *   - `game.resume()`     => transition to 'playing' (valid only from paused)
 *   - `game.stop()`       => transition to 'menu' (valid only from paused;
 *                          teardown)
 *   - `game.gameOver()`   => transition to 'gameOver' (valid only from
 *                            playing)
 *   - `game.restart()`    => transition to 'restart' (valid only from
 *                            gameOver); returns the FSM result
 *   - `game.getGameState(): GameState` / `game.canTransition(to): boolean`
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  GameStateMachine,
  VALID_TRANSITIONS,
  ALL_STATES,
} from '@/core/State';
import type { GameState, StateChangeEvent } from '@/core/State';
import { Game } from '@/core/Game';
import type { GameConfig } from '@/types/GameTypes';

// Game's constructor builds a Renderer (W2-A.2) which calls
// THREE.WebGLRenderer — happy-dom has no WebGL context, so mock 'three'
// the same way scenes.test.ts does: real three for everything except
// WebGLRenderer, which gets a no-op stub.
vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  class MockWebGLRenderer {
    readonly domElement: HTMLCanvasElement;
    constructor(_params?: Record<string, unknown>) {
      this.domElement = document.createElement('canvas');
    }
    render(..._args: unknown[]): void {}
    setSize(_w: number, _h: number): void {}
    setClearColor(_c: number): void {}
    clear(): void {}
    dispose(): void {}
  }
  return { ...actual, WebGLRenderer: MockWebGLRenderer };
});

// ============================================================================
// Pure FSM tests — no mocks, no three.js (happy-dom provides window for events).
// ============================================================================

type TrackedListener = {
  calls: StateChangeEvent[];
  remove: () => void;
};

function trackEvent(eventName: string): {
  listener: TrackedListener;
  cleanup: () => void;
} {
  const calls: StateChangeEvent[] = [];
  const listener: EventListener = (e: Event) => {
    calls.push(e as StateChangeEvent);
  };
  window.addEventListener(eventName, listener);
  const tracked: TrackedListener = {
    calls,
    remove: () => window.removeEventListener(eventName, listener),
  };
  return {
    listener: tracked,
    cleanup: () => tracked.remove(),
  };
}

describe('GameStateMachine (W2-D.2)', () => {
  let fsm: GameStateMachine;
  const cleanups: Array<() => void> = [];

  beforeEach(() => {
    fsm = new GameStateMachine();
    cleanups.length = 0;
  });

  afterEach(() => {
    for (const cleanup of cleanups) cleanup();
    cleanups.length = 0;
  });

  function trackStateChange(): TrackedListener {
    const { listener, cleanup } = trackEvent('game:state:change');
    cleanups.push(cleanup);
    return listener;
  }

  // ── Initial state ─────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('starts in menu state', () => {
      expect(fsm.getState()).toBe('menu');
    });
  });

  // ── Transition table integrity ────────────────────────────────────────────

  describe('transition table', () => {
    it('defines all 5 states', () => {
      expect(ALL_STATES).toEqual(
        expect.arrayContaining(['menu', 'playing', 'paused', 'gameOver', 'restart']),
      );
      expect(ALL_STATES).toHaveLength(5);
    });

    it('defines every valid transition', () => {
      const valid: Record<GameState, GameState[]> = {
        menu: ['playing'],
        playing: ['paused', 'gameOver'],
        paused: ['playing', 'menu'],
        gameOver: ['restart'],
        restart: ['menu'],
      };
      for (const state of ALL_STATES) {
        for (const target of valid[state]) {
          expect(VALID_TRANSITIONS[state]).toContain(target);
        }
      }
    });

    it('no state transitions to itself', () => {
      for (const state of ALL_STATES) {
        expect(VALID_TRANSITIONS[state]).not.toContain(state);
      }
    });
  });

  // ── Valid transitions (events emitted) ────────────────────────────────────

  // Helper: walk the FSM through valid transitions to reach `target`.
  // Paths from menu: menu->playing->paused->playing->gameOver->restart->menu.
  function walkTo(target: GameState): void {
    if (target === 'menu') return;
    if (target === 'playing') {
      fsm.transition('playing');
      return;
    }
    if (target === 'paused') {
      fsm.transition('playing');
      fsm.transition('paused');
      return;
    }
    if (target === 'gameOver') {
      fsm.transition('playing');
      fsm.transition('gameOver');
      return;
    }
    if (target === 'restart') {
      fsm.transition('playing');
      fsm.transition('gameOver');
      fsm.transition('restart');
      return;
    }
    throw new Error(`walkTo: unknown state ${String(target)}`);
  }

  describe.each([
    ['menu', 'playing'],
    ['playing', 'paused'],
    ['playing', 'gameOver'],
    ['paused', 'playing'],
    ['paused', 'menu'],
    ['gameOver', 'restart'],
    ['restart', 'menu'],
  ] as Array<[GameState, GameState]>)('valid transition %s -> %s', (from, to) => {
    it('transitions and reports the new state', () => {
      walkTo(from);
      expect(fsm.getState()).toBe(from);
      const ok = fsm.transition(to);
      expect(ok).toBe(true);
      expect(fsm.getState()).toBe(to);
    });

    it('emits game:state:change with from/to', () => {
      const listener = trackStateChange();
      walkTo(from);
      const callsBefore = listener.calls.length;
      const ok = fsm.transition(to);
      expect(ok).toBe(true);
      // Only the final transition's event should be new.
      const newEvents = listener.calls.slice(callsBefore);
      expect(newEvents).toHaveLength(1);
      expect(newEvents[0].detail).toEqual({ from, to });
    });

    it('canTransition returns true before the transition', () => {
      walkTo(from);
      expect(fsm.canTransition(to)).toBe(true);
    });
  });

  // ── Invalid transitions (blocked) ─────────────────────────────────────────

  // Enumerate every (from, to) pair NOT in the valid table.
  const invalidPairs: Array<[GameState, GameState]> = [];
  for (const from of ALL_STATES) {
    for (const to of ALL_STATES) {
      if (!VALID_TRANSITIONS[from].includes(to)) {
        invalidPairs.push([from, to]);
      }
    }
  }

  describe.each(invalidPairs)('invalid transition %s -> %s', (from, to) => {
    it('is blocked: state unchanged, no event emitted', () => {
      const listener = trackStateChange();
      walkTo(from);
      const callsBefore = listener.calls.length;
      const ok = fsm.transition(to);
      expect(ok).toBe(false);
      expect(fsm.getState()).toBe(from);
      // No NEW events from the blocked transition.
      expect(listener.calls.slice(callsBefore)).toHaveLength(0);
    });

    it('canTransition returns false', () => {
      walkTo(from);
      expect(fsm.canTransition(to)).toBe(false);
    });
  });

  // ── Special events ────────────────────────────────────────────────────────

  describe('game:over event', () => {
    it('emits game:over when entering gameOver', () => {
      const { listener, cleanup } = trackEvent('game:over');
      fsm.transition('playing');
      fsm.transition('gameOver');
      expect(listener.calls).toHaveLength(1);
      cleanup();
    });

    it('does not re-emit game:over when staying in gameOver (blocked self-transition)', () => {
      const { listener, cleanup } = trackEvent('game:over');
      fsm.transition('playing');
      fsm.transition('gameOver');
      fsm.transition('gameOver'); // blocked
      expect(listener.calls).toHaveLength(1);
      cleanup();
    });
  });

  // ── Full lifecycle walk ───────────────────────────────────────────────────

  describe('full lifecycle', () => {
    it('walks menu -> playing -> paused -> playing -> gameOver -> restart -> menu', () => {
      const sequence: GameState[] = ['playing', 'paused', 'playing', 'gameOver', 'restart', 'menu'];
      for (const state of sequence) {
        expect(fsm.transition(state)).toBe(true);
        expect(fsm.getState()).toBe(state);
      }
      // Started in menu, ended back in menu after a full run.
      expect(fsm.getState()).toBe('menu');
    });

    it('cannot skip from menu directly to gameOver', () => {
      expect(fsm.transition('gameOver')).toBe(false);
      expect(fsm.getState()).toBe('menu');
    });

    it('cannot restart from playing (must reach gameOver first)', () => {
      fsm.transition('playing');
      expect(fsm.transition('restart')).toBe(false);
      expect(fsm.getState()).toBe('playing');
    });
  });
});

// ============================================================================
// Game integration tests — Game.start/pause/resume/stop/gameOver/restart are
// now driven by the FSM. Invalid actions leave the FSM state unchanged.
// ============================================================================

describe('Game state machine integration (W2-D.2)', () => {
  let game: Game;
  const mockConfig: GameConfig = {
    physics: { gravity: -9.81, worldScale: 1, fixedTimeStep: 1 / 60, maxSubSteps: 5 },
    audio: { masterVolume: 1.0, musicVolume: 0.8, sfxVolume: 0.9, spatialAudio: false },
    ui: { theme: 'dark', fontSize: 16, showFPS: false, showDebug: false },
    debug: { showColliders: false, showStats: false, logPhysics: false, logPerformance: false },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    game = new Game(mockConfig);
  });

  afterEach(() => {
    // Route the FSM back to menu through valid transitions so each test
    // starts from a clean state.
    let state = game.getGameState();
    if (state === 'playing') {
      game.gameOver();
      state = game.getGameState();
    }
    if (state === 'gameOver') {
      game.restart();
      state = game.getGameState();
    }
    if (state === 'restart' || state === 'paused') {
      game.stop();
    }
  });

  it('starts in menu state', () => {
    expect(game.getGameState()).toBe('menu');
    expect(game.isGameRunning()).toBe(false);
  });

  it('start() transitions menu -> playing', () => {
    game.start();
    expect(game.getGameState()).toBe('playing');
    expect(game.isGameRunning()).toBe(true);
  });

  it('start() is blocked when already playing', () => {
    game.start();
    game.start(); // second call: blocked by FSM
    expect(game.getGameState()).toBe('playing');
  });

  it('pause() transitions playing -> paused', () => {
    game.start();
    game.pause();
    expect(game.getGameState()).toBe('paused');
    expect(game.isGameRunning()).toBe(false);
  });

  it('pause() is blocked from menu (no state change)', () => {
    game.pause();
    expect(game.getGameState()).toBe('menu');
  });

  it('resume() transitions paused -> playing', () => {
    game.start();
    game.pause();
    game.resume();
    expect(game.getGameState()).toBe('playing');
    expect(game.isGameRunning()).toBe(true);
  });

  it('resume() from menu transitions to playing (menu->playing is valid)', () => {
    game.resume();
    expect(game.getGameState()).toBe('playing');
  });

  it('stop() from paused returns to menu', () => {
    game.start();
    game.pause();
    game.stop();
    expect(game.getGameState()).toBe('menu');
    expect(game.isGameRunning()).toBe(false);
  });

  it('gameOver() transitions playing -> gameOver', () => {
    game.start();
    game.gameOver();
    expect(game.getGameState()).toBe('gameOver');
  });

  it('gameOver() is blocked from menu (no state change)', () => {
    game.gameOver();
    expect(game.getGameState()).toBe('menu');
  });

  it('restart() transitions gameOver -> restart', () => {
    game.start();
    game.gameOver();
    game.restart();
    expect(game.getGameState()).toBe('restart');
  });

  it('restart() is blocked from playing (must reach gameOver first)', () => {
    game.start();
    expect(game.restart()).toBe(false);
    expect(game.getGameState()).toBe('playing');
  });

  it('emits game:state:change on every valid Game action', () => {
    const { listener, cleanup } = trackEvent('game:state:change');

    game.start(); // menu -> playing
    game.pause(); // playing -> paused
    game.resume(); // paused -> playing
    game.gameOver(); // playing -> gameOver
    game.restart(); // gameOver -> restart

    expect(listener.calls).toHaveLength(5);
    expect(listener.calls[0].detail).toEqual({ from: 'menu', to: 'playing' });
    expect(listener.calls[1].detail).toEqual({ from: 'playing', to: 'paused' });
    expect(listener.calls[2].detail).toEqual({ from: 'paused', to: 'playing' });
    expect(listener.calls[3].detail).toEqual({ from: 'playing', to: 'gameOver' });
    expect(listener.calls[4].detail).toEqual({ from: 'gameOver', to: 'restart' });

    cleanup();
  });

  it('canTransition() reflects the FSM table through Game', () => {
    expect(game.canTransition('playing')).toBe(true);
    expect(game.canTransition('paused')).toBe(false);
    game.start();
    expect(game.canTransition('paused')).toBe(true);
    expect(game.canTransition('gameOver')).toBe(true);
    expect(game.canTransition('restart')).toBe(false);
  });
});
