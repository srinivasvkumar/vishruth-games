extends Camera3D
# FirstPersonCamera - First-person POV camera following player head
# Follows player position + (0, 1.5, 0), matches player rotation.y
# Subtle vertical sway when jumping (spec: ±0.1 units)

var player: CharacterBody3D = null
var _camera_offset: Vector3 = Vector3(0, 1.5, 0)
var _camera_euler: Vector3 = Vector3()

func _ready() -> void:
	player = _find_player()

func _find_player() -> CharacterBody3D:
	"""Find the player node via multiple lookup strategies."""
	# Strategy 1: find World under scene root, then Player child
	var scene_root: Node = get_tree().get_current_scene()
	if scene_root:
		var world: Node = scene_root.get_node_or_null("World")
		if world:
			var p: Node = world.get_node_or_null("Player")
			if p is CharacterBody3D:
				return p as CharacterBody3D
	# Strategy 2: find_child fallback
	var p2: Node = get_tree().get_root().find_child("Player", false, true)
	if p2 is CharacterBody3D:
		return p2 as CharacterBody3D
	printerr("[FirstPersonCamera] Player not found!")
	return null

func _process(delta: float) -> void:
	if not player:
		return

	# Follow player head position with offset (spec: player pos + (0, 1.5, 0))
	var target_pos: Vector3 = player.position + _camera_offset
	position = lerp(position, target_pos, 10.0 * delta)

	# Match player rotation (head turns)
	_camera_euler = lerp(_camera_euler, player.rotation, 5.0 * delta)
	rotation = _camera_euler

	# Subtle vertical sway when player jumps (spec: ±0.1 units)
	if not player.is_on_floor():
		position.y += sin(get_tree().get_time() * 3.0) * 0.02
