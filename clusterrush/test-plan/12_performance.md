# 12. Performance & Stability Budgets

| ID | Metric | Budget | Method |
|----|--------|--------|--------|
| P-01 | Boot time (local, 1Gbps) | < 30s to main menu | stopwatch + network waterfall |
| P-02 | First playable frame after L1 load | < 500ms from scene load | console timestamps |
| P-03 | Steady-state FPS (L1, desktop Chrome) | ≥ 30 fps | DevTools perf 30s |
| P-04 | Worst-frame p99 (30s run) | < 100ms | DevTools perf |
| P-05 | Heap growth (60s run) | < 50MB delta | DevTools memory snapshot 10s/60s |
| P-06 | **D9** HUD allocation rate | baseline → 30 StyleBoxFlat/s | heap snapshot diff |
| P-07 | 30-min soak (F027-05) | no crash, heap < 500MB, p99 < 100ms | automated loop |
| P-08 | WASM single-thread CPU | < 60% one core at steady state | task manager |
| P-09 | Download size | 63MB — **over 50MB target** — document; test on 500kbps: time-to-playable < 4 min | throttle |
| P-10 | Level gen sync cost | L1 < 100ms, L35 < 300ms (no loading spinner needed but measure) | console |
