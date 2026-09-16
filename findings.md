# Findings

## Parent Commits
- A7 (t_c3a4bd20, 843a66e): MenuScene.onExit() resets started=false
- A8 (t_e0b86767, 41c7cfd): GameOverScene reads LEVEL_START payload, uses readStoredHighScore()

## Divergence Analysis (from card body)
All 3 sites use Number.parseInt(raw, 10) — '5.7' does NOT diverge.
Divergence 1: OVERFLOW CAP — ScoreManager caps via clampScore, 2 scene copies uncapped
Divergence 2: TRY/CATCH — ScoreManager has no try/catch (throws on storage-unavailable), 2 scene copies have try/catch

## Canonical Helper (superset)
```
try { raw = storage.getItem(HIGH_SCORE_KEY) } catch { return 0 }
if (raw === null) return 0
const parsed = Number.parseInt(raw, 10)
return Number.isFinite(parsed) ? clampScore(parsed) : 0
```

## Test Cases for RED
- storage-throws -> 0 (Fix A)
- '9007199254740993' -> MAX_SAFE_INTEGER (Fix B, overflow cap)
- '5.7' -> 5 (regression, documents no-op floor)
- absent -> 0
- '500' -> 500
- 'abc' -> 0
- '-5' -> 0
- '0' -> 0

## MenuScene readStoredHighScore (current, from A7)
- Uses window.localStorage.getItem(HIGH_SCORE_KEY) with try/catch
- Returns 0 on exception, 0 on null, 0 on non-finite
- Uses `parsed > 0` check (NOT clampScore) — missing overflow cap

## GameOverScene readStoredHighScore (current, from A8)
- Uses window.localStorage.getItem(HIGH_SCORE_KEY) with try/catch
- Same logic as MenuScene — missing overflow cap

## ScoreManager.loadHighScore (current, from main)
- No try/catch — bare this.storage.getItem()
- Uses clampScore — has overflow cap
- Called unguarded in constructor (L79) — throws on storage-unavailable

## A8 GameOverScene.handleLevelStart
- Calls this.readStoredHighScore() for high score
- So fixing readStoredHighScore fixes handleLevelStart too
