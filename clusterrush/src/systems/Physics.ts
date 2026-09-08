import * as CANNON from 'cannon-es';
import { Logger } from '@/utils/Logger';
import { CollisionLayers } from '@/utils/Constants';
import type { PhysicsConfig } from '@/types/GameTypes';

/**
 * Physics system using Cannon-es
 */
export class PhysicsSystem {
  private world: CANNON.World;
  private bodies: Map<string, CANNON.Body> = new Map();
  private debugMeshes: any[] = [];
  private config: PhysicsConfig;
  
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
    mass: number = 0
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
    mass: number = 0
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
  createGround(id: string = 'ground'): CANNON.Body {
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
   */
  applyForce(id: string, force: { x: number; y: number; z: number }): void {
    const body = this.bodies.get(id);
    if (body) {
      body.applyForce(new CANNON.Vec3(force.x, force.y, force.z), body.position);
    }
  }
  
  /**
   * Apply impulse to a body
   */
  applyImpulse(id: string, impulse: { x: number; y: number; z: number }): void {
    const body = this.bodies.get(id);
    if (body) {
      body.applyImpulse(new CANNON.Vec3(impulse.x, impulse.y, impulse.z), body.position);
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
    this.debugMeshes = [];
    Logger.info('Physics system cleaned up');
  }
}
