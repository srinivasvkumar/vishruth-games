
# WebGL Optimization Analysis — Cluster Rush

## Current State
- Build size: 38 MB
- Components:
  - index.wasm: 37 MB (97% of build)
  - index.pck: 959 KB
  - index.js: 350 KB
  - index.html: 5.3 KB

## Researcher Benchmarks
- Default 72 MB → 2.7 MB with full optimization (Brotli)
- Load time: 22s → 4.2s with lazy loading
- FPS: 31 → 60 with atlasing + VRAM compression

## Targets
| Target | Current | Achievable | Method |
|--------|---------|------------|--------|
| Build <50MB uncompressed | 38 MB ✅ | — | Already met |
| Build <10MB compressed | 38 MB | ~2.7 MB | Brotli compression |
| Load <10s | Unknown | ~4.2s | Lazy loading by priority |
| 60 FPS | Unknown | Achievable | Atlasing + VRAM compression |

## Top 5 Optimization Techniques
1. Custom template compilation (70-85% size reduction)
2. Sprite atlasing (draw calls 240→38)
3. VRAM texture compression (~75% memory reduction)
4. WASM SIMD (Godot 4.5+, 1.5x-2x runtime)
5. Browser caching (near-instant repeat visits)

## Implementation Plan
- [ ] Apply Brotli compression to index.wasm (use brotli CLI tool)
- [ ] Optimize texture compression in Godot export
- [ ] Implement sprite atlasing for game assets
- [ ] Add WASM SIMD support (Godot 4.7.2+ should have it)
- [ ] Implement lazy loading by scene priority tiers
