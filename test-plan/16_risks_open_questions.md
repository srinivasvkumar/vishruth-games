# 16. Risks, Open Questions & Deferred

## Open questions (need a runtime answer, not a source answer)
1. Does the GitHub Pages deployment set COOP/COEP? (B-09 — @game-tester to capture headers.)
2. Is `test_simple.tscn` truly orphaned at runtime? (CONFIRMED no references — low priority.)
3. What exactly does `webgl_bridge.gd` do (L133 calls start_level)? Is it wired to any UI? (lead-verified call site exists; UI wiring unknown → F002 to check in-browser.)
4. Particles: CPU or GPU emitters? (verify in editor, affects P-07.)
5. `settings_ui.gd` — do sliders persist anywhere? (print-stub implies no → F002.)

## Risks
- **Build size 63MB vs 50MB target** (P-09): affects time-to-playable on slow networks; mitigation: compression settings, asset strip.
- **@reviewer unstaffed**: final adversarial pass done by lead self-audit; user should unblock reviewer profile (remove `messaging` from `platform_toolsets.cli.tools` in `~/.hermes/profiles/reviewer/config.yaml`).
- **Pause unreachable on laptops** (D3) blocks real playtesting of F017 paths; workaround: full-keyboard tester or temporary Escape binding for test builds ONLY.
- **D1 (retry 0-lives)** makes post-GameOver play impossible — any test plan depending on Retry must use Level Select/Main Menu paths until fixed.

## Explicitly OUT of scope
- Engine-level (Godot 4.7.2) regressions.
- iOS Safari (not in target matrix; flag if requested).
- Multiplayer / networking (not in game).
- Art quality / aesthetics.
