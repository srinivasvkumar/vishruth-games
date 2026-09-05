# 15. Regression Suite (run on every build)

Purpose: fast smoke to catch "broken past main menu"-class regressions before deep testing.

## P0 smoke (target: < 10 min, every build)
| # | Check | Pass signal |
|---|-------|-------------|
| R1 | Boot to main menu (Chrome, live URL) | menu visible |
| R2 | Start Game → gameplay renders (player + trucks + ground + HUD) | screenshot |
| R3 | Run 10s: auto-advance + strafe + jump all respond | video |
| R4 | Kill player (walk into truck) → death → respawn | HUD hearts 3→2 |
| R5 | 2nd death → GameOver overlay | screenshot |
| R6 | Retry → **lives = 3** (D1 gate — currently FAILS) | HUD |
| R7 | Complete L1 (or force) → Level Complete + Next | screenshot |
| R8 | Save persists after refresh | Level Select shows L1 stars |

## P1 extended (target: < 30 min, on milestone builds)
R9-R16: pause flow (D2/D3 gate), credits exit (D12), end-screen score (D11), star formula (D5), tier lives (D6), Firefox parity, 30-min soak, performance budgets P-01…P-06.

## Exit gate
A build is "stable" when all P0 smoke PASS. P1 failures are tracked in the defect ledger.
