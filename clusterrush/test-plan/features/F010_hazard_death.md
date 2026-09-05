# F010 — Hazard Collision & Death Pipeline

Source: level_manager.gd L691-699 (Area3D body_entered → GameManager.player_died), game_manager.gd player_died() L45-52 (lives--, emit; 0→gameover else respawn).

## Test cases

- **F010-01 Single death decrements exactly one life**
  Force a hazard death. Expected: lives -1 exactly; HUD heart updates.
  PASS: -1. FAIL: -2 (double signal) or 0.

- **F010-02 Death fires once per overlap (no signal spam)**
  Stay overlapping a hazard through the death/respawn sequence. Expected: exactly one death event per overlap.
  Evidence: console; lives delta.
  PASS: one event. FAIL: cascading deaths (player teleports (0,5,0) but stale signal fires again).

- **F010-03 2-way check (player or child)**
  Trigger death; verify handler catches both direct body and player-child bodies.
  PASS: consistent detection. FAIL: some geometry class missed.

- **F010-04 Death during fall-death (y<-10) and hazard race**
  Fall toward y<-10 while a hazard is also reachable. Expected: exactly one death, correct source.
  PASS: single decrement. FAIL: double decrement.

## Defect hypotheses
- H1 (HIGH): @game-dev #5b — death teleport to (0,5,0) could overlap a stale hazard → instant second death on respawn if the hazard's Area3D is still armed at spawn.
