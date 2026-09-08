import { Group, Mesh, MeshStandardMaterial, BoxGeometry, Vector3 } from 'three';
import { Logger } from '@/utils/Logger';

/**
 * Types of obstacles
 */
export type ObstacleType = 'block' | 'spike' | 'moving' | 'rotating' | 'breakable';

/**
 * Obstacle entity
 */
export class Obstacle {
  private mesh: Group;
  private type: ObstacleType;
  private damage: number;
  private isActive: boolean = true;
  private movementSpeed: number = 0;
  private rotationSpeed: number = 0;
  private originalPosition: Vector3;
  
  constructor(
    position: Vector3,
    type: ObstacleType = 'block',
    size: Vector3 = new Vector3(1, 1, 1)
  ) {
    this.type = type;
    this.originalPosition = position.clone();
    
    // Set damage based on type
    this.damage = {
      'block': 10,
      'spike': 25,
      'moving': 15,
      'rotating': 15,
      'breakable': 5
    }[type];
    
    // Create mesh based on type
    this.mesh = new Group();
    this.mesh.position.copy(position);
    
    const geometry = new BoxGeometry(size.x, size.y, size.z);
    const material = new MeshStandardMaterial({ 
      color: this.getColorByType(type),
      metalness: 0.3,
      roughness: 0.8
    });
    
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
   * Get color based on obstacle type
   */
  private getColorByType(type: ObstacleType): number {
    const colors = {
      'block': 0xff0000,
      'spike': 0x990000,
      'moving': 0x00ff00,
      'rotating': 0x0000ff,
      'breakable': 0x888888
    };
    return colors[type];
  }
  
  // Public getters
  getMesh(): Group { return this.mesh; }
  getType(): ObstacleType { return this.type; }
  getDamage(): number { return this.damage; }
  isObstacleActive(): boolean { return this.isActive; }
}
