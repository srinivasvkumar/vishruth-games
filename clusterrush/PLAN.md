1|1|# Cluster Rush - Unity Development Plan
2|2|
3|3|**Status:** Draft - Pending Approval  
4|4|**Created:** 2026-08-26  
5|5|**Target Platform:** WebGL (Local Browser)  
6|6|**Engine:** Unity 2022.3 LTS
7|7|
8|8|---
9|9|
10|10|## 1. Executive Summary
11|11|
12|12|### Goal
13|13|Build a locally-runnable Cluster Rush clone in Unity with proper UI/UX, physics-driven truck movement, and 35 levels of escalating difficulty.
14|14|
15|15|### Why Unity
16|16|- Original Cluster Rush was built in Unity (proven path)
17|17|- First-person camera + physics is Unity's sweet spot
18|18|- Visual editor accelerates level design (35 levels)
19|19|- WebGL export for local browser running
20|20|- Built-in PhysX physics engine
21|21|
22|### Success Criteria
23|- ✅ Player can jump, double-jump, wall-climb between moving trucks
24|- ✅ Trucks move with physics-driven chaos (not scripted paths)
25|- ✅ 35 handcrafted levels with escalating difficulty
26|- ✅ First-person perspective with proper depth perception
27|- ✅ Hazards: saw blades, ramps, falling debris
28|- ✅ WebGL build runs smoothly in browser
29|- ✅ All features tested and verified by agent
30|
31|### Mandatory Testing Protocol (Required for Every Milestone)
32|**All 4 testing approaches must be executed and documented for every milestone and phase:**
33|
34|| # | Approach | Tool | Purpose | Deliverable |
35||---|----------|------|---------|-------------|
36|| 1 | **Playwright Automation** | `playwright` skill | Browser automation to verify game flows (jump, climb, level completion) | Automated test script + pass/fail report |
37|| 2 | **Performance Profiling** | `browser-testing-with-devtools` | Monitor FPS (60 target), memory usage, frame timing | DevTools performance profile + metrics log |
38|| 3 | **WebApp Testing** | `webapp-testing` skill | UI responsiveness, accessibility, cross-browser compatibility | Accessibility audit + cross-browser matrix |
39|| 4 | **Systematic Debugging** | `software-development:systematic-debugging` | Root cause analysis for bugs using 4-phase method | Bug report with root cause + fix verification |
40|
41|**Protocol:**
42|1. Before marking any milestone complete, run all 4 approaches.
43|2. Document results in `tests/milestones/{milestone-name}/` with:
44|   - Playwright test output
45|   - DevTools performance profile
46|   - Accessibility audit report
47|   - Debugging log for any issues found
48|3. Minimum pass criteria: 60 FPS sustained, no critical accessibility violations, all automated tests passing.
49|4. If any approach fails, iterate until all 4 meet quality gates before proceeding.

### Test Plan Strategy (4-Layer Approach)

**Objective:** Ensure robust, efficient testing by running checks in the correct order to catch issues early and avoid wasting time on slow WebGL builds.

#### Layer 1: Unit Tests (EditMode)
- **Tool:** Unity Test Framework (Edit Mode)
- **Purpose:** Test logic in isolation (no Unity engine required). Fast execution (<1s).
- **Scope:** 
  - Player mechanics (jump force, double-jump state machine)
  - Truck physics calculations (velocity, collision detection logic)
  - Level template parameter validation
- **Execution:** Run automatically on every code commit.

#### Layer 2: Integration Tests (PlayMode)
- **Tool:** Unity Test Framework (Play Mode)
- **Purpose:** Test interactions between components inside the Unity Editor.
- **Scope:**
  - Player + Truck collision resolution
  - Hazard triggering and death logic
  - UI state transitions (Menu → Game → Pause → Game Over)
- **Execution:** Run before every WebGL build. **Mandatory gate.**

#### Layer 3: End-to-End (E2E) Automation
- **Tool:** Playwright + `computer_use`
- **Purpose:** Verify complete user journeys in the actual browser environment.
- **Scope:**
  - Level completion flows (Start → Play → Win/Loss)
  - Input responsiveness (jump, strafe, wall-climb)
  - Performance baseline checks (FPS > 60 sustained)
- **Execution:** Run nightly or before major milestones.

#### Layer 4: Performance Profiling
- **Tool:** Chrome DevTools (Performance & Memory Panels)
- **Purpose:** Monitor runtime metrics in the browser.
- **Scope:**
  - Frame timing (target: 16.6ms/frame)
  - Memory leaks (heap growth over time)
  - CPU/GPU utilization
- **Execution:** Run during performance-critical milestones (e.g., Phase 6: 35 Levels).

### Test Execution Workflow
1. **Pre-Commit:** Run Layer 1 (Unit) tests. Fail = block commit.
2. **Pre-Build:** Run Layer 2 (PlayMode) tests. Fail = block WebGL build.
3. **Milestone Complete:** Run Layer 3 (E2E) + Layer 4 (Profiling).
4. **Bug Resolution:** Use `software-development:systematic-debugging` 4-phase method for any failures.

### Deliverables per Milestone
- `tests/editmode/` — Unit test results
- `tests/playmode/` — Integration test logs
- `tests/e2e/` — Playwright screenshots + video recordings
- `tests/performance/` — DevTools JSON profiles

---

## 2. Game Design Document
54|34|
55|35|### Core Mechanics
56|36|
57|37|| Mechanic | Description | Implementation |
58|38||----------|-------------|----------------|
59|39|| **Auto-Run** | Player runs forward automatically | Constant forward velocity on player |
60|40|| **Jump** | Single jump to clear gaps | Physics-based jump with configurable force |
61|41|| **Double-Jump** | Second jump mid-air | State machine tracking jump count |
62|42|| **Wall-Climb** | Climb vertical truck surfaces | Raycast detection + ladder-like movement |
63|43|| **Strafe** | Left/right movement | A/D or Arrow keys for lateral movement |
64|44|| **Death** | Fall between trucks or touch ground | Trigger colliders on ground/gaps |
65|45|
66|46|### Truck System
67|47|
68|48|| Component | Responsibility |
69|49||-----------|----------------|
70|50|| **TruckController** | Individual truck movement (acceleration, braking, swerving) |
71|51|| **TruckClusterManager** | Spawns trucks, manages cluster formation/breaking patterns |
72|52|| **TruckPhysics** | Physics material, collision layers, moving platform behavior |
73|53|
74|54|### Hazards
75|55|
76|56|| Hazard | Behavior | Kill Condition |
77|57||--------|----------|----------------|
78|58|| **Saw Blades** | Spinning obstacles on truck roofs | Contact = instant death |
79|59|| **Ramps** | Launch player vertically | Can be used strategically or cause fall |
80|60|| **Falling Debris** | Drops from above, concussive explosions | Direct hit = death, sound distraction |
81|61|| **Swinging Hammers** | Pendulum-style obstacles | Contact = knockback or death |
82|62|
83|63|### Level Design
84|64|
85|65|| Aspect | Details |
86|66||--------|---------|
87|67|| **Total Levels** | 35 |
88|68|| **Structure** | 5 difficulty tiers (7 levels each) |
89|69|| **Progression** | Same core mechanics, increasing truck speed, tighter gaps, more hazards |
90|70|| **Pattern** | Each level has repeating rhythm underneath chaos |
91|71|
92|72|### UI/UX Requirements
93|73|
94|74|| Screen | Elements |
95|75||--------|----------|
96|76|| **Main Menu** | Start Game, Level Select, Settings, Credits |
97|77|| **HUD** | Current level, lives remaining, time elapsed |
98|78|| **Level Complete** | Success screen, next level button, time bonus |
99|79|| **Game Over** | Retry button, level select, main menu |
100|80|| **Pause Menu** | Resume, Restart, Main Menu, Settings |
101|81|
102|82|---
103|83|
104|84|## 3. Technical Architecture
105|85|
106|86|
107|### Input System Configuration (Complete Specification)
108|### Level Template Schema (5 Templates for 35 Levels)
109|
110|**Template-Based Approach**: 5 core templates with parameter variations for 35 unique levels.
111|
112|#### Template Definition Schema
113|
114|```csharp
115|[System.Serializable]
116|public class LevelTemplate
117|{
118|    public string templateName;
119|    public int truckCountMin;
120|    public int truckCountMax;
121|    public float baseSpeedMin;
122|    public float baseSpeedMax;
123|    public float speedVariation;
124|    public float gapSizeMin;
125|    public float gapSizeMax;
126|    public float truckSpacing;
127|    public List<HazardConfig> hazards;
128|    public float formationPhaseDuration;
129|    public float dispersionPhaseDuration;
130|    public float levelLength;
131|    public int lives;
132|    public float timeBonusMultiplier;
133|}
134|
135|public class HazardConfig
136|{
137|    public HazardType type;
138|    public int count;
139|    public float spawnInterval;
140|    public float activeDuration;
141|}
142|
143|public enum HazardType { SawBlade, FallingDebris, SwingingHammer, Ramp }
144|```
145|
146|#### Template Parameters
147|
148|| Template | Levels | Truck Count | Speed (m/s) | Gap Size (m) | Hazard Count | Formation Time | Dispersion Time |
149||----------|--------|-------------|-------------|--------------|--------------|----------------|-----------------|
150|| **T1 - Tutorial** | 1-5 | 1-2 | 10-12 | 3.0-4.0 | 0-1 | 15s | 10s |
151|| **T2 - Easy** | 6-10 | 2-3 | 12-15 | 2.5-3.5 | 1-2 | 12s | 8s |
152|| **T3 - Medium** | 11-20 | 4-6 | 15-18 | 2.0-3.0 | 2-3 | 10s | 6s |
153|| **T4 - Hard** | 21-30 | 6-8 | 18-22 | 1.5-2.5 | 3-4 | 8s | 5s |
154|| **T5 - Expert** | 31-35 | 8-10 | 22-25 | 1.0-2.0 | 4-5 | 6s | 4s |
155|
156|**Level Variation Algorithm:**
157|```csharp
158|public LevelTemplate GenerateLevel(int levelNumber)
159|{
160|    Template = levelNumber <= 5 ? T1 : levelNumber <= 10 ? T2 :
161|               levelNumber <= 20 ? T3 : levelNumber <= 30 ? T4 : T5;
162|    
163|    float speedMultiplier = 1f + (levelNumber * 0.03f);
164|    float gapReduction = 1f - (levelNumber % 7) * 0.1f;
165|    
166|    return new LevelTemplate {
167|        truckCount = Random.Range(Template.truckCountMin, Template.truckCountMax + 1),
168|        baseSpeed = Template.baseSpeedMin * speedMultiplier,
169|        gapSize = Template.gapSizeMin * gapReduction,
170|        hazards = SelectHazardCombination(levelNumber % 5)
171|    };
172|}
173|```
174|
175|**Design Principles:**
176|- Progressive difficulty (each level slightly harder)
177|- Skill introduction (new hazards gradually introduced)
178|- Rhythm consistency (predictable patterns beneath chaos)
179|- Fair deaths (all deaths feel like player error)
180|
181|---
182|
183|
184|
185|
186|**Unity New Input System Package Required**: `com.unity.inputsystem@1.7.0+`
187|
188|**Input Actions Asset**: `Assets/Input/InputActions.inputactions`
189|
190|#### Action Maps & Controls
191|
192|| Action Map | Action | Control Type | Default Binding | Description |
193||------------|--------|--------------|-----------------|-------------|
194|| **Player** | Jump | Button | Spacebar | Primary jump (triggers single/double jump) |
195|| **Player** | StrafeLeft | Axis (1D) | A / Left Arrow | Move left |
196|| **Player** | StrafeRight | Axis (1D) | D / Right Arrow | Move right |
197|| **Player** | Climb | Button | W / Up Arrow | Wall-climb activation (contextual) |
198|| **Player** | Pause | Button | Escape / P | Pause game |
199|| **UI** | NavigateUp | Axis (2D) | Arrow Up | Navigate UI up |
200|| **UI** | NavigateDown | Axis (2D) | Arrow Down | Navigate UI down |
201|| **UI** | Submit | Button | Enter | Select UI element |
202|| **UI** | Cancel | Button | Escape | Back out of UI |
203|
204|**Code Example:**
205|```csharp
206|// PlayerInputController.cs
207|public class PlayerInputController : MonoBehaviour
208|{
209|    private InputActions inputActions;
210|    private InputAction jumpAction;
211|    private InputAction strafeAction;
212|    private InputAction climbAction;
213|    
214|    void Awake()
215|    {
216|        inputActions = new InputActions();
217|        jumpAction = inputActions.Player.Jump;
218|        strafeAction = inputActions.Player.Strafe;
219|        climbAction = inputActions.Player.Climb;
220|        
221|        jumpAction.performed += ctx => OnJump();
222|        strafeAction.performed += ctx => OnStrafe(ctx.ReadValue<Vector2>());
223|        climbAction.performed += ctx => OnClimb();
224|    }
225|    
226|    void OnEnable() => inputActions.Enable();
227|    void OnDisable() => inputActions.Disable();
228|}
229|```
230|
231|**Accessibility Features:**
232|- Full control remapping in Settings menu
233|- One-handed control presets
234|- 0.1s input buffer for forgiving controls
235|- On-screen button prompts
236|
237|---
238|
239|
240|### Project Structure
241|87|
242|88|```
243|89|ClusterRush/
244|90|├── Assets/
245|91|│   ├── Scenes/
246|92|│   │   ├── MainMenu.unity
247|93|│   │   ├── Level_01.unity through Level_35.unity
248|94|│   │   └── EndScreen.unity
249|95|│   ├── Scripts/
250|96|│   │   ├── Player/
251|97|│   │   │   ├── PlayerMovement.cs
252|98|│   │   │   ├── PlayerJump.cs
253|99|│   │   │   ├── PlayerClimb.cs
254|100|│   │   │   └── PlayerState.cs
255|101|│   │   ├── Truck/
256|102|│   │   │   ├── TruckController.cs
257|103|│   │   │   ├── TruckClusterManager.cs
258|104|│   │   │   ├── TruckPattern.cs
259|105|│   │   │   └── TruckSpawner.cs
260|106|│   │   ├── Hazards/
261|107|│   │   │   ├── SawBlade.cs
262|108|│   │   │   ├── FallingDebris.cs
263|109|│   │   │   ├── Ramp.cs
264|110|│   │   │   └── SwingingHammer.cs
265|111|│   │   ├── Camera/
266|112|│   │   │   └── FirstPersonCamera.cs
267|113|│   │   ├── UI/
268|114|│   │   │   ├── MainMenuUI.cs
269|115|│   │   │   ├── HUD.cs
270|116|│   │   │   ├── LevelCompleteUI.cs
271|117|│   │   │   └── PauseMenu.cs
272|118|│   │   ├── Managers/
273|119|│   │   │   ├── GameManager.cs
274|120|│   │   │   ├── LevelManager.cs
275|121|│   │   │   └── AudioManager.cs
276|122|│   │   └── Utilities/
277|123|│   │       ├── Singleton.cs
278|124|│   │       └── Extensions.cs
279|125|│   ├── Prefabs/
280|126|│   │   ├── Player.prefab
281|127|│   │   ├── Truck.prefab
282|128|│   │   ├── Hazards/
283|129|│   │   │   ├── SawBlade.prefab
284|130|│   │   │   ├── FallingDebris.prefab
285|131|│   │   │   └── Ramp.prefab
286|132|│   │   └── UI/
287|133|│   ├── Materials/
288|134|│   │   ├── TruckMaterials/
289|135|│   │   ├── HazardMaterials/
290|136|│   │   └── EnvironmentMaterials/
291|137|│   ├── Models/
292|138|│   │   └── (imported truck/hazard models)
293|139|│   ├── Textures/
294|140|│   ├── Audio/
295|141|│   │   ├── SFX/
296|142|│   │   └── Music/
297|143|│   └── Settings/
298|144|│       ├── PhysicsMaterials/
299|145|│       └── InputActions.inputactions
300|146|├── ProjectSettings/
301|147|└── WebGLTemplates/
302|148|    └── Default/
303|149|```
304|150|
305|151|### Asset Sourcing Strategy
306|
307|**Asset Acquisition Plan** - All assets sourced before Phase 2 begins
308|
309|| Asset Type | Source | Specific Assets | Cost | Notes |
310||------------|--------|-----------------|------|-------|
311|| **3D Truck Models** | Unity Asset Store / Polyfork | "Low Poly Vehicles" pack | $10-30 | 5-10 truck variants, consistent scale |
312|| **3D Hazard Models** | Unity Asset Store | "Low Poly Props" + custom saw blades | $5-20 | Saw blades, ramps, falling debris, hammers |
313|| **Environment Textures** | Poly Haven / Unity Asset Store | Ground textures, skybox | Free | 2K textures, PBR materials |
314|| **UI Graphics** | Kenney Assets | UI icons, buttons, fonts | Free | Consistent low-poly aesthetic |
315|| **Audio SFX** | Freesound.org (CC0) | Jump, death, hazard sounds | Free | Use FreesoundHub Unity tool |
316|| **Audio Music** | OpenGameArt | 2-3 background tracks | Free | Upbeat, non-distracting |
317|
318|**Recommended Asset Packages:**
319|1. **Low Poly Vehicles Pack** (Asset Store) - $15-25
320|2. **Low Poly Nature/Environment** (Asset Store) - Free version available
321|3. **Starter Assets - Third Person URP** (Unity) - Free reference
322|4. **FreesoundHub** (Asset Store) - In-editor sound search
323|5. **Polyfork Unity Plugin** - Free 335 low-poly models, MIT license
324|
325|**Asset Pipeline Workflow:**
326|1. Week 1: Source placeholder assets (free for prototyping)
327|2. Week 3: Replace with final assets after mechanics testing
328|3. Optimization: All textures 1K-2K max, compressed for WebGL
329|4. Organization: Standard Assets/ folder structure (Models/, Textures/, Audio/, Prefabs/)
330|
331|**Quality Criteria:**
332|- All models under 500 triangles (WebGL performance)
333|- Textures compressed (DXT/ASTC for WebGL)
334|- Audio files in OGG format
335|- Consistent scale (1 Unity unit = 1 meter)
336|
337|---
338|
339|
340|### Key Scripts
341|152|
342|153|#### PlayerMovement.cs
343|154|```csharp
344|155|// Responsibilities:
345|156|// - Handle input (jump, strafe)
346|157|// - Apply forces to player Rigidbody
347|158|// - Manage player state (grounded, climbing, airborne)
348|159|// - Detect wall proximity for climbing
349|160|
350|161|public class PlayerMovement : MonoBehaviour
351|162|{
352|163|    // Core methods:
353|164|    // - HandleInput()
354|165|    // - ApplyJump()
355|166|    // - ApplyDoubleJump()
356|167|    // - StartClimb()
357|168|    // - UpdateClimb()
358|169|    // - EndClimb()
359|170|}
360|171|```
361|172|
362|173|#### TruckController.cs
363|174|```csharp
364|175|// Responsibilities:
365|176|// - Physics-driven movement
366|177|// - Randomized acceleration/braking/swerving
367|178|// - Collision handling with other trucks
368|179|// - Edge detection (prevent falling off map)
369|180|
370|181|public class TruckController : MonoBehaviour
371|182|{
372|183|    // Core methods:
373|184|    // - UpdateMovement()
374|185|    // - ApplyRandomBehavior()
375|186|    // - HandleCollision()
376|187|    // - MaintainPosition()
377|188|}
378|189|```
379|190|
380|191|#### TruckClusterManager.cs
381|192|```csharp
382|193|// Responsibilities:
383|194|// - Spawn trucks in patterns
384|195|// - Manage cluster formation phases
385|196|// - Control gap timing windows
386|197|// - Coordinate level progression
387|198|
388|199|public class TruckClusterManager : MonoBehaviour
389|200|{
390|201|    // Core methods:
391|202|    // - SpawnTruck()
392|203|    // - FormCluster()
393|204|    // - BreakCluster()
394|205|    // - UpdatePattern()
395|206|}
396|207|```
397|208|
398|209|#### GameManager.cs
399|210|```csharp
400|211|// Responsibilities:
401|212|// - Game state machine (menu, playing, paused, complete, gameover)
402|213|// - Track lives, score, time
403|214|// - Handle player death
404|215|// - Load/Save progress
405|216|
406|217|public class GameManager : MonoBehaviour
407|218|{
408|219|    // Core methods:
409|220|    // - StartGame()
410|221|    // - PlayerDied()
411|222|    // - LevelComplete()
412|223|    // - SaveProgress()
413|224|    // - LoadProgress()
414|225|}
415|226|```
416|227|
417|228|### Physics Configuration
418|229|
419|230|| Setting | Value | Reason |
420|231||---------|-------|--------|
421|232|| **Gravity** | -9.81 m/s² | Realistic Earth gravity |
422|233|| **Player Mass** | 70 kg | Standard human weight |
423|234|| **Truck Mass** | 5000 kg | Heavy, stable platforms |
424|235|| **Jump Force** | 8-12 m/s | Adjustable per difficulty |
425|236|| **Collision Layer** | Player, Truck, Hazard, Ground | Proper interaction filtering |
426|237|
427|238|### Version Control Strategy
428|
429|**Git Workflow**: Feature Branch Workflow with Semantic Versioning
430|
431|**Repository Structure:**
432|```
433|cluster-rush/
434|├── .gitignore (Unity-specific)
435|├── Assets/
436|├── Builds/
437|├── Tests/
438|├── Documentation/
439|└── PLAN.md
440|```
441|
442|**.gitignore (Unity):**
443|```
444|[Ll]ibrary/
445|[Tt]emp/
446|[Oo]bj/
447|[Bb]uild/
448|[Bb]uilds/
449|[Ll]ogs/
450|[Uu]ser[Ss]ettings/
451|*.pidb.meta
452|*.pdb.meta
453|*.mdb.meta
454|yarn-error.log
455|```
456|
457|**Branching Strategy:**
458|- **main**: Production-ready code only (tagged: v0.1.0, v0.2.0, etc.)
459|- **develop**: Integration branch for all completed features
460|- **feature/***: Individual feature branches (feature/player-movement, etc.)
461|- **hotfix/***: Critical bug fixes for production
462|
463|**Commit Message Convention:**
464|```
465|<type>(<scope>): <subject>
466|
467|<body>
468|
469|<footer>
470|```
471|
472|**Types:** feat, fix, docs, style, refactor, test, chore
473|
474|**Example:**
475|```
476|feat(player): add coyote time to jump system
477|
478|Implemented 0.15s grace period for more forgiving jumps
479|Added variable jump height for precision control
480|
481|Closes #12
482|```
483|
484|**Workflow:**
485|1. Create feature branch from `develop`
486|2. Commit frequently with descriptive messages
487|3. Create Pull Request for code review
488|4. Run automated tests before merge
489|5. Merge to `develop` after approval
490|6. Release to `main` at end of each phase
491|
492|**Backup Strategy:**
493|- Daily automatic backup to cloud storage
494|- Weekly full project archive (Assets + ProjectSettings)
495|- Version tags for each milestone completion
496|
497|---
498|
499|
500|### WebGL Build Settings
501|239|
502|240|| Setting | Value |
503|241||---------|-------|
504|242|| **Compression** | Brotli (best compression) |
505|243|| **Target Frame Rate** | 60 FPS |
506|244|| **Memory Limit** | 256 MB |
507|245|| **Data Caching** | Enabled for faster reloads |
508|246|
509|247|---
510|248|
511|249|## 4. Development Milestones
512|250|
513|251|### Phase 1: Project Setup (Week 1)
514|252|| Task | Deliverable | Verification |
515|253||------|-------------|--------------|
516|254|| Install Unity Hub + 2022.3 LTS | Unity installed | `unity --version` |
517|255|| Create new 3D project | ClusterRush project created | Project opens in editor |
518|256|| Set up folder structure | All directories created | Folder tree matches architecture |
519|257|| Configure physics materials | Physics assets in place | Test collision behavior |
520|258|| Set up WebGL build target | Project builds to WebGL | Empty scene runs in browser |
521|259|
522|260|### Phase 2: Player Movement (Week 1-2)
523|261|| Task | Deliverable | Verification |
524|262||------|-------------|--------------|
525|263|| Implement PlayerMovement.cs | Player moves with WASD | Character strafe works |
526|264|| Implement PlayerJump.cs | Jump mechanics | Single jump works |
527|265|| Implement PlayerClimb.cs | Wall-climb system | Can climb vertical surfaces |
528|266|| Add double-jump | Double-jump functionality | Second jump triggers mid-air |
529|267|| Test on static platform | All movement works | Player can navigate test level |
530|268|
531|269|### Phase 3: Truck System (Week 2-3)
532|270|| Task | Deliverable | Verification |
533|271||------|-------------|--------------|
534|272|| Implement TruckController.cs | Individual truck movement | Truck moves with physics |
535|273|| Implement TruckSpawner.cs | Truck spawning logic | Multiple trucks spawn |
536|274|| Implement TruckClusterManager.cs | Cluster formation/breaking | Trucks group and separate |
537|275|| Add truck collision system | Trucks interact properly | No clipping through each other |
538|276|| Test convoy system | Player can jump between trucks | Convoy traversal works |
539|277|
540|278|### Phase 4: Hazards (Week 3-4)
541|279|| Task | Deliverable | Verification |
542|280||------|-------------|--------------|
543|281|| Implement SawBlade.cs | Rotating hazard | Spinning blade kills player |
544|282|| Implement FallingDebris.cs | Falling objects | Debris drops and kills |
545|283|| Implement Ramp.cs | Launch ramps | Player launched vertically |
546|284|| Implement SwingingHammer.cs | Pendulum obstacle | Hammer swings and kills |
547|285|| Test hazard integration | All hazards work together | Level with hazards playable |
548|286|
549|287|### Phase 5: Camera & UI (Week 4)
550|288|| Task | Deliverable | Verification |
551|289||------|-------------|--------------|
552|290|| Implement FirstPersonCamera.cs | POV camera | Camera follows player correctly |
553|291|| Implement MainMenuUI.cs | Main menu screen | Can start game from menu |
554|292|| Implement HUD.cs | In-game HUD | Lives, level, time displayed |
555|293|| Implement LevelCompleteUI.cs | Success screen | Shows on level completion |
556|294|| Implement PauseMenu.cs | Pause functionality | Can pause and resume |
557|295|| Test UI flow | All screens work | Complete UI navigation |
558|296|
559|297|### Phase 6: Level Design (Week 5-6)
560|298|| Task | Deliverable | Verification |
561|299||------|-------------|--------------|
562|300|| Design Level 1-5 (Tutorial tier) | 5 beginner levels | Player learns mechanics |
563|301|| Design Level 6-10 (Easy tier) | 5 easy levels | Gradual difficulty increase |
564|302|| Design Level 11-20 (Medium tier) | 10 medium levels | Core gameplay challenge |
565|303|| Design Level 21-30 (Hard tier) | 10 hard levels | Tight gaps, more hazards |
566|304|| Design Level 31-35 (Expert tier) | 5 expert levels | Maximum difficulty |
567|305|| Test all levels | 35 playable levels | Complete game playable |
568|306|
569|307|### Phase 7: Polish & Optimization (Week 7)
570|308|| Task | Deliverable | Verification |
571|309||------|-------------|--------------|
572|310|| Add particle effects | Visual feedback | Jump, death, hazards have VFX |
573|311|| Add sound effects | Audio feedback | Jump, death, hazard sounds |
574|312|| Optimize WebGL build | < 50 MB download | Fast load times |
575|313|| Fix bugs | Stable game | No crashes, fair difficulty |
576|314|| Balance difficulty | Smooth progression | No impossible jumps |
577|315|
578|316|### Phase 8: Testing & Verification (Week 8)
579|317|| Task | Deliverable | Verification |
580|318||------|-------------|--------------|
581|319|| Full playthrough test | All 35 levels completable | Agent completes entire game |
582|320|| Edge case testing | No game-breaking bugs | Handles all player actions |
583|321|| Performance testing | 60 FPS on target hardware | Smooth gameplay |
584|322|| Accessibility review | Fair difficulty, clear visuals | No depth perception issues |
585|323|| Final build | Production-ready WebGL | Deployable build |
586|324|
587|325|---
588|326|
589|327|### Testing Automation Strategy
590|
591|**Testing Framework**: Playwright for WebGL browser automation + Unity Test Framework for unit tests
592|
593|#### Playwright Browser Automation (WebGL Testing)
594|
595|**Technology Stack:**
596|- Playwright for Python (`playwright==1.40.0`)
597|- Chrome/Chromium headless browser
598|- Automated interaction with WebGL game
599|
600|**Test Structure:**
601|```python
602|# tests/webgl_playwright_test.py
603|import pytest
604|from playwright.sync_api import sync_playwright
605|
606|class TestClusterRushWebGL:
607|    
608|    def test_player_can_jump(self, page):
609|        page.press("Space")
610|        player_y = page.evaluate("game.getPlayerY()")
611|        assert player_y > 0
612|    
613|    def test_double_jump_mechanic(self, page):
614|        page.press("Space")
615|        page.wait_for_timeout(200)
616|        page.press("Space")
617|        player_y = page.evaluate("game.getPlayerY()")
618|        assert player_y > first_jump_height
619|    
620|    def test_truck_physics(self, page):
621|        positions = []
622|        for _ in range(10):
623|            page.wait_for_timeout(500)
624|            positions.append(page.evaluate("game.getTruckPosition()"))
625|        assert has_perlin_pattern(positions)
626|    
627|    def test_hazard_death(self, page):
628|        page.click("#trigger-saw-blade")
629|        is_dead = page.evaluate("game.isPlayerDead()")
630|        assert is_dead == True
631|    
632|    def test_60_fps_performance(self, page):
633|        page.evaluate("game.startFPSCounter()")
634|        page.wait_for_timeout(5000)
635|        avg_fps = page.evaluate("game.getAverageFPS()")
636|        assert avg_fps >= 55
637|    
638|    def test_memory_no_leak(self, page):
639|        initial_memory = page.evaluate("performance.memory.usedJSHeapSize")
640|        for _ in range(5):
641|            page.click("#next-level")
642|            page.wait_for_timeout(2000)
643|        final_memory = page.evaluate("performance.memory.usedJSHeapSize")
644|        assert (final_memory - initial_memory) / initial_memory < 0.10
645|```
646|
647|**Unity Test Framework (Unit Tests):**
648|```csharp
649|// Tests/PlayerMovementTests.cs
650|using NUnit.Framework;
651|using UnityEngine;
652|
653|public class PlayerMovementTests
654|{
655|    [Test]
656|    public void Jump_WhenGrounded_ResetsJumpCount()
657|    {
658|        player.isGrounded = true;
659|        player.jumpCount = 2;
660|        player.PerformJump(10f);
661|        Assert.AreEqual(1, player.jumpCount);
662|    }
663|    
664|    [Test]
665|    public void CoyoteTime_AllowsJump_WithinGracePeriod()
666|    {
667|        player.isGrounded = false;
668|        player.coyoteTimer = 0.15f;
669|        player.PerformJump(10f);
670|        Assert.IsTrue(player.hasJumped);
671|    }
672|}
673|```
674|
675|**Verification Checklist by Milestone:**
676|
677|| Milestone | Playwright Tests | Unity Unit Tests | Manual Verification |
678||-----------|------------------|------------------|---------------------|
679|| Phase 2: Player Movement | Jump, double-jump, strafe | Jump force, coyote time | Visual inspection |
680|| Phase 3: Truck System | Truck movement patterns | Physics values | Cluster formation |
681|| Phase 4: Hazards | All 4 hazard types | Collision detection | Death triggers |
682|| Phase 5: UI | Menu navigation | State transitions | Flow testing |
683|| Phase 6: Levels | All 35 levels playable | Level parameters | Difficulty curve |
684|| Phase 7: Polish | Performance metrics | Memory profiling | Visual polish |
685|| Phase 8: Final | Full 35-level run | Integration tests | Edge cases |
686|
687|---
688|
689|
690|## 6. Risk Assessment
691|352|
692|353|| Risk | Probability | Impact | Mitigation |
693|354||------|-------------|--------|------------|
694|355|| Unity WebGL performance issues | Medium | High | Test early, optimize draw calls, reduce texture sizes |
695|356|| Depth perception in first-person | High | High | Add visual cues at jump points, subtle edge highlighting |
696|357|| Physics precision (gap timing) | Medium | High | Tune truck speeds, add visual gap indicators |
697|358|| Level design time (35 levels) | High | Medium | Create 5 templates, vary parameters instead of unique designs |
698|359|| Truck AI too chaotic | Medium | Medium | Add predictable patterns underneath randomness |
699|360|| Browser compatibility | Low | Medium | Test on Chrome, Firefox, Safari; use WebGL 2.0 |
700|361|
701|362|---
702|363|
703|364|## 7. Resource Requirements
704|365|
705|366|### Hardware
706|367|- **Development Machine**: Any machine running Unity Hub
707|368|- **Target Browser**: Chrome (primary), Firefox, Safari
708|369|- **Screen Resolution**: 1920x1080 minimum
709|370|
710|371|### Software
711|372|- **Unity Hub**: Latest version
712|373|- **Unity Editor**: 2022.3 LTS (Long Term Support)
713|374|- **Code Editor**: Visual Studio Code or Rider
714|375|- **Browser**: Chrome with DevTools for WebGL debugging
715|376|
716|377|### Assets (Optional - can use free alternatives)
717|378|- **3D Models**: Trucks, hazards (Unity Asset Store or Blender)
718|379|- **Textures**: PBR materials for trucks, environment
719|380|- **Audio**: Jump sound, death sound, hazard sounds, background music
720|381|
721|382|---
722|383|
723|384|## 8. Success Metrics
724|385|
725|386|| Metric | Target | Measurement |
726|387||--------|--------|-------------|
727|388|| **Gameplay** | All 35 levels completable | Agent playthrough |
728|389|| **Performance** | 60 FPS on target hardware | Browser DevTools |
729|390|| **Build Size** | < 50 MB | WebGL build output |
730|391|| **Load Time** | < 10 seconds | Browser network tab |
731|392|| **Bug Count** | 0 critical, < 5 minor | Agent testing report |
732|393|| **UI/UX** | Intuitive, no confusion | Agent navigation test |
733|394|
734|395|---
735|396|
736|397|## 9. Commands, Code Style, and Boundaries
737|
738|### Commands Reference
739|
740|**Unity CLI Commands for Build, Test, and Project Management**
741|
742|| Task | Command |
743||------|---------|
744|| Launch Unity | `unity-editor -projectPath ~/vishruth/games/clusterrush` |
745|| Build WebGL | `unity-editor -batchmode -executeMethod BuildProcessor.BuildWebGL` |
746|| Run Tests | `pytest tests/webgl_playwright_test.py -v` |
747|| Check Build Size | `du -sh Builds/WebGL/ClusterRush/` |
748|| Clean Build | `rm -rf Builds/WebGL/* Library/ Temp/` |
749|
750|**BuildProcessor.cs** - Custom build script for WebGL builds with compression options.
751|
752|### Code Style Guide
753|
754|**C# Coding Conventions:**
755|
756|| Element | Convention | Example |
757||---------|------------|---------|
758|| Classes | PascalCase | `PlayerMovement`, `TruckController` |
759|| Methods | PascalCase, verb-first | `ApplyJump()`, `HandleInput()` |
760|| Private fields | camelCase with underscore | `_jumpForce`, `_playerRigidbody` |
761|| Constants | PascalCase with 'k' prefix | `kDefaultGravity`, `kMaxJumpHeight` |
762|| Properties | PascalCase | `public float Speed { get; private set; }` |
763|
764|**Best Practices:**
765|- Always cache `GetComponent` calls in `Awake()` or `Start()`
766|- Use `[SerializeField]` with `[Tooltip]` for inspector fields
767|- Replace magic numbers with named constants
768|- Write XML documentation for public methods
769|
770|### Boundaries
771|
772|**Always Do:**
773|- Write tests before implementing new features
774|- Cache component references in Awake/Start
775|- Validate user input and edge cases
776|- Test WebGL builds in actual browser
777|- Commit with descriptive commit messages
778|
779|**Ask First Before:**
780|- Changing physics values (gravity, mass, drag)
781|- Modifying level template parameters
782|- Adding new hazard types
783|- Changing input control scheme
784|- Adding external dependencies
785|
786|**Never Do:**
787|- Hardcode values in Update/FixedUpdate
788|- Use `GameObject.Find()` in runtime code
789|- Modify scene objects directly in Git
790|- Skip null checks on public method parameters
791|- Use `transform.position` for physics objects (use `Rigidbody`)
792|- Ignore compiler warnings
793|
794|---
795|
796|## 10. Accessibility Requirements
797|
798|**Accessibility-First Design**: All features built from the start.
799|
800|#### Colorblind Support
801|- Double-coding: No critical information conveyed by color alone
802|- Three colorblind modes: Protanopia, Deuteranopia, Tritanopia
803|- Minimum 4.5:1 luminance contrast for UI elements
804|
805|#### Control Remapping
806|- Full input remapping system with PlayerPrefs persistence
807|- One-handed control presets (Left/Right-handed)
808|- Simplified single-button jump mode
809|
810|#### Additional Features
811|| Feature | Priority |
812||---------|----------|
813|| Visual cues for depth (edge highlighting) | High |
814|| Audio cues with visual alternatives | High |
815|| Subtitle support for all audio | High |
816|| Adjustable difficulty settings | Medium |
817|| High contrast mode | Medium |
818|
819|**Accessibility Testing Checklist:**
820|- [ ] All critical information visible without color
821|- [ ] Controls fully remappable
822|- [ ] Visual cues for all game events
823|- [ ] High contrast mode available
824|
825|---
826|
827|## 11. Approval Checklist
828|398|
829|399|Before starting implementation, confirm:
830|400|
831|401|- [ ] Engine choice: Unity 2022.3 LTS
832|402|- [ ] Architecture: Component-based with clear separation of concerns
833|403|- [ ] Milestones: 8 phases over 8 weeks
834|404|- [ ] Testing: Agent will verify all features through browser automation
835|405|- [ ] Success criteria: All 35 levels completable, 60 FPS, < 50 MB build
836|406|- [ ] No implementation until this plan is approved
837|407|
838|408|---
839|409|
840|410|## 10. Next Steps (After Approval)
841|411|
842|412|1. **Install Unity Hub + Unity 2022.3 LTS**
843|413|2. **Create Unity project** at `~/vishruth/games/clusterrush`
844|414|3. **Set up folder structure** per architecture
845|415|4. **Begin Phase 1** - Project Setup
846|416|
847|417|---
848|418|
849|419|**Document Owner:** User  
850|420|**Last Updated:** 2026-08-26  
851|421|**Status:** Draft - Pending Approval
852|422|