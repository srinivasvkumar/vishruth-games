extends Node3D
# FollowCamera - Third-person camera that follows the player
# Provides smooth following with adjustable offset and look-ahead

class_name FollowCamera

## How far behind the player the camera sits
@export var follow_distance: float = 8.0

## Vertical offset above the player
@export var height_offset: float = 4.0

## How quickly the camera catches up (0.05 = slow, 0.3 = snappy)
@export_category("Smoothness")
@export var smoothness: float = 0.12

## Minimum yaw speed to allow rotation (in radians/sec)
@export var rotation_speed: float = 2.0

## Vertical smoothing
@export var vertical_smoothness: float = 0.1

## How far to look ahead of the player when turning
@export var look_ahead: float = 3.0

## Minimum distance to stay from the player
@export var min_distance: float = 2.0

## Reference to the player node (set via inspector or _ready)
@export var player: Node3D

## Internal tracking
var _target_position: Vector3 = Vector3.ZERO
var _yaw: float = 0.0

func _ready() -> void:
	# Find player if not set — try multiple strategies for robustness
	if not player:
		player = get_node_or_null("../../../Player")
	if not player:
		player = get_node_or_null("../../Player")
	if not player:
		player = get_node_or_null("../../../World/Player")
	if not player:
		player = get_tree().get_current_scene().get_node_or_null("World/Player")
	if not player:
		player = get_tree().get_root().find_child("Player", false, true)
	
	if not player:
		printerr("[FollowCamera] No player found! Camera will not follow anything.")
		return
	
	# Position camera initially behind and above player
	_target_position = player.global_position
	_target_position.z = follow_distance
	_target_position.y = height_offset
	global_position = _target_position

func _physics_process(_delta: float) -> void:
	if not player:
		return
	
	# Calculate desired offset behind player
	var behind: Vector3 = player.global_basis.z
	var target: Vector3 = player.global_position + Vector3.UP * height_offset
	target.z += follow_distance * behind.z
	
	# Add look-ahead offset based on player velocity
	if player is CharacterBody3D:
		var vel: Vector3 = player.velocity
		target.x += vel.x * look_ahead * 0.05
		target.z += vel.z * look_ahead * 0.05
	
	_target_position = target
	
	# Smoothly interpolate camera toward target
	var current: Vector3 = global_position
	global_position = current.lerp(_target_position, smoothness * 60.0 * _delta)
