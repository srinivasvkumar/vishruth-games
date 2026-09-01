# F006 — Wall Mechanics (slide, wall-jump, Q-climb)

Source: player_movement.gd; game.tscn raycasts (left/right, length 1.0).
Wall slide: max fall 2.0; wall-jump: (7.0, 10.5); wall coyote 0.1s; Q-climb 1.5 m/s.

## Test cases

- **F006-01 Wall slide**
  Push player into a wall while falling. Expected: fall speed capped at 2.0; wall-slide SFX/particle; visual state change.
  PASS: capped fall, slide feedback. FAIL: free-fall past cap.

- **F006-02 Wall jump**
  While sliding, press Space. Expected: wall-jump impulse (7.0 horizontal away, 10.5 vertical); player leaves wall.
  PASS: launches away+up. FAIL: no impulse or wrong direction.

- **F006-03 Wall coyote (0.1s)**
  Leave a wall, press Space within 0.1s. Expected: wall-jump still available.
  PASS: works in window. FAIL: not available.

- **F006-04 Q-climb**
  While against a wall, hold Q. Expected: player climbs at ~1.5 m/s; releasing Q stops climbing.
  PASS: upward climb, stops on release. FAIL: no climb or falls while held.

- **F006-05 Raycast false-positives**
  Place player near geometry <1.0 units but not a "wall" (e.g. thin hazard). Expected: raycast (len 1.0) may detect it — check for spurious slide state.
  PASS: no false slide on non-walls. FAIL: stuck in slide state.

## Defect hypotheses
- H1: raycast length 1.0 could miss thick truck sides → no slide when expected.
- H2: wall-jump direction uses raycast side; verify correct axis on both left/right walls.
