# Godot 4.7.2 WebGL Optimization Guide for Cluster Rush

> **Target Engine:** Godot 4.7.2 (GDScript 2.0, LLVM+Wasm, Emscripten)
> **Platform:** HTML5 — single JS thread, sandboxed memory heap
> **Game:** Truck-climbing game with physics-driven gameplay
> **Constraints:** 500-triangle model budget, 150 draw call budget, 256 MB memory cap, 50 MB build size, 60 FPS target (≥55 pass)
> **Architecture:** ARM64 Linux (DGX Spark)

---

## Table of Contents

1. [Godot 4.7.2 WebGL Export Settings](#1-godot-472-webgl-export-settings)
2. [Draw Call Optimization Strategies](#2-draw-call-optimization-strategies)
3. [GC Allocation Elimination Patterns (GDScript)](#3-gc-allocation-elimination-patterns-gdscript)
4. [Object Pooling Best Practices](#4-object-pooling-best-practices)
5. [Texture Compression Settings Per Browser](#5-texture-compression-settings-per-browser)
6. [Asset Optimization Pipeline](#6-asset-optimization-pipeline)
7. [Common WebGL Pitfalls and Workarounds](#7-common-webgl-pitfalls-and-workarounds)
8. [Performance Profiling with Chrome DevTools](#8-performance-profiling-with-chrome-devtools)
9. [Specific Recommendations for Truck-Climbing Physics Game](#9-specific-recommendations-for-truck-climbing-physics-game)

---

## 1. Godot 4.7.2 WebGL Export Settings

### 1.1 Project Settings (Project → Project Settings)

| Setting | Value | Rationale |
|---|---|---|
| `rendering/threads/multithreading` | `true` | Godot 4.3+ supports single-threaded web export. Default. |
| `audio/general/default_playback_type` | `Sample` | Low-latency Web Audio API playback (Godot 4.3+). |
| `rendering/quality/desired_fps` | `60` | Target frame rate. |
| `rendering/renderer` | `gl_compatibility` | WebGL 2.0 only supports compatibility renderer. |
| `rendering/anti_aliasing/quality/msaa_3d` | `1` (or `2`) | Performance trade-off; start at 1x. |
| `input/devices/pointing/emulate_touch_from_mouse` | `true` | Better mobile/touch support. |
| `display/window/size/viewport_width` | `1280` | Canvas size. |
| `display/window/size/viewport_height` | `720` | Canvas size. |
| `display/window/stretch/mode` | `canvas_items` | Scales canvas to window. |
| `display/window/stretch/aspect` | `keep` | Maintain aspect ratio. |
| `rendering/vram_compression` | `For Desktop` | DXT/BC compression for desktop browsers. |

### 1.2 Export Presets (Project → Export)

**Preset name:** `Web`
**Platform:** `Web`
**Runable:** `true`

| Setting | Value | Rationale |
|---|---|---|
| **Export Mode** | `Debug` / `Release` | Use Release for final build. |
| **Texture Pipeline — Filter** | `true` | Linear filtering (smooth textures). |
| **Texture Pipeline — Mipmaps** | `false` | Saves memory; can enable if zooming. |
| **Texture Pipeline — Normal Maps** | `true` | Enable if using normal maps. |
| **Compression — S3TC/BCT** | `true` | DXT for Chrome/Edge/Firefox on desktop. |
| **Compression — ASTC** | `false` | Only needed for Safari mobile; skip for web. |
| **Compression — ETC2** | `false` | Firefox only; DXT covers most browsers. |
| **Custom Template** | (empty) | Use default HTML5 shell. |
| **Head Include** | (empty) | Add custom JS/CSS here if needed. |
| **Virtual Port** | `1280×720` | Matches canvas size. |
| **Canvas Resize Policy** | `none` | Auto-resize to browser window. |
| **Console Output** | `2` (Warning + Error) | Show warnings in browser console. |
| **Export Context Menu** | `true` | Right-click menu for FPS counter, etc. |
| **VRAM Texture Compression** | `For Desktop` | DXT/BC format. |
| **Encryption — Encrypt PCK** | `false` | Skip for now; adds complexity. |
| **Progressive Web App — Enable** | `false` | Optional; adds service worker. |

### 1.3 Export Command (headless)

```bash
# Release build
./bin/godot --headless --export-release "Web" ./Builds/WebGL/index.html

# Debug build (with profiler)
./bin/godot --headless --export-debug "Web" ./Builds/WebGL/index.html
```

---

## 2. Draw Call Optimization Strategies

### 2.1 Godot's Rendering Pipeline (WebGL)

Godot 4.7.2 uses the **Compatibility renderer** on WebGL (GL ES 2.0 / WebGL 2.0). It does NOT have SRP Batcher or URP. Draw call optimization relies on:

| Method | How It Works | Budget Impact |
|---|---|---|
| **Static Batching** | Merge static meshes at export time | Best for fixed geometry (road, environment) |
| **Dynamic Batching** | Merge small non-moving meshes per frame | Reduces draw calls for <150-vertex meshes |
| **Material Sharing** | Same material across multiple objects | Godot batches by material automatically |

### 2.2 Godot 4 WebGL Draw Call Rules

- Godot batches objects with the **same material** automatically.
- **Static Batching** can be enabled via project settings (`rendering/threads/static_batching = true`).
- Use **shared materials** wherever possible — same texture + same shader = one draw call.
- Keep models under **500 triangles** as specified in PLAN.md.
- Avoid per-object materials for frequently-spawned objects (trucks, hazards).

### 2.3 Material Organization for Cluster Rush

```
res://resources/
├── shared_truck_material.tres      # One material for all trucks
├── shared_hazard_material.tres     # One material for all hazards
├── shared_ground_material.tres     # Road/ground material
└── shared_player_material.tres     # Player character material
```

**Action:** Group all truck meshes to use `shared_truck_material.tres` so Godot batches them into a single draw call per frame.

---

## 3. GC Allocation Elimination Patterns (GDScript)

### 3.1 The Problem

GDScript is garbage-collected. Every `Array.new()`, `Dictionary.new()`, `String` concatenation, or `yield()` call creates garbage that the GC must eventually collect. On the single WebGL thread, this causes **frame hitches** when GC fires mid-frame.

### 3.2 Zero-Allocation Patterns

**NEVER do this in `_process()` or `_physics_process()`:**

```gdscript
# ❌ GC allocation every frame
var data = {"x": position.x, "y": position.y}  # New dict each frame
var text = "Speed: " + str(speed)              # String concat allocates
var arr = [1, 2, 3]                            # New array each frame
```

**DO this instead:**

```gdscript
# ✅ Cache and reuse
var _data_dict := {"x": 0.0, "y": 0.0}  # Allocated once in _ready()
var _result_string := "Speed: 0"           # Pre-allocated string

func _process(_delta: float):
    _data_dict["x"] = position.x  # Mutate existing dict (no allocation)
    _result_string = "Speed: " + str(int(speed))  # String replacement
```

### 3.3 Specific Rules for Cluster Rush

| Rule | Example |
|---|---|
| **No `Dictionary.new()` in loops** | Use a pre-allocated dict from `_ready()` |
| **No `Array.new()` in loops** | Use a pooled array or pre-allocated array |
| **No `str()` in `_process()`** | Cache results; update only when values change |
| **No `yield()` in physics** | Use `_physics_process()` counters instead |
| **Pre-allocate large arrays** | `var _truck_positions: Array = []` then `.resize(100)` |
| **Use `.clear()` not reassignment** | `_truck_positions.clear()` reuses memory |

### 3.4 Object Pooling in GDScript

```gdscript
class ObjectPool:
    var _pool: Array[Node3D] = []
    var _in_use: Array[bool] = []
    var _prefab: PackedScene
    var _parent: Node3D

    func _init(prefab: PackedScene, size: int, parent: Node3D):
        _prefab = prefab
        _parent = parent
        _pool.resize(size)
        _in_use.resize(size)
        for i in range(size):
            var inst = prefab.instantiate()
            inst.visible = false
            _pool[i] = inst
            _parent.add_child(inst)

    func acquire() -> Node3D:
        for i in range(_pool.size()):
            if not _in_use[i]:
                _in_use[i] = true
                _pool[i].visible = true
                return _pool[i]
        # Pool exhausted — create new or reuse first
        return _pool[0]

    func release(node: Node3D):
        var idx = _pool.find(node)
        if idx >= 0:
            _in_use[idx] = false
            node.visible = false

    func get_size() -> int:
        return _pool.size()
```

---

## 4. Object Pooling Best Practices

### 4.1 Pool Sizes (Based on Game Design)

| Object | Pool Size | Rationale |
|---|---|---|
| **Saw Blades** | 15 | Max 4 active per level + spawn buffer |
| **Falling Debris** | 20 | Spawn rate ~1/sec, 20-second levels |
| **Particles (VFX)** | 50 | Jump death, hazard bursts, trail effects |
| **Ramps** | 5 | Per level, reused across levels |
| **Swinging Hammers** | 10 | Pendulum objects, persistent |
| **Truck Segments** | 30 | Road/environment segments for scrolling |

### 4.2 Pool Management in Godot

```gdscript
# In LevelManager.gd
var saw_blade_pool := ObjectPool.new(
    preload("res://prefabs/saw_blade.tscn"),
    15,
    get_tree().root
)

var debris_pool := ObjectPool.new(
    preload("res://prefabs/falling_debris.tscn"),
    20,
    get_tree().root
)

func spawn_saw_blade(position: Vector3):
    var blade = saw_blade_pool.acquire() as Node3D
    blade.position = position

func despawn_saw_blade(blade: Node3D):
    saw_blade_pool.release(blade)
```

---

## 5. Texture Compression Settings Per Browser

### 5.1 Godot 4.7.2 WebGL Texture Formats

| Browser | Format | Godot Export Setting |
|---|---|---|
| **Chrome/Edge** | DXT/BC (S3TC) | `vram_compression/s3tc = true` |
| **Firefox** | ETC2 (optional) | `vram_compression/etc = true` |
| **Safari** | ASTC (rare on web) | `vram_compression/astc = true` |

### 5.2 Recommended Settings for Cluster Rush

```
# Project Settings
vram_compression/s3tc = true        # Chrome/Edge/Firefox desktop
vram_compression/astc = false        # Skip for web (Safari web issues)
vram_compression/etc = false         # Skip for web (limited Firefox support)
```

**Rationale:** DXT/S3TC covers >95% of web browsers. ASTC and ETC2 add build size for minimal benefit on desktop web.

---

## 6. Asset Optimization Pipeline

### 6.1 Model Budget

| Rule | Limit |
|---|---|
| Max triangles per model | 500 (per PLAN.md) |
| Max texture size | 1024×1024 (WebGL memory) |
| Texture format | DXT compressed |
| Generate mipmaps | `false` (unless zooming required) |

### 6.2 Godot Texture Import Settings

```
# In the FileSystem dock, select a texture and set:
Format: S3TC_BC7 / DXT (for desktop)
Max Size: 1024
Compression: Lossless or Lossy
Generate Mipmaps: False
VRAM Compression: Enabled (For Desktop)
```

### 6.3 LOD Strategy for Cluster Rush

Since Godot doesn't have Unity's LOD system natively, use a script approach:

```gdscript
# LODGroup.gd — Auto LOD based on distance
var lod_levels: Array[Node3D] = []
var active_level: int = 0

func _process(_delta: float):
    var distance = global_position.distance_to(get_viewport().get_camera_3d().global_position)
    var new_level = _get_level_for_distance(distance)
    if new_level != active_level:
        _set_lod(new_level)
        active_level = new_level

func _get_level_for_distance(distance: float) -> int:
    if distance > 100: return 2
    if distance > 50: return 1
    return 0
```

---

## 7. Common WebGL Pitfalls and Workarounds

| Pitfall | Symptom | Workaround |
|---|---|---|
| **Tab blur freezes game** | `_process()` pauses when tab inactive | Use `unhandled_input` for critical actions |
| **IndexedDB quota exceeded** | Save data loss on mobile | Keep save data <1 MB; use `user://` path |
| **Wasm size >50 MB** | Slow download on mobile | Disable unnecessary features in export |
| **Audio context blocked** | No sound until user interaction | Start audio after first user input |
| **Full-screen not working** | Browser security blocks `requestFullscreen` | Only call from `pressed` signal callback |
| **Service worker caching stale build** | Old version loads after update | Append `?v=1.0.1` to index.html or clear cache |
| **Memory grows indefinitely** | FPS drops over time | Call `Resources.unload_scene()` on level transitions |

### 7.1 IndexedDB for Save Data

```gdscript
# Use Godot's built-in user:// path — on web this maps to IndexedDB
func save_progress(level: int):
    var config := ConfigFile.new()
    config.set_value("progress", "highest_level", level)
    config.save("user://cluster_rush_save.dat")

func load_progress() -> int:
    var config := ConfigFile.new()
    if config.load("user://cluster_rush_save.dat") == OK:
        return config.get_value("progress", "highest_level", 1)
    return 1
```

---

## 8. Performance Profiling with Chrome DevTools

### 8.1 Key Metrics to Monitor

| Metric | Target | How to Measure |
|---|---|---|
| **FPS** | ≥55 sustained (≥60 target) | Godot's built-in FPS counter (right-click menu) |
| **Frame Time** | ≤18.1ms (1/55) | DevTools Performance panel |
| **JS Heap Size** | <256 MB | DevTools Memory panel |
| **Wasm Memory** | <256 MB | DevTools Memory → WebAssembly |
| **Draw Calls** | <150 | Godot's render debugger (`F6`) |
| **Triangle Count** | <50K total | Godot's render debugger (`F6`) |

### 8.2 Profiling Workflow

1. **Export debug build:** `godot --export-debug "Web" ./Builds/WebGL/index.html`
2. **Serve locally:** `python3 -m http.server 8080`
3. **Open in Chrome:** `http://localhost:8080`
4. **Open DevTools** (F12)
5. **Record Performance** (CPU tab → Record)
6. **Play for 60 seconds**
7. **Analyze:**
   - Look for **long tasks** (>50ms = frame drop)
   - Check **JS heap growth** (steady increase = memory leak)
   - Check **Wasm memory** (should be stable)

### 8.3 Godot Built-in Debug Features

```
F6          — Render debugger (draw calls, triangles)
F5          — Toggle FPS counter
F1          — Toggle debug overlay
Right-click — Open export context menu (FPS, profiler)
```

---

## 9. Specific Recommendations for Truck-Climbing Physics Game

### 9.1 Physics Optimization

| Setting | Value | Reason |
|---|---|---|
| **Physics Step** | 1/60s (Fixed) | Match FPS target for consistent physics |
| **Max Sub-Steps** | 1 | No sub-stepping needed on web |
| **Sleep Threshold** | 0.01 | Allow trucks to sleep when still |
| **Broadphase** | Hash | Best for many moving objects (trucks) |

### 9.2 Truck Physics (Cluster Rush Specific)

```gdscript
# In truck_controller.gd
func _physics_process(delta: float):
    # Never allocate in physics process
    # Reuse velocity vector
    
    # Use lerp instead of creating new vectors
    velocity.x = move_toward(velocity.x, target_velocity.x, acceleration * delta)
    velocity.y = move_toward(velocity.y, target_velocity.y, acceleration * delta)
    
    # Sleep when not moving (saves physics steps)
    if velocity.length() < 0.1:
        velocity = Vector3.ZERO
        # Godot's PhysicsServer3D will skip physics for sleeping bodies
```

### 9.3 Hazard Optimization

```gdscript
# In hazard spawning
func spawn_hazards(count: int):
    for i in range(count):
        # Reuse from pool — no new allocations
        var hazard = pool.acquire()
        hazard.position = _get_spawn_position()
        hazard.visible = true
```

### 9.4 Build Size Optimization

| Technique | Expected Savings |
|---|---|
| **Disable unused Godot modules** | -5 to -10 MB |
| **Use S3TC compression** | -30% texture memory |
| **Disable VRAM compression for ASTC** | -1 MB |
| **Minimize scene node count** | -2 to -5 MB (PCK size) |
| **Use release build** | -10 to -15 MB vs debug |

### 9.5 Final Build Checklist

- [ ] Release build (not debug)
- [ ] S3TC/DXT compression enabled
- [ ] Texture mipmaps disabled
- [ ] VRAM compression = For Desktop only
- [ ] All models ≤500 triangles
- [ ] No `Dictionary.new()` or `Array.new()` in `_process()` loops
- [ ] Object pooling for hazards and particles
- [ ] Build size <50 MB
- [ ] FPS ≥55 sustained
- [ ] Zero critical bugs

---

## Quick Reference: Godot WebGL Settings Cheat Sheet

```
Project Settings → Rendering → Threads:
  multithreading = true

Project Settings → Rendering → Quality:
  desired_fps = 60
  msaa_3d = 1

Export Preset "Web":
  texture_pipeline/filter = true
  texture_pipeline/mipmaps = false
  vram_compression/s3tc = true
  vram_compression/astc = false
  canvas_init/stretch_mode = "none"
  canvas_init/virtual_port_width = 1280
  canvas_init/virtual_port_height = 720
  export_context_menu = true

Budgets:
  Build Size:   <50 MB compressed
  Memory:       <256 MB runtime
  Draw Calls:   <150
  FPS:          ≥55 sustained (≥60 target)
  Model Tris:   ≤500 per model
```

---

*Generated for Cluster Rush — Godot 4.7.2 ARM64 Linux*
*Last updated: 2026-08-28*
