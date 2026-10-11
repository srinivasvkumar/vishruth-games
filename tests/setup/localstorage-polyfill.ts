/**
 * W5: Node >= 24 installs an experimental `localStorage` global getter that
 * returns `undefined` unless `--localstorage-file` is passed. On Node 26 that
 * getter shadows happy-dom's window.localStorage (own-prop lookup resolves to
 * undefined), which broke 110 unit tests with
 * "Cannot read properties of undefined (reading 'getItem')".
 *
 * Defining an own property on `window` shadows the broken getter for every
 * test file. Semantics match the Web Storage API closely enough for the
 * suite (string keys/values, clear, key(i), length, removeItem, setItem,
 * getItem).
 */
class PolyfillStorage implements Storage {
  private map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.get(String(key)) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(String(key));
  }

  setItem(key: string, value: string): void {
    this.map.set(String(key), String(value));
  }

  [name: string]: unknown;
}

const anyWindow = window as unknown as { localStorage?: Storage };
const broken = typeof anyWindow.localStorage === 'undefined';
if (broken) {
  Object.defineProperty(window, 'localStorage', {
    value: new PolyfillStorage(),
    writable: true,
    configurable: true,
    enumerable: true,
  });
  // Some code paths read `globalThis.localStorage` directly.
  Object.defineProperty(globalThis, 'localStorage', {
    value: (window as unknown as { localStorage: Storage }).localStorage,
    writable: true,
    configurable: true,
  });
}

export {};
