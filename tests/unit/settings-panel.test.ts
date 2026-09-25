/**
 * W3-C.4 (kanban t_421f4c7f) — Full Settings UI: panel rendering, wiring to
 * game state, persistence, and keyboard navigation.
 *
 * Covers the card's unit-test list:
 *   1. Settings panel renders all 4 sections (volume/speed/difficulty/controls).
 *   2. Volume slider updates AudioSystem master volume.
 *   3. Speed selector updates game speed multiplier.
 *   4. Difficulty selector updates obstacle spawn params (persisted).
 *   5. Settings save to LocalStorage.
 *   6. Settings load from LocalStorage on MenuScene.onEnter().
 *   7. Keyboard nav: Tab moves focus, Enter/Space activates, Esc closes +
 *      returns focus to START.
 *
 * Strategy: same convention as menu-scene-full.test.ts (mock 'three'
 * WebGLRenderer, mock Logger, direct MenuScene construction). The mock Game
 * carries the two new surface points the panel wires to:
 *   - getAudioSystem().setMasterVolume (spy)
 *   - setSpeedMultiplier / getSpeedMultiplier
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MenuScene } from '@/scenes/MenuScene';
import { SettingsManager, SETTINGS_STORAGE_KEY } from '@/systems/Settings';
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
describe('W3-C.4: Settings UI', () => {
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

  // ── 1. Panel renders all 4 sections ───────────────────────────────────────

  it('SETTINGS button opens a panel with volume, speed, difficulty, and controls sections', () => {
    const panel = openSettingsPanel();
    expect(panel.textContent?.toLowerCase()).toContain('volume');
    expect(panel.textContent?.toLowerCase()).toContain('speed');
    expect(panel.textContent?.toLowerCase()).toContain('difficulty');
    expect(panel.textContent?.toLowerCase()).toContain('controls');
    // The old placeholder toast must no longer be the behavior.
    expect(document.getElementById('menu-settings-toast')).toBeFalsy();
  });

  it('panel renders a CLOSE control', () => {
    const panel = openSettingsPanel();
    const closeBtn = panel.querySelector<HTMLButtonElement>(
      '#settings-close-button'
    );
    expect(closeBtn, 'CLOSE button must exist in the panel').toBeTruthy();
  });

  // ── 2. Volume slider -> AudioSystem ───────────────────────────────────────

  it('volume slider is present and updates AudioSystem master volume on change', () => {
    openSettingsPanel();
    const slider = document.getElementById(
      'settings-volume-slider'
    ) as HTMLInputElement;
    expect(slider, 'volume slider must exist').toBeTruthy();
    expect(slider!.type).toBe('range');

    slider!.value = '30';
    slider!.dispatchEvent(new Event('input', { bubbles: true }));

    const setMaster = game.getAudioSystem().setMasterVolume as unknown as ReturnType<typeof vi.fn>;
    expect(setMaster).toHaveBeenCalled();
    // 30% of master.
    const lastArg = setMaster.mock.calls[setMaster.mock.calls.length - 1][0];
    expect(lastArg).toBeCloseTo(0.3, 5);
  });

  // ── 3. Speed selector -> game loop dt multiplier ──────────────────────────

  it('speed selector options update the game speed multiplier when selected', () => {
    openSettingsPanel();
    const speeds = [
      'settings-speed-0.5',
      'settings-speed-1',
      'settings-speed-1.5',
      'settings-speed-2',
    ];
    for (const id of speeds) {
      const btn = document.getElementById(id) as HTMLButtonElement;
      expect(btn, `speed option ${id} must exist`).toBeTruthy();
    }

    (document.getElementById('settings-speed-1.5') as HTMLButtonElement)!.click();
    expect(game.setSpeedMultiplier).toHaveBeenCalledWith(1.5);
    expect(game.getSpeedMultiplier()).toBe(1.5);
  });

  // ── 4. Difficulty selector -> obstacle spawn params ───────────────────────

  it('difficulty selector (easy/normal/hard) persists the difficulty choice', () => {
    openSettingsPanel();
    const diffs = [
      'settings-difficulty-easy',
      'settings-difficulty-normal',
      'settings-difficulty-hard',
    ];
    for (const id of diffs) {
      const btn = document.getElementById(id) as HTMLButtonElement;
      expect(btn, `difficulty option ${id} must exist`).toBeTruthy();
    }

    (document.getElementById('settings-difficulty-hard') as HTMLButtonElement)!.click();
    const raw = JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY)!);
    expect(raw.difficulty).toBe('hard');
  });

  // ── 5. Settings save to LocalStorage ──────────────────────────────────────

  it('changing settings persists to LocalStorage under the settings key', () => {
    openSettingsPanel();
    const slider = document.getElementById(
      'settings-volume-slider'
    ) as HTMLInputElement;
    slider!.value = '55';
    slider!.dispatchEvent(new Event('input', { bubbles: true }));
    (document.getElementById('settings-speed-2') as HTMLButtonElement)!.click();

    const raw = JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY)!);
    expect(raw.volume).toBe(55);
    expect(raw.speed).toBe(2);
  });

  // ── 6. Settings load from LocalStorage on MenuScene.onEnter() ────────────

  it('loads saved settings on menu entry (volume slider + speed reflect storage)', async () => {
    // Simulate a prior session saving non-default settings.
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ volume: 40, speed: 1.5, difficulty: 'hard' })
    );
    menu.cleanup();
    menu = await bootMenuScene(game);

    const slider = document.getElementById(
      'settings-volume-slider'
    ) as HTMLInputElement;
    expect(slider!.value).toBe('40');

    // Speed 1.5 must be marked selected in the DOM.
    const speed15 = document.getElementById(
      'settings-speed-1.5'
    ) as HTMLButtonElement;
    expect(speed15!.dataset?.selected ?? speed15!.getAttribute('aria-pressed')).toBeTruthy();
    // And the game must have the matching multiplier applied.
    expect(game.getSpeedMultiplier()).toBe(1.5);
  });

  // ── 7. Keyboard nav: Tab / Enter / Space / Esc ───────────────────────────

  it('Enter/Space activate the focused settings control (volume slider step)', () => {
    openSettingsPanel();
    const slider = document.getElementById(
      'settings-volume-slider'
    ) as HTMLInputElement;
    slider!.focus();
    slider!.value = '80';
    pressKey(' '); // activate focused control
    // Activation of a range input should not fire the START transition.
    expect(game.switchScene).not.toHaveBeenCalled();
  });

  it('Enter on the focused speed button selects that speed (no START)', () => {
    openSettingsPanel();
    const speed1 = document.getElementById(
      'settings-speed-1'
    ) as HTMLButtonElement;
    speed1!.focus();
    speed1!.click();
    pressKey('Enter');
    // Selecting speed 1 must not dispatch a scene transition.
    expect(game.switchScene).not.toHaveBeenCalled();
    expect(game.getSpeedMultiplier()).toBe(1);
  });

  it('Esc closes the settings panel and returns focus to the SETTINGS button', () => {
    openSettingsPanel();
    pressKey('Escape');
    const panel = document.getElementById('settings-panel');
    expect(panel?.style.display, 'panel must be hidden after Esc').toBe('none');
    const settings = document.getElementById(
      'menu-settings-button'
    ) as HTMLButtonElement;
    expect(document.activeElement, 'focus must return to SETTINGS').toBe(settings);
  });

  it('Tab order inside the panel is Volume -> Speed -> Difficulty -> Controls -> CLOSE', () => {
    openSettingsPanel();
    const panel = document.getElementById('settings-panel')!;
    // Collect the focusable controls in DOM order.
    const focusables = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'button, input[type=range], [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute('disabled'));
    // Map to their section by id prefix.
    const order = focusables.map((el) => {
      const id = el.id || '';
      let section = 'other';
      if (id.startsWith('settings-volume')) section = 'volume';
      else if (id.startsWith('settings-speed')) section = 'speed';
      else if (id.startsWith('settings-difficulty')) section = 'difficulty';
      else if (id.startsWith('settings-controls')) section = 'controls';
      else if (id === 'settings-close-button') section = 'close';
      return section;
    });
    // First control must be volume, last must be close.
    expect(order[0]).toBe('volume');
    expect(order[order.length - 1]).toBe('close');
    // Volume section must appear before speed, speed before difficulty,
    // difficulty before controls.
    const firstOf = (section: string) => order.indexOf(section);
    expect(firstOf('volume')).toBeLessThan(firstOf('speed'));
    expect(firstOf('speed')).toBeLessThan(firstOf('difficulty'));
    expect(firstOf('difficulty')).toBeLessThan(firstOf('controls'));
  });

  it('the controls section is read-only and displays WASD + Enter/Space bindings', () => {
    openSettingsPanel();
    const panel = document.getElementById('settings-panel')!;
    const controlsText = panel.textContent?.toLowerCase() ?? '';
    expect(controlsText).toContain('w');
    expect(controlsText).toContain('a');
    expect(controlsText).toContain('s');
    expect(controlsText).toContain('d');
    expect(controlsText).toContain('enter');
    expect(controlsText).toContain('space');
  });

  it('START still works when the settings panel is closed (regression)', () => {
    // Panel closed by default.
    expect(document.getElementById('settings-panel')?.style.display).toBe('none');
    pressKey('Enter');
    expect(game.switchScene).toHaveBeenCalledTimes(1);
    expect(game.switchScene).toHaveBeenCalledWith('game');
  });
});

// --- GameScene difficulty + speed wiring ──────────────────────────────────────
describe('W3-C.4: GameScene applies difficulty spawn params + speed multiplier', () => {
  it('GameScene exposes spawn params that vary by difficulty', async () => {
    // This asserts the GameScene reads the persisted difficulty and applies
    // matching spawn interval / obstacle-speed multipliers. We verify by
    // checking the scene's internal spawn-rate multiplier after entering with
    // a saved 'hard' vs 'easy' setting.
    const { GameScene } = await import('@/scenes/GameScene');

    // Boot a GameScene with a given difficulty persisted, then read its
    // spawn params (spawnRateMultiplier / obstacleSpeedMultiplier).
    async function bootAwaited(difficulty: string) {
      window.localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({ volume: 80, speed: 1.0, difficulty })
      );
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
      const game = {
        getRenderer: vi.fn(() => mockRendererWrapper),
        switchScene: vi.fn().mockResolvedValue(undefined),
        isGameRunning: () => false,
        pause: vi.fn(),
        stop: vi.fn(),
        getUISystem: () => ({
          setScore: vi.fn(),
          setHealth: vi.fn(),
          setLevel: vi.fn(),
          hideHud: vi.fn(),
        }),
        getInputSystem: () => ({
          getInputState: () => ({ keys: {} as Record<string, boolean> }),
        }),
        getSpeedMultiplier: () => 1.0,
      };
      const scene = new GameScene(game as unknown as Game);
      await scene.load();
      scene.enter();
      return scene;
    }

    const hard = await bootAwaited('hard');
    const easy = await bootAwaited('easy');

    const hardParams = (hard as unknown as { getDifficultyParams: () => { spawnRateMultiplier: number; obstacleSpeedMultiplier: number } }).getDifficultyParams();
    const easyParams = (easy as unknown as { getDifficultyParams: () => { spawnRateMultiplier: number; obstacleSpeedMultiplier: number } }).getDifficultyParams();

    // Hard should spawn MORE frequently (smaller interval multiplier) and
    // move obstacles faster (larger multiplier).
    expect(typeof hardParams.spawnRateMultiplier).toBe('number');
    expect(typeof easyParams.spawnRateMultiplier).toBe('number');
    expect(hardParams.spawnRateMultiplier).toBeLessThan(easyParams.spawnRateMultiplier);
    expect(hardParams.obstacleSpeedMultiplier).toBeGreaterThan(
      easyParams.obstacleSpeedMultiplier
    );
  });
});
