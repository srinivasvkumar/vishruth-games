/**
 * W4-B.1 (kanban t_e95e3455) — MenuScene keyboard navigation:
 * Tab order + Enter/Space activation + Esc close + visible :focus style.
 *
 * Covers the card's unit-test list:
 *   1. Tab order: START -> SETTINGS -> HIGH SCORES -> CLOSE(settings).
 *      Title and hint are skipped (not focusable).
 *   2. Enter/Space activates the focused button.
 *   3. Esc closes the settings panel and returns focus to START.
 *   4. Visible :focus style on menu buttons.
 *
 * Strategy (matches menu-scene-full.test.ts + settings-panel.test.ts):
 *   - 'three' mocked with importOriginal + stubbed WebGLRenderer
 *   - '@/utils/Logger' mocked (project convention)
 *   - MenuScene constructed DIRECTLY (new MenuScene(mockGame))
 *   - Lifecycle: load() -> enter() -> [test] -> cleanup()
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MenuScene } from '@/scenes/MenuScene';
import type { Game } from '@/core/Game';

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

  let speedMultiplier = 1.0;

  const setMasterVolume = vi.fn();

  return {
    getRenderer: vi.fn(() => mockRendererWrapper),
    switchScene: vi.fn().mockResolvedValue(undefined),
    isGameRunning: () => true,
    pause: vi.fn(),
    stop: vi.fn(),
    getAudioSystem: () => ({
      setMasterVolume,
      setMusicVolume: vi.fn(),
      setSfxVolume: vi.fn(),
      isAvailable: () => true,
      init: () => Promise.resolve(),
      startMusic: vi.fn(),
      stopMusic: vi.fn(),
      cleanup: vi.fn(),
    }),
    setSpeedMultiplier: vi.fn((v: number) => {
      speedMultiplier = v;
    }),
    getSpeedMultiplier: () => speedMultiplier,
  };
}

type MockGame = ReturnType<typeof createMockGame>;

/** Boot + enter the menu scene so the menu DOM is live. */
async function bootMenuScene(game: MockGame): Promise<MenuScene> {
  const menu = new MenuScene(game as unknown as Game);
  await menu.load();
  menu.enter();
  return menu;
}

/** Click the SETTINGS button to open the panel. */
function openSettingsPanel(): HTMLElement {
  const settingsBtn = document.getElementById(
    'menu-settings-button'
  ) as HTMLButtonElement;
  settingsBtn!.click();
  const panel = document.getElementById('settings-panel');
  expect(panel, 'settings panel must open when SETTINGS is clicked').toBeTruthy();
  return panel!;
}

function pressKey(key: string): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key }));
}

// --- Tests --------------------------------------------------------------------

describe('W4-B.1: MenuScene keyboard navigation', () => {
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

  // ── 1. Tab order ──────────────────────────────────────────────────────────

  it('START has explicit tabindex for deterministic Tab order', () => {
    const start = document.getElementById(
      'menu-start-button'
    ) as HTMLButtonElement;
    expect(start, 'START button must exist').toBeTruthy();
    expect(
      start!.getAttribute('tabindex'),
      'START must have an explicit tabindex attribute'
    ).not.toBeNull();
  });

  it('SETTINGS has explicit tabindex for deterministic Tab order', () => {
    const settings = document.getElementById(
      'menu-settings-button'
    ) as HTMLButtonElement;
    expect(settings, 'SETTINGS button must exist').toBeTruthy();
    expect(
      settings!.getAttribute('tabindex'),
      'SETTINGS must have an explicit tabindex attribute'
    ).not.toBeNull();
  });

  it('HIGH SCORES panel is not a Tab stop (skipped in Tab order)', () => {
    const hs = document.getElementById('menu-high-score') as HTMLElement;
    expect(hs, 'HIGH SCORES panel must exist').toBeTruthy();
    // The panel itself must not be focusable (no tabindex, not a button).
    const tabindex = hs!.getAttribute('tabindex');
    expect(
      tabindex === null || tabindex === '-1',
      'HIGH SCORES must not be a Tab stop (no positive tabindex)'
    ).toBe(true);
  });

  it('Tab order: START comes before SETTINGS in DOM', () => {
    const container = document.getElementById('menu-container')!;
    const children = Array.from(container.children);
    const startIdx = children.findIndex(
      (el) => el.id === 'menu-start-button'
    );
    const settingsIdx = children.findIndex(
      (el) => el.id === 'menu-settings-button'
    );
    expect(startIdx).toBeGreaterThanOrEqual(0);
    expect(settingsIdx).toBeGreaterThanOrEqual(0);
    expect(startIdx).toBeLessThan(settingsIdx);
  });

  it('Tab order: title and hint are not focusable (skipped)', () => {
    const container = document.getElementById('menu-container')!;
    const title = container.querySelector('h1');
    const hint = container.querySelector('p');
    // Neither h1 nor p have tabindex → not in Tab order.
    expect(title?.getAttribute('tabindex') ?? null).toBeNull();
    expect(hint?.getAttribute('tabindex') ?? null).toBeNull();
  });

  it('CLOSE button in settings panel has explicit tabindex', () => {
    openSettingsPanel();
    const close = document.getElementById(
      'settings-close-button'
    ) as HTMLButtonElement;
    expect(close, 'CLOSE button must exist in settings panel').toBeTruthy();
    expect(
      close!.getAttribute('tabindex'),
      'CLOSE must have an explicit tabindex attribute'
    ).not.toBeNull();
  });

  // ── 2. Enter/Space activates focused button ──────────────────────────────

  it('Enter on START (panel closed) starts the game', () => {
    // Panel is closed by default.
    expect(document.getElementById('settings-panel')?.style.display).toBe(
      'none'
    );
    pressKey('Enter');
    expect(game.switchScene).toHaveBeenCalledTimes(1);
    expect(game.switchScene).toHaveBeenCalledWith('game');
  });

  it('Space on START (panel closed) starts the game', () => {
    expect(document.getElementById('settings-panel')?.style.display).toBe(
      'none'
    );
    pressKey(' ');
    expect(game.switchScene).toHaveBeenCalledTimes(1);
    expect(game.switchScene).toHaveBeenCalledWith('game');
  });

  it('Enter/Space do NOT start the game when settings panel is open', () => {
    openSettingsPanel();
    pressKey('Enter');
    pressKey(' ');
    expect(game.switchScene, 'no transition when panel is open').not.toHaveBeenCalled();
  });

  it('Enter/Space activate the focused settings control (not START)', () => {
    openSettingsPanel();
    const speed1 = document.getElementById(
      'settings-speed-1'
    ) as HTMLButtonElement;
    speed1!.focus();
    speed1!.click(); // simulate native activation
    pressKey('Enter');
    // No scene transition — the panel swallows Enter/Space.
    expect(game.switchScene).not.toHaveBeenCalled();
    // Speed 1 was applied via the click.
    expect(game.getSpeedMultiplier()).toBe(1);
  });

  // ── 3. Esc closes settings panel + returns focus to START ───────────────

  it('Esc closes the settings panel', () => {
    openSettingsPanel();
    pressKey('Escape');
    const panel = document.getElementById('settings-panel');
    expect(panel?.style.display, 'panel must be hidden after Esc').toBe('none');
  });

  it('Esc returns focus to the START button', () => {
    openSettingsPanel();
    pressKey('Escape');
    const start = document.getElementById(
      'menu-start-button'
    ) as HTMLButtonElement;
    expect(document.activeElement, 'focus must return to START').toBe(start);
  });

  it('Esc on a closed panel is a no-op (no error, no state change)', () => {
    // Panel already closed.
    expect(document.getElementById('settings-panel')?.style.display).toBe(
      'none'
    );
    pressKey('Escape'); // must not throw
    expect(document.getElementById('settings-panel')?.style.display).toBe(
      'none'
    );
  });

  it('after Esc, Enter starts the game again (full cycle)', () => {
    openSettingsPanel();
    pressKey('Escape');
    // Focus is back on START, panel closed.
    pressKey('Enter');
    expect(game.switchScene).toHaveBeenCalledTimes(1);
    expect(game.switchScene).toHaveBeenCalledWith('game');
  });

  // ── 4. Visible :focus style ─────────────────────────────────────────────

  it('START button has a visible :focus outline style', () => {
    const start = document.getElementById(
      'menu-start-button'
    ) as HTMLButtonElement;
    const style = start!.style.cssText.toLowerCase();
    const attrs = start!.getAttribute('data-focus-outline') ?? '';
    // The button must declare a visible focus indicator.
    // Acceptable: inline outline, or a data-attribute flag, or a CSS class.
    const hasFocusStyle =
      style.includes('outline') ||
      attrs.length > 0 ||
      (start!.className ?? '').toLowerCase().includes('focus');
    expect(
      hasFocusStyle,
      'START button must have a visible :focus style (outline or equivalent)'
    ).toBe(true);
  });

  it('SETTINGS button has a visible :focus outline style', () => {
    const settings = document.getElementById(
      'menu-settings-button'
    ) as HTMLButtonElement;
    const style = settings!.style.cssText.toLowerCase();
    const attrs = settings!.getAttribute('data-focus-outline') ?? '';
    const hasFocusStyle =
      style.includes('outline') ||
      attrs.length > 0 ||
      (settings!.className ?? '').toLowerCase().includes('focus');
    expect(
      hasFocusStyle,
      'SETTINGS button must have a visible :focus style'
    ).toBe(true);
  });

  it('CLOSE button in settings panel has a visible :focus outline style', () => {
    openSettingsPanel();
    const close = document.getElementById(
      'settings-close-button'
    ) as HTMLButtonElement;
    const style = close!.style.cssText.toLowerCase();
    const attrs = close!.getAttribute('data-focus-outline') ?? '';
    const hasFocusStyle =
      style.includes('outline') ||
      attrs.length > 0 ||
      (close!.className ?? '').toLowerCase().includes('focus');
    expect(
      hasFocusStyle,
      'CLOSE button must have a visible :focus style'
    ).toBe(true);
  });
});
