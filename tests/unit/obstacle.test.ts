/**
 * T0.2.2 G2 alignment (2026-09-11) — asserts the CURRENT Obstacle public
 * API (RED baseline HEAD 4edf450, src/entities/Obstacle.ts):
 *
 *   constructor(position: Vector3, type: ObstacleType = 'block',
 *               size: Vector3 = new Vector3(1, 1, 1))
 *   update(deltaTime): void / deactivate(): void / reactivate(): void
 *   getMesh(): Group / getType(): ObstacleType / getDamage(): number /
 *   isObstacleActive(): boolean
 *
 * Changes from the pre-alignment version (19/19 RED at T2, see
 * tests/evidence/d02/T2-red-analysis.md §3.2):
 * - The constructor is positional (Vector3, ObstacleType, Vector3). The old
 *   tests passed a `{ type, position, size }` object, so `position.clone()`
 *   threw "position.clone is not a function" on the plain object in every
 *   test (the real three Vector3 does have .clone()).
 * - ObstacleType is 'block' | 'spike' | 'moving' | 'rotating' | 'breakable'
 *   — there is no 'static' value (block is the static/default kind).
 * - Removed assertions for APIs that do not exist on the class:
 *   getPosition(), isActive(), activate(), checkCollision(), destroy().
 * - Added coverage of the current public surface: per-type damage values,
 *   moving-obstacle position update (deterministic via performance.now
 *   spy), rotating-obstacle rotation, deactivate/reactivate visibility,
 *   no-op update while deactivated.
 * - 'three' is the real package under happy-dom (non-WebGL classes are
 *   constructible without a WebGL context; same strategy as
 *   tests/unit/player.test.ts). Only @/utils/Logger is mocked. The old
 *   `vi.mock('@/utils/Constants')` factory was dead — Obstacle does not
 *   import Constants — and is removed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Obstacle, type ObstacleType } from '@/entities/Obstacle';
import { Vector3, Group, Mesh } from 'three';

vi.mock('@/utils/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

describe('Obstacle Class - Retroactive Tests', () => {
  let obstacle: Obstacle;

  beforeEach(() => {
    obstacle = new Obstacle(new Vector3(0, 0, 0));
  });

  describe('Initialization', () => {
    it('should create Obstacle instance', () => {
      expect(obstacle).toBeInstanceOf(Obstacle);
    });

    it('should create obstacle at specified position', () => {
      const positioned = new Obstacle(new Vector3(10, 20, 30));
      const position = positioned.getMesh().position;
      expect(position.x).toBe(10);
      expect(position.y).toBe(20);
      expect(position.z).toBe(30);
    });

    it('should set obstacle type (default block)', () => {
      expect(obstacle.getType()).toBe('block');
    });

    it('should be active by default', () => {
      expect(obstacle.isObstacleActive()).toBe(true);
    });

    it('should build a unit-size box mesh by default', () => {
      const mesh = obstacle.getMesh();
      expect(mesh.children).toHaveLength(1);
      const child = mesh.children[0];
      expect(child).toBeInstanceOf(Mesh);
      expect(child.geometry.parameters.width).toBe(1);
      expect(child.geometry.parameters.height).toBe(1);
      expect(child.geometry.parameters.depth).toBe(1);
    });
  });

  describe('Obstacle Types', () => {
    const typeDamage: Array<[ObstacleType, number]> = [
      ['block', 10],
      ['spike', 25],
      ['moving', 15],
      ['rotating', 15],
      ['breakable', 5]
    ];

    it.each(typeDamage)('should support %s type', (type) => {
      const typed = new Obstacle(new Vector3(0, 0, 0), type);
      expect(typed.getType()).toBe(type);
    });

    it.each(typeDamage)('should assign damage %s to %s type', (type, damage) => {
      const typed = new Obstacle(new Vector3(0, 0, 0), type);
      expect(typed.getDamage()).toBe(damage);
    });
  });

  describe('Movement', () => {
    it('should update position for moving obstacles', () => {
      const nowSpy = vi.spyOn(performance, 'now');
      try {
        const moving = new Obstacle(new Vector3(0, 0, 0), 'moving');

        // movementSpeed = 2 -> offset = sin(now * 0.001 * 2) * 3
        nowSpy.mockReturnValue(0); // sin(0) = 0
        moving.update(0.016);
        expect(moving.getMesh().position.x).toBe(0);

        // at now * 0.002 = pi/2 the offset is +3
        nowSpy.mockReturnValue(Math.PI / 2 / 0.002);
        moving.update(0.016);
        expect(moving.getMesh().position.x).toBeCloseTo(3);
        // only x moves; y/z keep the original position
        expect(moving.getMesh().position.y).toBe(0);
        expect(moving.getMesh().position.z).toBe(0);
      } finally {
        nowSpy.mockRestore();
      }
    });

    it('should keep static obstacles at their original position', () => {
      const block = new Obstacle(new Vector3(1, 2, 3), 'block');
      block.update(0.016);
      const p = block.getMesh().position;
      expect(p.x).toBe(1);
      expect(p.y).toBe(2);
      expect(p.z).toBe(3);
    });

    it('should rotate rotating obstacles by rotationSpeed * deltaTime', () => {
      const rotating = new Obstacle(new Vector3(0, 0, 0), 'rotating');
      rotating.update(0.016);
      expect(rotating.getMesh().rotation.y).toBeCloseTo(0.016);
      rotating.update(0.016);
      expect(rotating.getMesh().rotation.y).toBeCloseTo(0.032);
    });

    it('should not update while deactivated', () => {
      const rotating = new Obstacle(new Vector3(0, 0, 0), 'rotating');
      rotating.deactivate();
      rotating.update(0.016);
      expect(rotating.getMesh().rotation.y).toBe(0);
      expect(rotating.isObstacleActive()).toBe(false);
    });
  });

  describe('State Management', () => {
    it('should deactivate obstacle', () => {
      obstacle.deactivate();
      expect(obstacle.isObstacleActive()).toBe(false);
      expect(obstacle.getMesh().visible).toBe(false);
    });

    it('should reactivate obstacle', () => {
      obstacle.deactivate();
      obstacle.reactivate();
      expect(obstacle.isObstacleActive()).toBe(true);
      expect(obstacle.getMesh().visible).toBe(true);
    });
  });

  describe('Getters', () => {
    it('should provide mesh access', () => {
      expect(obstacle.getMesh()).toBeInstanceOf(Group);
    });

    it('should provide type', () => {
      expect(typeof obstacle.getType()).toBe('string');
      expect(['block', 'spike', 'moving', 'rotating', 'breakable']).toContain(obstacle.getType());
    });

    it('should provide per-type damage', () => {
      expect(obstacle.getDamage()).toBe(10);
    });
  });
});
