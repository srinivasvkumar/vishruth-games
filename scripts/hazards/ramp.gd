extends Area3D
# Ramp - Launch player vertically upward
# Collision with player applies upward launch force

@export var launch_force: float = 18.0
@export var ramp_length: float = 3.0
@export var ramp_height: float = 1.0

var _launch_cooldown: float = 0.0

func _ready():
	# Set up ramp shape if mesh available
	_setup_ramp_shape()

func _setup_ramp_shape():
	"""Configure the ramp visual based on export params."""
	for child in get_children():
		if child is MeshInstance3D:
			var mesh = child.mesh
			if mesh is CylinderMesh:
				mesh.radius = ramp_length / 2
				mesh.height = ramp_height
			break

func _physics_process(_delta: float) -> void:
	# Decrease cooldown
	if _launch_cooldown > 0:
		_launch_cooldown -= _delta

func launch_player(player_body: CharacterBody3D):
	"""Launch the player upward when they collide with this ramp."""
	if _launch_cooldown > 0:
		return
	
	_launch_cooldown = 0.5
	
	if player_body is CharacterBody3D:
		# Add upward velocity
		player_body.velocity.y = launch_force
		# Preserve some forward momentum
		if player_body.velocity.x > 0:
			player_body.velocity.x = maxf(player_body.velocity.x, 5.0)

func get_launch_force() -> float:
	return launch_force

func set_launch_force(force: float) -> void:
	launch_force = force
