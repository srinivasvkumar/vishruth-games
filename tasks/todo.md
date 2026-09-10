# D0.2 Resume — Task List (re-decomposition, 2026-09-11)

Board: `cluster-rush` — serial lane, dependency-enforced. CREATED NOT DISPATCHED: root R is
blocked (needs_input); nothing runs until the user's resume signal (orchestrator unblocks R).

## Lane
- [ ] R  — T0.2.2a RED gate closure: verify committed RED evidence, lift PAUSE — game-tester — `t_275659a6` (parent: —)
- [ ] G1 — T0.2.2 G1: align game.test.ts + minimal Audio/UI stubs (Game loadable) — game-dev — `t_013c1b58` (parent: R)
- [ ] G2 — T0.2.2 G2: align obstacle + physics-system tests (mock-cannon/mock-three) — game-dev — `t_f9206b62` (parent: G1)
- [ ] G3 — T0.2.2 G3: align retroactive-core.test.ts (46 cross-cutting tests) — game-dev — `t_072d14ba` (parent: G2)
- [ ] G4 — T0.2.2 G4: align scene-manager + game-loop tests — game-dev — `t_d69e44a7` (parent: G3)
- [ ] G5 — T0.2.2 G5: align constants + player tests — game-dev — `t_5a0db934` (parent: G4)
- [ ] G6 — T0.2.2 G6: new retroactive tests for coverage gaps (AssetLoader, scenes, index) — game-dev — `t_f85aba71` (parent: G5)
- [ ] GV — T0.2.2b GREEN + final D0.2 verification — game-tester — `t_e14de10c` (parent: G6)
- [ ] QG — D0.2 quality gate + sign-off — reviewer — `t_0ade5caa` (parent: GV)

## Checkpoints
- [ ] After R: RED gate closed, PAUSE lifted, tracker 0.2.2 = red_verified / ACTIVE
- [ ] After G5: all 8 TEMP-D0.2-T1 allowlist entries removed
- [ ] After G6: coverage-gap modules tested
- [ ] After GV: allowlist == exactly 2 PERMANENT; suite GREEN except hello-three; tracker green_verified
- [ ] After QG: sign-off committed; tracker 0.2.2 = completed; D0.2-COMPLETE
