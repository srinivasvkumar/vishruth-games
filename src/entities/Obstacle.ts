import { Group, Mesh, MeshStandardMaterial, BoxGeometry, Vector3 } from 'three';
import { Logger } from '@/utils/Logger';

/**
 * Types of obstacles
 */
export type ObstacleType = 'block' | 'spike' | 'moving' | 'rotating' | 'breakable';

/**
 * W4-B.11 — shared GPU-resource caches.
 *
 * Before this change every Obstacle allocated its own BoxGeometry and
 * MeshStandardMaterial: 500 obstacles = 500 geometries + 500 materials on
 * the GPU and in the JS heap, and nothing ever disposed them (deactivate()
 * only hid the mesh). Under long runs / 500+ obstacles that is the low-memory
 * failure mode this card targets.
 *
 * Now:
 *   - geometries are cached per unique size (GameScene always uses the
 *     default 4x5x6, so 500 obstacles share ONE geometry),
 *   - materials are cached per type (5 colors → 5 materials total),
 *   - dispose() on an obstacle releases ONLY resources it owns — shared
 *     cache entries are never destroyed by an individual obstacle.
 */
const geometryCache = new Map<string, BoxGeometry>();
const materialCache = new Map<ObstacleType, MeshStandardMaterial>();

/**
 * Return the cached BoxGeometry for a size, creating it on first use.
 * The key is the rounded size signature so tiny float differences (from
 * user code) still collapse onto the same cached geometry.
 */
function getSharedGeometry(size: Vector3): BoxGeometry {
  const key = `${Math.round(size.x * 1000)}|${Math.round(size.y * 1000)}|${Math.round(size.z * 1000)}`;
  let geometry = geometryCache.get(key);
  if (!geometry) {
    geometry = new BoxGeometry(size.x, size.y, size.z);
    geometryCache.set(key, geometry);
  }
  return geometry;
}

/**
 * Return the cached MeshStandardMaterial for a type, creating it on first use.
 * All obstacles of a type share one material (same color/metalness/roughness).
 */
function getSharedMaterial(type: ObstacleType): MeshStandardMaterial {
  let material = materialCache.get(type);
  if (!material) {
    material = new MeshStandardMaterial({
      color: colorForType(type),
      metalness: 0.3,
      roughness: 0.8
    });
    materialCache.set(type, material);
  }
  return material;
}

/** Per-type obstacle colors (moved out of the instance method so the
 * shared-material cache can build its colors without an instance). */
function colorForType(type: ObstacleType): number {
  const colors: Record<ObstacleType, number> = {
    'block': 0xff0000,
    'spike': 0x990000,
    'moving': 0x00ff00,
    'rotating': 0x0000ff,
    'breakable': 0x888888
  };
  return colors[type];
}

/** W4-B.11: per-type damage values (single source of truth — used by the
 * constructor and by GameScene pool re-typing). */
export const DAMAGE_BY_TYPE: Record<ObstacleType, number> = {
  'block': 10,
  'spike': 25,
  'moving': 15,
  'rotating': 15,
  'breakable': 5
};

/** W4-B.11: exported for GameScene pool re-typing — returns the shared
 * material instance for a type (same instance the constructor uses). */
export { getSharedMaterial };

/**
 * Obstacle entity
 */
export class Obstacle {
  private mesh: Group;
  private type: ObstacleType;
  private damage: number;
  private isActive = true;
  private movementSpeed = 0;
  private rotationSpeed = 0;
  private originalPosition: Vector3;
  
  constructor(
    position: Vector3,
    type: ObstacleType = 'block',
    size: Vector3 = new Vector3(4, 5, 6)
  ) {
    this.type = type;
    this.originalPosition = position.clone();
    
    // Set damage based on type
    this.damage = DAMAGE_BY_TYPE[type];
    
    // Create mesh based on type
    this.mesh = new Group();
    this.mesh.position.copy(position);
    
    // W4-B.11: shared GPU resources — one geometry per unique size,
    // one material per type (see module caches above).
    const geometry = getSharedGeometry(size);
    const material = getSharedMaterial(type);
    
    const obstacleMesh = new Mesh(geometry, material);
    this.mesh.add(obstacleMesh);
    
    // Set movement/rotation based on type
    if (type === 'moving') {
      this.movementSpeed = 2;
    } else if (type === 'rotating') {
      this.rotationSpeed = 1;
    }
    
    Logger.debug('Obstacle created', { type, position, damage: this.damage });
  }
  
  /**
   * Update obstacle state
   */
  update(deltaTime: number): void {
    if (!this.isActive) return;
    
    // Handle movement for moving obstacles
    if (this.movementSpeed > 0) {
      this.mesh.position.x = this.originalPosition.x + 
        Math.sin(performance.now() * 0.001 * this.movementSpeed) * 3;
    }
    
    // Handle rotation for rotating obstacles
    if (this.rotationSpeed > 0) {
      this.mesh.rotation.y += this.rotationSpeed * deltaTime;
    }
  }
  
  /**
   * Deactivate obstacle
   */
  deactivate(): void {
    this.isActive = false;
    this.mesh.visible = false;
    Logger.debug('Obstacle deactivated');
  }
  
  /**
   * Reactivate obstacle
   */
  reactivate(): void {
    this.isActive = true;
    this.mesh.visible = true;
    Logger.debug('Obstacle reactivated');
  }
  
  /**
   * W4-B.11 — release instance-owned resources and reset per-instance state.
   *
   * Geometry and material come from the module-level shared caches and are
   * owned by MANY obstacles, so dispose() must NEVER destroy them — doing so
   * would free the GPU buffers of every other live obstacle. What dispose()
   * does instead:
   *   - removes the instance's Mesh + Group from their parent (frees the
   *     two instance-owned three.js objects for GC),
   *   - resets position/rotation/visibility + isActive so the instance is
   *     pool-ready for re-spawn.
   *
   * Callers that no longer need this obstacle should also drop it from their
   * tracking array; shared GPU resources are disposed at app teardown, not
   * here.
   */
  dispose(): void {
    const child = this.mesh.children[0];
    if (child) {
      this.mesh.remove(child);
    }
    if (this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }
    this.mesh.visible = false;
    this.mesh.position.copy(this.originalPosition);
    this.mesh.rotation.set(0, 0, 0);
    this.isActive = false;
    Logger.debug('Obstacle disposed (shared resources retained)');
  }
  
  /**
   * W4-B.11 — re-spawn this obstacle at a new position/type (pool reuse).
   *
   * Called by the GameScene pool allocator instead of `new Obstacle(...)`
   * when a previously reaped obstacle is available. Swaps in the shared
   * material for the new type, resets movement/rotation/visibility, and
   * re-arms the instance. No GPU allocation — everything comes from the
   * module-level caches.
   *
   * The caller re-adds `getMesh()` to the scene graph (this method only
   * prepares the instance; it does not manage scene-graph membership).
   */
  reset(position: Vector3, type: ObstacleType = this.type): void {
    this.type = type;
    this.damage = DAMAGE_BY_TYPE[type];
    this.originalPosition.copy(position);
    this.mesh.position.copy(position);
    this.mesh.rotation.set(0, 0, 0);
    this.mesh.visible = true;
    this.isActive = true;
    // Movement/rotation params follow the type.
    this.movementSpeed = type === 'moving' ? 2 : 0;
    this.rotationSpeed = type === 'rotating' ? 1 : 0;
    // Swap the child mesh's material to the shared material for this type.
    const child = this.mesh.children[0] as { material?: MeshStandardMaterial } | undefined;
    if (child) {
      child.material = getSharedMaterial(type);
    }
    Logger.debug('Obstacle reset (pool reuse)', { type, position });
  }
  
  // Public getters
  getMesh(): Group { return this.mesh; }
  getType(): ObstacleType { return this.type; }
  getDamage(): number { return this.damage; }
  isObstacleActive(): boolean { return this.isActive; }
}
