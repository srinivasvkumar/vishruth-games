# Task: M4-01 - First Frame/FPS Measurement

## TASK ID
M4-01

## OWNER
game-tester

## MILESTONE
M4 - Performance & Polish

## OBJECTIVE
Measure and document first frame render time and FPS performance on real hardware (not SwiftShader). Verify the game achieves acceptable performance metrics.

## SOURCE OF TRUTH
Boss_Plan.md Section 10 (M4 - Performance & Polish), M4-01 requirement

## DEPENDENCIES
- None (can run independently)

## FILES/AREAS
- Builds/WebGL (authoritative build)
- test-plan/12_performance.md (performance test plan)
- test-plan/evidence/performance/ (for storing results)

## EXACT ACTIONS
1. Build or use existing WebGL build from Builds/WebGL
2. Serve the build with proper COOP/COEP headers (use server.py or similar)
3. Run performance tests in Chrome on real hardware (not headless)
4. Measure:
   - First frame render time
   - Average FPS during gameplay
   - FPS during truck/hazard encounters
   - Memory usage
5. Record metrics with timestamps and hardware specs
6. Capture screenshots/video of performance metrics

## DO NOT CHANGE
- Production gameplay code
- Build configuration (unless necessary for measurement)

## EXPECTED OUTPUT
- Performance metrics report with:
  - First frame time (ms)
  - Average FPS (target: 60 FPS on mid-range hardware)
  - Frame time variance
  - Memory usage
- Screenshots of performance overlay
- Video recording if FPS issues observed

## REQUIRED EVIDENCE
- Screenshot of FPS counter/developer tools performance tab
- Performance metrics written to: boss/results/M4-01-performance-metrics.md
- Console output showing frame timing

## HANDOFF CONDITION
- Metrics documented in boss/results/M4-01-performance-metrics.md
- Results reviewed by reviewer
- If FPS < 60 on mid-range hardware, report as DEFECT for game-dev to optimize

## PRIORITY
P1 (Performance baseline for M4-GATE)

## NOTES
- SwiftShader is NOT acceptable for performance testing - must use real GPU
- Document hardware specs used for testing
- Test on both Chrome and Firefox if possible
