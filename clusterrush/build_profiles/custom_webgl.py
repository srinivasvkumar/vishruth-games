# Godot 4.7 custom WebGL build profile for Cluster Rush
# Compile with: scons platform=web target=template_release profile=build_profiles/custom_webgl.py
#
# IMPORTANT: Requires Emscripten on PATH (emcc command available)
# Requires Binaryen (wasm-opt) for post-build optimization
#
# Cluster Rush analysis notes:
# - 2D/3D hybrid: 3D rendering (Camera3D, Node3D) but NO actual 3D meshes —
#   everything is procedural geometry (BoxMesh, CylinderMesh, CapsuleMesh)
# - No texture files: all visuals are procedural materials (StandardMaterial3D with albedo_color)
# - 6 scene files only (main_menu, game, level_select, end_screen, credits, webgl_bridge)
# - 35 levels procedurally generated at runtime
# - Minimal audio: 1 BGM + 4 SFX (6 WAV files total)
#
# This profile aggressively trims engine features that Cluster Rush doesn't use

target = "template_release"
debug_symbols = "no"
optimize = "size_extra"  # Godot 4.5+ only; use "size" for older versions
lto = "full"

# --- Disable 3D rendering for final web build ---
# NOTE: Cluster Rush uses Node3D/Camera3D but NO actual 3D scene content.
# The game renders pure procedural geometry via StandardMaterial3D.
# Disabling 3D is the SINGLE LARGEST size win (~10 MB).
# IF the game breaks after disabling, keep disable_3d=no and rely on other optimizations.
disable_3d = "yes"

# --- Disable advanced text server (saves ~1 MB, not needed for simple English UI) ---
module_text_server_adv_enabled = "no"
module_text_server_fb_enabled = "yes"

# --- Disable advanced GUI controls (not used in Cluster Rush — simple Labels/Buttons) ---
disable_advanced_gui = "yes"

# --- Disable deprecated APIs ---
deprecated = "no"

# --- Disable Vulkan (web uses WebGL2/Compatibility renderer, no Vulkan) ---
vulkan = "no"
use_volk = "no"

# --- Disable XR/VR ---
openxr = "no"

# --- Disable ZIP support (not used in web export) ---
minizip = "no"

# --- Disable ALL modules by default, then enable only what we need ---
modules_enabled_by_default = "no"

# Core modules (required to run any Godot project)
module_gdscript_enabled = "yes"
module_freetype_enabled = "yes"
module_svg_enabled = "yes"
module_webp_enabled = "yes"

# Modules that might be needed (only enable if game crashes without them)
# module_physics_2d_bullet_enabled = "yes"  # Cluster Rush uses 3D physics
# module_physics_3d_jolt_enabled = "yes"    # Not used — 3D disabled above
# module_navigation_enabled = "yes"         # Not used
# module_gridmap_enabled = "yes"            # Not used
