# Godot 4 WebGL Performance Optimization Guide

## Targets
- Build size: <50 MB uncompressed, <10 MB compressed
- Load time: <10 seconds
- Runtime: 60 FPS

---

## SECTION 1: Engine-Level Build Size Reduction

### Technique 1: Custom Template Compilation (Most Impact)
**Source savings: ~70-85% of default build**

Steps:
1. Clone Godot source matching your editor version
2. Create custom.py build profile
3. Compile with: `scons platform=web target=template_release profile=custom.py`
4. Replace default templates in Editor Settings → Export Templates

Reference build profile (minimal web):
```python
target = "template_release"
debug_symbols = "no"
optimize = "size_extra"    # Godot 4.5+, else "size"
lto = "full"
disable_3d = "yes"
disable_advanced_gui = "yes"
deprecated = "no"
vulkan = "no"
use_volk = "no"
openxr = "no"
minizip = "no"
modules_enabled_by_default = "no"
module_gdscript_enabled = "yes"
module_freetype_enabled = "yes"
module_svg_enabled = "yes"
module_webp_enabled = "yes"
module_godot_physics_2d_enabled = "yes"
module_text_server_fb_enabled = "yes"
module_text_server_adv_enabled = "no"
module_mobile_vr_enabled = "no"
module_multiplayer_enabled = "no"
module_camera_enabled = "no"
module_csg_enabled = "no"
```

**Reported results (Popcar's benchmark):**
| Stage | Web Uncompressed | Web Compressed |
|-------|-----------------|----------------|
| Default export | ~72 MB | ~9 MB (zip) |
| + optimize=size + LTO | 39.1 MB | 8.66 MB |
| + disable 3D | 31.5 MB | 6.76 MB |
| + disable text server adv | 29.5 MB | — |
| + disable advanced GUI | 27.8 MB | — |
| + disable all modules | 24.8 MB | — |
| + engine compilation config | 17.4 MB | 3.70 MB |
| + wasm-opt | 16.0 MB | — |
| + Brotli encoding | — | 2.7 MB |

### Technique 2: Emscripten/WASM Optimizations
**Command:**
```bash
wasm-opt <original.wasm> -o <optimized.wasm> -all --post-emscripten -Oz
```
- Install Binaryen first (wasm-opt tool)
- This post-processes the exported .wasm file
- Can reduce size by ~1-1.5 MB from final build
- Takes a few minutes to run

### Technique 3: Brotli Compression on Server
- Serve .wasm/.pck files with `Content-Encoding: br`
- Requires server to support Brotli decompression
- itch.io handles this automatically
- Can compress builds from ~16 MB down to ~2.7 MB

### Technique 4: Godot 4.5+ WASM SIMD
- Godot 4.5+ default templates require SIMD-compatible browsers
- Performance improvements: 1.5x-2x typical, up to 10x-15x under stress
- No code changes needed — just use the default 4.5+ web template
- Non-SIMD fallback: build with `wasm_simd=no`

---

## SECTION 2: Runtime Performance Optimization

### Texture Compression (Biggest Runtime Impact)
- Use VRAM-compressed textures: **ETC2/ASTC** compression in Godot import settings
- 1024x1024 RGBA = 4 MB uncompressed; compressed = ~1 MB
- Godot auto-selects ASTC (supported) or ETC2 (fallback) on web
- WebP format for UI/icons; use compressed VRAM format for 3D/game textures

### Atlas Sprites (Draw Call Reduction)
- Pack sprites into atlases → single draw call per atlas
- Use 2px padding + 1px extrude around each sprite
- Reduces draw calls from 240 → 38 in real-world test
- Use AtlasTexture nodes to reference atlas regions

### Lazy Loading by Priority Tiers
```gdscript
# Tier 1: Critical - preload at boot
# Tier 2: Near - preload during current scene
# Tier 3: Far - lazy-load on demand
ResourceLoader.load_threaded_request("res://path/to/scene.tscn")
```

### Device-Adaptive Quality
```gdscript
if OS.has_feature('web'):
    # Check device capabilities
    var mem = JSBridge.eval("navigator.deviceMemory")
    var cores = JSBridge.eval("navigator.hardwareConcurrency")
    # Set quality profile based on device
```

---

## SECTION 3: Load Time Optimization

### Preloader Script
- Create a minimal preloader.html that starts loading the game
- Shows loading progress to user during download
- Godot auto-generates this; customize via Project Settings

### PCK Compression
- Lossless compression = faster load, larger size
- Try different compression levels and measure
- For smaller games, lossless may be the fastest option

### SharedArrayBuffer & Threads
- Enable in export settings for better performance
- Requires Cross-Origin-Embedder-Policy: require-corp
- Requires Cross-Origin-Opener-Policy: same-origin
- Provides multithreading support → lower latency audio

### Browser Cache
- First load: full download
- Subsequent loads: browser cache (WASM + PCK)
- Near-instant for repeat visits

---

## SECTION 4: Web-Specific Gotchas

| Issue | Details |
|-------|---------|
| Rendering backend | WebGL2 only (Compatibility renderer); Forward+/Mobile not available |
| Safari issues | WebGL2 bugs on macOS/iOS; recommend Chromium/Firefox |
| Memory limits | ~2 GB WASM memory on desktop browsers; less on mobile |
| No WebGPU yet | Godot 4.x has no WebGPU support; WebGL2 is the only path |
| Thread support | Requires COOP/COEP headers to enable SharedArrayBuffer |
| Mobile web | Always worse than native Android/iOS export |

---

## SECTION 5: Godot 4.5+ New Features

- `size_extra` optimization mode (further size reduction over `size`)
- Engine Compilation Configuration Editor (Project → Tools)
  - Per-project feature detection
  - Toggle individual nodes/resources on/off
  - Export as `.build` file alongside `custom.py`
- WASM SIMD in default templates
- ~0.5 MB additional savings when compiling without XR
