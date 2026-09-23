/**
 * W3A.3 (kanban t_d2e9e91c) — Full MenuScene UI:
 * Title, START button (click + Enter/Space, preserve BUG-W2-1a behavior),
 * SETTINGS placeholder button (non-functional, "coming in W3-C" toast),
 * HIGH SCORES display (reads stored high score from LocalStorage),
 * basic keyboard focus / Tab navigation. Styled to match the dark
 * terminal theme.
 *
 * Scope (per card): this is the "full menu UI" deferred from W2-A.3 /
 * BUG-W2-1a. No audio settings, difficulty, or profile features.
 *
 * Strategy (matches tests/unit/menu-scene.test.ts convention):
 *   - 'three' mocked with importOriginal + stubbed WebGLRenderer
 *     (happy-dom cannot create a WebGL context; the Scene base class
 *     constructs one).
 *   - '@/utils/Logger' mocked (project convention).
 *   - Game dependency is a lightweight mock — MenuScene only calls
 *     game.switchScene.
 *
 * MenuScene is constructed DIRECTLY (new MenuScene(mockGame)), not via
 * the full initGame() chain. Lifecycle driven explicitly: load() ->
 * onLoad creates the menu DOM; enter() -> onEnter wires keydown + shows
 * the container; cleanup() -> onCleanup removes the DOM.
 *
 * HIGH SCORE source of truth: ScoreManager persists under
 * HIGH_SCORE_KEY ('cluster-rush-high-score') in localStorage. The menu
 * must read that same key so a high score set in a prior game session
 * is displayed when the menu is (re)entered.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MenuScene } from '@/scenes/MenuScene';
import { HIGH_SCORE_KEY } from '@/systems/Score';
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
  // W2-A.2: scenes now share Game's renderer (Scene.ts constructor calls
  // game.getRenderer().getRenderer()). Provide a mock with the same shape.
  const mockRendererInner = {
    render: vi.fn(),
    setSize: vi.fn(),
    clear: vi.fn(),
    dispose: vi.fn(),
  };
  const mockRendererWrapper = {
    getRenderer: () => mockRendererInner,
    resizeToContainer: vi.fn(),
  };
  
  return {
    getRenderer: vi.fn(() => mockRendererWrapper),
    switchScene: vi.fn().mockResolvedValue(undefined),
    isGameRunning: () => true,
    pause: vi.fn(),
    stop: vi.fn(),
    // W3-C.4: the menu now applies persisted settings to the live audio +
    // game-loop speed on onEnter(). Provide the surface points so the mock
    // doesn't throw on the new wiring.
    getAudioSystem: () => ({
      setMasterVolume: vi.fn(),
      setMusicVolume: vi.fn(),
      setSfxVolume: vi.fn(),
      isAvailable: () => true,
      init: () => Promise.resolve(),
      startMusic: vi.fn(),
      stopMusic: vi.fn(),
      cleanup: vi.fn(),
    }),
    setSpeedMultiplier: vi.fn(),
    getSpeedMultiplier: () => 1.0,
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
describe('W3A.3: Full MenuScene UI', () => {
  let game: MockGame;
  let menu: MenuScene;

  beforeEach(async () => {
    document.body.innerHTML = '';
    window.localStorage.removeItem(HIGH_SCORE_KEY);
    vi.clearAllMocks();
    game = createMockGame();
    menu = await bootMenuScene(game);
  });

  afterEach(() => {
    menu.cleanup();
    document.body.innerHTML = '';
    window.localStorage.removeItem(HIGH_SCORE_KEY);
    vi.restoreAllMocks();
  });

  it('renders a visible START button (preserves BUG-W2-1a)', () => {
    const container = document.getElementById('menu-container');
    expect(container).toBeTruthy();
    const start = document.getElementById('menu-start-button') as HTMLButtonElement;
    expect(start).toBeTruthy();
    expect(start!.textContent?.trim().toUpperCase()).toContain('START');
    expect(start!.disabled).toBe(false);
  });

  it('clicking START transitions to the game scene', () => {
    const start = document.getElementById('menu-start-button') as HTMLButtonElement;
    start!.click();
    expect(game.switchScene).toHaveBeenCalledTimes(1);
    expect(game.switchScene).toHaveBeenCalledWith('game');
  });

  it('pressing Enter still transitions to the game scene', () => {
    pressKey('Enter');
    expect(game.switchScene).toHaveBeenCalledTimes(1);
    expect(game.switchScene).toHaveBeenCalledWith('game');
  });

  it('pressing Space still transitions to the game scene', () => {
    pressKey(' ');
    expect(game.switchScene).toHaveBeenCalledTimes(1);
    expect(game.switchScene).toHaveBeenCalledWith('game');
  });

  it('renders a HIGH SCORES panel showing the stored high score', async () => {
    // Set the high score BEFORE booting the menu, so the onEnter read
    // (the real "menu shows the record from a prior session" contract)
    // picks it up. A prior game session persists the record under
    // HIGH_SCORE_KEY; re-entering the menu displays it.
    menu.cleanup();
    window.localStorage.setItem(HIGH_SCORE_KEY, '42');
    menu = await bootMenuScene(game);
    const panel = document.getElementById('menu-high-score') as HTMLElement;
    expect(panel).toBeTruthy();
    expect(panel!.textContent?.toUpperCase()).toContain('HIGH');
    expect(panel!.textContent).toContain('42');
  });

  it('HIGH SCORES panel shows 0 when no high score is stored', () => {
    window.localStorage.removeItem(HIGH_SCORE_KEY);
    const panel = document.getElementById('menu-high-score') as HTMLElement;
    expect(panel).toBeTruthy();
    expect(panel!.textContent).toContain('0');
  });

  it('refreshes the HIGH SCORES value when the menu is re-entered', async () => {
    // First enter: nothing stored -> 0.
    let panel = document.getElementById('menu-high-score') as HTMLElement;
    expect(panel!.textContent).toContain('0');
    // Simulate a game session writing a new high score, then re-enter.
    menu.exit();
    window.localStorage.setItem(HIGH_SCORE_KEY, '77');
    menu.enter();
    panel = document.getElementById('menu-high-score') as HTMLElement;
    expect(panel!.textContent).toContain('77');
  });

  it('clicking SETTINGS opens the settings panel (no scene transition)', () => {
    const settings = document.getElementById('menu-settings-button') as HTMLButtonElement;
    settings!.click();
    // W3-C.4: the SETTINGS button now opens the full settings panel instead of
    // showing the old "coming in W3-C" placeholder toast. It must NOT switch
    // scenes (no game transition from the settings button).
    const panel = document.getElementById('settings-panel') as HTMLElement;
    expect(panel).toBeTruthy();
    expect(panel!.style.display).not.toBe('none');
    expect(game.switchScene).not.toHaveBeenCalled();
  });

  // ── W3-A.7: start-guard re-arm after a full run (BUG-W2-1a) ──────────────
  //
  // After a full run (menu -> game -> death -> gameover -> RESTART -> menu),
  // the menu must be fully usable again: the START button enabled AND the
  // keydown Enter/Space path re-wired. Root cause (W3A6-FAIL.txt): startGame()
  // sets started=true and only resets it if switchScene REJECTS — in the
  // normal flow it resolves, so started stays true forever and onEnter()'s
  // 'if (!this.started)' re-arm guard never fires. The fix resets
  // started=false in onExit() so the next onEnter() re-arms.

  /**
   * Simulate the full run lifecycle at the MenuScene level:
   *   1. start via Enter (switchScene RESOLVES — the normal flow)
   *   2. exit the menu (what SceneManager does when the game scene loads)
   *   3. re-enter the menu (the RESTART path from GameOverScene)
   * Returns the start button + how many transitions fired so far.
   */
  function completeOneRunViaEnter(): { start: HTMLButtonElement; transitions: number } {
    pressKey('Enter');
    expect(game.switchScene).toHaveBeenCalledTimes(1);
    expect(game.switchScene).toHaveBeenCalledWith('game');
    // switchScene resolved — the game scene is now active.
    menu.exit();
    // Player dies, gameover scene shows, RESTART -> back to the menu.
    menu.enter();
    const start = document.getElementById('menu-start-button') as HTMLButtonElement;
    return { start, transitions: 1 };
  }

  it('re-arms the START button after returning to the menu following a resolved transition', () => {
    const { start } = completeOneRunViaEnter();
    expect(start).toBeTruthy();
    expect(
      start!.disabled,
      'START button must be ENABLED after returning to the menu (BUG-W2-1a re-arm)'
    ).toBe(false);
  });

  it('re-arms the keydown Enter path after returning to the menu', () => {
    completeOneRunViaEnter();
    // The second run must be startable via the keyboard again.
    pressKey('Enter');
    expect(game.switchScene).toHaveBeenCalledTimes(2);
    expect(game.switchScene).toHaveBeenLastCalledWith('game');
  });

  it('a second run starts via button click after returning to the menu', () => {
    const { start } = completeOneRunViaEnter();
    start!.click();
    expect(game.switchScene).toHaveBeenCalledTimes(2);
    expect(game.switchScene).toHaveBeenLastCalledWith('game');
    // A successful second dispatch re-locks the guard.
    expect(start!.disabled).toBe(true);
  });

  it('the double-start guard still holds mid-run (rapid double-Enter fires ONE transition)', () => {
    // Held-key auto-repeat / double-tap: two Enters back to back BEFORE the
    // menu exits must dispatch exactly one transition.
    pressKey('Enter');
    pressKey('Enter');
    expect(game.switchScene).toHaveBeenCalledTimes(1);
  });

  it('the double-start guard still holds mid-run (rapid double-click fires ONE transition)', () => {
    const start = document.getElementById('menu-start-button') as HTMLButtonElement;
    start!.click();
    start!.click(); // second click: button already disabled + guard set
    expect(game.switchScene).toHaveBeenCalledTimes(1);
  });

  it('re-arms after MULTIPLE full runs (loop stability)', () => {
    // Run 1: start via Enter, leave the menu, come back (1 transition).
    completeOneRunViaEnter();
    // Run 2: return to the menu and start via the button (2 transitions).
    menu.exit();
    menu.enter();
    const start = document.getElementById('menu-start-button') as HTMLButtonElement;
    start!.click(); // transition 2
    expect(game.switchScene).toHaveBeenCalledTimes(2);
    // Run 3: leave and come back again, start via Enter (3 transitions).
    menu.exit();
    menu.enter();
    pressKey('Enter'); // transition 3
    expect(game.switchScene).toHaveBeenCalledTimes(3);
    expect(game.switchScene).toHaveBeenLastCalledWith('game');
  });

  it('still re-arms when the transition REJECTS (BUG-W2-1a original contract preserved)', async () => {
    // The original guard: a failed switchScene (scene not registered) must
    // leave the menu reachable — started clears, listener re-attaches,
    // button re-enables. This must still hold after the onExit() fix.
    //
    // NOTE: a SECOND MenuScene (with its own DOM) coexists with the
    // describe-level menu (whose afterEach runs after this test), so every
    // lookup is scoped to THIS scene's #menu-container.
    const failingGame = createMockGame();
    failingGame.switchScene = vi.fn().mockRejectedValue(new Error('Scene not found: game'));
    const failingMenu = new MenuScene(failingGame as never);
    await failingMenu.load();
    failingMenu.enter();
    const containers = document.querySelectorAll('#menu-container');
    const container = containers[containers.length - 1]!;
    const start = container.querySelector('#menu-start-button') as HTMLButtonElement;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(start.disabled).toBe(true);
    // Let the rejection handler run (microtasks only — no timer in the
    // reject path).
    await new Promise((r) => setTimeout(r, 0));
    expect(start.disabled, 'button must be re-enabled after a rejected transition').toBe(false);
    // The menu is still live here (SceneManager fell back), so a retry works
    // WITHOUT exiting/re-entering.
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(failingGame.switchScene).toHaveBeenCalledTimes(2);
    failingMenu.cleanup();
  });

  it('START and SETTINGS buttons are keyboard-focusable in Tab order', () => {
    const start = document.getElementById('menu-start-button') as HTMLButtonElement;
    const settings = document.getElementById('menu-settings-button') as HTMLButtonElement;
    // Native buttons are tabbable (not disabled, no tabindex=-1).
    expect(start!.disabled).toBe(false);
    expect(settings!.disabled).toBe(false);
    // START comes before SETTINGS in DOM order (Tab order = document order).
    const container = document.getElementById('menu-container')!;
    const startIdx = Array.from(container.children).findIndex(
      (el) => el.id === 'menu-start-button' || (el.tagName === 'BUTTON' && (el.textContent ?? '').toUpperCase().includes('START'))
    );
    const settingsIdx = Array.from(container.children).findIndex(
      (el) => el.id === 'menu-settings-button' || (el.tagName === 'BUTTON' && (el.textContent ?? '').toUpperCase().includes('SETTINGS'))
    );
    expect(startIdx).toBeGreaterThanOrEqual(0);
    expect(settingsIdx).toBeGreaterThanOrEqual(0);
    expect(startIdx).toBeLessThan(settingsIdx);
  });
});
