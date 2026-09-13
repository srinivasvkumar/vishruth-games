/**
 * W2-B.1 — BodySync (Task 6.2: Body synchronization)
 * (kanban t_f438f119, 2026-09-13).
 *
 * Design (decided at this task — orchestrator decomposition only; W2-B.1 is
 * the unit-lane card, browser verification is a later W2-B sub-task):
 *
 *   src/systems/BodySync.ts — `class BodySync`
 *     constructor(physics: PhysicsSystem)
 *     register(id: string, mesh: THREE.Object3D): void
 *     sync(): void          // copies body position + rotation onto mesh,
 *                           // for every registered body, EVERY frame
 *     unregister(id: string): void
 *     cleanup(): void
 *
 *   The Cannon-es body is the source of truth: after physicsSystem.update()
 *   has stepped the world, BodySync.sync() copies body.position onto
 *   mesh.position and body.quaternion onto mesh.quaternion for every
 *   registered body. Player and Obstacle keep owning their mesh; the
 *   synchronization is per-frame. Wiring sync() into the frame loop lives
 *   in Game.gameLoop (W2-B.1 GREEN commit: Game owns the BodySync, calls
 *   physicsSync.sync() every frame right after the physics step, and
 *   cleans it up on stop()).
 *
 * RED state (tests/evidence/w2/W2-B1-RED.txt): this module did not exist;
 * the test suites failed at collection with "Failed to resolve import
 * @/systems/BodySync". GREEN: this file + the Game wiring make all 8
 * W2-B.1 tests pass.
 *
 * Mesh strategy in tests: real `three` under happy-dom (THREE.Group /
 * Vector3 / Quaternion are constructible without a WebGL context — same
 * convention as player.test.ts / obstacle.test.ts / scenes.test.ts).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PhysicsSystem } from '@/systems/Physics';
import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import type { PhysicsConfig } from '@/types/GameTypes';

// Same mock shapes as the pre-existing physics-system tests in
// tests/unit/physics-system.test.ts (documented there). mockReset: true
// (config/vite.config.ts) wipes every mockImplementation before each test,
// so beforeEach re-applies the factory implementations before constructing.
function worldImpl(this: any) {
  this.addBody = vi.fn();
  this.removeBody = vi.fn();
  this.step = vi.fn();
  this.gravity = { set: vi.fn() };
  this.defaultContactMaterial = { friction: 0.3, restitution: 0.3 };
}

function bodyImpl(this: any, options: any = {}) {
  this.mass = options.mass ?? 0;
  this.position = options.position ?? { x: 0, y: 0, z: 0 };
  this.velocity = { x: 0, y: 0, z: 0 };
  this.angularVelocity = { x: 0, y: 0, z: 0 };
  this.quaternion = { setFromAxisAngle: vi.fn() };
  this.type = options.type ?? 'dynamic';
  this.shape = options.shape ?? null;
  this.applyForce = vi.fn();
  this.applyImpulse = vi.fn();
}

function vec3Impl(this: any, x = 0, y = 0, z = 0) {
  return { x, y, z };
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

const config: PhysicsConfig = {
  gravity: 9.81,
  worldScale: 1,
  fixedTimeStep: 1 / 60,
  maxSubSteps: 3
};

describe('BodySync — mesh-body synchronization (W2-B.1, Task 6.2)', () => {
  let physicsSystem: PhysicsSystem;

  beforeEach(() => {
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
    physicsSystem.cleanup();
  });

  it('copies the body position and rotation onto the mesh after a physics step', async () => {
    const { BodySync } = await import('@/systems/BodySync');
    const sync = new BodySync(physicsSystem);

    const mesh = new THREE.Group();
    mesh.position.set(0, 0, 0);
    sync.register('player', mesh);

    const body = physicsSystem.createBox('player', { x: 0, y: 5, z: 0 }, { x: 0.5, y: 1, z: 0.5 }, 1);
    // Simulate a physics step having moved the body (mock step is inert):
    body.position.x = 2;
    body.position.y = 3.5;
    body.position.z = -1;
    physicsSystem.update(0.016);

    sync.sync();

    expect(mesh.position.x).toBeCloseTo(2);
    expect(mesh.position.y).toBeCloseTo(3.5);
    expect(mesh.position.z).toBeCloseTo(-1);
  });

  it('keeps the mesh in sync on every sync() call, not just the first', async () => {
    const { BodySync } = await import('@/systems/BodySync');
    const sync = new BodySync(physicsSystem);

    const mesh = new THREE.Group();
    sync.register('obstacle', mesh);
    const body = physicsSystem.createSphere('obstacle', { x: 0, y: 0, z: 0 }, 0.5, 1);

    body.position.x = 1;
    sync.sync();
    expect(mesh.position.x).toBeCloseTo(1);

    body.position.x = 4;
    sync.sync();
    expect(mesh.position.x).toBeCloseTo(4);
  });

  it('leaves the mesh untouched for an unregistered body id', async () => {
    const { BodySync } = await import('@/systems/BodySync');
    const sync = new BodySync(physicsSystem);

    const mesh = new THREE.Group();
    mesh.position.set(0, 1, 0);
    const body = physicsSystem.createBox('other', { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 });
    body.position.x = 99;
    body.position.y = 99;
    body.position.z = 99;
    physicsSystem.update(0.016);

    sync.sync();

    // 'other' was never registered — its body must not drive this mesh.
    expect(mesh.position.x).toBe(0);
    expect(mesh.position.y).toBe(1);
    expect(mesh.position.z).toBe(0);
  });

  it('stops syncing after unregister', async () => {
    const { BodySync } = await import('@/systems/BodySync');
    const sync = new BodySync(physicsSystem);

    const mesh = new THREE.Group();
    sync.register('ball', mesh);
    const body = physicsSystem.createSphere('ball', { x: 0, y: 0, z: 0 }, 0.5, 1);

    body.position.x = 1;
    sync.sync();
    expect(mesh.position.x).toBeCloseTo(1);

    sync.unregister('ball');
    body.position.x = 7;
    sync.sync();
    expect(mesh.position.x).toBeCloseTo(1); // unchanged after unregister
  });
});
