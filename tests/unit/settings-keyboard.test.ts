/**
 * W4-B.8 (kanban t_b01c78d5) — Settings panel keyboard navigation:
 * Tab order + Arrow keys + Esc + Enter/Space activation.
 *
 * Covers the card's unit-test list:
 *   1. Tab order: Volume -> Speed -> Difficulty -> Controls(read-only) -> CLOSE.
 *   2. Arrow keys adjust the volume slider (Right/Up +, Left/Down -, clamp 0..100,
 *      persist to LocalStorage + live AudioSystem + label).
 *   3. Arrow keys cycle the speed / difficulty selectors (wraparound), selecting
 *      the newly-focused button (apply + persist + visual).
 *   4. Esc closes the panel and returns focus to the SETTINGS button.
 *   5. Enter/Space activates the focused control (window handler swallows
 *      Enter/Space while the panel is open; native activation via click still works).
 *   6. Arrow keys only act when a settings control is focused (no global hijack).
 *
 * Strategy (matches menu-scene-keyboard.test.ts + settings-panel.test.ts):
 *   - 'three' mocked with importOriginal + stubbed WebGLRenderer
 *   - '@/utils/Logger' mocked (project convention)
 *   - MenuScene constructed DIRECTLY (new MenuScene(mockGame))
 *   - Lifecycle: load() -> enter() -> [test] -> cleanup()
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MenuScene } from '@/scenes/MenuScene';
import { SETTINGS_STORAGE_KEY } from '@/systems/Settings';
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

/** Focus the settings control with the given id (must exist + be focusable). */
function focusById<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id) as T | null;
  expect(el, `control #${id} must exist`).toBeTruthy();
  el!.focus();
  expect(document.activeElement, `#${id} must be focusable`).toBe(el);
  return el!;
}

/** Read the persisted settings from LocalStorage. */
function readPersisted(): { volume: number; speed: number; difficulty: string } {
  const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
  expect(raw, 'settings must be persisted to LocalStorage').toBeTruthy();
  return JSON.parse(raw!);
}

// --- Tests --------------------------------------------------------------------

describe('W4-B.8: Settings panel keyboard navigation', () => {
  let game: MockGame;
  let menu: MenuScene;

  beforeEach(async () => {
    document.body.innerHTML = '';
    window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
    vi.clearAllMocks();
    game = createMockGame();
    menu = await bootMenuScene(game);
  });

  afterEach(() => {
    menu.cleanup();
    document.body.innerHTML = '';
    window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
    vi.restoreAllMocks();
  });

  // ── 1. Tab order ──────────────────────────────────────────────────────────

  it('Tab order inside the panel: Volume -> Speed -> Difficulty -> Controls -> CLOSE', () => {
    openSettingsPanel();
    const panel = document.getElementById('settings-panel')!;
    const focusables = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'button, input[type=range], [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute('disabled'));
    const order = focusables.map((el) => {
      const id = el.id || '';
      if (id.startsWith('settings-volume')) return 'volume';
      if (id.startsWith('settings-speed')) return 'speed';
      if (id.startsWith('settings-difficulty')) return 'difficulty';
      if (id.startsWith('settings-controls')) return 'controls';
      if (id === 'settings-close-button') return 'close';
      return 'other';
    });
    // First control is volume, last is close.
    expect(order[0]).toBe('volume');
    expect(order[order.length - 1]).toBe('close');
    // Volume < Speed < Difficulty < Controls < Close in the focus order.
    const firstOf = (section: string) => order.indexOf(section);
    expect(firstOf('volume')).toBeLessThan(firstOf('speed'));
    expect(firstOf('speed')).toBeLessThan(firstOf('difficulty'));
    expect(firstOf('difficulty')).toBeLessThan(firstOf('controls'));
    expect(firstOf('controls')).toBeLessThan(firstOf('close'));
    // No stray 'other' control leaks into the focus order.
    expect(order).not.toContain('other');
  });

  it('opening the panel focuses the volume slider (first control)', () => {
    openSettingsPanel();
    const slider = document.getElementById('settings-volume-slider');
    expect(document.activeElement, 'focus must start on the volume slider').toBe(slider);
  });

  it('the Controls section is a read-only focus stop (tabindex, not a button)', () => {
    openSettingsPanel();
    const controlsText = document.getElementById(
      'settings-controls-text'
    ) as HTMLElement;
    expect(controlsText, 'controls text must exist').toBeTruthy();
    expect(
      controlsText!.getAttribute('tabindex'),
      'controls text must be a Tab stop'
    ).not.toBeNull();
    // It is not an interactive control — no click handler semantics, just a
    // focus stop. Verify it is not a button/input.
    expect(controlsText!.tagName).not.toBe('BUTTON');
    expect(controlsText!.tagName).not.toBe('INPUT');
  });

  // ── 2. Arrow keys adjust the volume slider ───────────────────────────────

  it('ArrowRight increases the volume slider value (step +1) and persists it', () => {
    openSettingsPanel();
    const slider = focusById<HTMLInputElement>('settings-volume-slider');
    slider.value = '50';
    pressKey('ArrowRight');
    expect(slider.value, 'ArrowRight must raise volume by one step').toBe('51');
    expect(readPersisted().volume).toBe(51);
  });

  it('ArrowLeft decreases the volume slider value (step -1) and persists it', () => {
    openSettingsPanel();
    const slider = focusById<HTMLInputElement>('settings-volume-slider');
    slider.value = '50';
    pressKey('ArrowLeft');
    expect(slider.value, 'ArrowLeft must lower volume by one step').toBe('49');
    expect(readPersisted().volume).toBe(49);
  });

  it('ArrowUp / ArrowDown also adjust the volume slider', () => {
    openSettingsPanel();
    const slider = focusById<HTMLInputElement>('settings-volume-slider');
    slider.value = '50';
    pressKey('ArrowUp');
    expect(slider.value).toBe('51');
    pressKey('ArrowDown');
    expect(slider.value).toBe('50');
  });

  it('volume slider clamps at 0 and 100', () => {
    openSettingsPanel();
    const slider = focusById<HTMLInputElement>('settings-volume-slider');
    slider.value = '0';
    pressKey('ArrowLeft');
    expect(slider.value, 'cannot go below 0').toBe('0');
    slider.value = '100';
    pressKey('ArrowRight');
    expect(slider.value, 'cannot exceed 100').toBe('100');
  });

  it('adjusting volume with arrows updates the AudioSystem master volume', () => {
    openSettingsPanel();
    const slider = focusById<HTMLInputElement>('settings-volume-slider');
    const setMaster = game.getAudioSystem().setMasterVolume as unknown as ReturnType<typeof vi.fn>;
    setMaster.mockClear();
    slider.value = '30';
    pressKey('ArrowRight'); // -> 31
    expect(setMaster, 'audio master volume must update on arrow adjust').toHaveBeenCalled();
    const lastArg = setMaster.mock.calls[setMaster.mock.calls.length - 1][0];
    expect(lastArg).toBeCloseTo(0.31, 5);
  });

  it('adjusting volume with arrows updates the volume label', () => {
    openSettingsPanel();
    const slider = focusById<HTMLInputElement>('settings-volume-slider');
    slider.value = '50';
    pressKey('ArrowRight');
    const label = document.getElementById('settings-volume-label');
    expect(label?.textContent, 'label must reflect the new volume').toBe('51');
  });

  // ── 3. Arrow keys cycle the speed / difficulty selectors ─────────────────

  it('ArrowRight cycles to the next speed option and selects it', () => {
    openSettingsPanel();
    const speed1 = focusById<HTMLButtonElement>('settings-speed-1');
    pressKey('ArrowRight');
    const speed15 = document.getElementById(
      'settings-speed-1.5'
    ) as HTMLButtonElement;
    expect(document.activeElement, 'focus must move to the next speed').toBe(speed15);
    expect(
      speed15.getAttribute('aria-pressed'),
      'next speed must be selected'
    ).toBe('true');
    expect(game.getSpeedMultiplier()).toBe(1.5);
    expect(readPersisted().speed).toBe(1.5);
    // Previous speed must no longer be selected.
    expect(speed1.getAttribute('aria-pressed')).toBe('false');
  });

  it('ArrowLeft cycles to the previous speed option and selects it', () => {
    openSettingsPanel();
    focusById<HTMLButtonElement>('settings-speed-1.5');
    pressKey('ArrowLeft');
    const speed1 = document.getElementById('settings-speed-1');
    expect(document.activeElement).toBe(speed1);
    expect((speed1 as HTMLButtonElement).getAttribute('aria-pressed')).toBe('true');
    expect(game.getSpeedMultiplier()).toBe(1);
    expect(readPersisted().speed).toBe(1);
  });

  it('speed cycling wraps around at both ends', () => {
    openSettingsPanel();
    // From the lowest (0.5), ArrowLeft wraps to the highest (2).
    focusById<HTMLButtonElement>('settings-speed-0.5');
    pressKey('ArrowLeft');
    const speed2 = document.getElementById('settings-speed-2');
    expect(document.activeElement).toBe(speed2);
    expect(game.getSpeedMultiplier()).toBe(2);
    // From the highest (2), ArrowRight wraps to the lowest (0.5).
    pressKey('ArrowRight');
    const speed05 = document.getElementById('settings-speed-0.5');
    expect(document.activeElement).toBe(speed05);
    expect(game.getSpeedMultiplier()).toBe(0.5);
  });

  it('ArrowRight cycles to the next difficulty option and selects it', () => {
    openSettingsPanel();
    focusById<HTMLButtonElement>('settings-difficulty-easy');
    pressKey('ArrowRight');
    const normal = document.getElementById('settings-difficulty-normal');
    expect(document.activeElement).toBe(normal);
    expect((normal as HTMLButtonElement).getAttribute('aria-pressed')).toBe('true');
    expect(readPersisted().difficulty).toBe('normal');
  });

  it('difficulty cycling wraps around at both ends', () => {
    openSettingsPanel();
    // From hard, ArrowRight wraps to easy.
    focusById<HTMLButtonElement>('settings-difficulty-hard');
    pressKey('ArrowRight');
    const easy = document.getElementById('settings-difficulty-easy');
    expect(document.activeElement).toBe(easy);
    expect(readPersisted().difficulty).toBe('easy');
    // From easy, ArrowLeft wraps to hard.
    pressKey('ArrowLeft');
    const hard = document.getElementById('settings-difficulty-hard');
    expect(document.activeElement).toBe(hard);
    expect(readPersisted().difficulty).toBe('hard');
  });

  // ── 4. Esc closes the panel + returns focus to SETTINGS ──────────────────

  it('Esc closes the settings panel', () => {
    openSettingsPanel();
    pressKey('Escape');
    const panel = document.getElementById('settings-panel');
    expect(panel?.style.display, 'panel must be hidden after Esc').toBe('none');
  });

  it('Esc returns focus to the SETTINGS button', () => {
    openSettingsPanel();
    pressKey('Escape');
    const settings = document.getElementById('menu-settings-button');
    expect(
      document.activeElement,
      'focus must return to the SETTINGS button after Esc'
    ).toBe(settings);
  });

  it('after Esc, focus is on SETTINGS and the panel is closed (full cycle)', () => {
    openSettingsPanel();
    pressKey('Escape');
    expect(document.getElementById('settings-panel')?.style.display).toBe('none');
    const settings = document.getElementById('menu-settings-button');
    expect(document.activeElement).toBe(settings);
  });

  // ── 5. Enter/Space activate the focused control ───────────────────────────

  it('Enter/Space do NOT fire the START transition while the panel is open', () => {
    openSettingsPanel();
    pressKey('Enter');
    pressKey(' ');
    expect(game.switchScene, 'no transition when panel is open').not.toHaveBeenCalled();
  });

  it('clicking the focused speed button selects that speed (native activation)', () => {
    openSettingsPanel();
    const speed2 = focusById<HTMLButtonElement>('settings-speed-2');
    speed2.click();
    expect(game.getSpeedMultiplier()).toBe(2);
    expect(readPersisted().speed).toBe(2);
  });

  // ── 6. Arrow keys only act when a settings control is focused ────────────

  it('arrow keys do nothing when no settings control is focused (no global hijack)', () => {
    openSettingsPanel();
    // Move focus OFF the settings controls onto the SETTINGS button.
    const settings = document.getElementById(
      'menu-settings-button'
    ) as HTMLButtonElement;
    settings.focus();
    const slider = document.getElementById(
      'settings-volume-slider'
    ) as HTMLInputElement;
    const speed1 = document.getElementById(
      'settings-speed-1'
    ) as HTMLButtonElement;
    const speed15 = document.getElementById(
      'settings-speed-1.5'
    ) as HTMLButtonElement;
    const before = slider.value;
    pressKey('ArrowRight');
    expect(
      slider.value,
      'volume must not change when a non-settings control is focused'
    ).toBe(before);
    expect(
      document.activeElement,
      'focus must not jump to a speed button'
    ).not.toBe(speed15);
    expect(speed15.getAttribute('aria-pressed')).not.toBe('true');
  });
});
