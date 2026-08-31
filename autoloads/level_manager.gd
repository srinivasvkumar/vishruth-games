extends Node
# LevelManager - Level loading and management
# Manages the 35 levels with 5 difficulty tiers
# Loads level scenes and handles level transitions
# Phase 5: Truck system + hazard generation

signal level_loaded
signal level_starting
signal level_finished

const MAX_LEVELS := 35

# Collision layer / mask constants
const LAYER_GROUND	 := 1		# Static terrain / ground
const LAYER_TRUCK	 := 2		# Moving trucks
const LAYER_HAZARD	 := 4		# Hazards (saws, hammers, etc.)
const LAYER_PLAYER	 := 8		# Player character

# Ground mask: player (8) detects ground (1) and trucks (2)
const MASK_PLAYER	 := LAYER_GROUND | LAYER_TRUCK

# Hazard mask: hazards (4) detect player (8)
const MASK_HAZARD	 := LAYER_PLAYER

# Truck mask: trucks (2) detect ground (1) and player (8)
const MASK_TRUCK	 := LAYER_GROUND | LAYER_PLAYER

# Visual colors for different objects
const COLOR_GROUND	 := Color(0.3, 0.3, 0.3)
const COLOR_TRUCK	 := Color(0.2, 0.6, 0.9)
const COLOR_HAZARD_SAW := Color(0.9, 0.2, 0.2)
const COLOR_HAZARD_RAMP := Color(0.9, 0.7, 0.2)
const COLOR_HAZARD_DEBRIS := Color(0.5, 0.3, 0.1)
const COLOR_HAZARD_HAMMER := Color(0.4, 0.4, 0.4)

# Level templates for 5 difficulty tiers
var level_templates := {
	"tutorial": {
		"levels": [1, 2, 3, 4, 5],
		"truck_count": [1, 2],
		"speed": [10.0, 12.0],
		"gap_size": [3.0, 4.0],
		"hazard_count": [0, 1]
	},
	"easy": {
		"levels": [6, 7, 8, 9, 10],
		"truck_count": [2, 3],
		"speed": [12.0, 15.0],
		"gap_size": [2.5, 3.5],
		"hazard_count": [1, 2]
	},
	"medium": {
		"levels": [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
		"truck_count": [4, 6],
		"speed": [15.0, 18.0],
		"gap_size": [2.0, 3.0],
		"hazard_count": [2, 3]
	},
	"hard": {
		"levels": [21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
		"truck_count": [6, 8],
		"speed": [18.0, 22.0],
		"gap_size": [1.5, 2.5],
		"hazard_count": [3, 4]
	},
	"expert": {
		"levels": [31, 32, 33, 34, 35],
		"truck_count": [8, 10],
		"speed": [22.0, 25.0],
		"gap_size": [1.0, 2.0],
		"hazard_count": [4, 5]
	}
}

var current_level: int = 1
var _scene_root: Node3D = null
var finish_x: float = 140.0
# Collected references for easy lookup
var _trucks: Array[CharacterBody3D] = []
var _hazards: Array[Area3D] = []
var _player: CharacterBody3D = null
var _ground: StaticBody3D = null

# Phase 5: Debris falling state
var _debris_spawn_timer: float = 0.0
var _debris_spawn_interval: float = 4.0
var _debris_target_speed: float = 10.0

func _ready():
	# Use call_deferred to add after tree setup completes
	call_deferred("_find_or_create_scene_root")

func _process(delta: float) -> void:
	# Phase 5: Periodic debris falling spawns from trucks
	if _debris_target_speed > 0:
		_debris_spawn_timer -= delta
		if _debris_spawn_timer <= 0:
			_spawn_falling_debris()
			_debris_spawn_timer = _debris_spawn_interval

func _find_or_create_scene_root():
	# Try to find the World node from the current game scene
	var scene_root = get_tree().get_current_scene()
	if scene_root:
		var world_node = scene_root.get_node_or_null("World")
		if world_node:
			_scene_root = world_node
			print("[LevelManager] Using existing World node from scene")
			return
	# Fallback: create a new World node
	if not _scene_root:
		_scene_root = Node3D.new()
		_scene_root.name = "World"
		if scene_root:
			scene_root.add_child(_scene_root)
		else:
			get_tree().root.add_child(_scene_root)
		print("[LevelManager] Created new World node")

func get_template_for_level(level: int) -> Dictionary:
	for tier_name in level_templates:
		var tier = level_templates[tier_name]
		if level in tier["levels"]:
			return tier
	return level_templates["tutorial"]

func get_level_parameters(level: int) -> Dictionary:
	var template = get_template_for_level(level)
	var tier_levels = template["levels"]
	
	# Determine position within tier (0-indexed)
	var tier_index = level - tier_levels[0]
	var num_levels = tier_levels.size()
	
	# Deterministic truck count: distribute evenly across tier
	# e.g. medium tier (10 levels, range 4-6): [4,4,5,5,5,5,6,6,6,6]
	var truck_count: int
	if num_levels > 1:
		var step: float = float(template["truck_count"][1] - template["truck_count"][0]) / float(num_levels - 1)
		truck_count = template["truck_count"][0] + round(tier_index * step)
	else:
		truck_count = template["truck_count"][0]
	
	# Deterministic hazard count: distribute evenly across tier
	var hazard_count: int
	if num_levels > 1:
		var step: float = float(template["hazard_count"][1] - template["hazard_count"][0]) / float(num_levels - 1)
		hazard_count = template["hazard_count"][0] + round(tier_index * step)
	else:
		hazard_count = template["hazard_count"][0]
	
	# Speed: interpolate between tier min and max based on tier progress
	var tier_range = num_levels - 1
	var tier_progress: float
	if tier_range > 0:
		tier_progress = float(tier_index) / float(tier_range)
	else:
		tier_progress = 0.0
	var speed = lerp(template["speed"][0], template["speed"][1], tier_progress)
	
	# Gap: decrease with tier progress (harder = tighter gaps)
	var gap = lerp(template["gap_size"][1], template["gap_size"][0], tier_progress)
	
	return {
		"truck_count": truck_count,
		"speed": speed,
		"max_speed": speed * 1.2,
		"gap_size": gap,
		"max_gap": gap * 1.3,
		"hazard_count": hazard_count
	}

func load_level(level: int) -> void:
	current_level = level
	level_starting.emit()
	
	print("[LevelManager] Loading level ", level)
	_generate_level(level)
	
	# Set finish-x based on ground extent (ground is 300 units long, [-150, +150])
	# Player must reach near the end (+140 is the finish line)
	finish_x = 140.0
	
	level_loaded.emit()

func _generate_level(level: int) -> void:
	var params = get_level_parameters(level)
	
	# Ensure we have a scene root to work with
	_find_or_create_scene_root()
	
	# Clear existing dynamic level content ONLY (not scene-prefab nodes)
	if _scene_root:
		# Remove dynamically created nodes, preserve scene nodes
		var children = _scene_root.get_children()
		for child in children:
			var name = child.name
			# Skip scene-prefab nodes that should be preserved
			if name in ["Player", "Camera3D", "DirectionalLight3D", "DirectionalLight3D2"]:
				continue
			_scene_root.remove_child(child)
			child.queue_free()
		_trucks.clear()
		_hazards.clear()
		_player = null
		_ground = null
	
	# Generate ground platform
	_ground = _create_ground()
	# Align player to ground surface
	if _player:
		_player.position.y = 0.75  # bottom of capsule at y=0.25 (ground top)
	
	# Generate truck convoy
	_trucks = _create_truck_convoy(params["truck_count"], params["speed"], params["max_speed"])
	
	# Generate hazards (placed on trucks)
	_hazards = _create_hazards(params["hazard_count"])
	
	# Find or create player
	_player = _place_player()
	
	# Ensure camera controller exists
	_ensure_camera_controller()

# =============================================================================
# Ground
# =============================================================================
func _create_ground() -> StaticBody3D:
	var ground = StaticBody3D.new()
	ground.name = "Ground"
	ground.collision_layer = LAYER_GROUND
	ground.collision_mask = 0  # Ground doesn't need to detect anything
	
	# Collision shape — extends along X (direction of travel) and Z (width)
	var shape = CollisionShape3D.new()
	var shape_data = BoxShape3D.new()
	shape_data.size = Vector3(300, 0.5, 20)   # 300 units long (was 200)
	shape.shape = shape_data
	
	# Visual mesh
	var visual = MeshInstance3D.new()
	var mesh = BoxMesh.new()
	mesh.size = Vector3(300, 0.5, 20)         # match collision
	visual.mesh = mesh
	visual.position = Vector3(0, 0, 0)         # centered on collision shape
	
	# Add visual material with roughness/metallic for better visuals
	var mat = StandardMaterial3D.new()
	mat.albedo_color = COLOR_GROUND
	mat.roughness = 0.9
	mat.metallic = 0.0
	visual.set_material(mat)
	
	ground.add_child(shape)
	ground.add_child(visual)
	_scene_root.add_child(ground)
	
	print("[LevelManager] Ground created: 300 x 0.5 x 20 at y=0")
	return ground

# =============================================================================
# Trucks
# =============================================================================
const TRUCK_WIDTH := 6.0      # x extent of each truck
const TRUCK_GAP   := 10.0     # gap between trucks (task requirement)
const TRUCK_SPACING := TRUCK_WIDTH + TRUCK_GAP   # 16 units center-to-center

func _create_truck_convoy(count: int, min_speed: float, max_speed: float) -> Array[CharacterBody3D]:
	var trucks: Array[CharacterBody3D] = []
	
	# Start offset: place the first truck so its center is a bit ahead of origin
	# Ground spans [-150, +150] in X; player starts near 0
	var start_x := 4.0  # slightly ahead of spawn
	
	for i in range(count):
		var truck = _create_truck(min_speed, max_speed)
		# Position: x = start + i * spacing, z = 0
		truck.position = Vector3(start_x + i * TRUCK_SPACING, 0, 0)
		truck.name = "Truck_%d" % i
		_scene_root.add_child(truck)
		trucks.append(truck)
	
	print("[LevelManager] Truck convoy: %d trucks, spacing=%.1f units" % [count, TRUCK_SPACING])
	return trucks

func _create_truck(min_speed: float, max_speed: float) -> CharacterBody3D:
	var truck = CharacterBody3D.new()
	truck.name = "Truck"
	
	# --- Collision shape ---
	var collision = CollisionShape3D.new()
	var shape = BoxShape3D.new()
	shape.size = Vector3(TRUCK_WIDTH, 3, 3)   # full extents, matches visual mesh
	collision.shape = shape
	# Position collision at truck center height
	collision.position = Vector3(0, 1.5, 0)
	truck.add_child(collision)
	
	# --- Visual body ---
	var body = MeshInstance3D.new()
	body.name = "Body"
	var mesh = BoxMesh.new()
	mesh.size = Vector3(TRUCK_WIDTH, 3, 3)
	body.mesh = mesh
	body.position = Vector3(0, 1.5, 0)
	
	# Add visual material with metallic/roughness for shiny truck bodies
	var mat = StandardMaterial3D.new()
	mat.albedo_color = COLOR_TRUCK
	mat.roughness = 0.3
	mat.metallic = 0.7
	# Add emissive glow for visibility
	mat.emission_enabled = true
	mat.emission = Color(0.1, 0.3, 0.5)
	body.set_material(mat)
	truck.add_child(body)
	
	# --- Collision layer / mask ---
	truck.collision_layer   = LAYER_TRUCK
	truck.collision_mask    = MASK_TRUCK
	
	# --- Script ---
	var truck_script = preload("res://scripts/truck/truck_controller.gd")
	truck.set_script(truck_script)
	truck.set_min_speed(min_speed)
	truck.set_max_speed(max_speed)
	
	return truck

# =============================================================================
# Hazards — placed ON the trucks (not clipping through)
# =============================================================================
func _create_hazards(count: int) -> Array[Area3D]:
	var hazards: Array[Area3D] = []
	
	# Safety: if no trucks, we can't place hazards
	if _trucks.is_empty():
		print("[LevelManager] Warning: no trucks to place hazards on")
		return hazards
	
	for i in range(count):
		# Pick a truck to mount the hazard on
		var truck_idx = i % _trucks.size()
		var truck = _trucks[truck_idx]
		
		# Determine hazard type: 0=saw, 1=ramp, 2=hammer, 3=debris
		var hazard_type = i % 4
		var hazard = _create_hazard(hazard_type, truck_idx)
		
		# Parent the hazard to the truck so it moves with the truck
		truck.add_child(hazard)
		# Position hazard relative to truck local space
		var offset_y := 4.0        # just above truck top
		var offset_x := randf_range(-1.5, 1.5)   # slight random offset on truck
		var offset_z := randf_range(-0.8, 0.8)
		hazard.position = Vector3(offset_x, offset_y, offset_z)
		
		# Configure type-specific behavior (assign script, set parameters)
		_configure_hazard(hazard, hazard_type)
		
		hazards.append(hazard)
	
	print("[LevelManager] Placed %d hazards on trucks" % count)
	
	# Connect hazard body_entered signals to trigger player death
	_connect_hazard_signals()
	
	# Start periodic debris falling spawns
	_debris_spawn_timer = 2.0
	_debris_spawn_interval = randf_range(3.0, 5.0)
	
	return hazards

func _configure_hazard(hazard: Area3D, hazard_type: int) -> void:
	"""Assign the appropriate script and configure type-specific behavior."""
	match hazard_type:
		0:  # Saw blade
			var saw_script = preload("res://scripts/hazards/saw_blade.gd")
			hazard.set_script(saw_script)
		
		1:  # Ramp (launch pad)
			var ramp_script = preload("res://scripts/hazards/ramp.gd")
			hazard.set_script(ramp_script)
			hazard.launch_force = 18.0
		
		2:  # Static debris marker (also used to trigger falling debris spawns)
			# No special script needed; level_manager handles falling debris
			pass
		
		3:  # Hammer
			var hammer_script = preload("res://scripts/hazards/swinging_hammer.gd")
			hazard.set_script(hammer_script)
			hazard.swing_period = randf_range(1.5, 3.0)
			hazard.swing_amplitude = randf_range(PI / 6, PI / 3)

func _spawn_falling_debris():
	"""Spawn a falling debris object from above a random truck."""
	if _trucks.is_empty():
		return
	
	# Pick a random truck
	var truck = _trucks[randi() % _trucks.size()]
	if not truck.is_inside_tree():
		return
	
	# Spawn debris above the truck
	var debris_visual = MeshInstance3D.new()
	debris_visual.name = "DebrisVisual"
	var mesh = SphereMesh.new()
	mesh.radius = 0.5
	debris_visual.mesh = mesh
	var mat = StandardMaterial3D.new()
	mat.albedo_color = COLOR_HAZARD_DEBRIS
	mat.roughness = 0.95
	mat.metallic = 0.0
	debris_visual.set_material(mat)
	
	var debris_area = Area3D.new()
	debris_area.name = "FallingDebris"
	debris_area.collision_layer = LAYER_HAZARD
	debris_area.collision_mask = MASK_HAZARD
	debris_area.set_deferred("monitoring", true)
	debris_area.add_child(debris_visual)
	
	# Collision shape
	var collision = CollisionShape3D.new()
	var shape = SphereShape3D.new()
	shape.radius = 0.5
	collision.shape = shape
	debris_area.add_child(collision)
	
	# Script for falling behavior
	var debris_script = preload("res://scripts/hazards/falling_debris.gd")
	debris_area.set_script(debris_script)
	
	# Position above truck
	var spawn_x = truck.position.x + randf_range(-3.0, 3.0)
	var spawn_z = truck.position.z + randf_range(-2.0, 2.0)
	debris_area.activate(spawn_x, spawn_z, 25.0)
	
	# Add to scene root (not parented to truck so it falls independently)
	if _scene_root:
		_scene_root.add_child(debris_area)
		_hazards.append(debris_area)
		print("[LevelManager] Spawned falling debris at x=%.1f z=%.1f" % [spawn_x, spawn_z])

func _create_hazard(type: int, truck_idx: int) -> Area3D:
	var hazard = Area3D.new()
	hazard.name = "Hazard_%d_t%d" % [type, truck_idx]
	hazard.collision_layer   = LAYER_HAZARD
	hazard.collision_mask    = MASK_HAZARD  # detect player (layer 8)
	hazard.set_deferred("monitoring", true)
	
	match type:
		0:  # Saw blade — sharp metal with emissive edge
			var visual = MeshInstance3D.new()
			visual.name = "Visual"
			var mesh = CylinderMesh.new()
			mesh.radius = 0.8
			mesh.height = 0.1
			visual.mesh = mesh
			visual.rotation.x = PI / 2
			var mat = StandardMaterial3D.new()
			mat.albedo_color = COLOR_HAZARD_SAW
			mat.roughness = 0.2
			mat.metallic = 0.9
			mat.emission_enabled = true
			mat.emission = Color(1.0, 0.1, 0.1)
			mat.emission_energy_multiplier = 1.5
			visual.set_material(mat)
			hazard.add_child(visual)
			var collision = CollisionShape3D.new()
			var shape = SphereShape3D.new()
			shape.radius = 0.8
			collision.shape = shape
			hazard.add_child(collision)
		
		1:  # Ramp / cone — bright warning color
			var visual = MeshInstance3D.new()
			visual.name = "Visual"
			var mesh = CylinderMesh.new()
			mesh.radius = 1.0
			mesh.height = 2.0
			visual.mesh = mesh
			var mat = StandardMaterial3D.new()
			mat.albedo_color = COLOR_HAZARD_RAMP
			mat.roughness = 0.5
			mat.metallic = 0.3
			mat.emission_enabled = true
			mat.emission = Color(1.0, 0.8, 0.0)
			mat.emission_energy_multiplier = 1.2
			visual.set_material(mat)
			hazard.add_child(visual)
			var collision = CollisionShape3D.new()
			var shape = CylinderShape3D.new()
			shape.radius = 1.0
			shape.height = 2.0
			collision.shape = shape
			hazard.add_child(collision)
		
		2:  # Debris marker — rough organic material (static visual on truck)
			var visual = MeshInstance3D.new()
			visual.name = "Visual"
			var mesh = SphereMesh.new()
			mesh.radius = 0.5
			visual.mesh = mesh
			var mat = StandardMaterial3D.new()
			mat.albedo_color = COLOR_HAZARD_DEBRIS
			mat.roughness = 0.95
			mat.metallic = 0.0
			visual.set_material(mat)
			hazard.add_child(visual)
			var collision = CollisionShape3D.new()
			var shape = SphereShape3D.new()
			shape.radius = 0.5
			collision.shape = shape
			hazard.add_child(collision)
		
		3:  # Hammer — metallic tool with warning glow
			var visual = MeshInstance3D.new()
			visual.name = "Visual"
			var mesh = BoxMesh.new()
			mesh.size = Vector3(0.3, 0.3, 2)
			visual.mesh = mesh
			var mat = StandardMaterial3D.new()
			mat.albedo_color = COLOR_HAZARD_HAMMER
			mat.roughness = 0.4
			mat.metallic = 0.8
			mat.emission_enabled = true
			mat.emission = Color(0.3, 0.3, 0.3)
			mat.emission_energy_multiplier = 0.8
			visual.set_material(mat)
			hazard.add_child(visual)
			var collision = CollisionShape3D.new()
			var shape = BoxShape3D.new()
			shape.size = Vector3(0.3, 0.3, 2)
			collision.shape = shape
			hazard.add_child(collision)
	
	return hazard

# =============================================================================
# Player — use scene's existing player, or create if missing
# =============================================================================
func _place_player() -> CharacterBody3D:
	# Try to find existing player in scene
	_player = _scene_root.get_node_or_null("Player")
	if _player:
		_player.position = Vector3(0, 0.75, 0)
		_player.velocity = Vector3.ZERO
		# Ensure player has the movement script and correct collision layers
		if not _player.has_script():
			var player_script = preload("res://scripts/player/player_movement.gd")
			_player.set_script(player_script)
		_player.collision_layer = LAYER_PLAYER
		_player.collision_mask = MASK_PLAYER
		_player.set_meta("_level_manager_controlled", true)
		print("[LevelManager] Using existing Player from scene")
	else:
		# Fallback: create one
		_player = _create_player()
		_scene_root.add_child(_player)
		print("[LevelManager] Created new Player")
	return _player as CharacterBody3D

func _create_player() -> CharacterBody3D:
	var player = CharacterBody3D.new()
	player.name = "Player"
	
	# --- Visual capsule body ---
	var body = MeshInstance3D.new()
	body.name = "Body"
	var mesh = CapsuleMesh.new()
	mesh.radius = 0.3
	mesh.height = 1.0
	body.mesh = mesh
	# Position the mesh so its bottom sits at y=0 when player center is y=0.3
	body.position = Vector3(0, 0.8, 0)
	
	# Add visual material — bright green player with subtle glow
	var mat = StandardMaterial3D.new()
	mat.albedo_color = Color(0.2, 0.8, 0.2)
	mat.roughness = 0.5
	mat.metallic = 0.2
	mat.emission_enabled = true
	mat.emission = Color(0.1, 0.5, 0.1)
	mat.emission_energy_multiplier = 1.0
	body.set_material(mat)
	
	player.add_child(body)
	
	# --- Collision shape ---
	var collision = CollisionShape3D.new()
	collision.name = "CollisionShape"
	var shape = CapsuleShape3D.new()
	shape.radius = 0.3
	shape.height = 1.0
	collision.shape = shape
	# Center of collision at player position (y=0)
	player.add_child(collision)
	
	# --- Ray casts for player logic ---
	var ray_left = RayCast3D.new()
	ray_left.name = "RayCastLeft"
	ray_left.target_position = Vector3(0, -0.5, 0.5)
	ray_left.enabled = true
	
	var ray_right = RayCast3D.new()
	ray_right.name = "RayCastRight"
	ray_right.target_position = Vector3(0, -0.5, -0.5)
	ray_right.enabled = true
	
	var ground_check = RayCast3D.new()
	ground_check.name = "GroundCheck"
	ground_check.target_position = Vector3(0, -0.5, 0)
	ground_check.enabled = true
	
	# Common ray settings
	for ray in [ray_left, ray_right, ground_check]:
		ray.collide_with_bodies = true
		ray.collide_with_areas = false
		player.add_child(ray)
	
	# Add audio player for SFX
	var sfx_player = AudioStreamPlayer.new()
	sfx_player.name = "SFX"
	player.add_child(sfx_player)
	player._sfx_player = sfx_player
	
	# --- Script ---
	var player_script = preload("res://scripts/player/player_movement.gd")
	player.set_script(player_script)
	
	# --- Collision layer/mask ---
	player.collision_layer   = LAYER_PLAYER
	player.collision_mask    = MASK_PLAYER
	
	return player

# =============================================================================
# Respawn
# =============================================================================
func respawn_player() -> void:
	# Find player and reset position
	if _player:
		_player.position = Vector3(0, 0.75, 0)
		_player.velocity = Vector3.ZERO
	elif _scene_root:
		var player = _scene_root.get_node_or_null("Player")
		if player:
			player.position = Vector3(0, 0.75, 0)
			player.velocity = Vector3.ZERO

# =============================================================================
# Camera controller — ensures a FollowCamera is present on the root
# =============================================================================
func _ensure_camera_controller() -> Node3D:
	# Check if a camera with FollowCamera script already exists under _scene_root
	var existing = _scene_root.get_node_or_null("Camera3D")
	if existing and existing.has_script():
		return existing
	
	# Create one
	var camera = Camera3D.new()
	camera.name = "Camera3D"
	
	var cam_script = preload("res://scripts/camera/camera_controller.gd")
	camera.set_script(cam_script)
	
	# Exported defaults matching game.tscn
	camera.follow_distance = 8.0
	camera.height_offset = 4.0
	camera.smoothness = 0.12
	
	_scene_root.add_child(camera)
	return camera

# =============================================================================
# Hazard signal connection
# =============================================================================
func _connect_hazard_signals() -> void:
	# Connect each hazard's body_entered signal to trigger player death
	# (player is a CharacterBody3D, so body_entered fires)
	for hazard in _hazards:
		# Avoid duplicate connections
		if hazard.body_entered.is_connected(_on_hazard_collided):
			continue
		hazard.body_entered.connect(_on_hazard_collided)

func _on_hazard_collided(body: Node) -> void:
	# Check if the other node is the player or an ancestor of the player
	var node = body
	while node:
		if node == _player:
			print("[LevelManager] Hazard collision! Player hit hazard")
			GameManager.player_died()
			break
		node = node.get_parent()

# =============================================================================
# Progress
# =============================================================================
func get_unlocked_levels() -> int:
	var config: ConfigFile = ConfigFile.new()
	var err: int = config.load("user://cluster_rush_save.dat")
	if err == OK:
		return config.get_value("progress", "highest_level", 1)
	return 1

func save_progress(level: int) -> void:
	var config: ConfigFile = ConfigFile.new()
	config.set_value("progress", "highest_level", level)
	var err: int = config.save("user://cluster_rush_save.dat")
	if err != OK:
		printerr("[LevelManager] Failed to save progress: ", err)

# =============================================================================
# Level completion tracking (P1 Visual Polish)
# =============================================================================

func _load_level_data() -> Dictionary:
	var config := ConfigFile.new()
	var err := config.load("user://cluster_rush_save.dat")
	if err != OK:
		return {}
	var json_str: String = config.get_value("progress", "level_data", "{}")
	var data = JSON.parse_string(json_str)
	if data is Dictionary:
		return data
	return {}

func has_completed_level(level: int) -> bool:
	var data := _load_level_data()
	return data.has(str(level)) and data[str(level)].get("completed", false)

func get_level_stars(level: int) -> int:
	var data := _load_level_data()
	var info = data.get(str(level), {})
	return info.get("stars", 0)

func save_level_completion(level: int, stars: int) -> void:
	var config := ConfigFile.new()
	var err := config.load("user://cluster_rush_save.dat")
	
	var json_str := "{}"
	if err == OK:
		json_str = config.get_value("progress", "level_data", "{}")
	
	var data := JSON.parse_string(json_str) as Dictionary
	if data == null:
		data = {}
	
	var level_info := {"stars": stars, "completed": true}
	data[str(level)] = level_info
	
	var json := JSON.new()
	config.set_value("progress", "level_data", json.stringify(data))
	config.save("user://cluster_rush_save.dat")

func get_tier_color(level: int) -> Color:
	if level <= 5:
		return Color(0.2, 0.85, 0.2)    # Green - Tutorial
	elif level <= 10:
		return Color(0.2, 0.5, 0.95)    # Blue - Easy
	elif level <= 20:
		return Color(0.95, 0.85, 0.15)  # Yellow - Medium
	elif level <= 30:
		return Color(0.95, 0.55, 0.1)   # Orange - Hard
	else:
		return Color(0.95, 0.15, 0.15)  # Red - Expert
