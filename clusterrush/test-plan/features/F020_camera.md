# F020 — Camera (first-person follow, yaw, airborne sway)

Source: first_person_camera.gd (game.tscn active camera, L42-44): follow +（0,1.5,0), position lerp factor 10.0*delta, yaw match from player, airborne sway = `sin(time*3.0)*0.02` (L50). camera_controller.gd (FollowCamera, third-person) = **dead code**, not in any scene (CONFIRMED by @researcher).

## Defect hypotheses (source-verified)
- **D17 (P2)**: airborne sway amplitude 0.02 vs spec 0.1 (first_person_camera.gd L4 comment says "spec: ±0.1 units").

## Test cases
| ID | TC | Steps | Expected | Evidence |
|----|----|-------|-----|----------|
| F020-01 | Follow offset | Stand still in air | camera ≈ player+(0,1.5,0) within lerp steady-state | screenshot + Debug print |
| F020-02 | Yaw match | Strafe A/D 3s | camera rotates with player yaw | video |
| F020-03 | **D17** Sway | Jump, freeze-frame at apex | ±0.02 amplitude (defect: spec 0.1) | video measure |
| F020-04 | No jitter at speed | Full-speed run 10s | no oscillation beyond sway | video |
| F020-05 | Camera at spawn | Level load | no camera fly-in from origin | video |
| F020-06 | Camera behind wall? | Run along truck | camera may clip into truck geometry (no collision) — document | video |

## Exit criteria
F020-01…05 PASS (03 documents D17). F020-06 documented.
