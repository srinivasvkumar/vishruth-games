/**
 * W2-A.1 RED (2026-09-13) — Renderer attaches to existing canvas.
 *
 * These tests assert behavior the current src/core/Renderer.ts does NOT
 * support:
 *   1. Accepting an optional `canvas: HTMLCanvasElement` in RendererOptions
 *      and passing it to `new THREE.WebGLRenderer({ canvas })`.
 *   2. Exposing that canvas via the `domElement` getter.
 *   3. A `resizeToContainer(el)` helper that resizes to a parent element's
 *      clientWidth/clientHeight.
 *
 * The mock THREE.WebGLRenderer (tests/setup/mock-three.ts) is extended
 * (additively) to record the `canvas` parameter it receives, so these
 * assertions are meaningful in happy-dom.
 *
 * TDD order: this file lands FIRST (RED), verified to fail, then the
 * minimal implementation in src/core/Renderer.ts turns it GREEN.
 */
import { describe, it, expect, vi } from 'vitest'

vi.mock('three', () => import('../setup/mock-three'))

import { Renderer } from '@/core/Renderer'

describe('W2-A.1: Renderer canvas attachment (RED)', () => {
  it('RED: accepts an existing canvas and passes it to WebGLRenderer', () => {
    const providedCanvas = document.createElement('canvas')

    const renderer = new Renderer({
      width: 800,
      height: 600,
      canvas: providedCanvas
    })

    // The wrapper must use the supplied canvas — not create its own.
    expect(renderer.domElement).toBe(providedCanvas)
    // The mock records what THREE.WebGLRenderer actually received.
    expect(renderer.getRenderer().domElement).toBe(providedCanvas)
  })

  it('RED: falls back to a created canvas when no canvas is supplied', () => {
    const renderer = new Renderer({ width: 300, height: 200 })
    expect(renderer.domElement).toBeInstanceOf(HTMLCanvasElement)
    // No canvas supplied → mock's own created canvas (not the supplied one).
    expect(renderer.getRenderer().domElement).toBe(renderer.domElement)
  })

  it('RED: resizeToContainer resizes to the parent element dimensions', () => {
    const container = document.createElement('div')
    Object.defineProperty(container, 'clientWidth', { value: 512 })
    Object.defineProperty(container, 'clientHeight', { value: 384 })

    const renderer = new Renderer({ width: 800, height: 600 })
    renderer.resizeToContainer(container)

    expect(renderer.width).toBe(512)
    expect(renderer.height).toBe(384)
  })
})
