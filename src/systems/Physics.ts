import * as CANNON from 'cannon-es';
import { Logger } from '@/utils/Logger';
import type { PhysicsConfig } from '@/types/GameTypes';

/**
 * Physics system using Cannon-es
 */
export class PhysicsSystem {
  private world: CANNON.World;
  private bodies = new Map<string, CANNON.Body>();
  private config: PhysicsConfig;
  /**
   * W3-C.3b: pre-allocated scratch vectors for applyForce()/applyImpulse().
   * These used to allocate a `new CANNON.Vec3(...)` on every call — on the
   * input/force path that is per-frame GC pressure. Reusing scratch vectors
   * keeps the hot path allocation-free.
   */
  private readonly forceScratch = new CANNON.Vec3();
  private readonly impulseScratch = new CANNON.Vec3();
  
  constructor(config: PhysicsConfig) {
    this.config = config;
    this.world = new CANNON.World();
    this.world.gravity.set(0, -config.gravity, 0);
    this.world.defaultContactMaterial.friction = 0.3;
    this.world.defaultContactMaterial.restitution = 0.3;
    
    Logger.info('Physics system initialized', config);
  }
  
  /**
   * Update physics simulation
   *
   * W3-C.3b: step-timing contract. Game.gameLoop() calls this ONCE per rAF
   * frame, BEFORE sceneManager.update()/render() (input -> physics -> scene ->
   * render), so the physics step that applies input-driven velocity happens in
   * the same frame that renders the result — no cross-frame physics latency.
   * world.step(fixedTimeStep, deltaTime, maxSubSteps) runs the fixed-timestep
   * accumulator internally; a keypress that lands just after a step boundary
   * applies on the next 1/60 s step, which is the 1-frame physical floor
   * (16.67 ms) documented in W3-C.3a, not a code defect.
   */
  update(deltaTime: number): void {
    try {
      this.world.step(this.config.fixedTimeStep, deltaTime, this.config.maxSubSteps);
    } catch (error) {
      Logger.error('Physics step error', error);
    }
  }
  
  /**
   * Add a rigid body to the physics world
   */
  addBody(id: string, body: CANNON.Body): void {
    this.bodies.set(id, body);
    this.world.addBody(body);
    Logger.debug('Physics body added', { id, type: body.type });
  }
  
  /**
   * Remove a rigid body from the physics world
   */
  removeBody(id: string): void {
    const body = this.bodies.get(id);
    if (body) {
      this.world.removeBody(body);
      this.bodies.delete(id);
      Logger.debug('Physics body removed', { id });
    }
  }
  
  /**
   * Create a box collider
   */
  createBox(
    id: string,
    position: { x: number; y: number; z: number },
    size: { x: number; y: number; z: number },
    mass = 0
  ): CANNON.Body {
    const body = new CANNON.Body({
      mass,
      position: new CANNON.Vec3(position.x, position.y, position.z),
      shape: new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2))
    });
    
    this.addBody(id, body);
    return body;
  }
  
  /**
   * Create a sphere collider
   */
  createSphere(
    id: string,
    position: { x: number; y: number; z: number },
    radius: number,
    mass = 0
  ): CANNON.Body {
    const body = new CANNON.Body({
      mass,
      position: new CANNON.Vec3(position.x, position.y, position.z),
      shape: new CANNON.Sphere(radius)
    });
    
    this.addBody(id, body);
    return body;
  }
  
  /**
   * Create a ground plane
   */
  createGround(id = 'ground'): CANNON.Body {
    const body = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(0, 0, 0),
      shape: new CANNON.Plane()
    });
    
    body.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    this.addBody(id, body);
    
    return body;
  }
  
  /**
   * Apply force to a body
   *
   * W3-C.3b: uses the pre-allocated forceScratch vector instead of allocating
   * a new CANNON.Vec3 per call.
   */
  applyForce(id: string, force: { x: number; y: number; z: number }): void {
    const body = this.bodies.get(id);
    if (body) {
      this.forceScratch.set(force.x, force.y, force.z);
      body.applyForce(this.forceScratch, body.position);
    }
  }
  
  /**
   * Apply impulse to a body
   *
   * W3-C.3b: uses the pre-allocated impulseScratch vector instead of
   * allocating a new CANNON.Vec3 per call.
   */
  applyImpulse(id: string, impulse: { x: number; y: number; z: number }): void {
    const body = this.bodies.get(id);
    if (body) {
      this.impulseScratch.set(impulse.x, impulse.y, impulse.z);
      body.applyImpulse(this.impulseScratch, body.position);
    }
  }
  
  /**
   * Get body by ID
   */
  getBody(id: string): CANNON.Body | undefined {
    return this.bodies.get(id);
  }
  
  /**
   * Get all bodies
   */
  getAllBodies(): Map<string, CANNON.Body> {
    return new Map(this.bodies);
  }
  
  /**
   * Clean up physics resources
   */
  cleanup(): void {
    this.bodies.clear();
    Logger.info('Physics system cleaned up');
  }
}
