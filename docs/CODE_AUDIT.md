# Cluster Rush - Code Audit (verified 2026-08-30)

Verified against `main` @ `120e632` (Godot 4.7.2, local `./bin/godot`). Every finding includes the exact command and trimmed output used to confirm it.

## F1 — Repo structure: mostly intact, some empty/stale dirs
**P2**
```
$ ls -d */ .github; ls scenes/; ls specs/; ls -R scenes/ | tail -3
addons/ audio/ autoloads/ Builds/ docs/ fonts/ models/ prefabs/ scenes/ scripts/ specs/ tests/ www/ ...
scenes/: credits.tscn end_screen.tscn game.tscn level_select.tscn main_menu.tscn menu/ test_simple.tscn
scenes/menu:   (empty)
specs/: level_select.md main_menu.md
```
- Present: `scenes/` (6 .tscn), `scripts/` (21 .gd across 7 subdirs), `autoloads/` (4 .gd: game/level/input/audio manager, all registered in `project.godot` `[autoload]`), `addons/gut`, `tests/` (7 subdirs), `Builds/WebGL/`, `specs/` (2 files).
- Missing/odd: `scenes/menu/` is an empty dir; `specs/` has only 2 of the expected spec files; 5 unrelated sibling game dirs pollute the root (`2048/`, `tetris/`, `tic-tac-toe/`, `type-dash/`, `geometry-dash/`).

## F2 — Test infrastructure: GUT installed, L1/L2 wired and green; e2e scaffold only
**P2** (coverage is smoke-level)
```
$ cat addons/gut/plugin.cfg | grep version; ls tests/unit tests/integration
version="9.7.1"
tests/unit: test_smoke.gd        tests/integration: test_scene_instantiation.gd
$ ./bin/godot --headless -s addons/gut/gut_cmdln.gd -gdir=res://tests/unit -gexit
Totals: Scripts 1 / Tests 3 / Passing 3 / Asserts 3  ->  ---- All tests passed! ----
```
- `scripts/pipeline.sh` exists (L1: GUT `-gdir=res://tests/unit`, L2: GUT `-gdir=res://tests/integration`, L3: `npx playwright test` after building WebGL + starting `www/cors_server.py` on :8765).
- `.github/workflows/godot-ci.yml` exists: downloads Godot 4.7.2-stable, clones GUT into `addons/gut`, runs the same L1/L2 GUT commands, `--export-release "Web"` into `Builds/WebGL/`, deploys to GitHub Pages on `main` push.
- `tests/e2e/` has 4 spec files + playwright; `tests/e2e/tests/e2e/screenshots/` contains a stray duplicated nested tree (untracked).

## F3 — Playwright config still uses wrong headless-GL flags
**P0** (blocks every E2E run that needs WebGL)
```
$ cat tests/e2e/playwright.config.ts (launchOptions.args)
'--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu',
'--disable-gpu-compositing', '--use-gl=egl', '--use-angle=egl', ...
```
PLAN.md G3 predicted exactly this: `--use-gl=egl --use-angle=egl` fails engine boot in headless Chromium. Should be `--use-gl=angle --use-angle=swiftshader` (or `--enable-unsafe-swiftshader`).

## F4 — Level content: 0 level_XX.tscn exist; levels are generated procedurally
**P1**
```
$ find . -name "level_*.tscn" -not -path "./.godot/*"
./scenes/level_select.tscn            # only the select screen, no levels
$ git show --stat e22d198 | grep -c "scenes/level_"
35
```
- All 35 `level_XX.tscn` files were removed in commit `e22d198` ("Remove broken level_XX.tscn files").
- `autoloads/level_manager.gd` exists; `load_level(n)` does **not** load a scene file — it calls `_generate_level(n)`, which procedurally builds ground, truck convoy, and hazards from `get_level_parameters(n)` (5 difficulty tiers, 35 levels declared).
- No "silent fallback to level 1" scene-load exists, but two silent degradation paths do:
  1. `get_template_for_level(level)` returns the **tutorial** tier for any level not in the tier lists (no range check — `load_level(99)` "works" with tutorial params).
  2. `GameManager.current_level` and `load_progress()` default to `1` when no save exists.
- PLAN.md G6 ("35 levels are not real yet") remains true in spirit: no authored level geometry.

## F5 — Gameplay core: jump mechanics, death/respawn, level-complete, and save all present
**P2** (no P0/P1 gap found in core loop)
```
$ grep -n "func \|strafe\|wall_jump\|double_jump\|die(" scripts/player/player_movement.gd
_update_wall_state / _handle_jump_buffer / can_jump / _perform_jump (wall+double) / _handle_movement (strafe via Input.get_axis("strafe_left","strafe_right")) / _check_fall_death / die() / reset()
$ grep -n "func \|lives\|save\|user://" autoloads/game_manager.gd
player_died() (lives 3 for lvl<=5 else 2) / complete_level() -> save_progress(current_level+1) + LevelManager.save_level_completion(level, stars)
$ grep -n "x >= 140\|_on_player_died\|respawn_player" scripts/game_scene.gd
```
- `player_movement.gd` (393 lines): jump buffer, variable jump height, double jump (`max_jumps=2`), wall-slide + wall-jump with coyote/hang timers, strafe, fall-death, `die()`/`reset()`.
- `game_scene.gd`: level complete when `player.global_position.x >= 140.0` (hardcoded); death → `LevelManager.respawn_player()` after 1s, retry/level-select/main-menu flows wired.
- `level_manager.gd`: hazard `body_entered` → `GameManager.player_died()`; periodic falling-debris spawner.
- HUD persistence: HUD is display-only (`hud.gd` reads `GameManager.score`); actual save is `user://cluster_rush_save.dat` written by **both** `game_manager.save_progress()` and `level_manager.save_progress()`/`save_level_completion()` (duplicate writers of the same ConfigFile — risk of overwriting each other's sections if load/save interleave). P2 code-smell.

## F6 — Build hygiene: stale root export removed from git but still on disk (~39 MB)
**P2**
```
$ du -sh index.wasm index.pck index.js index.html
38M index.wasm / 772K index.pck / 308K index.js / 8.0K index.html
$ git ls-files | grep -E "^index\." ; git check-ignore -v index.wasm
(nothing tracked)  .gitignore:82:index.wasm  index.wasm
```
- Commit `0a34694` removed the 11 root-level export artifacts from git and added explicit `.gitignore` patterns (`index.html/js/wasm/pck`, `*.pck`, `Builds/`, `user://`, etc.). `Builds/WebGL/` (9 files, incl. 38.8 MB `index.wasm` + 26.3 MB `index.pck`) is tracked and is now the single deploy source.
- However the stale files remain on disk untracked; PLAN.md G7 is only partially fixed. Recommend deleting them locally.

## F7 — PLAN.md ground-truth is now stale
**P2**
- G3 (wrong GL flags): still true (see F3).
- G4/G5 ("GUT not installed", "tests/unit missing"): **resolved** by `120e632` (GUT 9.7.1 in `addons/gut`, 3 passing unit tests, 2 integration tests, pipeline + CI fixed to GUT commands).
- G6 (levels removed): still true (F4). G7: partially resolved (F6).
- Also `tests/test-run-summary.json` claims "41 L1 tests passed" with results in `tests/editmode/`, `tests/playmode/` — that predates GUT; the real GUT suite has 3 tests. The JSON is a stale artifact and should not be cited as current test state.

## F8 — Recent git history (verified)
**P2** (informational)
```
$ git log -5 --format='%h %ad %s' --date=short
120e632 2026-08-30 build(testing): Install GUT addon, add smoke tests, fix pipeline + CI test steps
0a34694 2026-08-30 chore: remove stale root web export, tighten .gitignore
03d8836 2026-08-30 Merge remote-tracking branch 'origin/gh-pages'
d58f173 2026-08-30 build: Phase 6-7 WebGL export (63MB)
23e9720 2026-08-30 feat: Phase 6-7 - Level Complete/Death flow + Final Polish
```
Earlier: `e142e1c` Phase 5 truck/hazards, `3065de6` wall-jump/wall-slide, `e22d198` level-scene removal, `6198c53` regex-damage revert. Working tree is dirty: modified `PLAN.md` + 7 untracked paths (`docs/godot_webgl_optimization_guide.md`, 4 stray `*.import` files, `test-results/`, `tests/e2e/tests/`).

## Summary of severity
| Sev | Findings |
|-----|----------|
| P0  | F3 — playwright `--use-gl=egl` flags break E2E WebGL |
| P1  | F4 — no authored level content (35 scenes removed, procedural only) |
| P2  | F1 structure gaps, F2 smoke-only test coverage, F5 duplicate save writers, F6 stale ~39 MB on disk, F7 stale PLAN.md/summary, F8 dirty tree |
