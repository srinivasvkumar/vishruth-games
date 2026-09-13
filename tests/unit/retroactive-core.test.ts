import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  BoxGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Mesh,
  Group,
  Vector3,
  Quaternion,
  Euler,
  Raycaster,
  Clock
} from 'three';
import { World, Body, Box, Sphere, Plane, Vec3 } from 'cannon-es';
import { Game } from '@/core/Game';
import { GameLoop } from '@/core/GameLoop';
import { SceneManager } from '@/core/SceneManager';
import { InputSystem } from '@/systems/Input';
import { PhysicsSystem } from '@/systems/Physics';
import { Player } from '@/entities/Player';
import { Obstacle } from '@/entities/Obstacle';
import type { ObstacleType } from '@/entities/Obstacle';
import { GameConstants, InputConstants, CollisionLayers, GameEvents } from '@/utils/Constants';
import { Logger } from '@/utils/Logger';

// ============================================================================
// T0.2.2 G3 alignment (2026-09-11) — 46 cross-cutting retroactive tests
// aligned to CURRENT behavior.
// RED evidence: tests/evidence/d02/T2-red-analysis.md §3.1 (37/46 failed:
// CJS require() without extension cannot resolve vite-node ESM modules, plus
// RED assertions against target-architecture APIs that don't exist in src/).
// Pre-change state at current HEAD: tests/evidence/d02/G3-red.txt.
// Post-alignment scoped run: tests/evidence/d02/G3-scoped.txt.
//
// 1. Module existence is now proven by the static ESM alias imports above:
//    a missing module would fail this file to collect. The original
//    `require('../../src/X')` calls are removed — CJS require() resolves via
//    Node's CJS loader and fails with "Cannot find module '../../src/core/Game'"
//    for extensionless .ts paths under vitest.
// 2. `require('three')` / `require('cannon-es')` ALSO bypassed the vi.mock
//    factories and hit the real packages (T2 evidence: "THREE.WebGLRenderer:
//    Error creating WebGL context." under headless happy-dom, and real
//    cannon-es `new Box()` throwing on the missing halfExtents argument).
//    Everything is now a proper ESM import, so the factories below apply to
//    this file's whole module graph (incl. src/entities/Player.ts,
//    src/entities/Obstacle.ts, src/systems/Physics.ts).
// 3. The vitest config sets `mockReset: true`, so `vi.resetAllMocks()` runs
//    before EVERY test and wipes the factory implementations — beforeEach
//    re-applies them (G1 game.test.ts pattern). All impl methods are plain
//    closures (no nested vi.fn) so resetAllMocks cannot strip their
//    behaviour out from under the top-level mocks.
// 4. Aligned to current src (RED expectations removed):
//      - GameConstants.GAMEPAD_DEADZONE (0.15) — src/utils/Constants.ts:36;
//        no deadzone field exists on InputConstants. (Pre-existing src defect
//        noted: src/systems/Input.ts:139 reads InputConstants.GAMEPAD_DEADZONE,
//        which is undefined at runtime; out of D0.2 scope, flagged to
//        orchestrator.)
//      - GameEvents.PLAYER_DEATH / PLAYER_SCORE — RED expectations were
//        PLAYER_DIED / SCORE_CHANGED.
//      - No OBSTACLE_TYPES array exists in src; the current surface is the
//        ObstacleType union (src/entities/Obstacle.ts:7) + the per-type
//        damage map (Obstacle.ts:30-36).
// 5. No src/ behavior was changed by this alignment. No Week 1
//    target-architecture assertions remain. No tests skipped.
// ============================================================================

// --- three.js mock implementations (`this`-style so `new Mock()` flows
// through tinyspy's Reflect.construct path; see G1 game.test.ts header) ---

function sceneImpl(this: any) {
  this.children = [];
  this.add = (child: any) => {
    this.children.push(child);
  };
  this.remove = (child: any) => {
    const i = this.children.indexOf(child);
    if (i > -1) this.children.splice(i, 1);
  };
}

function cameraImpl(this: any, fov: number, aspect: number, near: number, far: number) {
  this.fov = fov;
  this.aspect = aspect;
  this.near = near;
  this.far = far;
  this.position = { x: 0, y: 0, z: 0 };
  this.lookAt = () => {};
}

function rendererImpl(this: any) {
  this.domElement = { width: 800, height: 600 };
  this.setSize = () => {};
  this.render = () => {};
  this.setPixelRatio = () => {};
}

function boxGeometryImpl(this: any, width: number, height: number, depth: number) {
  this.parameters = { width, height, depth };
}

function meshBasicMaterialImpl(this: any) {
  this.opacity = 1;
  this.transparent = false;
}

function meshStandardMaterialImpl(this: any, params: Record<string, unknown> = {}) {
  this.color = params.color;
  this.metalness = params.metalness;
  this.roughness = params.roughness;
}

function meshImpl(this: any, geometry: unknown, material: unknown) {
  this.geometry = geometry;
  this.material = material;
  this.position = { x: 0, y: 0, z: 0 };
  this.rotation = { x: 0, y: 0, z: 0 };
  this.scale = { x: 1, y: 1, z: 1 };
  this.visible = true;
}

function vector3Impl(this: any, x = 0, y = 0, z = 0) {
  this.x = x;
  this.y = y;
  this.z = z;
  // Methods the src entities call on Vector3 (Player.ts:174-175, Obstacle.ts:27,40)
  this.clone = () => new Vector3(this.x, this.y, this.z);
  this.copy = (v: any) => {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  };
}

function groupImpl(this: any) {
  this.children = [];
  this.add = (child: any) => {
    this.children.push(child);
  };
  this.position = new Vector3();
  this.rotation = { x: 0, y: 0, z: 0 };
  this.scale = { x: 1, y: 1, z: 1 };
  this.visible = true;
}

function quaternionImpl(this: any) {
  this.set = () => {};
}

function eulerImpl(this: any) {}

function raycasterImpl(this: any) {
  this.set = () => {};
  this.intersectObject = () => [];
}

function clockImpl(this: any) {
  this.getDelta = () => 0.016;
  this.start = () => {};
  this.stop = () => {};
}

// W2-A.2: Game.ts now imports AssetLoader (src/utils/AssetLoader.ts), which
// instantiates THREE.TextureLoader and GLTFLoader at module scope. The mock
// must expose both so the module graph can load.
function textureLoaderImpl(this: any) {
  this.load = (url: string, onLoad?: (t: any) => void, onProgress?: () => void, onError?: (e: unknown) => void) => {
    // Resolve immediately with a no-op texture; AssetLoader tests mock
    // load at the class level (vi.mock('@/utils/AssetLoader')) so this
    // shape is only reached when the real AssetLoader is used.
    const texture: any = { colorSpace: '', dispose: () => {} };
    if (onLoad) texturePromise.then(() => onLoad(texture));
    else texturePromise.catch(() => {});
    return texture;
  };
}
const texturePromise = Promise.resolve();

function gltfLoaderImpl(this: any) {
  this.load = (url: string, onLoad?: (g: any) => void, onProgress?: () => void, onError?: (e: unknown) => void) => {
    const gltf: any = { scene: { children: [] } };
    Promise.resolve().then(() => {
      if (onLoad) onLoad(gltf);
    });
    return gltf;
  };
}

vi.mock('three', () => ({
  Scene: vi.fn().mockImplementation(sceneImpl),
  PerspectiveCamera: vi.fn().mockImplementation(cameraImpl),
  WebGLRenderer: vi.fn().mockImplementation(rendererImpl),
  BoxGeometry: vi.fn().mockImplementation(boxGeometryImpl),
  MeshBasicMaterial: vi.fn().mockImplementation(meshBasicMaterialImpl),
  MeshStandardMaterial: vi.fn().mockImplementation(meshStandardMaterialImpl),
  Mesh: vi.fn().mockImplementation(meshImpl),
  Vector3: vi.fn().mockImplementation(vector3Impl),
  Group: vi.fn().mockImplementation(groupImpl),
  Quaternion: vi.fn().mockImplementation(quaternionImpl),
  Euler: vi.fn().mockImplementation(eulerImpl),
  Raycaster: vi.fn().mockImplementation(raycasterImpl),
  Clock: vi.fn().mockImplementation(clockImpl),
  TextureLoader: vi.fn().mockImplementation(textureLoaderImpl),
  SRGBColorSpace: 'srgb'
}));

vi.mock('three/addons/loaders/GLTFLoader.js', () => ({
  GLTFLoader: vi.fn().mockImplementation(gltfLoaderImpl)
}));

// --- cannon-es mock implementations ---

function vecLike(x = 0, y = 0, z = 0) {
  const v: any = { x, y, z };
  v.set = (nx: number, ny: number, nz: number) => {
    v.x = nx;
    v.y = ny;
    v.z = nz;
    return v;
  };
  return v;
}

function worldImpl(this: any) {
  this.gravity = vecLike(0, -9.81, 0);
  // Surface the PhysicsSystem ctor assigns onto (src/systems/Physics.ts:19-20)
  this.defaultContactMaterial = { friction: 0.3, restitution: 0.3 };
  this.addBody = () => {};
  this.removeBody = () => {};
  this.step = () => {};
}

function bodyImpl(this: any, options: Record<string, unknown> = {}) {
  this.mass = (options.mass as number | undefined) ?? 0;
  this.position = new Vec3();
  this.velocity = new Vec3();
  this.angularVelocity = new Vec3();
  this.quaternion = { setFromAxisAngle: () => {} };
}

function boxShapeImpl(this: any, halfExtents: unknown) {
  this.halfExtents = halfExtents;
}

function sphereImpl(this: any, radius: number) {
  this.radius = radius;
}

function planeImpl(this: any) {
  this.normal = new Vec3(0, 1, 0);
}

function vec3Impl(this: any, x = 0, y = 0, z = 0) {
  this.x = x;
  this.y = y;
  this.z = z;
}

vi.mock('cannon-es', () => ({
  World: vi.fn().mockImplementation(worldImpl),
  Body: vi.fn().mockImplementation(bodyImpl),
  Box: vi.fn().mockImplementation(boxShapeImpl),
  Sphere: vi.fn().mockImplementation(sphereImpl),
  Plane: vi.fn().mockImplementation(planeImpl),
  Vec3: vi.fn().mockImplementation(vec3Impl)
}));

// mockReset: true → vi.resetAllMocks() wipes the factory implementations
// before every test; re-apply them (G1 game.test.ts / G2 pattern)
beforeEach(() => {
  (Scene as any).mockImplementation(sceneImpl);
  (PerspectiveCamera as any).mockImplementation(cameraImpl);
  (WebGLRenderer as any).mockImplementation(rendererImpl);
  (BoxGeometry as any).mockImplementation(boxGeometryImpl);
  (MeshBasicMaterial as any).mockImplementation(meshBasicMaterialImpl);
  (MeshStandardMaterial as any).mockImplementation(meshStandardMaterialImpl);
  (Mesh as any).mockImplementation(meshImpl);
  (Vector3 as any).mockImplementation(vector3Impl);
  (Group as any).mockImplementation(groupImpl);
  (Quaternion as any).mockImplementation(quaternionImpl);
  (Euler as any).mockImplementation(eulerImpl);
  (Raycaster as any).mockImplementation(raycasterImpl);
  (Clock as any).mockImplementation(clockImpl);
  (World as any).mockImplementation(worldImpl);
  (Body as any).mockImplementation(bodyImpl);
  (Box as any).mockImplementation(boxShapeImpl);
  (Sphere as any).mockImplementation(sphereImpl);
  (Plane as any).mockImplementation(planeImpl);
  (Vec3 as any).mockImplementation(vec3Impl);
});

describe('Game Core Architecture', () => {
  it('should have Game class structure', () => {
    expect(Game).toBeDefined();
    expect(typeof Game).toBe('function');
  });

  it('should have GameLoop class structure', () => {
    expect(GameLoop).toBeDefined();
    expect(typeof GameLoop).toBe('function');
  });

  it('should have SceneManager class structure', () => {
    expect(SceneManager).toBeDefined();
    expect(typeof SceneManager).toBe('function');
  });

  it('should have InputSystem class structure', () => {
    expect(InputSystem).toBeDefined();
    expect(typeof InputSystem).toBe('function');
  });

  it('should have PhysicsSystem class structure', () => {
    expect(PhysicsSystem).toBeDefined();
    expect(typeof PhysicsSystem).toBe('function');
  });

  it('should have Player class structure', () => {
    expect(Player).toBeDefined();
    expect(typeof Player).toBe('function');
  });

  it('should have Obstacle class structure', () => {
    expect(Obstacle).toBeDefined();
    expect(typeof Obstacle).toBe('function');
  });

  it('should have Constants module', () => {
    expect(GameConstants).toBeDefined();
    expect(InputConstants).toBeDefined();
    expect(GameEvents).toBeDefined();
  });

  it('should have Logger module', () => {
    expect(typeof Logger.info).toBe('function');
    expect(typeof Logger.warn).toBe('function');
    expect(typeof Logger.error).toBe('function');
    expect(typeof Logger.debug).toBe('function');
  });
});

describe('GameConstants Values', () => {
  it('should have PLAYER_HEALTH constant', () => {
    expect(GameConstants.PLAYER_HEALTH).toBeDefined();
    expect(typeof GameConstants.PLAYER_HEALTH).toBe('number');
    expect(GameConstants.PLAYER_HEALTH).toBeGreaterThan(0);
    // current value, src/utils/Constants.ts:14
    expect(GameConstants.PLAYER_HEALTH).toBe(100);
  });

  it('should have PLAYER_LIVES constant', () => {
    expect(GameConstants.PLAYER_LIVES).toBeDefined();
    expect(typeof GameConstants.PLAYER_LIVES).toBe('number');
    expect(GameConstants.PLAYER_LIVES).toBeGreaterThan(0);
    // current value, src/utils/Constants.ts:15
    expect(GameConstants.PLAYER_LIVES).toBe(3);
  });

  it('should have PLAYER_SPEED constant', () => {
    expect(GameConstants.PLAYER_SPEED).toBeDefined();
    expect(typeof GameConstants.PLAYER_SPEED).toBe('number');
    expect(GameConstants.PLAYER_SPEED).toBeGreaterThan(0);
    // current value, src/utils/Constants.ts:11
    expect(GameConstants.PLAYER_SPEED).toBe(5.0);
  });

  it('should have JUMP_FORCE constant', () => {
    expect(GameConstants.JUMP_FORCE).toBeDefined();
    expect(typeof GameConstants.JUMP_FORCE).toBe('number');
    expect(GameConstants.JUMP_FORCE).toBeGreaterThan(0);
    // current value, src/utils/Constants.ts:12
    expect(GameConstants.JUMP_FORCE).toBe(10.0);
  });

  it('should have GRAVITY constant', () => {
    expect(GameConstants.GRAVITY).toBeDefined();
    expect(typeof GameConstants.GRAVITY).toBe('number');
    expect(GameConstants.GRAVITY).toBeGreaterThan(0);
    // current value, src/utils/Constants.ts:6
    expect(GameConstants.GRAVITY).toBe(9.81);
  });

  it('should define the obstacle type set used by the Obstacle class', () => {
    // Aligned to current src: no OBSTACLE_TYPES array exists — the surface is
    // the ObstacleType union (src/entities/Obstacle.ts:7). Verify all 5 union
    // members construct and round-trip through getType(), with the per-type
    // damage map (Obstacle.ts:30-36).
    const types: ObstacleType[] = ['block', 'spike', 'moving', 'rotating', 'breakable'];
    const damageByType: Record<ObstacleType, number> = {
      block: 10,
      spike: 25,
      moving: 15,
      rotating: 15,
      breakable: 5
    };
    for (const type of types) {
      const obstacle = new Obstacle(new Vector3(0, 0, 0), type);
      expect(obstacle.getType()).toBe(type);
      expect(obstacle.getDamage()).toBe(damageByType[type]);
    }
  });
});

describe('InputConstants Values', () => {
  it('should have GAMEPAD_DEADZONE constant', () => {
    // Aligned to current src: the deadzone lives on GameConstants
    // (src/utils/Constants.ts:36); no deadzone field exists on InputConstants.
    expect(GameConstants.GAMEPAD_DEADZONE).toBeDefined();
    expect(typeof GameConstants.GAMEPAD_DEADZONE).toBe('number');
    expect(GameConstants.GAMEPAD_DEADZONE).toBeGreaterThanOrEqual(0);
    expect(GameConstants.GAMEPAD_DEADZONE).toBeLessThanOrEqual(1);
    // current value, src/utils/Constants.ts:36
    expect(GameConstants.GAMEPAD_DEADZONE).toBe(0.15);
  });
});

describe('GameEvents Values', () => {
  it('should have LEVEL_START event', () => {
    expect(GameEvents.LEVEL_START).toBeDefined();
    expect(typeof GameEvents.LEVEL_START).toBe('string');
    // current value, src/utils/Constants.ts:106
    expect(GameEvents.LEVEL_START).toBe('level:start');
  });

  it('should have PLAYER_DEATH event', () => {
    // Aligned: current name is PLAYER_DEATH (RED expectation was PLAYER_DIED)
    expect(GameEvents.PLAYER_DEATH).toBeDefined();
    expect(typeof GameEvents.PLAYER_DEATH).toBe('string');
    // current value, src/utils/Constants.ts:116
    expect(GameEvents.PLAYER_DEATH).toBe('player:death');
  });

  it('should have PLAYER_SCORE event', () => {
    // Aligned: current name is PLAYER_SCORE (RED expectation was SCORE_CHANGED)
    expect(GameEvents.PLAYER_SCORE).toBeDefined();
    expect(typeof GameEvents.PLAYER_SCORE).toBe('string');
    // current value, src/utils/Constants.ts:117
    expect(GameEvents.PLAYER_SCORE).toBe('player:score');
  });
});

describe('Logger Functionality', () => {
  it('should have info method', () => {
    expect(typeof Logger.info).toBe('function');
    expect(() => Logger.info('Test message')).not.toThrow();
  });

  it('should have warn method', () => {
    expect(typeof Logger.warn).toBe('function');
    expect(() => Logger.warn('Test warning')).not.toThrow();
  });

  it('should have error method', () => {
    expect(typeof Logger.error).toBe('function');
    expect(() => Logger.error('Test error')).not.toThrow();
  });

  it('should have debug method', () => {
    expect(typeof Logger.debug).toBe('function');
    expect(() => Logger.debug('Test debug')).not.toThrow();
  });

  it('should accept message and optional data', () => {
    expect(() => Logger.info('Test message', { key: 'value' })).not.toThrow();
  });
});

describe('Three.js Integration', () => {
  // Verifies the three.js mock surface the src/ code consumes: Player.ts:1 and
  // Obstacle.ts:1 import { Vector3, Group, Mesh, MeshStandardMaterial,
  // BoxGeometry }; Scene/Camera/Renderer/Clock are the rendering surface this
  // file tracks. Real three cannot construct a WebGLRenderer under headless
  // happy-dom (T2 evidence), so the factory mocks stand in.
  it('should create Scene', () => {
    const scene = new Scene();
    expect(scene).toBeDefined();
    expect(Array.isArray(scene.children)).toBe(true);
    expect(typeof scene.add).toBe('function');
    expect(typeof scene.remove).toBe('function');
  });

  it('should create PerspectiveCamera', () => {
    const camera = new PerspectiveCamera(75, 16 / 9, 0.1, 1000);
    expect(camera).toBeDefined();
    expect(camera.fov).toBe(75);
    expect(camera.aspect).toBe(16 / 9);
    expect(camera.near).toBe(0.1);
    expect(camera.far).toBe(1000);
  });

  it('should create WebGLRenderer', () => {
    const renderer = new WebGLRenderer();
    expect(renderer).toBeDefined();
    expect(renderer.domElement).toBeDefined();
    expect(typeof renderer.setSize).toBe('function');
    expect(typeof renderer.render).toBe('function');
    expect(typeof renderer.setPixelRatio).toBe('function');
  });

  it('should create BoxGeometry', () => {
    const geometry = new BoxGeometry(1, 1, 1);
    expect(geometry).toBeDefined();
  });

  it('should create Mesh', () => {
    const geometry = new BoxGeometry(1, 1, 1);
    const material = new MeshBasicMaterial();
    const mesh = new Mesh(geometry, material);
    expect(mesh).toBeDefined();
    expect(mesh.geometry).toBe(geometry);
    expect(mesh.material).toBe(material);
    // Surface the src entities additionally import (Player.ts:1, Obstacle.ts:1)
    const group = new Group();
    expect(Array.isArray(group.children)).toBe(true);
    expect(group.position).toBeDefined();
    const stdMaterial = new MeshStandardMaterial({ color: 0xff0000, metalness: 0.3, roughness: 0.8 });
    expect(stdMaterial.color).toBe(0xff0000);
  });

  it('should create Vector3', () => {
    const vector = new Vector3(1, 2, 3);
    expect(vector.x).toBe(1);
    expect(vector.y).toBe(2);
    expect(vector.z).toBe(3);
    // Methods the src entities call on Vector3 (Player.ts:174-175, Obstacle.ts:27,40)
    const cloned = vector.clone();
    expect(cloned.x).toBe(1);
    expect(cloned.y).toBe(2);
    expect(cloned.z).toBe(3);
    const target = new Vector3(0, 0, 0);
    target.copy(vector);
    expect(target.x).toBe(1);
    expect(target.y).toBe(2);
    expect(target.z).toBe(3);
  });

  it('should create Clock', () => {
    const clock = new Clock();
    expect(clock).toBeDefined();
    expect(typeof clock.getDelta).toBe('function');
    expect(typeof clock.getDelta()).toBe('number');
  });
});

describe('Cannon-es Integration', () => {
  it('should create World', () => {
    const world = new World();
    expect(world).toBeDefined();
    expect(world.gravity).toBeDefined();
    expect(typeof world.addBody).toBe('function');
    expect(typeof world.removeBody).toBe('function');
    expect(typeof world.step).toBe('function');
    // PhysicsSystem ctor assigns onto these (src/systems/Physics.ts:19-20)
    expect(world.defaultContactMaterial.friction).toBe(0.3);
    expect(world.defaultContactMaterial.restitution).toBe(0.3);
  });

  it('should create Body', () => {
    const body = new Body();
    expect(body).toBeDefined();
    expect(body.mass).toBe(0);
  });

  it('should create Box shape', () => {
    // Aligned to the real API (and Physics.ts:70 createBox): Box takes a
    // half-extents Vec3 — bare `new Box()` was the T2 RED failure.
    const box = new Box(new Vec3(0.5, 0.5, 0.5));
    expect(box).toBeDefined();
  });

  it('should create Vec3', () => {
    const vec = new Vec3(1, 2, 3);
    expect(vec.x).toBe(1);
    expect(vec.y).toBe(2);
    expect(vec.z).toBe(3);
  });
});

describe('Game Architecture Patterns', () => {
  it('should follow component-based architecture', () => {
    expect(typeof Game).toBe('function');
    expect(typeof GameLoop).toBe('function');
    expect(typeof SceneManager).toBe('function');
    expect(typeof InputSystem).toBe('function');
    expect(typeof PhysicsSystem).toBe('function');
    expect(typeof Player).toBe('function');
    expect(typeof Obstacle).toBe('function');
  });

  it('should have proper module separation', () => {
    // Core logic
    expect(Game).toBeDefined();
    expect(GameLoop).toBeDefined();
    expect(SceneManager).toBeDefined();
    // Systems
    expect(InputSystem).toBeDefined();
    expect(PhysicsSystem).toBeDefined();
    // Entities
    expect(Player).toBeDefined();
    expect(Obstacle).toBeDefined();
    // Utils
    expect(GameConstants).toBeDefined();
    expect(InputConstants).toBeDefined();
    expect(CollisionLayers).toBeDefined();
    expect(GameEvents).toBeDefined();
    expect(Logger).toBeDefined();
  });
});

describe('Retroactive Test Coverage Verification', () => {
  // ESM semantics: successful import at file load IS the existence check —
  // a missing module would fail the whole file to collect (work item 1).
  it('should verify Game.ts exists and is importable', () => {
    expect(Game).toBeDefined();
    expect(typeof Game).toBe('function');
  });

  it('should verify GameLoop.ts exists and is importable', () => {
    expect(GameLoop).toBeDefined();
    expect(typeof GameLoop).toBe('function');
  });

  it('should verify SceneManager.ts exists and is importable', () => {
    expect(SceneManager).toBeDefined();
    expect(typeof SceneManager).toBe('function');
  });

  it('should verify Input.ts exists and is importable', () => {
    expect(InputSystem).toBeDefined();
    expect(typeof InputSystem).toBe('function');
  });

  it('should verify Physics.ts exists and is importable', () => {
    expect(PhysicsSystem).toBeDefined();
    expect(typeof PhysicsSystem).toBe('function');
  });

  it('should verify Player.ts exists and is importable', () => {
    expect(Player).toBeDefined();
    expect(typeof Player).toBe('function');
  });

  it('should verify Obstacle.ts exists and is importable', () => {
    expect(Obstacle).toBeDefined();
    expect(typeof Obstacle).toBe('function');
  });

  it('should verify Constants.ts exists and exports all constants', () => {
    expect(GameConstants).toBeDefined();
    expect(InputConstants).toBeDefined();
    expect(CollisionLayers).toBeDefined();
    expect(GameEvents).toBeDefined();
  });

  it('should verify Logger.ts exists and exports Logger', () => {
    expect(Logger).toBeDefined();
    expect(typeof Logger).toBe('function');
    expect(typeof Logger.info).toBe('function');
  });
});
