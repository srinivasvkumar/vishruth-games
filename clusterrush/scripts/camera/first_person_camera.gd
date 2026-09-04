extends Camera3D
# FirstPersonCamera - First-person POV camera following player head
# Follows player position + (0, 1.5, 0), matches player rotation.y
# Subtle vertical sway when jumping (spec: ±0.1 units)

@onready var player: CharacterBody3D = _find_player()

var _camera_offset: Vector3 = Vector3(0, 1.5, 0)
var _base_rotation_y: float = 0.0

func _find_player() -> CharacterBody3D:
	"""Find the player node via multiple lookup strategies."""
	# Strategy 1: absolute path from tree root
	var p: Node = get_node_or_null("/root/World/Player")
	if p is CharacterBody3D:
		return p as CharacterBody3D
	# Strategy 2: relative path through parent chain
	p = get_node_or_null("../../Player")
	if p is CharacterBody3D:
		return p as CharacterBody3D
	# Strategy 3: find World under scene root, then Player child
	var scene_root: Node = get_tree().get_current_scene()
	if scene_root:
		var world: Node = scene_root.get_node_or_null("World")
		if world:
			p = world.get_node_or_null("Player")
			if p is CharacterBody3D:
				return p as CharacterBody3D
	# Strategy 4: find_child
	p = get_tree().get_root().find_child("Player", false, true)
	if p is CharacterBody3D:
		return p as CharacterBody3D
	printerr("[FirstPersonCamera] Player not found!")
	return null

func _process(delta: float) -> void:
	if not player:
		return

	# Follow player head position with offset (spec: player pos + (0, 1.5, 0))
	var target_pos: Vector3 = player.position + _camera_offset
	position = lerp(position, target_pos, 10.0 * delta)

	# Match player rotation (head turns)
	_base_rotation_y = lerp_angle(_base_rotation_y, player.rotation.y, 5.0 * delta)
	rotation.y = _base_rotation_y

	# Subtle vertical sway when jumping (spec: ±0.1 units)
	if not player.is_on_floor():
		position.y += sin(get_tree().get_time() * 3.0) * 0.02
