extends Node3D
## ParticleEffects - System for rendering visual effects
## Handles particle spawning for: jumps, landings, deaths, level completions,
## and environmental effects (trucks, saw blades, ramps, debris)
##
## Implementation: Uses GPUParticles3D nodes for GPU-accelerated particles.

var _particle_material: StandardMaterial3D

func _ready():
	_particle_material = StandardMaterial3D.new()
	_particle_material.render_priority = 1

## Spawn particles on a jump
func spawn_jump_particles(position: Vector3) -> GPUParticles3D:
	return _create_burst_particles(position, Color(0.2, 0.9, 0.3, 0.8), 12, 2.0, 0.5)

## Spawn particles on landing
func spawn_land_particles(position: Vector3) -> GPUParticles3D:
	return _create_burst_particles(position, Color(0.8, 0.8, 0.4, 0.6), 8, 1.5, 0.3)

## Spawn particles on player death
func spawn_death_particles(position: Vector3) -> GPUParticles3D:
	return _create_burst_particles(position, Color(1.0, 0.2, 0.1, 0.9), 25, 4.0, 1.0)

## Spawn particles on level completion
func spawn_complete_particles(position: Vector3) -> GPUParticles3D:
	return _create_burst_particles(position, Color(1.0, 1.0, 0.2, 0.8), 30, 3.0, 1.5)

## Spawn environmental dust particles (for truck movement)
func spawn_dust_particles(position: Vector3) -> GPUParticles3D:
	return _create_burst_particles(position, Color(0.6, 0.6, 0.5, 0.4), 6, 1.0, 0.2)

## Spawn spark particles (for saw blade contact)
func spawn_spark_particles(position: Vector3) -> GPUParticles3D:
	return _create_burst_particles(position, Color(1.0, 0.9, 0.5, 0.9), 15, 3.0, 0.5)

## Create a burst of GPUParticles3D at the given position
func _create_burst_particles(
	position: Vector3,
	color: Color,
	count: int,
	lifetime: float,
	spread: float
) -> GPUParticles3D:
	
	var particles = GPUParticles3D.new()
	particles.name = "ParticleBurst_" + str(position.x) + "_" + str(position.y)
	particles.position = position
	
	particles.amount = count
	particles.lifetime = lifetime
	particles.one_shot = true
	particles.process_material = _create_particle_material(color, spread)
	particles.draw_pass_1 = _create_particle_mesh()
	
	particles.emitting = false
	add_child(particles)
	particles.emitting = true
	particles.autofree = true
	
	return particles

## Create the particle process material with custom behavior
func _create_particle_material(color: Color, spread: float) -> ParticleProcessMaterial:
	var material = ParticleProcessMaterial.new()
	material.life_mode = 1
	material.initial_velocity_min = spread * 50.0
	material.initial_velocity_max = spread * 150.0
	material.acceleration = Vector3(0, -100.0, 0)
	material.randomness = 0.8
	material.texture_scale_min = 0.1
	material.texture_scale_max = 1.0
	
	var color_ramp = Gradient.new()
	color_ramp.set_point(0, color)
	color_ramp.set_point(0.7, color)
	color_ramp.set_point(1.0, Color(1.0, 1.0, 1.0, 0.0))
	material.color_ramp = color_ramp
	
	var scale_ramp = Curve2D.new()
	scale_ramp.add_point(Vector2(0, 1.0))
	scale_ramp.add_point(Vector2(0.5, 0.6))
	scale_ramp.add_point(Vector2(1.0, 0.0))
	material.scale_curve = scale_ramp
	
	return material

## Create a simple quad mesh for particles
func _create_particle_mesh() -> Mesh:
	var st = SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	
	var verts = [
		Vector3(-0.5, -0.5, 0),
		Vector3(0.5, -0.5, 0),
		Vector3(0.5, 0.5, 0),
		Vector3(-0.5, 0.5, 0),
	]
	
	var indices = [0, 1, 2, 0, 2, 3]
	
	for i in range(verts.size()):
		st.add_vertex(verts[i])
		st.add_uv(Vector2(0, 0))
	
	for idx in indices:
		st.add_index(idx)
	
	st.generate_normals()
	st.commit()
	
	return st
