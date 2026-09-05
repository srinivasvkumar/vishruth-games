# F002 — Main Menu + Settings Panel

Sources: scenes/main_menu.tscn, scripts/ui/main_menu_ui.gd, scripts/ui/settings_ui.gd.
Buttons (CONFIRMED, main_menu_ui.gd L186-227): Start Game → game.tscn; Level Select → level_select.tscn; Settings → toggles $SettingsPanel; Credits → credits.tscn.

## Test cases

- **F002-01 Menu renders with 4 buttons + settings panel hidden**
  From F001-01 end state. Expected: 4 buttons visible and clickable; SettingsPanel NOT visible on load.
  PASS: all 4 present, panel hidden. FAIL: missing button / panel showing.

- **F002-02 Start Game starts Level 1**
  Click Start Game. Expected: scene → game.tscn; HUD shows "Level 1", 3 hearts; world renders.
  PASS: level 1 label + 3 lives + moving world. FAIL: wrong level, 0 lives (see state-hazard), blank world.

- **F002-03 Level Select navigates and returns**
  Click Level Select → 35-button grid (see F003) → Back → menu. PASS: round-trip, menu state intact.

- **F002-04 Credits screen + back**
  Click Credits → credits screen renders → back → menu. PASS: renders + returns.

- **F002-05 Settings open/close + sliders persist in-session**
  Click Settings → panel visible; move SFX slider to 0; move Music slider to 0; Close → panel hidden.
  Expected: panel toggles; sliders move; no crash.
  KNOWN (CONFIRMED, audio_manager.gd L31-34): SFX playback is a print-stub AND no music player exists → **both sliders control nothing at runtime.** This test documents current behavior, not a defect. Record: "volume changes have no audible effect — audio unimplemented."

- **F002-06 Menu input: keyboard focus order**
  Tab through menu: document focus order (Buttons → ? canvas not focusable?).
  Expected: document actual order; note that gameplay keys (A/D/Space) in menu do nothing (not bound to menu).
  PASS (documentation): focus order recorded; no crash from gameplay-key spam in menu.

- **F002-07 Rapid re-click Start Game (menu→game transition stress)**
  Click Start Game 3x in quick succession during scene transition.
  Expected: scene change is idempotent-ish; game loads exactly once; no doubled LevelManager generation, no error log.
  Evidence: console + HUD level label.
  FAIL: double-init errors, "level 1" loaded twice in logs, or stuck scene.

## Defect hypotheses
- H1: SettingsPanel node missing from tscn → _on_settings() null-ref (main_menu_ui.gd L223 uses $SettingsPanel directly).
- H2: volume values not saved (SettingsUI not wired to save) — verify persistence across reload.
