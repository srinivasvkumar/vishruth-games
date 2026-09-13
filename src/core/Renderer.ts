import * as THREE from 'three';

/**
 * Options for the standalone Three.js renderer wrapper (TDD-1.3 GREEN).
 */
export interface RendererOptions {
  /** Initial viewport width in pixels (default 800). */
  width?: number;
  /** Initial viewport height in pixels (default 600). */
  height?: number;
  /** Enable antialiasing (default false). */
  antialias?: boolean;
  /** Initial clear color as a hex number (default 0x000000). */
  clearColor?: number;
  /**
   * Existing canvas to attach the WebGL renderer to (W2-A.1).
   * When omitted the renderer creates its own detached canvas.
   */
  canvas?: HTMLCanvasElement;
}

/**
 * Minimal Three.js renderer wrapper (TDD-1.3 GREEN, Week 1 day 1).
 *
 * Owns only the WebGL context: creation, dimensions, clearing, disposal.
 * No scene-graph ownership, no game-specific logic. src/scenes/Scene.ts
 * keeps owning its own renderer until a later task migrates it to this
 * wrapper (explicitly out of scope for TDD-1.3).
 *
 * Unit tests run this against the stub in tests/setup/mock-three.ts
 * (see tests/unit/hello-three.test.ts), which records the clear color,
 * clear calls, and disposal so the behavior is assertable.
 */
export class Renderer {
  private readonly renderer: THREE.WebGLRenderer;
  private disposed = false;

  constructor(options: RendererOptions = {}) {
    const {
      width = 800,
      height = 600,
      antialias = false,
      clearColor = 0x000000,
      canvas
    } = options;

    this.renderer = new THREE.WebGLRenderer({ antialias, canvas });
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(clearColor);
    this.renderer.clear();
  }

  /** The WebGL canvas backing this renderer. */
  get domElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  /** Current viewport width in pixels. */
  get width(): number {
    return this.renderer.domElement.width;
  }

  /** Current viewport height in pixels. */
  get height(): number {
    return this.renderer.domElement.height;
  }

  /** The wrapped THREE.WebGLRenderer (stub in unit tests). */
  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  /** Resize the viewport to the given dimensions, then clear. */
  resize(width: number, height: number): void {
    this.renderer.setSize(width, height);
    this.renderer.clear();
  }

  /**
   * Resize the viewport to fit a parent element's content box (W2-A.1).
   * Reads `clientWidth` / `clientHeight` from the element (excludes
   * margins, borders, scrollbars). Intended to be called on window resize
   * or after layout changes so the canvas always fills its container.
   */
  resizeToContainer(container: HTMLElement): void {
    this.resize(container.clientWidth, container.clientHeight);
  }

  /** Clear the screen using the current clear color. */
  clear(): void {
    this.renderer.clear();
  }

  /** Change the clear color used by clear(). */
  setClearColor(color: number): void {
    this.renderer.setClearColor(color);
  }

  /** Draw a frame (pass-through; this wrapper owns no scene graph). */
  render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.renderer.render(scene, camera);
  }

  /** Release the WebGL context. Idempotent. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.renderer.dispose();
  }
}
