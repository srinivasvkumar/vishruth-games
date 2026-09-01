# 11. Edge Conditions & Failure Modes

| ID | TC | Steps | Expected |
|----|----|-------|-----|
| E-01 | Network drop mid-download | Throttle → offline at 30MB | clear "load failed" UI, not blank canvas |
| E-02 | 200ms slow-3G full boot | DevTools slow-3G | completes; loading UI visible (D19: currently absent) |
| E-03 | 63MB > storage quota | pre-fill browser storage | download proceeds (WASM cached in memory) or clean failure |
| E-04 | Tab hidden 10 min | play → switch tab 600s → back | document: wall-clock timer distortion (D10), paused physics? |
| E-05 | RAM pressure | open 20 tabs + game | no OOM crash; if crash → clear message |
| E-06 | GPU disabled (SwiftShader) | Chrome `--use-gl=swiftshader` | boots? fps? |
| E-07 | 4K @ 120Hz monitor | run | no frame-timing assumptions break (delta-based, not frame-based — verify) |
| E-08 | Window < 640px wide | resize | canvas scales (stretch mode none → tiny) — document playability |
| E-09 | Second tab same origin | 2 tabs playing | saves interleave (last-write-wins) — document |
| E-10 | Print screen / devtools snapshot | Ctrl+Shift+P → screenshot | no crash |
| E-11 | Clock jump (OS NTP resync mid-run) | simulate +10s | timer/star distortion bounded |
| E-12 | Keyboard unplug | USB keyboard unplug mid-run | game continues (no crash), input just stops |
