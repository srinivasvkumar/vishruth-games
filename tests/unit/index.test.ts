/**
 * T0.2.2 (kanban G6) — retrospective GREEN-from-start tests for src/index.ts,
 * the browser bootstrap entry point (never had coverage; no production
 * changes).
 *
 * src/index.ts exports no named bindings — it is a side-effect module whose
 * bootstrap() runs at import time:
 *   1. enables debug logging when ?debug=true is present,
 *   2. waits for DOMContentLoaded while document.readyState === 'loading',
 *   3. initGame(): `new Game(defaultConfig)` → window.game → game.start() →
 *      setupWindowEvents() (resize / visibilitychange / beforeunload),
 *      or showErrorScreen() when construction fails.
 *
 * `@/core/Game` and `@/utils/Logger` are mocked with vi.doMock() (per-import,
 * non-hoisted) so they do not leak into subsequent test files.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameConstants } from '@/utils/Constants';

// --- Mock factories (mutable per-test via mockGame) -------------------------
const mockGame = {
  behavior: { constructor: 'ok' as 'ok' | 'throw' },
  instances: [] as any[],
  starts: [] as any[],
};

// --- Helpers ------------------------------------------------------------------
async function importIndex(): Promise<{ mod: Record<string, unknown>; Logger: any }> {
  vi.resetModules();
  // Per-import (non-hoisted) mocks so they don't leak to other test files.
  // W2-A.3: index.ts now imports scene classes and registers them with the
  // SceneManager. The mock Game must expose getSceneManager() so the
  // registration calls don't throw.
  await vi.doMock('@/scenes/BootScene', () => ({
    BootScene: class { constructor(_game: any) {} },
  }));
  await vi.doMock('@/scenes/MenuScene', () => ({
    MenuScene: class { constructor(_game: any) {} },
  }));
  await vi.doMock('@/scenes/GameScene', () => ({
    GameScene: class { constructor(_game: any) {} },
  }));
  await vi.doMock('@/scenes/GameOverScene', () => ({
    GameOverScene: class { constructor(_game: any) {} },
  }));
  await vi.doMock('@/core/Game', () => ({
    Game: class {
      readonly config: any;
      constructor(config: any) {
        if (mockGame.behavior.constructor === 'throw') {
          throw new Error('mock Game construction failure');
        }
        this.config = config;
        mockGame.instances.push(this);
      }
      start(): void {
        mockGame.starts.push(this);
      }
      pause(): void {}
      stop(): void {}
      isGameRunning(): boolean {
        return true;
      }
      getSceneManager(): any {
        return { registerScene: (_name: string, _scene: any) => {} };
      }
    },
  }));
  await vi.doMock('@/utils/Logger', () => ({
    Logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      setLevel: vi.fn(),
    },
  }));
  const mod = await import('@/index');
  const LoggerMod = await import('@/utils/Logger');
  return { mod, Logger: LoggerMod.Logger };
}

/** The Logger instance index.ts actually used (fresh after vi.resetModules). */
async function usedLogger(): Promise<any> {
  const mod = await import('@/utils/Logger');
  return mod.Logger;
}

beforeEach(() => {
  document.body.innerHTML = '';
  mockGame.behavior.constructor = 'ok';
  mockGame.instances.length = 0;
  mockGame.starts.length = 0;
  delete (window as any).game;
});

afterEach(() => {
  window.history.replaceState(null, '', window.location.pathname); // drop ?debug
  delete (document as any).readyState; // restore happy-dom's 'complete'
  delete (document as any).hidden; // restore happy-dom's value
  vi.restoreAllMocks();
  vi.resetModules();
});

// ---------------------------------------------------------------------------
describe('src/index.ts public API (side-effect bootstrap module)', () => {
  it('exposes no named exports', async () => {
    const { mod } = await importIndex();
    expect(Object.keys(mod)).toEqual([]);
  });

  it('bootstraps on import: constructs and starts Game with the default config, exposed on window.game', async () => {
    const { mod, Logger } = await importIndex();

    expect(mockGame.instances).toHaveLength(1);
    expect(mockGame.starts).toHaveLength(1);
    expect(mockGame.starts[0]).toBe(mockGame.instances[0]);
    expect((window as any).game).toBe(mockGame.instances[0]);

    const config = mockGame.instances[0].config;
    expect(config.physics.gravity).toBe(GameConstants.GRAVITY);
    expect(config.physics.fixedTimeStep).toBe(1 / 60);
    expect(config.audio.masterVolume).toBe(0.8);
    expect(config.ui.theme).toBe('dark');
    expect(config.debug.logPhysics).toBe(false);

    expect(Logger.info).toHaveBeenCalledWith('Initializing Cluster Rush...');
    expect(Logger.info).toHaveBeenCalledWith('Game started successfully');
    expect(Logger.setLevel).not.toHaveBeenCalled();
  });

  it('shows the error screen when Game construction fails', async () => {
    mockGame.behavior.constructor = 'throw';
    const { mod, Logger } = await importIndex();

    expect(mockGame.instances).toHaveLength(0);
    expect((window as any).game).toBeUndefined();
    expect(document.body.innerHTML).toContain('Game Initialization Failed');
    // Source uses template literal: \${error.message} interpolates the actual message.
    expect(document.body.innerHTML).toContain(mockGame.behavior.constructorThrowMessage || 'Error');
    expect(Logger.error).toHaveBeenCalledWith(
      'Failed to initialize game',
      expect.anything()
    );
  });

  it('enables debug logging when ?debug=true is present in the URL', async () => {
    window.history.replaceState(null, '', '?debug=true');
    const { mod, Logger } = await importIndex();

    expect(Logger.setLevel).toHaveBeenCalledWith('debug');
    expect(Logger.info).toHaveBeenCalledWith('Debug mode enabled');
  });

  it('pauses the running game when the tab becomes hidden (visibilitychange)', async () => {
    await importIndex();
    const instance = (window as any).game;
    const pauseSpy = vi.spyOn(instance, 'pause');

    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(pauseSpy).toHaveBeenCalledTimes(1);

    delete (document as any).hidden; // visible again → no pause
    document.dispatchEvent(new Event('visibilitychange'));
    expect(pauseSpy).toHaveBeenCalledTimes(1);
  });

  it('stops the game on beforeunload', async () => {
    await importIndex();
    const stopSpy = vi.spyOn((window as any).game, 'stop');

    window.dispatchEvent(new Event('beforeunload'));
    expect(stopSpy).toHaveBeenCalledTimes(1);
  });

  it('defers initialization until DOMContentLoaded when the document is still loading', async () => {
    Object.defineProperty(document, 'readyState', {
      value: 'loading',
      configurable: true,
    });
    await importIndex();
    expect(mockGame.instances).toHaveLength(0); // bootstrap waited for the DOM

    document.dispatchEvent(new Event('DOMContentLoaded'));
    expect(mockGame.instances).toHaveLength(1);
    expect(mockGame.starts).toHaveLength(1);
    delete (document as any).readyState;
  });
});
