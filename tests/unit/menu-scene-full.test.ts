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

  it('renders a SETTINGS button that does not transition the scene', () => {
    const settings = document.getElementById('menu-settings-button') as HTMLButtonElement;
    expect(settings).toBeTruthy();
    expect(settings!.textContent?.trim().toUpperCase()).toContain('SETTINGS');
    settings!.click();
    // Non-functional placeholder: must NOT switch scenes.
    expect(game.switchScene).not.toHaveBeenCalled();
  });

  it('clicking SETTINGS shows a "coming in W3-C" toast (no crash)', () => {
    const settings = document.getElementById('menu-settings-button') as HTMLButtonElement;
    settings!.click();
    const toast = document.getElementById('menu-settings-toast') as HTMLElement;
    expect(toast).toBeTruthy();
    expect(toast!.textContent?.toLowerCase()).toContain('coming in w3-c');
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
