/**
 * T0.2.2 (kanban G6) — retrospective GREEN-from-start tests for
 * src/utils/AssetLoader.ts (never had coverage; no production changes).
 *
 * Strategy (established in this suite: real `three` under happy-dom, only the
 * network/decode edges mocked):
 *   - 'three'               → importOriginal + controllable TextureLoader stub
 *                             (the real one would fetch + decode an image)
 *   - 'three/addons/.../GLTFLoader.js' → controllable stub
 *   - globalThis.fetch / AudioContext / FontFace / document.fonts → per-test
 *     stubs (all absent or network-bound in happy-dom)
 *   - '@/utils/Logger'      → spy functions (project convention)
 *
 * The loader's static cache + audioContext live for the module's lifetime, so
 * every test starts from clearCache() + reset behavior hooks. `mock*`-prefixed
 * hooks are referenced lazily from the hoisted vi.mock factories (only inside
 * method bodies that run at test time).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { AssetLoader } from '@/utils/AssetLoader';
import { Logger } from '@/utils/Logger';
import type { AssetType } from '@/utils/AssetLoader';

// --- Controllable behavior hooks -------------------------------------------
const mockTexture = {
  behavior: 'success' as 'success' | 'error',
  error: new Error('mock texture load failed'),
  calls: [] as string[],
};
const mockModel = {
  behavior: 'success' as 'success' | 'error',
  error: new Error('mock model load failed'),
  calls: [] as string[],
  scene: { name: 'mock-gltf-scene' },
};
const mockDecode = {
  behavior: 'success' as 'success' | 'error',
  error: new Error('mock decode failed'),
  buffer: { name: 'mock-audio-buffer' },
};
const mockFont = {
  behavior: 'success' as 'success' | 'error',
  error: new Error('mock font load failed'),
};

const mockFetch = vi.fn();
const mockFontsAdd = vi.fn();

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal();
  class MockTextureLoader {
    load(
      url: string,
      onLoad?: (texture: any) => void,
      _onProgress?: unknown,
      onError?: (error: unknown) => void
    ): void {
      mockTexture.calls.push(url);
      queueMicrotask(() => {
        if (mockTexture.behavior === 'success') onLoad?.({ colorSpace: '' });
        else onError?.(mockTexture.error);
      });
    }
  }
  return { ...actual, TextureLoader: MockTextureLoader };
});

vi.mock('three/addons/loaders/GLTFLoader.js', async () => {
  class MockGLTFLoader {
    load(
      url: string,
      onLoad?: (gltf: any) => void,
      _onProgress?: unknown,
      onError?: (error: unknown) => void
    ): void {
      mockModel.calls.push(url);
      queueMicrotask(() => {
        if (mockModel.behavior === 'success') onLoad?.({ scene: mockModel.scene });
        else onError?.(mockModel.error);
      });
    }
  }
  return { GLTFLoader: MockGLTFLoader };
});

vi.mock('@/utils/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// --- Environment stubs (happy-dom lacks AudioContext/FontFace/document.fonts) --
class MockAudioContext {
  decodeAudioData(_data: ArrayBuffer): Promise<any> {
    return mockDecode.behavior === 'success'
      ? Promise.resolve(mockDecode.buffer)
      : Promise.reject(mockDecode.error);
  }
}

class MockFontFace {
  readonly family: string;
  readonly source: string;
  constructor(family: string, source: string) {
    this.family = family;
    this.source = source;
  }
  load(): Promise<any> {
    if (mockFont.behavior === 'error') return Promise.reject(mockFont.error);
    return Promise.resolve(this);
  }
}

function setDocumentFonts(fonts: unknown): void {
  try {
    Object.defineProperty(document, 'fonts', { value: fonts, configurable: true });
  } catch {
    (document as any).fonts = fonts;
  }
}

beforeEach(() => {
  AssetLoader.clearCache();
  mockTexture.behavior = 'success';
  mockTexture.calls.length = 0;
  mockModel.behavior = 'success';
  mockModel.calls.length = 0;
  mockDecode.behavior = 'success';
  mockFont.behavior = 'success';
  vi.stubGlobal('fetch', mockFetch);
  vi.stubGlobal('AudioContext', MockAudioContext);
  vi.stubGlobal('FontFace', MockFontFace);
  setDocumentFonts({ add: mockFontsAdd });
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete (document as any).fonts;
});

// --- load(): texture ---------------------------------------------------------
describe('AssetLoader.load — texture', () => {
  it('loads a texture, tags sRGB color space, and caches it', async () => {
    const texture = await AssetLoader.load('/assets/tex.png', 'texture');
    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(mockTexture.calls).toEqual(['/assets/tex.png']);
    expect(AssetLoader.getCacheStats().size).toBe(1);

    const again = await AssetLoader.load('/assets/tex.png', 'texture');
    expect(again).toBe(texture); // cache hit — same object
    expect(mockTexture.calls).toHaveLength(1); // loader not called again
    expect(Logger.debug).toHaveBeenCalled(); // 'Asset loaded from cache'
  });

  it('rejects and logs when the texture load fails (failure is not cached)', async () => {
    mockTexture.behavior = 'error';
    await expect(AssetLoader.load('/bad.png', 'texture')).rejects.toThrow(
      'mock texture load failed'
    );
    expect(Logger.error).toHaveBeenCalledWith(
      'Failed to load asset',
      expect.objectContaining({ url: '/bad.png', type: 'texture' })
    );
    expect(AssetLoader.getCacheStats().size).toBe(0);

    mockTexture.behavior = 'success';
    const ok = await AssetLoader.load('/bad.png', 'texture'); // retry works
    expect(ok.colorSpace).toBe(THREE.SRGBColorSpace);
  });

  it('caches the same URL separately per asset type', async () => {
    await AssetLoader.load('/shared.glb', 'model');
    const texture = await AssetLoader.load('/shared.glb', 'texture');
    expect(mockModel.calls).toEqual(['/shared.glb']);
    expect(mockTexture.calls).toEqual(['/shared.glb']);
    expect(AssetLoader.getCacheStats()).toEqual({
      size: 2,
      entries: ['model:/shared.glb', 'texture:/shared.glb'],
    });
    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
  });
});

// --- load(): model -----------------------------------------------------------
describe('AssetLoader.load — model', () => {
  it('resolves with the gltf scene and caches it', async () => {
    const scene = await AssetLoader.load('/assets/hero.glb', 'model');
    expect(scene).toBe(mockModel.scene);
    expect(mockModel.calls).toEqual(['/assets/hero.glb']);

    const cached = await AssetLoader.load('/assets/hero.glb', 'model');
    expect(cached).toBe(mockModel.scene);
    expect(mockModel.calls).toHaveLength(1);
  });

  it('rejects and logs when the model load fails', async () => {
    mockModel.behavior = 'error';
    await expect(AssetLoader.load('/bad.glb', 'model')).rejects.toThrow(
      'mock model load failed'
    );
    expect(Logger.error).toHaveBeenCalledWith(
      'Failed to load asset',
      expect.objectContaining({ url: '/bad.glb', type: 'model' })
    );
    expect(AssetLoader.getCacheStats().size).toBe(0);
  });
});

// --- load(): audio -----------------------------------------------------------
describe('AssetLoader.load — audio', () => {
  it('fetches, decodes, and caches the audio buffer', async () => {
    mockFetch.mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(8) });
    const buffer = await AssetLoader.load('/assets/jump.ogg', 'audio');
    expect(buffer).toBe(mockDecode.buffer);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/assets/jump.ogg');

    const cached = await AssetLoader.load('/assets/jump.ogg', 'audio');
    expect(cached).toBe(mockDecode.buffer);
    expect(mockFetch).toHaveBeenCalledTimes(1); // cache hit — no refetch
  });

  it('rejects when the fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('network down'));
    await expect(AssetLoader.load('/assets/jump.ogg', 'audio')).rejects.toThrow(
      'network down'
    );
    expect(Logger.error).toHaveBeenCalled();
    expect(AssetLoader.getCacheStats().size).toBe(0);
  });

  it('rejects when decodeAudioData fails', async () => {
    mockFetch.mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(8) });
    mockDecode.behavior = 'error';
    await expect(AssetLoader.load('/assets/jump.ogg', 'audio')).rejects.toThrow(
      'mock decode failed'
    );
  });
});

// --- load(): font ------------------------------------------------------------
describe('AssetLoader.load — font', () => {
  it('constructs a FontFace from the URL, loads it, and registers it in document.fonts', async () => {
    const font = await AssetLoader.load('/fonts/Clusterrush-Font.woff2', 'font');
    expect(font).toBeInstanceOf(MockFontFace);
    expect(font.family).toBe('Clusterrush-Font');
    expect(font.source).toBe('url(/fonts/Clusterrush-Font.woff2)');
    expect(mockFontsAdd).toHaveBeenCalledTimes(1);
    expect(mockFontsAdd).toHaveBeenCalledWith(font);
  });

  it('falls back to "CustomFont" when the URL has no parsable name', async () => {
    const font = await AssetLoader.load('/', 'font');
    expect(font.family).toBe('CustomFont');
  });

  it('rejects and logs when FontFace.load() fails', async () => {
    mockFont.behavior = 'error';
    await expect(AssetLoader.load('/fonts/x.woff2', 'font')).rejects.toThrow(
      'mock font load failed'
    );
    expect(Logger.error).toHaveBeenCalled();
    expect(AssetLoader.getCacheStats().size).toBe(0);
  });
});

// --- load(): json ------------------------------------------------------------
describe('AssetLoader.load — json', () => {
  it('fetches and resolves with the parsed JSON payload (cached on repeat)', async () => {
    const payload = { level: 3, enemies: 5 };
    mockFetch.mockResolvedValue({ json: async () => payload });
    const data = await AssetLoader.load('/assets/level-3.json', 'json');
    expect(data).toBe(payload);

    await AssetLoader.load('/assets/level-3.json', 'json');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('rejects when the fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('404 not found'));
    await expect(AssetLoader.load('/missing.json', 'json')).rejects.toThrow(
      '404 not found'
    );
    expect(Logger.error).toHaveBeenCalled();
  });
});

// --- load(): unknown type ----------------------------------------------------
describe('AssetLoader.load — unknown type', () => {
  it('rejects with a descriptive error and logs it', async () => {
    await expect(AssetLoader.load('/x', 'video' as AssetType)).rejects.toThrow(
      'Unknown asset type: video'
    );
    expect(Logger.error).toHaveBeenCalledWith(
      'Failed to load asset',
      expect.objectContaining({ url: '/x', type: 'video' })
    );
    expect(AssetLoader.getCacheStats().size).toBe(0);
  });
});

// --- preload -----------------------------------------------------------------
describe('AssetLoader.preload', () => {
  it('resolves when all assets load and caches them all', async () => {
    mockFetch.mockResolvedValue({
      arrayBuffer: async () => new ArrayBuffer(4),
      json: async () => ({ ok: true }),
    });
    await AssetLoader.preload([
      { url: '/a.png', type: 'texture' },
      { url: '/b.glb', type: 'model' },
      { url: '/c.json', type: 'json' },
    ]);
    expect(Logger.info).toHaveBeenCalledWith('Preloading assets', { count: 3 });
    expect(Logger.info).toHaveBeenLastCalledWith('Assets preloaded');
    expect(AssetLoader.getCacheStats().size).toBe(3);
  });

  it('does not reject on partial failure; successful assets are still cached', async () => {
    mockTexture.behavior = 'error';
    await expect(
      AssetLoader.preload([
        { url: '/bad.png', type: 'texture' }, // fails
        { url: '/ok.glb', type: 'model' }, // succeeds
      ])
    ).resolves.toBeUndefined();
    expect(AssetLoader.getCacheStats()).toEqual({
      size: 1,
      entries: ['model:/ok.glb'],
    });
  });
});

// --- cache management --------------------------------------------------------
describe('AssetLoader cache management', () => {
  it('getCacheStats reports size and "type:url" entry keys in insertion order', async () => {
    await AssetLoader.load('/t.png', 'texture');
    await AssetLoader.load('/m.glb', 'model');
    expect(AssetLoader.getCacheStats()).toEqual({
      size: 2,
      entries: ['texture:/t.png', 'model:/m.glb'],
    });
  });

  it('clearCache empties the cache, logs it, and subsequent loads re-fetch', async () => {
    await AssetLoader.load('/t.png', 'texture');
    expect(mockTexture.calls).toHaveLength(1);

    AssetLoader.clearCache();
    expect(Logger.info).toHaveBeenCalledWith('Asset cache cleared');
    expect(AssetLoader.getCacheStats()).toEqual({ size: 0, entries: [] });

    await AssetLoader.load('/t.png', 'texture');
    expect(mockTexture.calls).toHaveLength(2);
    expect(AssetLoader.getCacheStats().size).toBe(1);
  });
});
