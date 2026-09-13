import type * as CANNON from 'cannon-es';
import type * as THREE from 'three';
import type { PhysicsSystem } from '@/systems/Physics';
import { Logger } from '@/utils/Logger';

/**
 * BodySync — synchronizes THREE mesh transforms with Cannon-es body
 * transforms (Task 6.2: Body synchronization, W2-B.1).
 *
 * The Cannon-es body is the source of truth: after `PhysicsSystem.update()`
 * has stepped the world, `sync()` copies `body.position` onto
 * `mesh.position` and `body.quaternion` onto `mesh.quaternion` for every
 * registered body. Called every frame from `Game.gameLoop`, right after
 * the physics step and before the scene updates — so meshes follow bodies
 * within the same frame, before the scene renders.
 *
 * Player and Obstacle keep owning their mesh; synchronization is
 * per-frame, not owned by the entities.
 *
 * (kanban t_f438f119, 2026-09-13. Tests: tests/unit/body-sync.test.ts +
 * the W2-B.1 describe in tests/unit/game.test.ts.
 * RED evidence: tests/evidence/w2/W2-B1-RED.txt.)
 */
export class BodySync {
  private physics: PhysicsSystem;
  private meshes = new Map<string, THREE.Object3D>();

  constructor(physics: PhysicsSystem) {
    this.physics = physics;
    Logger.info('BodySync initialized');
  }

  /**
   * Register a mesh to follow the physics body with the given id.
   */
  register(id: string, mesh: THREE.Object3D): void {
    this.meshes.set(id, mesh);
    Logger.debug('BodySync mesh registered', { id });
  }

  /**
   * Copy body position + rotation onto the mesh, for every registered
   * body. Called every frame after the physics step.
   */
  sync(): void {
    this.meshes.forEach((mesh, id) => {
      const body: CANNON.Body | undefined = this.physics.getBody(id);
      if (!body) return;
      mesh.position.set(body.position.x, body.position.y, body.position.z);
      mesh.quaternion.set(
        body.quaternion.x,
        body.quaternion.y,
        body.quaternion.z,
        body.quaternion.w
      );
    });
  }

  /**
   * Stop following the body with the given id.
   */
  unregister(id: string): void {
    if (this.meshes.delete(id)) {
      Logger.debug('BodySync mesh unregistered', { id });
    }
  }

  /**
   * Clear all registrations.
   */
  cleanup(): void {
    this.meshes.clear();
    Logger.info('BodySync cleaned up');
  }
}
