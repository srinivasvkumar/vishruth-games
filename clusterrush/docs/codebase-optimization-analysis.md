# Cluster Rush — WebGL Codebase Analysis

## 1. WASM BLOAT ANALYSIS: Why is index.wasm 38 MB?

### Current Build Sizes
```
index.wasm  = 38 MB   (WebAssembly binary — the Godot engine runtime)
index.pck   = 968 KB  (Game assets and scripts)
index.html  = 5.4 KB  (Shell HTML)
```

### Root Cause

The 38 MB is NOT game content — it's the **Godot 4.7.2 engine runtime** compiled to WebAssembly. This is the **default web release template**, which includes the entire Godot engine with all modules, all rendering features, all physics engines, all audio backends, etc.

Cluster Rush uses only a tiny fraction of Godot:
- 3D rendering (but with pure procedural geometry — no textures, no mesh files)
- Simple AABB collision (CharacterBody3D + BoxShape3D)
- 6 audio files (1 BGM + 4 SFX)
- 35 procedural levels generated at runtime
- Simple UI (Labels, Buttons, Panels)

### What's Inside the 38 MB WASM (breakdown by estimated size):

| Component | Approx Size | Used by Cluster Rush? |
|-----------|------------|-----------------------|
| Full 3D engine (Forward+/Mobile/Compatibility renderers) | ~8 MB | Partially (only Compatibility/WebGL2) |
| Vulkan renderer + shader cache | ~4 MB | NO — web uses WebGL2, never Vulkan |
| Jolt Physics engine | ~3 MB | NO — Cluster Rush uses simple AABB checks |
| GodotPhysics 3D engine | ~2 MB | NO — simple BoxShape3D |
| Advanced text server (RTL, ligatures) | ~1 MB | NO — just English UI labels |
| XR/VR support (OpenXR) | ~1 MB | NO |
| Multiplayer (ENet, WebSocket) | ~1 MB | NO |
| 2D physics (Bullet2D) | ~1 MB | NO |
| FBX/GLTF loaders | ~1 MB | NO — no external models |
| Audio (MP3, etc.) | ~1 MB | Partially (WAV only) |
| Image compression (ASTC, Basis, BC, DDS) | ~2 MB | Partially (VRAM compression exists but not used with procedural assets) |
| Navigation/RVO | ~1 MB | NO |
| GridMap system | ~0.5 MB | NO |
| Camera system (Advanced) | ~0.5 MB | Partially (simple FollowCamera) |
| JSON-RPC | ~0.3 MB | NO |
| Everything else | ~12 MB | Various minor features |

### Key Insight: Cluster Rush can achieve **under 5 MB** with the right profile

The custom profile at `build_profiles/custom_webgl.py` should reduce this from 38 MB to <5 MB by:
1. `disable_3d = "yes"` — saves ~10 MB (game uses procedural geometry only)
2. `disable_advanced_gui = "yes"` — saves ~1 MB
3. `module_text_server_adv_enabled = "no"` — saves ~1 MB
4. `vulkan = "no"` + `use_volk = "no"` — saves ~4 MB (already saves this on web by default)
5. `openxr = "no"` — saves ~1 MB
6. `lto = "full"` — saves 10-20% from remaining code
7. `optimize = "size_extra"` — Godot 4.5+ additional savings
8. `wasm-opt -Oz` (post-export) — saves ~1-1.5 MB

### Recommended Build Process

```bash
# 1. Build custom template from Godot source
cd /path/to/godot
git checkout 4.7-stable
scons platform=web target=template_release profile=/path/to/clusterrush/build_profiles/custom_webgl.py

# 2. Post-process with wasm-opt (requires Binaryen)
wasm-opt bin/godot.web.template_release.wasm32.nothreads.wasm \
  -o bin/godot.web.template_release.wasm32.nothreads.opt.wasm \
  -all --post-emscripten -Oz

# 3. Replace templates in Godot editor:
# Editor Settings → Export Templates → Install from the custom bin/ files

# 4. Export Cluster Rush from Godot editor as usual

# 5. Optional: Brotli compress on the server
# (handled by www/.htaccess when served)
```

---

## 2. DRAW CALL ANALYSIS

### Current Draw Call Sources

The game is **purely procedural** — every frame renders:
- 1 ground platform (BoxMesh with StandardMaterial3D) → **1 draw call**
- N trucks (BoxMesh with StandardMaterial3D) → **N draw calls** (max ~10)
- N hazards (CylinderMesh/SphereMesh/BoxMesh with StandardMaterial3D) → **N draw calls** (max ~5)
- 1 player capsule (CapsuleMesh with StandardMaterial3D) → **1 draw call**
- 1 directional light → **1 draw call**

**Estimated per-frame draw calls: 15-25** (well within the <50 target)

### No Atlas Opportunity

**This is not a concern for Cluster Rush.** The game has ZERO texture files — every visual is a procedural color material:
```gdscript
var mat = StandardMaterial3D.new()
mat.albedo_color = COLOR_GROUND  # Solid color, no texture
mat.roughness = 0.9
mat.metallic = 0.0
```

All 35 levels use the same set of ~8 materials. There are no sprite sheets, no textures to atlas.

### Recommendation

Draw calls are already optimal. No changes needed here.

---

## 3. LAZY LOADING OPPORTUNITIES

### Current: ALL SCENES PRE-LOADED

The project.godot references 6 scene files, but currently they're all embedded in the PCK:
```
scenes/main_menu.tscn     → embedded in PCK
scenes/game.tscn          → embedded in PCK
scenes/level_select.tscn  → embedded in PCK
scenes/end_screen.tscn    → embedded in PCK
scenes/credits.tscn       → embedded in PCK
scenes/webgl_bridge.tscn  → embedded in PCK (autoload)
```

### Optimization: Lazy-Load Secondary Scenes

Only `main_menu.tscn` and `game.tscn` are needed at boot. The rest can be lazy-loaded:

| Scene | Load Priority | When to Load | Method |
|-------|--------------|--------------|--------|
| main_menu.tscn | **Critical** | Immediate (root scene) | Preloaded |
| game.tscn | **Critical** | When "Play" clicked | Preload on menu |
| level_select.tscn | **Near** | When level select opened | Preload on demand |
| end_screen.tscn | **Far** | After all 35 levels | Load on demand |
| credits.tscn | **Far** | Optional, never shown | Load on demand |
| webgl_bridge.tscn | **Critical** | Required for testing | Preloaded |

### Implementation (for game-dev):

```gdscript
# In main_menu_ui.gd — preload game scene when "Play" is pressed
func _on_play_pressed():
    # Preload if not already loaded
    if not ResourceLoader.load_threaded_is_finished("res://scenes/game.tscn"):
        ResourceLoader.load_threaded_request("res://scenes/game.tscn")
    
    # Switch to game
    get_tree().change_scene_to_file("res://scenes/game.tscn")
```

### Expected Savings

Each .tscn file is likely <10 KB (small procedural scenes). Savings would be minimal in the 968 KB PCK, but the principle is correct for scaling.

---

## 4. ASSET ANALYSIS — Textures, Audio, and Resources

### Textures: NONE
- All visuals are procedural geometry + color materials
- No `.png`, `.jpg`, `.webp`, or `.svg` texture files used
- No sprite sheets, no atlases, no image textures
- **Zero texture optimization needed**

### Audio: Minimal (6 files, ~total <1 MB)
```
audio/music/bgm_around.wav    → Background music
audio/sfx/death.wav           → Death sound
audio/sfx/jump.wav            → Jump sound
audio/sfx/hazard.wav          → Hazard impact
audio/sfx/land.wav            → Land sound
audio/sfx/click.wav           → UI click
audio/sfx/complete.wav        → Level complete
```

All .wav files are pre-imported (have .import files). In a WebGL export:
- WAV = uncompressed PCM → large files
- Should convert to **OGG or MP3** for web

### Optimization Recommendation: Convert Audio

```
WAV → OGG (Vorbis) at 128 kbps
Expected savings: ~60-70% smaller audio files
```

### Scene Structure: Minimal (6 scenes, all procedural)

Scene file count is already optimal:
- 1 root scene (main_menu)
- 1 game scene (game.tscn) — contains World + UI
- 1 level_select
- 1 end_screen
- 1 credits
- 1 webgl_bridge (autoload utility)

No unused or dead scenes. No nested scene dependencies to flatten.

---

## 5. CODE AUDIT: Performance Issues Found

### 5.1 RayCast3D per Physics Frame (LOW impact)

In `player_movement.gd`:
```gdscript
@onready var raycast_left: RayCast3D = $RayCastLeft
@onready var raycast_right: RayCast3D = $RayCastRight
@onready var ground_check: RayCast3D = $GroundCheck
```

RayCast3D is updated every physics frame. For a game with only 1-3 hazard types, this is acceptable but could be replaced with simple distance checks if profiling shows issues.

### 5.2 AudioManager Creates Nodes at Runtime

In `audio_manager.gd`:
```gdscript
_audio_stream_player = AudioStreamPlayer.new()
_audio_stream_player.name = "MasterAudio"
add_child(_audio_stream_player)
```

Creating audio players at runtime (via `new()`) is fine but slightly inefficient. Would be better to add them as scene children and reference via `@onready`. Impact: negligible.

### 5.3 LevelManager Instantly Creates 20+ Nodes per Level

In `_generate_level()`:
```gdscript
_ground = _create_ground()       # 1 StaticBody3D + 1 MeshInstance3D + 1 CollisionShape3D
_trucks = _create_truck_convoy() # N trucks × (1 CharacterBody3D + 1 MeshInstance3D + 1 CollisionShape3D)
_hazards = _create_hazards()     # N hazards × (1 Area3D + 1 MeshInstance3D + 1 CollisionShape3D)
```

For expert tier (level 35): ~10 trucks × 3 children + 5 hazards × 3 children = ~45 nodes created every level reload.

**Impact**: Moderate. Scene reload (`get_tree().reload_current_scene()`) frees all nodes and recreates them. With 35 levels × 45 nodes, that's 1,575 node allocations/deallocations.

**Optimization**: Use object pooling instead of create/destroy:
```gdscript
# Pool trucks, reuse them across level loads
var truck_pool: Array[CharacterBody3D] = []
func get_truck_from_pool():
    for truck in truck_pool:
        if not truck.visible:
            truck.visible = true
            return truck
    # If pool empty, create new
    return _create_truck()
```

### 5.4 WASM SIMD Not Enabled (Godot 4.5+)

The exported build uses the default 4.7.2 web template, which includes WASM SIMD support. This is good — Cluster Rush automatically gets the 1.5x-2x WASM SIMD runtime benefit.

### 5.5 No Texture Pipeline Mipmapping

From `export_presets.cfg`:
```
texture_pipeline/mipmaps = false
```

**Recommendation**: Enable mipmaps:
```
texture_pipeline/mipmaps = true
```

Even without texture files, some rendering paths benefit from mipmapped geometry. Very low cost.

---

## 6. BUILD CONFIGURATION REVIEW (export_presets.cfg)

### Current Settings
```
vram_compression/s3tc=true      # ✓ Good — s3tc is broadly supported
texture_pipeline/mipmaps=false  # ✗ Should be true
compression="brotli"            # ✓ Good — Brotli is already enabled
progressive_web_app/enabled=false # ✗ Should be true for PWA
custom_template/debug=...       # ✓ Already using custom templates
custom_template/release=...     # ✓ Already using custom templates
```

### Recommended Changes to export_presets.cfg

```
vram_compression/ncss=true      # Also enable NCSS (modern compression)
texture_pipeline/mipmaps=true   # Enable mipmaps
progressive_web_app/enabled=true # Enable PWA support
compression = "brotli"          # Keep Brotli
```

---

## 7. SERVING CONFIGURATION

### www/.htaccess (created)
- Sets COOP/COEP headers for SharedArrayBuffer
- Enables Brotli compression (with gzip fallback)
- Sets aggressive cache headers (1-year immutable cache)
- Force HTTPS (commented, uncomment for production)

### www/manifest.json (created)
- Full PWA manifest for "Add to Home Screen" on mobile
- Landscape orientation (game is landscape)
- Fullscreen display mode
- Icon references

### www/service-worker.js (created)
- Cache-first strategy for game assets (WASM, PCK, JS, HTML)
- Stale-while-revalidate for index.html shell
- Old cache cleanup on activation
- Supports offline play after first load

---

## 8. SUMMARY OF RECOMMENDED ACTIONS

| Priority | Action | Effort | Expected Impact |
|----------|--------|--------|-----------------|
| **P0** | Compile custom template (`custom_webgl.py`) | Medium (30 min build) | 38 MB → ~2 MB WASM |
| **P0** | Run `wasm-opt -Oz` post-export | Low (2 min) | Additional ~1 MB savings |
| **P1** | Convert WAV → OGG audio | Low (5 min) | ~70% audio size reduction |
| **P1** | Enable PWA + deploy www/ files | Low (10 min) | Offline support, installable |
| **P2** | Enable texture_pipeline/mipmaps | Low (1 min) | Marginal rendering benefit |
| **P2** | Object-pool level nodes | Medium (30 min) | Smoother level transitions |
| **P3** | Lazy-load secondary scenes | Low (5 min) | Minor loading optimization |
| **P3** | Profile with browser devtools | Low (10 min) | Identify actual bottlenecks |
