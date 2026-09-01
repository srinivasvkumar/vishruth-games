# F021 — Audio (SFX + music)

Source: AudioManager autoload = **print-stub** (`play_sfx` prints, no AudioStreamPlayer anywhere — CONFIRMED). Assets on disk: 6 SFX (jump/land/death/hit/wall_slide/wall_jump) + bgm_around.wav (1.7MB, never played). Settings panel has Music + SFX sliders → **inert** (D8).

## Test cases
| ID | TC | Steps | Expected (spec) | Expected (current) | Evidence |
|----|----|-------|-----|-----|----------|
| F021-01 | Jump SFX | Jump | jump.wav plays | **silence** (print only) | audio capture |
| F021-02 | Death SFX | Die | death.wav | **silence** | audio capture |
| F021-03 | Music | Run any level | bgm_around.wav loop | **silence** (no player) | audio capture |
| F021-04 | Sliders | Settings → drag SFX 0→100 | volume change | **inert** (D8) | console (print args) |
| F021-05 | Autoplay policy | Mute tab → play game | no audio errors in console | clean console | console |

## Exit criteria
All 5 expected-to-FAIL on current build (feature not implemented). Document console print lines as the only audio "evidence". File as implementation gap, not test failure.
