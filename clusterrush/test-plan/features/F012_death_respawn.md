# F012 — Death & Respawn Flow

Source: game_scene.gd L129-153 (_on_player_died/_handle_death), level_manager.gd L647 (respawn_player → (0,0.75,0) after 1.0s, teleport (0,5,0)). CONFIRMED: NO i-frames; internal state (jump_count, wall timers) NOT reset on hazard death.

## Test cases

- **F012-01 Respawn at start after 1.0s**
  Die to a hazard. Expected: ~1.0s freeze/teleport to (0,5,0), then respawn at (0,0.75,0); auto-run resumes.
  Measure: time from death to respawn ≈1.0s.
  PASS: correct timing + position. FAIL: instant respawn or >2s.

- **F012-02 No i-frames after respawn**
  Respawn, immediately collide with a truck/hazard at start position. Expected: death again (no invincibility).
  PASS: instantly vulnerable. FAIL: ghost phase.

- **F012-03 Internal state NOT reset on hazard death**
  Use both double-jumps, then die to a hazard, respawn. Expected (per source): jump_count NOT reset → possibly no jump available right after respawn.
  Evidence: try to jump immediately post-respawn.
  DOCUMENT: record actual behavior. If jump is lost = confirm @game-dev finding (defect candidate, player-unfriendly). PASS (as finding): behavior matches source; FAIL: silent state corruption.

- **F012-04 Death during transition (fade in/out)**
  Die exactly as a transition starts (hard timing). Expected: no double-state crash; gameover if last life.
  PASS: clean handling. FAIL: crash / stuck state.

## Defect hypotheses
- H1: stale-hazard overlap at spawn (H1 of F010).
- H2: death-teleport (0,5,0) is ABOVE the track — if player is 'in air' for 1.0s, camera sway + input may behave oddly; check input gating.
