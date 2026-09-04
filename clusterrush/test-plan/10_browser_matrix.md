# 10. Browser & Platform Matrix

Target: WebGL 2, Godot 4.7.2 single-thread WASM. Primary: **Chrome/Chromium (desktop)**.

## Matrix (minimum viable)
| Browser | Version | Notes |
|---------|---------|-------|
| Chrome | latest stable | PRIMARY — all P0 tests here first |
| Firefox | latest stable | WASM/IndexedDB parity check |
| Safari | latest macOS | strictest autoplay + memory policies |
| Chrome Android (mobile) | latest | P2 — soft-lock known (no touch controls) |

## Per-browser mandatory
| ID | TC | Evidence |
|----|----|----------|
| B-01 | Boot to main menu (63MB download complete, no WASM error) | console + screenshot |
| B-02 | Full L1 run: run/strafe/jump/pause/death/complete | video |
| B-03 | Refresh mid-level → clean main menu | console |
| B-04 | Save round-trip (IndexedDB) | Level Select |
| B-05 | WebGL context loss: devtools → force context loss mid-run | graceful message or crash? |
| B-06 | 50% / 200% browser zoom during play | no UI breakage |
| B-07 | Dev tools open (DOM inspector on canvas) — perf hit | fps |
| B-08 | Ad-blocker enabled (uBlock Origin) | no block of PCK/WASM |
| B-09 | GitHub Pages COOP/COEP: check response headers (`Cross-Origin-Opener-Policy`) | network |

## Deployment
- Local: `python3 cors_server.py` on :8765 (COOP/COEP set by server).
- Live: `https://srinivasvkumar.github.io/vishruth-games/Builds/WebGL/index.html`
- **Verify both produce identical behavior for B-01/B-05** (headers differ).
