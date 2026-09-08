/**
 * Mock Cannon-es for unit tests
 * Provides stub implementations of physics classes
 */

// Mock Vector3
export class Vec3 {
  x: number
  y: number
  z: number

  constructor(x = 0, y = 0, z = 0) {
    this.x = x
    this.y = y
    this.z = z
  }

  clone(): Vec3 {
    return new Vec3(this.x, this.y, this.z)
  }

  scale(scalar: number, out: Vec3 = new Vec3()): Vec3 {
    out.x = this.x * scalar
    out.y = this.y * scalar
    out.z = this.z * scalar
    return out
  }

  add(v: Vec3, out: Vec3 = new Vec3()): Vec3 {
    out.x = this.x + v.x
    out.y = this.y + v.y
    out.z = this.z + v.z
    return out
  }
}

// Mock Quaternion
export class Quaternion {
  x: number
  y: number
  z: number
  w: number

  constructor(x = 0, y = 0, z = 0, w = 1) {
    this.x = x
    this.y = y
    this.z = z
    this.w = w
  }
}

// Mock Body
export class Body {
  mass: number
  position: Vec3
  velocity: Vec3
  angularVelocity: Vec3
  quaternion: Quaternion
  fixedRotation: boolean
  type: string

  constructor(options: any = {}) {
    this.mass = options.mass ?? 0
    this.position = new Vec3()
    this.velocity = new Vec3()
    this.angularVelocity = new Vec3()
    this.quaternion = new Quaternion()
    this.fixedRotation = options.fixedRotation ?? false
    this.type = options.type ?? 'dynamic'
  }

  addShape(shape: any, offset?: Vec3, quaternion?: Quaternion): void {
    // Mock - no-op
  }

  updateMassProperties(): void {
    // Mock - no-op
  }
}

// Mock Shapes
export class Box {
  halfExtents: Vec3

  constructor(halfExtents: Vec3) {
    this.halfExtents = halfExtents
  }
}

export class Sphere {
  radius: number

  constructor(radius: number) {
    this.radius = radius
  }
}

export class Plane {
  normal: Vec3

  constructor() {
    this.normal = new Vec3(0, 1, 0)
  }
}

// Mock World
export class World {
  gravity: Vec3
  bodies: Body[] = []
  contacts: any[] = []

  constructor() {
    this.gravity = new Vec3(0, -9.82, 0)
  }

  addBody(body: Body): void {
    this.bodies.push(body)
  }

  removeBody(body: Body): void {
    const index = this.bodies.indexOf(body)
    if (index > -1) {
      this.bodies.splice(index, 1)
    }
  }

  step(deltaTime: number, timeSinceLastCalled?: number, maxSubSteps?: number): void {
    // Mock physics step - update positions
    for (const body of this.bodies) {
      if (body.mass > 0) {
        body.position.x += body.velocity.x * deltaTime
        body.position.y += body.velocity.y * deltaTime
        body.position.z += body.velocity.z * deltaTime
      }
    }
  }

  addContact(contact: any): void {
    this.contacts.push(contact)
  }
}

// Mock ContactEvent
export class ContactMaterial {
  friction: number
  restitution: number

  constructor(friction = 0.3, restitution = 0.3) {
    this.friction = friction
    this.restitution = restitution
  }
}
