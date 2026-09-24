/**
 * W4-B.3 (kanban t_64341d74) — ARIA labels for all buttons:
 * MenuScene (START, SETTINGS, HIGH SCORES), GameOverScene (RESTART, final score),
 * and Settings panel (volume slider, speed selector, difficulty selector, close button).
 *
 * Strategy (matches menu-scene-keyboard.test.ts + gameover-scene.test.ts):
 *   - 'three' mocked with importOriginal + stubbed WebGLRenderer
 *   - '@/utils/Logger' mocked (project convention)
 *   - Scenes constructed DIRECTLY, lifecycle driven explicitly
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MenuScene } from '@/scenes/MenuScene';
import { GameOverScene } from '@/scenes/GameOverScene';
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

  return {
    getRenderer: vi.fn(() => mockRendererWrapper),
    switchScene: vi.fn().mockResolvedValue(undefined),
    isGameRunning: () => true,
    pause: vi.fn(),
    stop: vi.fn(),
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
  };
}

type MockGame = ReturnType<typeof createMockGame>;

// --- MenuScene ARIA tests ----------------------------------------------------
describe('W4-B.3: MenuScene ARIA labels', () => {
  let mockGame: MockGame;
  let menuScene: MenuScene;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockGame = createMockGame();
    menuScene = new MenuScene(mockGame as unknown as Game);
    await menuScene.load();
  });

  afterEach(() => {
    menuScene.cleanup();
    document.body.innerHTML = '';
  });

  it('START button has aria-label "Start game"', () => {
    const btn = document.querySelector('#menu-start-button') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    expect(btn.getAttribute('aria-label')).toBe('Start game');
  });

  it('SETTINGS button has aria-label "Open settings"', () => {
    const btn = document.querySelector('#menu-settings-button') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    expect(btn.getAttribute('aria-label')).toBe('Open settings');
  });

  it('HIGH SCORES panel has aria-label "View high scores"', () => {
    const panel = document.querySelector('#menu-high-score');
    expect(panel).not.toBeNull();
    expect(panel.getAttribute('aria-label')).toBe('View high scores');
  });

  it('Settings volume slider has aria-label "Volume"', () => {
    const slider = document.querySelector('#settings-volume-slider') as HTMLInputElement;
    expect(slider).not.toBeNull();
    expect(slider.getAttribute('aria-label')).toBe('Volume');
  });

  it('Settings speed buttons have aria-labels', () => {
    const speedBtns = document.querySelectorAll('#settings-panel button[id^="settings-speed-"]');
    expect(speedBtns.length).toBeGreaterThanOrEqual(3);
    speedBtns.forEach((btn) => {
      const text = (btn as HTMLElement).textContent?.trim() ?? '';
      expect(btn.getAttribute('aria-label')).toBe(`Set speed to ${text}`);
    });
  });

  it('Settings difficulty buttons have aria-labels', () => {
    const diffBtns = document.querySelectorAll('#settings-panel button[id^="settings-difficulty-"]');
    expect(diffBtns.length).toBeGreaterThanOrEqual(3);
    diffBtns.forEach((btn) => {
      const text = (btn as HTMLElement).textContent?.trim() ?? '';
      expect(btn.getAttribute('aria-label')).toBe(`Set difficulty to ${text}`);
    });
  });

  it('Settings CLOSE button has aria-label "Close settings"', () => {
    const btn = document.querySelector('#settings-close-button') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    expect(btn.getAttribute('aria-label')).toBe('Close settings');
  });
});

// --- GameOverScene ARIA tests ------------------------------------------------
describe('W4-B.3: GameOverScene ARIA labels', () => {
  let mockGame: MockGame;
  let gameOverScene: GameOverScene;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockGame = createMockGame();
    gameOverScene = new GameOverScene(mockGame as unknown as Game);
    await gameOverScene.load();
  });

  afterEach(() => {
    gameOverScene.cleanup();
    document.body.innerHTML = '';
  });

  it('RESTART button has aria-label "Restart game"', () => {
    const btn = document.querySelector('#gameover-restart-button') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    expect(btn.getAttribute('aria-label')).toBe('Restart game');
  });

  it('Final score value has aria-label "Final score"', () => {
    const el = document.querySelector('#gameover-final-score');
    expect(el).not.toBeNull();
    expect(el.getAttribute('aria-label')).toBe('Final score');
  });
});
