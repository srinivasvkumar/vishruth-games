/**
 * BUG-W2-1a (kanban t_4298322b) — MenuScene player start path:
 * Enter/Space keydown + START button click -> this.game.switchScene('game'),
 * with a double-start guard and listener cleanup so the menu can be
 * re-entered.
 *
 * Scope (minimal, per card): the existing placeholder menu (title + hint,
 * W2-A.3) gains ONE START button and key wiring. Full menu UI (settings,
 * high scores, styled buttons) stays in W3 Task 8.2.
 *
 * Strategy (matches scenes.test.ts convention):
 *   - 'three' mocked with importOriginal + stubbed WebGLRenderer
 *     (happy-dom cannot create a WebGL context; the Scene base class
 *     constructs one).
 *   - '@/utils/Logger' mocked (project convention).
 *   - Game dependency is a lightweight mock — MenuScene only calls
 *     game.switchScene (and Logger otherwise).
 *
 * MenuScene is constructed DIRECTLY (new MenuScene(mockGame)), not via
 * the full initGame() chain: this file's RED surface is the start path
 * itself, and the minimal-menu behavior (placeholder DOM) is already
 * covered GREEN in scenes.test.ts W2-A.3.
 *
 * Lifecycle driven explicitly: load() -> onLoad creates the menu DOM;
 * enter() -> onEnter wires the keydown listener; exit() -> onExit
 * removes it; cleanup() -> onCleanup removes the DOM.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { MenuScene } from '@/scenes/MenuScene';
import { Logger } from '@/utils/Logger';

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
function createMockGame() {
  return {
    switchScene: vi.fn().mockResolvedValue(undefined),
    isGameRunning: () => true,
    pause: vi.fn(),
    stop: vi.fn(),
  };
}

type MockGame = ReturnType<typeof createMockGame>;

function pressKey(key: string): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key }));
}

/** Load + enter the scene so the menu DOM + key wiring are live. */
async function bootMenuScene(game: MockGame): Promise<MenuScene> {
  const menu = new MenuScene(game as unknown as import('@/core/Game').Game);
  await menu.load();
  menu.enter();
  return menu;
}

// --- Tests --------------------------------------------------------------------
describe('BUG-W2-1a: MenuScene player start path', () => {
  let game: MockGame;
  let menu: MenuScene;

  beforeEach(async () => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    game = createMockGame();
    menu = await bootMenuScene(game);
  });

  afterEach(() => {
    menu.cleanup();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('a visible START button exists in the menu container', () => {
    const container = document.getElementById('menu-container');
    expect(container).toBeTruthy();
    const button = container!.querySelector<HTMLButtonElement>(
      '#menu-start-button, button'
    );
    expect(button).toBeTruthy();
    expect(button!.textContent?.trim().toUpperCase()).toContain('START');
    expect(button!.disabled).toBe(false);
  });

  it('pressing Enter fires a transition to the game scene', () => {
    pressKey('Enter');
    expect(game.switchScene).toHaveBeenCalledTimes(1);
    expect(game.switchScene).toHaveBeenCalledWith('game');
  });

  it('pressing Space fires a transition to the game scene', () => {
    pressKey(' ');
    expect(game.switchScene).toHaveBeenCalledTimes(1);
    expect(game.switchScene).toHaveBeenCalledWith('game');
  });

  it('clicking the START button fires a transition to the game scene', () => {
    const container = document.getElementById('menu-container');
    const button = container!.querySelector<HTMLButtonElement>(
      '#menu-start-button, button'
    );
    button!.click();
    expect(game.switchScene).toHaveBeenCalledTimes(1);
    expect(game.switchScene).toHaveBeenCalledWith('game');
  });

  it('guards against double-start: repeat key presses do not re-fire after a transition', () => {
    pressKey('Enter');
    pressKey('Enter');
    pressKey(' ');
    expect(game.switchScene).toHaveBeenCalledTimes(1);
    expect(game.switchScene).toHaveBeenCalledWith('game');
    // The keydown listener must be removed after the first start, so a
    // key repeat (browser auto-repeat on held key) cannot re-fire.
    const container = document.getElementById('menu-container');
    const button = container!.querySelector<HTMLButtonElement>(
      '#menu-start-button, button'
    );
    // Button click path: the listener is gone, but the button is still
    // in the DOM — it must be disabled so a second click cannot re-fire.
    button!.click();
    expect(game.switchScene).toHaveBeenCalledTimes(1);
  });

  it('other keys do not trigger a transition', () => {
    pressKey('a');
    pressKey('Escape');
    pressKey('w');
    expect(game.switchScene).not.toHaveBeenCalled();
  });

  it('cleanup removes the keydown listener (menu can be re-entered)', async () => {
    menu.exit();
    menu.cleanup();
    // After cleanup the container is gone from the DOM.
    expect(document.getElementById('menu-container')).toBeNull();
    // Re-entering a fresh menu scene instance wires up independently.
    const fresh = await bootMenuScene(game);
    expect(game.switchScene).not.toHaveBeenCalled();
    pressKey('Enter');
    expect(game.switchScene).toHaveBeenCalledTimes(1);
    expect(game.switchScene).toHaveBeenCalledWith('game');
    fresh.cleanup();
  });
});
