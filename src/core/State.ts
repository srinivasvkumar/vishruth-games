/**
 * Formal game state machine (W2-D.2 / TDD_PLAN.md Task 7.2)
 *
 * Replaces the ad-hoc isGameOver / isRunning flags scattered across
 * Game.ts and GameScene.ts with a single source of truth: a finite
 * state machine with an explicit transition table.
 *
 * States: menu -> playing -> paused -> gameOver -> restart
 *
 * Valid transition table:
 *   menu     -> playing
 *   playing  -> paused | gameOver
 *   paused   -> playing | menu
 *   gameOver -> restart
 *   restart  -> menu
 *
 * Invalid transitions are blocked: `transition()` returns false, the
 * current state is unchanged, and no event is emitted.
 *
 * Events (dispatched on `window`, synchronously):
 *   - 'game:state:change'  detail: { from: GameState, to: GameState }
 *     Emitted on every valid transition.
 *   - 'game:over' — re-emitted when the FSM enters gameOver, so UI
 *     listeners that registered on the legacy constant still fire.
 */
import { GameEvents } from '@/utils/Constants';

/** The five formal game states. */
export type GameState = 'menu' | 'playing' | 'paused' | 'gameOver' | 'restart';

/** Detail payload of the `game:state:change` CustomEvent. */
export interface StateChangeEventDetail {
  from: GameState;
  to: GameState;
}

/**
 * `game:state:change` CustomEvent. Typed via an interface (not the
 * `CustomEvent<Detail>` generic) so it composes with
 * `addEventListener(type, listener)` overloads in DOM lib versions that
 * lack a generic `CustomEvent<T>`.
 */
export interface StateChangeEvent extends Event {
  detail: StateChangeEventDetail;
}

/** All states, stable order. Used by tests to enumerate pairs. */
export const ALL_STATES: readonly GameState[] = [
  'menu',
  'playing',
  'paused',
  'gameOver',
  'restart',
];

/**
 * The complete transition table. This is the single source of truth for
 * what is legal — `canTransition` and `transition` both read from here.
 */
export const VALID_TRANSITIONS: Record<GameState, readonly GameState[]> = {
  menu: ['playing'],
  playing: ['paused', 'gameOver'],
  paused: ['playing', 'menu'],
  gameOver: ['restart'],
  restart: ['menu'],
};

export class GameStateMachine {
  private state: GameState;

  constructor(initial: GameState = 'menu') {
    if (!ALL_STATES.includes(initial)) {
      throw new Error(`Unknown game state: ${String(initial)}`);
    }
    this.state = initial;
  }

  /** Current state. */
  getState(): GameState {
    return this.state;
  }

  /** Whether `target` is a legal transition from the current state. */
  canTransition(target: GameState): boolean {
    return VALID_TRANSITIONS[this.state].includes(target);
  }

  /**
   * Attempt to transition to `target`.
   *
   * @returns true when the transition was valid and applied (and the
   *          `game:state:change` event was emitted); false when blocked
   *          (state unchanged, no event).
   */
  transition(target: GameState): boolean {
    if (!this.canTransition(target)) {
      return false;
    }

    const from = this.state;
    this.state = target;

    const event = new CustomEvent('game:state:change', {
      detail: { from, to: target },
    }) as StateChangeEvent;
    window.dispatchEvent(event);

    if (target === 'gameOver') {
      window.dispatchEvent(new CustomEvent(GameEvents.GAME_OVER));
    }

    return true;
  }
}
