/**
 * T0.2.2 G2 alignment (2026-09-11) — asserts the CURRENT PhysicsSystem
 * public API (RED baseline HEAD 4edf450, src/systems/Physics.ts):
 *
 *   constructor(config: PhysicsConfig) — { gravity, worldScale,
 *     fixedTimeStep, maxSubSteps } (all four required at HEAD)
 *   update(deltaTime) / addBody(id, body) / removeBody(id)
 *   createBox / createSphere / createGround / applyForce / applyImpulse
 *   getBody(id) / getAllBodies() / cleanup()
 *
 * Changes from the pre-alignment version (12/12 RED + 12 afterEach hook
 * RED at T2, see tests/evidence/d02/T2-red-analysis.md §3.2):
 * 1. mockReset landmine: the vitest config sets `mockReset: true`, so
 *    `vi.resetAllMocks()` runs before EVERY test (runner onBeforeRunTask)
 *    and wipes every mockImplementation set in the vi.mock factory below.
 *    The old beforeEach then constructed the system against wiped (bare)
 *    mocks — `new CANNON.World()` returned undefined and the constructor
 *    threw "Cannot read properties of undefined (reading 'set')", which
 *    cascaded into the 12 afterEach `cleanup()` hook failures. beforeEach
 *    now re-applies the factory implementations before constructing
 *    (same pattern as tests/unit/game.test.ts, T0.2.2 G1).
 * 2. Mock defects in this file's own cannon-es factory (root-cause fixes;
 *    recorded in the G2 task result):
 *    - World lacked `defaultContactMaterial` — the constructor assigns
 *      `.friction` / `.restitution` on it (Physics.ts:19-20).
 *    - Body lacked `quaternion` (createGround calls
 *      `quaternion.setFromAxisAngle`, Physics.ts:105), lacked the
 *      `applyForce` / `applyImpulse` methods (Physics.ts:117,127), and
 *      dropped the `position` / `shape` passed in its options.
 *    - The config object is now a complete PhysicsConfig (old tests passed
 *      `{ gravity: -9.81 }` only; `fixedTimeStep`/`maxSubSteps` were
 *      undefined and would surface in the update assertions).
 * 3. Assertions now use the real signatures: addBody(id, body) is
 *    two-arg; removeBody(id) takes the id, not the body. The expected
 *    raycast / collision-event APIs do not exist on the class and are
 *    dropped (aspirational, not current behavior).
 * 4. afterEach cleanup() now runs on a real instance (the constructor can
 *    no longer throw under the repaired mocks); the guard keeps a future
 *    constructor regression visible as the test failure, not a hook
 *    failure on a never-created instance.
 * 5. Config mirrors the production defaults (src/index.ts:10-15):
 *    gravity 9.81 (GameConstants.GRAVITY), worldScale 1, fixedTimeStep
 *    1/60, maxSubSteps 3 — so the gravity assertion
 *    `set(0, -9.81, 0)` verifies the current sign convention
 *    (Physics.ts:18 negates the config magnitude).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PhysicsSystem } from '@/systems/Physics';
import { Logger } from '@/utils/Logger';
import * as CANNON from 'cannon-es';
import type { PhysicsConfig } from '@/types/GameTypes';

// ---------------------------------------------------------------------------
// Mock implementation shapes (`this`-style; see tests/unit/game.test.ts
// header notes 1 and 2).
// ---------------------------------------------------------------------------
function worldImpl(this: any) {
  this.addBody = vi.fn();
  this.removeBody = vi.fn();
  this.step = vi.fn();
  this.gravity = { set: vi.fn() };
  // defect fix: constructor assigns friction/restitution on it (Physics.ts:19-20)
  this.defaultContactMaterial = { friction: 0.3, restitution: 0.3 };
}

function bodyImpl(this: any, options: any = {}) {
  this.mass = options.mass ?? 0;
  // defect fix: preserve the position/shape the factory passes through
  this.position = options.position ?? { x: 0, y: 0, z: 0 };
  this.velocity = { x: 0, y: 0, z: 0 };
  this.angularVelocity = { x: 0, y: 0, z: 0 };
  // defect fix: createGround calls quaternion.setFromAxisAngle (Physics.ts:105)
  this.quaternion = { setFromAxisAngle: vi.fn() };
  this.type = options.type ?? 'dynamic';
  this.shape = options.shape ?? null;
  // defect fix: applyForce/applyImpulse call these (Physics.ts:117,127)
  this.applyForce = vi.fn();
  this.applyImpulse = vi.fn();
}

function vec3Impl(this: any, x = 0, y = 0, z = 0) {
  // W3-C.3b: PhysicsSystem now keeps pre-allocated scratch Vec3s
  // (forceScratch/impulseScratch) and calls .set() on them before passing
  // to body.applyForce/applyImpulse — the mock must support set() so the
  // pre-allocated vector path is exercised identically in tests.
  return { x, y, z, set: function (nx: number, ny: number, nz: number) { this.x = nx; this.y = ny; this.z = nz; return this; } };
}

vi.mock('@/utils/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

vi.mock('cannon-es', () => ({
  World: vi.fn().mockImplementation(worldImpl),
  Body: vi.fn().mockImplementation(bodyImpl),
  Vec3: vi.fn().mockImplementation(vec3Impl),
  Box: vi.fn().mockImplementation((halfExtents: any) => ({ halfExtents })),
  Sphere: vi.fn().mockImplementation((radius: number) => ({ radius })),
  Plane: vi.fn().mockImplementation(() => ({ normal: { x: 0, y: 1, z: 0 } }))
}));

// Mirrors the production default config (src/index.ts:10-15).
const config: PhysicsConfig = {
  gravity: 9.81,
  worldScale: 1,
  fixedTimeStep: 1 / 60,
  maxSubSteps: 3
};

/** Most recently constructed mock World instance (mock.instances is
 *  cleared before every test by mockReset + vi.clearAllMocks). */
function lastWorld(): any {
  const instances = (CANNON.World as any).mock.instances;
  return instances[instances.length - 1];
}

describe('PhysicsSystem Class - Retroactive Tests', () => {
  let physicsSystem: PhysicsSystem;

  beforeEach(() => {
    // vi.resetAllMocks() (config `mockReset: true`) has already run before
    // this hook — re-apply the factory implementations, then construct.
    vi.clearAllMocks();
    (CANNON.World as any).mockImplementation(worldImpl);
    (CANNON.Body as any).mockImplementation(bodyImpl);
    (CANNON.Vec3 as any).mockImplementation(vec3Impl);
    (CANNON.Box as any).mockImplementation((halfExtents: any) => ({ halfExtents }));
    (CANNON.Sphere as any).mockImplementation((radius: number) => ({ radius }));
    (CANNON.Plane as any).mockImplementation(() => ({ normal: { x: 0, y: 1, z: 0 } }));
    physicsSystem = new PhysicsSystem(config);
  });

  afterEach(() => {
    // Guard: a constructor regression must surface as the test failure,
    // not as an afterEach hook failure on a never-created instance.
    if (physicsSystem) {
      physicsSystem.cleanup();
    }
  });

  describe('Initialization', () => {
    it('should create PhysicsSystem instance', () => {
      expect(physicsSystem).toBeInstanceOf(PhysicsSystem);
    });

    it('should initialize physics world', () => {
      expect(CANNON.World as any).toHaveBeenCalledTimes(1);
      expect(lastWorld()).toBeDefined();
    });

    it('should set gravity from config', () => {
      // Physics.ts:18 — world.gravity.set(0, -config.gravity, 0)
      expect(lastWorld().gravity.set).toHaveBeenCalledWith(0, -9.81, 0);
    });

    it('should configure default contact material', () => {
      expect(lastWorld().defaultContactMaterial.friction).toBe(0.3);
      expect(lastWorld().defaultContactMaterial.restitution).toBe(0.3);
    });
  });

  describe('Body Management', () => {
    it('should add body to world', () => {
      const body = new (CANNON.Body as any)();
      physicsSystem.addBody('box1', body);
      expect(lastWorld().addBody).toHaveBeenCalledWith(body);
      expect(physicsSystem.getBody('box1')).toBe(body);
    });

    it('should remove body from world', () => {
      const body = new (CANNON.Body as any)();
      physicsSystem.addBody('box1', body);
      physicsSystem.removeBody('box1');
      expect(lastWorld().removeBody).toHaveBeenCalledWith(body);
      expect(physicsSystem.getBody('box1')).toBeUndefined();
    });

    it('should not throw when removing an unknown id', () => {
      expect(() => physicsSystem.removeBody('missing')).not.toThrow();
    });
  });

  describe('Collider Factories', () => {
    it('should create a static box body at the given position', () => {
      const body = physicsSystem.createBox('box', { x: 0, y: 1, z: 0 }, { x: 1, y: 2, z: 0.5 });
      expect(body.mass).toBe(0);
      expect(body.position.y).toBe(1);
      expect(body.shape.halfExtents.y).toBe(1); // half-extents = size / 2
      expect(physicsSystem.getBody('box')).toBe(body);
    });

    it('should honor explicit mass on createBox', () => {
      const body = physicsSystem.createBox('heavy', { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 }, 5);
      expect(body.mass).toBe(5);
    });

    it('should create a sphere body with radius and mass', () => {
      const body = physicsSystem.createSphere('ball', { x: 0, y: 2, z: 0 }, 0.5, 1);
      expect(body.mass).toBe(1);
      expect(body.shape.radius).toBe(0.5);
      expect(body.position.y).toBe(2);
      expect(physicsSystem.getBody('ball')).toBe(body);
    });

    it('should create a static ground plane', () => {
      const ground = physicsSystem.createGround();
      expect(ground.mass).toBe(0);
      expect(ground.quaternion.setFromAxisAngle).toHaveBeenCalled();
      expect(physicsSystem.getBody('ground')).toBe(ground);
    });

    it('should honor a custom id on createGround', () => {
      const floor = physicsSystem.createGround('floor');
      expect(physicsSystem.getBody('floor')).toBe(floor);
    });
  });

  describe('Physics Updates', () => {
    it('should step the world with fixedTimeStep and maxSubSteps', () => {
      physicsSystem.update(0.016);
      expect(lastWorld().step).toHaveBeenCalledWith(1 / 60, 0.016, 3);
    });

    it('should handle multiple updates', () => {
      physicsSystem.update(0.016);
      physicsSystem.update(0.016);
      physicsSystem.update(0.016);
      expect(lastWorld().step).toHaveBeenCalledTimes(3);
    });

    it('should handle variable deltaTime', () => {
      physicsSystem.update(0.008);
      physicsSystem.update(0.032);
      expect(lastWorld().step).toHaveBeenNthCalledWith(1, 1 / 60, 0.008, 3);
      expect(lastWorld().step).toHaveBeenNthCalledWith(2, 1 / 60, 0.032, 3);
    });

    it('should swallow physics step errors and log them', () => {
      lastWorld().step.mockImplementation(() => {
        throw new Error('boom');
      });
      expect(() => physicsSystem.update(0.016)).not.toThrow();
      expect(Logger.error).toHaveBeenCalledWith('Physics step error', expect.any(Error));
    });
  });

  describe('Forces and Impulses', () => {
    it('should apply force to a registered body', () => {
      const body = physicsSystem.createBox('box', { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 });
      physicsSystem.applyForce('box', { x: 0, y: 10, z: 0 });
      // W3-C.3b: force is applied via a pre-allocated scratch Vec3 (mutable,
      // has .set()), so assert on the numeric components, not object identity.
      const forceArg = body.applyForce.mock.calls[0][0];
      expect({ x: forceArg.x, y: forceArg.y, z: forceArg.z }).toEqual({ x: 0, y: 10, z: 0 });
      expect(body.applyForce.mock.calls[0][1]).toBe(body.position);
    });

    it('should apply impulse to a registered body', () => {
      const body = physicsSystem.createSphere('ball', { x: 0, y: 0, z: 0 }, 0.5, 1);
      physicsSystem.applyImpulse('ball', { x: 1, y: 2, z: 3 });
      // W3-C.3b: impulse is applied via a pre-allocated scratch Vec3 —
      // assert on the numeric components, not object identity.
      const impulseArg = body.applyImpulse.mock.calls[0][0];
      expect({ x: impulseArg.x, y: impulseArg.y, z: impulseArg.z }).toEqual({ x: 1, y: 2, z: 3 });
      expect(body.applyImpulse.mock.calls[0][1]).toBe(body.position);
    });

    it('should ignore force for an unknown id', () => {
      expect(() => physicsSystem.applyForce('missing', { x: 0, y: 1, z: 0 })).not.toThrow();
    });

    it('should ignore impulse for an unknown id', () => {
      expect(() => physicsSystem.applyImpulse('missing', { x: 0, y: 1, z: 0 })).not.toThrow();
    });
  });

  describe('Body Queries', () => {
    it('should return undefined for an unknown id', () => {
      expect(physicsSystem.getBody('nope')).toBeUndefined();
    });

    it('should return all bodies as a defensive copy', () => {
      physicsSystem.createBox('a', { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 });
      physicsSystem.createSphere('b', { x: 0, y: 0, z: 0 }, 0.5);
      const all = physicsSystem.getAllBodies();
      expect(all.size).toBe(2);
      all.delete('a');
      expect(physicsSystem.getBody('a')).toBeDefined(); // internal map untouched
    });
  });

  describe('Cleanup', () => {
    it('should cleanup physics system', () => {
      expect(() => physicsSystem.cleanup()).not.toThrow();
    });

    it('should remove all bodies on cleanup', () => {
      physicsSystem.createBox('box', { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 });
      physicsSystem.createSphere('ball', { x: 0, y: 0, z: 0 }, 0.5);
      physicsSystem.cleanup();
      expect(physicsSystem.getBody('box')).toBeUndefined();
      expect(physicsSystem.getBody('ball')).toBeUndefined();
      expect(physicsSystem.getAllBodies().size).toBe(0);
    });
  });
});
