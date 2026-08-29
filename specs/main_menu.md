# Spec: Main Menu UI — Phase 1
## Status: **COMPLETE** (Archived)
## Completed: 2026-08-29

## Purpose
Provide a centered, playable main menu with Start, Level Select, Settings, and Credits buttons.

## Acceptance Criteria (Verified)
- [x] Title "Cluster Rush" visible and centered
- [x] 4 buttons: Start Game, Level Select, Settings, Credits
- [x] All buttons clickable and navigate correctly
- [x] Menu loads without Godot parse errors
- [x] Canvas fills browser viewport
- [x] WebGL build < 50 MB

## Implementation
- Scene: `scenes/main_menu.tscn`
- Script: `scripts/ui/main_menu_ui.gd`
- Renderer: Mobile/WebGL1
- Server: `www/cors_server.py` (COOP/COEP/CORP headers)

## Notes
Phase 1 is locked. No further changes unless explicitly requested.
