/**
 * W4-B.11 — Edge case: low memory conditions (graceful degradation, no crash).
 *
 * Kanban t_170c965a. TDD spec written FIRST (RED) against the intended
 * behavior: obstacles must share geometries/materials and support
 * dispose()/pool reuse so that spawning 500+ obstacles does not grow
 * GPU resources or the JS heap without bound.
 *
 * Leak sources this spec pins down (see workspace findings.md):
 *   1. Per-instance BoxGeometry (identical default size 4x5x6 for every
 *      obstacle spawned by GameScene — 500 obstacles = 500 geometries).
 *   2. Per-instance MeshStandardMaterial (only 5 distinct colors exist).
 *   3. No dispose() API — deactivated (breakable) obstacles stay reachable
 *      from GameScene.obstacles forever; nothing frees GPU buffers.
 *
 * Assertions:
 *   - Distinct shared geometry count after 500 spawns is BOUNDED (== 1 for
 *     the default size), not 500.
 *   - Distinct shared material count is BOUNDED (== 5, one per type).
 *   - Obstacle.dispose() exists and frees only instance-owned resources
 *     (shared resources must NOT be destroyed — they are reused).
 *   - Pool reuse: after dispose(), a re-spawned obstacle with the same
 *     defaults reuses shared resources (identity-stable across cycles).
 *   - No memory leak after 100 spawn/despawn cycles: distinct live
 *     geometries + materials stay at the bounded constants, and the
 *     dispose-count per shared resource stays at 0 (shared resources are
 *     never destroyed by individual obstacle disposal).
 *   - No crash: 500 simultaneous obstacles all update() without throwing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Obstacle, type ObstacleType } from '@/entities/Obstacle';
import { Vector3, BoxGeometry, MeshStandardMaterial } from 'three';

vi.mock('@/utils/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

/** All 5 obstacle types (the complete ObstacleType union). */
const ALL_TYPES: ObstacleType[] = ['block', 'spike', 'moving', 'rotating', 'breakable'];

/** Read the BoxGeometry of an obstacle's rendered child mesh. */
function childGeometry(obstacle: Obstacle): BoxGeometry {
  const child = obstacle.getMesh().children[0] as { geometry: BoxGeometry };
  return child.geometry;
}

/** Read the MeshStandardMaterial of an obstacle's rendered child mesh. */
function childMaterial(obstacle: Obstacle): MeshStandardMaterial {
  const child = obstacle.getMesh().children[0] as { material: MeshStandardMaterial };
  return child.material;
}

describe('W4-B.11 Obstacle — memory-bounded resource sharing', () => {
  describe('Shared geometry (default size 4x5x6)', () => {
    it('should use a SINGLE shared BoxGeometry for 500 default-size obstacles', () => {
      const geometries = new Set<BoxGeometry>();
      for (let i = 0; i < 500; i++) {
        const obstacle = new Obstacle(new Vector3(0, 0, 0));
        geometries.add(childGeometry(obstacle));
      }
      // BOUNDED: one cached geometry for the default size, not 500.
      expect(geometries.size).toBe(1);
    });

    it('should keep the shared default geometry at 4x5x6 (existing tests rely on parameters)', () => {
      const a = new Obstacle(new Vector3(0, 0, 0));
      const b = new Obstacle(new Vector3(5, 0, 0));
      const geo = childGeometry(a);
      expect(geo.parameters.width).toBe(4);
      expect(geo.parameters.height).toBe(5);
      expect(geo.parameters.depth).toBe(6);
      expect(childGeometry(b)).toBe(geo); // identity: same cached instance
    });

    it('should cache distinct non-default sizes per unique size (bounded by size variety)', () => {
      const a = new Obstacle(new Vector3(0, 0, 0), 'block', new Vector3(1, 1, 1));
      const b = new Obstacle(new Vector3(0, 0, 0), 'block', new Vector3(1, 1, 1));
      const c = new Obstacle(new Vector3(0, 0, 0), 'block', new Vector3(2, 2, 2));
      expect(childGeometry(a)).toBe(childGeometry(b)); // same size -> same cache entry
      expect(childGeometry(c)).not.toBe(childGeometry(a)); // different size -> different entry
    });
  });

  describe('Shared material (per type)', () => {
    it('should use a SINGLE shared MeshStandardMaterial per type (5 total, not 500)', () => {
      const materials = new Set<MeshStandardMaterial>();
      for (let i = 0; i < 500; i++) {
        const type = ALL_TYPES[i % ALL_TYPES.length];
        const obstacle = new Obstacle(new Vector3(0, 0, 0), type);
        materials.add(childMaterial(obstacle));
      }
      // BOUNDED: one cached material per type.
      expect(materials.size).toBe(ALL_TYPES.length);
    });

    it('should give obstacles of the same type the identical material instance', () => {
      const a = new Obstacle(new Vector3(0, 0, 0), 'spike');
      const b = new Obstacle(new Vector3(9, 0, 0), 'spike');
      expect(childMaterial(a)).toBe(childMaterial(b));
    });

    it('should give obstacles of different types distinct material instances', () => {
      const a = new Obstacle(new Vector3(0, 0, 0), 'block');
      const b = new Obstacle(new Vector3(0, 0, 0), 'spike');
      expect(childMaterial(a)).not.toBe(childMaterial(b));
    });
  });

  describe('dispose() — frees instance-owned resources only', () => {
    it('should exist as a method', () => {
      const obstacle = new Obstacle(new Vector3(0, 0, 0));
      expect(typeof (obstacle as Obstacle & { dispose?: unknown }).dispose).toBe('function');
    });

    it('should NOT destroy shared geometry or material when a shared obstacle is disposed', () => {
      const a = new Obstacle(new Vector3(0, 0, 0));
      const geo = childGeometry(a);
      const mat = childMaterial(a);
      const geoDispose = vi.spyOn(geo, 'dispose');
      const matDispose = vi.spyOn(mat, 'dispose');

      (a as Obstacle & { dispose(): void }).dispose();

      // Shared resources must survive — other obstacles still use them.
      expect(geoDispose).not.toHaveBeenCalled();
      expect(matDispose).not.toHaveBeenCalled();

      const b = new Obstacle(new Vector3(0, 0, 0));
      expect(childGeometry(b)).toBe(geo); // cache still intact after dispose
      expect(childMaterial(b)).toBe(mat);
    });
  });

  describe('No memory leak after 100 spawn/despawn cycles', () => {
    it('should keep distinct live geometries + materials constant across 100 cycles', () => {
      const geos = new Set<BoxGeometry>();
      const mats = new Set<MeshStandardMaterial>();
      const geoDisposeSpies = new Map<BoxGeometry, { mock: { calls: unknown[][] } }>();
      const matDisposeSpies = new Map<MeshStandardMaterial, { mock: { calls: unknown[][] } }>();

      for (let cycle = 0; cycle < 100; cycle++) {
        const type = ALL_TYPES[cycle % ALL_TYPES.length];
        const obstacle = new Obstacle(new Vector3(0, 0, 0), type);
        const geo = childGeometry(obstacle);
        const mat = childMaterial(obstacle);
        if (!geoDisposeSpies.has(geo)) {
          geoDisposeSpies.set(geo, vi.spyOn(geo, 'dispose'));
        }
        if (!matDisposeSpies.has(mat)) {
          matDisposeSpies.set(mat, vi.spyOn(mat, 'dispose'));
        }
        geos.add(geo);
        mats.add(mat);
        (obstacle as Obstacle & { dispose(): void }).dispose();
      }

      // Bounded: 1 default-size geometry + 5 materials, no growth with N cycles.
      expect(geos.size).toBe(1);
      expect(mats.size).toBe(ALL_TYPES.length);
      // No shared resource was destroyed by any of the 100 dispose() calls.
      for (const [geo, spy] of geoDisposeSpies) {
        expect(spy.mock.calls.length, `shared geometry must never be disposed`).toBe(0);
      }
      for (const [mat, spy] of matDisposeSpies) {
        expect(spy.mock.calls.length, `shared material must never be disposed`).toBe(0);
      }
    });

    it('should allow re-spawn to reuse shared resources after disposal (pool-ready state)', () => {
      const first = new Obstacle(new Vector3(0, 0, 0), 'moving');
      const firstGeo = childGeometry(first);
      const firstMat = childMaterial(first);
      (first as Obstacle & { dispose(): void }).dispose();

      // Re-spawn: a new instance must resolve to the SAME shared resources.
      const second = new Obstacle(new Vector3(3, 1, -40), 'moving');
      expect(childGeometry(second)).toBe(firstGeo);
      expect(childMaterial(second)).toBe(firstMat);
      // And it must be fully usable (active, correct position, updates).
      expect(second.isObstacleActive()).toBe(true);
      expect(second.getMesh().position.x).toBe(3);
      expect(second.getMesh().position.z).toBe(-40);
      second.update(0.016); // must not throw
    });
  });

  describe('No crash at 500+ simultaneous obstacles', () => {
    it('should update 600 simultaneous obstacles for 10 frames without throwing', () => {
      const obstacles: Obstacle[] = [];
      for (let i = 0; i < 600; i++) {
        const type = ALL_TYPES[i % ALL_TYPES.length];
        obstacles.push(new Obstacle(new Vector3((i % 10) * 2 - 9, 1, -10 - i), type));
      }
      expect(() => {
        for (let frame = 0; frame < 10; frame++) {
          for (const obstacle of obstacles) {
            obstacle.update(0.016);
          }
        }
      }).not.toThrow();
      // All 600 remain active + individually reachable (graceful state, no dropouts).
      expect(obstacles.every((o) => o.isObstacleActive())).toBe(true);
    });

    it('should spawn + deactivate 500 breakable obstacles (collision path) without unbounded distinct resources', () => {
      const geos = new Set<BoxGeometry>();
      const obstacles: Obstacle[] = [];
      for (let i = 0; i < 500; i++) {
        const obstacle = new Obstacle(new Vector3(0, 1, -10 - i), 'breakable');
        obstacles.push(obstacle);
        geos.add(childGeometry(obstacle));
      }
      // Simulate the breakable collision path: deactivate all.
      for (const obstacle of obstacles) {
        obstacle.deactivate();
      }
      expect(obstacles.every((o) => !o.isObstacleActive())).toBe(true);
      expect(geos.size).toBe(1); // still a single shared geometry
    });
  });
});
