# Cluster Rush QA — Discussion Log

All entries are REAL teammate replies (file evidence: /tmp/cr_qa/<file>.out). No content
is simulated. Lead (boss_bot) verified every P0/P1 claim against source before it entered
findings.md / features.

## Round 1 — Shared reconnaissance

### @researcher (audit-findings.md, /tmp/cr_qa/researcher.out, 17 KB)
Verified corrections to findings.md (lead confirmed each against source):
- Renderer is **Forward Mobile** (renderer_backend=0), not Forward Plus.
- `reset` (R / physical 82) has **no consumer** — dead binding.
- `test_simple.tscn` is referenced nowhere — orphan.
- user:// on WebGL → **browser IndexedDB per origin**, not localStorage.
- `camera_controller.gd` (FollowCamera third-person) is dead code; game.tscn uses first_person_camera.
- `AudioManager.play_sfx` is a **print-stub**; no AudioStreamPlayer anywhere. bgm_around.wav orphan.
- 35 levels / 5 tiers / 35 buttons confirmed.

### @game-dev (plan-implementation-analysis.md, /tmp/cr_qa/game-dev.out, 19 KB)
Implementation fragility (lead-verified):
- collision_mask: player_movement L75 sets 7, **LevelManager._place_player L557 overwrites to MASK_PLAYER=3** (Ground|Truck, no Hazard). Hazard detection is **signal-only** via Area3D body_entered.
- R (reset) is a no-op.
- Respawn position (0,0.75,0) after 1.0s; **no i-frames**; internal state NOT reset on hazard death.
- Sync level generation; LoadingScreen ≤1 frame.
- Truck re-generation on retry is fully random (no seed).
- Timing: debris spawn 3-5s, hammer period 1.5-3s, swerve 2.5s, speed re-roll 1.5s.

### @game-tester (/tmp/cr_qa/game-tester.out, 18 KB)
Execution-realism input (lead-verified):
- Evidence protocol: screenshot points, console capture, network waterfall, DevTools Performance.
- Browser-specific risks: WebGL context loss, tab-switch frame timing, IndexedDB quota, 63 MB download, resize, zoom, refresh mid-level, mobile soft-lock.
- Non-QWERTY physical-keycode concerns.

### @reviewer — **UNBLOCKED, round-3 dispatch running**
Profile `reviewer/config.yaml` had `messaging` in `platform_toolsets` — not a registered toolset in this Hermes build → CLI failed before the agent started. **Fix applied 2026-09-02:** both `messaging` entries removed (backup: `/tmp/reviewer_config_backup.yaml`, YAML validated). Real adversarial review now running (`/tmp/cr_qa/reviewer4.out`) — entry to be appended on receipt. Until then the "reviewer" column = **lead self-audit only**, not @reviewer work.

## Round 2 — Feature-cluster test decomposition input

### @researcher (researcher2.out, 17 KB)
Source-cited defect hypotheses for F001/F002/F003/F019/F021/F022/F023/F024/F025. Lead-verified P0/P1 items:
- F001: no loading UI pre-boot; GitHub Pages has no COOP/COEP → WASM may fail.
- F002: music + SFX sliders inert (print-stub audio). Start Game always L1.
- F019: two save writers to same ConfigFile (game_manager + level_manager). No reset-progress UI.
- F021: AudioManager print-stub, 6 SFX + 1 music orphan.
- F023: end-screen score label **never populated** (set_score not called).
- F024: credits screen has no exit — trap.
- F025: tutorial gap [3.0,4.0] may make L5 harder than L1 (inverse curve); expert may be unpassable.

### @game-dev (game-dev2.out, 24 KB)
Source-cited defect hypotheses F004–F016, F020, F027. Lead-verified:
1. **F016 DH1 (CRITICAL)**: `reload_current_scene()` on Retry/Next does NOT call `GameManager.start_level()` → lives/score/level_start_time persist. After GameOver (lives=0) → Retry → playable with 0 lives → next hazard = instant re-GameOver.
2. **F014 DH1 (HIGH)**: star formula — `lives>=2 → 2★`, `lives>=3 AND bonus>=50 → 3★`. 3 lives + low bonus → 2★ (should be 3★).
3. **F013 DH1 (HIGH)**: "Start Game" from main menu gives 3 lives for ALL levels (start_level not called from main_menu_ui.gd).
4. **F005 DH1 (HIGH)**: `velocity.x = AUTO_RUN_SPEED` every physics frame (L307) overwrites ramp/wall-jump X-momentum.
5. **F012 DH1 (MED)**: possible double-respawn (GameManager.player_died calls respawn_player immediately, then _handle_death awaits 1s and calls it again).
6. **F008 DH1 (MED)**: ramp has no x-min 5.0 check.
7. **F006 DH1 (LOW-MED)**: wall climb direction — both strafe-left and strafe-right climb UP.
8. **F007 DH1 (LOW)**: swerve multiplier ×5 → effective Z range ±15, not ±1.5.
9. **F020 DH1 (LOW)**: camera sway 0.02 vs spec 0.1.

### @game-tester (game-tester2.out, 10 KB)
Execution-realist battery (40 cases). Lead-verified P0:
1. **Pause double-toggle** (input_manager L27-30 AND game_scene L68-69 both flip `get_tree().paused` in same frame → net no-op).
2. **Pause key is KP_Enter (4194310), not Escape** (verified in project.godot L132-141).
3. **Retry/Start-Game carry lives=0** (same as @game-dev F016 DH1).
4. **Hazard vs complete race at x=140** (completion gated by _is_transitioning; hazard body_entered not gated).
5. **Tab-switch wall-clock timer** (Time.get_ticks_msec not delta; +5s jump corrupts star rating).
6. **HUD StyleBoxFlat churn** (hud.gd L80-82 creates 3 new StyleBoxFlat every _update_progress_bar call = ~10Hz → 30/s allocation).
7. **Non-QWERTY physical-keycode** (AZERTY A↔Q swap; Dvorak; Japanese).
8. **Mobile soft-lock** (no touch controls, no on-screen pause, no exit path).

## Verified defect ledger (P0/P1 — to be tested as-is, not hypothesized)

| ID | Sev | Feature | Claim (source-verified) |
|----|-----|---------|--------------------------|
| D1 | P0 | F016 | Retry/Next Level reloads scene without start_level() → lives/score/timer persist. Post-GameOver Retry starts lives=0. |
| D2 | P0 | F017 | Pause is double-bound (input_manager + game_scene) → net no-op on single keypress. |
| D3 | P0 | F017 | Pause key is KP_Enter (4194310), not Escape. Escape does nothing. |
| D4 | P0 | F014 | Hazard body_entered not gated by _is_transitioning → can race completion at x=140. |
| D5 | P1 | F014 | Star formula: 3 lives + bonus<50 → 2★ (should be 3★ per spec). |
| D6 | P1 | F013 | "Start Game" main menu → 3 lives always (start_level not called). |
| D7 | P1 | F005 | AUTO_RUN_SPEED overwrites X-momentum every physics frame. |
| D8 | P1 | F002 | SFX + Music sliders inert (AudioManager print-stub, no AudioStreamPlayer). |
| D9 | P1 | F018 | HUD _update_progress_bar allocates 3 StyleBoxFlat per call (~10Hz) → heap churn. |
| D10 | P1 | F018 | Tab-switch wall-clock timer jump → star/score corruption. |
| D11 | P1 | F023 | End-screen score label never populated (set_score uncalled). |
| D12 | P1 | F024 | Credits screen is static (credits_ui.gd = 20B, no script in credits.tscn) — likely no exit button → trap. Verify. |
| D13 | P2 | F008 | Ramp no x-min check. |
| D14 | P2 | F012 | Possible double-respawn on hazard death. |
| D15 | P2 | F006 | Wall climb: both strafe directions climb UP. |
| D16 | P2 | F007 | Swerve ×5 multiplier → Z ±15 (spec ±1.5). |
| D17 | P2 | F020 | Camera sway 0.02 (spec 0.1). |
| D18 | P2 | F025 | Tutorial gap [3.0,4.0] may make L5 harder than L1. |
| D19 | P2 | F001 | No loading UI pre-boot; GitHub Pages COOP/COEP missing. |
| ~~D20~~ | — | — | **RETRACTED by lead**: @researcher's "two save writers" claim is wrong — game_manager.gd L78 documents a single writer; level_manager's ConfigFile refs are read-only (get_unlocked/get_star_rating). |
