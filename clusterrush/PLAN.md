# Cluster Rush — Godot 4 Development Plan (v3.0)

**Status:** ACTIVE — Wave 1 executing on kanban board `cluster-rush`
**Created:** 2026-08-26 | **v3 Rewritten:** 2026-08-30
**Target Platform:** WebGL (local browser :8765 + GitHub Pages)
**Engine:** Godot 4.7.2 (ARM64 Linux, `./bin/godot`) | **Language:** GDScript only

---

## 0. Verified Ground Truth (2026-08-30, PM hands-on verification)

These were verified by actually running things — not assumed:

| # | Finding | Evidence |
|---|---------|----------|
| G1 | **The game BOOTS and renders in headless Chrome.** Main menu "Cluster Rush" + 4 buttons confirmed via screenshot at 1280x720. | headless Chrome 151, Playwright, screenshot /tmp/game_loaded.png |
| G2 | The "WebGL2 missing" from the 08-29 diagnostic was a **test-environment artifact**, not a game bug. Headless Chrome needs SwiftShader: `--enable-unsafe-swiftshader --use-gl=angle --use-angle=swiftshader`. | CDP console capture: "OpenGL ES 3.0 (WebGL 2.0 Chromium) — Compatibility — Godot Engine v4.7.2 started" |
| G3 | `tests/e2e/playwright.config.ts` uses **wrong** GL flags (`--use-gl=egl --use-angle=egl`) → every E2E run fails at engine boot. | file audit |
| G4 | `godot --headless --test` **does not exist** in stock Godot ("compiled without support for unit tests"). Pipeline L1/L2 steps and CI are broken on day one. | `./bin/godot --headless --test res://tests/unit/` → ERROR |
| G5 | `tests/unit/` directory **does not exist**. `tests/playmode/` contains only result JSONs, no tests. | directory audit |
| G6 | Git log shows Phases 5–7 code EXISTS (trucks, hazards, death flow, polish) but `level_XX.tscn` files were **removed** as "broken" — 35 levels are not real yet. | `git log` e22d198, d58f173 |
| G7 | Repo root has a stale duplicate WebGL export (index.html/wasm/pck ~40MB) competing with `Builds/WebGL/` — cache/deploy confusion. | git ls-files |
| G8 | Server `www/cors_server.py` on :8765 correctly sends COOP/COEP headers. Build files all serve fine. | curl -I |
| G9 | PLAN v2 claims "Phase 2 in progress" — reality is further along AND broken in different places. Plan and code drifted. | plan vs code audit |

**Conclusion:** The engine/transport layer works. The gaps are: (a) broken test tooling, (b) missing level content, (c) unverified gameplay, (d) repo/build hygiene, (e) CI.

---

## 1. Team (Kanban board: `cluster-rush`)

| Profile | Role | Owns |
|---------|------|------|
| **boss_bot** | PM / Orchestrator | Task decomposition, board health, next-wave creation, user reporting |
| **game-dev** | Godot developer | scenes/, scripts/, autoloads/ — GDScript only |
| **game-tester** | QA | tests/e2e/ (Playwright, real browser), test fixtures, visual checks |
| **implementer** | Build engineer | addons/GUT, pipeline.sh, export presets, CI, Builds/ |
| **researcher** | Research/specs | specs/, docs/, gap consolidation |
| **reviewer** | Quality gate | Spec-vs-code review, phase sign-off |

Excluded from this project: `default`, `sowmya`, `hr_bot`, `orchestrator`.

## 2. Pipeline (fixed — replaces broken v2 pipeline)

Every feature: **Spec → Test (red) → Code → Build → QA (green) → Review sign-off**.

| Layer | Tool (v3, working) | Gate |
|-------|--------------------|------|
| L1 Unit | GUT: `./bin/got --headless -s addons/gut/gut_cmdln.gd -gdir=res://tests/unit -gexit` (non-zero exit on fail) | blocks commit |
| L2 Integration | GUT: `-gdir=res://tests/integration` (scene load + node wiring) | blocks build |
| L3 E2E | Playwright + headless Chrome **SwiftShader args** (see §4) against :8765 | blocks sign-off |
| L4 Perf | First-frame time + FPS sample in E2E (SwiftShader caveat: measure, don't gate) | polish |

> v2's L1/L2 used `godot --test` which **does not exist** (G4). GUT is the community-standard fix.

## 3. Milestones (each ends with a green gate + reviewer sign-off)

### M0 — Test foundation (Wave 1, NOW)
- [ ] E2E harness: correct SwiftShader flags, boot fixture, canvas helpers, green "menu boots" test
- [ ] GUT installed (addons/gut, Godot 4.7-compatible ref), tests/unit + tests/integration scaffolded, smoke tests green
- [ ] pipeline.sh L1/L2 steps fixed; CI godot-ci.yml test steps fixed
- **Gate:** `./scripts/pipeline.sh` steps 1–2 pass; E2E "menu boots" green with screenshot evidence.

### M1 — 35 levels that actually load
- [ ] LevelManager.load_level(n) works for all n in 1..35 (no silent fallback to level 1)
- [ ] Content: handcrafted-or-procedural-per-seed level definitions (truck count/speed/gap/hazards per tier table in §5)
- [ ] L1 tests: template/tier math; L2 tests: every level scene instantiates without script errors
- [ ] L3 test: level select grid shows 35 buttons, locked/unlocked correct, clicking level 1 loads game
- **Gate:** reviewer verifies tier table matches §5.

### M2 — Gameplay core verified
- [ ] Auto-run, jump, double-jump, wall-jump/slide, strafe all work in game.tscn (fix P0/P1 gaps from audit)
- [ ] Death on hazard contact + fall; respawn/retry flow; level-complete flow
- [ ] HUD: score, lives, level; save persists across reload (user:// ConfigFile)
- [ ] L3 tests: scripted input sequences produce expected state (jump over gap, die on saw, complete level 1)
- **Gate:** game-tester full-suite green; reviewer sign-off.

### M3 — Ship-quality build
- [ ] Single source of truth for web build: `Builds/WebGL/` only; stale root-level export files removed from git
- [ ] Export preset: threads decision finalized (single-threaded = simplest on GitHub Pages; document tradeoff)
- [ ] CI: test → export → Pages deploy fully green on a clean runner (x86_64 Godot)
- [ ] .nojekyll + brotli + sane cache headers
- **Gate:** CI badge green; Pages URL boots (same SwiftShader-independent check: no "missing features" overlay).

### M4 — Performance & polish
- [ ] First-frame < 8s on mid hardware; stable frame pacing under SwiftShader sample ≥ 30 FPS (measure on real GPU for 60)
- [ ] Audio (all referenced files exist), particles, screen shake; settings wired (volume, quality)
- **Gate:** L4 perf sample recorded in tests/performance/.

### M5 — 35-level content pass + final QA
- [ ] All 35 levels playable to completion; difficulty curve per §5
- [ ] Cross-browser: Chrome + Firefox (webgl2), mobile spot check
- [ ] Full regression: pipeline.sh all-green; save-file migration test
- **Gate:** reviewer final sign-off → tag v1.0.

## 4. E2E Standard (binding — game-tester + implementer)

```ts
// tests/e2e/playwright.config.ts — REQUIRED launch args (verified 2026-08-30):
args: ['--no-sandbox','--disable-gpu',
       '--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']
```
- Boot detection: wait for `#status` overlay hidden OR canvas `width>=1280`; then sample canvas pixels (non-black %) — never trust a timeout alone.
- Input: canvas pixel-coordinate clicks/keys (no DOM buttons in a WebGL game). Helper module `tests/e2e/helpers/canvas.ts` centralizes boot-wait + pixel sampling + click.
- Evidence: screenshot on every gate test (`tests/e2e/screenshots/`), pixel-diff for regression-sensitive UIs.
- Server: `www/cors_server.py` :8765 (COOP/COEP already correct).

## 5. Level Difficulty Table (authoritative — unchanged from v2)

| Tier | Levels | Trucks | Speed m/s | Gap m | Hazards |
|------|--------|--------|-----------|-------|---------|
| T1 Tutorial | 1–5 | 1–2 | 10–12 | 3.0–4.0 | 0–1 |
| T2 Easy | 6–10 | 2–3 | 12–15 | 2.5–3.5 | 1–2 |
| T3 Medium | 11–20 | 4–6 | 15–18 | 2.0–3.0 | 2–3 |
| T4 Hard | 21–30 | 6–8 | 18–22 | 1.5–2.5 | 3–4 |
| T5 Expert | 31–35 | 8–10 | 22–25 | 1.0–2.0 | 4–5 |

Unlock rule: level N unlocks after completing N−1 (save in `user://cluster_rush_save.dat`).

## 6. Rules (carried from v2, enforced)
1. Spec first: no feature code without `specs/<feature>.md` (P0 fixes may ship with a short spec comment on the kanban task).
2. Test before code for all L3-visible behavior.
3. One feature "In Progress" per profile; kanban parent-links encode ordering.
4. GDScript only. No C#.
5. Don't commit build artifacts except via CI (Builds/WebGL is a deploy output; root-level export files are a bug, see G7).
6. All workers: verify with real tool output before `kanban_complete`; attach evidence (paths, exit codes, screenshots).

**Document Owner:** boss_bot (PM) — updated 2026-08-30 by default (PM delegate)
**Companion docs:** `docs/CODE_AUDIT.md`, `docs/RESEARCH_FINDINGS.md`, `docs/GAPS_AND_FIXES.md`
