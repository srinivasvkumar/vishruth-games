/**
 * Mock Three.js for unit tests
 * Provides stub implementations of Three.js classes
 */

// Mock Vector3
export class Vector3 {
  x: number
  y: number
  z: number

  constructor(x = 0, y = 0, z = 0) {
    this.x = x
    this.y = y
    this.z = z
  }

  clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z)
  }

  add(v: Vector3): Vector3 {
    this.x += v.x
    this.y += v.y
    this.z += v.z
    return this
  }

  multiplyScalar(scalar: number): Vector3 {
    this.x *= scalar
    this.y *= scalar
    this.z *= scalar
    return this
  }

  distanceTo(v: Vector3): number {
    return Math.sqrt(
      Math.pow(this.x - v.x, 2) +
      Math.pow(this.y - v.y, 2) +
      Math.pow(this.z - v.z, 2)
    )
  }

  normalize(): Vector3 {
    const len = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z)
    if (len > 0) {
      this.x /= len
      this.y /= len
      this.z /= len
    }
    return this
  }
}

// Mock Scene
export class Scene {
  children: any[] = []

  add(object: any): void {
    this.children.push(object)
  }

  remove(object: any): void {
    const index = this.children.indexOf(object)
    if (index > -1) {
      this.children.splice(index, 1)
    }
  }
}

// Mock Camera
export class PerspectiveCamera {
  fov: number
  aspect: number
  near: number
  far: number

  constructor(fov = 75, aspect = 16 / 9, near = 0.1, far = 1000) {
    this.fov = fov
    this.aspect = aspect
    this.near = near
    this.far = far
  }
}

// Mock Renderer
export class WebGLRenderer {
  domElement: HTMLCanvasElement
  private size: { width: number; height: number }

  constructor(parameters: { antialias?: boolean } = {}) {
    this.domElement = document.createElement('canvas')
    this.size = { width: 800, height: 600 }
  }

  setSize(width: number, height: number): void {
    this.size.width = width
    this.size.height = height
    this.domElement.width = width
    this.domElement.height = height
  }

  setPixelRatio(ratio: number): void {
    // Mock - no-op
  }

  render(scene: Scene, camera: PerspectiveCamera): void {
    // Mock - no-op
  }

  clear(): void {
    // Mock - no-op
  }
}

// Mock Geometry
export class BoxGeometry {
  constructor(width = 1, height = 1, depth = 1) {
    // Mock - no-op
  }
}

// Mock Material
export class MeshStandardMaterial {
  color: number

  constructor(parameters: { color?: number } = {}) {
    this.color = parameters.color ?? 0xffffff
  }
}

// Mock Mesh
export class Mesh {
  geometry: any
  material: any

  constructor(geometry: any, material: any) {
    this.geometry = geometry
    this.material = material
  }
}

// Mock Group
export class Group {
  children: any[] = []

  add(object: any): void {
    this.children.push(object)
  }

  position: any = { x: 0, y: 0, z: 0 }
  rotation: any = { x: 0, y: 0, z: 0 }
  scale: any = { x: 1, y: 1, z: 1 }
}

// Mock Clock
export class Clock {
  private startTime: number
  private lastTime: number

  constructor(autoStart = true) {
    const now = Date.now()
    this.startTime = now
    this.lastTime = now
  }

  getDelta(): number {
    const now = Date.now()
    const delta = (now - this.lastTime) / 1000
    this.lastTime = now
    return Math.min(delta, 0.1) // Cap at 100ms
  }

  getElapsedTime(): number {
    return (Date.now() - this.startTime) / 1000
  }
}

// Mock Light
export class AmbientLight {
  color: number
  intensity: number

  constructor(color = 0xffffff, intensity = 1) {
    this.color = color
    this.intensity = intensity
  }
}

export class DirectionalLight {
  color: number
  position: Vector3

  constructor(color = 0xffffff, intensity = 1) {
    this.color = color
    this.position = new Vector3()
  }
}
