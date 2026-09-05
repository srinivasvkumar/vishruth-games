# 14. Cross-Feature Integration

| ID | TC | Flows tested | Evidence |
|----|----|--------------|----------|
| X-01 | Save → Level Select stars → gameplay lives | F019↔F003↔F013 | session |
| X-02 | Death → respawn → truck layout unchanged | F012↔F004 | screenshot (trucks frozen? respawn mid-truck?) |
| X-03 | Complete → Next → new random layout | F014↔F015↔F004 | 2 screenshots differ |
| X-04 | Pause during death animation | F017↔F012 | document (freeze at death frame?) |
| X-05 | HUD progress vs actual x | F018↔F005 | 5 checkpoints, progress = x/140 ±2% |
| X-06 | Star rating vs save vs level-select display | F014↔F019↔F003 | 3-way match |
| X-07 | GameOver Retry → level unchanged (current_level persists) | F016↔F013 | HUD level label |
| X-08 | End screen after L35 vs save highest_level | F023↔F019 | save = 35, no overflow |
