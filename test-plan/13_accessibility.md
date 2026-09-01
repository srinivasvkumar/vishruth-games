# 13. Accessibility (browser game, keyboard-only)

| ID | TC | Expected |
|----|----|----------|
| A-01 | Keyboard-only completion: full L1 with no mouse | PASS/FAIL (menu buttons need Tab+Enter — verify focus rings exist) |
| A-02 | Focus visible | Tab between menu buttons shows focus indicator |
| A-03 | Color independence | Tier colors (5 hues) distinguishable under deuteranopia sim (DevTools) |
| A-04 | Motion: camera sway 0.02 | low amplitude = low vestibular risk; document |
| A-05 | Text size: HUD labels at 200% zoom | readable, no clipping |
| A-06 | No audio dependence | all info available visually (audio is stub anyway — D8) |
| A-07 | Pause reachable without numpad | **currently FAIL (D3)** — keyboard-only laptops can't pause |
| A-08 | Screen reader | canvas game = not SR-accessible; document as out-of-scope-with-statement |
