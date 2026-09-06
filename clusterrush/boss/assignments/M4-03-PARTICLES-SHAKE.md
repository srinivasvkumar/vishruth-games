# Task: M4-03 - Particles and Screen Shake Implementation

## TASK ID
M4-03

## OWNER
game-dev

## MILESTONE
M4 - Performance & Polish

## OBJECTIVE
Integrate existing particle effects system into gameplay and implement screen shake for impactful moments (death, truck encounters, landings).

## SOURCE OF TRUTH
Boss_Plan.md Section 10 (M4 - Performance & Polish), M4-03 requirement

## DEPENDENCIES
- M4-01, M4-02 can run in parallel
- ParticleEffects.gd already exists (scripts/utilities/particle_effects.gd)

## FILES/AREAS
- scripts/utilities/particle_effects.gd (already exists)
- scripts/game_scene.gd
- scripts/player/player_controller.gd (or similar)
- scripts/hazards/*.gd
- autoloads/game_manager.gd
- scenes/game.tscn

## EXACT ACTIONS
1. **Integrate Particle Effects:**
   - Add ParticleEffects node to game scene
   - Call spawn methods at appropriate moments:
     - spawn_jump_particles() on player jump
     - spawn_land_particles() on landing
     - spawn_death_particles() on player death
     - spawn_complete_particles() on level completion
     - spawn_spark_particles() on hazard contact

2. **Implement Screen Shake:**
   - Create ScreenShake utility class or add to camera
   - Implement shake methods:
     - shake_weak() (minor impacts)
     - shake_medium() (truck encounters)
     - shake_strong() (death/explosions)
   - Add shake trigger points:
     - Player death
     - Truck near-miss or collision
     - Level completion

3. **Performance Considerations:**
   - Ensure particles autofree properly
   - Limit particle count to maintain 60 FPS
   - Use GPUParticles3D (already implemented)

## DO NOT CHANGE
- Core gameplay mechanics
- Player physics
- Hazard behavior

## EXPECTED OUTPUT
- Visual particle effects on:
  - Jump (green particles)
  - Landing (yellow particles)
  - Death (red particles)
  - Level complete (gold particles)
  - Hazard contact (spark particles)
- Screen shake on:
  - Death
  - Truck encounters
  - Major impacts
- No performance degradation (maintain 60 FPS)

## REQUIRED EVIDENCE
- Screenshots/video showing particle effects in action
- Screenshots/video showing screen shake
- Performance metrics showing no FPS regression
- boss/results/M4-03-particles-screen-shake.md with:
  - List of particle effects implemented
  - Screen shake intensity levels
  - Performance impact assessment

## HANDOFF CONDITION
- All particle effects working in-game
- Screen shake implemented and functional
- No performance regression (verified by M4-01)
- Game-tester verifies visual effects work correctly
- Results documented in boss/results/M4-03-particles-screen-shake.md

## PRIORITY
P1 (Visual polish)

## NOTES
- ParticleEffects.gd already exists with all spawn methods implemented
- Need to integrate calls into gameplay scripts
- Screen shake may need to be implemented from scratch
- Ensure effects are visible but not distracting
